package com.wwj.Vo;

import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UsepointsVo {
    @ApiModelProperty("使用的积分")
    private Integer points;

    @ApiModelProperty("兑换的金额")
    private BigDecimal amount;
}
