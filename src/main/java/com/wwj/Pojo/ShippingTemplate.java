package com.wwj.Pojo;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 运费模板表
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-04
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("shipping_template")
@ApiModel(value="ShippingTemplate对象", description="运费模板表")
public class ShippingTemplate implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "模板名称(如: 顺丰, 普通)")
    private String name;

    @ApiModelProperty(value = "是否包邮: 1是, 0否")
    private Integer isFree;

    @ApiModelProperty(value = "创建人ID")
    private Integer createdBy;

    @ApiModelProperty(value = "更新人ID")
    private Integer updatedBy;

    @ApiModelProperty(value = "创建时间")
    @TableField(fill = FieldFill.INSERT)//这个注解的功能，插入数据时不需要set值，会自动填充当前时间
    private LocalDateTime createdAt;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;



}
