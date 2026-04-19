package com.wwj.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserOrderSubmit {
    private String source;//订单来源，商品详情页下单、购物车下单
    private Long couponRecordId;//优惠领取记录ID
    private Integer usedPoints;//使用的积分
    private Long addressBookId;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime estimatedDeliveryTime;
    private String consigneeName;
    private String phone;
    private BigDecimal actualPay;//实际支付金额
    private BigDecimal originalTotal;//原价
    private BigDecimal freight;//运费
    private BigDecimal activityDiscount;//总优惠金额
    private Long productId;//商品ID,只有在商品详情页下单时才需要传递
    private Integer quantity;//商品数量,只有在商品详情页下单时才需要传递
    private List<Long> shoppingCartIds;//购物车ID列表，只有在购物车下单时才需要传递

}
