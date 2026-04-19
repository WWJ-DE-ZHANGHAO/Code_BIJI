package com.wwj.Pojo;

import java.math.BigDecimal;

import com.baomidou.mybatisplus.annotation.*;

import java.time.LocalDateTime;
import java.io.Serializable;

import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 运费规则表
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName(value="shipping_rule",autoResultMap = true)
@ApiModel(value="ShippingRule对象", description="运费规则表")
public class ShippingRule implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "运费模板ID")
    private Long shippingTemplateId;


    @ApiModelProperty(value = "配送地区")
    private String region;

    @ApiModelProperty(value = "运费模版名称")
    private String shippingTemplateName;

    @ApiModelProperty(value = "运费金额")
    private BigDecimal freight;

    @ApiModelProperty(value = "创建人ID")
    private Long createdBy;

    @ApiModelProperty(value = "更新人ID")
    private Long updatedBy;

    @ApiModelProperty(value = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createAt;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateAt;


}
