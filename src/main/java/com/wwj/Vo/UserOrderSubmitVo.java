package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserOrderSubmitVo {
    //订单号
    private String Id;
    //订单金额
    private BigDecimal amount;
    //下单时间
    private LocalDateTime orderTime;
}
