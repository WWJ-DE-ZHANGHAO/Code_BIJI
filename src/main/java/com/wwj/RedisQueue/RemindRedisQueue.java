package com.wwj.RedisQueue;

import com.wwj.Message.OrderRemindMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Component
public class RemindRedisQueue {
    private static final String KEY = "order:remind:queue";
    //注入RedisTemplate<String,Object>，就会生成RedisConfig配置类的Bean实例
    @Autowired
    private RedisTemplate<String,Object> redisTemplate;
    //入列
    public void push(OrderRemindMessage msg){
        //使用redisTemplate的opsForList()方法。会自动使用配置类中的JSON序列化，将OrderRemindMessage对象转换成JSON格式的字符串存入RedisList 中
        redisTemplate.opsForList().rightPush(KEY, msg);
    }
    //拉取所有未读消息(管理端上线时调用)
    public List<OrderRemindMessage> popAll(){
        List<Object> list = Optional.ofNullable(redisTemplate.opsForList().range(KEY, 0, -1))
                .orElse(Collections.emptyList());
        redisTemplate.delete(KEY);
        return list.stream().map(item -> (OrderRemindMessage) item).toList();

    }
}
