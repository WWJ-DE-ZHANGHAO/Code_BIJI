package com.wwj.Service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wwj.Constant.MessageConstant;
import com.wwj.Dto.UserOrderSubmit;
import com.wwj.Exception.ProductStockNotEnough;
import com.wwj.Exception.UkonwnErrorException;
import com.wwj.Pojo.*;
import com.wwj.Mapper.OrderMapper;
import com.wwj.Query.OrderQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.*;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Utils.RedisIdWorker;
import com.wwj.Vo.AdminOrderVo;
import com.wwj.Vo.UserOrderSubmitVo;
import com.wwj.context.BaseContext;
import io.lettuce.core.dynamic.annotation.Key;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.NotNull;
import org.springframework.amqp.core.ExchangeTypes;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.*;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
@Service
@Slf4j
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

     @Autowired
     private IAddressBookService addressBookService;

     @Autowired
     private UserService userService;

     @Autowired
     private IUserCouponRecordService userCouponRecordService;
     @Autowired
     private IPointsLogService pointsLogService;

     @Autowired
     private IMemberLevelService memberLevelService;

     @Autowired
     private ObjectMapper objectMapper ;

    private static final DefaultRedisScript<Long> PRODUCT_SCRIPT ;
    static {
        PRODUCT_SCRIPT = new DefaultRedisScript<>();
        PRODUCT_SCRIPT.setLocation(new ClassPathResource("Product.lua"));
        PRODUCT_SCRIPT.setResultType(Long.class);
    }
    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private RedisIdWorker redisIdWorker;

    private static final String MID = "MessageID:";

    //用户下单
     @Override
    public UserOrderSubmitVo submit(UserOrderSubmit userOrderSubmit) {
         Long userId = BaseContext.getCurrentId();
         Integer quantity = userOrderSubmit.getQuantity();
         Long productId = userOrderSubmit.getProductId();
         if (quantity == null || quantity <= 0) {
             List<Long> shoppingCartIds = userOrderSubmit.getShoppingCartIds();
             for (Long shoppingCartId : shoppingCartIds) {
                 ShoppingCart SC = shoppingCartService.lambdaQuery().eq(ShoppingCart::getId, shoppingCartId).one();
                 Long ProductId = SC.getProductId();
                 Integer number = SC.getNumber();
                 Long R = stringRedisTemplate.execute(PRODUCT_SCRIPT, Collections.emptyList(), ProductId.toString(), number.toString());
                 int I = R.intValue();
                 if (I==1){
                     throw new ProductStockNotEnough(MessageConstant.PRODUCT_STOCK_NOT_ENOUGH);
                 }

             }
         }
         else {
             Long RR = stringRedisTemplate.execute(PRODUCT_SCRIPT, Collections.emptyList(), productId.toString(), quantity.toString());
             int i = RR.intValue();
             if (i == 1) {
                 throw new ProductStockNotEnough(MessageConstant.PRODUCT_STOCK_NOT_ENOUGH);
             }
         }
          //创建订单号
         Long OrderId = redisIdWorker.nextId("order");
         Map<String, Object> map = new HashMap<>();
         map.put("orderId", OrderId);
         map.put("userId", userId);
         map.put("userOrderSubmit", userOrderSubmit);
         //发送消息给RabbitMQ，执行SQL创建订单
         rabbitTemplate.convertAndSend("order-exchange", "order-routing-key", map);
         return new UserOrderSubmitVo(OrderId.toString(), userOrderSubmit.getActualPay(), LocalDateTime.now());

     }

     @RabbitListener(bindings=@QueueBinding(
             value=@Queue(value="order-queue", durable="true",arguments = @Argument(name = "x-queue-mode", value = "lazy")),
             exchange=@Exchange(name="order-exchange",type= ExchangeTypes.DIRECT),
             key={"order-routing-key"}))
     @Transactional( rollbackFor = Exception.class)
    public void CreateProductOrder(Message message) throws IOException {
         System.out.println("=== 收到订单创建消息 ===");
         // 获取消息ID,用于幂等校验
         String messageId = message.getMessageProperties().getMessageId();
         String s = stringRedisTemplate.opsForValue().get(MID + messageId);
         if (StringUtils.hasText(s)) {
             // 幂等处理
             System.out.println("=== 订单已处理,忽略 ===");
             return;
         }
         // 从字节数组反序列化为Map
         byte[] body = message.getBody();
         Map<String, Object> map = objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});
         //因为jackson 反序列化 JSON 时,会将较小的整数反序列化为 Integer,而不是 Long,导致类型转换失败。
         //使用 Number 类型接收,然后转换为 Long:
         Number userIdNumber = (Number) map.get("userId");
         Long userId = userIdNumber.longValue();
         // 嵌套对象需要先转为 JSON,再反序列化为 UserOrderSubmit
         String userOrderSubmitJson = objectMapper.writeValueAsString(map.get("userOrderSubmit"));
         UserOrderSubmit userOrderSubmit = objectMapper.readValue(userOrderSubmitJson, UserOrderSubmit.class);
         //使用 Number 类型接收,然后转换为 Long:
         Number orderIdNumber = (Number) map.get("orderId");
         Long OrderId = orderIdNumber.longValue();
         String orderId = OrderId.toString();
        //业务幂等性检测
         Order existingOrder = getById(orderId);
         if (existingOrder != null) {
             // 如果订单已存在，直接打印日志并返回成功，不再执行后续任何业务逻辑
             log.info("订单{}已存在，幂等性处理成功", orderId);
             return; // 返回成功，告诉MQ消息已处理
         }

         //生成订单
        Order order = BeanUtil.copyProperties(userOrderSubmit, Order.class);
        order.setUserId(userId);
        order.setOrderTime(LocalDateTime.now());
        order.setOrderStatus(1);
        order.setId(orderId);
        save(order);


        //更新优惠券领取记录状态/积分数量/积分使用记录/成长值
        Long couponRecordId = userOrderSubmit.getCouponRecordId();
        Integer usedPoints = userOrderSubmit.getUsedPoints();
        if (couponRecordId != null) {
            //优惠券使用，更新领取记录数据
            userCouponRecordService.lambdaUpdate().eq(UserCouponRecord::getId, couponRecordId)
                    .set(UserCouponRecord::getUseTime, LocalDateTime.now())
                    .set(UserCouponRecord::getStatus, 1)
                    .update();
        }
        if (usedPoints != null) {
            //积分使用
            userService.lambdaUpdate().eq(User::getId, userId)
                    .setSql("points=points-" + usedPoints)
                    .update();

            //积分使用记录
            //扣减积分记录
            PointsLog pointsLog = new PointsLog();
            pointsLog.setUserId(userId);
            pointsLog.setChangeAmount(-usedPoints);
            pointsLog.setReason("下单抵扣积分使用");
            pointsLog.setCreateTime(LocalDateTime.now());
            pointsLogService.save(pointsLog);
        }
        //判断是否满足奖励成长值和积分的规则
        BigDecimal actualPay = order.getActualPay();
        if(actualPay!=null&&actualPay.compareTo(BigDecimal.valueOf(100))>=0){
            userService.lambdaUpdate().eq(User::getId, userId)
                    .setSql("growth_value=growth_value+20,points=points+200")
                    .update();
            PointsLog pointsLog1 = new PointsLog();
            pointsLog1.setUserId(userId);
            pointsLog1.setChangeAmount(+200);
            pointsLog1.setReason("下单奖励积分");
            pointsLog1.setCreateTime(LocalDateTime.now());
            pointsLogService.save(pointsLog1);
        }
        //查看用户的成长值是否满足升级条件
        User user = userService.getById(userId);
        Long memberLevelId = user.getMemberLevelId();
        Integer growthValue = user.getGrowthValue();
        if (memberLevelId<3&&growthValue >= memberLevelService.getById(memberLevelId).getMinGrowthValue()){
            user.setMemberLevelId(memberLevelId+1);
            userService.updateById(user);
        }


        //订单详情表
        List<OrderDetail> orderDetails = new ArrayList<>();

        // 购物车下单和立即购买分开处理，避免把 null 商品ID混入购物车ID集合
        if ("cart".equals(userOrderSubmit.getSource())) {
            List<Long> rawIds = userOrderSubmit.getShoppingCartIds();

            if (rawIds.isEmpty()) {
                throw new UkonwnErrorException(MessageConstant.SHOPPING_CART_IS_NULL);
            }
            //给订单中的商品进行销量库存更新
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
            //给订单中的商品进行销量和库存更新
            PD.setSalesCount(PD.getSalesCount() + quantity);
            PD.setStock(PD.getStock() - quantity);
            productService.updateById(PD);
            stockService.lambdaUpdate()
                    .eq(Stock::getProductId, productId)
                    .set(Stock::getSaleStock, PD.getStock())
                    .update();

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
        //保存消息ID，用于幂等校验
         stringRedisTemplate.opsForValue().set("MessageID:" + messageId, "1", 60 * 60 * 24, TimeUnit.SECONDS);
         //发送延迟消息
        Map<String, Object> MSG = new HashMap<>();
        MSG.put("orderId", orderId);
        MSG.put("userId", userId);
        //发送延迟消息查看消费端是否消费成功
         rabbitTemplate.convertAndSend("payment-exchange","payment-routing-key", MSG,msg ->  {
             msg.getMessageProperties().setHeader("x-delay",100000);
             return msg;
         });

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
    //管理端订单详情
    @Override
    public AdminOrderVo queryOrderDetial(Long id) {
        List<OrderDetail> list = orderDetailService.lambdaQuery()
                .eq(OrderDetail::getOrderId, id)
                .list();
        Order one = lambdaQuery()
                .eq(Order::getId, id).one();
        AdminOrderVo adminOrderVo = BeanUtil.copyProperties(one, AdminOrderVo.class);
        Integer addressBookId = one.getAddressBookId();
        AddressBook AB = addressBookService.lambdaQuery()
                .eq(addressBookId != null, AddressBook::getId, addressBookId)
                .one();
        StringBuilder sb = new StringBuilder();
        String address = sb.append(AB.getReceiverName())
                .append(AB.getPhone())
                .append(AB.getProvinceName())
                .append(AB.getCityName())
                .append(AB.getDistrictName()).toString();
        Long userId = one.getUserId();
        User user = userService.lambdaQuery()
                .eq(userId != null, User::getId, userId)
                .one();
        adminOrderVo.setAddress(address);
        adminOrderVo.setUserName(user.getUsername());
        adminOrderVo.setOrderDetailVos(list);
        adminOrderVo.setPhone(user.getPhone());
        return adminOrderVo;
    }
}
