package com.wwj.Service;

import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Pojo.Order;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Query.OrderQuery;
import com.wwj.Result.PageResult;
import com.wwj.Vo.AdminOrderVo;
import com.wwj.Vo.UserOrderSubmitVo;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
public interface IOrderService extends IService<Order> {
    //用户下单
    UserOrderSubmitVo submit(UserOrderSubmit userOrderSubmit);
    //订单列表，复杂条件分页查询
    PageResult<Order> queryOrdersPage(OrderQuery orderQuery);
    //管理端根据id查询订单详情
    AdminOrderVo queryOrderDetial(Long id);
}
