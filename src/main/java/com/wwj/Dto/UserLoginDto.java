package com.wwj.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserLoginDto {
    //用户名
    private String username;
    //密码
    private String password;
    //验证码
    private String code;
    //手机号
    private String phone;
}
