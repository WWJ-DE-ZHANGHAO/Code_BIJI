package com.wwj;

import com.wwj.Pojo.Product;
import org.springframework.boot.test.context.SpringBootTest;
import org.apache.commons.codec.digest.DigestUtils;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;


@SpringBootTest
class YunTuBookStoreApplicationTests {

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

}
