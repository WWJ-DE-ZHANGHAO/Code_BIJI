package com.hmdp.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.hmdp.dto.LoginFormDTO;
import com.hmdp.dto.Result;
import com.hmdp.entity.User;

import javax.servlet.http.HttpSession;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
public interface IUserService extends IService<User> {

    Result SentCode(String phone, HttpSession session) throws Exception;

    Result Login(LoginFormDTO loginForm, HttpSession session) throws JsonProcessingException;

    Result sign();

    Result signCount();
}
