package com.wwj.Pojo;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;

import com.wwj.Constant.StatusConstant;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 用户表
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("user")
@ApiModel(value="User对象", description="用户表")
public class User implements Serializable {


    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "用户名/登录账号")
    private String username;

    @ApiModelProperty(value = "登录密码")
    private String password;

    @ApiModelProperty(value = "手机号码")
    private String phone;

    @ApiModelProperty(value = "头像URL")
    private String avatar ="https://so1.360tres.com/t014e1914e58c4616f4.png";

    @ApiModelProperty(value = "性别 (0:未知 1:男 2:女)")
    private Integer gender =0;

    @ApiModelProperty(value = "账号状态 (0:禁用 1:正常)")
    private Integer status =StatusConstant.ENABLE;

    @ApiModelProperty(value = "会员等级ID")
    private Long memberLevelId;

    @ApiModelProperty(value = "可用积分")
      private Integer points =0;

    @ApiModelProperty(value = "成长值")
    private Integer growthValue =0;

    @ApiModelProperty(value = "注册时间")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;


}
