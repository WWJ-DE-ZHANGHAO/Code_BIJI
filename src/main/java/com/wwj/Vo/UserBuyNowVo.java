package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserBuyNowVo {
    private UserBuy buy;
    private BigDecimal activityDiscount;
    private BigDecimal originalTotal;
}
