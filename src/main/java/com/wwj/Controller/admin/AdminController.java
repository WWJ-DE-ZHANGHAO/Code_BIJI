package com.wwj.Controller.admin;


import com.wwj.Constant.JwtClaimsConstant;
import com.wwj.Dto.AdminLoginDto;
import com.wwj.Dto.AdminRegisterDto;
import com.wwj.Pojo.Admin;
import com.wwj.Result.Result;
import com.wwj.Service.AdminService;
import com.wwj.Utils.JwtUtil;
import com.wwj.Vo.AdminLoginVo;
import com.wwj.Vo.AdminRegisterVo;
import com.wwj.context.BaseContext;
import com.wwj.properties.JwtProperties;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * <p>
 * 后台管理员表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-27
 */
@RestController
@RequestMapping("/admin/admin")
@Api(tags = "后台管理员表")
public class AdminController {
    @Autowired
    private AdminService adminService;

    @Autowired
    private JwtProperties jwtProperties;

    //登录接口
    @PostMapping("/login")
   public Result<AdminLoginVo> login(@RequestBody  AdminLoginDto adminLoginDto) {
        Admin login = adminService.login(adminLoginDto);
        if (login == null) {
            return Result.error("登录失败");
        }
        //生成token
        Map<String, Object> map = new HashMap<>();
        map.put(JwtClaimsConstant.ADMIN_ID, login.getId());
        String token = JwtUtil.createJWT(jwtProperties.getAdminSecretKey(), jwtProperties.getAdminTtl(),map);
        AdminLoginVo adminLoginVo = AdminLoginVo.builder()
                .username(login.getUsername())
                .token(token)
                .build();

        return Result.success(adminLoginVo);
    }

    //注册接口
    @PostMapping("/register")
    public Result<AdminRegisterVo> register(@RequestBody AdminRegisterDto adminRegisterDto) {
        Admin register = adminService.register(adminRegisterDto);
        if (register == null) {
            return Result.error("注册失败");
        }
        //创建token
        Map<String, Object> map = new HashMap<>();
        map.put(JwtClaimsConstant.ADMIN_ID, register.getId());
        String token = JwtUtil.createJWT(jwtProperties.getAdminSecretKey(), jwtProperties.getAdminTtl(), map);
        AdminRegisterVo adminRegisterVo = AdminRegisterVo.builder()
                .username(register.getUsername())
                .token(token)
                .build();
        return Result.success(adminRegisterVo);
    }

    //修改用户信息
    @PostMapping("/update")
    public Result update(@RequestBody Admin admin){
        adminService.updateUser((admin));
        return Result.success();
    }

    //查询回显
    @GetMapping("/get")
    public Result<Admin> get(){
        Long adminId = BaseContext.getCurrentId();
        Admin admin = adminService.getById(adminId);
        return Result.success(admin);
    }
}
