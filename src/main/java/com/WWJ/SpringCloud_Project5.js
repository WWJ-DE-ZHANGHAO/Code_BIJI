//分布式事务
/*
*因为微服务和之前的单体不一样，它的操作无法通过事务管理保证多个操作一致性，因为每个操作涉及不同的微服务，而每个微服务都有自己的数据库和Tomcat
* 无法保证一致性，
* 比如:
* 下单服务成功后，会创建订单，然后远程调用购物车服务，将购物车数据清空，再远程调用商品服务，减库存，
* 如果此时商品服务的商品服务出现异常了，导致扣减库存失败，那么此时会抛出异常，因为订单服务可以看到减库存失败，会将订单数据回滚，
* 但是此时购物车服务已经清空了，且购物车服务没法知道商品服务减库存失败，就不会进行回滚，那么此时就会导致数据不一致，
*
* 这种就是分布式事务，
* 分布式系统中，如果一个业务需要多个微服务完成，而且每一个服务都有事务，多个事务必须同时成功或者失败，这种事务就是分布式事务
* ，其中的每一个服务的事务就是一个分支事务，整个逻辑业务成为全局事务
* */

//Seata
/*
* Seata是蚂蚁金服和阿里巴巴共同开源的分布式事务解决方案，致力于提供高性能和简单易用的分布式事务服务，为用户打造一站式的分布式解决方案
* 官网: https://seata.io/zh-cn/
* 解决分布式事务思路:各个事务之间必须能感知彼此的事务状态，才能保证状态一致
* 想让他们知道彼此的状态，此时要用到事务协调者。所有子事物都和事务协调者建立联系，
* 子事务会将事务状态发送给事务协调者，事务协调者会保存这些状态，并把状态发送给其他子事务，这样他们才能知道彼此的状态。
*
* Seata事务管理中有三个角色:
* TC(Transaction Coordinator)事务协调者:维护全局和分支事务的状态，协调全局事务提交或回滚
* TM(Transaction Manager)事务管理器:定义全局事务的范围，开始全局事务，提交或回滚全局事务
* RM(Resource Manager)资源管理器:管理分支事务状态，与TC进行交谈以注册分支事务(TC就知道是哪个分之事务)和报告分支事务的状态
*
* 会将业务从哪开始和哪结束告诉TM，当业务开始的时候TM会告诉TC开启全局事务，
* 当业务结束的时候TM会告诉TC结束全局事务
* 当分支事务开始的时候RM会将分支事务注册到TC中，分支事务执行完之后会向TC报告自己的状态
* */

//部署TC服务
/*
* 步骤:
* 1、准备数据库表，需要将事务的数据持久化到数据库中
* 2、准备配置文件:
*server:
  port: 7099

spring:
  application:
    name: seata-server

logging:
  config: classpath:logback-spring.xml
  file:
    path: ${user.home}/logs/seata

console: //seata控制台登录
  user:
    username: admin
    password: admin

seata:
  config:
    # support: nacos, consul, apollo, zk, etcd3
    type: file //配置类型，默认为file表示使用文件
    # nacos:
    #   server-addr: nacos:8848
    #   group : "DEFAULT_GROUP"
    #   namespace: ""
    #   dataId: "seataServer.properties"
    #   username: "nacos"
    #   password: "nacos"
  registry: //注册中心
    # support: nacos, eureka, redis, zk, consul, etcd3, sofa
    type: nacos //注册中心类型
    nacos:
      application: seata-server
      server-addr: nacos:8848
      group : "DEFAULT_GROUP"
      namespace: ""
      username: "nacos"
      password: "nacos"
……………………
 # support: file 、 db 、 redis
 mode: db
 session:
 mode: db
 lock:
 mode: db
 db:
 datasource: druid
 db-type: mysql //选择Mysql数据库
 driver-class-name: com.mysql.cj.jdbc.Driver
 url: jdbc:mysql://mysql:3306/seata?rewriteBatchedStatements=true&serverTimezone=UTC
 user: root
 password: 123456
 min-conn: 10
 max-conn: 100
 global-table: global_table
 branch-table: branch_table
 lock-table: lock_table
 distributed-lock-table: distributed_lock
 query-limit: 1000
 max-wait: 5000

* 注意！！！
* 是将Seata安装在Docker容器中，需要将Seata和Nacos以及MySQL放在同一个自定义网络中
* 将配置文件上传到虚拟器
* 命令:
docker run --name seata \
-p 8099:8099 \
-p 7099:7099 \
-e SEATA_IP=192.168.100.128 \
-v ./seata:/seata-server/resources \ # 将配置文件挂载到Seata容器中，这样配置文件就会生效
--privileged=true \
--network WWJ \
-d \
seataio/seata-server:1.5.2
*
*创建并运行Seata容器之后
* 访问http://192.168.100.128:7099
* 就能进入Seata控制台了
* 登录账号密码都是admin
* */

//微服务集成Seata
/*
*步骤:
* 1、在项目中引入seata的依赖
<!--统一配置管理-->
  <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
  </dependency>
  <!--读取bootstrap文件-->
  <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-starter-bootstrap</artifactId>
  </dependency>
  <!--seata-->
  <dependency>
      <groupId>com.alibaba.cloud</groupId>
      <artifactId>spring-cloud-starter-alibaba-seata</artifactId>
  </dependency>
* 2、在微服务配置文件中添加seata的配置
* 因为seata可能会有很多台，所以地址不确定的，不能写死在配置文件中
* 需要从Nacos拉取seata服务地址
*需要添加的配置内容:，因为多个微服务都会需要写，所以将这些配置放在Nacos中的共享配置文件中
seata:
  registry: # TC服务注册中心的配置，微服务根据这些信息去注册中心获取tc服务地址
    type: nacos # 注册中心类型 nacos
    nacos:
      server-addr: 192.168.100.128:8848 # nacos地址
      namespace: "" # namespace，默认为空
      group: DEFAULT_GROUP # 分组，默认是DEFAULT_GROUP
      application: seata-server # seata服务名称
      username: nacos
      password: nacos
  tx-service-group: hmall # 事务组名称
  service:
    vgroup-mapping: # 事务组与tc集群的映射关系
      hmall: "default"
* */

//使用Seata的XA模式
/*
*XA规范是X/Open组织定义的分布式事务处理标准，XA规范描述了全局的TM与局部RM之间的接口，几乎所有主流的关系型数据库都对XA规范提供了支持
* XA模式下:
* TM首先告诉TC开启全局事务，然后执行微服务，但是执行业务前会被微服务拦截，它会先向TC注册分支事务，然后才会开始执行业务SQL
* 但是只执行不提交(会开启事务排他锁，其他业务无法访问该资源的最新状态)，执行完后告诉TC事务状态，
* 依次执行下一个微服务…………等到TM告知结束全局事务，代表业务中的最后一个微服务执行完了
* ，TC会告诉是否全部成功，
* 如果全部成功了会给所有分支发送一个命令可以提交了(此时才会释放排他锁)。如果不是全成功会给所有分支发送命令，进行回滚
*
* 主要分为两个阶段:
* 一、
* RM注册分支事务到TC
* RM执行分支业务sql但不提交
* RM报告状态到TC
* 二、
* TC检测各分支事务执行状态
* 如果成功，通知所有RM提交事务
* 如果有失败的，通知所有RM回滚事务
* RM收到TC指令开始提交或回滚
*
* 缺陷:因为需要等待所有分支事务全部执行完之后，才会释放排他锁，导致其他的业务访问不了该资源，其他微服务只能干等最后一个执行完
*
* 实现XA模式:
* Seata的starter已经完成了XA模式的自动装配，实现非常简单，步骤如下
* 1、修改application.yml文件(每个参与事务的微服务),从而开启XA模式
* seata:
*   data-source-proxy-mode: XA
* 2、给开启全局事务的入口的方法添加@GlobalTransactional注解，本例中是OrderServiceImpl中的create方法
* @overrid
* @GlobalTransactional
* public Long createOrder(OrderFormDto order){}
* 3、重启服务
*
*注意！！
* 给每个微服务的逻辑加上@Transcational
* */

//使用seataAT模式
/*
* AT模式解决了XA模式中因为等待造成的性能比较差的问题
* AT模式下
* TM告诉TC开启全局事务，然后执行微服务逻辑，微服务执行前拦截请求，先去TC注册分支事务，然后生成一个快照记录SQL执行前数据库的数据
* 然后才执行SQL，执行完立马提交并告知TC事务状态，等TM告知结束全局事务，如果全部成功了，会删除生成的快照
* 如果有失败的，则告知所有分支事务执行快照恢复数据
* 也分为两个阶段:
* 一、
* RM注册分支事务
* 记录undo-log(数据快照)
* 执行业务sql并提交
* 报告事务状态
* 二、
* 如果都成功了删除undo-log既可
* 如果有失败根据undo-log恢复到执行SQL前的数据
*
* 缺陷:因为执行后是立马提交的，此时其他的业务就能来访问该资源，如果这个执行成功，其他的微服务有的失败了，就会导致数据不一致
* 比如:下单时发现库存不足扣减失败了，还把购物车清理，此时其他业务来查询订单信息吗、就会出现数据不一致，没有成功扣减库存但是还是下单成功了
* 所以会出现短暂的数据不一致的情况，但这个时间很短影响不大
*
* 注意！！！
* AT内部会帮我们自动生成快照和根据快照恢复数据，以及删除快照信息
*
* 实现AT模式:
* 一、
* 添加undo-log数据库表到每一个需要进行分布式事务的微服务的数据库中
* 二、
* 修改application.yml文件
* seata:
*   data-source-proxy-mode: AT
*
*
* */