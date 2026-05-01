package com.hmdp.utils;


import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.hmdp.dto.UserDTO;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class RefreshTokenInterceptor implements HandlerInterceptor {
    private StringRedisTemplate stringRedisTemplate;
     //在配置类中期调用了这个方法，而配置类用@configuration注解，所以这里可以注入StringRedisTemplate
    public RefreshTokenInterceptor(StringRedisTemplate stringRedisTemplate) {
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        //获取请求头中的token
        String token = request.getHeader("authorization");
        if(StrUtil.isBlank(token)){

            return true;
        }
        //获取Redis中的用户信息
        Map<Object, Object> usermap = stringRedisTemplate.opsForHash().entries(RedisConstants.LOGIN_USER_KEY + token);
       //判断用户信息是否为空
        if(usermap==null){
            return true;
        }
       /* 获取Session,并获取用户的部分信息，即UserDto
        UserDTO user =(UserDTO) request.getSession().getAttribute("user");*/

        //存在，保存用户信息到ThreadLocal中，放行
        UserDTO user = BeanUtil.fillBeanWithMap(usermap, new UserDTO(), false);
        UserHolder.saveUser(user);
        //刷新token有效期
        stringRedisTemplate.expire(RedisConstants.LOGIN_USER_KEY+token,RedisConstants.LOGIN_USER_TTL , TimeUnit.MINUTES);
        return true;
    }

    @Override
    public void afterCompletion (HttpServletRequest request, HttpServletResponse response, Object
            handler, @Nullable Exception ex) throws Exception {
        UserHolder.removeUser();
    }
}
