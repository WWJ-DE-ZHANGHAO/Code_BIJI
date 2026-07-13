
spring-boot-starter开头的，不用写版本号因为它来自 Spring Boot Parent 的依赖管理，这里是继承于父类的父类
    因为父类中管理了spring-cloud-alibaba-dependencies和spring-cloud-dependencies的版本号，所以不用写版本号
    所以spring-cloud-starter和spring-cloud-starter-alibaba开头的依赖也不用写版本号
要建立父子模块之间的关系只需要在父模块的pom.xml文件中添加<packaging>pom</packaging>
再在<modules><modules>中添加子模块的名称即可，并加上<dependencyManagement>标签，管理所有子模块可能用到的依赖及版本号，子模块引入这些依赖时就不必再写版本号了
在子模块中通过<parent>标签引入父模块的groupId、artifactId和version
即可建立父子模块之间的关系
注意！！！
子模块因为继承了父模块，所以不用加上version和groupId，父模块的groupId和version会自动传递给子模块
//微服务
//导入项目
/*
*之前的Dokcer是将Java应用和前端都放到Docker容器中的
* 这里是在本地运行，只将Mysql放在容器中，
* 将Java应用的配置文件中的数据库地址改为虚拟器的地址，因为此时Java不是运行在容器中的，而是运行在主机中的
* 但是因为有两个配置文件，一个是dev另一个是local
* dev中的是将项目整个放入Docker容器中运行的配置，local中的是在本地运行的配置，所以要修改local中的配置文件
* 但是不能修改配置文件中过的有效的配置文件变为local
* profiles:
    active: dev
    *
而是打开alt+8，点击+，选择SpringBoot，然后点击编辑配置，将有效配置文件改为local，默认是dev，这样就能在本地运行了
*在启动本地的Nginx的时候
* 访问:http://localhost:18080/
* */

//单体架构
/*
* 单体架构:将业务的所有功能集中在一个项目中开发，打包成一个可执行的jar包，部署在服务器上运行
* 优点:开发简单，部署方便
* 缺点:因为所有的功能都在一个项目中开发，所以项目会变得庞大
* ，代码耦合度高，维护困难，扩展性差，性能瓶颈明显
* 每次编译执行会很慢，开发效率低，测试效率低，部署效率低，系统可用性差
*当某个接口的并发访问量过大时，会导致服务器的其他接口无法访问，响应变慢，从而导致整个系统可用性下降
*
* */

//微服务架构
/*
* 微服务架构:是服务化思想指导下的一套最佳时间架构方案，服务化，就是把单体架构中功能模块拆分成多个独立项目
* 一个小团队负责一个独立的服务，服务之间互相调用，服务之间互相依赖
*特点:粒度小、团队自治、服务自治
*每个服务都是一个独立的项目，拥有自己的数据库，自己的代码，自己的部署环境，自己的运行环境
* 缺点:开发复杂
*
* */

//SpringCloud(微服务的技术栈)
 /*
 * SpringCloud是目前国内使用最广泛的微服务框架。官网地址:https://spring.io/projects/spring-cloud
 * SpringCloud集成了各种微服务功能组件并基于SpringBoot实现了这些组件的自动装配，从而提供了良好的开箱即用体验
 * 其中的组件有:SpringCloud Azure、SpringCloud Alibaba和SpringCloud for Amazon Web Services等
 * 1.SpringCloud Alibaba:是阿里云团队基于SpringCloud的开源项目，提供了一套完整的微服务解决方案，
 * 注意！！其实很多微服务组件在SpringCloud出现之前就有了，只是因为SpringCloud的出现可以让这些组件的使用更加方便，所以才被集成到SpringCloud中
 *
 * 只要引入
 *     <!--spring cloud-->
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            <!--spring cloud alibaba-->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>${spring-cloud-alibaba.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
SpringCloud alibaba和SpringCloud的依赖版本管理，所以之后引入它们的组件的依赖的时候就不用再写版本，只需要引入对应组件的坐标就行了
 * */

//进行单体项目拆分成微服务项目
/*
黑马商城主要可以分为:用户模块、商品模块、购物车模块、订单模块、支付模块
拆分原则:
问题一:什么时候做拆分?
1、创业型项目:先采用单体架构，快速试错，快速开发，随着规模扩大，逐渐拆分
2、确定的大型项目:资金充足、目标明确、可以直接选择微服务架构，避免后续拆分的麻烦
拆分目标:要做到高内聚、低耦合、
高内聚:每个微服务的职责要尽量单一，包含的业务相关度高，完整度高(比如:之后的修改代码时只在这个服务内完成，几乎不会影响其他微服务)
低耦合:每个微服务功能相对独立，尽量减少对其他为服务的依赖。

拆分方式:纵向拆分、横向拆分
纵向(垂直)拆分:将功能模块进行拆分，比如:用户模块、商品模块、购物车模块、订单模块、支付模块
横向拆分:抽取公共服务，提高服务的可复用性。比如:用户登录和下单时都需要使用风控和发送短信的服务，
所以可以抽取成一个公共服务，避免重复开发和维护，提高系统的可复用性和可维护性

使用纵向拆分:将五个模块拆分成五个独立的微服务项目，
分别是:用户服务、商品服务、购物车服务、订单服务、支付服务

微服务项目有两种结构:
独立project:每个微服务都是一个Peoject工程，都放在都一个文件夹中，物理意义上是被同一个文件夹管理，在项目层面是完全隔离的，每个服务都有自己的代码仓库，
优点:耦合度最低
缺点:开发和维护成本较高
应用场景:适合大型项目，团队规模较大，服务之间的依赖关系较复杂的情况
Maven聚合:所有微服务都在同一个Project工程中，每个服务是这个Project的一个Module模块，运行的是时候是分开运行的，分开打包的，只是代码在一个工程中
优点:开发成本较低，开发维护成本较低
缺点:耦合度较高
应用场景:适合小型项目，团队规模较小，服务之间的依赖关系较简单


*/
//拆分商品服务
 /*
 *将hm-service中与商品管理相关的功能拆分到一个微服务module中，命名为item-service
 *创建三层架构的包、创建启动类、定义配置文件
 注意!!!
 *要修改配置文件中的端口号，防止多个微服务端口号相同，导致启动失败
 * 端口:8081
 * 在配置中给服务应用起名称
 *  port: 8081
spring:
  application:
    name: item-service
 有效的运行环境依旧是dev
  profiles:
  * active: dev
 数据库配置:
 在真实的项目中肯定是为每个微服务单独创建一个微服务实例的，但是在本例中为了方便，将在同一个Mysql实例中创建多个数据库，分别对应不同的微服务
 只需要修改数据库的配置中的数据库名称即可
 *  datasource:
    url: jdbc:mysql://${hm.db.host}:3306/hm-item?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: ${hm.db.pw}
    *
 修改日志配置
 * logging:
  level:
    com.hmall: debug  // 日志级别，在com.hmall包下的所有类，打印debug级别日志
  pattern:
    dateformat: HH:mm:ss:SSS
  file:
    path: "logs/${spring.application.name}" // 日志文件保存路径，通过${spring.application.name}获取微服务名称，保证每个服务的日志文件名称不同

修改slf4j
* knife4j:
  enable: true
  openapi:
    title: 黑马商城接口文档
    description: "黑马商城商品管理接口文档" // 接口文档描述
    email: zhanghuyi@itcast.cn
    concat: 虎哥
    url: https://www.itcast.cn
    version: v1.0.0
    *     group:
      default:
        group-name: default
        api-rule: package
        api-rule-resources:
          - com.hmall.item.controller //Swagger 扫描的包下的Controller接口信息，需要改成自己的包路径
 最后和用户登录加密相关的商品管理用不上，所以删除
 * hm:
  jwt:
    location: classpath:hmall.jks
    alias: hmall
    password: hmall123
    tokenTTL: 30m
  auth:
    excludePaths:
      - /search/**
      - /users/login
      - /items/**
      - /hi
      *
注意！！！
* Maven聚合，同一个父项目下的两个模块，只要一个模块通过引入另一个模块的依赖，那么这个模块中的代码就可以访问被引入的模块中的代码了，
* 所以在item-service中引入了hm-common的依赖，那么item-service中的代码就可以访问hm-common中的代码了
* 引入与商品管理相关的实体类，Mapper接口，Controller，Service，ServiceImpl等代码
*
* 全部引入之后，重新加载Maven项目， alt+8。就能看到启动类了，和之前一样先编辑启动类配置，修改有效的配置文件为local，然后就可以运行了
* 启动成功之后，访问http://localhost:8081/doc.html查看Swagger文档
 * */

//拆分购物车服务
/*
* 将hm-service中与购物车相关的功能拆分到一个微服务module中，命名为cart-service
*与上述过程一致
* 要注意！！！
* 因为进入购物车页面时需要查询商品的最新价格，和库存信息，所以需要用到商品管理的ItemService接口，
* 此时就需要用到远程调用的方法
* 又因为还需查询当前用户的购物车就需要，获得当前用户的ID
*   // 1.查询我的购物车列表
        List<Cart> carts = lambdaQuery().eq(Cart::getUserId, UserContext.getUser()).list();
        //这里需要用到登录拦截器的，此时也还没引入，先使用默认值1L
        if (CollUtils.isEmpty(carts)) {
            return CollUtils.emptyList();
        }
全部引入之后，重新加载Maven项目
 alt+8，编辑运行配置，修改有效的配置文件为local，然后就可以运行了
* 启动成功之后，访问http://localhost:8082/doc.html查看Swagger文档
* */

//远程调用
/*
* 使用的网络访问，像前端访问后端接口一样，微服务之间也可以通过HTTP协议进行通信，这种方式称为远程调用
* 远程调用的方式有很多种，常见的有:RestTemplate、Feign、Dubbo等
* RestTemplate:是Spring提供的一个用于发送HTTP请求的工具类，可以方便地进行远程调用，支持多种HTTP方法，如GET、POST、PUT、DELETE等
* Feign:是Netflix开源的一个声明式HTTP客户端，可以通过接口和注解来定义远程调用，简化了远程调用的代码，提供了负载均衡和容错机制
* Dubbo:是阿里巴巴开源的一个高性能RPC框架，支持多种协议和序列化方式，提供了服务注册和发现、负载均衡、容错等功能，适合大规模分布式系统中的远程调用
*
* 这里使用Spring提供的RestTemplate进行远程调用
* 注入RestTemplate到Spring容器中
* @Bean //以下代码直接写在启动中
  public RestTemplate restTemplate() {
    return new RestTemplate();
  }
发起远程调用
* public <T> ResponseEntity<T> exchange{ //RestTemplate提供了exchange方法，用于发起远程调用
*  String url, //请求路径
*  HttpMethod method, // 请求方法
* @Nullable HttpEntity<?> requestEntity, // 请求体
*  Class<T> responseType,
* // 返回值类型，可以直接写Java类型例如:User.class，RestTemplate会自动将返回值JSON格式转换为对应的Java类型
*  Map<String, ?> uriVariables // url参数
* }
* 也可以直接用RestTemplate.getForObject()方法就是发起GET请求的简化方法，其他HTTP方法也有对应的简化方法
* 使用这个就能发起远程调用了，访问其他模块的接口了
*
* 注意！！！！
* 不建议用字段注入
* @Autowired
    private RestTemplate restTemplate;
 * 推荐使用构造函数注入
 * private final RestTemplate restTemplate;
 *
 * public CartServiceImpl(RestTemplate restTemplate) {
 * this.restTemplate = restTemplate;
 * }
 *
 * 但是如果成员变量很多，那么构造函数的参数列表会很长，很麻烦
 * 可以使用Lombok提供的@AllArgsConstructor注解，自动生成构造函
 * 但是这样的话所有定义在成员位置的变量都会被加入到构造函数中，我们只需要部分成员变量作为构造函数的参数。
 * 所以可以使用@RequiredArgsConstructor注解，自动生成构造函数，但是这个注解只能用于有final修饰的且未被初始化的成员变量
 * 不想加入的变量就不加上final修饰符，或者直接初始化。
 *
 *   //远程调用商品服务, 获得响应
 *  Set<Long> itemIds = vos.stream().map(CartVO::getItemId).collect(Collectors.toSet());
        ResponseEntity<List<ItemDTO>> RPS = restTemplate.exchange(
                "http://localhost:8081/items?ids={ids}", //因为有多个id直接写太长了，所以用{ids}占位符，后面用Map传入参数
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<List<ItemDTO>>() {},
                Map.of("ids", CollUtil.join(itemIds, ","))
               // 将itemIds转换为字符串，用逗号分隔，Map.of()用占位符作为key，value作为替换的内容，就能形成ids=1,2,3,4,5,6这样的参数，传入到URL中
        );
        //解析响应
        if (!RPS.getStatusCode().is2xxSuccessful()) {
            return;
        }
 *
 * 注意！！RestTemplate发起远程调用是有问题的
* */

//服务治理:服务远程调用存在的问题
/*
   问题一:但是刚开始创建的时候并知道创建的模块的地址，不知道访问哪个。
   问题二:如果有多个商品管理模块，那么访问哪个呢？
   问题三:访问的商品管理模块如果出故障了，但是代码写死了就访问这个模块，就会导致报错
   问题四:如果运行过程中，有新的商品管理模块启动了，怎么是到新的商品管理模块的地址呢？
总的就是说:无法感知到服务状态的变更
因为服务模块想要调用其他服务的接口，但是服务的提供者不知道服务调用者的地址
就可以通过注册中心来解决这个问题，

注册中心原理:
服务提供者在启动的时候将自己的地址注册到注册中心中，服务调用者需要调用其他服务的接口时，必须订阅注册中心中的该服务信息，获取服务提供者的地址，然后再进行远程调用
因为一个服务既可以是服务的提供者也可以是服务的调用者
所以所有服务都需要去注册中心注册服务的信息，注册中心会保存所有服务的信息
例如:多个商品管理模块都注册服务信息到注册中心中
item-service:
 localhost:8081
 localhost:8082
 localhost:8083
 需要调用该服务的模块，需要订阅注册中心中这个item-service服务的信息,
 但是有多个可以提供服务的模块，该选择哪一个呢?
 使用类似Nginx的负载均衡算法:轮询、随机、权重轮询/随机、最少连接数、最小响应时间等算法,来选择一个服务提供者的地址进行远程调用

 为了知道服务的健康状态，在注册中心注册的服务需要和注册中心之间进行心跳检测，
 服务定期向注册中心发送请求，当超过定期时间注册中心没有收到服务的请求，注册中心则认为服务已经故障了，将服务从注册中心中删除
 并将变更信息推送给订阅了该服务的模块，防止继续调用已经故障的服务
 这样就能实现服务状态的感知了

* */

注意！！！！
父工程的SpringBoot版本和SpringCloud版本要匹配，否则会导致服务注册失败
Spring Boot	Spring Cloud 版本
3.2.x	2023.0.x (也叫 Spring Cloud 2023.0.0)
3.0.x - 3.1.x	2022.0.x
2.6.x - 2.7.x	2021.0.x
//服务治理:注册中心Nacos
/*
* Nacos:是目前国内企业中占比最多的注册中心组件，是阿里巴巴的产品，目前已经加入SpringCloudAlibaba中
*部署Nacos:
* 需要先创建一个数据库，并导入nacos的sql文件，作为Nacos的注册中心数据库
* 需要编写Nacos的环境配置文件，指定数据库的连接信息
PREFER_HOST_MODE=hostname
MODE=standalone
SPRING_DATASOURCE_PLATFORM=mysql
MYSQL_SERVICE_HOST=192.168.100.128
MYSQL_SERVICE_DB_NAME=nacos
MYSQL_SERVICE_PORT=3306
MYSQL_SERVICE_USER=root
MYSQL_SERVICE_PASSWORD=123456
MYSQL_SERVICE_DB_PARAM=characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Shanghai
然后用命令创建并启动Nacos容器，和构建Nacos的镜像
docker run -d \
--name nacos \
--env-file ./nacos/custom.env \   //读取环境配置文件 .表示当前目录下的custom.env文件
-p 8848:8848 \    //Nacos需要3个端口，分别对应http、nacos和healthz
-p 9848:9848 \
-p 9849:9849 \
--restart=always \ //--restart=always 告诉 Docker：无论容器因什么原因停止（崩溃、退出、系统重启），都自动重新启动它。
nacos/nacos-server:v2.1.0-slim
*
启动后，访问:http://192.168.100.128:8848/nacos/
* 首次访问是账号和密码都是nacos
* 里面可以看到注册服务信息列表和订阅服务信息列表
*之后微服务想要注册信息到注册中心或者订阅服务信息，都需要通过8848端口进行访问
*
* */
注意！！！要是遇到nacos连不上的情况，就重启虚拟机和nacos容器
docker run -d \
--name nacos \
--env-file ./nacos/custom.env \
-p 8848:8848 \
-p 9848:9848 \
-p 9849:9849 \
--restart=always \
--network WWJ \
nacos/nacos-server:v2.1.0-slim
还有就是要配置Mysql
Nacos 找不到数据库连接配置。Nacos 2.x 默认需要 MySQL 来存储配置数据。否则无法登录
//实现服务注册
/*
* 步骤:
* 1、引入nacos dicovery依赖
<dependency>
<groupId>com.alibaba.cloud</groupId>
<artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
* 2、配置Nacos的地址和端口号，注册中心需要知道服务提供者的名称、Ip地址和端口号(ip就是主机的地址，不要自己写，端口号配置文件里写了)，才能将服务提供者注册到注册中心中
* spring:
   application:
     name: item-service  #微服务端口名称，注册到注册中心中的服务名称
   cloud:
    nacos:
     server-addr: 192.168.100.128:8848 #Nacos的注册中心地址
再次运行就会看到服务已经注册到注册中心中了

实现服务的多实例注册
1、可以使用Docker容器的启动多个服务实例，并指定不同的端口，
2、在Idea中创建多个启动类，并指定不同的端口
*
* */

//实现服务发现
/*
* 服务调用者，需要连接nacos以拉取和订阅服务，因此服务发现的前两步和服务注册是一样(给服务调用者加上依赖和配置文件)，后面再加上服务调用即可
* 使用Api获取服务信息
* 例如:在购物车服务中需要调用商品管理服务的接口，那么就需要先通过服务发现获取到商品管理服务的地址，然后再进行远程调用、
* private final DiscoveryClient discoveryClient;
*
private void handleCartItems(List<CartVO> vos) {
* //根据服务名称，拉去服务的实例信息
* List<ServiceInstance> instances = discoveryClient.getInstances("item-service");  //根据服务名称获取服务实例列表信息
* //负载均衡，挑选一个实例
* ServiceInstance instance = instances.get(RandomUtil.randomInt(instances.size()));//随机负载均衡算法，随机挑选一个实例
* //获取实例的ip和端口
* URI uri=instance.geturi(); //获取实例的uri之后再进行远程调用
*
* …………
* }
*测试:
*1、多次发送请求购物车的列表，可以发现多个服务实例都被访问到了，说明服务发现和负载均衡都生效了
*2、当一个服务停止了时，服务调用依然可以继续访问，因为服务调用者会定时向注册中心进行服务状态的检测
* 注册中心就会将服务从注册中心中删除。
*3、解决了之前的感知不到服务状态的变更问题，也不用写死服务的地址了，服务调用者会自动感知到服务状态的变更了
* */
