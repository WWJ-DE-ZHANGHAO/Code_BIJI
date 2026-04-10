package com.wwj;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@MapperScan("com.wwj.Mapper")
@EnableTransactionManagement
@EnableScheduling
public class YunTuBookStoreApplication {

    public static void main(String[] args) {
        SpringApplication.run(YunTuBookStoreApplication.class, args);
    }

}
