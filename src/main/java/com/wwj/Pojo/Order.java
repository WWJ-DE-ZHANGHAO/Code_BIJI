package com.wwj.Pojo;

import java.math.BigDecimal;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import java.time.LocalDateTime;
import com.baomidou.mybatisplus.annotation.TableId;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 订单主表
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-06
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("`order`")
@ApiModel(value="Order对象", description="订单主表")
public class Order implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "订单ID")
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private String id;

    @ApiModelProperty(value = "订单状态: 1待付款、2待发货、3待收货、4已收货、5售后、6评价、7已取消")
    private Integer orderStatus;

    @ApiModelProperty(value = "售后状态: 0未申请售后、1售后中、2已完结")
    private Integer refundStatus=0;

    @ApiModelProperty(value = "退款原因")
    private String refundReason;

    @ApiModelProperty(value = "评价状态: 0不可评价、1未评价、2已评价")
    private Integer commentStatus=0;

    @ApiModelProperty(value = "用户ID")
    private Long userId;

    @ApiModelProperty(value = "地址簿ID")
    private Integer addressBookId;

    @ApiModelProperty(value = "下单时间")
    private LocalDateTime orderTime;

    @ApiModelProperty(value = "结账时间")
    private LocalDateTime checkoutTime;

    @ApiModelProperty(value = "支付方式: 1微信, 2支付宝")
    private Integer paymentMethod;

    @ApiModelProperty(value = "支付状态: 1未支付、2已经付、3已退款")
    private Integer paymentStatus;

    @ApiModelProperty(value = "实际支付金额")
    private BigDecimal actualPay;

    @ApiModelProperty(value = "手机号")
    private String phone;

    @ApiModelProperty(value = "收货人姓名")
    private String consigneeName;

    @ApiModelProperty(value = "订单取消原因")
    private String cancelReason;

    @ApiModelProperty(value = "取消时间")
    private LocalDateTime cancelTime;

    @ApiModelProperty(value = "预计送达时间")
    private LocalDateTime estimatedDeliveryTime;

    @ApiModelProperty(value = "送达时间")
    private LocalDateTime deliveryTime;

    @ApiModelProperty(value = "运费模版ID")
    private Integer shippingTemplateId;

    @ApiModelProperty(value = "商品原价总额")
    private BigDecimal originalTotal;

    @ApiModelProperty(value = "活动优惠金额")
    private BigDecimal activityDiscount;

    @ApiModelProperty(value = "运费")
    private BigDecimal freight;


}
