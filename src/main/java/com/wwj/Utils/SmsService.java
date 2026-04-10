package com.wwj.Utils;





import com.wwj.properties.AliyunSmsProperties;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class SmsService {

    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    private AliyunSmsProperties aliyunSmsProperties;

    public SmsService(AliyunSmsProperties aliyunSmsProperties) {
        this.aliyunSmsProperties = aliyunSmsProperties;
    }


    public String sendSmsCode(String code, String mobile) throws Exception {
        // 1. 基础配置
        String host = aliyunSmsProperties.getHost();
        String path = aliyunSmsProperties.getPath();
        String appCode = aliyunSmsProperties.getAppCode();


        // 3. 准备参数 (注意：根据商家示例，这些参数是放在 URL Query 中的)
        // templateId: 商家提供的测试模板 ID
        // mobile: 手机号
        // value: 对应模板中的 @`0`@ 占位符，填入我们的验证码
        String templateId = "JM1000372";

        // 构建 URL 参数字符串: ?mobile=xxx&templateId=xxx&value=xxx
        StringBuilder queryParams = new StringBuilder();
        queryParams.append("?mobile=").append(URLEncoder.encode(mobile, StandardCharsets.UTF_8));
        queryParams.append("&templateId=").append(URLEncoder.encode(templateId, StandardCharsets.UTF_8));
        queryParams.append("&value=").append(URLEncoder.encode(code, StandardCharsets.UTF_8));

        // 4. 构建完整 URL
        String fullUrl = host + path + queryParams.toString();

        // 5. 构建请求 (POST 方法，Body 为空，参数都在 URL 里)
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(fullUrl))
                .header("Authorization", "APPCODE " + appCode)
                // 虽然参数在 URL 里，但方法是 POST，有些网关要求 Content-Type
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.noBody()) // 发送空 Body
                .build();

        // 6. 发送请求
        HttpResponse<String> response = CLIENT.send(request, HttpResponse.BodyHandlers.ofString());

        // 7. 处理结果
        if (response.statusCode() == 200) {
            System.out.println("短信发送成功！");
            System.out.println("响应内容: " + response.body());
            // 【重要】返回验证码，方便您在业务层存入 Redis (key: mobile, value: code, expire: 5min)
            return code;
        } else {
            System.err.println(" 短信发送失败，状态码: " + response.statusCode());
            System.err.println("错误信息: " + response.body());
            throw new RuntimeException("短信发送失败: " + response.body());
        }
    }
}