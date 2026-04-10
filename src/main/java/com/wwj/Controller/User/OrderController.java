package com.wwj.Controller.User;


import com.wwj.Dto.UserOrderPayment;
import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Pojo.Order;
import com.wwj.Pojo.OrderDetail;
import com.wwj.Pojo.Product;
import com.wwj.Result.Result;
import com.wwj.Service.IOrderDetailService;
import com.wwj.Service.IOrderService;
import com.wwj.Service.IProductService;
import com.wwj.Vo.UserOrderSubmitVo;
import com.wwj.context.BaseContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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
    public Result repetition(){


        return Result.success();
    }


    //取消订单
    @PutMapping("/cancel/{id}")
    public Result cancel(){


        return Result.success();
    }

    //催发货
    @GetMapping("/remind/{id}")
    public Result remind(){


        return Result.success();
    }

}
