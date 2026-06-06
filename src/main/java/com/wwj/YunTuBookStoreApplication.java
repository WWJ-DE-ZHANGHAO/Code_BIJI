package com.wwj;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
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
    @Bean
    public MessageConverter messageConverter() {
        Jackson2JsonMessageConverter jjmc= new Jackson2JsonMessageConverter(); //创建消息转换器
        jjmc.setCreateMessageIds(true);//创建消息ID,会自动在消息的属性中添加一个message_id属性值
        return jjmc;
    }
}
