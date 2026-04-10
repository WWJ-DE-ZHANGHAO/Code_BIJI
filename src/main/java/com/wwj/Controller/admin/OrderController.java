package com.wwj.Controller.admin;


import com.wwj.Dto.UserOrderPayment;
import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Pojo.Order;
import com.wwj.Pojo.OrderDetail;
import com.wwj.Query.OrderQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.IOrderDetailService;
import com.wwj.Service.IOrderService;
import com.wwj.Vo.AdminOrderVo;
import com.wwj.Vo.UserOrderSubmitVo;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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

    //订单列表，复杂条件分页查询
    @GetMapping("/list")
    public Result<PageResult<Order>> list( OrderQuery  orderQuery){
        PageResult<Order> orderPageResult = orderService.queryOrdersPage(orderQuery);
        return Result.success(orderPageResult);
    }
    /*//根据id查询订单详情
    @GetMapping("/{id}")
    public Result<AdminOrderVo> getById(@PathVariable("id") Long id){
        List<OrderDetail> list = orderDetailService.lambdaQuery()
                .eq(OrderDetail::getOrderId, id)
                .list();
        return Result.success(list);
    }*/

    //订单发货
    @PutMapping("/delivery")
    public Result delivery(@RequestBody Order order){
        return Result.success();

    }

    //订单同意退款
    @PutMapping("/refund/agree")
    public Result refundAgree(@RequestBody Order order){
        return Result.success();
    }


    //取消订单
    @PutMapping("/cancel")
    public Result cancel(@RequestBody Order order){
        //未付款的订单可以取消，已付款的但未发货、未收货、无售后的订单需要用户申请+管理员同意的方式取消，已收货的只能申请售后，售后中的订单不能取消
        return Result.success();
    }





}
