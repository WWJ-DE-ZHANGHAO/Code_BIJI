package com.wwj.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Dto.AdminLoginDto;
import com.wwj.Dto.AdminRegisterDto;
import com.wwj.Pojo.Admin;
import com.wwj.Pojo.Role;
import com.wwj.Query.EmployeeQuery;
import com.wwj.Result.PageResult;

import java.util.List;

public interface AdminService extends IService<Admin> {

    Admin login(AdminLoginDto adminLoginDto);

    Admin register(AdminRegisterDto adminRegisterDto);

    void updateUser(Admin admin);

    // ==================== 新增方法 ====================

    List<String> getUserPermissions(Long adminId);

    Role getUserRole(Long adminId);

    /**
     * 获取可选角色列表（根据当前用户权限返回）
     */
    List<Role> getAvailableRoles();
    // ==================== 分页查询 ====================
    PageResult<Admin> QueryPage(EmployeeQuery employeeQuery);
}
