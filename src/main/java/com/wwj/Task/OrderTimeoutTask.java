package com.wwj.Task;

import com.wwj.Pojo.Order;
import com.wwj.Service.IOrderService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/*@Component
@Slf4j
public class OrderTimeoutTask {
    @Autowired
    private IOrderService orderService;

   //每五分钟检测一次订单是否超时
    @Scheduled(cron = "0 0/5 * * * ?")
    public void checkOrderTimeout() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime Deadline = now.minusDays(1);
        log.info("订单超时截止时间：{}", Deadline);
        log.info("开始检测订单超时...");
        List<Order> list = orderService.lambdaQuery().eq(Order::getOrderStatus, 1)
                .lt(Order::getOrderTime, Deadline) //订单时间在截止时间之前，超过24小时未支付
                .list();
        for (Order order : list) {
            order.setOrderStatus(6); //订单状态改为已取消
            order.setCancelReason("订单超时未支付");
            order.setCancelTime( now);
        }
        log.info("订单超时检测完成.");
    }


}*/
