//IOC容器:Bean对象注入
/*
注意！！！
@Autowired注入有三种方式:属性注入、Setter方法注入、构造器注入
属性/字段注入
public class AliyunOSSperator {
@Autowired
private AliyunOSSProperties aliyunOSSProperties;
}
底层原理:
1、先通过无参构造创建AliyunOSSperator对象，此时AliyunOSSProperties对象还没有被创建，成员变量aliyunOSSProperties为null
将半成品AliyunOSSperator对象放入三级缓存中

2、再执行populateBean(AliyunOSSperator)方法填充(populateBean()是AbstractAutowireCapableBeanFactory类中的方法)
会触发AutowiredAnnotationBeanPostProcessor。扫描AliyunOSSperator类中被@Autowired注解的成员变量，

3、根据根据AliyunOSSProperties类型从IOC容器中获取AliyunOSSProperties对象，并注入到AliyunOSSperator对象中

4、如果IOC容器中没有AliyunOSSProperties对象，开始创建AliyunOSSProperties的Bean对象

5、也是先通过无参构造创建AliyunOSSProperties对象，再执行populateBean(AliyunOSSProperties)方法填充，
会触发AutowiredAnnotationBeanPostProcessor。再扫描AliyunOSSProperties类中被@Autowired注解的成员变量，
如此循环，
6、如果AliyunOSSProperties类中没有被@Autowired注解的成员变量，
就会创建完成AliyunOSSProperties对象，并将其存入到一级缓存中
7、将AliyunOSSProperties对象从一级缓存中取出，通过反射field.set(AliyunOSSperator, aliyunOSSProperties)方法
将AliyunOSSProperties的Bean对象注入到AliyunOSSperator中的aliyunOSSProperties成员变量中
8、将AliyunOSSperator对象从三级缓存中取出，放入到一级缓存中，完成AliyunOSSperator对象的创建

Setter方法注入
public class AliyunOSSperator {
private AliyunOSSProperties aliyunOSSProperties;
@Autowired
public void setAliyunOSSProperties(AliyunOSSProperties aliyunOSSProperties){
    this.aliyunOSSProperties = aliyunOSSProperties;
}
底层原理:
1、也是先通过无参构造创建AliyunOSSProperties对象，此时AliyunOSSProperties对象还没有被创建，成员变量aliyunOSSProperties为null
2、将半成品AliyunOSSperator对象放入三级缓存中，开始进入populateBean(AliyunOSSperator)方法填充，
3、会触发AutowiredAnnotationBeanPostProcessor。扫描AliyunOSSperator类中被@Autowired注解的成员变量和Setter方法
找到setAliyunOSSProperties()方法，
4、根据根据AliyunOSSProperties类型从IOC容器中获取AliyunOSSProperties对象，
反射通过setAliyunOSSProperties()方法的对象，调用invoke()方法，执行setAliyunOSSProperties()方法，
5、给成员变量aliyunOSSProperties赋值。

构造器注入(Spring官方推荐)
public class AliyunOSSperator {
private final AliyunOSSProperties aliyunOSSProperties;
public AliyunOSSperator(AliyunOSSProperties aliyunOSSProperties) {
   this.aliyunOSSProperties = aliyunOSSProperties;
   //注意！！
   //此时不能使用AliyunOSSProperties种的被@Autowired注解的成员变量，
   //因为此时AliyunOSSProperties对象还没有被完全创建，成员变量还没有被赋值
 }
}
底层原理:
1、解析构造方法的参数类型
2、先从IOC容器中获取所有依赖的Bean，再通过反射执行构造方法Constructor.newInstance(aliyunOSSProperties)方法
创建AliyunOSSperator对象(与此相反的是字段注入:先通过无参构造创建对象，再填充依赖的Bean)
也会进入populateBean(AliyunOSSperator)方法填充，但是populateBean()方法只会扫描被@Autowired注解的成员变量和Setter方法，
不会扫描构造方法，所以不会执行什么逻辑
3、如果所依赖的Bean对象还没有创建，会先创建依赖的Bean对象，再交给IOC容器管理，
再作为参数传到构造方法。


注意！！！
@Autowired:从IOC容器中查找Bean时，会先按类型，如果有多个再按名称查找，
在注入的位置加上注解@Qualifier注解指定Bean对象的名称，来指定注入哪个Bean对象
可以给@Autowired注解添加required属性，
表示是否必须注入该Bean对象，
默认是true，表示必须注入该Bean对象，如果没有找到该Bean对象，就会报错
required=false，表示不必须注入该Bean对象，如果没有找到该Bean对象，就会注入null

@Resource:从IOC容器中查找Bean时，会先按名称，再按类型查找，
在注入的位置加上注解@Resource注解指定Bean对象的名称，来指定注入哪个Bean对象*/



//循环依赖
/*
循环依赖:多个Bean互相依赖对方
A需要B，B需要A

此时创建A的对象时，Spring需要先创建B的对象并交给容器管理，再注入给A对象
但是创建B的对象时又需要先创建A的对象并交给容器管理并注入给B对象，这样就会出现循环依赖的问题，死循环了。

如果是构造注入，无法解决循环依赖的问题
因为构造方法执行是在创建Bean对象的阶段，是第一步的阶段，此时不存在会有半成品
且构造注入的第一步就需要先获取所依赖的Bean对象，之后通过构造方法创建Bean对象，交给容器管理
例如:
@Component
Class A{
    private B b;
    @Autowired
    public A(B b){
    }
}
@Component
Class B{
    private A a;
    @Autowired
    public B(A a){
    }
}
面试问题:
不能先通过创建A和B的空参构造方法创建对象，再作为参数传入B/A的构造方法吗?
不能，
因为，有了带参构造，Java默认不会再提供空参构造方法，即使手动创建了空参构造方法，
因为Spring在解析Bean的时候已经选定使用有参构造作为创建Bean对象的方式，
不会自动切换成使用空参构造方法创建Bean对象的方式，
所以，即使使用空参构造方法创建对象，也不会被Spring管理交给IOC容器管理


如果是setter注入和字段注入，可以通过以下方法解决
例如:
    @Component
    class A{
        @Autowired
        private B b;
    }
@Component
class B{
    @Autowired
    private A a;
}
解决方案:
第一种.使用三级缓存解决循环依赖的问题
Spring的三级缓存:
一级缓存singletonObjects:存放完整就绪单例Bean(成品)
二级缓存earlySingletonObjects:存放提前暴露的半成品Bean(已经实例化，还没完成属性注入)
三级缓存singletonFactories:Bean工厂对象，用于生成代理对象(AOP)
流程:
1、Spring实例化A(调用无参构造，得到半成品A)
2、提前把半成品A放入三级缓存
3、开始给A填充属性，发现需要B
4、Spring实例化B(调用无参构造，得到半成品B)
5、提前把半成品B放入三级缓存
6、开始给B填充属性，发现需要A
7、Spring去三级缓存中找A，找到了半成品A，返回给B
8、B填充完属性后，把B返回给A，A完成属性注入
10、把A、B移入一级缓存，对外提供

第二种.使用Spring提供的@Lazy注解解决循环依赖的问题
创建时时先注入代理的，使用时再获取真实的Bean

建议:尽量解除互相依赖、避免A循环依赖B，B循环依赖A


注意！！！
高频面试题:
只能解决单例的Bean支持循环依赖解决方案!
多例Bean因为没有缓存机制，出现循环直接报错，且Spring不会缓存多例对象


Bean的生命周期(单例的字段注入和Setter注入):
BeanDefinition解析->选择构造器->创建半成品Bean->存入三级缓存->填充属性->创建成品Bean(AOP代理)->存入一级缓存->对外提供
BeanDefinition解析:Spring扫描@Component等注解/读取配置文件，把类信息(类名、作用域、注解信息、是否懒加载)封装成BeanDefinition对象

Spring三级缓存
三个缓存(DefaultSignletonBeanRegistry类中的三个Map)
一级缓存:
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>();
二级缓存:
private final Map<String, Object> earlySingletonObjects = new HashMap<>();
三级缓存:
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>();

一级缓存singletonObjects:存放完整就绪单例Bean(成品)，可以对外直接提供使用
二级缓存earlySingletonObjects:存放提前暴露的半成品Bean(已经实例化，还没完成属性注入)，
如果存在AOP代理，存放代理对象，用于避免重复调用三级缓存工厂创建代理
三级缓存singletonFactories:存放ObjectFactory工厂对象，核心方法geiObject()
如果当前Bean需要AOP则生成代理对象
如果不需要AOP返回原始半成品对象

查询规则:
先查询一直缓存SingletonObjects，如果一级缓存没有，
再查询二级缓存earlySingletonObjects，如果二级缓存没有，再查询三级缓存singletonFactories
如果存在工厂，调用getObject()创建对象存入二级缓存，并删除三级缓存记录
如果三级缓存也没有，代表Bean还没开始实例化，正常创建

面试问题:
为什么要三级缓存，不能只要一二级缓存吗，直接把半成品放入到二级缓存?
因为如果一开始原生对象(半成品)放到二级缓存中，后续如果需要AOP代理对象时，无法替换，
使用工厂可以在第一次被依赖引用时动态生成代理对象，保证全局使用同一个代理Bean
例如:
@Component
public class A{
    @Transaction //SpringAOP和事务@Transactional的底层实现都是动态代理
    public void test(){
        //逻辑
    }
}
A对象需要AOP代理，A和B循环依赖(字段注入)
假设:此时只有一二级缓存
1、使用空参创建A对象，并把A的原生对象(半成品)放入二级缓存
2、进入populateBean()方法，开始给A填充属性，发现需要B
3、使用空参创建B对象，并把B的原生对象(半成品)放入二级缓存
4、进入populateBean()方法，开始给B填充属性，发现需要A
5、此时去二级缓存中找A，找到了A的原生对象(半成品)，返回给B
6、B填充完属性后，把B返回给A，A完成属性注入
7、此时A开始执行创建Bean(初始化步骤)->此时AOP代理对象创建(创建A的代理对象)
因为只有代理对象才能执行SpringAOP的通知和事务中的方法
此时B中注入的A是原生对象(半成品)，不是代理对象，
所以B中的A无法执行AOP的通知和事务中的方法，
且此时容器中就存在原生和代理两个A的Bean对象违法了单例模式


如果此时有三级缓存:
singletonFactories工厂中有一个getEarlyBeanReference()方法,会判断是否需要代理，需要则生成代理
1、使用空参创建A对象，并把A的原生对象(半成品)放入三级缓存
2、进入populateBean()方法，开始给A填充属性，发现需要B
3、使用空参创建B对象，并把B的原生对象(半成品)放入二级缓存
4、进入populateBean()方法，开始给B填充属性，发现需要A
5、此时去三级缓存中找A，找到了A的工厂对象，发现需要A的代理对象，调用getEarlyBeanReference()方法生成代理对象
6、把A的代理对象提供给B，并放入二级缓存，B填充完属性后
7、把B返回给A，A完成属性注入
8、此时A开始执行创建Bean(初始化步骤)，发现已经创建过代理对象，直接返回代理对象到一级缓存，
并把A从三级缓存中删除，此时IOC容器中A的Bean对象只有代理对象，全局被拿到的A的Bean都是代理A,保证了单例模式

面试问题:
第一问:如果没有循环依赖，代理是什么时候开始创建的?
答"在给A进行属性填充后，A开始执行创建Bean(初始化步骤)，此时创建A的代理对象,不需要第三级缓存工厂

第二问:AOP代理不是在初始化阶段创建的吗，循环依赖为什么提前生成?
答:正常流程代理在初始化创建，但循环依赖场景下，其他bean要提前拿到半成品，如果暴露的是原生对象，
后续有创建了代理对象、此时容器中就存在原生和代理两个对象违法了单例模式
所以三级缓存工厂支持按需提前提供生成*/