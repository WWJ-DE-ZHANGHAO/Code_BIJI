package com.wwj.Controller.User;


import com.wwj.Dto.UserOrderPayment;
import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Dto.UsersSaveShoppingCartDto;
import com.wwj.Message.OrderRemindMessage;
import com.wwj.Pojo.*;
import com.wwj.RedisQueue.RemindRedisQueue;
import com.wwj.Result.Result;
import com.wwj.Service.*;
import com.wwj.Vo.UserOrderSubmitVo;
import com.wwj.context.BaseContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * <p>
 *  前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
@RestController("UserOrderController")
@RequestMapping("/user/order")
public class OrderController {

    @Autowired
    private IOrderService orderService;

    @Autowired
    private IOrderDetailService orderDetailService;

    @Autowired
    private IProductService productService;

    @Autowired
    private IStockService stockService;

    @Autowired
    private IShoppingCartService shoppingCartService;

   @Autowired
    private RemindRedisQueue remindRedisQueue;

    @Autowired
    private SimpMessagingTemplate messageTemplate;

    @Autowired
    private UserService userService;


    @Autowired
    private IUserCouponRecordService userCouponRecordService;

    @Autowired
    private IPointsLogService pointsLogService;
    //用户下单
    @PostMapping("/submit")
    public Result<UserOrderSubmitVo> submit(@RequestBody UserOrderSubmit userOrderSubmit){
        return Result.success(orderService.submit(userOrderSubmit));
    }

    //订单支付
    @PutMapping("/payment")
    public Result pay(@RequestBody UserOrderPayment userOrderPayment){
     String id = userOrderPayment.getId();
     //查询订单状态，如果订单状态不为待支付，则无法支付
        Order order = orderService.getById(id);
        if (order.getOrderStatus() != 1){
            return Result.error("订单已付款，请勿重复支付");
        }

        boolean BU = orderService.lambdaUpdate().set(Order::getPaymentStatus, 2)
                .set(Order::getOrderStatus, 2)
                .set(Order::getPaymentMethod, userOrderPayment.getPaymentMethod())
                .set(Order::getCheckoutTime, userOrderPayment.getCheckoutTime())
                .eq(Order::getId, id)
                .update();
        System.out.println(BU);
              /*  .set("payment_method",userOrderPayment.getPaymentMethod())
                .set("checkout_time",userOrderPayment.getCheckoutTime())
                .set("payment_status",2)
                .set("order_status",2)
                .eq("id",id)
                .update();*/
        return Result.success();
    }

    //查询历史订单列表
    @GetMapping("/historyOrders")
    public Result<List<Order>>list(){
        Long userId = BaseContext.getCurrentId();
        List<Order> list = orderService.lambdaQuery()
                .eq(Order::getUserId, userId)
                .orderByDesc(Order::getOrderTime)
                .list();
        return Result.success(list);
    }

    //查询订单详情
    @GetMapping("/orderDetial/{id}")
    public Result<List<OrderDetail>> detail(@PathVariable String id){
        Long userId = BaseContext.getCurrentId();
        List<OrderDetail> list = orderDetailService.lambdaQuery()
                .eq(OrderDetail::getOrderId, id)
                .list();
        return Result.success(list);
    }

    //再来一单
    @PostMapping("/repetition/{id}")
    public Result repetition(@PathVariable String id){
        Long userId = BaseContext.getCurrentId();
        List<OrderDetail> list = orderDetailService.lambdaQuery().eq(OrderDetail::getOrderId, id).list();
        for (OrderDetail orderDetail : list) {
            Long productId = orderDetail.getProductId();
            Integer quantity = orderDetail.getQuantity();
            UsersSaveShoppingCartDto USSCD = new UsersSaveShoppingCartDto(productId, quantity);
            shoppingCartService.Add(USSCD);
        }


        return Result.success();
    }


    //取消订单
    @PutMapping("/cancel/{id}")
    public Result cancel(@PathVariable String id){
        orderService.lambdaUpdate()
                .set(Order::getOrderStatus, 6)
                .set(Order::getCancelReason, "用户取消订单")
                .set(Order::getCancelTime, LocalDateTime.now())
                .eq(Order::getId, id)
                .update();
        //取消订单后需要回滚销量库存
        List<OrderDetail> list = orderDetailService.lambdaQuery().eq(OrderDetail::getOrderId, id).list();
        for (OrderDetail orderDetail : list) {
            Long productId = orderDetail.getProductId();
            Product product = productService.getById(productId);
            product.setSalesCount(product.getSalesCount() - orderDetail.getQuantity());
            product.setStock(product.getStock() + orderDetail.getQuantity());
            productService.updateById(product);
            stockService.lambdaUpdate().eq(Stock::getProductId, productId)
                    .set(Stock::getSaleStock, product.getStock())
                    .update();
        }
        //回滚积分和成长值，退回优惠券
        Order OO = orderService.getById(id);
        Long couponRecordId = OO.getCouponRecordId();
        Integer usedPoints = OO.getUsedPoints();
        Long userId = BaseContext.getCurrentId();
        if (couponRecordId != null) {
            //退回优惠券
            UserCouponRecord CC = userCouponRecordService.getById(couponRecordId);
            CC.setReceiveTime(LocalDateTime.now());
            CC.setStatus(0);
            CC.setUseTime(null);
        }
        //回滚积分
        userService.lambdaUpdate().eq(User::getId, userId).setSql("points=points+"+usedPoints)
                .update();
        PointsLog PL = new PointsLog();
        PL.setUserId(userId);
        PL.setChangeAmount(+usedPoints);
        PL.setReason("订单取消");
        PL.setCreateTime(LocalDateTime.now());
        pointsLogService.save(PL);
        //回滚成长值和积分
        if (OO.getActualPay().compareTo(BigDecimal.valueOf(100))>=0){
            userService.lambdaUpdate().eq(User::getId, userId)
                    .setSql("growth_value=growth_value-"+20)
                    .setSql("points=points-"+200)
                    .update();
            PointsLog PL1 = new PointsLog();
            PL1.setUserId(userId);
            PL1.setChangeAmount(-200);
            PL1.setReason("订单取消");
            PL1.setCreateTime(LocalDateTime.now());
            pointsLogService.save(PL1);
        }



        return Result.success();
    }

    //催发货，使用WebSocket向商家发送消息，商家端接收消息后会弹出提示框，提示有订单需要发货
    @GetMapping("/remind/{id}")
    public Result<String> remind(@PathVariable String id){
        //创建消息
        Long userId = BaseContext.getCurrentId();
        OrderRemindMessage ORM = new OrderRemindMessage();
        ORM.setOrderId( id);
        ORM.setUserId(userId);
        ORM.setContent("用户催发货，请尽快发货");
        ORM.setCreateTime(LocalDateTime.now());
        //将消息存入Redis队列
        remindRedisQueue.push(ORM);
        //WebSocket推送所有管理端
        messageTemplate.convertAndSend("/topic/admin/order/remind", ORM);

        return Result.success("催发货成功");
    }


    //申请退款
    @PutMapping("/refund")
    public Result refund(@RequestParam("id") String id ,@RequestParam("reason") String reason){
        if (reason == null || reason.trim().isEmpty()){
            return Result.error("请输入退款理由");
        }
        Order order = orderService.getById(id);
        order.setOrderStatus(5);
        order.setRefundStatus(1);
        order.setRefundReason(reason);
        orderService.updateById(order);
        return Result.success();
    }

    //确认收货
    @PutMapping("/receive/{id}")
    public Result receive(@PathVariable String id){
        Order order = orderService.getById(id);
        order.setOrderStatus(4);
        order.setDeliveryTime(LocalDateTime.now());
        order.setCommentStatus(1);
        orderService.updateById(order);
        return Result.success();
    }

    //查看填写订单页面的商品信息

}
