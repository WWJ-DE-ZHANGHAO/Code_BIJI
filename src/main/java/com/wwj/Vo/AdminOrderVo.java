package com.wwj.Vo;

import com.wwj.Pojo.OrderDetail;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(value = "管理端订单详情")
public class AdminOrderVo {
    private String orderId;//订单ID
    private String userName;//收货人
    private String phone;//手机号
    private String address;//收货地址
    private LocalDateTime orderTime;//下单时间
    private Integer status;//订单状态：
    private String refundReason;//退款原因
    private OrderDetail[] orderDetailVos;
}
