package com.wwj;

import com.wwj.Message.OrderRemindMessage;
import com.wwj.Pojo.Product;
import com.wwj.Pojo.Stock;
import com.wwj.Result.Result;
import com.wwj.Service.IProductService;
import com.wwj.Service.IStockService;
import com.wwj.context.BaseContext;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.apache.commons.codec.digest.DigestUtils;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;


@SpringBootTest
class YunTuBookStoreApplicationTests {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private IProductService productService;
    @Autowired
    private IStockService stockService;
    @Test
    void contextLoads() {
        String s = DigestUtils.md5Hex("123456");
        System.out.println(s);//
    }

    @Test
    void test(){
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime localDateTime = now.plusDays(7);//获取当前时间的7天后的时间
        LocalDateTime localDateTime1 = now.minusDays(7);//获取当前时间的7天前的时间
        long days = Duration.between(localDateTime1, localDateTime).toDays();//计算两个时间之间的天数
        System.out.println(now);
        System.out.println(localDateTime);
        System.out.println(localDateTime1);
        System.out.println(days);


    }

    //预热商品信息和库存信息到Redis中
    @Test
    void test2() {
        List<Product> list = productService.list();
        for (Product product : list) {
            stringRedisTemplate.opsForValue().set("product:id" + product.getId(), product.toString());
        }
        List<Stock> List = stockService.list();
        for (Stock stock : List) {
            stringRedisTemplate.opsForValue().set("product:stock:id" + stock.getProductId(), stock.getSaleStock().toString());
        }


    }


}
