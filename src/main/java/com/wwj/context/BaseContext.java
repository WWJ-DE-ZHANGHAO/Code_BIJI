package com.wwj.context;

import java.util.List;

public class BaseContext {

    public static ThreadLocal<Long> threadLocal = new ThreadLocal<>();

    // ==================== 新增权限和角色存储 ====================
    public static ThreadLocal<List<String>> permissionsLocal = new ThreadLocal<>();
    public static ThreadLocal<String> roleCodeLocal = new ThreadLocal<>();

    // 用户ID
    public static void setCurrentId(Long id) {
        threadLocal.set(id);
    }

    public static Long getCurrentId() {
        return threadLocal.get();
    }

    public static void removeCurrentId() {
        threadLocal.remove();
    }

    // ==================== 新增方法 ====================

    // 权限列表
    public static void setPermissions(List<String> permissions) {
        permissionsLocal.set(permissions);
    }

    public static List<String> getPermissions() {
        return permissionsLocal.get();
    }

    public static void removePermissions() {
        permissionsLocal.remove();
    }

    // 角色编码
    public static void setRoleCode(String roleCode) {
        roleCodeLocal.set(roleCode);
    }

    public static String getRoleCode() {
        return roleCodeLocal.get();
    }

    public static void removeRoleCode() {
        roleCodeLocal.remove();
    }

    // 检查是否有某个权限
    public static boolean hasPermission(String permission) {
        List<String> permissions = getPermissions();
        return permissions != null && permissions.contains(permission);
    }

    // 检查是否有某个角色
    public static boolean hasRole(String roleCode) {
        String currentRole = getRoleCode();
        return roleCode.equals(currentRole);
    }
}
