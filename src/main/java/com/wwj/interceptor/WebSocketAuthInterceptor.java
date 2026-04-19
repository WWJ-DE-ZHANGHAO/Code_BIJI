package com.wwj.interceptor;

import com.wwj.Constant.JwtClaimsConstant;
import com.wwj.Utils.JwtUtil;
import com.wwj.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.security.Principal;
import java.util.Map;

@Slf4j
@Component
public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    @Autowired
    private JwtProperties jwtProperties;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {

        log.info("========== WebSocket 握手开始 ==========");
        log.info("请求 URI: {}", request.getURI());

        // 跳过 SockJS 的内部轮询请求（xhr、jsonp、eventsource等）
        String uri = request.getURI().toString();
        if (uri.contains("/xhr") || uri.contains("/jsonp") || uri.contains("/eventsource")
                || uri.contains("/iframe") || uri.contains("/htmlfile")) {
            log.debug("跳过 SockJS 内部轮询请求: {}", uri);
            return true;
        }

        String token = extractToken(request);
        log.info("管理员密钥: {}", jwtProperties.getAdminSecretKey());
        log.info("用户密钥: {}", jwtProperties.getUserSecretKey());

        if (token == null) {
            log.warn("未找到任何 token，握手失败");
            return false;
        }

        log.info("token 前30字符: {}", token.substring(0, Math.min(30, token.length())) + "...");

        // 先尝试管理员密钥验证
        try {
            Claims claims = JwtUtil.parseJWT(jwtProperties.getAdminSecretKey(), token);
            Long adminId = Long.valueOf(claims.get(JwtClaimsConstant.ADMIN_ID).toString());
            attributes.put("senderId", adminId);
            attributes.put("role", "ADMIN");

            // 关键：创建 Principal 用于 /user 路由
            final Long finalAdminId = adminId;
            attributes.put("user", new Principal() {
                @Override
                public String getName() {
                    return finalAdminId.toString();
                }
            });

            log.info("✅ 管理端握手成功: adminId={}", adminId);
            return true;
        } catch (Exception e) {
            log.debug("管理员密钥验证失败，尝试用户密钥");
        }

        // 再尝试用户密钥验证
        try {
            Claims claims = JwtUtil.parseJWT(jwtProperties.getUserSecretKey(), token);
            Long userId = Long.valueOf(claims.get(JwtClaimsConstant.USER_ID).toString());
            attributes.put("senderId", userId);
            attributes.put("role", "USER");

            // 关键：创建 Principal 用于 /user 路由
            final Long finalUserId = userId;
            attributes.put("user", new Principal() {
                @Override
                public String getName() {
                    return finalUserId.toString();
                }
            });

            log.info("✅ 用户端握手成功: userId={}", userId);
            return true;
        } catch (Exception e) {
            log.error("token 验证失败: {}", e.getMessage());
            return false;
        }
    }

    private String extractToken(ServerHttpRequest request) {
        String query = request.getURI().getQuery();
        log.info("URL 查询字符串: {}", query);

        if (query != null && !query.isEmpty()) {
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    String token = param.substring(6);
                    log.info("从 URL 参数 token 获取到 token");
                    return token;
                }
                if (param.startsWith("authentication=")) {
                    String token = param.substring(15);
                    log.info("从 URL 参数 authentication 获取到 token");
                    return token;
                }
            }
        }

        String adminToken = request.getHeaders().getFirst(jwtProperties.getAdminTokenName());
        if (adminToken != null) {
            log.info("从请求头 {} 获取到管理端 token", jwtProperties.getAdminTokenName());
            return adminToken;
        }

        String userToken = request.getHeaders().getFirst(jwtProperties.getUserTokenName());
        if (userToken != null) {
            log.info("从请求头 {} 获取到用户端 token", jwtProperties.getUserTokenName());
            return userToken;
        }

        String authHeader = request.getHeaders().getFirst("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            log.info("从 Authorization 请求头获取到 token");
            return authHeader.substring(7);
        }

        return null;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        if (exception != null) {
            log.error("握手后异常: {}", exception.getMessage());
        }
    }
}