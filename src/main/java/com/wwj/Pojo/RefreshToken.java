package com.wwj.Pojo;

import lombok.Data;

import java.time.LocalDateTime;
@Data
public class RefreshToken {
    private String token;//Refreshtoken
    private Long userId;//登录用户
    private LocalDateTime createTime;//创建时间
    private LocalDateTime expireTime;//过期时间
}
