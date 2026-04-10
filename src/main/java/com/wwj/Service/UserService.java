package com.wwj.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Dto.UserLoginDto;
import com.wwj.Dto.UserRegisterDto;
import com.wwj.Pojo.User;
import com.wwj.Query.UserQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Vo.UserRegisterVo;

public interface UserService extends IService<User> {
    //用户登录
   User login(UserLoginDto userLoginDto);
    //发送验证码
    Result<String> Sentcode(String phone) throws Exception;
    //用户注册
    UserRegisterVo register(UserRegisterDto userRegisterDto);
    //修改用户信息
    void updateUser(User user);
    //查询用户列表
    PageResult<User> queryUsersPage(UserQuery userQuery);
}
