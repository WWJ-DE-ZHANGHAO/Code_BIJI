//AOP
/*
* AOP(Aspect Oriented Programming)面向切面编程,可以简单理解为面向特定的方法进行编程
* 特点:
* 减少重复代码
* 代码无侵入
* 提高开发效率
* 维护方便
*
* 应用场景:
* 例如:项目中部分业务方法运行较慢，想要定位执行耗时较长的方法，此时就需要统计每个业务方法到的执行耗时
*可以给每个方法记录开始和结束时间，并计算耗时，但是这样会很麻烦，如果要统计多个方法，
* 那么就要重复写代码，这样代码就会很乱，这时就可以使用AOP进行编程
* 编写一个切面类(类上添加@Aspect注解，才算是切面类)，将统计耗时的代码封装起来，然后通过AOP进行调用，参数为ProceedingJoinPoint对象，
* 该对象封装了目标方法的相关信息。
* 在方法上添加一个注解
* @Around("execution(* com.WWJ.service.*.*(..))")，表示对com.WWJ.service包下的所有方法进行AOP编程
* 通过ProceedingJoinPoint对象获取目标方法的相关信息，并执行目标方法，最后计算耗时并输出
* 这样就可以统计所有业务方法的执行耗时了
* */
注意！！！
AOP是一种编程思想，而Spring框架对这种思想进行了实现，即Spring AOP。
//SpringAop使用
/*
* 导入AOP依赖
<dependency>
<groupId>org.springframework.boot</groupId>
<artifactId>spring-boot-starter-aop</artifactId>
</dependency>
*
再进行编写AOP程序
* 例如:
* @Aspect
* @Component
* public class TimeAspect {
*     @Around("execution(* com.WWJ.service.*.*(..))")
*     public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
*         long start = System.currentTimeMillis();
*         Object result = joinPoint.proceed();
* //执行目标方法，因为不知道方法的返回值是什么，所以用Object接收
*         long end = System.currentTimeMillis();
*         log.info("方法[{}]执行耗时: {} ms", joinPoint.getSignature().toShortString(), (end - start));
*         return result;
*     }
* }
*
*
* */
注意！！！！、
只有被监听的方法执行前后才会被AOP进行拦截，并执行切面类的方法的逻辑
如果要知道当前是哪个方法在执行，
可以使用ProceedingJoinPoint的getSignature()方法获取方法签名(包括参数类型、参数名称、返回值类型、方法名称)
，再通过链式编程调用getName()方法获取方法名称

//SpringAOP的核心概念
/*
* 连接点:JoinPoint:可以被AOP控制的方法(暗含方法执行时的相关信息)
* 通知:Advice，指的是那些重复的逻辑，也就是共性功能(就是切面类的方法中的逻辑)
* 切入点:Pointcut，匹配连接点的条件(切入点表达式)的方法，也就是实际被AOP控制的方法，通知的逻辑仅会在切入点方法执行时被应用
* 切面:Aspect,描述通知与切入点的对应关系(通知+切入点)，也就是说需要针对哪些类中的方法进行什么样的操作
* 而切面所在的类就叫切面类，添加@Aspect注解
* 目标对象:Target,通知所应用的对象，也就是切入点表达式所匹配的类的对象
*
*
* 底层的原理:是根据动态代理实现的
* Spring在2.x之前默认使用的是JDK动态代理，2.x之后默认使用的是CGLIB动态代理
* JDK动态代理:只能对实现了接口的类进行代理，生成的代理对象是目标对象的子类
* CGLIB动态代理:可以对没有实现接口的类进行代理，生成的代理对象是目标对象的子类
*
* 当Spring启动时，会遍历容器中的所有Bean。判断Bean是否符合切入点表达式，
* 如果符合，就会为该Bean创建一个代理对象，代理对象中继承了目标对象的方法，
* 但方法中过的逻辑与目标对象的方法逻辑不同。
* 流程:
* 先执行切面类中方法的前置逻辑，
* 再去目标对象中，执行目标对象的方法(使用目标对象调用其方法)，
* 最后执行后置逻辑
* 并将通知逻辑织入到该Bean的目标方法中
* 伪代码:
* public class DeptServiceImpl implements DeptService {
*     @Autowired
*     private DeptMapper deptMapper;
*     @Override
*     public void addDept(Dept dept) {
*        deptMapper.insert(dept);
*     }
* }
*
* 代理对象:
* public class DeptServiceImpl$$EnhancerBySpringCGLIB$$12345678 extends DeptServiceImpl {
*     @Override
*     public void addDept(Dept dept) {
*         //切面类中方法的前置逻辑
*          long start = System.currentTimeMillis();
*          super.addDept(dept); //调用目标对象的方法
*         //切面类中方法的后置逻辑
           long end = System.currentTimeMillis();
*         log.info("方法[{}]执行耗时: {} ms", joinPoint.getSignature().toShortString(), (end - start));
*         return result;
*     }
* 之后再注入的目标对象中，其实是将代理对象注入，执行方法时，也是执行代理对象中的方法
* */

//通知类型
/*
* 根据方法的执行时机不同，将通知类型分为五类
* @Around: 环绕通知，此注解标注的通知方法，在目标方法执行前和目标方法执行后都会执行
* @Before: 前置通知，在目标方法执行之前执行、
* @After: 后置通知，在目标方法执行之后执行。无论是否抛出异常，都会执行
* @AfterReturning: 返回通知，此注解标注的通知方法在目标方法后执行，有异常不会执行
* @AfterThrowing: 异常通知，在目标方法抛出异常时执行
*
* 例如
@Around("execution(* com.WWJ.service.*.*(..))")
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
}
@Before("execution(* com.WWJ.service.*.*(..))")
public void before(JoinPoint joinPoint) {
}
@After("execution(* com.WWJ.service.*.*(..))")
public void after(JoinPoint joinPoint) {
 }
 @AfterReturning("execution(* com.WWJ.service.*.*(..))")
 public void afterReturning(JoinPoint joinPoint) {
 }
 @AfterThrowing("execution(* com.WWJ.service.*.*(..))")
 public void afterThrowing(JoinPoint joinPoint) {
 }
*
当多个通知方法是匹配的同一个切入点表达式时，为了不重复写相同的切入点表达式，
可以将切入点表达式抽取出来，写在一个方法上，并添加@Pointcut注解
即:
@Pointcut("execution(* com.WWJ.service.*.*(..))")
public void pointcut() {
}
要使用该切入点表达式的通知方法，只需要在通知类型的注解中添加这个方法名即可
即:
@Around("pointcut()")
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
}
想要变更切入点表达式，只需要修改@Pointcut注解中的切入点表达式即可，更容易维护了

多个通知方法监听的同一个方法执行时。会先执行@Around通知方法的前置逻辑，再执行@Before通知方法的逻辑，再执行目标方法，
再执行@Around通知方法的后置逻辑，
再执行@Before通知方法的逻辑，
再执行@AfterReturning通知方法的逻辑，
再执行@AfterThrowing通知方法的逻辑，
再执行@After通知方法的逻辑，
最后执行@Around通知方法的后置逻辑
 */
注意！！！！
@Around环绕通知需要自己调用ProceedingJoinPoint的proceed()方法
来让目标方法执行，其他通知框架会自动调用一次proceed()方法来让目标方法执行
因此@Around环绕通知可以控制目标方法是否执行，甚至可以多次执行目标方法

@Around环绕通知的方法的返回值必须设置为Object，
用于接受目标方法的返回值，并将其返回，否则会导致目标方法的返回值丢失
其他的通知类的方法可以不用设置返回值，默认返回void

只有@Around的参数是ProceedingJoinPoint时，
其他到的参数都是JoinPoint类型的，JoinPoint类型的参数只能获取目标方法的相关信息，无法控制目标方法的执行
也是调用getSignature()方法获取方法签名(包括参数类型、参数名称、返回值类型、方法名称)
再通过链式编程
调用getName()方法获取方法名称、getComputedStyle()方法获取方法参数类型、getArgs()方法获取方法参数值等


注意！！！
@PointCut注解标注的方法，如果是private修饰的，
那么只有该切入类中的通知方法才能使用该切入点表达式，
其他类中的通知方法无法使用该切入点表达式
如果是public修饰的，那么其他类中的通知方法也可以使用该切入点表达式

//通知顺序
/*
* 同一个类型的多个通知方法的执行顺序
* 默认情况:是在不同的切面类，默认按照切面类的类名字母排序
* 如果是目标方法执行前的通知方法，按照类名字母(字母相同看数字)越靠前的越先执行
* 如果是目标方法执行后通知方法，按照类名字母(字母相同看数字)越靠前的越后执行
* 例如:
* public class A {
*   @Before("execution(* com.WWJ.service.*.*(..))")
*   public void before() {
*  log.info("A before");}
*  }
* public class B {
*  @Before("execution(* com.WWJ.service.*.*(..))")
*  public void before() {
* log.info("B before");}
* }
*
*
* 如果不想使用默认的顺序，可以在切面类上添加@Order注解，指定切面类的优先级，
* 目标方法执行前的通知方法，数字小的先执行
* 目标方法执行后通知方法，数字小的后执行
* 例如:
* @Order(1)
* public class A {
*  @Before("execution(* com.WWJ.service.*.*(..))")}
*   public void before() {
* log.info("A before");}
* }
* @Order(2)
* public class B {
* @Before("execution(* com.WWJ.service.*.*(..))")}
* public void before() {
* log.info("B before");}
*  }
* */

//切入点表达式
/*
描述切入点方法的一种表达式，用于决定项目中的哪些方法需要加入通知
常见形式:
1、execution(……):根据方法的签名(返回值、方法名、包名以及方法参数)来匹配
execution(访问修饰符 返回值类型 包名.类名.方法名(参数类型的全类名)throws 异常类型)
其中访问修饰可以省略、throws 异常类型可以省略、包名.类名可以省略(不建议省略)
使用
*:单个独立的任意符号，可以通配任意返回值、包名、类名、方法名、任意类型的一个参数，也可以通配包、类、方法名的一部分
例如:execution(* com.*.service.*.delect*(*))
表示匹配任意返回值，com包下的任意子包下的service包下的任意类中的以delete开头的方法(任意参数)

..:多个连续的任意符号，可以通配任意层级的包、或任意类型、任意个数的参数(只能通配包和参数)
execution(* com...delect*(..))
表示匹配任意返回值，com包下的任意层级的包下的以delete开头的方法(任意参数和任意个数)
缺点:当匹配多种情况时，需要写很多个切入点表达式，很麻烦
例如:只匹配com.WWJ.service.impl.DeptService类中的delect方法和list方法
@Around("execution(* com..service.impl.DeptService.delect(..))||"+
"execution(* com..service.impl.DeptService.list(..))")
public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
}
此时就可以使用@annotation注解来匹配方法上的注解，简化切入点表达式

2、@annotation(……):根据方法上的注解来匹配
创建一个注解，需要给该注解添加两个注解@Target表示在什么位置使用该注解，@Retention表示什么时候使用该注解
@Target(ElementType.METHOD) //表示该注解只能在方法上使用
@Retention(RetentionPolicy.RUNTIME)//表示该注解在运行时生效
public @interface Log { //不需要编写任意内容，只需要一个空注解。
}

@Before("execution(*com..service.impl.DeptService.delect(..))")
//匹配com的任意层级的子包下的service.impl.DeptService类中的delect方法，任意类型和任意个数的参数
public void before(JoinPoint joinPoint) {
}
@Before("@annotation(com.WWJ.annotation.Log)")
//匹配方法上有@Log注解的目标方法，com.WWJ.annotation.Log是自定义的注解的全类名
public void before(JoinPoint joinPoint) {
}

*/
//连接点JoinPoint
/*
* 在Spring中用JoinPoint抽象了连接点，用它可以获得方法执行时的相关信息，如目标类名、方法名、方法参数等
* 对于@Around通知方法，只能通过ProceedingJoinPoint类的对象来获取方法执行时的相关信息
* 对于其他通知方法，可以通过JoinPoint类的对象来获取方法执行时的相关信息
* JoinPoint是ProceedingJoinPoint的父类。
* JoinPoint类对象和ProceedingJoinPoint类对象调用以下方法获取目标方法的相关信息:
* 获取目标方法所在的类的类名:调用getTarget().getClass().getName()方法
* 获取目标方法签名:调用getSignature()方法
* 获取目标方法名:调用getSignature().getName()方法
* 获取目标方法参数:调用getArgs()方法。返回Object类型的数组
*
*
* */

//SpringBoot配置优先级
/*
*.properties文件的优先级>.yml文件的优先级>.yaml文件的优先级
*
*
* SpringBoot除了支持配置文件属性配置，还支持外部配置
* Java系统属性和命令行参数的方式进行属性配置
* 需要点击编辑配置，
* VM options中添加-Dserver.port=8080 //表示配置Java系统属性，用于配置端口号
* Program arguments中添加--server.port=8080 //表示配置命令行参数，用于配置端口号
*
* 同时启动会发现使用的是命令行参数配置的端口号，因为命令行参数的优先级高于Java系统属性
* 而Java系统属性的优先级高于*.properties文件的优先级
*
*
* */
注意！！！
如果是打包成的jar包，那么命令行启动jar包会发现因为此时没有外部配置，所以是配置文件中的端口号生效
应用场景:
如果打成jar后发现配置文件有误，可以在外部创建一个和配置文件一样的名称的配置文件
例如application.yml，并在该文件中添加正确的内容，此时外部配置生效，就修正了配置文件有误
//Bean管理
/*
* Bean指的是IOC容器当中所管理的对象，也称之为Bean对象。SpringBoot会自动扫描包下的类，并将其注册为Bean
* Bean的管理分为两个方面:Bean的作用域和第三方Bean
* Bean的作用域:IOC容器当中所管理的这些Bean对象的作用范围，分为五种
*
* singleton:单例模式，一个名称的Bean，IOC容器中只会存在一个该Bean对象，默认是单例模式
* prototype:多例/非单例模式，IOC容器中会存在多个同名的Bean的Bean对象，每次使用该Bean时(即从IOC获取时该Bean对象时)
* 会创建新的实例
* request:每个请求范围内会创建新的实例,一个请求对应一个Bean对象
* session:每个会话范围内会创建新的实例,一个会话对应一个实例,同一个会话内使用的是同一个Bean对象
* application:每个应用范围内会创建新的实例。一个应用对应一个实例,同一个应用内使用同一个Bean对象
*
* 设置Bean的作用域:在类上添加@Scope注解，指定Bean的作用域
* 例如:
* @Scope("prototype") //表示该DeptController类对应的Bean对象是多例模式
* @RequestMapping("/dept")
* @RestController
* public class DeptController {
* }
*
* 想要从IOC容器中拿到Bean对象，需要先获取IOC容器对象，IOC容器对象是ApplicationContext类型的对象
* 通过@Autowired注解注入IOC容器对象
* 即:
* @Autowired
* private ApplicationContext applicationContext; //是导org.springframework.context包下的
* 再通过IOC容器对象调用getBean()方法获取Bean对象
* 可以根据Bean名称、Bean类型、Bean名称和类型来获取Bean对象
* getBean(String beanName)、getBean(Class beanClass)、getBean(String beanName,Class beanClass)
* 因为不知道Bean的类型所以使用Object类型接收Bean对象
*
* 测试单例模式的Bean对象:
* @Autowired
* private ApplicationContext applicationContext;
* @SpringBootTest
* class DemoApplicationTests {
* @Test
* public void testBean() {
* for (int i = 0; i < 5; i++) {
* DeptController bean = applicationContext.getBean("deptController");
* System.out.println(bean);
* }
* }
* }
* 会发现每次打印的都是同一个Bean对象
*
* Bean对象的创建时间，拿DeptController对象为例:
* 因为要获取DeptController对象，所以需要调用DeptController类
* 的空参构造方法，创建DeptController对象
* 所以可以编写一个空参构造方法，并再无参构造方法中打印一句话，来测试Bean对象的创建时间
* 例如:
* @RequestMapping("/dept")
* @RestController
* public class DeptController {
*  public DeptController() {
*  System.out.println("创建DeptController对象");
* }
* ………………
* }
* 会发现当项目启动时，会打印这句话，说明单例的Bean的对象是在项目启动时创建的，创建完毕后将该Bean存入IOC容器中
* 如果不想单例的Bean对象在项目启动时创建，那么就在类上添加@Lazy注解，
* 表示该Bean对象是懒加载的，只有在第一次使用该Bean对象时才会创建该Bean对象
*
*
* 测试多例模式的Bean对象:
* @Scope("prototype") //表示该DeptController类对应的Bean对象是多例模式
* @RequestMapping("/dept")
* @RestController
* public class DeptController {
* public DeptController() {}
* @GetMapping("/{id}")
* public Dept get(@PathVariable Integer id) {
* }
* }
* @Autowired
* private ApplicationContext applicationContext;
* @SpringBootTest
* class DemoApplicationTests {
*  @Test
* public void testBean() {
*  for (int i = 0; i < 5; i++) {
*  DeptController bean = applicationContext.getBean("deptController");
*  System.out.println(bean);
* }
*  }
* }
*
* 此时会发现打印的Bean都不一样，所以每次获取Bean对象，都会创建新的Bean对象
*
*
* 应用场景:什么情况下设置单例的Bean对象，什么情况下设置多例的Bean对象?
* 如果声明的Bean对象是无状态的，那么就可以设置为单例模式
* 判断一个Bean对象是否是无状态的，
* 可以看该Bean对象中是否有值可变的成员变量，如果有，那么就说明该Bean对象是有状态的
* @RequestMapping("/dept")
* @RestController
* public class DeptController {
* //无状态的。虽然存在成员变量，但是成员变量的值一旦注入后就无法改变，对象属性不变，就相当同一个Bean对象
* @Autowired
* private DeptService deptService;
* @GetMapping("/{id}")
* public Dept get(@PathVariable Integer id) {
* }
* }
*
* 单例的Bean对象是线程安全的，因为多个线程访问同一个单例的Bean对象时，该对象没有值可变的成员变量，
* 所以无法改变该Bean对象的属性值，所以是线程安全的
* 且性能是高的，因为单例的Bean对象只会创建一次，节省了创建对象的时间
*
* 如果声明的Bean对象是有状态的，那么就可以设置为多例模式
* 判断一个Bean对象是否是有状态的，
* 可以看该Bean对象中是否有值可变的成员变量，如果有，那么就说明该Bean对象是有状态的
* 例如:
* @Component
* public class DeptService {
*  private Integer count = 0; //统计每次操作的错误次数
*  public Integer getCount() {
* }
* }
* 如果这个也设置为单例模式，那么就会导致多个线程操作该Bean对象时，每次修改的是同一个对象，从而导致数据不一致
* 此时就会造成线程安全问题
* 所以需要设置为多例模式，这样每次获取该Bean对象时，都会创建新的Bean对象，从而避免了数据错误，
* 、从根本上解决线程安全问题
*
*
* 第三方Bean:这个类不是我们自己定义的，是由第三方的依赖或jar包提供的类，要想将第三方提供的类交给IOC容器管理，
* 声明为IOC容器中的Bean对象，怎么实现呢?
* 因为第三方提供的类，是jar包中的类，所以无法通过添加@Component注解，将第三方提供的类声明为Bean对象
* 此时就需要使用@Bean注解，将第三方提供的类声明为Bean对象
* 可以在启动类当中定义一个添加了@Bean注解的方法，方法的返回值就是第三方提供的类的对象
* 例如:
* @SpringBootApplication
* public class DemoApplication {
*  @Bean
*  public RestTemplate restTemplate() {
*   return new RestTemplate();
*  }
* }
*/
注意！！！
如果在启动类中添加了@Bean注解的方法，如果返回第三方Bean对象，需要依赖其他的Bean对象，
那么就可以在该方法的参数中添加其他Bean对象，SpringBoot会自动注入该Bean对象
可以通过@Bean注解的Value属性给第三方Bean对象起名字
如果没有指定名字，那么默认使用返回第三方Bean对象的方法的名称作为Bean对象的名字
例如:
@Data
@Component
public class AliyunOSSProperties {
    ……………………
}
#@Component
public class AliyunOSSperator { //假设此时该类是第三方提供的类，无法添加@Component注解
    public AliyunOSSperator(AliyunOSSProperties aliyunOSSProperties) {
    }
}
@Bean
public AliyunOSSperator aliyunOSSperator(AliyunOSSProperties aliyunOSSProperties) {
return new AliyunOSSperator(aliyunOSSProperties);
}
此时IOC容器会自动从容器中获取AliyunOSSProperties对象，
并传入到AliyunOSSperator的构造方法中，创建AliyunOSSperator对象，并将其注册为Bean对象
//SpringBoot原理
/*
* 如果基于SpringFramework开发项目会很麻烦，主要体现在引入依赖和项目配置方面
* 而SpringBoot可以快速的构建出一个Spring的应用程序，是因为SpringBoot提供了两个核心功能:起步依赖和自动配置

* */

//SpringBoot起步依赖原理
/*
* 起步依赖:指的是SpringBoot官方提供的一个个starter依赖包，通过Maven的依赖传递引入开发所需要的所有依赖
* 例如:SpringBoot提供了spring-boot-starter-web依赖包，通过Maven的依赖传递就会将Web开发所需要的依赖全部引入进来
* 包括SpringMVC、Tomcat、Jackson等依赖
*
* */
//SpringBoot自动配置原理
/*
*SpringBoot的自动配置:指的是当Spring项目启动后，一些配置类、bean对象就自动存入到IOC容器中，
* 不需要我们手动去声明这些Bean对象，从而简化了开发，省去了繁琐的配置操作
*例如:
*要想将一个对象或集合转换成JSON数据，要用谷歌提供的Gson类库，或者使用Jackson类库
*此时只需要引入Gson或Jackson的依赖包，SpringBoot就会自动将Gson或Jackson的依赖包引入到项目中，
* 用的时候直接注入就行了。
* 不需要手动的去配置第三方Bean
* */

//SpringBoot自动配置底层实现方案一
/*
在POM文件中引入第三方工具的依赖
引入依赖后，可以通过new对象，使用第三方工具中的类和方法

但是new出来的对象是不受SpringBoot管理的，如果要New的的对象，内部还注入应用了其他Bean，
例如:
@Component
public class A{
 @Autowired
 private B b;
}
此时还用New的话，会因为没有注入所依赖的Bean对象，导致该该Bean的值为null，会空指针


而如果使用的是@Autowired注解注入的第三方工具对象，那么第三方工具中必须给该类加上@Component注解，
否则无法被SpringBoot扫描到，也就无法注入该类的对象，且想被扫描到该类所在的包。必须是启动类所在的包或子包中
想要扫描到非启动类所在的包及其子包中的类，那么需要在启动类的上方添加@ComponentScan注解，
在注解中添加所需要扫描的包的全类名，
但是添加后就不会默认扫描启动类所在的包和子包了，而是扫描指定的包，
所以需要将启动类所在的包和子包也添加到@ComponentScan注解中，添加多个包名(加上双引号)，可以用逗号隔开

缺点:
1、如果需要扫描的包很多，那么@ComponentScan注解中就会有很多包名，代码就会很乱
2、扫描的包太多，那么性能就很差
 */


//SpringBoot自动配置底层实现方案二
/*
1、在启动类上添加@Import注解，注解中写要交给IOC容器管理的类的字节码文件，即类名.class,
就能直接将类注册到IOC容器中
2、或者在@Import注解中写一个配置类的字节码文件，
会将该配置类中的用@Bean标注的方法的返回值的类的对象注册到IOC容器中
3、通过导入ImportSelector接口的实现类，该类重写selectImports方法，会返回一个字符串数组，数组中是要交给IOC容器管理的类的全类名，
就能实现批量的将类注册到IOC容器中
即@Import(MyImportSelector.class)//导入ImportSelector接口的实现类
但是这种需要一个个的去找哪些类需要注册到IOC容器中，再添加到数组中返回。很麻烦，
4、所以需要第三方工具的提供者，将这些类都交给ImpostSelector接口的实现类,再编写一个封装@Import(MyImportSelector.class)的注解@EnableXXX注解，供开发人员使用
开发人员只需要添加这个注解，就能将这些类注册到IOC容器中，省去了繁琐的配置操作
这里的第四种是最佳的实现方式
 */

//SpringBoot自动配置底层源码跟踪
/*
分析步骤:
@SpringBootApplication注解中封装了三个注解:@SpringBootConfiguration、@EnableAutoConfiguration、@ComponentScan
@SpringBootConfiguration注解中封装了@Configuration注解，表示该类是一个配置类，说明启动类是一个配置类因此可以在启动类中添加@Bean注解的方法
@EnableAutoConfiguration注解中封装了@Import(AutoConfigurationImportSelector.class)注解，
而AutoConfigurationImportSelector.class类实现了ImportSelector接口，重写了selectImports方法
返回一个String类型的数组，数组中存放的是所有的自动配置类的全类名。
再查看
会发现当SpringBoot启动时，会扫描META-INF/org.springframework.boot.autoconfigure.AutoConfiguration.imports文件，
该文件中是存放了所有的自动配置类的全类名，SpringBoot会加载这个文件，将这个文件中的所有的类都加载出来
然后封装到一个List集合中，最后将这个List集合中的所有的类，变为一个String类型的数组，最后通过@Import注解注册到IOC容器中
之后要使用就可以直接通过@Autowired注解注入使用了
从而闭环了
当启动类启动时，SpringBoot会扫描META-INF/org.springframework.boot.autoconfigure.AutoConfiguration.imports文件，
该文件中存放的是所有的自动配置类的全类名，将所有的自动配置类的全类名加载出来，
然后将这个String类型的数组，变为一个String[]数组，最后通过@Import注解将这个String[]数组中的类注册到IOC容器中
 */
注意！！！
在SpringBoot2.7.0版本之前，自动配置类是定义在spring.factories文件中，
而在SpringBoot2.7.0版本之后，自动配置类是定义在AutoConfiguration.imports文件中

面试问题:
每个自动配置类中都定义了多个添加@Bean的方法,项目启动是会将所有配置类的所有要注册的Bean对象注册到IOC容器中吗?
答:不是的，因为每个配置类中的@Bean方法还添加了@Conditional注解，
表示会根据当前的环境信息，来决定是否需要将当前的Bean对象注册到IOC容器中，只有符合一定的条件，才会将Bean对象注册到IOC容器中


//SpringBoot自动配置注解@Conditional
/*
@Conditional注解是SpringBoot提供的一个条件注解，表示只有满足一定的条件，才会将当前的Bean对象注册到IOC容器中
@Conditional注解可以添加在类上，也可以添加在方法上
如果添加在方法上，表示只有满足一定的条件，才会将当前方法返回的Bean对象注册到IOC容器中
如果添加在类上，表示只有满足一定的条件，才会将当前类中的Bean对象注册到IOC容器中，但提前是当前环境要得满足方法上添加地@Conditional注解的条件，
才会将当前类中的Bean对象注册到IOC容器中

@Conditional注解本身是一个父注解，派生出了很多子注解
常见地有三个
@ConditionalOnClass:判断环境中是否有对应字节码文件，才将对应的Bean对象注册到IOC容器中
例如:@ConditionalOnClass(name = "com.redis.clients.jedis.Jedis")或@ConditionalOnClass(Jedis.class)
//判断环境中是否有com.redis.clients.jedis.Jedis字节码文件，有才将对应的Bean对象注册到IOC容器中
只要引入了该依赖，SpringBoot就会将有对应地字节码文件

@ConditionalOnMissingBean:判断环境中(IOC容器中)没有对应的Bean(类型或名称)，才将对应的Bean对象注册到IOC容器中
例如:
@Bean
@ConditionalOnMissingBean
public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory){
}
//判断环境中(IOC容器中)没有redisTemplate类型的Bean对象，没有才将对应的Bean对象注册到IOC容器中


@ConditionalOnProperty:判断配置文件中是否有对应的属性和值(属性和值要求完全一样)，才将对应的Bean对象注册到IOC容器中
例如:@ConditionalOnProperty(name = "redis.host", havingValue = "192.168.1.1")
//判断配置文件中redis.host属性的值是否为192.168.1.1，有才将对应的Bean对象注册到IOC容器中


 */
如果自己定义自动配置类，并完成自动配置功能?
1、定义自动配置类
2、将自动配置类配置在META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports文件中

//SpringBoot自定义Starter
/*
Starter:指的是引入的依赖，就称之为Starter依赖包，SpringBoot官方提供了很多个starter依赖包，
而Starter包含两个部分的功能:起步依赖和自动配置
应用场景:一些第三方工具提供了组件jar包，但是没有提供SpringBoot的starter依赖包，
此时就可以自己定义一个starter依赖包，来实现起步依赖和自动配置功能，便于开发者之间互相使用
所以需要定义一个starter后缀的模块，一个autoconfigure后缀的模块，
starter后缀的模块需要引入autoconfigure后缀的模块的依赖，从而使用的时候就只需要引入starter依赖包就行了
定义规范:
如果是SpringBoot官方提供的starter依赖包，那么spring-boot在前
例如:
spring-boot-starter-xxx:starter后缀的模块
spring-boot-autoconfigure-xxx:autoconfigure后缀的模块
组件名称在前则是第三方提供的Starter依赖包
例如：
mybatis-spring-boot-starter:mybatis的starter依赖包
mybatis-spring-boot-autoconfigure:mybatis的autoconfigure后缀的模块

需要将自动配置模块的自动配置类配置在
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports文件中
需要在resources目录下创建META-INF目录再创建spring目录
再创建org.springframework.boot.autoconfigure.AutoConfiguration.imports文件，
最后在该文件中添加自动配置类的全类名，
当启动类启动时，
SpringBoot会扫描META-INF/org.springframework.boot.autoconfigure.AutoConfiguration.imports文件，
 */



面试问题:
注意！！！
虽然SpringBoot提供了自动配置功能，只要引入依赖就可以自动将第三方Bean对象注册到IOC容器中，
是不是以后都不需要手动配置第三方Bean了呢？

不是的，以下五种场景必须手动配置第三方Bean
第一:需要修改第三方的默认参数，自动配置的第三方Bean对象无法满足需求
例如:
RedisTemplate，SpringBoot自动配置的RedisTemplate对象的key和value的序列化方式默认是JdkSerializationRedisSerializer，
这种序列化只能将Java对象序列化成二进制数据，无法将Java对象序列化成JSON数据
此时如果需要将Java对象序列化成JSON数据，就需要手动配置RedisTemplate对象，修改key和value的序列化方式

第二:SpringBoot自动配置暴露的配置属性有限，复杂逻辑无法在yml中表达
例如:
RabbitMq, SpringBoot自动配置的RabbitMq对象，只能在yml中配置简单的连接信息
如果想要在yml中配置自定义的交换机、队列、绑定关系、死信队列无法做到
此时就只能手动配置RabbitMq对象，来实现自定义的交换机、队列、绑定关系、死信队列

第三:同一类型，需要多个实例(多数据源、多Redis连接)，SpringBoot自动配置的Bean对象是单例的，无法满足需求
例如:
项目需要同时连接两套Redis:一个缓存一个消息队列。此时只能手动创建多个RedisTemplate对象，并分别注册到IOC容器中
并使用@Qualifier注解指定不同的Bean对象

第四:第三方的组件没有提供SpringBoot的starter依赖包，无法使用自动配置功能
例如:
项目中使用了阿里云的OSS对象存储服务，阿里云提供了OSS的jar包，但是没有提供SpringBoot的starter依赖包，
此时就只能手动配置AliyunOSS对象，并注册到IOC容器中

第五:需要对第三方的Bean进行包装、增强、自定义初始化逻辑
例如:
RestTemplate，SpringBoot自动配置的RestTemplate对象是没有设置超时时间，没有自定义拦截器
如果需要添加请求拦截器统一打印日志，那就手动构造RestTemplate Bean