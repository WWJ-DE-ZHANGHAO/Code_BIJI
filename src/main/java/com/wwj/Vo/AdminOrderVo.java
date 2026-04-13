package com.wwj.Vo;

import com.wwj.Pojo.OrderDetail;
import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(value = "管理端订单详情")
public class AdminOrderVo {
    private String id;//订单ID
    private String userName;//下单用户
    private String phone;//手机号
    private String address;//收货地址
    private LocalDateTime orderTime;//下单时间
    private Integer orderStatus;//订单状态：
    private String refundReason;//退款原因
    private BigDecimal activityDiscount;//优惠金额
    private BigDecimal freight;//运费
    private List<OrderDetail> orderDetailVos;
}
