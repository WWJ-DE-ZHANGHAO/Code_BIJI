package com.wwj.interceptor;

import cn.hutool.core.util.StrUtil;
import com.wwj.Constant.TokenConstants;
import com.wwj.Service.impl.TokenService;
import com.wwj.Utils.JwtUtil;
import com.wwj.context.BaseContext;
import com.wwj.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
public class UserRefreshTokenInterceptor implements HandlerInterceptor {
    @Autowired
    private TokenService tokenService;
    @Autowired
    private JwtProperties jwtProperties;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // 1. 获取Access Token和Refresh Token
        String accessToken = request.getHeader(jwtProperties.getUserTokenName());
        String refreshToken = request.getHeader("refresh-token");

        // 2. 没有Access Token，直接放行（让LoginInterceptor处理）
        if (StrUtil.isBlank(accessToken)) {
            log.debug("请求无Access Token，放行给登录拦截器");
            return true;
        }

        // 6. Token已过期，尝试刷新
        if (JwtUtil.isExpired(jwtProperties.getUserSecretKey(), accessToken)) {
            log.info("Access Token已过期，尝试刷新");
            if (StrUtil.isNotBlank(refreshToken)) {
                String newAccessToken = tokenService.refreshAccessToken(refreshToken);
                if (newAccessToken != null) {
                    // 刷新成功，解析新Token并存入ThreadLocal
                    Claims newClaims = JwtUtil.parseJWT(jwtProperties.getUserSecretKey(), newAccessToken);
                    setUserInfo(newClaims);
                    // 通过响应头返回新Token
                    response.setHeader(jwtProperties.getUserTokenName(), newAccessToken);
                    response.setHeader("Access-Control-Expose-Headers", jwtProperties.getUserTokenName());
                    log.debug("Access Token刷新成功");
                    return true;
                }
            }
            // 刷新失败，放行让LoginInterceptor返回401
            return true;
        }


        try {
            // 3. 解析Access Token
            Claims claims = JwtUtil.parseJWT(jwtProperties.getUserSecretKey(), accessToken);

            // 4. 验证Token类型
            String tokenType = claims.get(TokenConstants.CLAIM_TYPE, String.class);
            if (!TokenConstants.TYPE_ACCESS.equals(tokenType)) {
                log.warn("Token类型错误: {}", tokenType);
                return true;
            }

            // 5. 获取剩余有效时间
            long remainingTime = JwtUtil.getRemainingTime(jwtProperties.getUserSecretKey(), accessToken);


            // 7. Token有效，存入ThreadLocal
            setUserInfo(claims);

            // 8. Token即将过期（剩余 < 5分钟），提前刷新
            if (remainingTime < TokenConstants.REFRESH_THRESHOLD && StrUtil.isNotBlank(refreshToken)) {
                log.info("Access Token即将过期，剩余{}ms，提前刷新", remainingTime);
                String newAccessToken = tokenService.refreshAccessToken(refreshToken);
                if (newAccessToken != null) {
                    response.setHeader(jwtProperties.getUserTokenName(), newAccessToken);
                    response.setHeader("Access-Control-Expose-Headers", jwtProperties.getUserTokenName());
                    log.debug("Access Token提前刷新成功");
                }
            }

            return true;

        } catch (Exception e) {
            log.error("解析Access Token异常", e);
            return true;
        }
    }

    private void setUserInfo(Claims claims) {
        Long userId = Long.valueOf(claims.get(TokenConstants.CLAIM_USER_ID).toString());
        BaseContext.setCurrentId(userId);
        log.debug("用户 {} 已认证", userId);
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler,
                                Exception ex) throws Exception {
        BaseContext.removeCurrentId();
    }
}
