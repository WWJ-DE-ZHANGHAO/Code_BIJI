package com.hmdp.controller;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmdp.dto.Result;
import com.hmdp.entity.ShopType;
import com.hmdp.service.IShopTypeService;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * <p>
 * 前端控制器
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@RestController
@RequestMapping("/shop-type")
public class ShopTypeController {

    @Resource
    private StringRedisTemplate stringRedisTemplate;
    @Resource
    private IShopTypeService typeService;

    private static final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("list")
    public Result queryTypeList() throws JsonProcessingException {
        //查询Redis中是否有商铺类型列表
        /*//使用String类型的RedisTemplate，因为我们只需要存储JSON的字符串

        String shopTypeList = stringRedisTemplate.opsForValue().get("shopTypeList");
        List list = mapper.readValue(shopTypeList, new TypeReference<List<ShopType>>() {});
        if(list!=null){
            return Result.ok(list);
        }
        //纠错：如果在高并发的情况下，多个用户同时都没在Redis中，则会同时查询数据库，并将查询的数据存储到Redis中，
        //会造成一个用户缓存覆盖另一个用户的缓存，造成数据不一致，造成缓存击穿，所以我们需要加锁，
        //保证同一时间只有一个线程能查询数据库并将数据存储到Redis中，其他线程等待锁释放后再去Redis中查询数据
        synchronized (ShopTypeController.class) {
            //再次查询Redis中是否有商铺类型列表，因为可能在等待锁的过程中，其他线程已经查询数据库并将数据存储到Redis中了
            shopTypeList = stringRedisTemplate.opsForValue().get("shopTypeList");
            list = mapper.readValue(shopTypeList, new TypeReference<List<ShopType>>() {
            });
            if (list != null) {
                return Result.ok(list);
            }
            //Redis中没有，查询数据库
        List<ShopType> typeList = typeService
                .query().orderByAsc("sort").list();
        if (typeList==null) {
            return Result.fail("商铺类型不存在");
        }
        //将数据库中的数据存入Redis，并设置过期时间为30分钟
        String s = mapper.writeValueAsString(typeList);
        stringRedisTemplate.opsForValue().set( "shopTypeList",s,30, TimeUnit.MINUTES);
        return Result.ok(typeList);
        }
  */

        //使用集合存储类型的RedisTemplate，存储ShopType对象的JSON字符串
        List<String> SP = stringRedisTemplate.opsForList().range("shopTypeList", 0, -1);
        if (SP != null && !SP.isEmpty()) {
            //将JSON字符串转换为ShopType对象列表
            List<ShopType> shopTypes = SP.stream().map(json -> {
                try {
                    return mapper.readValue(json, ShopType.class);
                } catch (JsonProcessingException e) {
                    e.printStackTrace();
                    return null;
                }
            }).filter(shopType -> shopType != null).toList();
            return Result.ok(shopTypes);
        }
         synchronized (this) {
             //再次查询Redis中是否有商铺类型列表，因为可能在等待锁的过程中，其他线程已经查询数据库并将数据存储到Redis中了
             SP = stringRedisTemplate.opsForList().range("shopTypeList", 0, -1);
             if (SP != null && !SP.isEmpty()) {
                 List<ShopType> shopTypes = SP.stream().map(json -> {
                     try {
                         return mapper.readValue(json, ShopType.class);
                     } catch (JsonProcessingException e) {
                         e.printStackTrace();
                         return null;
                     }
                 }).filter(shopType -> shopType != null).toList();
                 return Result.ok(shopTypes);
             }
             //Redis中没有，查询数据库
             List<ShopType> typeList = typeService
                     .query().orderByAsc("sort").list();
             if (typeList==null||typeList.isEmpty()) {
                 return Result.fail("商铺类型不存在");
             }
             //将数据库中的数据转换为JSON字符串列表
             List<String> collect = typeList.stream().map(shopType -> {
                 try {
                     return mapper.writeValueAsString(shopType);
                 } catch (JsonProcessingException e) {
                     e.printStackTrace();
                     return null;
                 }
             }).filter(json -> json != null).collect(Collectors.toList());
             //使用Pipeline技术，将数据库中的数据存储到Redis中，并设置过期时间为30分钟
             stringRedisTemplate.executePipelined(new RedisCallback<Object>() {
                 @Override
                 public Object doInRedis(RedisConnection connection) throws DataAccessException {
                     // 注意：因为 connection 很底层，所以它只认识 byte[]
                     // 我们必须手动把 "shopTypeList" 变成字节数组
                     connection.del("shopTypeList".getBytes());
                     for (String json : collect) {
                         connection.lPush("shopTypeList".getBytes(), json.getBytes());
                     }
                     connection.expire("shopTypeList".getBytes(), 30 * 60);
                     return null;

                    }
             });
             return Result.ok(typeList);
         }
        //使用LeftPushAll方法底层实现通常是循环调用 Redis 的 LPUSH 命令，会需要进行次网络交互
        //导致接口响应时间过长
        //解决方法:使用Pipeline(管道)技术，将多次请求打包成 1 次发送，减少网络交互次数，提高性能
        //原理是:本地内存中开辟一块缓冲区。当你调用 pipe.set() 或 pipe.get() 时，Redis 客户端不会立即发送网络请求
        //，而是将这些命令按顺序“写入”到缓冲区的队列中。
        //这里的RedisConnection connection = pipeline.getConnection();是Spring Data Redis 提供的一个核心接口，
       //代表了与 Redis 服务器的连接。通过这个连接对象，我们可以执行各种 Redis的原生命令。但是它只认识字节数组，所以需要将数据转换为字节数组。
       //它调用命令时不会发送网络请求，而是将命令写入缓冲区。
        //当 executePipelined 方法结束时，Spring Data Redis 会把这个“集装箱”里所有的指令
        //一次性打包，通过网络发送给 Redis 服务器。这才是真正耗时的“路途”。

    }
}
