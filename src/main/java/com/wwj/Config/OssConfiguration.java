package com.wwj.Config;

import com.wwj.Utils.AliOssUtil;
import com.wwj.properties.AliOssProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class OssConfiguration {
    @Bean
    @ConditionalOnMissingBean
    //这注解用于创建对象时，判断当前IOC容器中是否已存在AliOssUtil对象，如果已存在则不创建,确保创建唯一
    public AliOssUtil aliOssUtil(AliOssProperties aliOssProperties){
        log.info("开始创建阿里云文件上传工具类对象：{}",aliOssProperties);
        return new AliOssUtil(aliOssProperties.getEndpoint(),
                //在这里将AliOssUtil对象所需的属性值注入到AliOssUtil的构造方法中。之后使用创建的AliOssUtil对象时，这些属性值就会直接生效。
                aliOssProperties.getAccessKeyId(),
                aliOssProperties.getAccessKeySecret(),
                aliOssProperties.getBucketName());
    }
}
