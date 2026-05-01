package com.hmdp.entity;

import cn.hutool.core.lang.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.concurrent.TimeUnit;

public class SimpleRedisLock implements ILock{

    private String name;//锁的key

    private StringRedisTemplate stringRedisTemplate;
    /**
     * 构造函数
     * @param name
     * @param stringRedisTemplate
     */
    public SimpleRedisLock(String name, StringRedisTemplate stringRedisTemplate) {
        this.name = name;
        this.stringRedisTemplate = stringRedisTemplate;
    }
    private static final String KEY_PREFIX = "lock:";//锁的key前缀

    private static final String ID_PREFIX = UUID.randomUUID().toString(true)+"-";//锁的value前缀
    //只有第一次加载该类的时候才会执行，调用该类的构造函数时就不会执行了，所以同一个JVM该类只会被加载一次，不同的JVM该value的前缀是不同的


    private static final DefaultRedisScript<Long> unlock_script ;
    static {
        unlock_script = new DefaultRedisScript<>();
        unlock_script.setLocation(new ClassPathResource("unlock.lua"));//获取脚本
        unlock_script.setResultType(Long.class);
    }
    @Override
    public boolean tryLock(Long timeoutSec) {
        //获取锁
        String threadId =ID_PREFIX + Thread.currentThread().getId() ;
        Boolean b = stringRedisTemplate.opsForValue().setIfAbsent(KEY_PREFIX + name, threadId, timeoutSec, TimeUnit.SECONDS);
        return Boolean.TRUE.equals(b);//底层会进行自动拆箱，如果b为null会抛出空指针异常，所以需要进行判空处理
    }

    @Override
    public void unlock() {
        //调用Lua脚本
        stringRedisTemplate.execute(unlock_script, Collections.singletonList(KEY_PREFIX + name), ID_PREFIX + Thread.currentThread().getId());
        /*//判断锁是否属于当前线程的锁
        String threadId =ID_PREFIX + Thread.currentThread().getId() ;
            String id = stringRedisTemplate.opsForValue().get(KEY_PREFIX + name);
            if(threadId.equals(id)){//判断是否是当前线程的锁
                stringRedisTemplate.delete(KEY_PREFIX + name);//删除key，释放锁
            }*/
    }
}
