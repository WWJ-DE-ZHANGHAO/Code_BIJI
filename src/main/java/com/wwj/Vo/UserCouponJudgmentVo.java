package com.wwj.Vo;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserCouponJudgmentVo {
    private Integer IsLimit;//1是可以领取，0不可以领取

    @ApiModelProperty("主键id")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty("优惠券名称")
    @NotBlank(message ="优惠券名称不能为空")
    private String name;


    @ApiModelProperty("优惠券类型 1是满减券、2是折扣券")
    @NotNull(message = "优惠券类型不能为空")
    private Integer type;


    @ApiModelProperty("优惠券数值")
    @NotNull(message="优惠数值不能为空号")
    private BigDecimal discountValue;


    @ApiModelProperty("使用门槛")
    @NotNull(message="使用门槛不能为空")
    private BigDecimal minOrderAmount;


    @ApiModelProperty("使用范围 1-全场可用，2-特价专区可用，3-新书专区可用")
    @NotNull(message="使用范围不能为空")
    private Integer scope;


    @ApiModelProperty("优惠券来源 1-会员权益，2-促销活动")
    @NotNull(message="优惠券来源不能为空")
    private Integer source;

    @ApiModelProperty("发行总数量")
    @NotNull(message ="发行总数量不能为空")
    private Integer totalStock;

    @ApiModelProperty("每个用户限领数量，限制每个用户最多可领取该优惠券的张数,0表示无限制")
    @NotNull(message ="每个用户限领数量不能为空")
    private Integer limitPerUser;


    @ApiModelProperty("有效期开始时间")
    @NotNull(message ="有效期开始时间不能为空")
    private LocalDateTime validStartTime;

    @ApiModelProperty("有效期结束时间")
    @NotNull(message ="有效期结束时间不能为空")
    private LocalDateTime validEndTime;

    @ApiModelProperty(value = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

}

