package com.wwj.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aliyun.oss")
@Data
public class AliOssProperties {
    private String endpoint; // OSS地域节点
    private String accessKeyId; // OSS访问密钥ID
    private String accessKeySecret; // OSS访问密钥Secret
    private String bucketName;  // OSS存储空间名称

}
