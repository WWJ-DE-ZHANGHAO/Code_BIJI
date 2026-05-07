//微服务保护
//雪崩问题
/*
* 微服务调用链路中某个服务故障，引起整个链路中的所有微服务都不可用，这就是雪崩。
* 比如:服务A调用服务B，服务B调用服务C，服务C调用服务D，服务D调用服务E，服务E调用服务F。当服务F故障(需要很久才能响应数据，导致很多请求都被阻塞在服务F)，
* 因为高并发的情况下许多发给服务F的请求都被阻塞在服务F，服务E的Tomcat缓存就会溢出，其他的即使不是发送给服务F的请求，也会因为服务ETomcat内存不足而被拒绝，
* 且因为服务E，而服务D又因为所有发送给E的请求都被拒绝，所以服务D也会因为请求阻塞而内存不足，服务C、B、A同样会因为请求被阻塞而内存不足，
* 最终导致服务E、D、C、B、A都无法访问，从而导致整个链路不可用。

*
* 解决方案:保护服务的提供者避免出现故障、服务调用者发现故障要及时隔离避免故障扩散
*
* 服务保护方案一:请求限流
* 请求限流:限制访问微服务的请求的并发量，避免服务因流量激增出现故障
* 使用限流器:将大量请求限制在某个阈值内，当请求数超过阈值时，超出的其余请求需要等待，从而避免服务因流量激增出现故障。
*
* 服务保护方案二:线程隔离
* 线程隔离:也叫做舱壁模式、模拟船舱隔板的防水原理，通过限定每个业务能使用的线程数量，而将故障业务隔离，避免故障扩散
* 比如:
* 业务一需要服务A调用服务B，业务一限定最多使用10条线程，如果服务B故障了，业务一的线程会阻塞，一条阻塞，当有新的请求来的时候开启一个新线程到这也被阻塞
* ，当线程数超过10时，业务一就不会在被分配新的线程，从而避免故障导致Tomcat内存不足，保证其他正常服务可以继续运行。
*缺陷:明明知道服务B故障了，还是会来四个线程来访问服务B，虽然不会分配新的线程了，但是这四个线程还是会被阻塞在服务B上，导致资源浪费
*
* 服务保护方案三:服务熔断
* 服务熔断:由断路器统计请求的异常比例，或慢调用比例，如果超出阈值则会熔断该业务，则拦截该接口的请求。
* 比如:
* 业务一需要服务A调用服务B，
* 业务一的断路器统计请求服务B的异常比例，如果超过50%，则会熔断该业务，或者(慢调用)响应超时的比例，如果超过50%，则会熔断该业务，
* 则拦截该接口的请求，不再访问服务B，而是所有请求快速失败，全部走fallback逻辑(备选方案写在服务A中)，假如服务B是查询商品信息并返回，如果服务B故障了，
* 服务A的fallback逻辑可以返回一个默认的商品信息，如果服务B没有返回值，fallback逻辑可以返回一个友好的提示给前端
* ，从而避免服务出错了还一直有请求访问服务B，导致资源浪费，保证其他正常服务可以继续运行。
*
* */



//技术实现:通过SpringCloud Alibaba的组件Sentinel，和SpringCloud Netflix的组件Hystrix来实现服务保护和分布式事务
 /*
 * Sentinel和Hystrix的区别:
 * 1.Sentinel的线程隔离是通过信号量隔离来实现的，而Hystrix的线程隔离是通过线程池隔离/信号量来实现的。
 * 2.Sentinel的熔断是通过慢调比例/异常比例来判断，而Hystrix的熔断是通过异常比例来判断。
 * 3、Sentinel的限流是通过QPS/流量整型来判断，而Hystrix的限流是通过有限的支持
 * 国内用的大多是Sentinel
 *
 *
 * Sentinel:
 * Sentinel是阿里巴巴开源的一款微服务流量控制组件
 * 官网: https://sentinelguard.io/zh-cn/docs/overview.html
 * Sentinel的内部提供好了一个核心库(jar)，就是一个Sentinel的客户端里面包括了熔断、限流、流量控制、线程隔离等功能
 * 微服务只需要引入这个jar核心库就行了。就可以使用这些功能了。
 * 只需要配置流量控制、线程隔离、熔断的规则就行了。
 * 规则配置有两种方式:
 * 1、java编码实现配置:使用各种API很麻烦？
 * 2、使用Sentinel提供的控制台(Sentinel-dashboard):
 * 只要微服务引入了Sentinel的jar核心库，并且配置好了Sentinel-dashboard的地址，微服务内部的Sentinel客户端就会和Sentinel-dashboard产生交互
 * Sentinel-dashboard就可以监控微服务内部的接口的运行情况(限流、熔断、线程隔离)
 * 在控制台中还可以利用页面，实现对于限流，熔断，线程隔离的规则的配置，配置完之后就会实时的推送到微服务。
 *
 * 实现第二种配置方式:
 * 1、安装Sentinel-dashboard
 * 下载jar包之后，通过java-jar的命令运行就行了，因为需要很多配置项所以代码很长，端口号、地址、项目名称等都需要配置好
 * 命令:
 * java -Dserver.port=8090 -Dcsp.sentinel.dashboard.server=localhost:8090 -Dproject.name=sentinel-dashboard -jar sentinel-dashboard-1.8.6.jar
 * 登录地址: http://localhost:8090
 * 默认账号密码: sentinel/sentinel
 * 注意！！
 * 在安装目录下执行cmd命令
 * 2、在微服务中引入Sentinel的jar核心库，并且配置好Sentinel-dashboard的地址
 * 微服务整合，
 * 在pom.xml中引入Sentinel的jar核心库
  <dependency>
 <groupId>com.alibaba.cloud</groupId>
 <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
  </dependency>
在application.yml中配置Sentinel-dashboard的url
*spring:
*   cloud:
*    sentinel:
*     transport:
*       dashboard: http://localhost:8090
*重启微服务，然后请求微服务的接口，sentinel的客户端就会将服务访问的信息提交到sentinel-dashboard控制台。并展示出统计信息：
* Sentinel Dashboard会显示微服务的名称。点击可查看各个统计信息
* 其中的簇点链路:就是单机调用链路，是第一次请求进入微服务后经过的每一个被Sentinel监控的资源链，默认Sentinel会监控SpringMvc的每一个Endpoint(http接口)
* 。限流、熔断等都是针对簇点链路中的资源设置的，而资源名默认就是接口的请求路径
* 比如:
* 查询购物车请求只，簇点链路中只会有一个/cart的接口，控制台中可以通过点击簇点链路页面中的按钮来给/cart接口设置限流、熔断等规则
* 但是Restful风格种请求路径名称一般是可以一样的，比如添加商品到购物车和修购物车的请求路径名称都是/carts只是请求方式不一样。
* 这会导致无法精确的为某个接口设置限流、熔断等规则。
* 因此需要修改配置，把请求方式+请求路径作为簇点资源名称
*spring:
*   cloud:
*    sentinel:
*     transport:
*       dashboard: http://localhost:8090
*     http-method-specify: true #开启请求方式前缀，默认是关闭的
* 此时簇点链路和实时监控等都会用请求方式分开了
PUT:/carts、POST:/carts、GET:/carts、DELETE:/carts/{id}
*
 * */

//实现请求限流
/*
*进入Sentinel的控制台，点击簇点链路，在页面中可以看到各个簇点链路资源，点击资源右侧的按钮可以控制对该资源的规则
* 填写限流规则:
* 选择阈值类型可选QPS(限制每秒钟请求的数量)或并发线程数 ，在右侧的单机阈值就可以填写对应的限制数量
* 选择集群模式(集群模式下，QPS阈值会自动分配给各个实例)
* 最后点击新增一个流控规则就写好了。
* 新增后会在左侧的流控规则菜单栏的页面出现你刚刚添加的流控规则
* 假设你添加了如下的流控规则:
* 阈值类型:QPS，阈值:6
* 每秒只能处理6个请求
*
* 测试:用Jmeter进行压测，10秒内请求1000次，查看是否被限流。
* 在Sentinel 控制台的流控规则页面，会发现通过的QPS是6，拒绝的QPS是4
*注意！！！
*这些QPS数据在控制台有过期时间保存，过了过期时间就会丢失
* */

//实现线程隔离
/*
* 线程隔离为5是指，某个接口最多只能同时被5个线程访问，如果同时的并发请求有6个，那么多出的那个请求需要等待
* 直到前面有一个请求结束后，才能腾出一个线程来处理这个请求。
* 假设一个接口它处理请求的时间为0.5秒。则一个线程每秒最多可以处理两个请求，那么一个线程的QPS为2，有5个线程则该接口的QPS就为10
* 进入Sentinel控制台，进入簇点页面，也是点击指定资源的控流按钮，
* 这次选的阈值类型是并发线程数(表示限制该资源的并发线程数)，阈值为5
* 如果响应码为429
* 429表示请求被限流或者被降级了
*
* */

//fallback
/*
*使用线程隔离，如果线程数超过阈值，会报错，用户看到的都是错误信息，体验不是很好
* 所以要使用熔断并使用fallback
* 但是不能对整个carts接口做熔断，
* 比如:查询购物车时需要查询远程调用商品服务进行查询商品，给查询购物车中查商品的逻辑添加一个fallback逻辑
* 如果商品服务出问题了，此时查询购物车的请求会被拒绝，被拒绝的请求会去执行fallbakc逻辑，将默认数据或友好提示返回给前端
* 不建议对整个查询购物车的逻辑做线程隔离，只对查询购物车中查询商品的逻辑做流控或线程隔离。
* 想要将查询购物车中查询商品的逻辑做线程隔离，就要把远程调用(FeignClient)作为Sentinel控制台中的一个簇点链路资源
* 此时就需要在调用发起者中配置
*   feign:
*     sentinel:
*        enabled:true
* FeignClient中有两种方式配置Fallback
* 方式一:FallbackClass,无法对远程调用的异常做处理
* 方式二:FallbackFactory,可以对远程调用的异常做处理，通常都会选择这种
*
* 定义一个实现FallbackFactory<T>的类，重写该接口的方法，返回值为FeignClent的接口
* public class ItemClientFallback implements FallbackFactory<ItemClient> {
    @Override
    public ItemClient create(Throwable cause) {//当请求出现异常或限流时才会执行这个方法
        return new ItemClient() { // 匿名内部类 实现ItemClient接口的方法
            @Override
            public List<ItemDTO> queryItemByIds(Collection<Long> ids) {
                log.error("远程调用ItemClient#queryItemByIds方法出现异常，参数：{}", ids, cause);
                // 查询购物车允许失败，查询失败，返回空集合
                return CollUtils.emptyList();
            }

            @Override
            public void deductStock(List<OrderDetailDTO> items) {
                // 库存扣减业务需要触发事务回滚，查询失败，抛出异常
                throw new BizIllegalException(cause);
            }
        };
    }
}
* 想要这个类生效，还需要在配置类中使用@Bean将ItemClientFallback交给Spring容器管理
* @Bean
* public ItemClientFallback itemClientFallback() {
*  return new ItemClientFallback();
* }
* 在FeignClent接口中使用，在接口上添加注解
* @FeignClient(value = "item-service", fallbackFactory = ItemClientFallback.class)
* 就可以生效了，当访问item-service服务时，如果访问失败，就会调用ItemClientFallback类中的方法
*
*
* 此时查看Sentinel控制台会发现，在簇点链路中出现了FeignClient的调用，并且出现了
*
* 此时就算有异常或请求被拒绝。
* 也会调用fallbackFactory指定的方法，返回fallbackFactory指定的方法返回值，所以前端一直都会有数据，不会在前端抛异常
* 切回快速给前端响应数据，避免前端一直等待
* */

//服务熔断
/*
*之前的线程会造成浪费，为此只要发现服务异常，就会自动熔断，将请求拒绝直接去执行fallback方法，但也不能一直断开，当服务恢复正常了，需要取消熔断
* 由这个有断路器来监控，当服务异常的时候，会自动熔断，当服务恢复的时候，会自动取消熔断
* 断路器内部定义了三个状态，1. 未熔断(closed) 2. 半熔断(half-Open) 3. 熔断(Open)
* 注意！！！异常比例和慢请求比例可以自己配置。
* 断路器的执行流程:
* 在请求的异常比例未达到阈值之前，断路器处于未熔断状态，将请求放行，并监控请求的异常比例，当达到阈值之后，
* 断路器会自动熔断，进入熔断状态，会拦截所有请求，直接快速失败，让其去执行fallback方法，熔断状态并不是永久的是可以设置过期时间的
* 当熔断状态到过期时间之后，会自动进入半熔断状态，此时会放行一次请求给服务，监控这次请求，
* 如果依然是失败的，则回到熔断状态，刷新过期时间
* 如果这次请求成功，则回到未熔断状态。
*
* 在Sentinel的控制台中，打开簇点链路，点击指定簇点链路的右侧的熔断按钮，进行设置熔断规则
* 设置熔断策略:选择慢调用比例还是异常比例，还是异常数作为熔断标准
* 如果选择慢调用比例，则设置慢调用rt阈值(响应时间的标准)，和最大允许的慢调用比例(熔断的阈值)
* 如果选择异常比例，则设置最大允许的异常比例(熔断的阈值)
* 如果选择异常数，则设置最大允许的异常数(熔断的阈值)
*
* 设置熔断时长(熔断状态的持续时间)
* 最小请求数(熔断器统计信息的最小请求数，多次请求中的异常比例)
* 统计时长(熔断器统计信息的时长，这段时间内的请求异常的比例)

可以设置多个熔断规则的
* */

