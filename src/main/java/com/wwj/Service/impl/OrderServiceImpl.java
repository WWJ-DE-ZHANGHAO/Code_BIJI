package com.wwj.Service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Constant.MessageConstant;
import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Exception.UkonwnErrorException;
import com.wwj.Pojo.*;
import com.wwj.Mapper.OrderMapper;
import com.wwj.Query.OrderQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.*;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Vo.UserOrderSubmitVo;
import com.wwj.context.BaseContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
@Service
public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements IOrderService {
     @Autowired
     private IOrderDetailService orderDetailService;

     @Autowired
     private IProductService productService;

     @Autowired
     private IShoppingCartService shoppingCartService;

     @Autowired
     private IStockService stockService;

     @Autowired
     private IShippingRuleService shippingRuleService;
    //用户下单
     @Override
     @Transactional(rollbackFor = Exception.class)
    public UserOrderSubmitVo submit(UserOrderSubmit userOrderSubmit) {
         Long userId = BaseContext.getCurrentId();
         //生成订单
         Order order = BeanUtil.copyProperties(userOrderSubmit, Order.class);
         order.setUserId(userId);
         order.setOrderTime(LocalDateTime.now());
         save(order);
         String orderId = order.getId();
         //订单详情表
         List<OrderDetail> orderDetails = new ArrayList<>();

         // 购物车下单和立即购买分开处理，避免把 null 商品ID混入购物车ID集合
         if ("cart".equals(userOrderSubmit.getSource())) {
             List<Long> rawIds = userOrderSubmit.getShoppingCartIds();

             if (rawIds.isEmpty()) {
                 throw new UkonwnErrorException(MessageConstant.SHOPPING_CART_IS_NULL);
             }
             //给订单中的商品进行销量更新
             for (Long rawId : rawIds) {
                 ShoppingCart shoppingCart = shoppingCartService.getById(rawId);
                 Long PID = shoppingCart.getProductId();
                 Product bb = productService.getById(PID);
                         bb.setSalesCount(bb.getSalesCount() + shoppingCart.getNumber());
                         bb.setStock(bb.getStock() - shoppingCart.getNumber());
                         productService.updateById(bb);
                 stockService.lambdaUpdate()
                         .eq(Stock::getProductId, PID)
                         .set(Stock::getSaleStock,bb.getStock() )
                         .update();
             }

             // Only process current user's cart rows to prevent cross-user ids.
             List<ShoppingCart> shoppingCarts = shoppingCartService.lambdaQuery()
                     .in(ShoppingCart::getId, rawIds)
                     .eq(ShoppingCart::getUserId, userId)
                     .list();
             if (shoppingCarts.size() != rawIds.size()) {
                 throw new UkonwnErrorException(MessageConstant.SHOPPING_CART_IS_NULL);
             }

             for (ShoppingCart shoppingCart : shoppingCarts) {
                 OrderDetail orderDetail = new OrderDetail();
                 orderDetail.setOrderId(orderId);
                 orderDetail.setProductId(shoppingCart.getProductId());
                 orderDetail.setProductName(shoppingCart.getProductName());
                 orderDetail.setProductImage(shoppingCart.getProductImage());
                 orderDetail.setPrice(shoppingCart.getPrice());
                 // ShoppingCart uses `number`, but order_detail expects `quantity`.
                 orderDetail.setQuantity(shoppingCart.getNumber());
                 orderDetail.setProductDescription(shoppingCart.getProductDescription());
                 orderDetails.add(orderDetail);
             }

             if (orderDetails.isEmpty()) {
                 throw new UkonwnErrorException(MessageConstant.SHOPPING_CART_IS_NULL);
             }
             //删除购物车中的数据
             shoppingCartService.removeByIds(rawIds);
         } else {
             Long productId = userOrderSubmit.getProductId();
             Integer quantity = userOrderSubmit.getQuantity();
             if (productId == null || quantity == null || quantity <= 0) {
                 throw new UkonwnErrorException(MessageConstant.UNKNOWN_ERROR);
             }

             Product PD = productService.getById(productId);
             if (PD == null) {
                 throw new UkonwnErrorException(MessageConstant.UNKNOWN_ERROR);
             }

             OrderDetail orderDetail = new OrderDetail();
             orderDetail.setOrderId(orderId);
             orderDetail.setProductId(productId);
             orderDetail.setProductName(PD.getBookName());
             orderDetail.setProductImage(PD.getCoverUrl());
             orderDetail.setPrice(PD.getPrice());
             orderDetail.setQuantity(quantity);
             orderDetail.setProductDescription(PD.getDescription());
             orderDetails.add(orderDetail);
         }
         orderDetailService.saveBatch(orderDetails);
         UserOrderSubmitVo userOrderSubmitVo = new UserOrderSubmitVo(orderId, order.getActualPay(), order.getOrderTime());
         userOrderSubmitVo.setId(orderId);

         return userOrderSubmitVo;

    }

    //订单列表，复杂条件分页查询

    @Override
    public PageResult<Order> queryOrdersPage(OrderQuery orderQuery) {
        //构建分页条件构建排序条件，如果前端有排序字段，则用前端的排序字段，否则用默认的排序字段即订单时间降序
        Page<Order> page = orderQuery.toMpPage("order_time", false);
        boolean useKeyword =  StringUtils.hasText(orderQuery.getId());

        //执行分页查询
        page = lambdaQuery()
                .eq(orderQuery.getStatus() != null, Order::getOrderStatus, orderQuery.getStatus())
                .like(useKeyword, Order::getId, orderQuery.getId())
                .page(page);

        //封装结果并返回
        PageResult<Order> result = new PageResult<>();
        result.setList(page.getRecords());
        result.setPages(page.getPages());
        result.setTotal(page.getTotal());
        return result;
    }
}
