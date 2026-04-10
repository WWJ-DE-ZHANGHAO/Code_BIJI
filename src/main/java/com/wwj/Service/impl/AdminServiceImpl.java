package com.wwj.Service.impl;

import cn.hutool.crypto.digest.MD5;
import com.wwj.Constant.MessageConstant;
import com.wwj.Dto.AdminLoginDto;
import com.wwj.Dto.AdminRegisterDto;
import com.wwj.Exception.*;
import com.wwj.Pojo.Admin;
import com.wwj.Mapper.AdminMapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Result.Result;
import com.wwj.Service.AdminService;
import com.wwj.context.BaseContext;
import jakarta.validation.Validator;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


/**
 * <p>
 * 后台管理员表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-27
 */
@Service
public class AdminServiceImpl extends ServiceImpl<AdminMapper, Admin> implements AdminService {
    @Autowired
    private Validator validator;
    //登录接口
    @Override
    public Admin login(AdminLoginDto adminLoginDto) {
        String username = adminLoginDto.getUsername();
        String password = adminLoginDto.getPassword();
        if (username == null || password == null) {
            throw new AdminloginInformationIsIncompleteException("用户名或密码不能为空");
        }
        Admin one = lambdaQuery().eq(Admin::getUsername, username).one();
        if (one == null) {
            throw new AccountNotFoundException("用户不存在");
        }
        String s = DigestUtils.md5Hex(password);
        if (!s.equals(one.getPassword())) {
            throw new PasswordError("密码错误");
        }
        if (one.getStatus()==0) {
            throw new AccountLockedException("用户被锁定");
        }

        return one;
    }
    //注册接口
    @Override
    public Admin register(AdminRegisterDto adminRegisterDto) {
        String username = adminRegisterDto.getUsername();
        String password = adminRegisterDto.getPassword();
        String realName = adminRegisterDto.getRealName();
        if (username.isBlank() || password.isBlank() || realName.isBlank()) {
            throw new UsernameOrPasswordIsInvalidException("用户名、密码或真实姓名不能为空");
        }
        Admin one = lambdaQuery().eq(Admin::getUsername, username).one();
        if (one != null) {
            throw new AlreadyExistsException("该用户名已经存在，请重新选择一个用户名");
        }
        String s = DigestUtils.md5Hex(password);
        Admin admin = Admin.builder()
                .username(username)
                .password(s)
                .realName(realName)
                .status(1)
                .build();
        save(admin);

        return admin;
    }
    //修改用户信息
    @Override
    public void updateUser(Admin admin) {
        Long adminId = BaseContext.getCurrentId();
        String username = admin.getUsername();
        String password = admin.getPassword();
        String realName = admin.getRealName();
        if (username.isBlank() || realName.isBlank()) {
            throw new UsernameOrPasswordIsInvalidException("用户名或真实姓名不能为空");
        }
        Admin Currentadmin = lambdaQuery().eq(Admin::getId, adminId).one();
        if ((!username.equals(Currentadmin.getUsername())||(lambdaQuery().eq(Admin::getUsername, username).one() != null))) {
            throw new AlreadyExistsException("该用户名已经存在，请重新选择一个用户名");
        }
        Currentadmin.setUsername(username);
        Currentadmin.setRealName(realName);
        if (!password.isBlank()){
            String s = DigestUtils.md5Hex(password);
            Currentadmin.setPassword(s);
        }
        updateById(Currentadmin);

    }
}
