package com.wwj.Dto;

import io.swagger.annotations.ApiModel;
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
@ApiModel(value = "查询未使用的优惠券的请求参数")
public class UseableCouponDto {
       @ApiModelProperty("商品Id")
        private Long productId;
       @ApiModelProperty("该商品的小计")
        private BigDecimal totalprice;
}
