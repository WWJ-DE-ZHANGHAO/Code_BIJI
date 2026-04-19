package com.wwj.Controller.admin;


import com.wwj.Message.OrderRemindMessage;
import com.wwj.Pojo.*;
import com.wwj.Query.OrderQuery;
import com.wwj.RedisQueue.RemindRedisQueue;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.*;
import com.wwj.Vo.AdminOrderVo;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
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
@RestController("AdminOrderController")
@RequestMapping("/admin/order")
@Api(tags = "管理端订单管理")
public class OrderController {

    @Autowired
    private IOrderService orderService;

    @Autowired
    private IOrderDetailService orderDetailService;

    @Autowired
    private IAddressBookService addressBookService;

    @Autowired
    private UserService  userService;

    @Autowired
    private IProductService productService;

    @Autowired
    private  IStockService stockService;


    @Autowired
    private RemindRedisQueue remindRedisQueue;

    @Autowired
    private IUserCouponRecordService userCouponRecordService;

    @Autowired
    private IPointsLogService pointsLogService;



    //订单列表，复杂条件分页查询
    @GetMapping("/list")
    public Result<PageResult<Order>> list( OrderQuery  orderQuery){
        PageResult<Order> orderPageResult = orderService.queryOrdersPage(orderQuery);
        return Result.success(orderPageResult);
    }
    //根据id查询订单详情
    @GetMapping("/{id}")
    public Result<AdminOrderVo> getById(@PathVariable("id") Long id){
        return    Result.success(orderService.queryOrderDetial(id));
    }

    //订单发货
    @PutMapping("/delivery/{id}")
    public Result delivery(@PathVariable Long id){
         Order order = orderService.getById(id);
         if (order.getOrderStatus()!=2){
             return Result.error("订单状态异常，无法发货");
         }
         order.setOrderStatus(3);
         orderService.updateById(order);
         //减当前库存
         orderDetailService.lambdaQuery()
                 .eq(OrderDetail::getOrderId,id)
                 .list()
                 .forEach(orderDetail -> {
                     stockService.lambdaUpdate()
                             .setSql( "stock_num = stock_num - " + orderDetail.getQuantity())
                             .eq(Stock::getProductId,orderDetail.getProductId())
                             .update();
                 });
        return Result.success();

    }

    //订单同意退款
    @PutMapping("/agree/{id}")
    public Result refundAgree(@PathVariable Long id){
        Order order = orderService.getById(id);
        if (order.getOrderStatus()!=5&&order.getRefundStatus()!=1){
            return Result.error("订单状态异常，无法同意退款");
        }
        order.setRefundStatus(2);
        orderService.updateById(order);
        //恢复库存,同时回滚商品销量
        orderDetailService.lambdaQuery()
                .eq(OrderDetail::getOrderId,id)
                .list()
                .forEach(orderDetail -> {
                    productService.lambdaUpdate()
                            .setSql("stock=stock +"+orderDetail.getQuantity())
                            .setSql("sales_count=sales_count -"+ orderDetail.getQuantity())
                            .eq(Product::getId,orderDetail.getProductId())
                            .update();
                    stockService.lambdaUpdate()
                            .setSql("stock_num=stock_num +"+orderDetail.getQuantity())
                            .setSql("sale_stock=sale_stock +"+orderDetail.getQuantity())
                            .eq(Stock::getProductId,orderDetail.getProductId())
                            .update();
                });

        //回滚积分和成长值
        backpointsandgrowth( id);

        return Result.success();
    }


    //取消订单
    @PutMapping("/cancel/{id}")
    public Result cancel(@PathVariable Long id){
        //未付款的订单可以取消，已付款的但未发货、未收货、无售后的订单需要用户申请+管理员同意的方式取消，已收货的只能申请售后，售后中的订单不能取消
         Order order = orderService.getById(id);
         if (order.getOrderStatus()==5){
             return Result.error("订单正在售后中，无法取消");
         }
         else if (order.getOrderStatus()==6){
             return Result.error("订单状态异常，无法取消");
         }
         order.setOrderStatus(6);
         order.setCancelReason("商家取消");
         order.setCancelTime(LocalDateTime.now());
         orderService.updateById(order);
        //恢复库存
         orderDetailService.lambdaQuery()
                 .eq(OrderDetail::getOrderId,id)
                 .list()
                 .forEach(orderDetail -> {
                     productService.lambdaUpdate()
                             .setSql("stock=stock +"+orderDetail.getQuantity())
                             .setSql("sales_count=sales_count -"+ orderDetail.getQuantity())
                             .eq(Product::getId,orderDetail.getProductId())
                             .update();
                     stockService.lambdaUpdate()
                             .setSql("sale_stock=sale_stock +"+orderDetail.getQuantity())
                             .eq(Stock::getProductId,orderDetail.getProductId())
                             .update();
                 });
         //回滚积分和成长值
          backpointsandgrowth( id);

        return Result.success();
    }


   //管理端上线拉去未读取的催发货消息
    @GetMapping("/getUnreadMessage")
    public Result<List<OrderRemindMessage>> getUnreadMessage(){
        //获取未读消息
        List<OrderRemindMessage> list = remindRedisQueue.popAll();
        return Result.success(list);
    }

    //订单取消时，退回积分和成长值的 方法
    public void  backpointsandgrowth(Long id){
        //回滚积分和成长值，退回优惠券
        Order OO = orderService.getById(id);
        Long couponRecordId = OO.getCouponRecordId();
        Integer usedPoints = OO.getUsedPoints();
        Long userId = BaseContext.getCurrentId();
        if (couponRecordId!=null) {
            //退回优惠券
            UserCouponRecord CC = userCouponRecordService.getById(couponRecordId);
            CC.setReceiveTime(LocalDateTime.now());
            CC.setStatus(0);
            CC.setUseTime(null);
        }
        //回滚积分和成长值
        userService.lambdaUpdate().eq(User::getId, userId).setSql("points=points+"+usedPoints)
                .update();
        PointsLog PL = new PointsLog();
        PL.setUserId(userId);
        PL.setChangeAmount(+usedPoints);
        PL.setReason("订单取消");
        PL.setCreateTime(LocalDateTime.now());
        pointsLogService.save(PL);
        //回滚成长值
        if (OO.getActualPay().compareTo(BigDecimal.valueOf(100))>=0){
            userService.lambdaUpdate().eq(User::getId, userId)
                    .setSql("growth_value=growth_value-20,points=points-200")
                    .update();
            PointsLog PL1 = new PointsLog();
            PL1.setUserId(userId);
            PL1.setChangeAmount(-200);
            PL1.setReason("订单取消");
            PL1.setCreateTime(LocalDateTime.now());
            pointsLogService.save(PL1);
        }
    }

}
