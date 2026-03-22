//微服务:是一种软件开发架构风格，它以专注与单一职责的很多小型项目为基础，组合出复杂的大型应用
//之前我们使用的都是单体项目，所有的功能都在一个项目中，会造成模块之间耦合度过高，不好维护
//微服务：将一个单体项目的各个功能拆分成各个小型项目，每个项目只负责一个功能，可以降低耦合度，提高可维护性

//学前技术:MybatisPlus、Docker
//MybatisPlus:是一个Mybatis的增强工具,用于持久层的框架。在Mybatis的基础上只做增强不做改变
//入门
/*之前的项目咱们主要是配置单表的CRUD(增删改查)，而MybatisPlus只需要简单配置。即可快速进行单表CRUD操作，大大节省时间
*
* 入门案例:使用MybatisPlus改造，一个由传统Mybatis方式实现的CURD示例
* 需求:基于课前资料中提供的项目，实现以下功能
* 新增用户功能、根据ID查询用户、根据ID批量查询用户、根据ID更新用户、根据ID删除用户
* 步骤:
* 1、引入MybatisPlus的起步依赖，其中集成了Mybatis和MybatisPlus的所有功能，并且实现自动装配
* <dependency>
  <groupId>com.baomidou</groupId>
* <artifactId>mybatis-plus-boot-starter</artifactId>
* <version>3.5.3.1</version>
* </dependency>
* 用来替代原来的Mybatis的starter
* 2、自定义Mapper继承MybatisPlus的BaseMapper接口
* baseMapper接口中定义了各种CRUD方法。
* 使用时只要调用继承的对应的方法既可，会自动生成SQL语句进行操作，十分的方便几乎不需要自己写代码
* 注意！！！继承时的泛型，就是操作的实体类，且这只是单表，用到多表时还是需要写SQL语句
*
* 问题:MybatisPlus是怎么知道要操作哪个表？
* MybatisPlus是通过扫描实体类，并基于反射获取实体类信息作为数据表信息
* 约定规则:
* 会根据实体类的名字作为数据表名，表名用的驼峰转下划
* 名为id的变量会作为主键
* 变量名也是驼峰转下划线作为数据表的字段名，即createTime->create_time
*
* 如果该实体类不满足这个约定，就需要我们自己自定义表名、主键字段、字段名
* 比如:实体类是User、而表名是tb_user。就需要在类名上加@TableName("tb_user")
* 否则会报错
* 这就要了解一下常见的注解
*/
// 常见注解:
/* @TableName:指定表名
* @TableId:指定表中的主键字段信息
* 假如这个主键字段是自增长的，需要添加@TableId(value="id",type = IdType.AUTO)
* idType枚举值:
* AUTO:表示自增
* INPUT:通过set方法自行输入
* 注意！！如果是自增长的，但是不指定出来的话，默认使用雪花算法生成20位的Long类型ID
* ASSIGN_ID:分配ID，是基于MybatisPlus提供的indentifierGenerator接口的nextId方法生成的ID(Long型的)
* 默认实现类为DefaultIdentifierGenerator雪花算法
* @TableField:指定表中的普通字段信息
* 注意！！！即使变量名和字段名一致，
* 如果变量名是以is开头，且是布尔类型，
* 那么经过反射后，字段名会自动去掉is，导致查询结果为false，这种就业需要添加@TableField("is_xxx")
* 如果变量名是SQL语句中的关键词，例如:order、limit等。为了防止冲突，需要添加@TableField("`order`"),还要加上反义字符`
* 如果某个变量不是数据库字段，需要添加@TableField(exist = false)，标记这个不是数据库字段
*
*
* 常见配置:
* MybatisPlus的配置继承了MyBatis的原生配置和一些自己特有的配置
* 例如:
* mybatis-plus:
*  type-aliases-package:com.wwj.mp.domain.po 别名扫描包
*   mapper-locations:"classpath星号:/星号星号/星号.xml" Mapper.xml文件地址，这是默认值
*  configuration:
*     map-underscore-to-camel:true 是否开启下划线和驼峰命名，默认开启
*     cache-enabled:false 是否开启二级缓存功能，默认关闭
*   global-config:
*     db-config:
*        id-type:assign_id 默认主键为雪花算法
*        update-strategy: not——null 默认更新策略，只更新非空字段
* 注意！！！
* 虽然全局配置的id-type是雪花算法。但是如果添加了注解，还是使用注解的配置，优先级高于全局配置
* */

//补充注意！！！
/*
* 在MybatisPlus中，有两种情况可以不用添加@Mapper注解也能将Mapper接口注册为Spring Bean
* 1、如果在启动类上添加@MapperScan注解，那么会自动扫描这个包下的所有Mapper接口
* 并为它们生成代理类，将其注册为Spring Bean
* 2、要是依赖了MybatisPlus的starter，那么MybatisPlus会自动注册所有继承BaseMapper接口的Mapper接口为Spring Bean
*
*
* 注意！！！
* Mysql的自增是从上一个插入的ID开始，而不是从1开始
* 如果上一个是雪花算法，那么下一个就是从雪花算法生成的ID开始
* */

//核心功能
//条件构造器:因为上述使用MybatisPlus的方法执行的SQL语句中Where条件都是默认根据ID的，
/* 想要用MybatisPlus的方法执行更复杂的SQL的Where条件。就需要用到条件构造器
* 源码中可以看到BaseMapper接口中的各个方法的参数都有Wrapper，这个Wrapper类就是条件构造器
* 它的子类AbstractWrapper类中定义了很多方法，用于设置条件
* 例如:getEntity()、eq()、ne()、gt()、ge()、lt()、le()、like()(模糊匹配)、等等
* 这些方法后面跟着的children是为了链式调用，让每个方法的返回值都是这个类，
* 不用childer的话，会返回它的父类导致无法链式调用
*
* 之前的查询语句都是星号全部查询，QueryWrapper类中定义了select(String……)可以筛选要查询的字段
* 就不需要查到对象后，再用对象的get找了，输出对象时只有被查询的字段有值，其他的为null
*
* UpdateWrapper类中定义了很多方法，用于设置更新条件,其中setSQL()方法可以在更新时直接设置SQL片段(非Where条件)
* 例如:
* Update user SET balance=balance-200 WHERE username='jack'
* UpdateWrapper updatewrapper=new UpdateWrapper<>().setSQL("balance=balance-200").eq("username","jack");
*
* 案例:基于QueryWrapper实现查询
* 1、查询名字中带o的，存款大于等于1000元的人的Id、username、info、balance字段
* 2、更新用户名为jack的用户的余额为2000元
* 步骤:
* 1、先创建QueryWrapper对象，再调用方法设置条件
* 2、调用BaseMapper接口中的方法，传入QueryWrapper对象
* 3、返回结果
* QueryWrapper<User> wrapper=new QueryWrapper<>()
* .select("id","username","balance","info")
* .like("username","o")
* .ge("balance",1000);
* userMapper.selectList(wrapper);
*
*  User user = new User();
      user.setBalance(2000);
      QueryWrapper<User> updateWrapper = new QueryWrapper<User>()
              .eq("username","jack");
      userMapper.update(user,updateWrapper);
* 这个wrapper就是查询的条件
*
* 案例:基于UpdateWrapper实现更新
* 1、更新Id为1、2、4的用户余额扣200
* UpdateWrapper<User> updateWrapper = new UpdateWrapper<User>().setSQL("balance=balance-200").in("id",1,2,4);
* userMapper.update(null,updateWrapper);
* 这里能为null是因为，它的设计是双模式更新
* 模式一:实体更新模式(第一次参数传实体)
* 如果entity不为null，那么会根据entity的Id值进行更新
* 例如:
* User user = new User();
* user.setId(1);
* user.setUsername("jack" );
* user.serIphone("12345678901");
* userMapper.update(user,null);
* 模式二:Wrapper自定义更新模式(第一次参数为null，更新逻辑完全由第二个参数UpdateWrapper定义)
* 注意!!!必须是UpdateWrapper调用了set()、setSql()等方法
* 例如:
* UpdateWrapper<User> updateWrapper = new UpdateWrapper<User>().setSQL("balance=balance-200").in("id",1,)
* userMapper.update(null,updateWrapper);
*
* 由于上述的这些SQL构造器的参数都是写死的，属于硬编码了，此时就需要用到LambdaxxxxWrapper
* 使用LambdaxxxxWrapper的方式:new一个，或者用xxxwrapper的对象调用lambda()方法
* 该类的方法的参数只能是SFunction<>接口的实现类
* 例如:
* LambdaUpdateWrapper<User> updateWrapper = new LambdaUpdateWrapper<>();
* updateWrapper.set(User::getBalance,User::getBalance.subtract(200)) 用的是方法引用，MybatisPlus会通过反射获取User类中的balance字段，并调用subtract()方法
* 然后赋给balance字段
* 建议多使用LambdaQueryWrapper和LambdaUpdateWrapper避免硬编码
*/

//自定义SQL:
/*
* 我们可以利用MybatisPlus的Wrapper来构建复杂的Where条件，然后自己定义SQL语句剩下的部分
* 入门案例:将id在指定范围的用户(1、2、4)的余额扣减指定值
* SQL:update user set balance=balance-200 where id in (1,2,4)
* UpdateWrapper<User> updateWrapper = new UpdateWrapper<User>().setSQL("balance=balance-200").in("id",1,2,4);
* 这种写法可以，但是在企业中要求是将SQL语句写在Mapper层或XML文件中，而不是在业务层中。这里将balance=balance-200的部分SQL拼在业务层了
* 为了解决这种问题，能使用MybatisPlus写SQL。就用到了自定义SQL
* 步骤:
* 1、在业务层中使用条件构造器Wrapper定义Where条件，并调用一个自定义的Mappper层的方法
* 2、在该方法中拼接自定义SQL并和Where进行拼接
* 注意！！！在自定义的方法参数中用@Param("ew")注解声明wrapper变量名称，必须是ew,也可以是Constants.WRAPPER本质一样是ew
* 拼接时只需要用${ew.customSqlSegment}即可,MybatisPlus会自动解析(custom:自定义)。#{}占位符替换方法的参数、${}拼接符
* 注意！！！XML语句中表名要写对
*
*
* */
//Service接口:
/*
*只要继承了MybatisPlus提供的IService接口，那么一些增删改查的Service层代码也可以不用自己写，MybatisPlus会自动实现。爽之爽之！！！
*IService接口中定义了增删改查的方法，要的什么方法，就调用什么方法
* 新增:
* save(T entity):存储一个对象，底层再调用baseMapper.insert(entity)
* saveBatch(Collection<T> entityList):批量存储对象，之前实现批量新增还需要在Mapper.XML中写<foreach>来循环新增
* saveOrUpdate(T entity):存储或更新对象，它的底层会根据传过的数据中是否有Id进行判断是存储还是更新，有Id则更新，没有Id则存储
* saveOrUpdateBatch(Collection<T> entityList):批量存储或更新对象
* 删除:
* removeByIds(collection<?>)和removeBatchById(collection<?>)都是批量删除
* 但是区别是:
* removeByIds(collection<?>)底层调用baseMapper.deleteBatchIds(idList),
* 生成的是单条的SQL:delete from table where id in (1,2,4)
* removeBatchById(collection<?>)底层调用baseMapper.deleteById(id),
* 生成的是多条的SQL:delete from table where id=1 delete from user where id=2 delete from user where id=4
* 应用场景:数据较多时，建议使用removeBatchById(collection<?>)，否则一般使用removeByIds(collection<?>)
* 如果是复杂的条件，建议使用remove(Wrapper<T> wrapper)。
* 修改:
* updateById(T entity):根据Id更新对象，底层调用baseMapper.updateById(entity)
* update(T entity,Wrapper<T> wrapper):根据Wrapper条件更新对象，底层调用baseMapper.update(entity,wrapper)
* updateBatchById(Collection<T> entityList):批量更新对象，底层调用baseMapper.updateBatchById(entityList)
*
* 查询:
* 如果是查询一个对象使用get开头的方法，返回值为一个对象
* 如果是查询多个对象使用list开头的方法，返回值为一个集合，ListByIds(collection<?>)根据ID集合查询，List(Wrapper<T>)根据Wrapper条件查询
* 如果是查询数量使用count开头的方法，返回值为一个Long数量值
* 如果是分页查询使用page开头的方法，返回值为一个Page对象
* 因为之前的要进行复杂条件的查询是，需要创建Wrapper对象(条件构造器)，很是麻烦。
* 这里可以使用LambdaQuery/LambdaUpdate()方法，它们的返回值就是Wrapper对象，再调用方法组成条件就行
* 前面只是组成条件，最后还是要掉Iservice接口中的方法list()、update()才能获取结果
*
* */

//使用这些方法
/*
* 需要定义一个接口来继承IService，如果创建一个类实现这个自定义的接口，需要这个类实现IService接口中的方法。这会很麻烦
* 为此，MybatisPlus提供了IService接口的实现类ServiceImpl，这个类实现了IService接口中的方法，并且定义了泛型T，T是继承了BaseMapper的Mapper接口的泛型
* 例如:ShopMapper extends BaseMapper<Shop>这个T就是shop。
* 然后用我们定义的业务逻辑类继承ServiceImpl<ShopMapper,Shop>并实现自定义的接口
* 例如:
* public interface ShopMapper extends BaseMapper<Shop>{}
* public interface IShopService extends IService<Shop>{}
* public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService
* 使用这个ShopMapper作为泛型，访问数据库时就可以直接使用这个Mapper中的增删改查去访问，不用再写一遍
*
* 注意！！！只要调用Iservice中的方法，MybatisPlus会自动调用BaseMapper中的方法
* */

//基于Restful风格实现接口
/*
* 需求:
* 新增用户:请求方式POST,请求路径/user,请求参数:用户表单实体(JSON格式)，返回值无
* 删除用户:请求方式DELETE,请求路径/user/{id},请求参数:用户Id,返回值无
* 根据Id查询用户:请求方式GET,请求路径/user/{id},请求参数:用户Id,返回值:用户VO
* 根据Id批量查询用户:请求方式GET,请求路径/users,请求参数:用户Id集合,返回值:用户VO集合
* 根据Id扣减余额:请求方式PUT,请求路径/user/{id}/dedaction/{money},请求参数:用户Id和金额,返回值无
*
*/
//方法:
/* 使用LambdaQuery/LambdaUpdate()方法
* LambdaQuery()需求:实现一个根据复杂条件查询用户的接口，查询条件如下:
* name:用户名关键词，可以为空
* status:用户状态，可以为空
* minBalance: 最小余额，可以为空
* maxBalance: 最大余额，可以为空
* 可以为空，需要使用@RequestParam(required=false)
* 使用LambdaQuery()方法，lambdaQuery().like(name!=null,User::getUsername,name)
* like的前部分是condition参数，只用condition为true时才会执行like方法
* 类似与SQL语句中的
* <if test="name!=null">
*  and username like concat('%',#{name},'%')
* </if>
*
* 注意！！！
* like 只有加上%才是模糊查询，如果只写name，那么name=name
* 但是MybatisPlus的like方法中，生成的SQL会自动添加%，
*  例如:
   lambdaQuery().like(User::getUsername, "张")
   SQL: WHERE username LIKE '%张%'
 MybatisPlus不会加上Contact，因为它会进行转义操作，不用担心SQL注入风险
 *
 * LambdaUpdate()需求:改造根据id修改用户余额，要求
 * 1、完成对用户状态的校验
 * 2、完成对用户余额的校验
 * 3、如果扣减后余额为零，则将用户状态改为冻结(2)
 *
 *注意！！！！
 * 这种会有很严重线程安全问题，
假设有两个请求同时扣减同一个用户的余额：
* 时间轴 →

线程 A                                    线程 B
----                                      ----
t1: 查询用户余额 (读到 100)
                                          t2: 查询用户余额 (也读到 100)
t3: 计算剩余余额 = 100 - 50 = 50
                                          t4: 计算剩余余额 = 100 - 80 = 20
t5: 更新余额为 50
                                          t6: 更新余额为 20
最终余额：20 元（错误！）
正确的结果应该是：
第一次扣减 50 元 → 余额 50 元
第二次扣减 80 元 → 余额不足，应该失败
或者：如果都成功，余额应该是 100 - 50 - 80 = -30 元（透支）
但实际发生了数据覆盖，丢失了其中一次扣减操作！
*
* 解决方案:使用锁或者使用原子操作
* 原子操作:指的是一个操作或多个操作要么全部执行成功，要么全部不执行，在执行过程中不会被任何因素打断。
* 锁:锁是解决多线程访问数据时，数据不一致的问题。
* 使用乐观锁(compare………………update)
* 在LambdaUpdate()方法中，使用eq(User::getBalance,user.getBalance).update()
* 确保查询之后的余额和现在余额一样，没被别的线程修改。才能继续执行更新操作
*
*
* 使用Iservice进行批量新增
* 需求:批量插入10万条数，并作出对比
* 1、普通的for循环，每次都调用save插入 一个
* 2、使用Iservice的saveBatch()方法，批量插入，每次插入1000条数据，调用100次saveBatch()方法
* 3、开启rewriteBatchedStatements=true参数
* 第一种插入，每插入一次要访问一次数据库，需要访问10万次，很是耗时
* 第二种插入，使用的时MP底层的预编译方案，会先将每条user数据编译成SQL语句，
* 执行saveBatch的时候将1000条数据，一次性提交到数据库，1000条也就访问一次数据库。所以10万条数据，只会访问100次数据库
* 但是由于是每次还是有1000条单独的SQL语句，MySQL需要一条条的执行，不够高效
* 如果能把1000条SQL语句合成一条SQL语句，执行一次，就会快很多
* 把这种
INSERT INTO tb_user (username, password, phone, info, status, balance, create_time, update_time)
VALUES ('user1', 'pwd1', '138001', 'info1', 1, 100, NOW(), NOW());

INSERT INTO tb_user (username, password, phone, info, status, balance, create_time, update_time)
VALUES ('user2', 'pwd2', '138002', 'info2', 1, 200, NOW(), NOW());

INSERT INTO tb_user (username, password, phone, info, status, balance, create_time, update_time)
VALUES ('user3', 'pwd3', '138003', 'info3', 1, 300, NOW(), NOW());
* ……………………
* 变为
*INSERT INTO tb_user (username, password, ...)
VALUES
('user1', 'pwd1', ...),
('user2', 'pwd2', ...),
('user3', 'pwd3', ...),
...
('user100000', 'pwd100000', ...);
* 此时就可以开启rewriteBatchedStatements=true参数，MySQL会自动将1000条SQL语句合成一条SQL语句，执行一次
* 这是Mysql提供的批量插入的优化方案
*
访问数据库就像打电话：
每次 save() = 打一次电话说一件事
saveBatch 未优化 = 每 1000 件事集中打一次电话
saveBatch 已优化 = 发一条超长短信说完所有事
网络请求就是"打电话"这个过程本身！
*
*
* 网络请求:你的程序向另一个程序发送数据并等待响应
* save就类似:
* 应用 → 数据库：SQL1  (请求 1)
  应用 ← 数据库：结果 1 (响应 1)
* 未优化的saveBatch:
* 应用 → 数据库：[SQL1 + SQL2 + ... + SQL1000]  (请求 1)
  应用 ← 数据库：[结果 1 + 结果 2 + ... + 结果 1000] (响应 1）
 把1000个SQL语句合成一个大的网络包，发送给数据库，数据库一次处理完，返回结果给应用，应用一次处理完，返回结果给应用。
   saveBatch优化后:只有一条SQL语句
   发送一次网络请求，数据库一次处理完，返回结果给应用，应用一次处理完，返回结果给应用。

！！！！减少网络请求次数 = 提升性能的关键
* */


//代码生成
/*
* 发现控制、业务、持久层的代码都是重复的，可以复用，还发现只要表名变了类名会跟着变，因此可以根据表的信息来自动生成代码
* 如何自动生成？
* 使用MybatisPlus提供的代码生成器插件，MybatisPlus(图标初音未来)，安装后，
* 点击工具选项中的Config DataBase，选择数据库，再点击Code generator，选择表，生成代码
*
* */

//MybatisPlus扩展功能
//Db静态工具
/*
* 这里的包含的方法和Iservice的包含方法几乎一样，只是静态方法，不需要创建对象，直接调用
* 与Iservice不同的是
* 因为实现Iservice接口的类，需要指定泛型，泛型就是实体类，通过反射得到实体类的字节码，才能查到对应表的信息，从而进行增删改查
* 而Db是静态的，不能在类上和方法上添加泛型，因此无法获取实体类的字节码，
* 只能给方法的参数添加需要的类型的字节码，从而获取表信息，
* removeById(Serializable id,class<T>)、list、get、page、count等等
*
* 练习案例:
* 1、改造根据id查询用户的接口，查询用户的同时，查询出用户对应的所有地址
* 2、改造根据id批量查询用户的接口，查询用户的同时，查询出用户对应所有的地址
* 3、实现根据用户id查询收货地址功能，需要验证用户状态，冻结用户抛出异常
* 1需要在UserServiceImpl中注入AddressService。3有需要在AddressServiceImpl中注入UserService
* 这就造成了循环依赖
* 小补充！！！！
* 循环依赖：A类依赖B类，B类依赖A类，就会产生循环依赖，导致无法创建对象，无法注入
* 例如:：UserService 和 OrderService相互依赖
*  public static void main(String[] args) {
        // 尝试创建 UserService
        UserService userService = new UserService();

        // UserService 的构造器中需要 OrderService
        // 所以先要创建 OrderService
        OrderService orderService = new OrderService(userService);  // 发现 OrderService 需要 UserService（@Autowired）
        ⚠️ 但此时 userService 还没创建完！

        // 把 orderService 注入给 userService
        userService.setOrderService(orderService);  // ⚠️ 但 orderService 也需要 userService
       无限循环
    }
}
* 所以就使用静态工具类解决循环依赖问题，直接使用DB工具类调用方法，而不是注入。
*Db.xxxx(T.class).eq()/in()
*
* 新知识:可以用Stream流的collect(),中的Collectors.groupingBy(),按照指定字段进行分组
* Map<Long, List<AddressVO>> collect = addressVO.stream()
* .collect(Collectors.groupingBy(AddressVO::getUserId));
*
* 第三个练习，请求路径为/users/{id}/address，方法参数要添加@PathVariable("id") Long userId
* */

//逻辑删除:就是基于代码逻辑模拟删除效果，但并不会真正的删除数据
/*
* 应用场景:用户端的购物订单，用户将他的购物订单删除，只是逻辑删除并不会真正的删除，因为商家是需要订单数据进行统计的
* 逻辑删除的思路:
* 在表中添加一个字段标记数据是否被删除
* 当删除数据时把标记置为1
* 查询时只查询标记为0的数据
* 那么此时操作数据库的SQL语句应该是Update来改变标记，而不是Delete来删除数据
* 例如:标记字段为deleted，0表示未删除，1表示已删除
* Update user set deleted=1 where id=1 and deleted=0
* 这里的deleted=0是为了防止重复删除，已经被删除了，就不需要再删除了
* 查询时:Select * from user where deleted=0
* 为此MybatisPlus提供了逻辑删除功能，无需改变方法调用的方式，而是在底层帮我们自动修改CRUD的语句，
* 我们要做的是在application.yml中添加逻辑删除的字段名和值即可
* Mybattis-plus:
*     global-config:
*        db-config:
*           logic-delete-field: deleted #全局逻辑删除的实体字段名，字段类型可以是boolean、Integer
*           logic-delete-value: 1 #逻辑已删除值，字段类型可以是boolean、Integer
*           logic-not-delete-value: 0 #逻辑未删除值，字段类型可以是boolean、Integer
*
* 注意！！！
* 使用逻辑删除后，除非自己手写Mapper.deletexxx()方法等方法才能真正的物理删除，
* 否则MybatisPlus会自动生成逻辑删除的SQL语句，不会真正的删除数据
*
*
* 但是缺点是:
* 当用户很多时，由于逻辑删除不会真正删除数据，那么数据库中数据会越来越多，
* 占用空间也会变大，而且逻辑删除的底层还要进行对逻辑字段判断，影响查询效率。
* 因此，不太推荐使用逻辑删除的方式，如果数据真的不能删除，可以去采用表迁移的方式，
* 将数据迁移到一个新的表中，旧表中的数据就可以删除了
*
* */

//枚举处理器
 /*
 * 对于表示用数字表示状态的情况，如果硬记这些数字和状态之间的对应关系，那么会很麻烦，
 * 可以使用枚举类来处理，枚举类中定义了多个枚举值/项，每个枚举值都表示一种状态，
 * 例如:用1表示正常，2表示冻结
 * public enum UserStatus {//枚举类
 *  NORMAL(1, "正常"),
 *  FROZEN(2, "冻结");
 * private final int value;
 * private final String desc;
 *
 * UserStatus(int value, String desc) {
 * this.value = value;}
 *  this.desc = desc;
 * }
 *
 *
 * */