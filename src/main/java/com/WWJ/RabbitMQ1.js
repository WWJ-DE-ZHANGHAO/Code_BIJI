//RabbitMQ
/*
* RabitMQ是一个高性能的异步通讯组件，基于AMQP协议实现，提供了可靠的消息传递机制和丰富的功能特性。
* 官网:https://www.rabbitmq.com/
* 异步通讯和同步通讯的区别:、
* 同步通讯:发送方发送消息后，必须等待接收方处理完消息并返回结果后才能继续执行下一步操作。
* 例如:视屏通话，双方都可以对方正在干什么事，实时通讯
* 异步通讯:发送方发送消息后，不需要等待接收方处理完消息，可以继续执行下一步操作，
* 接收方在处理完消息后会通过回调或者事件通知发送方。
* 例如:发微信消息，接受方可能在忙别的事，不会立马回复消息，回了消息之后，发送方才知道对方已经收到消息了
* 同步通讯
* 优点:简单易理解，适合实时性要求高的场景
* 缺点:只能一对一通讯，无法同时给多个接收方发送消息
* 异步通讯
* 优点:解耦发送方和接收方，可以同时给多个接收方发送消息，适合分布式系统中的通讯，并发能力很强
* 缺点:异步通信无法保证消息的实时处理，并且需要额外处理消息丢失、重复消费、顺序错乱等问题。
* 要确保跨服务的数据最终一致性，需要更复杂的机制（如事务消息、Saga模式等）
*
* 案例:企业中的微服务系统，用户登录时需要查询并校验用户信息，然后提交登录信息给风控系统进行风险评估，
* 然后发送短信，最后记录短信日志。这样在高并发的情况下，用户登录的响应时间可能会很长，效率很低。
*
* 而使用异步通讯后，用户登录时只需要查询并校验用户信息，然后提交登录信息给MQ，告诉MQ有用户登录了，
* 此时登录业务就完成了，风控服务和短信服务监听MQ，就行了。监听到登录信息后，
* 再并行执行进行风险评估，发送短信，记录短信日志等操作，这样就大大提高了用户登录的效率和响应速度。
*
*
* */

//同步调用的优缺点:
/*
* 因为同步调用，只能等待一个业务处理完了，才能继续执行下一步，如果一个业务处理时间过长，就会导致整个系统阻塞。
* 比如:支付服务远程调用用户服务扣减余额、调用订单服务更新订单状态
* 因为是扣减余额必须是同步调用，只有扣减余额成功后才能继续执行订单服务更新订单状态。
* 但是如果还要调用其他的服务，比如调用短信服务通知用户，那么就需要等待所有无法都完成会很耗时，而且一旦有一个服务异常，就会导致整个系统异常。
* 缺点:拓展性查(不能够调用很多个服务)，性能会下降(随着调用的服务数量变多而下降)、级联失败(一个服务异常，就会导致整个系统异常。)
  优点:时效性强、必须等待结果才能继续执行下一步，像是支付扣减用户余额必须用同步调用，不能用异步调用。
* */
//异步调的优缺点:
/*
* 异步通信通常是基于消息通知的方式，包含三个角色:
* 消息发送者:投递消息的人，就是原来的调用者
* 消息接收者:接收和处理消息的人，就是原来的服务提供者
* 消息代理(broker):管理、暂存、转发消息，
* 那之前的支付服务为例:
* 支付服务远程调用用户服务扣减余额、调用订单服务更新订单状态、还调用短信服务通知用户
* 此时可以让扣减余额用同步调用，然后更新支付状态
* 而调用其他服务则是异步通信，将消息发送给消息代理，然后线程就可以去干其他的事了，不用等结果也不要管服务是否故障了
* (就算是故障了没处理完，消息队列会把消息放在PendingList中，等待服务恢复正常了就能直接从Pendinglist中拿去处理)
* 由这些被调用的服务监听消息代理，监听到了消息，这些服务就自己执行逻辑，完成业务逻辑。
* 从而提高了性能了，不会阻塞线程，不会因为一个服务异常导致整个系统异常。
*
* 缺点:
* 时效性差，发送消息后，无法知道处理的结果是什么，完全耦合了
* 业务安全依赖于Broker的可靠性，一旦Broker挂了，所有消息都会丢失。
* 优点:
* 解除耦合，
* 提升扩展性，
* 无需等待，性能好
* 、故障隔离、
* 缓存消息/流量削峰填谷:如果流量是忽高忽低的会无法充分利用服务器资源，高的时候可能会将服务器压崩，低的时候可能会因为没有处理消息而空闲。
* 而异步通信就可以解决:当流量激增的时候将请求都缓存在消息代理中，每个微服务监听消息代理，根据自己的处理能力处理消息，等流量低的时候
* 因为消息代理中还有流量激增未处理的消息，就会将消息取出来，保证流量低的时候服务器也不会空闲。
*
*
* */
总结:
对于时效性要求高的场景，使用同步调用，
对于扩展性/性能要求高的场景，使用异步调用。
//MQ技术选型:
/*
*MQ(Message Queue):消息代理
* 主要的MQ技术有:RabbitMQ、Kafka、ActiveMQ、RocketMQ
* RabbitMQ:是Rabbit公司基于Erlang语言开发的开源项目、支持多种协议，
* 可用性高:因为底层是可以支持集群的所以不会以为一个服务器挂掉就导致消息丢失。
* 单机吞吐一般:10以下的吞吐/秒
* 因为底层是基于内存处理的，所以消息延迟是微秒级的。
* 消息的可靠性高:发送一条消息，要保证这条消息起码被消费一次，因为RabbitMQ底层有很多确认机制，保证消息至少被消费一次。
*
* Kafka:是Apache软件基金会的开源项目，基于Scala&java语言开发，
* 可用性高:因为底层是可以也是支持集群的所以不会以为一个服务器挂掉就导致消息丢失。
* 单机吞吐:100W+/秒
* 延迟高:毫秒级延迟
* 消息的可靠性一般:会丢失消息
* 总结:
* Kafka:适合海量数据处理的需求，单机吞吐高，
* RabbitMQ:适合消息延迟要求高、可靠性要求高的场景
* */
注意！！！
在SpringCloud中是对RabbitMQ和Kafka进行封装
//安装部署RabbitMQ:
/*
* 基于Dokcer安装,也是会提供一个控制台界面
docker run \
 -e RABBITMQ_DEFAULT_USER=itheima \ #设置，环境变量用户名和密码
 -e RABBITMQ_DEFAULT_PASS=123321 \
 -v mq-plugins:/plugins \  #挂载数据卷，用于存放插件
 --name mq \  #容器名
 --hostname mq \ #主机名
 -p 15672:15672 \ #访问RabbitMQ控制台页面端口
 -p 5672:5672 \  #收发消息端口
 --network WWJ\
 -d \
 rabbitmq:3.8-management
访问地址:http://192.168.100.128:15672
*
* 可以在控制台看到创建的队列、交换机、绑定关系
* 创建队列、交换机、绑定关系、还可以接发消息
*
* RabbitMQ的整体架构及核心概念:
* publisher:发布者，就是消息发送者
* consumer:消费者，就是消息接收者
* exchange:交换机，负责路由消息
* queue:队列，存储消息
*
* 消息发送者不用关心发送给哪个队列，只需要将消息发送给交换机，交换机会根据路由规则将消息发送给对应的队列
* 交换机可以把消息路由给一个或多个队列，队列也可以将让多个消费者监听
* 这里消息代理就由交换机和队列两部分组成*/

//使用RabbitMQ
/* 在实际开发中，因为一个项目很难打满一个RabbitMQ，所以一般都会多个项目共享一套RabbitMQ服务，
* 但是如果每个项目都创建自己的交换机和队列，如果名字一样会造成冲突。
* 为了让不同的项目的交换机和队列之间产生隔离，就需要用到virtual-host:虚拟主机，类似Mysql中的DataBase，不同的数据库之间是隔离的。
* 每个项目都创建独立的虚拟主机，然后在里面创建交换机、队列，这样，不同项目之间的消息不会冲突。
*
* 案例:
* 在RabbitMQ的控制台完成下列操作
* 1、新建队列的hello.queue1和hello.queue2
* 2、向默认的amp.fanout交换机发送消息，
* 3、查看消息是否到达hello.queue1和hello.queue2
*
* 在控制台中点击Queues页面创建队列:需要填写队列名称
* 然后在交换机页面，点击publish message可以进行发送消息给交换机，
*
* 此时如果没有对消息进行路由转发到队列，会提示Message published but not routed
* 那么消息就会丢失，交换机没有存储消息的能力
*
* 需要在交换机和队列之间进行绑定关系，这样才能将消息转发到队列中
* 绑定关系:
* 在交换机页面或队列页面点击队列或者交换机，然后点击Bindings，填写交换机或队列名称，
* 然后点击bind，就完成绑定关系了，绑定多个就再进行多次绑定
*
* 此时再发送消息会提示:Message published，交换机会显示收到消息和发送消息的数量
*
* 在队列页面点击队列，然后点击get message，就可以查看最新的消息了
* */

//数据隔离
/*
* 使用虚拟主机实现数据隔离:
* 在RabbitMQ的控制台的admin页面中点击右上角的Virtual Hosts就可以管理虚拟主机了
* 会发现每个虚拟主机是对应一个用户的，所以为了测试数据隔离，需要再创建一个用户才能再创建一个虚拟主机
* 创建用户:需要填写用户名(hmall)、密码(123)、权限(使用admin超级管理员，权限最高)
* 注意！！！
* 用户只能操作自己虚拟主机的交换机、队列等信息，如果操作其他用户的虚拟机主机，会提示:Access refused.
  创建用户的虚拟主机:
  在admin页面中点击Virtual Hosts，然后add，填写虚拟主机名称(hmall)，创建出来的就是属于“当前登录用户”的虚拟主机
  回到Exchanges页面，会看到生成了属于当前登录用户的虚拟主机的交换机，交换机名字是和其他的虚拟主机的交换机名称一样，
  但是归属的虚拟主机不同

注意！！！
如果不想看所有虚拟主机的交换机和队列，可以点击右上角的Virtual Hosts的下拉框，选择想看的虚拟主机
* */

//Java客户端创建RabbitMQ连接
/*
*在Java客户端中，使用的是Spring AMQP来操作RabbitMQ
* 因为RabbitMQ采用的消息通信协议就是AMQP(Advanced Message Queuing Protocol)
* AMQP是一种高级的消息协议，该协议的特点是，消息的收发与语言和平台无关，都能和RabbitMQ进行交互
* 但是AMQP比较繁琐，所以使用Spring AMQP来操作RabbitMQ
* Spring AMQP就是基于AMQP协议定义的一套API规范，提供了模板进行发送和接受消息
*
* Spring AMQP的官网:https://spring.io/projects/spring-amqp
*导入一个mq.demo项目，这是一个聚合项目，里面有两个微服务模块，一个消息发送者，一个消息接受者
*
* 案例:
* 利用控制台创建队列simle.queue
* 在publisher模块中，利用SpringAMQP直接发送消息给simple.queue
* 在consumer模块中，利用SpringAMQP编写消息接收者，监听simple.queue，接收消息并打印
*这里简化了，没有写交换机
* 实现步骤:
* 1、在两个模块中引入Spring AMQP的依赖
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
2、在两个模块的配置文件中添加RabbitMQ的连接信息
spring:
  rabbitmq:
    host: 192.168.100.128
    port: 5672
    virtual-host: /hmall
    username: hmall
    password: 123
3、发送消息到RabbitMQ
* Spring AMQP提供了一个RabbitTemplate工具类，方便我们发送消息，
*@Autowired
* private final RabbitTemplate rabbitTemplate;
*
* public void sendMessage(String message) {
*  //队列名称
*  String queueName = "simple.queue";
*  //消息
* String message = "Hello World";
*  //发送消息
*  rabbitTemplate.convertAndSend(queueName, message)
* }
4、在消息接收
* SpringAMQP提供了声明式的消息监听，我们只需要通过注解在方法上声明要监听的队列名称，将来SpringAMQP就会把消息传递给当前的方法
* 类似订阅模式，消息发送者不需要知道消息被谁接收，消息接受者只需要声明自己要监听的队列名称，
* 当有消息发送到这个队列时，就会被当前方法作为参数接收并处理
*@RabbitListener(queues = "simple.queue") //声明监听的队列名称,可以监听多个队列，使用逗号分隔开就行了
* public void receiveMessage(String message) {
*  System.out.println("Received message: " + message);
* }
* 注意！！！
*只要项目启动，只要队列中有消息就会自动被监听方法接收到，监听方法一旦接收到消息就会处理，处理完成之后，消息就会从队列被删除
* */


//Work Queue(工作队列)
/*
*Work Queue:也称为任务模型;就是让多个消费者绑定同一个队列，共同消费队列中的消息。这就叫任务模型。
* 发送一条消息，这个消息会被哪个消费者处理，还是会被所有消费者处理？
*
* 案例:
* 在RabbitMQ的控制台创建一个队列work.queue
* 在publisher模块中，利用SpringAMQP发送50条消息给work.queue
* 在consumer模块中，定义两个消息监听者，同时监听work.queue。
*
*观察结果是:
* 两个消费者同时处理了50条消息，平均每个消费者处理了25条消息，说明发送一条消息只会被一个消费者处理，而不是所有消费者都处理了。
* 而且消费者一全是奇数，消费者二全是偶数，说明两个消费者处理的消息是 alternating交替的(类似轮询)，
* 这就是工作队列的特点:
* 即一个消费者处理完一条消息之后，另一个消费者才会处理下一条消息，这样就保证了消息的公平分发了。(默认是轮询)
* 发送一条消息只会被一个消费者处理，而不是所有消费者都处理了。
*
* 即使不同主机/微服务模块上的多个消费者，只要绑定到同一个队列上，也算是一个工作队列/任务模型了。
* 但是有问题就是，如果某一个主机的性能不足，那么轮到该主机的消费者处理消息时因为性能不足了，还在处理上一个消息会怎么样？。
* 案例:
* 在consumer模块中，定义两个消息监听者,都绑定同一个队列work.queue，但是消费者一每秒处理40条消息，消费者二每秒处理10条消息(使用Thread.sleep(1000)来模拟处理消息的时间)，
* 发送50条消息给work.queue
 观察结果是:
 *两个消费者依旧是平均分配消息，交替处理消息，但是消费者二处理消息的效率低于消费者一，当消费者一处理完它自己的后，消费者二还有很多消息堆积，
 *还要等等好几秒消费者二才处理完消息，很浪费时间，这样效率不高。
 *解决方案:
 *需要修改消费者模块的application.yml文件，设置preFetch值为1，确保同一时刻最多投递给消费者一条数据
 * Spring:
 *  rabbitmq:
 *   listener:
 *      simple:
 *       prefetch: 1 #每次只能获取一条消息，处理完后才能获取下一条消息
 * 这样设置，谁处理的快，哪个消费者分到的消息就会更多，控制了消费者处理的消息数量，实现能者多劳
 * 在测试一遍会发现，此时执行效率更高，消费者一处理的消息比消费者二多
*
* 总结:只要是一个消息队列被多个消费者绑定，那么就叫工作队列/任务模型，
* 任务模型的优势:提高处理消息的效率，但是也存在问题，如果某消费者处理能力不足，那么其他消费者就只能等待了
* 所以使用了预取值 prefetch: 1，来控制同一时刻只能投递给消费者一条消息，这样就能让处理能力强的消费者分到更多的消息了，提高了效率。
* */

//Fanout交换机
/*
* 之前的Java客户端发送消息的例子中，是简化的，直接将消息发送给队列的，没有用交换机了
* 交换机的作用:接受消息，将消息发送给绑定的队列
* 交换机可以可以将消息发送给一个或多个队列，根据交换机的类型决定发送给队列的方式
* 交换机的类型: Fanout(广播)、Direct(定向直连)、Topic(话题/主题)、Headers(头)
*
* Fanout(广播)，将消息发送给所有绑定的队列，队列又可以将消息发送给消费者，这就达到了一个消息可以被多个消费者处理了
* (之前的工作队列是一个消息只能被一个消费者处理了，处理了就没了)，
* 例如:之前的支付服务，支付成功后需要远程调用多个微服务
* 如果是之前的没用交换机的方式，多个微服务都绑定了同一个队列，那么当支付成功后，消息只会被一个微服务处理，其他微服务就无法处理了，这不能满足需求了
* 而用交换机并每个微服务绑一个队列，那么当支付成功后，消息会被发送给交换机，交换机会将消息发送给所有绑定的队列，每个微服务都能处理到消息了，这就满足了需求了
* 案例:
* 在RabbitMQ的控制台创建两个队列，fanout.queue1和fanout.queue2
* 在RabbitMQ的控制台创建一个Fanout类型的交换机(需要声明类型type为fanout)，hmall.fanout，将fanout.queue1和fanout.queue2都绑定到hmall.fanout交换机上
* 在consumer模块中，定义两个消息监听者，分别监听fanout.queue1和fanout.queue2
* 在publisher模块中，利用SpringAMQP发送消息给hmall.fanout交换机
*  发送消息:
* void testfanoutExchange() {
    String exchangeName = "hmall.fanout";
    String message = "Hello, RabbitMQ!";
    rabbitTemplate.convertAndSend(exchangeName, null ,message);//还需要声明routingKey参数，这里写为null
  }
*
* 查看结果:
* 两个消费者都收到了消息，说明发送一条消息会被所有绑定的队列处理了，这就是Fanout交换机的特点了。
*
* */

//Direct(定向直连)
/*
* 因为不一定要消息发送给所有的队列，有时候需要根据不同的条件发送给不同的队列，这时候就需要用到Direct(定向直连)交换机了
Direct Exchange:会将接收到的消息根据规则路由到指定的Queue中，因此称为定向路由
* 每一个Queue都会与Exchange设置一个BindingKey(绑定的时候指定一个bingdingKey)
* 发布者发送消息时，指定消息的RoutingKey
* Exchange将消息路由到bindingKey与该消息RoutingKey一致的队列，如果没有匹配的队列，则消息会被丢弃
* 可以实现一个消息只能被部分队列的的消费者处理，也可以被所有队列的消费者处理了
*
* 例如:
* 还是之前的支付服务，支付成功后需要调用订单服务，短信服务、积分服务，
* 此时可以发送一个消息的RoutingKey和这三个服务的队列的bindingkey一致与Fanout功能一致
*
* 如果支付失败，只需要调用订单服务修改订单状态，不需要调用短信服务、积分服务，此时就可以只发送消息的RoutingKey和订单服务的队列的bindingkey一致
* 这样就只会发送消息给订单服务的队列了，短信服务和积分服务的队列就收不到消息了，这样就满足了需求了
* 注意！！！
* 同一个队列可以和交换机绑定多个bindingKey
* 案例:
* 在RabbitMQ的控制台声明队列direct.queue1和direct.queue2
* 在RabbitMQ的控制台声明Direct类型的交换机hmall.direct，将两个队列都绑定到hmall.direct交换机上，
* 绑定时为每个队列都指定两个bindingKey，direct.queue1分别是red 和 blue，direct.queue2分别是yellow和red
* 在consumer模块中，定义两个消息监听者，分别监听direct.queue1和direct.queue2
* 在publisher模块中，，发送消息时利用不同的RoutingKey来向hmall.direct交换机发送消息.
*
* 测试:
* 向Direct类型的交换机分别发送两条消息，分别指定RoutingKey为red和blue
* 观察结果:
* 发送消息的RoutingKey为red时两个消费者都收到了消息
* 发送消息的RoutingKey为blue时只有消费者1收到了消息
*
* 总结:Direct Exchange交换机可以只给部分队列发送消息了，又可以给所有队列发送消息了，灵活性更高了，适合根据不同条件路由消息的场景了。
* */

//Topic(话题/主题)
/*
* Topic Exchange也是基于RoutingKey做消息路由的，但是routingKye通常是多个单词的组合，并用.号隔开，例如:
* 而且BindingKey还可以使用通配符:
* #:代表0个或多个单词
* *:代表一个单词
* 例如:
* china.#,可以表示所有以china开头的RoutingKey的消息都可以被路由到，绑定了china.#的队列中
* #.usa,可以表示所有以usa结尾的RoutingKey的消息都可以被路由到，绑定了#.usa的队列中
* 相比与Direct交换机的优势就是:不用多次绑定不同的bindingKey了，使用通配符就可以满足不同条件的路由了，适合根据多个条件路由消息的场景了。
* 例如:
* 需要队列A绑定bindingKey为china.news、china.weather、china.sports,
* 如果是Direct交换机就需要绑定三次了，而Topic交换机只需要绑定一次，bindingKey为china.#就行了，就可以满足需求了。
*
* 缺陷:因为是通配符所以需要匹配的效率会比较低
*
* 案例:
* 在RabbitMQ的控制台声明队列topic.queue1和topic.queue2
* 在RabbitMQ的控制台声明Topic类型的交换机hmall.topic，将两个队列都绑定到hmall.topic交换机上，
* 绑定时为每个队列都指定一个bindingKey，topic.queue1是china.#，topic.queue2是#.news
* 在consumer模块中，定义两个消息监听者，分别监听topic.queue1和topic.queue2
* 在publisher模块中，发送消息时利用不同的RoutingKey来向hmall.topic交换机发送消息.
*
*如果此时发送消息china.news，那么两个消费者都收到了消息了
*  @Test
  void testtopicExchange() {
    String exchangeName = "hmall.topic";
    String message = "China RabbitMQ!";
    rabbitTemplate.convertAndSend(exchangeName, "china.news", message);
  }

*总结:
* Topic Exchange交换机可以满足根据多个条件路由消息的场景了，适合根据多个条件路由消息的场景了，能减少绑定次数
* 拓展性更强，
* */


//声明队列/交换机
/*
* 之前的交换机和队列都是在RabbitMQ的控制台声明的，
* 这种方式是比较容易出错的，因为之后运维工作的时候可能会搞错队列和交换机的名称(不推荐)
* 更推荐的方式是在代码中声明队列和交换机，这样就不会出错了，代码也更清晰了,运维工作更加简单了。
* SpringAMQP提供了声明队列和交换机以及其绑定关系的类
* Queue:用于声明队列，用于工厂类QueueBuilder来创建队列
* Exchange(接口，它的实现类AbstractExchange的子类才是不同类型的交换机):用于声明交换机，用于工厂类ExchangeBuilder来创建交换机
* Binding:用于声明队列和交换机的绑定关系，可以用工厂类BindingBuilder来创建绑定关系
* 以上的除了Binding，其他的都可以通过new来创建，也可以通过工厂类来创建。
* Binding:通过是通过工厂类BindingBuilder来创建绑定关系。
*
* 例如:声明一个Fanout类型的交换机，并创建队列和绑定关系
*
* @Configuration
* public class FanoutConfig {
*  @Bean
*  public FanoutExchange fanoutExchange() {
*  return new FanoutExchange("hmall.fanout");
* }
* @Bean
* public Queue fanoutQueue1() {
* return new Queue("fanout.queue1");
*}
* @Bean
* public Binding bindingQueue1(Queue fanoutQueue1,FanoutExchange fanoutExchange) {
*  return BindingBuilder.bind(fanout.queue1).to(hmall.fanout);//链式调用，绑定关系，如果还有RoutingKey，可以继续调用with()方法
* }
*  }
*
* 注意！！
* 需要将控制台中的先删掉
* 通常在消息接受模块中，声明交换机，队列，绑定关系，然后监听队列，然后消费队列中的消息
*
* 注意！！！
* 使用工厂类创建队列时，会有两个方式
* return QueueBuilder.durable("fanout.queue1").build();//创建持久化队列
* return QueueBuilder.nonDurable("fanout.queue1").build();//创建非持久化队列
* 使用new 创建队列时，默认是创建持久化队列了
* 持久化队列:当RabbitMQ服务器重启后，持久化队列中的消息不会丢失了，非持久化队列中的消息会丢失了。
* 但是持久化队列的性能会比非持久化队列的性能差一些，因为持久化队列需要将消息写入磁盘中，而非持久化队列只需要将消息保存在内存中就行了。
*
* 注意！！！
* 创建绑定关系的时候，方法参数值需要为该创建队列和交换机的方法的方法名，因为这两个返回值都是交给Spring容器管理的了，
* Spring容器会根据方法名来找到对应的队列和交换机的Bean，然后进行绑定关系的创建了。
* @Bean
    public Binding fanoutQueue1Binding(FanoutExchange fanoutExchange, Queue fanoutQueue1) {
        return BindingBuilder.bind(fanoutQueue1).to(fanoutExchange);
    }
 需要给交换机绑定多个队列时，就继续编写多个创建队列和绑定关系的方法，方法参数值分别为创建队列和交换机的方法名和创建队列和交换机的方法名
 *
 * 方法执行后，再去RabbitMQ的控制台中查看交换机和队列以及绑定关系，就会发现已经创建好了
* */


//基于注释声明队列/交换机
/*
*先将把之前控制台中创建的直连交换机、队列、绑定关系删除掉
* 在Java代码中编写队列和交换机，并声明绑定关系
因为Direct交换机发送消息时需要指定RoutingKey，所以创建绑定关系时需要用with()方法指定BindingKey了
*如果需要给队列设置多个BindingKey，但with()方法只能指定一个BindingKey，那么就需要创建多个方法
*但是会如果要给多个队列设置多个BindingKey，那么就需要创建很多很多方法，导致代码很臃肿
*
* 为此，SpringAMQP提供了一种解决方案，就是使用注释来声明队列和交换机以及绑定关系
* 使用的注释是@RabbitListener注解，上述中我们还用了@RabbitListener注解来指定消费者的监听队列。
* 格式:
* @RabbitListener(bindings = @QueueBinding( //注解中嵌套队列注解
*  value = @Queue( name= "direct.queue1", durable = "true"), //声明队列，durable表示是否持久化
*  exchange = @Exchange(name = "hmall.direct", type = ExchangeTypes.DIRECT), //声明交换机，type表示交换机类型
*  key = {"red", "blue"} //声明绑定关系，key表示BindingKey，可以指定多个BindingKey
* ))
*此时就是将将消费者的只监听队列的注解移除，改为这种形式
* 只要项目启动，就会自动创建队列和交换机，并绑定关系，然后监听队列，然后消费队列中的消息了
*
* 优点:代码更简洁了，不需要编写很多方法来创建队列、交换机、绑定关系了，直接在消费者的监听方法的注释上声明就行了
* */

//消息转换器
/*
* 之前发送消息都是通过convertAndSend方法发送的，这个方法会将消息转换成字节数组再发送给RabbitMQ的，
*案例:
* 在控制台创建一个object.queue队列
* 在publisher模块中，利用SpringAMQP发送一个Map类型的消息给object.queue队列，查看结果
* 会发现是一堆乱码，
* 因为SpringAMQP默认情况下，将消息转换成字节时是使用JDK自带的序列化方式，
  但是使用JDK的ObjectOutputStream类进行序列化时，存在问题:
  JDK的序列化安全风险(容易被注入攻击)、
   JDK序列化的消息太大、
   JDK序列化的消息可读性差
  建议采用JSON序列化替换默认的JDK序列化，
   需要在发送消息和接收消息的模块中，添加JSON转换的依赖，并配置转换器
   步骤
  1、添加jackson依赖
 <dependency>
  <groupId>com.fasterxml.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
 </dependency>
 2、在发送消息和接收消息的模块中，配置MessageConverter
 * @Bean
 * public MessageConverter messageConverter() {
 *  return new Jackson2JsonMessageConverter();
 * }
 *
 * 注意！！！
 * 发送的消息是什么格式，那么接收的消息就是什么格式类型
* */


//对支付服务进行业务修改
/*
* 支付成功后，远程调用用户服务，修改用户余额，修改成功后修改支付状态(这两步使用同步调用)
* 其他的短信发送，修改订单状态，修改库存，修改物流信息等(非核心业务)操作使用异步调用了，发送消息给RabbitMQ的交换机，
* 告诉RabbitMQ支付成功了，由这些服务模块自己去创建一个队列和交换机进行绑定，然后监听队列，然后消费队列中的消息，完成非核心业务操作了，
* 这样就大大提高了支付服务的效率了，用户登录的响应速度也更快了。
*
* 使用的是Direct交换机，保证可以只给部分服务发送消息了，也可以给所有服务发送消息了，灵活性更高了，适合根据不同条件路由消息的场景了。
* 给每个需要用到MQ的微服务添加依赖
*   <!--消息发送-->
  <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-amqp</artifactId>
  </dependency>
并在配置文件中配置MQ连接信息
spring:
  rabbitmq:
    host: 192.168.150.101 # 你的虚拟机IP
    port: 5672 # 端口
    virtual-host: /hmall # 虚拟主机
    username: hmall # 用户名
    password: 123 # 密码
这里建议抽取到Ncaos的共享配置文件中
*
在订单服务中创建一个监听方法，并在方法上声明队列、交换机、绑定关系和BindingKey，
*
在支付服务中，如果支付成功就使用rabbitTemplate发送消息给交换机带上RoutingKey，
* 告诉RabbitMQ支付成功了，其他服务监听到这个消息后就可以处理了
*
* 还需要配置消息转换器，需要在发送消息和接收消息的模块中，添加JSON转换的依赖，并配置转换器
* @Configuration
* public class RabbitMQConfig {
* @Bean
 * public MessageConverter messageConverter() {
 *  return new Jackson2JsonMessageConverter();
 * }
 * }
 * 因为都要用到，所以建议抽取到Common模块中，并且因为配置类必须被扫描到才能生效
 * 其他的服务模块中，添加Common模块的依赖，无法扫描配置类。
 * 所以，要用到Spring的自动装配，在resources目录下创建META-INF目录，在META-INF目录下创建spring.factories文件，
 * 内容如下:
 *   com.hmall.common.config.MyBatisConfig,\
  com.hmall.common.config.MvcConfig,\
  com.hmall.common.config.JsonConfig,\
  com.hmall.common.config.MqConfig
注意！！！
因为网关也引入了Common模块，所以，网关模块也会扫描到MqConfig配置类了，但是网关是基于Flux编程的，所以网关找不到配置类，就会报错
*所以要在MqConfig类中添加@ConditionalOnClass(DispatcherServlet.class)注解，
* 只有当DispatcherServlet类存在时才会加载这个配置类了，这样就不会影响到网关模块了

* */

