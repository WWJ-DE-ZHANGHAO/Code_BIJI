package com.wwj.Pojo;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.*;
import lombok.experimental.Accessors;

/**
 * <p>
 * 后台管理员表
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-27
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@Builder
@TableName("admin")
@ApiModel(value="Admin对象", description="后台管理员表")
@AllArgsConstructor
@NoArgsConstructor
public class Admin implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "登录账号")
    private String username;

    @ApiModelProperty(value = "密码(需加密)")
    private String password;

    @ApiModelProperty(value = "管理员姓名")
    private String realName;

    @ApiModelProperty(value = "状态: 1启用, 0禁用")
    private Integer status;

    @ApiModelProperty(value = "角色Id")
    private Long roleId;

    @ApiModelProperty(value = "逻辑删除,0是正常。1是删除")
    @TableField("is_deleted")
    @TableLogic
    private Integer isDeleted;

    @TableField(exist = false)
    private String roleName;

    @ApiModelProperty(value = "创建时间")
    @TableField(fill = FieldFill.INSERT)//这个注解的功能，插入数据时不需要set值，会自动填充当前时间
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

}
