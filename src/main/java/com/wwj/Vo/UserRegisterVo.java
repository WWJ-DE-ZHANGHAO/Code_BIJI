package com.wwj.Vo;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(description = "用户注册时返回的数据格式")
public class UserRegisterVo {
        private String username;
        private String avatar;
        private String token;


}
