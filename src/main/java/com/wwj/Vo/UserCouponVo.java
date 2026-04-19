package com.wwj.Vo;

import com.baomidou.mybatisplus.annotation.IdType;
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
public class UserCouponVo {

    @ApiModelProperty("优惠券状态 0-未使用，1-已使用，2-已过期")
    private Integer status;

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


    @ApiModelProperty("有效期开始时间")
    @NotNull(message ="有效期开始时间不能为空")
    private LocalDateTime validStartTime;

    @ApiModelProperty("有效期结束时间")
    @NotNull(message ="有效期结束时间不能为空")
    private LocalDateTime validEndTime;
}
