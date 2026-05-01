package com.hmdp.controller;


import cn.hutool.core.util.BooleanUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hmdp.dto.Result;
import com.hmdp.entity.PageQuery;
import com.hmdp.entity.RedisData;
import com.hmdp.entity.Shop;
import com.hmdp.service.IShopService;
import com.hmdp.service.impl.ShopServiceImpl;
import com.hmdp.utils.CacheClient;
import com.hmdp.utils.SystemConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static com.hmdp.utils.RedisConstants.*;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/shop")
public class ShopController {

    @Resource
    public StringRedisTemplate stringRedisTemplate;

    @Resource
    public IShopService shopService;

    @Resource
    private ShopServiceImpl shopServiceImpl;

    private static final ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule()) ;
    @Autowired
    private  CacheClient cacheClient;
    /**
     * 根据id查询商铺信息
     *
     * @param id 商铺id
     * @return 商铺详情数据
     */
    @GetMapping("/{id}")
    @Transactional
    public Result queryShopById(@PathVariable("id") Long id) throws JsonProcessingException, InterruptedException {
      /*  //缓存穿透
        Shop shop = queryWithPassThrough(id);
        if(shop==null){
            return Result.fail("商铺不存在");
        }
        //返回商铺信息
        return Result.ok(shop);*/

        /*//缓存击穿，互斥锁
        Shop shop = queryWithMutex(id);
        if(shop==null){
            return Result.fail("商铺不存在");
        }
        return Result.ok(shop);*/
       /* //缓存击穿，逻辑过期
        Shop shop = queryWithLogicalExpire(id);
        if(shop==null){
            return Result.fail("商铺不存在");
        }
        return Result.ok(shop);*/

        //使用封装的Redis工具类
       /*  //缓存穿透
        Shop shop = cacheClient.JSONStrWithPassThrough(CACHE_SHOP_KEY, Shop.class, id, shopId -> shopService.getById(shopId), CACHE_SHOP_TTL, TimeUnit.MINUTES);
        if (shop==null){
            return Result.fail("商铺不存在");
        }
        return Result.ok(shop);*/
        //缓存击穿
        Shop shop = cacheClient.JSONStrWithLogicalExpire(CACHE_SHOP_KEY,  id, Shop.class,shopId -> shopService.getById(shopId), 10L, TimeUnit.SECONDS);
        if (shop==null){
            return Result.fail("商铺不存在");
        }
        return Result.ok(shop);
    }

    /**
     * 新增商铺信息
     *
     * @param shop 商铺数据
     * @return 商铺id
     */
    @PostMapping
    public Result saveShop(@RequestBody Shop shop) {
        // 写入数据库
        shopService.save(shop);
        // 返回店铺id
        return Result.ok(shop.getId());
    }

    /**
     * 更新商铺信息
     *
     * @param shop 商铺数据
     * @return 无
     */
    @PutMapping
    @Transactional
    public Result updateShop(@RequestBody Shop shop) {
        // 写入数据库
        shopService.updateById(shop);
        //删除缓存
        Long id = shop.getId();
        stringRedisTemplate.delete(CACHE_SHOP_KEY + id);
        return Result.ok();
    }

    /**
     * 根据商铺类型分页查询商铺信息
     *
     * @param typeId  商铺类型
     * @param current 页码
     * @return 商铺列表
     */
    @GetMapping("/of/type")
    public Result queryShopByType(
            @RequestParam("typeId") Integer typeId,
            @RequestParam(value = "current", defaultValue = "1") Integer current,
            @RequestParam(value="x", required = false) Double x,
            @RequestParam(value="y", required = false) Double y

    ) {
      return   shopService.queryShopByType( typeId, current,x,y);
    }

    /**
     * 根据商铺名称关键字分页查询商铺信息
     *
     * @param name    商铺名称关键字
     * @param current 页码
     * @return 商铺列表
     */
    @GetMapping("/of/name")
    public Result queryShopByName(
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "current", defaultValue = "1") Integer current
    ) {
        // 根据类型分页查询
        Page<Shop> page = shopService.query()
                .like(StrUtil.isNotBlank(name), "name", name)
                .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        // 返回数据
        return Result.ok(page.getRecords());
    }


    //分页查询商铺信息，筛选项为商铺类型id和商铺名称关键字
    @GetMapping("/of/search")
    public Result queryShopByTypeAndName(PageQuery pageQuery) {
        String keywords = pageQuery.getKeywords();
        Integer typeId = pageQuery.getTypeId();
        //构建分页条件
        Page<Shop> P = pageQuery.toPage("create_time", false);
        //执行查询
        Page<Shop> page = shopService.query().
                eq(typeId != null, "typeId", typeId)
                .like(keywords != null, "name", keywords)
                .page(P);
        //封装返回数据
        return Result.ok(page.getRecords());
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

    //缓存穿透方法
    public Shop queryWithPassThrough(Long id) throws JsonProcessingException {
        //先查询Redis缓存
        String s = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
        if(!StrUtil.isBlank(s)){
            Shop shop = mapper.readValue(s, Shop.class);
            return shop;
        }
        //判断是否为空对象,如果是空对象，则直接返回错误信息，不用查询数据库了
        if(s!=null){
            return null;
        }
            //不存在，查询数据库
            Shop shop = shopService.getById(id);
            if(shop==null){
                stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id,"",CACHE_NULL_TTL, TimeUnit.MINUTES);
                return null;
            }
            String SS = mapper.writeValueAsString(shop);
            stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id,SS,CACHE_SHOP_TTL, TimeUnit.MINUTES);
            return shop;

        }

        //互斥锁方法
        public Shop queryWithMutex(Long id) throws JsonProcessingException, InterruptedException {
            //先查询Redis缓存
            String s = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
            if(!StrUtil.isBlank(s)){
                Shop shop = mapper.readValue(s, Shop.class);
                return shop;
            }
            //判断是否为空对象,如果是空对象，则直接返回错误信息，不用查询数据库了
            if(s!=null){
                return null;
            }
            //Redis中的空对象也未被命中，去获取互斥锁,获取锁成功，则查询数据库重建数据到Redis缓存中；获取锁失败，则休眠并重试
            String lock = "lock:shop:" + id;//锁的key
            boolean flag = tryLock(lock);
            if(!flag){
                //获取锁失败，则休眠并重试
                try {
                    Thread.sleep(50);//休眠50毫秒
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
                return queryWithMutex(id);//递归调用，再次查询数据库
            }
            //获取锁成功，重新查询Redis缓存，防止在获取锁的过程中，其他线程已经将数据写入Redis缓存了
           String SS = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
            if(!StrUtil.isBlank(SS)){
                Shop shop = mapper.readValue(s, Shop.class);
                //释放锁
                unlock(lock);
                return shop;
            }
            if(SS!=null){
                return null;
            }
            //不存在，查询数据库
            Shop shop = shopService.getById(id);
            Thread.sleep(200);//休眠200毫秒，模拟查询数据库并重建Redis缓存的的耗时
            if(shop==null){
                stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id,"",CACHE_NULL_TTL, TimeUnit.MINUTES);
                return null;
            }
            String SSS = mapper.writeValueAsString(shop);
            stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id,SSS,CACHE_SHOP_TTL, TimeUnit.MINUTES);
            //释放锁
            unlock(lock);
            return shop;
        }
    //定义一个线程池，线程池的大小为10，线程池的类型为固定线程池
    private static final ExecutorService SERVICE = Executors.newFixedThreadPool(10);
        //逻辑过期方法
        public Shop queryWithLogicalExpire(Long id) throws JsonProcessingException {
            //先查询Redis缓存
            String s = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
            //未命中(返回的是null、空字符串、换行符等)，返回null
            if(StrUtil.isBlank(s)){
                return null;
            }
            //命中，判断是否过期
            RedisData bean = JSONUtil.toBean(s, RedisData.class);
            //因为类之间无法强制转换，所以先将RedisData中的data属性转换成字符串，再将字符串转换成Shop对象
            String data = JSONUtil.toJsonStr(bean.getData());
            Shop shop =JSONUtil.toBean(data, Shop.class);
            //判断是否过期，如果未过期，直接返回店铺信息
            if(bean.getExpireTime().isAfter(LocalDateTime.now())) {
                return shop;
            }
            //已过期，则获取互斥锁，进行缓存重建
            String lock = "lock:shop:" + id;
            boolean flag = tryLock(lock);
            if(flag){
                //获取锁成功
                //再次查询Redis缓存，防止在获取锁的过程中其他线程已经重建完了
                //先查询Redis缓存
                String SS = stringRedisTemplate.opsForValue().get(CACHE_SHOP_KEY + id);
                RedisData redisdata  = JSONUtil.toBean(s, RedisData.class);
                //因为类之间无法强制转换，所以先将RedisData中的data属性转换成字符串，再将字符串转换成Shop对象
                String DD = JSONUtil.toJsonStr(redisdata .getData());
                Shop SP =JSONUtil.toBean(data, Shop.class);
                //判断是否过期，如果未过期，直接返回店铺信息
                if(bean.getExpireTime().isAfter(LocalDateTime.now())) {
                    return shop;
                }
                //
                //开启独立线程进行缓存重建
                SERVICE.submit(() -> {
                    try {
                        shopServiceImpl.saveShopRedis(id,10L);//缓存重建,重置逻辑过期时间为10秒
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    } finally {
                        unlock(lock);//释放锁
                    }
                });
            }
            //获取失败返回旧数据
            return shop;
        }



}
