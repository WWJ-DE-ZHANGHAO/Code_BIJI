//秒杀优化:(同步下单变为异步下单，快速给用户响应，后续操作由独立线程来完成)
/*
* 之前使用的都是Mysql性能较差，多线程并发性能差，耗时较长
* 秒杀过程:查询优惠券，判断库存和秒杀时间，查询订单，判断一人一单，减库存，创建订单
* 优化方案:
* 由于查询优惠券判断库存和查询订单校验一人一单的操作都是读操作耗时较短，而减库存和创建订单操作都是写操作，耗时较长，可以
* 通过使用两个线程分别操作两部分，主线程负责查询库存和秒杀时间，判断是否有秒杀资格的操作，如果满足条件，则开启一个子线程来执行减库存和订单创建的操作，
*
* 再优化方案:由于判断库和秒杀时间以及一人一单的操作耗时短，可以使用Redis完成，把优惠券信息和订单信息都缓存在Redis中
* ，判断秒杀资格，如果满足条件，再执行后续的减库存和创建订单操作。
* 为了避免形成一条龙的执行流程，可以采用异步方式，把Redis操作和Mysql操作分别放在两个线程中执行，
* 主线程负责执行Redis操作，判断秒杀资格，如果满足条件，则开启一个子线程来执行Mysql操作，
*
* 但是线程之间不能串行执行，但这样的话要新开启的执行Mysql的线程怎么知道给哪个用户创建订单呢？
* 从Redis中获取用户ID，优惠券ID，判断拥有秒杀资格，就创建一个订单号
* 并将用户ID，优惠券id和订单id，需要将订单id把这些信息放在一个队列中，再把订单信息返回给用户，拿到订单号就表示该用户抢单成功。
* (类似于酒店拿票叫号，还没上菜先给号)，这种操作会加快用户的响应速度，用户拿到订单号就表示抢单成功了，后续的操作由独立的线程来完成，
* 用户不需要等待后续操作完成就能知道自己抢单成功了
* 后续操作是，会开启一个独立的线程来监听队列，当队列中有数据时，从队列中取出数据，完成库存扣减和订单创建的操作，完成秒杀过程。
*
* 该怎么通过Redis判断库存是否充足以及一人一单?
* 需要将优惠券的库存信息、优惠券信息和订单信息都缓存在Redis中，
* 优惠券的库存信息的数据结构是:String类型的value
* 把优惠券ID作为Redis的key，把库存数量作为Redis的value，这样Redis就可以返回当前优惠券的库存数量了
* key                      value
* stock:vid:10(优惠券ID)      100(库存数量)
* 注意！！！当判断用户有秒杀资格后，需要将库存需要减一，相当于提前预减库存。数据库先不减
*
* 一人一单的数据结构是:由于值不能重复所以使用的是Set类型的value
* 把优惠券Id作为Redis的key，把购买过的多个用户Id列表作为Redis的value，这样Redis就可以返回给哪个用户创建订单了
* key                      value
* order:vid:10(优惠券ID)    1、2、3、4、5、6、7(用户ID列表)
*
* 执行流程:
* 判断秒杀资格:get stock:vid:10(获取优惠券库存数量)，判断是否大于0，如果大于0，则说明有秒杀资格，继续判断一人一单，否则返回1表示失败
* 判断一人一单:SISMEMBER order:vid:10 ID(判断用户ID是否在购买过的用户列表中)，
* 如果返回值为1，则说明用户已经购买过，无法继续执行后续操作返回2表示失败，如果返回值为0，则说明用户没有购买过，可以继续执行后续操作
* 执行后续操作：先预减库存，即dec stock:vid:10(把优惠券库存数量减一，后续异步线程会去数据库更新的)，将用户ID添加到购买过的用户列表中，
* 即SADD order:vid:10 ID(把用户ID添加到购买过的用户列表中)，返回0表示秒杀成功。
*但是这流程涉及很多判断和步骤，为了保证线程安全，需要使用Lua脚本来执行(确保执行时的原子性)，
* 所以Java代码中不需要写这些流程了，
* 只需要调用Lua脚本即可，Lua脚本的执行结果为0则表示秒杀成功，否则返回1表示库存不足、2表示用户已经购买过了
* 如果返回0.接下来然后生成订单号，把用户ID，优惠券ID和订单ID放入一个队列中，等待独立线程来完成库存扣减和订单创建的操作，并将订单号返回给用户
* 用户其实拿到订单号就可以去支付了，因为数据已经缓存在Redis中，存入数据库的操作对支付阶段无影响
* Lua脚本:
-- KEYS[1]: stock:vid:10 (库存键，String类型)
-- KEYS[2]: order:vid:10 (已购用户集合键，Set类型)
-- ARGV[1]: 用户ID
-- ARGV[2]: 购买数量

-- 1. 获取并判断库存
local stock = tonumber(redis.call('GET', KEYS[1]))//将获取的字符串转为数字
if stock == nil or stock <= 0 then
    return 1  -- 库存不足
end

-- 2. 判断用户是否已购买（使用 SET 的 SISMEMBER）
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
    return 2  -- 已经购买过，违反一人一单
end

-- 3. 预减库存（String 类型的 DECRBY）
redis.call('DECRBY', KEYS[1], ARGV[2])

-- 4. 将用户添加到已购集合（使用 SET 的 SADD）
redis.call('SADD', KEYS[2], ARGV[1])

return 0  -- 秒杀成功
*
*
* //阻塞队列
*阻塞队列(BlockingQueue):当线程尝试从队列中获取数据时，如果队列为空，则线程会阻塞，直到队列中有数据，才会被唤醒并获取数据。
*泛型为队列中的数据类型
*
//异步下单
* 开启一个独立线程，不断从阻塞队列中获取数据，实现异步下单功能
* 创建一个线程池和下单任务，注意因为是异步子线程所以不能在通过UserHolder从ThreadLocal中获取用户Id了，需要从订单中获取用户Id
* 子线程的执行是不是给前端返回数据的
*
* 注意！！！再一个因为是使用的Rdeis和Lua脚本，所以几乎不会出现并发线程的安全问题了，但是为了严谨还是添加一个分布式锁
*因为获取代理对象底层是主线程创建的，所以需要先在主线程先获取代理对象，之后再直接在子线程中使用这个代理对象就可以了，不需要在子线程中获取代理对象了
*
* 案例:修改秒杀业务，提高并发性能
* 需求:
* 1、新增秒杀优惠券的同时、将优惠券信息保存到Redis中
* 2、基于Lua脚本，判断秒杀库存、一人一单、决定用户是否抢购成功
* 3、如果抢购成功，将优惠券id和用户id封装后存入阻塞队列
* 4、开启一个独立线程，不断地从阻塞队列中获取数据，实现异步下单功能
*
* 阻塞队列
private BlockingQueue<VoucherOrder> ORDER_QUEUE = new ArrayBlockingQueue<>(1024*1024);//创建阻塞队列并大小为1024*1024
//线程池
private static final ExecutorService SECKILL_ORDER_EXECUTOR = Executors.newSingleThreadExecutor();
//在类加载时就启动线程任务，使用Spring提供的注解@PostConstruct
@PostConstruct
public void init() {//当类加载时就启动线程任务
    SECKILL_ORDER_EXECUTOR.submit(new VoucherOrderHandler());//创建线程提交任务
}

//线程任务，异步子线程不断地从阻塞队列中获取订单信息并创建订单
private class VoucherOrderHandler implements Runnable{
    @Override
    public void run() {
        while (true) {//不断地从阻塞队列中获取订单信息并创建订单
            try {
                //从阻塞队列中获取订单信息
                VoucherOrder order = ORDER_QUEUE.take();
                //创建订单
                handleVoucherOrder(order);//创建订单
            } catch (InterruptedException e) {
                log.error("订单处理异常", e);
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
* private  IVoucherOrderService proxy ;
*
*  //获取代理对象并赋值给成员变量proxy,这个代码写在向阻塞队列添加信息的代码下面，
 proxy = (IVoucherOrderService)AopContext.currentProxy();
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
    *
    *
注意！！！使用Jmeter模拟1000个用户同时抢购优惠券，需要先准备1000个用户和登录后获得的token
*在Jmeter中新建一个tokens里面是存放1000个token的文件，它会读取token文件，一行一行的读，
* 在Http请求中的值域中添加参数值为${token}，这样每个线程就会从token文件中读取一个token来进行请求了
* */


//消息队列
/*
*消息队列(Message Queue):字面意思就是存放消息的对垒，最简单的消息队列模型包括:消息队列、生产者和消费者。
消息队列:存储和管理消息，也被称为消息代理
生产者:发送消息到消息队列
消费者:从消息队列中获取消息并处理
* 消息队列的作用
* 解耦合:将生产者和消费者解耦合，生产者只管发送消息，消费者只管处理消息，两者之间通过消息队列进行通信，降低了系统的耦合度，提高了系统的灵活性和可维护性。
* 比如:
* 秒杀优惠券，判断是否有秒杀资格的操作由生产者线程来完成不用操作数据库性能更好，将订单信息发送给消息队列
* ，消费者线程只管从消息队列拿数据处理订单写入数据库，可以慢慢处理不会有太大压力
* 相比使用阻塞队列，消息队列的安全性更好，可以持久化数据，可以保证数据不丢失,而且消息队列是在JVM以外的一个服务，不受JVM内存限制
* 且消息队列将数据投递给消费者后，需要消费者进行确认，否则消息队列中会一直存在该数据，下次还会继续将该数据投递给消费者直到它确定
* 能实现这种的消息队列有RabbitMQ、Kafka、ActiveMQ、RocketMQ等等消息队列中间件
*
* 不过Redis中提供了三种不同的方式来实现这种安全持久化的消息队列，不用使用消息队列中间件
* 1、Redis的List数据结构:基于List结构模拟消息队列
* 2、Publish/Subscribe:基本的点对点消息模型
* 3、Stream:比较完善的消息队列模型

* */
//基于List数据结构模拟消息队列
/*
* 因为消息队列(Message Queue)是一个存放消息的队列，而Redis的list数据结构是一个双向链表，很容易模拟出队列效果
* 队列结构就是先进先出，出口和入口不是在一起的，使用List的Rpush和Lpop方法即可实现
* 但是消息队列要求的是，要当队列中没有数据时，消费者线程会阻塞，等待有数据时，消费者线程会继续执行，
* 所以从队列取数据的时候应该使用BL/Rpop方法，会对对垒进行监听，当队列中有数据时，会返回数据，否则会阻塞，知道有数据时，才会返回数据
* 优点:
* 因为List结构利用的是Redis存储，不受JVM内存限制
* 且基于Redis的持久化机制，数据安全性有保证，可以满足消息有序性
*缺点:
* 1、无法避免丢失数据，比如消费者线程挂掉，没有处理完数据，数据就会丢失
* 比如:
* 消费者从队列取出订单数据
  开始创建订单，刚扣减完库存
* 此时线程突然崩溃/服务器宕机
  订单还没保存到数据库
结果：库存少了，但订单没生成 → 数据不一致，数据丢失
* 2、且只能是单消费者模式，一个消费者线程处理完数据后，就把队列中的数据移除了，其他的线程拿不到数据
* */

//基于Publish/Subscribe的消息队列:基本的点对点消息模型
 /*
 * PubSub(发布订阅)是Redis2.0版本引入的消息传递模型，顾名思义，消费者可以订阅一个或多个channel(频道)，生产者向对应channel发送消息后，所有订阅者都能收到相关消息
 * SUBSCRIBE channel [channel]: 订阅一个或多个频道
 * PUBLISH channel message: 向指定频道发布消息
 * PSUBSCRIBE pattern[pattern]:订阅与pattern格式匹配的所有频道
 *pattern的通配符格式:
 * ? 匹配一个字符,h?llo 匹配hllo,hkllo,hxllo、hello、hallo
 * * 匹配任意多个字符，h*llo 匹配hllo、hallo、hxllo、heeello
 * []: 匹配指定字符,h[ae]llo 只能匹配hello、hallo
 * 优点:
 * 允许多个消费者同时订阅一个channel，多个消费者同时处理数据，数据不会丢失，且数据有顺序性
 * 也允许多个生产者向头一个channel发送数据
 * 缺点:
 * 1、不支持数据持久化，如果出现网络断开、Redis 宕机等，消息就会被丢弃
 * 2、如果发布的消息没有被任何线程订阅，则消息会丢失
 * 3、消息堆积有上限，超过上限后，会自动删除最老的数据
 * (消费者收到数据后未及时处理，会将数据存放在消费者的缓存区，如果处理的速度较慢，缓存区数据太多了会自动删除，导致数据丢失)
 * */

//基于Stream的消息队列:比较完善消息队列模型
//Stream的单消费模式
/*
* Stream是Redis5.0引入的一种新数据类型(就是value的数据类型，与List、set、hash一样都是)，可以实现一个功能非常完善的消息队列
XADD - 添加消息到末尾
XTRIM - 对流进行修剪，限制长度
XDEL - 删除消息
XLEN - 获取流包含的元素数量，即消息长度
XRANGE - 获取消息列表，会自动过滤已经删除的消息
XREVRANGE - 反向获取消息列表，ID 从大到小
XREAD - 以阻塞或非阻塞方式获取消息列表
* XADD 向队列添加消息，如果指定的队列不存在，则创建一个队列
* XADD key [MAXLEN|MINID [=|~] theshold [LIMIT count]]ID field value [field value ...]
* key ：队列名称，如果不存在就创建
* MAXLEN ：队列长度限制，如果队列长度超出限制，则从队列头部开始删除消息，直到队列长度小于限制。默认是无上限
  ID ：消息 id，最为消息的唯一标识，我们使用 * 表示ID由 redis自动生成，可以自定义，但是要自己保证递增性。是时间戳-数字的组合，如 1555555555555-0
  field value ： 记录(键值对的形式)。
 该命令会返回Id值，表示添加的消息的ID
  *
 XREAD
使用 XREAD 以阻塞或非阻塞方式获取消息列表 ，语法格式：
XREAD [COUNT count] [BLOCK milliseconds] STREAMS key [key ...] id [id ...]
count ：数量，每次读取的消息的最大数量，默认为 1，用的话要加COUNT
milliseconds ：可选，阻塞毫秒数，默认是非阻塞模式,用的话要加BLOCK,如果是0就会一直阻塞，直到有消息返回
key ：队列名，从哪个队列开始读取消息，用的话要加STREAMS
id ：消息 ID,表示起始Id，只返回大于该Id的消息，0表示从第一个消息开始返回 $表示从最新(最后一条)的消息开始返回

注意！！！
* Stream中的数据会持久化保存，无论哪个消费者线程来读取，数据都会保存在Redis中，不会移除
* 可以多个线程读取数据，一个线程可以多次读取这个数据
* 但是如果是用的$读取的话，倘若该stream里面的数据都是已经读取过的数据，那么这里面就没有最新的数据了，无法读取
* XREAD COUNT 1 STREAMS mystream $
* 如果要想等待最新对的消息，那么只能使用BLOCK参数，一旦有新数据会立马获取
* XREAD COUNT 1 BLOCK 0 STREAMS mystream $
*
* 在业务开发中，我们循环的调用XREAD阻塞方式来查询最新消息，从而实现持续监听的效果
* 会指定阻塞时间如果这个时间内没有消息，那么就会返回空，继续循环，如果这个时间有消息，那么就会返回消息
* 但是有一个BUG，就是如果正在处理一条数据，此时突然新增了多条数据，等处理完这条去读取时，因为$只会读取最新的一条数据，那么就会漏读数据的问题
* 优点:
* 1、消息可回溯:消息被读取后不会删除，会永久保存在队列中
* 2、一个消息可以被多个消费者读取
* 3、可以阻塞读取
* 4、消息持久化保存
* 缺点:
* 有消息漏读的风险
* */

//Stream的消费组模式
/*
* 消费组(Consumer Group):将多个消费者划分到一个组中，监听同一个队列，具备以下特点:
* 1、消息分流:队列中的消息会分流给组内的不同消费者，而不是重复消费，从而加快消息处理的速度，已经被消费的消息，其他消费者无法获取到
* 每个消费者只能读取消费者组中还没被消费的消息和读取/XACK处理pending-list中的所有消息，不会出现重复消费同一个消息
* 2、消息标示:消费者组会维护一个标示，记录最后一个被处理的消息，哪怕消费者宕机重启，还会从标示之后读取消息，确保每一个消息都被消费
* 就不会和单消费者模式一样出现漏读的问题
* 3、消息确认:消费者获取消息后，消息处于pending状态，并存入一个pending-list。当处理完后需要通过XACK来确认消息，
* 标记消息为已处理，才会从pending-list中移除，就解决了当消费者处理消息时突然宕机，导致消息丢失的问题，当消费者重新启动时，
* 可以从pending-list中获取未确认的消息进行重试,所有消费者都可以访问pending-list中的消息，并处理，即使不是该消费者获取的，从而保证消息处理成功
*
* 消费者组相关命令：
XGROUP CREATE - 创建消费者组
XREADGROUP GROUP - 读取消费者组中的消息
XACK - 将消息标记为"已处理"
XGROUP SETID - 为消费者组设置新的最后递送消息ID
XGROUP DELCONSUMER - 删除消费者
XGROUP DESTROY - 删除消费者组
XPENDING - 显示待处理消息的相关信息
XCLAIM - 转移消息的归属权
XINFO - 查看流和消费者组的相关信息；
XINFO GROUPS - 打印消费者组的信息；
XINFO STREAM - 打印流信息
*
* 创建消费者组：
* XGROUP CREATE key groupname ID [MKSTREAM]
* key ：队列名称，监听的队列
* groupname ：消费者组名称
* ID ：消息ID，可以是0，表示从第一个消息开始监听，也可以是$，表示从最新的消息开始监听
* MKSTREAM ：可选，表示如果该队列不存在，那么就会创建该队列
* 注意！！！如果该队列和消费组不存在，那么就会自动创建该队列和消费者组，这一个命令也可以完成两个操作
* 删除指定的消费者组：
*XGROUP DESTROY key groupname
*
* 给指定的消费者组添加消费者：
* XGROUP CREATECONSUMER key groupname consumername。但是一般不用，因为创建消费者组时，如果某个消费者不存在会自动添加
*
* 获取消费者组中的消息：
* XREADGROUP GROUP groupname consumername [COUNT count] [BLOCK milliseconds]  [NOACK] STREAMS key [key ...] id [id ...]
* groupname ：消费者组名称
* consumername ：消费者名称，如果该消费者不存在，会自动创建
* count ：数量，每次读取的消息的最大数量，默认是1，用COUNT指定
* milliseconds ：可选，阻塞毫秒数，默认是非阻塞模式,用BLOCK指定
* NOACK ：可选，表示消费者拿到数据会立马确认消息，不放入pending-list中。(不建议设置)
* key ：队列名，从哪个队列开始读取消息，用STREAMS指定
* id ：消息 ID,表示起始Id，">"表示从下一个未读取的消息开始返回，注意！！除了">",其他的符号都是表示根据指定的id从pending-list中获取消息(已获取但未确定的消息)
* ，0表示从第pending-list的一个消息开始返回
*
* 删除消费者组中指定的消费者：
* XGROUP DELCONSUMER key groupname consumername
*
* 确认消息：
* XACK key groupname id [id ...]、
* key ：队列名称，监听的队列
* groupname ：消费者组名称
* id ：消息ID，可以处理多个消息，多个ID用空格隔开
*
* 显示待处理的消息信息：
* XPENDING key groupname [start [end [count [consumer]]]]
* key ：队列名称，监听的队列
* groupname ：消费者组名称
* start ：可选，消息ID的起始值，默认是-，表示从第一个消息开始返回
* end ：可选，消息ID的结束值，默认是+，表示从最后一个消息开始返回
* 如果start和end是-+，表示返回所有消息
* count ：可选，返回的消息数量，默认是1，表示返回一个消息
* consumer ：可选，指定消费者名称，表示只返回该消费者未确认的消息，默认是所有消费者未确认消息
*
*
* 优点:
* 1、消息可回溯:消息被读取后不会删除，会永久保存在队列中
* 2、可以多消费者争抢消息，加快消息处理速度
* 3、没有阻塞读取
* 4、没有消息漏读风险
* 5、有消息确认机制，保证消息至少被消费一次
* 6、消息持久化保存
* */


//案例:基于Redis的Stream结构作为消息队列，实现异步秒杀下单
 /*
 * 不再用BlockQueue阻塞队列存储订单信息，使用Stream结构作为消息队列，在Lua脚本中直接完成消息存放到队列中
 * 需求:
 * 1、创建一个Stream类型的消息队列，、
 * 2、修改Lua脚本，再确认有秒杀资格后，直接向消息队列中添加消息，内容包括优惠券ID、用户ID、订单ID
 * 3、项目启动时，开启一个线程任务、尝试获取消息队列中的消息，完成秒杀下单
 *创建队列:
 * XGROUP CREATE stream.order groupName 0 MKSTREAM
 *
 修改Lua脚本:
 *local voucherId = ARGV[1]
-- 用户 ID
local userId=ARGV[2]
-- 订单 ID
local orderId = ARGV[3]
-- 库存 key
local stockkey = 'seckill:stock:' .. voucherId
-- 订单 key
local orderkey = 'seckill:order:' .. voucherId
-- 1. 获取并判断库存
local stock = tonumber(redis.call('GET', stockkey))
if stock == nil or stock <= 0 then
    return 1  -- 库存不足
end

-- 2. 判断用户是否已购买（使用 SET 的 SISMEMBER）
if redis.call('SISMEMBER', orderkey,userId) == 1 then
    return 2  -- 已经购买过，违反一人一单
end

-- 3. 预减库存（String 类型的 DECRBY）
redis.call('DECRBY', stockkey, 1)

-- 4. 将用户添加到已购集合（使用 SET 的 SADD）
redis.call('SADD', orderkey, userId)

-- 5 发送消息给消息队列
redis.call('XADD', 'stream.order', '*', 'userId', userId, 'voucherId', voucherId,'id' ,orderId )
return 0
*
*
* 启动任务:将数据添加到阻塞队列的代码删除，因为已经在Lua脚本中将数据添加到消息队列中了
*  @Override
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
 //线程任务
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
//从消息队列中获取订单信息,XREADGROUP GROUP g1  c1 COUNT 1 BLOCK 2000 STREAMS stream.orders >
List<MapRecord<String, Object, Object>> list = stringRedisTemplate.opsForStream().read(
    Consumer.from("g1", "c1"),//创建消费者组，g1是组名，c1是消费者名
    StreamReadOptions.empty().count(1).block(Duration.ofSeconds(2)),
    //创建一个StreamReadOptions对象，设置count为1，表示一次只获取一条消息，block为2秒，表示如果2秒内没有消息，则返回null
    StreamOffset.create(queueNmae, ReadOffset.lastConsumed())//创建一个StreamOffset对象，指定队列名称和从上次消费的位置开始读取
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
//因为这三个字段名key刚好和VoucherOrder类中的属性可以对得上，所以用BeanUtil工具类将map转换为VoucherOrder对象
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
                StreamReadOptions.empty().count(1),
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
            stringRedisTemplate.opsForStream().acknowledge(queueNmae,"g1",record.getId());
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
 */


//使用Lua脚本，就可以不用再写锁逻辑了，因为Lua脚本是原子操作，其他线程必须要等待Lua脚本执行完毕，才能进行下一步操作
//而且Redis的命令执行是串列执行的，所以不会出现并发问题，但是为了严谨，
//在数据库操作中加上分布式锁，防止出现并发问题，虽然几乎不可能出现了