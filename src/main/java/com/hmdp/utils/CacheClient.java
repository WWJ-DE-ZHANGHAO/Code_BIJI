package com.hmdp.utils;

import cn.hutool.core.util.BooleanUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.hmdp.entity.Shop;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import static com.hmdp.utils.RedisConstants.*;

@Data
@Component
public class CacheClient {

   /* private final  StringRedisTemplate stringRedisTemplate;
    public CacheClient(StringRedisTemplate stringRedisTemplate){
        this.stringRedisTemplate=stringRedisTemplate;
    }
    //为了防止后续调用该类的方法时，因为没有StringRedisTemplate而无法使用，
    //这样写调用的时候，就可以给该类的StringTemplate赋值，方法中就能直接用了*/
    //或这直接注入
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

/*方法1:可以将任意的Java对象序列化为json并缓存到String类型的key中，并设置TTL过期时间
方法2:可以将任意对象序列化为json并存储在String类型的key中，并且设置逻辑过期时间，用于处理缓存击穿问题
方法3:根据指定的key查询缓存，并序列化为指定类型，利用缓存空值的方式解决缓存穿透问题
方法4:根据指定的key查询缓存，并序列化为指定的类型，需要利用逻辑过期来解决击穿问题*/
    //方法一
    public void JSONStr(String key , Object object, Long time, TimeUnit unit){
        String jsonStr = JSONUtil.toJsonStr(object);
        stringRedisTemplate.opsForValue().set(key,jsonStr,time,unit);

    }

    //方法二
    public void JSONStrWithLogicExpire(String key , Object object, Long time, TimeUnit unit){
        RedisData redisData=new RedisData();
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(unit.toSeconds(time)));//使用TimeUnit的toxxx将时间换算
        redisData.setData(object);
        String jsonStr = JSONUtil.toJsonStr(redisData);
        stringRedisTemplate.opsForValue().set(key,jsonStr);

    }
    //方法三
    public<R,ID> R JSONStrWithPassThrough(String KeyPrefix, Class<R> type, ID id, Function<ID,R> DbFallBack,Long time,TimeUnit unit){
        String Key=KeyPrefix+id;
        //先查询Redis缓存
        String s = stringRedisTemplate.opsForValue().get(Key);
        if(!StrUtil.isBlank(s)){
            R bean = JSONUtil.toBean(s, type);
            return  bean;
        }
        //判断是否为空对象(""、"/t"),如果是空对象，则直接返回错误信息，不用查询数据库了
        if(s!=null){
            return null;
        }
        //不存在，查询数据库
        R r = DbFallBack.apply(id);
        if(r==null){
            stringRedisTemplate.opsForValue().set(Key,"",CACHE_NULL_TTL, TimeUnit.MINUTES);
            return null;
        }
        String jsonStr = JSONUtil.toJsonStr(r);
        //缓存到数据库中
         this.JSONStr(Key,jsonStr,time,unit);//调用JSONStr(String key , Object object, Long time, TimeUnit unit)
         return r;
    }

    //定义一个线程池，线程池的大小为10，线程池的类型为固定线程池
    private static final ExecutorService SERVICE = Executors.newFixedThreadPool(10);
    //方法四
    public<ID,R> R JSONStrWithLogicalExpire(String KeyPrefix,ID id,Class<R> type,Function<ID,R> DbFallBack,Long time,TimeUnit unit ){
        String Key=KeyPrefix+id;
        //先查询Redis缓存,判断是否是热点Key
        String s = stringRedisTemplate.opsForValue().get(Key);
        if(StrUtil.isBlank(s)){
            return null;
        }
        RedisData RR = JSONUtil.toBean(s, RedisData.class);
        String JJS = JSONUtil.toJsonStr(RR.getData());
        R bean = JSONUtil.toBean(JJS, type);
        //没过期
        if(RR.getExpireTime().isAfter(LocalDateTime.now())){
            return bean;
        }
        //过期了
           String Lock= LOCK_SHOP_KEY+id;
        boolean b = tryLock(Lock);
        if(b){
            //获取锁成功
            String ss = stringRedisTemplate.opsForValue().get(Key);
            RedisData RRR = JSONUtil.toBean(s, RedisData.class);
            if(RRR.getExpireTime().isAfter(LocalDateTime.now())){
                String JS= JSONUtil.toJsonStr(RRR.getData());
                return JSONUtil.toBean(JS, type);
            }
            //开启新线程
            SERVICE.submit(() -> {
                try {
                    R r = DbFallBack.apply(id);
                    this.JSONStrWithLogicExpire(Key,r,time,unit);//调用JSONStrWithLogicExpire(String key , Object object, Long time, TimeUnit unit)
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    unlock(Lock);
                }
            });
        }
        //获取锁失败
        return bean;
    }

    //上锁
    public boolean tryLock(String key) {
        Boolean flag = stringRedisTemplate.opsForValue().setIfAbsent(key,"1",50, TimeUnit.SECONDS);
        return BooleanUtil.isTrue(flag);
        //因为底层会进行自动拆箱，如果flag为null，则会抛出NullPointerException，所以使用BooleanUtil.isTrue()方法来判断flag的值
        //如果flag为null，则返回false；如果flag为true，则返回true；如果flag为false，则返回false
    }

    //解锁
    public void unlock(String key) {
        stringRedisTemplate.delete(key);
    }
}
