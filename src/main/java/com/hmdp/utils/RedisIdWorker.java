package com.hmdp.utils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
// id生成器
@Component
public class RedisIdWorker {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    // 开始时间戳
    private static final long BEGIN_TIMESTAMP = 1776816000L;
    //位移
    private static final long COUNT_BITS = 32;
    public long nextId(String keyPrefix) {
        //生成时间戳
        LocalDateTime now = LocalDateTime.now();
        long nowSecond = now.toEpochSecond(ZoneOffset.UTC);
        long timestamp = nowSecond - BEGIN_TIMESTAMP;
        //生成序列号
        String date = now.format(DateTimeFormatter.ofPattern("yyyy:MM:dd"));//获取当前日期的
        Long increment = stringRedisTemplate.opsForValue().increment("icr:" + keyPrefix + ":" + date);//获取当前key的value值

        //拼接并返回
        //因为要求返回的是Long类型不能通过字符串进行拼接，所以需要将时间戳和序列号进行位运算拼接
        //此时时间戳是在高位的31位，可以先让时间戳左移32位，再进行位运算拼接，
        return timestamp << 32 | increment;
        //让低位32位与序列号进行或运算，由于地位当前都是0，与0进行或运算，结果还是本身这样就能获得序列号

    }
    public static void main(String[] args) {
        LocalDateTime time = LocalDateTime.of(2026, 4, 22, 0, 0, 0);
        long second = time.toEpochSecond(ZoneOffset.UTC);
        System.out.println("second="+second);

    }
}
