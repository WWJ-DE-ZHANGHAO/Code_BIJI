package com.wwj.DelayMessage;

import com.wwj.Pojo.*;
import com.wwj.Result.Result;
import com.wwj.Service.*;
import com.wwj.context.BaseContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static com.wwj.Constant.RedisConstants.PRODUCT_SHOP_STOCK;

@Component
@Slf4j
public class OrderDelayConsumer {
    @Autowired
    private IOrderService orderService;
    @Autowired
    private IOrderDetailService orderDetailService;

    @Autowired
    private IProductService productService;

    @Autowired
    private IStockService stockService;
    @Autowired
    private UserService userService;
    @Autowired
    private IPointsLogService pointsLogService;
    @Autowired
    private IUserCouponRecordService userCouponRecordService;

    @Autowired
    private RedisTemplate redisTemplate;

    @RabbitListener(bindings=@QueueBinding(
            value=@Queue(value="payment-queue", durable="true"),
            exchange=@Exchange(name="payment-exchange",delayed = "true"),
            key={"payment-routing-key"}))
    public void consume(Map<String, Object> message) {
        System.out.println("接受到延迟消息");
        String orderId = message.get("orderId").toString();
        Long userId = Long.valueOf(message.get("userId").toString());
        Order order = orderService.getById(orderId);
        if (order == null) {
            System.err.println("订单不存在，无法取消: " + orderId);
            // 可以选择：记录到死信队列、发送告警、或者直接返回
            return;
        }
        //查看订单状态
        Integer orderStatus = orderService.lambdaQuery().eq(Order::getId, orderId).one().getOrderStatus();
        //如果订单状态为已支付，则直接返回
        if (orderStatus != 1) {
           return;
        }
        //如果是未支付 ，则取消订单，将sql回滚，并将缓存预减的库存数量加回来

            orderService.lambdaUpdate()
                    .set(Order::getOrderStatus, 6)
                    .set(Order::getCancelReason, "用户取消订单")
                    .set(Order::getCancelTime, LocalDateTime.now())
                    .eq(Order::getId, orderId)
                    .update();
            //取消订单后需要回滚销量库存
            List<OrderDetail> list = orderDetailService.lambdaQuery().eq(OrderDetail::getOrderId, orderId).list();
            for (OrderDetail orderDetail : list) {
                Long productId = orderDetail.getProductId();
                Product product = productService.getById(productId);
                product.setSalesCount(product.getSalesCount() - orderDetail.getQuantity());
                product.setStock(product.getStock() + orderDetail.getQuantity());
                productService.updateById(product);
                stockService.lambdaUpdate().eq(Stock::getProductId, productId)
                        .set(Stock::getSaleStock, product.getStock())
                        .update();
                //回滚Redis库存
                redisTemplate.opsForValue().increment(PRODUCT_SHOP_STOCK + productId, orderDetail.getQuantity());
            }
            //回滚积分和成长值，退回优惠券
            Order OO = orderService.getById(orderId);
            Long couponRecordId = OO.getCouponRecordId();
            Integer usedPoints = OO.getUsedPoints();

            if (couponRecordId != null) {
                //退回优惠券
                UserCouponRecord cc = userCouponRecordService.getById(couponRecordId);
                if (cc != null) {
                    cc.setReceiveTime(LocalDateTime.now());
                    cc.setStatus(0);  // 0=未使用
                    cc.setUseTime(null);
                    userCouponRecordService.updateById(cc);
                } else {
                    log.info("优惠券记录不存在，无法退回: couponRecordId={}", couponRecordId);
                }
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
    }



}
