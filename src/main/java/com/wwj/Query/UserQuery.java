package com.wwj.Query;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "用户查询条件")
public class UserQuery extends  PageQuery{
    private String username;
    private String phone;
    private Integer status;

}
