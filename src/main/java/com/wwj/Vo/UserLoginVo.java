package com.wwj.Vo;

import com.wwj.Pojo.AddressBook;
import com.wwj.Pojo.Order;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(description = "用户登录返回的数据格式")
public class UserLoginVo {
    private String username;
    private String avatar;
    private String refreshToken;
    private String expiresIn;
    private String accessToken;
}
