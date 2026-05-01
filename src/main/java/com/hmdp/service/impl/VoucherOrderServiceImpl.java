package com.hmdp.service.impl;

import cn.hutool.core.bean.BeanUtil;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.SeckillVoucher;
import com.hmdp.entity.SimpleRedisLock;
import com.hmdp.entity.VoucherOrder;
import com.hmdp.mapper.VoucherOrderMapper;
import com.hmdp.service.ISeckillVoucherService;
import com.hmdp.service.IVoucherOrderService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.utils.RedisIdWorker;
import com.hmdp.utils.UserHolder;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.aop.framework.AopContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
@Slf4j
public class VoucherOrderServiceImpl extends ServiceImpl<VoucherOrderMapper, VoucherOrder> implements IVoucherOrderService {
    @Autowired
    private ISeckillVoucherService seckillvoucherService;

    @Autowired
    private RedisIdWorker redisIdWorker;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Resource
    private RedissonClient redissonClient;
    private static final DefaultRedisScript<Long> SECKILL_SCRIPT ;
    static {
        SECKILL_SCRIPT = new DefaultRedisScript<>();
        SECKILL_SCRIPT.setLocation(new ClassPathResource("seckill.lua"));
        SECKILL_SCRIPT.setResultType(Long.class);
    }
    /*//阻塞队列
    private BlockingQueue<VoucherOrder> ORDER_QUEUE = new ArrayBlockingQueue<>(1024*1024);//创建阻塞队列并大小为1024*1024*/
    //线程池
    private static final ExecutorService SECKILL_ORDER_EXECUTOR = Executors.newSingleThreadExecutor();
    //在类加载时就启动线程任务，使用Spring提供的注解@PostConstruct
    @PostConstruct
    public void init() {//当类加载时就启动线程任务
        SECKILL_ORDER_EXECUTOR.submit(new VoucherOrderHandler());//创建线程提交任务
    }
     private static final String queueNmae="stream.order";
    //线程任务，异步子线程不断地从阻塞队列中获取订单信息并创建订单
    private class VoucherOrderHandler implements Runnable{
        @Override
        public void run() {
            while (true) {//不断地从队列中获取订单信息并创建订单
                try {
                   /* //从阻塞队列中获取订单信息
                    VoucherOrder order = ORDER_QUEUE.take();*/
                    //从消息队列中获取订单信息,XREADGROUP GROUP g1  c1 COUNT 1 BLOCK 2000 STREAMS stream.orders >
                    List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                            Consumer.from("g1", "c1"),
                            StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
                            StreamOffset.create(queueNmae, ReadOffset.lastConsumed())
                    );//返回的是集合是因为，可能要求的返回的会是多条消息
                    //判断是否获取成功，没成功则说明没消息，继续下次循环
                    if (list == null || list.isEmpty()){
                        continue;
                    }
                    //如果获取成功，则说明有消息，开始处理订单
                    //获取订单信息
                    MapRecord<String, Object, Object> record = list.get(0);
                    //这个是一个消息对象，key是消息的Id，value是消息的内容包含多个hash键值对的map集合
                    Map<Object, Object> values = record.getValue();
                    //获取map集合，这个map中是Lua脚本发送到消息队列的三个hash字段。"userId":userId,"voucherId":voucherId,"id":orderId
                    VoucherOrder order = BeanUtil.fillBeanWithMap(values, new VoucherOrder(), true);
                    //因为这三个字段名key刚好和VoucherOrder类中的属性可以对得上，所以将map转换为VoucherOrder对象
                    //创建订单
                    handleVoucherOrder(order);
                    //处理完后XACK确认,如果报异常会将未处理的消息放入PENDING队列中，
                    //XACK stream.orders g1 id
                    stringRedisTemplate.opsForStream().acknowledge(queueNmae,"g1",record.getId());
                } catch (Exception e) {
                    log.error("订单处理异常", e);
                    //从PENDING队列中获取消息，并重新处理
                    handlePendingList();
                }
            }
        }
       //从PENDING队列中获取消息，并重新处理
        private void handlePendingList() {
            while (true) {
                try {
                    List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
                            Consumer.from("g1", "c1"),
                            StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
                            StreamOffset.create(queueNmae, ReadOffset.from("0"))
                    );
                    if (list == null || list.isEmpty()) {
                        //pendinglist中没有待处理的消息，结束循环
                        break;
                    }
                    MapRecord<String, Object, Object> record = list.get(0);
                    Map<Object, Object> values = record.getValue();
                    VoucherOrder order = BeanUtil.fillBeanWithMap(values, new VoucherOrder(), true);
                    handleVoucherOrder(order);
                    stringRedisTemplate.opsForStream().acknowledge(queueNmae,"g1",record.getId());//确认消息
                }
                catch (Exception e) {
                    log.error("处理PENDING队列异常", e);
                    try {
                        Thread.sleep(2000);//如果获取PENDING队列中的消息抛出异常，则等待2秒后重试
                    } catch (InterruptedException ex) {
                        ex.printStackTrace();
                    }
                }
            }
        }
    }

    private void handleVoucherOrder(VoucherOrder order) {
        //获取用户
        Long userId = order.getUserId();
        //创建锁对象
        RLock lock = redissonClient.getLock("lock:order:" + userId);
        //获取锁
        boolean isLock = lock.tryLock();
        //判断是否获取锁成功
        if (!isLock) {
            log.error("不允许重复下单");
            return;
        }
        try {
            //创建订单
          proxy.createVoucherOrder(order);
        } catch (Exception e) {
            log.error("订单处理异常", e);
        } finally {
            //释放锁
            lock.unlock();
        }

    }
private  IVoucherOrderService proxy ;
    //第四回使用Lua脚本实现秒杀，判断是否有进行秒杀的资格，
    @Override
    public Result submitorder(Long voucherId) {
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        //生成订单Id
        Long orderId = redisIdWorker.nextId("order");

        Long RR = stringRedisTemplate.execute(SECKILL_SCRIPT,
                //keys
                Collections.emptyList(),//因为Lua脚本的keys参数是用userId和voucherId进行拼接的，所以这里不需要传入keys参数，直接传入一个空的List即可
                //values
                voucherId.toString(), userId.toString(), orderId.toString());

        //判断秒杀结果,只要为0，说明有秒杀资格且将订单信息保存到消息队列中了，不需要在写存放到阻塞队列的代码逻辑了
        int code = RR.intValue();//将返回的Long类型转换为int类型
        //不为0
        if (code!=0) {
            return Result.fail(code == 1 ? "库存不足" : "您已抢购过");
        }
       /* //为0，说明有秒杀资格，
        VoucherOrder order = new VoucherOrder();
        //生成订单Id
        Long orderId = redisIdWorker.nextId("order");
        //创建订单信息
        order.setId(orderId);
        order.setUserId(userId);
        order.setVoucherId(voucherId);
       //将信息保存到阻塞队列中
        ORDER_QUEUE.add(order);*/
        //获取代理对象
        proxy = (IVoucherOrderService)AopContext.currentProxy();
        //创建订单Id
        return Result.ok(orderId);


    }
       //使用分布式锁实现一人一单
       /* @Override
        public Result submitorder(Long voucherId) {
            //查看优惠券状态
            SeckillVoucher VV = seckillvoucherService.getById(voucherId);
            UserDTO user = UserHolder.getUser();
            Long userId = user.getId();
            LocalDateTime END = VV.getEndTime();
            LocalDateTime START = VV.getBeginTime();
            Integer stock = VV.getStock();
            if (START.isAfter(LocalDateTime.now())) {
                return Result.fail("秒杀尚未开始");
            }
            if (END.isBefore(LocalDateTime.now())) {
                return Result.fail("秒杀时间已过");
            }
            if (stock <= 0) {
                return Result.fail("库存不足");
            }
            //第一回使用Synchronized悲观锁
        *//*synchronized (userId.toString().intern()) {
            IVoucherOrderService proxy = (IVoucherOrderService)AopContext.currentProxy();
            //获取的是IVourcherOrderService的接口的代理对象，调用时会触发事务拦截器
           return proxy.createVoucherOrder(voucherId);
            *//**//* return createVoucherOrder(voucherId, userId);*//**//*
        }*//*
            //第二回使用自定义分布式锁对象
       *//* SimpleRedisLock lock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
        //key的命名规则：order:用户id，让该用户的线程只有一个成功设置key，其他该用户的线程无法设置成功
        boolean isLock = lock.tryLock(1200L);
        if (!isLock) {
            return Result.fail("请勿重复下单");
        }
        try {
            IVoucherOrderService proxy = (IVoucherOrderService)AopContext.currentProxy();
            //获取的是IVourcherOrderService的接口的代理对象，调用时会触发事务拦截器
            return proxy.createVoucherOrder(voucherId);
        } finally {
                lock.unlock();
        }*//*

            //第三回使用Redission提供的分布式锁
            RLock lock = redissonClient.getLock("order:" + userId);
            boolean isLock = lock.tryLock();
            if (!isLock) {
                return Result.fail("请勿重复下单");
            }
            try {
                IVoucherOrderService proxy = (IVoucherOrderService)AopContext.currentProxy();
                //获取的是IVourcherOrderService的接口的代理对象，调用时会触发事务拦截器
                return proxy.createVoucherOrder(voucherId);
            } finally {
                //释放锁
                lock.unlock();
            }


    }*/
    //异步创建订单
    @Transactional
    public void createVoucherOrder(VoucherOrder  order) {
        //获取用户I D
        Long userId = order.getUserId();
        Long voucherId = order.getVoucherId();
        Long count = lambdaQuery().eq(VoucherOrder::getUserId, userId).eq(VoucherOrder::getVoucherId, voucherId).count();
        if (count > 0) {
            log.error("您已抢购过");
            return ;
        }
        //扣减库存
        boolean SC = seckillvoucherService.update()
                .setSql("stock = stock - 1")
                .eq("voucher_id", voucherId)
                .gt("stock", 0)//判断库存是否充足,只有满足此条件，stock才会-1,防止已经被其他线程买完了
                //.eq("stock", stock)//判断此时的存库和之前查询的库存是否一致，如果不一致，则无法扣减库存
                .update();//防止高并发多线程，导致库存超卖
        if (!SC) {
            return ;
        }

        //提交订单
        save(order);
    }
    /*@Transactional
    public Result createVoucherOrder(Long voucherId) {
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        Long count = lambdaQuery().eq(VoucherOrder::getUserId, userId).eq(VoucherOrder::getVoucherId, voucherId).count();
        if (count > 0) {
            return Result.fail("您已抢购过");
        }
        //扣减库存
        boolean SC = seckillvoucherService.update()
                .setSql("stock = stock - 1")
                .eq("voucher_id", voucherId)
                .gt("stock", 0)//判断库存是否充足,只有满足此条件，stock才会-1,防止已经被其他线程买完了
                //.eq("stock", stock)//判断此时的存库和之前查询的库存是否一致，如果不一致，则无法扣减库存
                .update();//防止高并发多线程，导致库存超卖
        if (!SC) {
            return Result.fail("库存不足");
        }
        //生成订单Id
        long order = redisIdWorker.nextId("order");

        //提交订单
        VoucherOrder voucherOrder = new VoucherOrder();
        voucherOrder.setId(order);
        voucherOrder.setUserId(userId);
        voucherOrder.setVoucherId(voucherId);
        save(voucherOrder);
        return Result.ok(order);
    }*/
}
