package com.wwj.interceptor;

import com.wwj.Constant.JwtClaimsConstant;
import com.wwj.Utils.JwtUtil;
import com.wwj.context.BaseContext;
import com.wwj.properties.JwtProperties;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

/**
 * jwt令牌校验的拦截器
 */
@Component
@Slf4j
public class JwtTokenAdminInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtProperties jwtProperties;

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 判断当前拦截到的是Controller的方法还是其他资源
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        // 1、从请求头中获取令牌
        String token = request.getHeader(jwtProperties.getAdminTokenName());

        // 2、校验令牌
        try {
            log.info("jwt校验:{}", token);
            Claims claims = JwtUtil.parseJWT(jwtProperties.getAdminSecretKey(), token);

            // 获取用户ID
            Long adminId = Long.valueOf(claims.get(JwtClaimsConstant.ADMIN_ID).toString());
            log.info("当前员工id：{}", adminId);
            BaseContext.setCurrentId(adminId);

            // ==================== 新增：解析权限和角色 ====================
            // 获取权限列表
            Object permissionsObj = claims.get(JwtClaimsConstant.PERMISSIONS);
            if (permissionsObj != null) {
                @SuppressWarnings("unchecked")
                List<String> permissions = (List<String>) permissionsObj;
                BaseContext.setPermissions(permissions);
                log.info("当前员工权限：{}", permissions);
            }

            // 获取角色编码
            Object roleCodeObj = claims.get(JwtClaimsConstant.ROLE_CODE);
            if (roleCodeObj != null) {
                BaseContext.setRoleCode(roleCodeObj.toString());
                log.info("当前员工角色：{}", roleCodeObj);
            }

            return true;
        } catch (Exception ex) {
            log.error("jwt校验失败：{}", ex.getMessage());
            response.setStatus(401);
            return false;
        }
    }

    // ==================== 新增：清理ThreadLocal ====================
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        BaseContext.removeCurrentId();
        BaseContext.removePermissions();
        BaseContext.removeRoleCode();
    }
}