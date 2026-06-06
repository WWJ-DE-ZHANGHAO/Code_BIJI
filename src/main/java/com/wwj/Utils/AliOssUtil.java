package com.wwj.Utils;

import com.aliyun.oss.ClientException;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.OSSException;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayInputStream;
import java.net.URL;
import java.util.Date;

@Data
@AllArgsConstructor
@Slf4j
public class AliOssUtil {
    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;

    /**
     * 文件上传
     *
     * @param bytes 上传文件的字节数组
     * @param objectName OSS 中的对象名
     * @return 临时访问 URL
     */
    public String upload(byte[] bytes, String objectName) {

        // 创建OSSClient实例。
        OSS ossClient = new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);

        try {
            // 创建PutObject请求。
            ossClient.putObject(bucketName, objectName, new ByteArrayInputStream(bytes));

            // 私有 Bucket 不返回永久直链，返回短期有效的签名访问地址
            String signedUrl = generatePresignedUrl(objectName, 7 * 24 * 60);
            log.info("文件上传到:{}", signedUrl);
            return signedUrl;
        } catch (OSSException oe) {
            System.out.println("Caught an OSSException, which means your request made it to OSS, "
                    + "but was rejected with an error response for some reason.");
            System.out.println("Error Message:" + oe.getErrorMessage());
            System.out.println("Error Code:" + oe.getErrorCode());
            System.out.println("Request ID:" + oe.getRequestId());
            System.out.println("Host ID:" + oe.getHostId());
        } catch (ClientException ce) {
            System.out.println("Caught an ClientException, which means the client encountered "
                    + "a serious internal problem while trying to communicate with OSS, "
                    + "such as not being able to access the network.");
            System.out.println("Error Message:" + ce.getMessage());
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }

        throw new IllegalStateException("文件上传失败");
    }

    /**
     * 获取对象的临时访问签名 URL
     *
     * @param objectName 对象名
     * @param expirationMinutes 有效期，单位：分钟
     * @return 临时访问 URL
     */
    public String generatePresignedUrl(String objectName, int expirationMinutes) {
        OSS ossClient = new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
        try {
            return getPresignedUrl(ossClient, objectName, expirationMinutes);
        } finally {
            if (ossClient != null) {
                ossClient.shutdown();
            }
        }
    }

    private String getPresignedUrl(OSS ossClient, String objectName, int expirationMinutes) {
        Date expiration = new Date(System.currentTimeMillis() + expirationMinutes * 60L * 1000L);
        URL url = ossClient.generatePresignedUrl(bucketName, objectName, expiration);
        return url.toString();
    }


}
