//OpenFeign
/*
* 之前的使用Nacos实现获取服务信息很麻烦，要获取服务信息，要自己进行负载均衡，再对获取的服务进行解析，比单体架构时还麻烦
* 为此就有了OpenFeign。
* OpenFeign:是一个声明式的HTTP客户端，是SpringCloud在Eureka公司开源的Feign的基础上改造而来的，
* 官方地址:https://github.com/OpenFeign/feign
* 作用是:简化HTTP请求远程调用的过程
* OpenFeign已经被SpringCloud自动装配了，实现起来非常容易
* 1、引入依赖
OpenFeign依赖
<dependency>
<groupId>org.springframework.cloud</groupId>
<artifactId>spring-cloud-starter-openfeign</artifactId>
* </dependency>
负载均衡依赖
<dependency>
<groupId>org.springframework.cloud</groupId>
<artifactId>spring-cloud-starter-loadbalancer</artifactId>  //loadbalancer是最新版的负载均衡器，老版本还是用的Ribbon
</dependency>
* 注意！！
* 这两个依赖是让服务调用者引入的

2、通过在启动类上添加@EnableFeignClients注解，开启OpenFeign功能
*
3、编写FeignClient客户端,用于替换之前的获取服务信息和远程调用的代码
* @FeignClient("item-service")  //服务名称
* public interface ItemClient {
* //因为引入了负载均衡的依赖，因此这里拿到服务列表之后，不需要自己手动进行负载均衡了
*  @GetMapping("/items") //声明远程调用的请求路径和请求方式，这里使用SpringMvc的注解来声明远程调用的接口信息
*  List<ItemDTO> queryItemByIds(@RequestParam("ids") Collection<Long> ids); //请求参数类型和名称，以及返回值类型
* 注意！！！
* 由于响应的是JSON格式，OpenFeign会通过反射知道需要的返回值类型，再把Json转换成对应的对象返回给调用者
* 注意！！！
* 这个接口不用我们实现，OpenFeign会通过动态代理实现这个接口。实现后的代码逻辑，就是之前的获取服务信息和远程调用的代码了。
* 就像我们也不用实现mapper接口一样，MyBatis会通过动态代理实现这个接口一样的道理，OpenFeign也会通过动态代理实现这个接口
* }

4、使用FeignClient，实现远程调用
List<ItemDTO> items = itemClient.queryItemByIds(List.of(1、2、3));//调用接口的方法，传递请求参数
*
*List<ItemDTO> items = itemClient.queryItemByIds(itemIds);//一行代码完成了获取服务实例和负载均衡，分析服务、远程调用，的全部过程
* 爆炸！！！！
* 而且只要是和同一个服务所有相关的方法都可以放在同一个接口里面，以后要用的时候，直接调用这个接口方法即可
*例如:
* @FeignClient("item-service")
public interface ItemClient {
    @GetMapping("/items")
    List<ItemDTO> queryItemByIds(@RequestParam("ids") Collection<Long> ids);
    @PostMapping("/items/decreaseStock")
    ……………………
    @DeleteMapping("/items/decreaseStock")
    ……………………
}
*
* */

//OpenFign底层的实现原理
//连接池
/*
*进行Dbug调试会发现，是用过代理对象去调用接口方法的，而代理对象的底层都是通过InvocationHandler接口的invoke方法来实现的，
* 这里是通过实现InvocationHandler接口的实现类，FeignInvocationHandler的invoke方法来实现的。
* 会发现底层是通过使用Client发送请求的，但是每次都要创建和销毁Client对象，不断的创建和销毁Client对象，效率很低
* 为了提升效率，就需要使用连接池
* 它的层默认实现Client使用的HttpConnection，不支持连接池
* 可以使用ApacheHttpClient/OKHttp实现Client，支持连接池
* 步骤:
* 1、引入feign-okhttp依赖或者feign-httpclient依赖
 <dependency>
<groupId>io.github.openfeign</groupId>
<artifactId>feign-okhttp</artifactId>
 </dependency>
2、开启连接池功能 在配置文件中添加如下配置
    feign:
      okhttp:
        enable: true
这些是对服务调用者的配置
*
*
* */

//最佳实践
/*
* 因为每个多个不同的服务调用者可能会调用同一个服务的同一个接口，我们之前那种在每个调用服务调用者中写一个OpenFeign的接口的方式，导致代码就会重复很多
* 而且每个都写的话，以后如果被调用的服务的接口发生了变化，那么每个调用服务调用者中的接口都要修改一遍，维护起来非常麻烦
* 优化方案:
* 方案一:
* 将OpenFeign的接口单独放在被调用服务模块中，把被调用服务模块变为一个纯pom模块，只负责提供接口
* 在给这个模块创建三个子模块，分别用于存放OpenFeign接口、实体类和业务逻辑，
* 服务调用模块只需要引入实体类和OpenFeign接口的子模块的坐标就可以了
* 缺陷:实现变得复杂了，每个微服务模块又要分成多个子模块很是麻烦，但是这是最合理的，也是企业推荐的做法
* 方案二:
* 创建一个公共模块，将OpenFeign的接口放在这个公共模块中，服务调用模块引入这个模块的坐标，然后就可以直接使用OpenFeign的接口了
* 这个模块中还可以存放一些公共的工具类，公共的实体类等
* 缺陷:所有模块的接口都放在一个模块中，导致这个模块的代码量很大，维护起来比较麻烦，而且这个模块的依赖也会比较多，耦合度比较高
*
* 怎么选择:
* 如果微服务创建时，使用的是Project结构，每个微服务模块都是一个project，所有项目放在一个文件夹中
* 那么，我们就应该使用方案一:一个项目中分三个模块很合理不会很麻烦。
* 如果微服务创建时，使用Module结构，每个微服务模块都是单独的module，
* 那么，我们就应该使用方案二:创建一个公共模块。
*
* 这里因为使用Maven高聚合结构，所以我们使用方案二:创建一个公共模块，来存放OpenFeign的接口和实体类
* 需要用到的服务直接引入这个模块的坐标，就可以直接使用OpenFeign的接口和实体类了
*
* 问题是:这样写的话，OpenFeign接口需要被启动类扫描到才能生效，但是接口并没有放在扫描的包中，而是放在公共模块中
* 导致服务调用者无法扫描到接口，从而无法生效接口方法。
* 解决方法:
*方法一:
* 在开启OpenFeign功能的注解@EnableFeignClients中，添加basePackages属性，指定要扫描的包
* 例如:
  @EnableFeignClients(basePackages = "com.WWJ.SpringCloud_Project2.client")
*方法二:
* 在@EnableFeignClients注解中指定FeignClient的字节码
* 例如:
* @EnableFeignClients(clients = {ItemClient.class})
* */

//OpenFeign的日志输出
/*
*OpenFeign只有日志级别为DEBUG时，才会输出日志，而且其日志级别分为4级
* 1、none: 不输出日志，这是默认值
* 2、basic: 只输出请求方法和URL，以及响应状态码和执行时间
* 3、headers: 除了basic级别的信息外，还会输出请求和响应的头信息
* 4、full: 记录所有请求和响应的明细、包括头信息、请求体、元数据

* 步骤:
*
* 一：定义日志级别需要声明一个类型为Logger.Level(枚举类)的Bean，在其中定义日志级别
* public class DefaultFeignConfig{
* @Bean
* public Logger.Level feignLoggerLevel(){ //这个logger.level类，是导import feign.Logger;
* return Logger.Level.FULL; //设置日志级别为full
* }
* }
*这个配置类写在公共模块中，因为这个配置类是所有服务调用者都需要的，所以放在公共模块中
*
*二:此时Bean未生效、想要配置某个FignClient的日志级别，那么可以在@FeignClient注解中声明
* @FeignClient(value = "item-service",configuration = DefaultFeignConfig.class)
* 但是在接口上的这个注解写的话，就只能配置这个接口的日志级别，其他的接口又要重新写
* 所以使用全局配置
* @EnableFeignClients(defaultConfiguration = DefaultFeignConfig.class)//日志配置类

*建议:在进行Debug调试的时候在开启日志，平时不开启日志
* */

//作业
/*
* 完成其他三个服务的拆分
* 还需要，让这三个服务都知道当前登录用户是谁，，先把登录用户写死
*
* */