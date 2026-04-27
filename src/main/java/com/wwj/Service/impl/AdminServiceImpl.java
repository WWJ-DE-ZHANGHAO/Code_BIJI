package com.wwj.Service.impl;

import cn.hutool.crypto.digest.MD5;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Dto.AdminLoginDto;
import com.wwj.Dto.AdminRegisterDto;
import com.wwj.Exception.*;
import com.wwj.Mapper.AdminMapper;
import com.wwj.Mapper.RoleMapper;
import com.wwj.Mapper.PermissionMapper;
import com.wwj.Mapper.RolePermissionMapper;
import com.wwj.Pojo.Admin;
import com.wwj.Pojo.Role;
import com.wwj.Pojo.Permission;
import com.wwj.Pojo.RolePermission;
import com.wwj.Query.EmployeeQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.AdminService;
import com.wwj.Service.IRoleService;
import com.wwj.context.BaseContext;
import jakarta.validation.Validator;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl extends ServiceImpl<AdminMapper, Admin> implements AdminService {

    @Autowired
    private Validator validator;

    // ==================== 新增Mapper ====================
    @Autowired
    private RoleMapper roleMapper;

    @Autowired
    private PermissionMapper permissionMapper;

    @Autowired
    private RolePermissionMapper rolePermissionMapper;


    @Autowired
    private IRoleService roleService;

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
        if (one.getStatus() == 0) {
            throw new AccountLockedException("用户被锁定");
        }
        return one;
    }

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

    @Override
    public void updateUser(Admin admin) {
        Long adminId = BaseContext.getCurrentId();
        String username = admin.getUsername();
        String password = admin.getPassword();
        String realName = admin.getRealName();
        if (username.isBlank() || realName.isBlank()) {
            throw new UsernameOrPasswordIsInvalidException("用户名或真实姓名不能为空");
        }
        Admin currentAdmin = lambdaQuery().eq(Admin::getId, adminId).one();
        if (!username.equals(currentAdmin.getUsername()) &&
                lambdaQuery().eq(Admin::getUsername, username).one() != null) {
            throw new AlreadyExistsException("该用户名已经存在，请重新选择一个用户名");
        }
        currentAdmin.setUsername(username);
        currentAdmin.setRealName(realName);
        if (password != null && !password.isBlank()) {
            String s = DigestUtils.md5Hex(password);
            currentAdmin.setPassword(s);
        }
        updateById(currentAdmin);
    }

    // ==================== 新增方法 ====================

    @Override
    public List<String> getUserPermissions(Long adminId) {
        // 1. 获取用户
        Admin admin = this.getById(adminId);
        if (admin == null || admin.getRoleId() == null) {
            return List.of();
        }

        // 2. 查询角色拥有的权限ID
        List<RolePermission> rolePermissions = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermission>()
                        .eq(RolePermission::getRoleId, admin.getRoleId())
        );

        if (rolePermissions.isEmpty()) {
            return List.of();
        }

        // 3. 获取权限ID列表
        List<Long> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .collect(Collectors.toList());

        // 4. 查询权限编码
        List<Permission> permissions = permissionMapper.selectBatchIds(permissionIds);

        return permissions.stream()
                .map(Permission::getPermissionCode)
                .collect(Collectors.toList());
    }
    // 在 AdminServiceImpl 中添加

    @Override
    public List<Role> getAvailableRoles() {
        // 获取当前登录用户
        Long currentAdminId = BaseContext.getCurrentId();
        Admin currentAdmin = this.getById(currentAdminId);
        Role currentRole = roleMapper.selectById(currentAdmin.getRoleId());


            return roleMapper.selectList(
                    new LambdaQueryWrapper<Role>()
                            .eq(Role::getStatus, 1)
                            .orderByAsc(Role::getSort));

    }
   //复杂条件分页查询
    @Override
    public PageResult<Admin> QueryPage(EmployeeQuery employeeQuery) {
        String keyword = employeeQuery.getKeyword();
        //构建分页条件
        Page<Admin> page = employeeQuery.toMpPage("created_at", true);
        //执行查询
        Page<Admin> adminPage = lambdaQuery().like(keyword!=null,Admin::getUsername,keyword).page( page);
        //封装结果
        List<Admin> records = adminPage.getRecords();
        for (Admin record : records) {
            record.setRoleName(roleService.lambdaQuery().eq(Role::getId,record.getRoleId()).one().getRoleName());
        }
        PageResult<Admin> PR = new PageResult<>(adminPage.getTotal(), adminPage.getPages(),records );
        return PR;

    }

    @Override
    public Role getUserRole(Long adminId) {
        Admin admin = this.getById(adminId);
        if (admin == null || admin.getRoleId() == null) {
            return null;
        }
        return roleMapper.selectById(admin.getRoleId());
    }
}