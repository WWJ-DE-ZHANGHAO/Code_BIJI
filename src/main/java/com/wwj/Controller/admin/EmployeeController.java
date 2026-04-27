package com.wwj.Controller.admin;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Annotation.RequirePermission;

import com.wwj.Dto.EmployeeDto;
import com.wwj.Pojo.Admin;
import com.wwj.Pojo.Role;
import com.wwj.Query.EmployeeQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.AdminService;
import com.wwj.Service.IRoleService;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/employee")
@Api(tags = "员工管理")
public class EmployeeController {

    @Autowired
    private AdminService adminService;


    @Autowired
    private IRoleService roleService;
    // ==================== 分页查询 ====================

    @GetMapping("/page")
    @ApiOperation("分页查询员工")
    public Result<PageResult<Admin>> page(EmployeeQuery employeeQuery) {
      PageResult<Admin> page =  adminService.QueryPage(employeeQuery);
        return Result.success(page);
    }

    // ==================== 新增员工 ====================

    @PostMapping("/add")
    @ApiOperation("新增员工")
    public Result<Void> add(@RequestBody EmployeeDto employeeDTO) {
        // 检查用户名是否存在
        Admin exist = adminService.lambdaQuery()
                .eq(Admin::getUsername, employeeDTO.getUsername())
                .one();
        if (exist != null) {
            return Result.error("用户名已存在");
        }

        // 检查角色是否存在
        if (employeeDTO.getRoleId() == null) {
            return Result.error("请选择角色");
        }
        //查看员工的角色名称
        Role one = roleService.lambdaQuery().eq(Role::getId, employeeDTO.getRoleId()).one();

        Admin admin = Admin.builder()
                .username(employeeDTO.getUsername())
                .password(DigestUtils.md5Hex(employeeDTO.getPassword()))
                .realName(employeeDTO.getRealName())
                .roleId(employeeDTO.getRoleId())
                .roleName(one.getRoleName())
                .status(1)
                .build();

        adminService.save(admin);
        return Result.success();
    }

    // ==================== 编辑员工 ====================

    @PutMapping("/update")
    @ApiOperation("编辑员工")
    public Result<Void> update(@RequestBody EmployeeDto employeeDTO) {
        if (employeeDTO.getId() == null) {
            return Result.error("员工ID不能为空");
        }

        Admin admin = adminService.getById(employeeDTO.getId());
        if (admin == null) {
            return Result.error("员工不存在");
        }

        // 检查用户名是否被其他用户占用
        if (!admin.getUsername().equals(employeeDTO.getUsername())) {
            Admin exist = adminService.lambdaQuery()
                    .eq(Admin::getUsername, employeeDTO.getUsername())
                    .ne(Admin::getId, employeeDTO.getId())
                    .one();
            if (exist != null) {
                return Result.error("用户名已存在");
            }
        }
        //查看员工的角色名称
        Role one = roleService.lambdaQuery().eq(Role::getId, employeeDTO.getRoleId()).one();

        admin.setUsername(employeeDTO.getUsername());
        admin.setRealName(employeeDTO.getRealName());
        admin.setRoleId(employeeDTO.getRoleId());
        admin.setRoleName(one.getRoleName());

        // 如果填写了新密码才更新
        if (employeeDTO.getPassword() != null && !employeeDTO.getPassword().isBlank()) {
            admin.setPassword(DigestUtils.md5Hex(employeeDTO.getPassword()));
        }

        adminService.updateById(admin);
        return Result.success();
    }

    // ==================== 删除员工 ====================

    @DeleteMapping("/delete/{id}")
    @ApiOperation("删除员工")
    public Result<Void> delete(@PathVariable Long id) {
        // 不能删除自己
        Long currentId = BaseContext.getCurrentId();
        if (currentId.equals(id)) {
            return Result.error("不能删除自己");
        }

        // 检查是否是超级管理员
        Admin admin = adminService.getById(id);
        Role role = adminService.getUserRole(id);
        if (role != null && "ROLE_SUPER_ADMIN".equals(role.getRoleCode())) {
            // 只有超级管理员能删除超级管理员
            Role currentRole = adminService.getUserRole(currentId);
            if (currentRole == null || !"ROLE_SUPER_ADMIN".equals(currentRole.getRoleCode())) {
                return Result.error("无权删除超级管理员");
            }
        }

        adminService.removeById(id);
        return Result.success();
    }

    // ==================== 启用/禁用员工 ====================

    @PutMapping("/status/{id}")
    @ApiOperation("修改员工状态")
    public Result<Void> updateStatus(@PathVariable Long id, @RequestParam Integer status) {
        // 不能禁用自己
        Long currentId = BaseContext.getCurrentId();
        if (currentId.equals(id)) {
            return Result.error("不能修改自己的状态");
        }

        Admin admin = adminService.getById(id);
        if (admin == null) {
            return Result.error("员工不存在");
        }

        admin.setStatus(status);
        adminService.updateById(admin);
        return Result.success();
    }

    // ==================== 获取员工详情 ====================

    @GetMapping("/{id}")
    @ApiOperation("获取员工详情")
    public Result<Admin> getById(@PathVariable Long id) {
        Admin admin = adminService.getById(id);
        if (admin != null) {
            admin.setPassword(null);
            Role role = adminService.getUserRole(id);
            if (role != null) {
                admin.setRoleName(role.getRoleName());
            }
        }
        return Result.success(admin);
    }

    // ==================== 获取可选角色列表 ====================

    @GetMapping("/roles")
    @ApiOperation("获取可选角色列表")
    public Result<List<Role>> getAvailableRoles() {
        List<Role> roles = adminService.getAvailableRoles();
        return Result.success(roles);
    }
}
