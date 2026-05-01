package com.hmdp;

import com.hmdp.entity.Shop;
import com.hmdp.service.IShopService;
import com.hmdp.service.impl.ShopServiceImpl;
import com.hmdp.utils.CacheClient;
import com.hmdp.utils.RedisIdWorker;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoLocation;

import javax.annotation.Resource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static com.hmdp.utils.RedisConstants.CACHE_SHOP_KEY;
import static com.hmdp.utils.RedisConstants.SHOP_GEO_KEY;

@SpringBootTest
class HmDianPingApplicationTests {
    @Resource
    private ShopServiceImpl shopService;
    @Autowired
    private CacheClient cacheClient;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;



    @Resource
    private RedisIdWorker redisIdWorker;

    private ExecutorService service= Executors.newFixedThreadPool(500);

    @Test
    public void saveRedis() throws InterruptedException {
        shopService.saveShopRedis(1L,10L);
        //stringRedisTemplate.opsForValue().set("k1","v1");
    }

    @Test
    public void SaveRedis(){
        Shop byId = shopService.getById(1L);
        cacheClient.JSONStrWithLogicExpire(CACHE_SHOP_KEY+1L,byId,10L, TimeUnit.SECONDS);//添加热点Key

    }
  /*  //使用多线程进行并发的生成
    @Test
    void testIdWorker() throws InterruptedException {
         //因为是多线程并发执行，无法只用System.currentTimeMillis()计算耗时，要用CountDownLatch类
        CountDownLatch latch=new CountDownLatch(300);//用于让线程同步的JAVA并发工具类，相当与一个锁只有计数器归零才会放行
        //定义一个线程任务，每个线程需要执行
        Runnable task=()->{
            for (int i = 0; i < 100; i++) {
                long id =redisIdWorker.nextId("order");
                System.out.println("id="+id);
            }
            latch.countDown();//每执行一次计数器就会减一
        };
        long begin =System.currentTimeMillis();
        for (int i = 0; i < 300; i++) {
            service.submit(task);//开启一个新线程执行任务
        }
        latch.await();//阻塞线程防止有的线程，没等全部线程执行完,主线程就执行了计算结束时间戳的
        long end =System.currentTimeMillis();
        System.out.println("time="+(end-begin));//计算耗时
    }
*/


    @Test
    void loadshopdata() throws InterruptedException {
        //获取所有店铺
        List<Shop> list= shopService.lambdaQuery().list();
        //使用Stream流对集合根据typeId进行分组
        Map<Long, List<Shop>> map = list.stream().collect(Collectors.groupingBy(Shop::getTypeId));
        for (Map.Entry<Long, List<Shop>> entry : map.entrySet()) {//将map集合变为键值对的set集合
            Long typeId = entry.getKey();
            List<Shop> value = entry.getValue();
            List<RedisGeoCommands.GeoLocation<String>> locations=new ArrayList<>();
           for (Shop shop : value) {
               Point point = new Point(shop.getX(), shop.getY());
               String string = shop.getId().toString();
               RedisGeoCommands.GeoLocation<String> stringGeoLocation = new RedisGeoCommands.GeoLocation<>(string, point);
               locations.add(stringGeoLocation);
               /* stringRedisTemplate.opsForGeo().add(SHOP_GEO_KEY+typeId,
                        new Point(shop.getX(),shop.getY()),shop.getId().toString());*/
            }
            stringRedisTemplate.opsForGeo().add(SHOP_GEO_KEY+typeId,locations);
        }
    }

    //模拟UV统计
    @Test
    void testHyperLogLog(){
        String[] values=new String[1000];
        int j=0;
        for (int i = 0; i < 1000000; i++) {//将100万个数据分一百次添加每次添加1000个数据
            j=i%1000;
            values[j]="user"+i;
            if (j==999){
                stringRedisTemplate.opsForHyperLogLog().add("h1",values);
            }
        }
        Long size = stringRedisTemplate.opsForHyperLogLog().size("h1");
        System.out.println("count="+size);
    }

}
