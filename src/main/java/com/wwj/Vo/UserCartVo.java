package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserCartVo {
    private List<Long> ShoppingCartIds;//购物车ID列表,用于后续提交订单时删除购物车数据
    private List<UserBuy> buyNows;
    private BigDecimal activityDiscount;//优惠金额
    private BigDecimal originalTotal;//原价总金额
}
