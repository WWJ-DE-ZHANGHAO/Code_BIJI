package com.wwj.Dto;

import lombok.Data;

@Data
public class EmployeeDto {
    private Long id;
    private String username;
    private String password;
    private String realName;
    private Long roleId;
}