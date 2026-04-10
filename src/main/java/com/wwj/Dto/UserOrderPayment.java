package com.wwj.Dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jdk.jfr.Label;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserOrderPayment {
    private String id;//订单ID
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime checkoutTime;//结账时间
    private Integer paymentMethod;//支付方式: 1微信, 2支付宝
}
