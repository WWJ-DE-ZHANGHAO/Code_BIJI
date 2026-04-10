package com.wwj.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Dto.AdminLoginDto;
import com.wwj.Dto.AdminRegisterDto;
import com.wwj.Pojo.Admin;
import com.wwj.Result.Result;

public interface AdminService extends IService<Admin> {
    //登录
    Admin login(AdminLoginDto adminLoginDto);
    //注册
   Admin register(AdminRegisterDto adminRegisterDto);
   //修改信息
    void updateUser(Admin admin);
}
