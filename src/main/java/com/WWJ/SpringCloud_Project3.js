//网关
/*
* 因为已经将项目拆分成了多个微服务了，每个微服务都有自己端口，
* 单体架构的收前端只需要访问一个端口即可，而现在有多个端口了，而且端口可能变化，前端此时不知道该访问哪个地址?
* 单体项目只需要一次登录校验就能访问所有的功能，现在把功能拆分成了多个微服务模块了，如果每个模块都需要登录校验拿到用户信息，不得给每个模块都写一套登录校验的代码吗?
*
* 此时就需要网关了，
* 网关:就是网络的关口，负责请求路由(判断请求由哪个服务接受处理)、转发、身份校验
* 网关作用就是统一处理用户请求，并把用户请求转发给对应的微服务模块。
* 把网关的端口配置在8080端口，因为配置的Nginx是将前端的请求反向代理到8080端口的，这个请求就会被网关接收处理，
* 就会自动进行用户身份的登录校验，然后判断这个请求该由哪个微服务模块处理，再转发给对应的微服务模块了,前端就不需要去访问各个微服务模块的端口了
* 注意！！
* 网关也是微服务，启动之后也会去注册中心拉取服务地址，如果微服务模块有多个实例的话，网关会自动负载均衡，选择一个实例进行转发
* SpringCloud中提供了两种网关组件:
* SpringCloud Gateway:Spring官方出品，基于WebFlux响应式编程的网关，无需调优即可获得优异性能，推荐使用
* Netfilx Zuul:Netflix出品，基于Servlet阻塞式编程的网关，需要调优才能获得与SpringCloudGateway性能一致的表现
*
*
*步骤:
* 1.创建一个新的微服务模块，命名为SpringCloud_Gateway
* 2.引入SpringCloudGateway的依赖
* 3、编写启动类
* 4、在配置文件中配置路由规则
*
* 路由规则:
* spring:
*   cloud:
*    gateway:
*      routes:  #表示可以配置多条路由规则
*       - id: user_route #路由规则id，唯一标识
*         uri:  lb://item-service  #路由转发的地址，lb表示负载均衡，后面跟服务名称，表示转发到哪个服务
*        predicates:  #路由断言，判断请求是否满足这个路由规则，符合则转发到uri指定的地址，可以有多个匹配条件规则，因为一个服务下可能会有多个Controller
*         - Path=/item/** #表示请求路径以/user/开头的请求都满足这个路由规则，
*         例如http://localhost:8080/item/1ist就满足这个路由规则，会被转发到lb://item-service指定的服务地址
*         多个路由规则之间用逗号隔开例如:- Path=/items/**,/search/** # 这里是以请求路径作为判断规则
*
*      - id: item_route #第二个路由规则
*         uri: lb://xxx-service
*        predicates:
*        - Path=/item/**
*
*
*
* */

//路由属性
/*
* 网关路由对应的java类型是RouteDefinition，其中常见的属性有
* id:路由唯一标识
* uri:路由目标地址
* predicates:路由断言。判断请求是否符合当前路由
* filters:路由过滤器，对请求或响应做特殊处理。用于对进入网关的请求进行一些预处理和对响应进行一些后处理
*
* 路由断言(predicates):
* 1、After :某个时间点后的请求、2、Before :某个时间点前的请求、3、Between :某两个个时间点区间的请求、
* 4、Cookie :请求必须包含某些cookie、5、Header :请求必须包含某些header、6、Host :请求必须包含某个域名、7、Method :请求方式匹配的请求、
* 8、Path :路径匹配的请求、9、Query :Query参数匹配的请求、10、RemoteAddr :IP匹配的请求、11、Weight :权重的
*
* 在spring官网可以查看具体的路由断言实例
*
* 路由过滤器(filters):
* 1、AddRequestParameter :给当前请求添加一个请求头、例如:AddRequestParameter=headerName,headerValue(请求头和值是一对的键值对)
* 2、AddResponseHeader :给响应结果中添加响应头
*  3、RemoveRequestHeader :移除请求中的一个请求头、 例如:RemoveRequestHeader=headerName
* 4、RemoveResponseHeader :从响应结果中移除一个响应头、
* 5、RewritePath :重写请求路径、
* 6、StripPrefix :去掉请求路径中的N段前缀 例如:StripPrefix=1 表示去掉请求路径中的第一个前缀，
* 例如:http://localhost:8080/item/1/list处理后为http://localhost:8080/1/list
* 作用是:比如有些请求会加一个/api/，但是微服务中的接口是没有/api/的，此时就可以使用StripPrefix过滤器去掉/api/，如果直接转发给后端，会找不到。
*
* 例如:
*       routes:
        - id: item # 路由规则id，自定义，唯一
          uri: lb://item-service # 路由的目标服务，lb代表负载均衡，会从注册中心拉取服务列表
          predicates: # 路由断言，判断当前请求是否符合当前规则，符合则路由到目标服务
            - Path=/items/**,/search/** # 这里是以请求路径作为判断规则
          filters: # 路由过滤器，对请求进行拦截，比如添加请求头，修改请求参数
            - AddRequestHeader=truth, anyone long_press like button will be rich # 添加请求头
            *
 检验请求头是否存在，可以在控制层使用@RequestHeader注解进行校验，注意！！添加required = false非必填项
*  public PageDTO<ItemDTO> queryItemByPage(PageQuery query,@RequestHeader(value="truth", required = false) String truth) {
*           system.out.println("turth",truth);
        // 1.分页查询
        Page<Item> result = itemService.page(query.toMpPage("update_time", false));
        // 2.封装并返回
        return PageDTO.of(result, ItemDTO.class);
    }
*
* 路由断言和路由过滤器都是通过=号进行配置的
*
* 注意！！！
* 如果想让一个路由过滤器对每个路由规则都生效，可以把路由过滤器配置写成和路由同级的配置，用default-filters例如:
*    gateway:
      routes:
        - id: item # 路由规则id，自定义，唯一
          uri: lb://item-service # 路由的目标服务，lb代表负载均衡，会从注册中心拉取服务列表
          predicates: # 路由断言，判断当前请求是否符合当前规则，符合则路由到目标服务
            - Path=/items/**,/search/** # 这里是以请求路径作为判断规则
        - id: cart
          uri: lb://cart-service
          predicates:
            - Path=/carts/**
        - id: user
          uri: lb://user-service
          predicates:
            - Path=/users/**,/addresses/**
        - id: trade
          uri: lb://trade-service
          predicates:
            - Path=/orders/**
        - id: pay
          uri: lb://pay-service
          predicates:
            - Path=/pay-orders/**
      default-filters:
        - AddRequestHeader=truth, anyone long_press like button will be rich # 添加请求头
* */

//网关登录校验
/*
* 进行登录用户身份校验必须是放在转发的前面进行，但是转发是由网关底层自动完成了，所哟敢该怎么实现把登录校验放在转发前面?
* 网关的源码:
* 1、通过HandlerMapping接口的实现类是RoutePredicateHandlerMapping基于路由断言做路由规则的匹配，
* 根据前端请求和路由规则进行匹配，
* 找到匹配的路由，再将匹配的路由存入上下文中，然后把请求交给WebHandler接口的实现类FilteringWebHandler(这种交给下一个的形式称为责任链模式)
*
* 2、这个称为过滤器处理器，他会找到该路由对应的“生效”的过滤器，然后把所有生效的过滤器放到一个集合中形成过滤器链，然后按照顺序执行过滤器链中的过滤器，
* 最后会执行一个特殊过滤器NettyRouterFilter，这个过滤器会根据路由规则将请求转发给对应的微服务，当微服务执行完后会将结果返回给这个NettyRouterFilter，
* 然后这个NettyRouterFilter会依次把结果返回给过滤器链中的其他过滤器，最后返回给用户。
*
* 查看源码会发现NettyRouterFilter实现了两个接口，分别GlobalFilter和Ordered，通过Ordered接口的getOrder方法返回的顺序，来决定过滤器的执行顺序
* 返回的值越小，越先执行，返回的值越大，越后执行。
* public class NettyRoutingFilter implements GlobalFilter, Ordered {
    public static final int ORDER = Integer.MAX_VALUE;//Integer的最大值，也就是Integer.MAX_VALUE，也就是最后执行。
    * ……………………
    * public int getOrder() {
        return Integer.MAX_VALUE;
    }
*
* 注意！！！
* 过滤器内部可以包含两部分逻辑，分别是pre和post，分别会在请求路由到微服务之前和之后进行执行
* 当所有的Filter的pre逻辑依次执行通过后，请求才会被路由到微服务，执行失败则会被拦截。后续的过滤器不再继续执行。
* 微服务返回结果后，再倒序执行所有Filter的post逻辑，并返回给用户。
* 实现登录校验
* 因此可以看出只有在NettyRouterFilter执行成功后才会转发给微服务，所以可以在NettyRouterFilter过滤器之前，自定义个过滤器在pre逻辑中进行用户登录校验，
* 只有校验成功后才执行后续的过滤器，否则返回错误信息。
* 怎样让网关将用户信息发送给微服务呢?
* 用ThreadLocal不行，因为不同的线程之间不能共享数据，而网关和微服务之间是HTTP请求
* 所以要用请求头，将用户信息放在请求头中，然后通过发送Http请求一并发给微服务，微服务拿到用户信息后进行校验，校验成功后才返回结果给网关。
*
* 微服务之间相互传递用户信息，怎么实现？
* 比如，下单成功后需要清空购物车，需要调用购物车的接口，但是清空购物车需要用到用户信息，怎么传递用户信息呢给购物车微服务?
*
* 步骤:
* 1、自定义过滤器，在pre逻辑中获取用户信息，并添加到请求头中
* 过滤去分为两种，分别是GatewayFilter和GlobalFilter(两个都是接口)
* GatewayFilter:路由过滤器、作用于任意的指定的路由，默认不生效，配置到路由之后生效
* GlobalFilter:全局过滤器、作用于所有的路由，声明后自动生效
* 两种过滤器都是通过
* 的Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain);方法进行过滤，返回Mono<Void>
* ServerWebExchange是网关内部的上下文对象，保存网关内部的共享数据，比如请求对象、响应对象、请求参数等等
* 过滤器链中的所有过滤器都可以从这上下文对象里面获取数据，也可以向里面添加数据
* GatewayFilterChain:过滤器链，当一个过滤的逻辑执行完后，需要调用GatewayFilterChain，将请求转发给下一个过滤器
* Mono<Void>: 进行异步操作，用Mono定义一个回调函数，当结果返回了，会调用回调函数，执行Post过滤器逻辑，不会让过滤器一直等待结果导致阻塞。
*
* 这里用GlobalFilter(只要声明就立马生效，启动项目就会执行,不用配置路由)
* 实现:
* 需要定义一个类实现GlobalFilter接口和Ordered接口(保证值比NettyRouterFilter的ORDER小)
*public class MyGlobaFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        //pre逻辑
        ServerHttpRequest request = exchange.getRequest();
        HttpHeaders headers = request.getHeaders();
        System.out.println( headers);
        //放行，转发给下一个过滤器
        return chain.filter(exchange);

    }

    @Override
    public int getOrder() {
        return 0; //返回值为0，越小越先执行
    }
*
*  2、实现登录校验
*把登录认证相关的类和工具存放到网关微服务模块中
*将密钥拷贝到网关微服务模块中，并在网关的配置文件中配置密钥
*
* 主要是通过ServerWebExchange exchange传递用户信息，因为登录成功后会将JWT令牌token存放在authorization请求头中，
* 而前端发送的请求头等消息会放在ServerWebExchange exchange中，所以可以通过ServerWebExchange exchange获取用户信息
* 然后通过JWT工具类将token解析，如果解析成功说明认证成功，返回用户信息，否则返回401状态码。通过
*
* public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        //获取用户信息
        ServerHttpRequest request = exchange.getRequest();
        //获取请求路径，判断请求是否需要进行登录校验
        RequestPath path = request.getPath();
        if (isExclude(path.toString())){//不需要登录校验
            //放行
            return chain.filter(exchange);

        }

        //获取token
        String token = null;
        List<String> headers = request.getHeaders().get("authorization");
        if (headers != null || !headers.isEmpty()){//非空则给 token
            token= headers.get(0);
        }
        //校验并解析 token
        Long userId=null;
        try {
            userId= jwtTool.parseToken(token);//解析token成功说明认证成功
        } catch (Exception e) {//如果解析失败，不抛异常而知直接返回401
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);//设置状态码为401
            return exchange.getResponse().setComplete();//调用setComplete()方法，结束请求不会继续执行下一个过滤器，返回结果给前端
        }
        //将用户信息添加到请求头
        System.out.println("userId:"+userId);

        //放行，转发给下一个过滤器
        return chain.filter(exchange);

    }

    private boolean isExclude(String string) {
        for (String excludePath : authProperties.getExcludePaths()) {
          if (antPathMatcher.match(excludePath, string)){
              return true;
          }
        }
        return false;
    }
             //需要使用Spring提供的antpathMatcher类型进行匹配，不能用contains()方法，因为这个是要要求完全一样的
            //而配置类中写的无需登录校验的路径是 /search/星号的这种表达式, 如果使用contains()方法，
            //那么 /search/list/星号这种明明可以匹配，会被拦截
*
* 3、网关传递用户信息
* 网关在登录校验成功后会拿到用户信息，如果是只通过请求头传递的用户信息的话，微服务模块中每个需要用到用户信息的业务都要写一个获取请求头用户信息的逻辑，太麻烦
* 所以可以又之前的逻辑；把用户信息写到请求头之后，在通用微服务模块中，写一个拦截器(这个拦截器只用于获取用户信息，不做登录拦截，类似一个工具类)，
* 里面写了获取请求头中的用户信息的并放入ThreadLocal中和从Thread Local中移除的逻辑，要用到的业务只需要调用这个类的方法
* 就能将用户信息放到ThreadLocal中，拦截器中是用另一个一个UserContext类将用户信息存入ThreadLocal中
* 这样在微服务模块中每个业务就都可以通过ThreadLocal获取用户信息了，也不用每个里面写一个拦截器了。使用起来非常方便

*一、 修改请求头，将用户信息传入请求头。使用网关提供的API，
*exchange.mutate().request(builder-> builder.header("user-info",userInfo)).build();
* //mutate就是对下游的请求做修改，builder创建一个请求头，添加请求头名称和值
* 将修改后的exchange上下文传递给下一个过滤器
*
二、在通用微服务模块中写一个拦截器，并将拦截器注册到配置类中，而其他模块引用了这个模块的坐标，所有其他的模块中也会有这个拦截器和配置类。
*public class UserInfoInterceptor  implements HandlerInterceptor {}
* //实现了HandlerInterceptor接口的两个方法，preHandle()和afterCompletion()。SpringMvc会在请求处理之前和请求处理完成之后分别调用这两个方法
*
@Configuration
public class MvcConfig implements WebMvcConfigurer {//让拦截器生效
    @Override
    public void addInterceptors(org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        registry.addInterceptor(new UserInfoInterceptor());
        * //会拦截所有的请求，但都会放行只是会看看请求中有没有用户信息，如果有就放到ThreadLocal中，如果没有就放行
    }
}
*问题一是:配置类只有被启动类扫描到才会生效(被扫到就会被交给Spring管理，等Spring MVC 在初始化时(MVC项目启动时)，
*只会从 Spring 容器中找出 WebMvcConfigurer 类型的 Bean，然后调用它们的 addInterceptors() 方法。)
*但是此时配置类是写在通用微服务模块的包下的，只有和启动类在同一个包下才能扫描到，其他微服务没法扫描到。
*而其他微服务的启动类没扫描到它的话，就相当于这个微服务模块的拦截器未生效，那么进入这个请求就不会被拦截器拦截。
注意！！！
不是说一个微服务扫描到了，其他的微服务就能用了，因为每个微服务都是一个独立的JVM进程/Spring项目，不共享一个Spring容器，都有自己的容器，
*扫描到也只会加入自己的容器中。
*
*
解决:使用Spring自动装配的方式
 、将配置类的路径写在通用模块的META-INF/spring.factories中，SpringBoot启动时就会自动加载文件，然后将这个配置类并加入容器中，
因为每个微服务模块都引入这个通用模块，所以也会把这个spring.factories文件引入到自己的项目中，启动这个模块的时候，
SpringBoot启动也会自动加载这个文件，并将配置类并加入容器中，这样相当于每个微服务模块都能扫描到这个配置类了。
*写在resources/META-INF/spring.factories中的内容如下:
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
  com.hmall.common.config.MyBatisConfig,\
  com.hmall.common.config.MvcConfig,\
  com.hmall.common.config.JsonConfig

* 注意！！！
*问题二:因为网关微服务也引入了这个通用模块，但是网关时用Flux编程的，不是用SpringMvc的，而WebMvcConfigurer这个类是SpringMvc的，
*所以网关微服务在启动时会报错，提示找不到WebMvcConfigurer这个类，
解决:也是使用Spring自动装配的方式解决
* 让这个配置类只在SpringMvc的环境下生效，
* 在配置类上添加一个条件注解@ConditionalOnClass(DispatcherServlet.class)
*
* 4、OpenFeign实现用户信息传递
* 微服务通过通用模块中的拦截器拿到了用户信息，但是此时如果微服务调用了其他微服务的接口，因为不是用的其他微服务模块的逻辑层service直接调用
* 而是通过OpenFeign进行远程调用的，所以但是这个接口的方法的参数又不是用户信息，导致无法通过接口的方法传递用户信息了，
* 例如:订单微服务调用购物车微服务的接口，清空购物车，但是这个接口的方法参数是订单信息，并没有用户信息，
@FeignClient("cart-service")
public interface CartClient {
    @DeleteMapping("/carts")
    void deleteCartItemByIds(@RequestParam("ids") Collection<Long> ids);
}
订单微服务中cartClient.deleteCartItemByIds(itemIds);
*
购物车的微服务中的逻辑中
*    QueryWrapper<Cart> queryWrapper = new QueryWrapper<Cart>();
        queryWrapper.lambda()
                .eq(Cart::getUserId, UserContext.getUser())//需要用到用户信息
                .in(Cart::getItemId, itemIds);
        // 2.删除
        remove(queryWrapper);
而UserContext.getUser()方法中获取用户信息，就是从ThreadLocal中获取用户信息的，但是这个调用不是通过前端发送购物车微服务请求的，
* 而是通过OpenFeign进行远程调用的，而这个请求里面没有用户信息的请求头，这个微服务里面的拦截器就无法将用户信息放入ThreadLocal中，所以无法获取用户信息，
*
* 解决方案:
OpenFeign提供了一个拦截器接口，所有由OpenFeign发起的请求都会先调用拦截器处理请求，并将用户信息放入请求头中，这样就能在下游微服务的拦截器中获取用户信息了。
public interface RequestInterceptor {
* void apply(RequestTemplate requestTemplate);
* }
* 把这个拦截器接口放在存放OpenFeign接口的模块中的DefaultFeignConfig配置类中，
* @Bean
 public RequestInterceptor userInfoRequestInterceptor() {
  return new RequestInterceptor() {
   @Override
   public void apply(RequestTemplate template) {
    Long userId = UserContext.getUser();
    //这个拦截器是拦截由订单微服务发起的OpenFeign请求，所以这个拦截是由订单微服务的线程执行的，
    //因为订单微服务通过网关拿到了用户信息，并放入了ThreadLocal中，所以可以通过UserContext.getUser()方法获取用户信息的，
    //再把用户信息放入请求头中，传递给下游微服务，下游的微服务通过自己的拦截器获取用户信息，再放入ThreadLocal中，这样就实现了用户信息的传递了
    if(userId == null) {
     // 如果为空则直接跳过
     return;
    }
    // 如果不为空则放入请求头中，传递给下游微服务
    template.header("user-info", userId.toString());
   }
  };
 }
 *
注意！！
* 配置类要生效得在启动类上添加。DefaultFeignConfig配置类
* @EnableFeignClients(basePackages = "com.hmall.api.client", defaultConfiguration = DefaultFeignConfig.class)
* */


//配置管理
//配置共享
/*
* 因为网关和其他各个微服务模块中，都有很多配置文件，但是有些配置是重复的，每个都写一遍的话，维护起来非常麻烦，，
* 比如:Mysql数据库的配置，日志的配置。Swagger的配置，还有业务的配置(例如:下单超时时间、登录超时上限、密码错误次数等等)
* 还有就是将配置都写在配置文件里，修改之后需要重启项目，对用户不友好。
*所以就有了配置管理的概念，
*配置管理就是将公共的配置抽取出来，当服务启动时就会去读取配置管理服务中的定义的配置，也就实现了一个配置共享的效果。
* 配置管理还有一个监听的功能，当配置管理服务中的配置发生改变时，服务会自动监听到，并将变更的信息推送给对应的服务(配置代码不要写死)
* 服务拿到变更的信息后会自动更新配置立即生效，这样就不需要重启服务了。

* 配置管理服务在Nacos注册中心也提供的
* 步骤:
一、 将要共享的配置文件放在Nacos的配置管理服务中，不用写代码添加，直接复制到Nacos的配置管理的配置列表中
* 添加配置时:
 需要给配置添加配置Id，之后微服务要通过这个配置Id来获取这个配置的内容，配置Id可以随便写，但是要有规律，方便微服务通过配置Id来获取配置内容，
 例如:可以写成application-模块名.properties的形式，例如:application-item-service.properties
 填写描述信息，例如:商品服务模块的配置文件
 粘贴配置内容，需要选择文件的格式，有4种格式，例如:properties、yaml、yml、json
 将非共享的信息作为变量粘贴，例如:Mysql的数据名和端口，还可以添加默认值，${hm.db.port:3306}，如果没有这个变量，就使用默认值3306
 用户名和密码也可以
 *把这些变量写在原配置文件中，例如:
 * hm:
 *  db:
 *    host: localhost
 *    port: 3306
 *项目启动后会从配置文件中读取这些变量的值，替换掉配置管理服务中文件中的变量，这样就实现了配置的共享了
*spring:
  datasource:
    url: jdbc:mysql://${hm.db.host}:${hm.db.port:3306}/${hm.db.database}?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${hm.db.port:root}
    password: ${hm.db.pw:123456}
*完成后点击发布配置
* 注意！！！
* 配置最好分开来存放，比如数据库配置作为一个列表，日志配置作为一个列表，业务配置作为一个列表，这样方便管理，
*
* 二、拉取配置管理中的共享配置，基于NacosConfig拉取共享配置代替微服务的本地配置
* 在传统的SpringBoot项目中，项目启动之后，会加载application.yaml，基于配置文件的信息完成Spring的ApplicationContext(是SpringBoot的Bean工厂和上下文)的初始化，
* 而此时是放在配置管理中的，，需要加入一个SpringCloud的上下文，项目启动后，回去Nacos中拉取配置，拉取之后基于这些配置，完成SpringClod的上下文(ApplicationContext)的初始化，
* 之后再去加载本地的配置文件，初始化springBoot的ApplicationContext
* 但是问题是:
* Nacos地址是写在本地的配置文件中的，项目启动时直接去去Nacos拉取配置，所以这个时候是无法获取到Nacos地址的，无法去Nacos拉取配置的，
*
* 解决方案:使用bootstrap(引导).yaml引导配置文件，加入引导配置文件之后，项目启动时就会先去加载bootstrap.yaml文件，
* 把Nacos的地址写在bootstrap.yaml文件中，项目启动时就会先加载bootstrap.yaml文件，获取到Nacos的地址之后就能去Nacos拉取配置了，
* bootstrap.yaml文件:
* spring:
*   application:
*    naem: xxx-service
*  profiles:
*    active: dev
*  cloud:
*     nacos:
*       server-addr: 192.168.100.128:8848
*    config:
*       file-extension: yaml #配置文件的格式
*       shared-configs: #共享配置列表，可以配置多个共享配置
*        - data-id #共享配置的Id，之前在Nacos中添加配置时定义的配置Id
*        - data-id:
*        - data-id:
*每个要用的模块都要加一个bootstrap.yaml文件，可以将该微服务的原yaml的大部分信息删了，只需要留端口和变量的值，其他信息要么在配置管理服务中，要么在bootstrap.yaml中
*拉取共享配置需要引入依赖
用于Nacos的配置管理服务的依赖
<dependency>
<groupId>org.alibaba.cloud</groupId>
<artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
</dependency>
读取bootstrap.yaml文件创建bootstrap的上下文
<dependency>
<groupId>org.stringframework.cloud</groupId>
<artifactId>spring-cloud-starter-bootstrap</artifactId>
</dependency>
*
* 总结:
* 当服务启动时，会先去加载bootstrap.yaml文件，获取Nacos的配置管理服务地址，然后去Nacos中拉取共享配置，得到配置信息，
* 再加载本机的配置文件，拿到变量值，和bootstrap.yaml拿到的变量值合并，完成SpringBoot的ApplicationContext的初始化
* */

//配置热更新
/*
*配置热更新:
*当修改配置文件中的配置时，微服务无需重启即可使配置生效
*前提条件:
* 1、nacos中要有一个与微服务名相关的配置文件
* 格式:[微服务名-[项目的有效配置文件，可选的].[文件后缀]
* 例如:item-service-dev.yaml
* 而bootstrap.yaml中已经配置了微服务名、项目的有效配置文件，以及文件后缀，不用再在配置文件中写了
* 之后加载bootstrap.yaml文件时，会根据这个自动去Nacos寻找并拉取这些值
* spring:
*   application:
*    naem: xxx-service
    profiles:
     active: dev
   …………
     config:
      file-extension: yaml
例如之前的购物车微服务中的bootstrap.yaml中有这些
*启动后会发现控制台里面有[BootstrapPropertySource {name='bootstrapProperties-cart-service-local.yaml
* 2、微服务当中要用特定的方式读取需要热更新的配置属性，
* 两种方式:
* @Data
* @ConfigurationProperties(prefix = "hm.cart")
* public class CartProperties {
*  private int maxItems;
* }
*等同于:hm:
*       cart:
*        maxItems:
* @Data
* @RefreshScope
* public class CartProperties {
*  @Value("${hm.cart.maxItems}")
*  private int maxItems;
* }
*在Naocs中和bootstrap中的配置，一样的配置文件中要有则个配置项的值
* hm:
*  cart:
*   maxItems:xx
* 注意！！！
*这里是反过来了，是微服务要读取Nacos中的变量值，然后赋值给微服务中这个配置类中的属性变量值
*而且一旦
*案例:购物车的限定数量现在是写死的，要求将其改为读取配置文件属性，并将配置交给Nacos管理，实现配置热更新
*Nacos中的配置值变了，Nacos会将更改的值推送到微服务中，微服务中会监听到这个推送，然后重新加载配置，
*并把新的值赋给对应的属性变量，这样配置就实现了热更新，就能实现配置的动态修改
* */

//动态路由(都写在网关微服务中创建一个类，它的方法就是监听和更新路由的。这个方法只要这个类被加载了就会执行,在网关中也要引入Nacos的配置管理服务的依赖和bootstrap的依赖)
/*
* 之前的路由是写死在网关的配置文件中的，当网关启动后会将路由信息加载到路由表(缓存空间)中，
* 之后处理请求判断时就可以直接从路由表(缓存空间)中获取路由信息，不用读取文件信息了，提高处理速度
*
* 但是当路由信息发生变化时，需要重启网关，才能使路由信息生效，这会导致用户体验差
* 要让路由和热配置一样，修改后路由直接生效不用重启网关，实现动态路由
* 所以也是需要使用Nacos，
* 将路由配置保存到Nacos中，当Nacos中的路由配置变更时，推送最新配置到网关，实时更新网关中的路由信息
* 步骤:
* 1、监听Nacos中配置变更的消息
* Nacos提供了API，
* public String getConfig(String dataId, String group, long timeoutMs);
* 用于项目启动时，获取Nacos中的配置信息，并加载到微服务的路由表中，之后的变更由监听器完成，
* 注意！！！如果没有这个Api项目启动时就没有路由信息了。
* public void addListener(String dataId, String group, Listener listener(要匿名内部类实现));
* 监听Nacos中配置变更的消息
* dataId:要监听网关的路由的配置、group:配置所属的分组、
* listener:监听器(在listener中定义了监听的回调方法,当配置变更时就会调用回调函数，函数中定义了推送变更的逻辑)
* 这个API所需要的依赖在引入spring-cloud-starter-alibaba-nacos-config依赖时已经通过依赖关联引入的
*
* 注意！！
* 需要定义一个Properties类的对象，添加Nacos的地址信息
String serverAddr = "{serverAddr}";
String dataId = "{dataId}";
String group = "{group}";
// 1.创建ConfigService，连接Nacos
Properties properties = new Properties();
properties.put("serverAddr", serverAddr);
ConfigService configService = NacosFactory.createConfigService(properties);
*
注意！！！
*以上这些步骤，不用我们写的
* 项目启动时，Nacos会自动装配NacosConfigManager类，而这个类的构造函数后中会调用createConfigService(nacosConfigProperties)方法
参数是Nacos的配置属性，而这个方法也在NacosConfigManager类中，会返回一个ConfigService对象。而且还单独提供了一个getConfigService()方法，
* 里面也是调用createConfigService(nacosConfigProperties)方法，返回一个ConfigService对象。
所以只需要注入NacosConfigManager类，调用getConfigService()方法就能获取ConfigService对象，很简便。
，
以下步骤也可以简化，ConfigService对象已经封装了一个可以同时获取和监听指定配置的API，
* String getConfigAndSignListener(String dataId, String group, long timeoutMs, Listener listener);
*就会为：
* String content = configService.getConfigAndSignListener(dataId, group, 5000, new Listener() {
* ………………
* })
// 2.读取配置
String content = configService.getConfig(dataId, group, 5000);
// 3.添加配置监听器
configService.addListener(dataId, group, new Listener() {
        @Override
        public void receiveConfigInfo(String configInfo) { //回调函数，用于监听指定配置的配置变更
        // 配置变更的通知处理
                System.out.println("recieve1:" + configInfo);
        }
        @Override
        public Executor getExecutor() {
                return null;
        }
});

* 2、但配置变更时，将最新的路由信息更新到网关路由表中
*使用Nacos另一个API，RouteDefinitionWriter，来更新路由表信息
* public interface RouteDefinitionWriter {
    Mono<Void> save(Mono<RouteDefinition> route); //更新路由到路由表中，如果路由Id重复则会覆盖旧的路由
    Mono<Void> delete(Mono<String> routeId);
  }
* 这个接口有两个个方法，分别是save()、delete()分别用于新增路由、删除路由，参数时候传入存放RouteDefinition的Mono容器对象。
* Mono是一个响应式编程的，需要用Mono.just()方法将RouteDefinition对象包装成一个Mono对象，才能传入save()方法中。还需要调用subscribe()方法来订阅这个容器。
* ruote路由的底层就是RouteDefinition对象，RouteDefinition对象中有路由的属性信息，例如:路由Id、路由目标地址、路由断言、路由过滤器等等
* public class RouteDefinition {
    private String id;
    private @NotEmpty @Valid List<PredicateDefinition> predicates = new ArrayList();
    private @Valid List<FilterDefinition> filters = new ArrayList();
    private @NotNull URI uri;
    private Map<String, Object> metadata = new HashMap();
    private int order = 0;
    ………………
}
* 而监听返回的configInfo参数就是Nacos中路由配置的内容，这些内容就是之前的那种yaml文件中的各个属性的的信息。
* 因为yaml文件中的信息我们不知道该怎么转换成RouteDefinition对象，所以可以先把路由的信息以Json格式的字符串保存Nacos中，
* 这样拿到的configInfo参数就是Json格式的字符串了
* 因为不止一个路由，所以需要定义一个RouteDefinition对象集合，用来保存多个路由信息，用JSONUtil.tolist()方法将
* Json字符串转换成RouteDefinition对象集合，然后遍历集合，调用RouteDefinitionWriter的save()方法将每个路由信息更新到路由表中
*
* 但是如果Nacos中的变更操作是，删除了一个路由，那么就需要调用RouteDefinitionWriter的delete()方法来删除路由表中的所有路由信息，调用save就是全部新增了，
* 但是不知道要删除哪个路由，所以需要定义一个成员变量Set<String> routeIds，用于保存每次更新的路由Id(因为是写在成员位置，只有类加载时才会重新创建)
* 当Nacos中的路由配置变更时，会先删除旧的路由表的所有路由，再新增新的路由表的所有路由，这样就实现了动态路由了
* private final RouteDefinitionWriter routeDefinitionWriter;
  private final Set<String> routeIds = new HashSet<>(); //记录路由Id，方便删除旧的路由表
  *private void updateConfigInfo(String configInfo) {
        List<RouteDefinition> list = JSONUtil.toList(configInfo, RouteDefinition.class);
        //删除旧的路由表
        for (String routeId : routeIds) {
            routeDefinitionWriter.delete(Mono.just(routeId)).subscribe();
        }
        routeIds.clear();//清空路由Id集合
        for (RouteDefinition routeDefinition : list) {
            //更新路由表
            routeDefinitionWriter.save(Mono.just(routeDefinition)).subscribe();
            //记录路由Id
           routeIds.add(routeDefinition.getId());
        }

    }
* 注意！！！
* 删除完旧的路由表之后，要请求空集合，新增时将新的路由表所有路由Id添加到routeIds集合中，这样下一次变更时就知道要删除哪些路由了
*
*在Nacos中配置路由信息时，用Json格式的数组编写，路由信息的格式如下:
* [
    {
        "id": "item",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/items/**", "_genkey_1":"/search/**"}
        }],
        "filters": [],
        "uri": "lb://item-service"
    },
    {
        "id": "cart",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/carts/**"}
        }],
        "filters": [],
        "uri": "lb://cart-service"
    },
    {
        "id": "user",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/users/**", "_genkey_1":"/addresses/**"}
        }],
        "filters": [],
        "uri": "lb://user-service"
    },
    {
        "id": "trade",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/orders/**"}
        }],
        "filters": [],
        "uri": "lb://trade-service"
    },
    {
        "id": "pay",
        "predicates": [{
            "name": "Path",
            "args": {"_genkey_0":"/pay-orders/**"}
        }],
        "filters": [],
        "uri": "lb://pay-service"
    }
]
* */