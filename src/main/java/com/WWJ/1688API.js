
/*
一、 接入前置准备
1、注册与认证：访问 1688 开放平台，注册开发者账号并完成企业认证（1688 主要面向企业用户）68。
2、创建应用：在开放平台控制台创建应用，获取专属的 AppKey 和 AppSecret26。
3、申请接口权限：根据业务需求，申请相应的 API 权限（如 alibaba.product.get 商品详情、offer.search 商品搜索等）69。
4、获取访问令牌（Access Token）：通过 OAuth 2.0 协议完成身份认证，获取 access_token（注意令牌的有效期，需实现本地缓存和刷新机制）28。

二、 核心依赖准备 (Maven)
在您的 pom.xml 中引入 HTTP 请求和 JSON 解析相关的依赖：
xml编辑

<dependencies>
    <!-- HTTP 请求库 -->
    <dependency>
        <groupId>org.apache.httpcomponents.client5</groupId>
        <artifactId>httpclient5</artifactId>
        <version>5.2.1</version>
    </dependency>
    <!-- JSON 解析库 -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
        <version>2.15.2</version>
    </dependency>
</dependencies>

三、 Java 代码实战示例
以下以获取 1688 商品详情（item_get / alibaba.product.get）为例，展示原生 HTTP 调用的核心逻辑：
java

编辑



import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.http.ContentType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class Alibaba1688ApiClient {
    private static final String API_URL = "https://gw.open.1688.com/openapi/param2/1/com.alibaba.product/alibaba.product.get";
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final String appKey;
    private final String appSecret;

    public Alibaba1688ApiClient(String appKey, String appSecret) {
        this.appKey = appKey;
        this.appSecret = appSecret;
    }

  获取商品详情

public JsonNode getProductDetail(String productId, String accessToken) throws Exception {
    // 1. 组装公共参数与业务参数（使用 TreeMap 保证按 ASCII 升序排列）
    Map<String, String> params = new TreeMap<>();
    params.put("app_key", appKey);
    params.put("access_token", accessToken);
    params.put("method", "alibaba.product.get");
    params.put("timestamp", LocalDateTime.now().format(DF));
    params.put("format", "json");
    params.put("v", "1.0");
    params.put("sign_method", "md5");
    params.put("productId", productId);
    params.put("fields", "productId,title,priceRange,moq,stock");

    // 2. 生成签名
    String sign = generateSign(params, appSecret);
    params.put("sign", sign);

    // 3. 构建表单参数
    StringBuilder formData = new StringBuilder();
    for (Map.Entry<String, String> entry : params.entrySet()) {
        if (formData.length() > 0) formData.append("&");
        formData.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8))
            .append("=")
            .append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
    }

    // 4. 发送 POST 请求
    try (CloseableHttpClient client = HttpClients.createDefault()) {
        HttpPost post = new HttpPost(API_URL);
        post.setEntity(new StringEntity(formData.toString(), ContentType.APPLICATION_FORM_URLENCODED));

        String response = client.execute(post, resp ->
            new String(resp.getEntity().getContent().readAllBytes(), StandardCharsets.UTF_8)
        );

        // 5. 解析 JSON 响应
        return new ObjectMapper().readTree(response);
    }
}


1688 API 签名生成算法 (MD5)

private String generateSign(Map<String, String> params, String secret) throws Exception {
    StringBuilder sb = new StringBuilder(secret);
    for (Map.Entry<String, String> entry : params.entrySet()) {
        sb.append(entry.getKey()).append(entry.getValue());
    }
    sb.append(secret);

    MessageDigest md = MessageDigest.getInstance("MD5");
    byte[] bytes = md.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
    StringBuilder hex = new StringBuilder();
    for (byte b : bytes) hex.append(String.format("%02X", b));
    return hex.toString();
}
}
四、 最佳实践与注意事项
签名规范：生成签名时，必须将除 sign 外的所有参数按 ASCII 码升序排序（推荐使用 TreeMap），拼接格式为 secret + key1value1 + key2value2 + secret，最后进行 MD5 加密并转为大写58。
性能优化：务必实现 access_token 的本地缓存，避免每次请求都重新获取；同时使用 fields 参数按需获取字段，减少数据传输量1。
频率控制：1688 API 默认有 QPS 限制（如 20次/秒），在批量采集时需添加 Thread.sleep() 进行限速，并实现异常自动重试机制56。
本地缓存：对于商品基础数据，建议在本地缓存 30-60 分钟，以平衡数据实时性与 API 调用频次1*/