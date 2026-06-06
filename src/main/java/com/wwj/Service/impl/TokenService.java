package com.wwj.Service.impl;

import cn.hutool.core.lang.UUID;
import cn.hutool.core.util.StrUtil;
import com.wwj.Constant.TokenConstants;
import com.wwj.Utils.JwtUtil;
import com.wwj.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class TokenService {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private JwtProperties jwtProperties;

    /**
     * 生成双Token
     * @param userId 用户ID

     * @return TokenMap
     */
    public Map<String, String> generateTokens(Long userId) {
        Map<String, String> tokens = new HashMap<>();

        // 生成Token唯一标识
        String tokenId = UUID.randomUUID().toString();

        // 1. 生成 Access Token（15分钟）
        Map<String, Object> accessClaims = new HashMap<>();
        accessClaims.put(TokenConstants.CLAIM_USER_ID, userId);
        accessClaims.put(TokenConstants.CLAIM_TYPE, TokenConstants.TYPE_ACCESS);
        accessClaims.put(TokenConstants.CLAIM_TOKEN_ID, tokenId);

        String accessToken = JwtUtil.createJWT(
                jwtProperties.getUserSecretKey(),
                TokenConstants.ACCESS_TOKEN_TTL,
                accessClaims
        );

        // 2. 生成 Refresh Token（7天）
        Map<String, Object> refreshClaims = new HashMap<>();
        refreshClaims.put(TokenConstants.CLAIM_USER_ID, userId);
        refreshClaims.put(TokenConstants.CLAIM_TYPE, TokenConstants.TYPE_REFRESH);
        refreshClaims.put(TokenConstants.CLAIM_TOKEN_ID, tokenId);


        String refreshToken = JwtUtil.createJWT(
                jwtProperties.getUserSecretKey(),
                refreshClaims
        );

        // 3. 存储 Refresh Token 到 Redis
        String redisKey = TokenConstants.REFRESH_TOKEN_KEY + tokenId;
        stringRedisTemplate.opsForHash().putAll(redisKey, Map.of(
                "userId", String.valueOf(userId),
                "tokenId", tokenId
        ));
        stringRedisTemplate.expire(redisKey, TokenConstants.REFRESH_TOKEN_TTL, TimeUnit.MILLISECONDS);

        // 4. 记录用户最新的 Refresh Token（后登录踢掉前一个）
        String userTokenKey = TokenConstants.USER_REFRESH_TOKEN_KEY + userId;
        stringRedisTemplate.opsForValue().set(userTokenKey, tokenId,
                TokenConstants.REFRESH_TOKEN_TTL, TimeUnit.MILLISECONDS);

        tokens.put("accessToken", accessToken);
        tokens.put("refreshToken", refreshToken);
        tokens.put("expiresIn", String.valueOf(TokenConstants.ACCESS_TOKEN_TTL / 1000));

        log.info("生成双Token成功 - 用户: {}, 设备: {}, tokenId: {}", userId,  tokenId);
        return tokens;
    }

    /**
     * 刷新Access Token
     * @param refreshToken 刷新令牌
     * @return 新的Access Token，失败返回null
     */
    public String refreshAccessToken(String refreshToken) {
        if (StrUtil.isBlank(refreshToken)) {
            return null;
        }

        try {
            // 1. 解析Refresh Token
            Claims claims = JwtUtil.parseJWT(jwtProperties.getUserSecretKey(), refreshToken);

            // 2. 验证Token类型
            String tokenType = claims.get(TokenConstants.CLAIM_TYPE, String.class);
            if (!TokenConstants.TYPE_REFRESH.equals(tokenType)) {
                log.warn("刷新失败 - Token类型错误: {}", tokenType);
                return null;
            }

            // 3. 验证是否过期
            if (JwtUtil.isExpired(jwtProperties.getUserSecretKey(), refreshToken)) {
                log.warn("刷新失败 - Refresh Token已过期");
                return null;
            }

            // 4. 从Redis验证Refresh Token是否存在且有效
            String tokenId = claims.get(TokenConstants.CLAIM_TOKEN_ID, String.class);
            Long userId = Long.valueOf(claims.get(TokenConstants.CLAIM_USER_ID).toString());
            String deviceInfo = claims.get(TokenConstants.CLAIM_DEVICE, String.class);

            String redisKey = TokenConstants.REFRESH_TOKEN_KEY + tokenId;
            Boolean exists = stringRedisTemplate.hasKey(redisKey);
            if (Boolean.FALSE.equals(exists)) {
                log.warn("刷新失败 - Refresh Token已被注销, userId: {}", userId);
                return null;
            }

            // 5. 单点登录检查：验证是否为最新Token
            String userTokenKey = TokenConstants.USER_REFRESH_TOKEN_KEY + userId;
            String latestTokenId = stringRedisTemplate.opsForValue().get(userTokenKey);
            if (!tokenId.equals(latestTokenId)) {
                log.warn("刷新失败 - 不是最新Token, 可能已被新登录踢下线, userId: {}", userId);
                return null;
            }

            // 6. 生成新的Access Token
            Map<String, Object> newClaims = new HashMap<>();
            newClaims.put(TokenConstants.CLAIM_USER_ID, userId);
            newClaims.put(TokenConstants.CLAIM_TYPE, TokenConstants.TYPE_ACCESS);
            newClaims.put(TokenConstants.CLAIM_TOKEN_ID, tokenId);
            newClaims.put(TokenConstants.CLAIM_DEVICE, deviceInfo);

            String newAccessToken = JwtUtil.createJWT(
                    jwtProperties.getUserSecretKey(),
                    TokenConstants.ACCESS_TOKEN_TTL,
                    newClaims
            );

            log.info("刷新Access Token成功 - 用户: {}, tokenId: {}", userId, tokenId);
            return newAccessToken;

        } catch (Exception e) {
            log.error("刷新Access Token失败", e);
            return null;
        }
    }

    /**
     * 注销Token（退出登录）
     */
    public void logout(String refreshToken) {
        if (StrUtil.isBlank(refreshToken)) {
            return;
        }

        try {
            Claims claims = JwtUtil.parseJWT(jwtProperties.getUserSecretKey(), refreshToken);
            String tokenId = claims.get(TokenConstants.CLAIM_TOKEN_ID, String.class);
            Long userId = Long.valueOf(claims.get(TokenConstants.CLAIM_USER_ID).toString());

            // 删除Refresh Token
            String redisKey = TokenConstants.REFRESH_TOKEN_KEY + tokenId;
            stringRedisTemplate.delete(redisKey);
            // 如果退出的是最新登录的设备，清除映射
            String userTokenKey = TokenConstants.USER_REFRESH_TOKEN_KEY + userId;
            String latestTokenId = stringRedisTemplate.opsForValue().get(userTokenKey);
            if (tokenId.equals(latestTokenId)) {
                stringRedisTemplate.delete(userTokenKey);
            }

            log.info("用户退出登录 - userId: {}, tokenId: {}", userId, tokenId);
        } catch (Exception e) {
            log.error("注销Token失败", e);
        }
    }
}
