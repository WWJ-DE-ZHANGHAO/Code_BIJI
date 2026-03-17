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
* user.setUsername("jack");
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
* 1、在业务层中使用Wrapper定义Where条件，并调用一个自定义的Mappper层的方法
* 2、在该方法中拼接自定义SQL并和Where进行拼接
* 注意！！！在自定义的方法参数中用@Param("ew")注解声明wrapper变量名称，必须是ew,也可以是Constants.WRAPPER一样是ew
* 拼接时只需要用${ew.customSqlSegment}即可,MybatisPlus会自动解析(custom:自定义)。#{}占位符替换方法的参数、${}拼接符
* 注意！！！XML语句中表名要写对
*
*
* */
//Service接口:
/*
*只要继承了MybatisPlus提供的IService接口，那么一些增删改查的Service层代码也可以不用自己写，MybatisPlus会自动实现。爽之爽之！！！
*
*
*
*
* */