//MQ高级
/*
* 因为消息在传递过程中可能会丢失
* 丢失原因:
* 1、因为网络不稳定，在消息传递到消息代理(MQ:交换机和消息队列)的过程中出现问题了，导致消息未传递成功，丢失了
* 2、在消息队列将消息传递给服务调用者(消费者)时，MQ故障了，导致消息丢失
* 3、在消息成功传递给消费者后，因为是操作数据库之前就确定ACK了，导致MQ中没有该消息了，但操作数据库时消费者故障了
* 导致消息丢失。
*
* 所以需要保证:发送者的可靠性、MQ的可靠性、消息消费者的可靠性
* 以及最后的消息延迟用于兜底
*
* */
//发送者可靠性
/*
* RabbitMq提供了两种方式保证发送者消息的可靠性:
* 发送者重连和发送者确认
*
* 发送者重连机制:因为网络不稳定，导致的发送者连接MQ失败的情况，通过配置我们可以开启连接失败后的重连机制(默认关闭)
* 在发送者的配置文件中添加
* spring:
*   rabbitmq:
*     connection-timeout: 1s//连接超时时间
*     template:
*         retry:
*           enable: true //是否开启重连机制,默认false
*             initial-interval: 1s //初始重连时间,第一次连接失败需要等待1s，再重连 (默认1s)
*             multiplier: 1 //重连时间间隔的倍数，第二次重连时间间隔(等待时间)为第一次重连时间间隔的2倍  (默认倍)
*             max-attempts: 3 //最大重连次数,只能重连三次 (默认3次)
*
*注意！！！
*两次重连之间是隔了2秒的，因为需要先等待超过超时时间，失败在等待1s，才能重连，所以是时间间隔是2秒
*
*缺陷:因为SpringAMQP的这种重连机制是阻塞式的重试，导致当前线程被阻塞，会影响业务性能，对性能要求高的建议禁用重连机制
*非要用的话，可以考虑使用异步线程来执行发送消息的代码，来避免阻塞主线程
*
*
* 发送者确认机制:SpringAMQP提供的发送者确认机制包括Publisher Confirm和Publisher Returns两种，开启确认机制后，当发送者
* 发消息给MQ后，MQ会返回一个确认结果给发送者，返回的结果有以下几种情况:
* 一、消息投递到了MQ，但是路由失败了，则会通过Publisher Returns机制返回路由异常原因，并返回ACK，通知成功传递给MQ了
* 比如:如果发送到的交换机没有绑定队列，导致路由失败，发送的消息的RoutingKey不存在，则返回路由异常原因
* 二、临时消息投递到了MQ，并成功入队成功，返回ACK，通知成功传递给MQ了
* 三、持久消息投递到MQ，并且入队完成持久化，返回ACK，通知成功传递给MQ了,
* 注意！！！
* 持久化消息传递到了MQ，但未完成持久化，则返回NACK，通知MQ消息传递失败了
* 只有返回ACK的，才不要重发消息，只需要查看日志。返回NACK的，则需要重新发送消息
* 其中ack和nack属于Publisher Confirm机制，ack是投递成功；nack是投递失败。
* 而return则属于Publisher Return机制。
* 开启发送者确认机制:
* 1、在发送者配置文件中添加
* spring:
*   rabbitmq:
*    publisher-confirm-type: correlated //开启发送者确认机制,默认不开启(默认值: none,不开启)
*    publisher-returns: true //开启发送者返回机制,默认不开启，
*
*    publisher-confirms-type有三种模式:
*       none: 不开启发送者确认机制
*       correlated: MQ异步回调方式返回回执消息
*       simple: 同步阻塞等待MQ的回执消息
*
* 需要用到ReturnCallback和ConfirmCallback接口来处理MQ返回的结果
* ReturnCallback接口:处理MQ返回的路由异常原因
* 注意！！！
* 每个RabbitTemplate只能设置一个ReturnCallback接口，所以最好是在项目启动的时候创建
* 定义一个配置类、在该类中定义一个方法用于创建ReturnCallback，并在该方法上添加@PostConstruct注解，
* 来保证在项目启动时就创建ReturnCallback接口，
* 使用rabbitTemplate.setReturnCallback(returnCallback)方法来设置ReturnCallback接口
* @Slf4j
@AllArgsConstructor
@Configuration
public class MqConfig {
    private final RabbitTemplate rabbitTemplate;

    @PostConstruct
    public void init(){
        rabbitTemplate.setReturnsCallback(new RabbitTemplate.ReturnsCallback() {
            @Override
            public void returnedMessage(ReturnedMessage returned) {
                log.error("触发return callback,");
                log.debug("exchange: {}", returned.getExchange());
                log.debug("routingKey: {}", returned.getRoutingKey());
                log.debug("message: {}", returned.getMessage());
                log.debug("replyCode: {}", returned.getReplyCode());
                log.debug("replyText: {}", returned.getReplyText());
            }
        });
    }
*
*ConfirmCallback接口:处理MQ返回的消息投递结果ACK和NACK
*由于每个消息发送时的处理逻辑不一定相同，因此ConfirmCallback需要在每次发消息时定义。
具体来说，是在调用RabbitTemplate中的convertAndSend方法时，多传递一个参数correlationData，
* 来指定当前消息的ConfirmCallback接口。
* CorrelationData中包含两个核心的东西：
- id：消息的唯一标示，MQ对不同的消息的回执以此做判断，避免混淆
- SettableListenableFuture：回执结果的Future对象
*
* void testPublisherConfirm() {
    // 1.创建CorrelationData
    CorrelationData cd = new CorrelationData();
    // 2.给Future添加ConfirmCallback
    cd.getFuture().addCallback(new ListenableFutureCallback<CorrelationData.Confirm>() {
    //获取回执结果的回调方法，Future的回调方法有两种：onFailure和onSuccess
        @Override
        public void onFailure(Throwable ex) {
            // 2.1.Future发生异常时的处理逻辑，基本不会触发
            log.error("send message fail", ex);
        }
        @Override
        public void onSuccess(CorrelationData.Confirm result) {
            // 2.2.Future接收到回执的处理逻辑，参数中的result就是回执内容
            if(result.isAck()){ // result.isAck()，boolean类型，true代表ack回执，false 代表 nack回执
                log.debug("发送消息成功，收到 ack!");
            }else{ // result.getReason()，String类型，返回nack时的异常描述
                log.error("发送消息失败，收到 nack, reason : {}", result.getReason());
            }
        }
    });
    // 3.发送消息
    rabbitTemplate.convertAndSend("hmall.direct", "q", "hello", cd);
注意！！！只有消息传到了MQ才会返回异常，才会触发ReturnCallback接口，否则不会触发
只有消息没有传到MQ才会触发ConfirmCallback接口的nack回调方法

* 建议！！！
* 发送者确认机制因为需要和MQ进行通信和确认，所以会大大影响消息发送的效率，因此不建议开启发送者确认机制
* 即使开启也会限定重试的次数
* */

//MQ的可靠性
/*
* 一般RabbitMQ会将接收到的消息保存在内存中以降低消息收发的延迟，这样会导致两个问题
* 1、一旦MQ宕机，内存的数据会丢失
* 2、内存空间有限，当消费者故障或处理过慢时，会导致消息积压，当超过某个阈值时，
* MQ会自动将内存中的数据写入磁盘，保证数据的 durability,因为每次超过阈值时，MQ都会进行IO操作，阻塞MQ的接受消息的操作
* 导致MQ阻塞性能下降
*
* 交换机和队列都可以设置为持久化的，在发送消息时可以将消息设置为持久化的，这样就可以将消息保存在磁盘中，来保证MQ的可靠性
测试:
* 在控制台中发送一个持久的消息，选择Persistent选项，发送后重启MQ，重新Run RabbitMQ，查看消息是否还在，如果还在则说明持久化成功了
*
*
* 测试在Java代码中发送大量临时的消息，看看MQ是否会阻塞，性能是否会下降
* 注意！！！
* 因为StringAMQP默认发送的消息时持久化的，所以发送消息时，需要使用MessageBuilder.withBody()
* .setDeliveryMode(MessageDeliveryMode.NON_PERSISTENT).build方法来设置消息为非持久化的，来测试MQ的性能
*
* 测试在Java代码中发送大量持久化的消息，看看MQ性能
*
* 总结:
* 观察后会发现因为持久化的消息是每发一条就存一条，不会发生阻塞MQ接受消息，所以持久化的消息性能会比临时的高很多
*注意！！！
* 无论是持久化消息还是临时消息，被消费者确认后，MQ都会将消息从内存/磁盘中删除，消费时从内存/磁盘读取消息。
* */

//Lazy Queue
/*
*虽然持久化的消息性能高，但是因为需要进行IO操作刷盘，性能会下降，因此RabbitMQ提供了Lazy Queue，
* RabbitMQ的3.6.0版本开始，就增加了Lazy Queue功能。也成为惰性队列
* 惰性队列的特性:
* 接受到消息后直接存入磁盘漫步在存储到内存中
* 消费者要消费消息时才会从磁盘中读取并加载到内存(如果处理的快，可以提前缓存部分消息到内存，最多2048条)
* 注意！！！！
* 在3.12版本后，所有队列都是Lazy Queue模式无法更改
*
* 如果RabbitMQ的版本不是3.12，则需要手动将队列设置为Lazy Queue模式
* 在控制台中创建队列时，填写Arguments参数，参数为x-queue-mode:lazy
*
* 在Java代码中创建队列时，
* 使用QueueBuilder.durable().lazy().build()方法来创建一个Lazy Queue
* 或者使用注解:
* @RabbitListener(bindings = @QueueBinding(
* value = @Queue(value = "hmall.lazy", durable = "true",  ),
* exchange = @Exchange(value = "hmall.direct", type = ExchangeTypes.DIRECT),
* key = "q")
*
*
* 在测试发送一百条临时消息时，会发现MQ的性能没有下降，并把所有的临时消息存到了磁盘中，
* Lazy Queue会将所有的消息都持久化，无论临时消息还是持久化消息，都会存到磁盘中，来保证MQ的可靠性
* */

//消费者可靠性
//消费者确认机制
/*
* 消费者确认机制(Consumer Acknowledgement)是为了确认消费者是否成功处理消息，
* 消费者处理消息结束后，应该向RabbitMQ发送一个回执。
*
* 如果成功处理，返回ack，告知RabbitMQ消息已经处理成功，这样RabbitMQ就可以将该消息从队列中删除了，
*
* 如果消费者处理消息时出现了异常，会返回nack，告知RabbitMQ消息处理失败，这样RabbitMQ就会再次将消息发送给该消费者，进行重试处理，
* 直到处理成功了返回ack，告知RabbitMQ删除该消息了
*
* 如果消费者处理消息失败了，但是不想再处理该消息了，会返回reject，告知RabbitMQ消息处理失败了，
* 并且不再重试了，这样RabbitMQ就会将该消息从队列中删除了
*
* 注意！！只有处理消息后才会发送一个回执，不是刚拿到还没处理时就发送回执了
* 应用场景:
* 当消息处理成功时，返回ack，告知RabbitMQ消息已经处理成功，这样RabbitMQ就可以将该消息从队列中删除了
* 当消费者处理消息时出现了异常时，返回nack，告知RabbitMQ消息处理失败了，这样RabbitMQ就会再次将消息发送给该消费者，进行重试处理，
* 当消息的内容有问题时，导致消费者无法处理该消息了，这时就可以返回reject，告知RabbitMQ不再重试了，直接删除该消息了
*
* SpringAMQP已经实现了消费者确认机制，不需要手动进行判断，允许我们通过配置问安静选择ACK处理方式:
* none:不处理，即消息投递给消费者后立即ack，消息会立刻会从MQ中删除了，非常不安全，不建议使用
* manual:手动处理，需要自己在业务代码中调用api，发送ack或reject存在业务侵入，更灵活
* auto:自动处理，SpringAMQP利用AOP对我们的消息处理逻辑做了环绕增强，当业务政策执行实则自动返回ack，当业务出现异常时
* 根据异常判断返回不同结果:
* 如果是业务异常，自动返回nack
* 如果时消息处理或校验异常，自动返回reject
*
* 在配置文件中添加内容:
* spring:
*  rabbitmq:
*     listener:
*       simple:
*        prefetch: 1 //每次只从MQ中取一条消息来处理，来保证消费者的可靠性
*        acknowledge-mode: auto //自动处理ACK，默认是auto
* 测试:
public void listenSimpleQueueMessage(String msg) throws InterruptedException {
    log.info("spring 消费者接收到消息：【" + msg + "】");
    if (true) {
        throw new MessageConversionException("故意的"); //消息校验错误，会触发reject
    }
    log.info("消息处理完成");
}
* 发现抛出异常后，MQ没再次发送消息，并且消息被删除了
*
* */

//失败重试机制
/*
* SpringAMQP提供了消费者失败重试机制，在消费者出现异常时利用本地重试，而不是无效的的request到MQ
* 通过在消费者配置文件中添加
* spring
*  rabbitmq:
*   listener:
*     simple:
*       prefetch: 1
*         retry:
*           enabled: true  //以下的都是默认的
*           initial-interval: 1000ms  //初始重试间隔时间
*           multiplier: 1  //重试间隔时间倍数
*           max-attempts: 3 //最大重试次数，超过最大次数后，不再重试并将消息从MQ中删除了
*           stateless: true
* //默认是true，表示失败重试时，消费者是无状态的，即每次处理消息时，消费者都是新的实例，如果业务中包含事务这里改成false
*注意！！！
* 不配置，会一直重试，而且频率很高，1400次/s，如果配置了max-attempts和initial-interval，频率就会降低
*
* 但是因为超过次数就会删除消息，这会导致消息丢失不可靠，
* 所以需要有MessageRecoverer接口来处理，它包含三种不同的实现:
* 1. RejectAndDontRequeueRecoverer: 重试耗尽后，知己reject 并丢弃消息，(默认方式)
* 2. ImmediateRequeueMessageRecoverer: 重试耗尽后，返回nack，消息重新入队
* 3. RepublishMessageRecoverer: 重试耗尽后，将失败消息投递到指定的交换机，
* 这个交换机会将消息传递给一个专门用于存储错误消息的队列，这个消息会发送给开发者，告知错误消息。
*
* 首先创建错误队列和交换机，使用@Bean注解
* 需要用@Bean将MessageRecoverer接口的实现类注入到Spring容器中，并指定对应的交换机
* @Bean
* public MessageRecoverer repulishMessageRecoverer(RabbitTemplate rabbitTemplate) {
*  return new RepublishMessageRecoverer(rabbitTemplate, "error.exchange", "error.routing.key");
* }
*
* 测试:
* 观察发现，当重试次数超过最大次数时，消息被发送到error.exchange，并路由到error.routing.key的队列中
* 消息为错误消息的原因
* */


//业务幂等性
/*
* 之前消息处理存在问题，如果消费者完成了消息的处理，但是在发送ACK时出现异常，消息队列没接收到ACK，就不会将消息从队列中删除了，
* 等到消费者恢复正常时，消息队列会重新发送该消息，导致重复处理。
* 比如:库存扣减时，如果消费者处理消息时出现异常，库存会重复扣减，导致库存不足
*
* 此时就需要用到业务幂等性，
* 幂等是一个数学概念，用函数表达式来描述是这样的:f(x)=f(f(x))(例如绝对值函数，同一个数求一次和多次的结果一样的)。
* 在程序开发中，则是只同一个业务，执行一次或多次对业务状态的影响是一致的则认为该业务是幂等的
* 例如:根据id查询商品，查询一次和查询多次结果一致，则认为该业务是幂等的
* 而库存扣减的业务，则不是幂等的，因为库存会扣减一次和多次结果不一致。
*
* 为了防止非幂等性的业务重复执行，需要将让系统认为执行一次或多次对业务状态的影响是一致的，从而认为该业务是幂等的，只执行 一次
* 方案一:给每个消息设置一个唯一Id，利用id区分是否是重复消息
* 1、每条消息都生成一个唯一id，与消息一起投递给消费者
* 2、消费者收到消息后处理自己的业务，业务处理成功后将消息ID、保存到数据库中
* 3、如果下次有收到同样的消息，去数据库查询判断该消息Id是否存在，存在则认为是重复消息，不处理
* 实现方案，使用消息转换器
*     @Bean
    public MessageConverter messageConverter() {
       Jackson2JsonMessageConverter jjmc= new Jackson2JsonMessageConverter(); //创建消息转换器
       jjmc.setCreateMessageIds(true);//创建消息ID,会自动在消息的属性中添加一个message_id属性值
       return jjmc;
    }
测试:发送消息到队列
观察会发现，消息中会多了一个消息ID，利用这个ID，判断消息是否重复
message_id:	5701e2fe-43b8-41df-a777-fef1a8d836ce
priority:	0
delivery_mode:	2
headers:
__TypeId__:	java.lang.String
content_encoding:	UTF-8
content_type:	application/json

因为消息Id在Properties中，所以接受的时候不能只是用字符串类型接受了
   public void ListenSimpleQueue(Message message) {}
* 然后message.getMessageProperties().getMessageId()获取消息ID
* 消息的内容在body中，如果要字符串类型new String(message.getBody())
*
* 注意！！！
* Properties 是消息的属性
*
* 消息的组成为:
┌─────────────────────────────────────┐
│         Message（消息）               │
├─────────────────────────────────────┤
│  1. Body（消息体）                    │
│     → 实际的业务数据                   │
│                                     │
│  2. Properties（消息属性）             │
│     → 描述消息的元数据信息              │
└─────────────────────────────────────┘
*
*
* 方案一缺陷:需要判断消息ID，去数据库中查询消息Id是否存在，这些操作和原本的业务逻辑是无关的
* 会造成业务侵入，而且操作数据库会导致性能下降，不推荐使用
*
*
* 方案二:业务判断,结合业务逻辑，基于“业务本身”做判断，(不是所有业务都适用的，不行的还是使用方案一)
* 比如:支付业务:
* 当订单支付成功后需要发送消息到订单业务将订单状态改为已支付，倘若修改后因为网络原因支付服务停了，未能返回ACK，
* 此时用户想要退款可以直接在订单业务中状态变为退款中，如果此时网络恢复了，支付服务因为没有收到ACK，会重新发送将订单修改为
* 已支付状态消息，会将退款中的状态覆盖掉，有冲突。
* 此时就可以用业务判断:
* 支付业务重新发送消息，在修改订单状态前需要先查询订单、需要对订单状态进行判断是否已经支付，
* 如果订单状态此时已经不是未支付状态，则不处理。直接将消息丢弃。
* 如果是未支付状态，则处理
*
* */

面试题:
一、你将支付服务和交易服务拆分成了两个微服务，如何保证两者之间的订单状态一致性？
首先，我是使用RabbitMQ进行消息的传递，进行异步通知，而不是只用远程调用
那为什么要用异步通知？
因为同步通知会，一旦业务中的某个服务器挂掉，线程会被卡住，就会导致整个业务失败
而且同步通知需要等一个服务器处理完成之后，才能执行下一个服务器，这样效率会下降，且会增加延迟
使用异步通知
只需要将消息发送给MQ，让需要该消息的服务监听MQ就行，无需该服务器的结果，即使服务器故障了也会进行故障隔离
性能更高，使用异步通知还可以进行消息缓存和对流量削峰填谷。
通知失败怎么办?
为了保证MQ消息的可靠性，可以使用发送者消息重试机制(因为这种重连是阻塞式的，所以不建议用)和消息确认机制、
使用消息持久化和使用LazyQueue惰性队列、以及消费者消息确认机制和重试机制，保证消息至少被消费一次

为了避免消费者重复消费同一条消息造成异常，使用消息的幂等性，利用消息唯一Id或者业务判断

二、如果交易服务消息处理失败，有没有兜底方案？
如果网络出现故障，没法立马修复，支付服务都发不了消息那该如何保证订单状态一致性？
此时就可以用到延迟消息


//延迟消息
/*
*延迟消息:发送消息时指定一个时间，消费者不会立刻收到消息，而是在指定时间后才收到消息
* 发送的延迟消息会先存放到延迟队列中，延迟队列会定时将消息发送给消费者
* 延迟消息常用于订单支付超时、活动倒计时、定时任务调用
* 例如:
* 用户下单后，订单服务会创建一个状态为未支付的订单，并将商品服务中的库存减掉，
* 但是此时因为网络或某些原因，导致支付服务无法将是否支付的消息通过MQ发送给支付服务，
* 如果支付了，但是订单服务不知道因此无法将订单状态改为已支付，那么就会导致订单状态不一致，
* 如果未支付，但是库存已经被扣减了，那么就会导致库存被占用，其他用户没法购买
* 解决:
* 此时就可以使用延迟消息，下单成功后，会发送一个延迟消息，给一个延迟队列
* 指定延迟时间，延迟时间到了之后，延迟队列会定时将消息发送给订单服务
* 订单服务此时会被动去查询支付服务的状态是否是已支付，如果是已支付，则修改订单状态为已支付，
* 如果是未支付，则将库存回滚
*注意！！！
* 这种等待一段时间后再去执行的叫做延迟任务
*
* 注意！！！
* SpringTask与延迟消息的区别:
*SpringTask和代码是耦合的，是基于时间点来执行的，
* 延迟消息是与代码解耦。且是基于事件触发的
*
* 实现延迟消息有两种方式:死信交换机、延迟消息插件
*
*
* */

//死信交换机
/*
* 当队列中的消息满足以下的情况之一，就会变成死信:
* 1、消费者使用basic.reject 或 basic.nack声明消费失效，并且消息的requeue参数设置为flase
* 2、消息是一个过期消息(达到了队列或消息本身设置的过期时间，就是过期了),超时无人消费
* 3、要投递的队列消息堆积满了，最早的消息可能成为死信
* 如果队列通过dead-letter-exchange属性绑定了一个交换机，那么该队列中的死信就会投递到这个交换机中，这个交换机被称为死信交换机(DLX)
* 注意！！！
* 如果没有绑定死信交换机，那么该死信就会丢失
*
* 当用户发送一条通过TTL设置了过期时间的消息，通过普通的交换机，传递到一个队列中，
* 而这个队列通过dead-letter-exchange属性绑定了交换机时，当该消息过期了，就会变成死信，然后该死信就会发送给这个死信交换机，
* 死信交换机会将这个消息发送给存放死信的队列中(死信交换机绑定的且消费者监听的队列)
*
* 注意！！！
*普通交换机和存放未过期的消息的队列之间的BindingKey要与死信交换机和存放过期消息的队列之间的BindingKey必须一致
* 注意！！！
* 使用注释声明的只能是死信交换机和死信队列以及绑定，因为注解是放在消费者上的，注释的队列的信息会直接被消费
* 如果是普通交换机和普通队列，消息一发送会直接被消费者消费掉，
* 需要用@Bean的方式声明普通交换机和普通队列和绑定
* 并且普通队列要绑定死信交换机
* QueueBuilder.durable("normal.queue").deadLetterExchange("dlx.exchange").build();
* */

//使用延迟消息插件
/*
* 之前使用死信交换机，但是需要自己实现，太麻烦了，所以引入延迟消息插件
* 延迟消息插件:可以将普通的交换机改造成支持延迟消息功能的交换机，当消息投递到交换机后可以暂存一定时间，到期后再投递到队列
*
* 只需要使用延迟消息插件，将普通交换机的delay设置为 true，就能创建一个支持延迟消息的交换机
* 当发送一个设置了过期时间的消息到该交换机时，消息会在交换机中暂存一定时间，等到时间到了，才会路由到队列中
*
* 插件下载地址:https://github.com/rabbitmq/rabbitmq-delayed-message-exchange
*
* 插件需要安装在/var/lib/docker/volumes/mq-plugins/_data目录下，因为这个是和MQ容器挂载的
*
* 执行命令:docker exec -it mq rabbitmq-plugins enable rabbitmq_delayed_message_exchange
* 这个命令是先进入MQ容器，然后执行命令
*
* 安装成功后
* 如果是通过注释声明的
* @RabbitListener(bindings = @QueueBinding(
        value = @Queue(name = "delay.queue", durable = "true"),
        exchange = @Exchange(name = "delay.direct", delayed = "true"),
        key = "delay"
))
public void listenDelayMessage(String msg){
    log.info("接收到delay.queue的延迟消息：{}", msg);
}
*如果是通过@Bean的方式声明的
*   @Bean
    public DirectExchange delayExchange(){
        return ExchangeBuilder
                .directExchange("delay.direct") // 指定交换机类型和名称
                .delayed() // 设置delay的属性为true
                .durable(true) // 持久化
                .build();
    }
    *
发送消息过期时间时不是通过message.getMessageProperties().setExpiration("5000");
而是 message.getMessageProperties().setDelay(5000);，一个是字符串一个是数字
例如:
rabbitTemplate.convertAndSend("delay.direct","hi", "Hello, RabbitMQ!",message ->  {
      message.getMessageProperties().setDelay(10000);
      return message;
    });
* */

总结:延迟消息到期了，被动去执行查询逻辑，再根据结果进行后续操作