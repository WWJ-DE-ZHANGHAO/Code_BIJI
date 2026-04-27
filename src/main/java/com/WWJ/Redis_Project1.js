//Redis项目实战
/*
* 实战项目为黑马点评，类似与大众点评社交类的项目
* 分为几个功能模块:
* 短信登录、商户查询缓存、达人探店、优惠券的秒杀、好友关注、附近商户、用户签到、UV统计
* 短信登录:使用Redis的共享session应用
* 商户查询缓存:企业的缓存使用技巧，解决缓存雪崩、穿透等问题
* 达人探店:基于List的点赞列表，基于SortedSet的点赞排行榜
* 优惠券的秒杀:Redis的计数器、Lua脚本Redis分布式锁、Redis的三种消息队列
* 好友关注:基于Set集合的关注、取关、共同关注、消息推送等功能
*
* 以下三个功能模块使用的是特殊的Redis数据结构
* 附近商户:Redis的GeoHash的应用
* 用户签到:Redis的BitMap数据统计功能
* UV统计:Redis的HyperLogLog的统计功能
*
* 这是一个前后端分离的项目、前端项目放在Nginx服务器，后端项目放在Tomcat服务器中
* */

//学前准备:导入项目、配置环境
/*
*导入项目中的表SQL
* 包括用户表、用户详情表、商户表、商户类型表、用户日记表(达人探店日记)、用户关注表、优惠券表、优惠券的订单表
* 导入后端项目到IDEA中，输入自己的虚拟机上的RedisIp地址和端口号以及密码。还有Mysql的连接信息
* 可以先输入http://localjhost:8081/shop-type/list查看返回的数据，从而知道后端是否正常运行
* 启动Nginx服务器，输入http://localhost:8080
*
* 还可以引入openAPI的依赖，从而可以生成API文档
* 依赖:
*<dependency>
   <groupId>org.springdoc</groupId>
   <artifactId>springdoc-openapi-ui</artifactId>
   <version>1.6.9</version>
</dependency>
* 运行项目后可以访问http://localhost:8081/swagger-ui/index.html查看API文档
* */

//基于Session的短信登录
/*
步骤:
* 发送验证码的前提条件:先校验提交的手机号是否合法
* 符合条件后，生成一个随机的验证码，将验证码保存在Session中，再发送验证码给用户
* 当用户登录时，从Session中获取验证码，与用户提交的验证码进行比较，如果一致。在根据手机号去数据库中查找用户的信息，
* 如果存在，则登录成功。否则跳转至注册页面，注意！！！登录成功后，将用户信息保存在Session中，以便于后续进行登录校验
* 校验登录时，将用户信息存放到ThreadLocal中，方便后续使用

编写接收前端发送验证码的请求的接口:
根据API文档:请求方式为POST，请求路径为user/code，请求参数为phone，电话号码，响应数据为无
将手机号传递给业务逻辑层，用RegexUtils工具类的isPhoneInvalid()方法校验手机号。如果合法返回true，否则返回false
再生成随机的验证码，并保存在Session中，返回给前端
注意！！！最好输出一个日志，可以在控制台看到生成的验证码

编写接收用户登录请求的接口:
根据API文档:请求方式为POST，请求路径为user/login，请求参数为phone和code，响应数据为无
将手机号和验证码传递给业务逻辑层，也需要用RegexUtils工具类的isPhoneInvalid()方法校验手机号。如果合法返回true，否则返回false
根据手机号去数据库中查询用户信息，如果存在，则返回true，否则返回false，再校验验证码，如果一致，则返回true，否则返回false
再拿着手机号去数据库中查询用户信息，如果存在，则登录成功，将用户信息保存在ThreadLocal中，返回给前端，否则跳转至注册页面
这里是使用IService接口提供的query()方法查询手机号，query().eq("phone",phone).one()
default QueryChainWrapper<T> query() {
        return ChainWrappers.queryChain(this.getBaseMapper());
    }
不存在的话就创建一个user对象，并用IService接口提供的save()方法保存到数据库中，再存入到session中
save(user)
存在的会就存入到session中并返回ok,并不需要和JWT令牌一样还需要返回token凭证
session是通过sessionId来验证登录的，访问tomcat时就会把这个sessionId写到cookie中，
之后请求时会将这个sessionId一并发送给后端，用这个sessionId就能找到对应的Session，找到session就能查看它存储的用户信息
注意！！！！没有用户会立即注册，注册完会自动登录。发现无法登录是因为还没有实现登录拦截器

实现登录拦截器:
因为该项目有许多的接口，如果每一个都要编写登录校验的代码，那么就会重复很多代码很麻烦，因此，我们可以使用拦截器进行统一的登录校验
将请求都交给拦截器处理，拦截器会先判断用户是否登录，如果登录了，则放行，如果没登录，则跳转至登录页面
注意！！！
并用ThreadLocal来保存用户信息，方便后续使用。“保证了线程安全”。
因为Web服务器是单线程单任务，它的线程池的工作模式:
线程A从池子里出来，领取了用户A的请求这个任务。线程A开始独占地执行这个任务，从Controller进去，到Service再到DAO，最后返回Response
只有当整个请求处理完毕后，线程A才会归还给线程池。
只要注意的是，如果线程A执行完用户A的任务后未清理ThreadLocal中的数据，而接手用户B的任务时，又未调用set去给ThreadLocal重新赋值。
，当调用get时，会发现拿到了用户A的信息。
为了避免这种情况，当请求结束时，需要强制调用remove()方法清理ThreadLocal的数据
拦截器Interceptor:
定义一个拦截器类，实现HandlerInterceptor接口
重写preHandle()方法，在请求处理之前执行，返回true表示继续处理，返回false表示取消处理
将ThreadLocal的set和get还有Remove方法封装成一个工具类UserHolder的静态方法中。保存用户信息时，调用这个工具类的set方法就行
重写afterCompletion()方法，在处理完成之后执行，一般用于资源清理工作
再创建一个配置类，将拦截器注册到容器中，可以设置放行那些请求路径

注意！！！登录操作只会创建Session。不会验证Session

* 隐藏用户敏感信息:
* 不直接将用户的完整信息存储到Session中，而是定义一个UserDto类，用于存储用户部分信息，把这个类存储到Session中
* 在登录查询用户是否存在时，将查到的用户通过BeanUtils.copyProperties()方法复制到UserDto类中，再存储到Session中
*


集群Session共享问题:多台Tomcat服务器之间并不共享session存储空间，当请求切换到不同tomcat服务器时导致数据丢失的问题
概念解释:Tomcat内部有一种叫Manager的会话管理器，负责Session的创建、查找、销毁，一个Tomcat中有多个Manager，
Manager隶属于Context(即Web应用上下文)的组件
每个Web应用项目都对应一个Manager，每个Manager之间是完全隔离的。一个Manager中有多个Session
通过Manager内部的ConcurrentHashMap保存，key是JSessionId，value是Session对象
解决方案:通过Redis实现Session共享，因为存储在Redis中的数据每台Tomcat都能访问到。且Redis是一个内存数据库，访问速度非常快。还是键值对存储
步骤:
1、将验证码、手机号等用户信息不在存储在Session中，而是存储在Redis中，这样，当用户请求切换Tomcat服务器时，Redis中的数据不会丢失
创建StringRedisTemplate类，并配置Redis数据库连接信息。
注意!!!
由于Redsi的存储是键值对，如果是用"code"和"phone"作为key,每个用户都有手机号，验证码，
因为键值对，键是唯一的。会导致一个用户将覆盖另一个用户的数据。应该用手机号作为key，验证码作为value
发送验证码时，将手机号作为key，验证码作为value存储到Redis中
此时验证验证码时，会用手机号作为key，从Redis中获取验证码，和用户输入的验证码进行比较
再根据手机号去数据库查询用户信息，判断用户是否存在，如果存在，则登录成功，将用户信息存储到Redis中，否则创建新用户保存到数据库，再保存到Redis中
存储用户信息时，可以用String类型，将用户信心转成Json格式，Value为JSON格式保存。或者用Hash类型，用户信息属性作为value的filter字段
Kye的话不要用手机号，不安全。用一个随机字符串token，作为Kye
保存信息后需要将token返回给前端，前端会将其放到请求头为"Authorization"的请求头中，方便之后从Redis中获取数据

为了防止用户量很大，导致Redis内存被占满，需要在存储验证码和用户信息时，设置过期时间
，如果用户很活跃经常登录，可以为其更新token的过期时间,只要他第一次登录后，在有效期内再次进行了登录验证就会刷新过期时间
问题:但是有一个小BUG,如果用户一直访问的页面是不需要登录验证的，就无法刷新过期时间？

解决方法:在原有拦截器的前面再加上一个拦截器，这个新的拦截器会先执行，并拦截所有请求，
获取token、查询Redis中的用户信息、保存到ThreadLocal中，刷新过期时间，并放行，后一个原有的拦截器会继续执行，从ThreadLocal中获取用户信息，
再判断获取到的是否为null，如果为null，则说明用户没有登录，则拦截，否则放行
再注册到配置类中，还可以设置order()，设置优先级，数值越小越先执行

出现的问题:用BeanUtil.beanToMap()方法将UserDto转换成Map时，会发现id的类型Long作为key，id值作为 value
而使用的类是StrignRedisTemplate，其底层的序列化器是StringRedisSerializer，这个序列化器只能序列化key和value都为String的
就导致无法将id序列化，从而报错

解决方法:在beanToMap的方法中添加参数
参数 1：new HashMap<>()
作用：指定返回的 Map 实例
原因：提供一个可变的 Map 用于接收转换后的数据
参数 2：CopyOptions.create()...
作用：配置 Bean 拷贝的行为规则
选项 1：setIgnoreNullValue(true)
作用：忽略值为 null 的字段
好处：减少 Redis 中不必要的存储，只保存有实际意义的字段
选项 2：setFieldValueEditor(...)
作用：对每个字段的值进行编辑处理
核心功能：将所有值转换为 String 类型
Long id = 123 → "123" (String)
String nickName = "张三" → "张三" (String)
null → "" (空字符串，避免空指针)




好玩的！！！！！
只要电脑和手机处于同一局域网下，前端项目跑在这个IP地址，使用ipconfig命令行获取当前的局域网IP。
再把后端的yml配置文件中添加address:0.0.0.0让任何都能访问后端
输入http://局域网IP+前端的端口号，手机就能访问前端。可以通过手机给电脑后端发送请求，电脑会返回数据给手机
 */

//商户查询缓存
/*
* 缓存是什么?
* 缓存时数据交互的缓冲区(称作Cache)，是存储数据的临时地方，读写性能较高
* 比如:计算机就是由内存、硬盘和CPU组成，CPU需要从内存或磁盘中读取数据，再进行计算。而内存和硬盘的读写速度远远赶不上CPU的计算速度，
* 因此CPU的计算速度会受到读写性能影响，为了解决这个问题，就在CPU的内部加上了一个缓存，
* CPU会将经常要用的数据写入缓存，当CPU高速运算，需要数据时，会直接从缓存中读取数据，不再从硬盘/内存中读取数据。这样CPU的计算速度就大大提高
* 所以缓存大小成为了CPU性能的重要指标，缓存越大，CPU计算速度就越快。
*
*
* 而在Web应用开发中，浏览器建立浏览器缓存(缓存页面的静态资源)，浏览器缓存中未命中的数据会去到tomcat服务器中，tomcat中也有应用层缓存(
* 比如创建一个Mapper，把数据库查询到的数据存储在Mapper中，以后要用到时直接从Mapper中读取就行，不用再访问数据库。
* (但最好用Redis作为应用层的缓存)，应用层未命中的数据去到数据库，数据库中也有数据缓存(Mysql是一个巨树索引，可以给Id创建索引，可以把这些索引缓存起来
* 当我们根据索引进行查询的时候，可以在内存里快速检索结果，不用每次都读写磁盘)
* 注意！！上述所谓的命中，就是想要的数据在缓存中有没有
* 缓存也个双面剑，
* 好处:降低后端负载(不用访问数据库读取磁盘)、提高读写效率/降低响应时间(不用数据读写磁盘，用Redis读写)
* 坏处:数据一致性成本(数据需要在数据库和Redis中各存一份)、代码维护成本(为了防止数据库中的数据变了，而Redis没变，缓存击穿/雪崩等。需要工作人员去维护)、运维成本
*
*
*
* 添加Redis缓存
* 在查询数据库之前，先查询Redis缓存，如果缓存中有数据，则直接返回，
* 如果没有数据，则查询数据库，并把数据写入Redis缓存，
* 下次查询时，直接从Redis缓存中获取数据
* 查询店铺信息缓存
* 请求路径: /api/shop/{id}
*
* 知识点补充:在SpringBoot中，可以用@Autowired注解和@Resource注解来注入对象
* @Resource是JDK提供的，@Autowired是Spring提供的
* @Resource和@Autowired的区别:
* @Resource默认按照名称进行注入，如果找不到，则按照类型进行注入
* @Autowired默认按照类型进行注入，如果在容器中找到多个，则按照名称进行注入
* @Autowired只适用于Spring容器，@Resource可适用于JDK容器和Spring容器
*
*
* 课后练习:修改ShopTypeController中的queryTypeList方法，添加Redis查询缓存
*
* 先查询Redis中是否存在数据，如果存在则直接返回，如果不存在则查询数据库，并把数据写入Redis缓存，下次查询时，直接从Redis缓存中获取数据
* //值为字符串类型的RedisTemplate
* 将整个集合转换成JSON格式的字符串，再写入Redis中。取出数据时，需要将JSON格式的字符串转换成list对象
*  ObjectMapper mapper = new ObjectMapper();
*   String shopTypeList = stringRedisTemplate.opsForValue().get("shopTypeList");
        List list = mapper.readValue(shopTypeList, List.class);
         //这是错误的写法，Jackson无法识别集合的泛型类型，无法正确反序列化
        List<ShopType> list = mapper.readValue(shopTypeList, new TypeReference<List<ShopType>>(){});
        //这才是正确写法，使用TypeReference来指定集合的泛型类型
        if(list!=null){
            return Result.ok(list);
        }
 //值为List类型的RedisTemplate
 集合类型是将集合的每一个元素逐个转化成JSON格式的再存储到Redis中的list中，
 查询时可以逐个取出JSON格式的元素，再转成对象。使用range方法获取list中的元素，参数为起始索引和结束索引，-1表示获取所有元素
    List<String> shopTypeList = stringRedisTemplate.opsForList().range("shopTypeList", 0, -1);
 再将集合中的JSON格式的元素转换成对象，
 *
 @GetMapping("list")
  public Result queryTypeList() throws JsonProcessingException {
  //使用集合存储类型的RedisTemplate，存储ShopType对象的JSON字符串
        List<String> SP = stringRedisTemplate.opsForList().range("shopTypeList", 0, -1);
        if (SP != null && !SP.isEmpty()) {
            //将JSON字符串转换为ShopType对象列表
            List<ShopType> shopTypes = SP.stream().map(json -> {
                try {
                    return mapper.readValue(json, ShopType.class);
                } catch (JsonProcessingException e) {
                    e.printStackTrace();
                    return null;
                }
            }).filter(shopType -> shopType != null).toList();
            return Result.ok(shopTypes);
        }
        * //创建一个锁对象，用来控制对Redis的访问，防止多个线程同时访问Redis导致缓存击穿
         synchronized (this) {
             //再次查询Redis中是否有商铺类型列表，因为可能在等待锁的过程中，其他线程已经查询数据库并将数据存储到Redis中了
             SP = stringRedisTemplate.opsForList().range("shopTypeList", 0, -1);
             if (SP != null && !SP.isEmpty()) {
                 List<ShopType> shopTypes = SP.stream().map(json -> {
                     try {
                         return mapper.readValue(json, ShopType.class);
                     } catch (JsonProcessingException e) {
                         e.printStackTrace();
                         return null;
                     }
                 }).filter(shopType -> shopType != null).toList();
                 return Result.ok(shopTypes);
             }
             //Redis中没有，查询数据库
             List<ShopType> typeList = typeService
                     .query().orderByAsc("sort").list();
             if (typeList==null||typeList.isEmpty()) {
                 return Result.fail("商铺类型不存在");
             }
             //将数据库中的数据转换为JSON字符串列表
             List<String> collect = typeList.stream().map(shopType -> {
                 try {
                     return mapper.writeValueAsString(shopType);
                 } catch (JsonProcessingException e) {
                     e.printStackTrace();
                     return null;
                 }
             }).filter(json -> json != null).collect(Collectors.toList());
             //使用Pipeline技术，将数据库中的数据存储到Redis中，并设置过期时间为30分钟
             stringRedisTemplate.executePipelined(new RedisCallback<Object>() {
                 @Override
                 public Object doInRedis(RedisConnection connection) throws DataAccessException {
                     // 注意：因为 connection 很底层，所以它只认识 byte[]
                     // 我们必须手动把 "shopTypeList" 变成字节数组
                     connection.del("shopTypeList".getBytes());
                     for (String json : collect) {
                         connection.lPush("shopTypeList".getBytes(), json.getBytes());
                     }
                     connection.expire("shopTypeList".getBytes(), 30 * 60);
                     return null;

                    }
             });
             return Result.ok(typeList);
         }
        //使用LeftPushAll方法底层实现通常是循环调用 Redis 的 LPUSH 命令，会需要进行次网络交互
        //导致接口响应时间过长
        //解决方法:使用Pipeline(管道)技术，将多次请求打包成 1 次发送，减少网络交互次数，提高性能
        //原理是:本地内存中开辟一块缓冲区。当你调用 pipe.set() 或 pipe.get() 时，Redis 客户端不会立即发送网络请求
        //，而是将这些命令按顺序“写入”到缓冲区的队列中。
        //这里的RedisConnection connection = pipeline.getConnection();是Spring Data Redis 提供的一个核心接口，
       //代表了与 Redis 服务器的连接。通过这个连接对象，我们可以执行各种 Redis的原生命令。但是它只认识字节数组，所以需要将数据转换为字节数组。
       //它调用命令时不会发送网络请求，而是将命令写入缓冲区。
        //当 executePipelined 方法结束时，Spring Data Redis 会把这个“集装箱”里所有的指令
        //一次性打包，通过网络发送给 Redis 服务器。这才是真正耗时的“路途”。

    }
*/

//缓存更新策略
/*
* 因为Redis和数据库之间需要保持数据的同步，所以当数据库中的数据发生改变时，需要及时更新Redis中的数据，否则就会出现数据不一致的问题
* 为此就有了缓存更新策略，常见的有以下几种:内存淘汰、超时剔除、主动更新
* 内存淘汰:不用自己维护，当内存不足时Redis会自动淘汰部分数据，下次查询时自动更新缓存，但是无法控制淘汰哪些数据，
* 且如果内存一直充足，导致旧数据一直存在，每次都能命中要求的key，就不会查询数据库，用数据库该key的新数据去更新缓存，从而导致数据不一致，维护成本无
* 超时剔除:设置缓存的过期时间，当缓存过期时自动删除，下次查询时自动更新缓存(用你写的新增代码调用set等方法)，但是过期时间过长也会导致数据不一致，维护成本低
* 主动更新:每次更新数据库时，手动更新缓存，但是维护成本高
*
* 主动更新策略:有三种策略:Cache Aside(旁路缓存)、Read/Write Through(读/写穿)、Write Behind(后台写) Caching
* Cache Aside(推荐):由缓存调用者，在更新数据库的同时操作缓存，从而实现一致性
* 需要考虑问题:
* 1、这个操作缓存是更新缓存还是删除缓存？
* 如果是更新缓存，那么就需要在每次更新数据库后立马查询数据库获取新数据，再更新写到缓存中。倘若更新次数很多但是没人读取缓存，那么这些更新缓存完全是无效操作
* 而如果是删除缓存，那么无论更新多少次数据库，都只是相当于删除一次缓存而已，下次查询时再从数据库中获取最新数据更新到缓存中，这样就不会出现无效操作
* 2、如何保证缓存与数据库的操作的同时成功或失败？
* 如果是单体项目，使用事务管理
* 如果是分布式项目，利用TCC等分布式事务方案
* 3、先操作缓存还是先操作数据库？
* 如果删除缓存、再更新数据库:倘若删除缓存之后，其他线程正在查询缓存，由于缓存为空，会查询数据库，并把当前数据写入缓存
* 如果先操作数据库，再删除缓存:倘若缓存失效了，在更新数据库前，其他线程正在查询缓存，由于缓存未失效，会查询数据库，突然更新数据库的线程又拿回权限
* 更新了数据库，并删除缓存，其他线程再拿回权限将之前拿到的旧数据写入缓存，导致数据不一致
* (要同时满足这三个条件，且缓存的速度是很快的几乎不会在完成前被抢回去，概率相对第一种更低，所以第二种更常用)
* 即使出现数据不一致，可以使用锁或者超时剔除。
*
*
* Read/Write Through:缓存和数据库整合为一个服务，由服务来维护一致性，调用者调用该服务，不需要关心缓存一致性问题。成本较高
*
* Write Behind Caching:调用者只操作缓存，有其他的线程异步的将缓存数据持久化到数据库中，从而实现一致性
* 即(CRUD操作都在缓存中进行，数据库中不直接操作，数据库中的数据是由其他线程异步更新的。缓存是新数据，数据库是旧数据)。
* 但是缺点:一旦宕机了，由于缓存的数据没有持久化，就会永久丢失，从而导致数据不一致
*
* 总结:
* 一致性要求低的场景例如:商品分类。可以使用内存淘汰机制
* 一致性要求高的场景例如:用户信息。使用主动更新的Cache Aside策略，使用锁或者超时剔除来解决数据不一致问题，
* CacheAside策略的实现:
* 读操作:
* 缓存命中时直接返回，未命中时从数据库中查询，并写入缓存，设定过期时间
* 写操作:
* 先更新数据库，再删除缓存，当下次用户查询的时候再从数据库中查询，并写入缓存
*
*
* //案例:修改ShopController中的业务逻辑，满足一下需求:
* 1、根据Id查询店铺时，如果未命中缓存，则查询数据库，并写入缓存，设置过期时间为30分钟
* 2、根据Id修改店铺时，先更新数据库，再删除缓存，下次查询时再从数据库中查询，并写入缓存
*
* */


//缓存穿透
/*
* 缓存穿透:用户请求的数据在缓存和数据库中都不存在，这样的话缓存就永远不会生效，请求会直接访问数据库，数据库没有就发回空的数据，就会再次发出请求，形成恶性循环
* 从而导致数据库压力增大，从而影响正常业务的运行，甚至导致数据库宕机
* 解决方法:缓存空对象、布隆过滤
* 缓存空对象:如果数据库中也没有为了防止再次访问数据库，就存储一个空对象("")到缓存中并设置有效期，下次查询时，如果缓存中存在空对象，则直接返回空对象，从而避免了数据库的访问
* 优点:实现简单、维护方便
* 缺点:如果是恶意攻击，短时间内访问大量不存在的数据，会造成缓存的大量消耗，导致缓存雪崩(将有效期在缩短)
* 如果下次传入了数据库的该id的数据，可能导致短期内的缓存和数据库的数据不一致(让新增数据库数据时，用数据将缓存中的空数据覆盖掉)
*
* 布隆过滤:在用户端和Redis缓存之间加了一个布隆过滤器，在布隆过滤器中判断数据是否存在，不存在则拒绝访问，存在则从缓存中获取数据，缓存中没有就去查询数据库
* 布隆过滤器是一种空间效率很高的概率型数据结构，可以用来判断一个元素是否在一个集合中。它由一个位数组和多个哈希函数组成。当一个元素被添加到布隆过滤器中时，经过多个哈希函数计算后
* ，会在位数组中对应的位置上设置为1。当查询一个元素是否在集合中时，使用算法
* 缺点:存在误判可能
*
* 案例:修改之前的逻辑，缓存未命中时，查询数据库，倘若数据库中也没有数据，则将空对象写入缓存，并设置有效期(通常设置为10秒)，return结束
* 下次查询时，如果命中的缓存，判断命中的数据，如果时命中缓存中存在的空对象，则直接return结束，否则返回数据
* 用isBalnk(data)判断数据是否为空，只有当数据不为null、空字符串、回车符时才返回false，否则返回true
*
*
* 以上两种都是被动响应的方案，系统已经被攻击了才会去响应，无法提前预防攻击，且如果攻击量过大，可能会导致缓存雪崩
* 主动预防攻击方案:
* 增强id的复杂性，避免被猜测id规律、做数据的基础格式校验
* 加强用户权限校验，用户登录还可以进行限流，限制用户访问频率，防止恶意攻击。和热点参数的限流(限流使用微服务实现)
* 在用户端和Redis缓存之间加一个布隆过滤器，在布隆过滤器中判断数据是否存在，不存在则拒绝访问，存在则从缓存中获取数据，缓存中没有就去查询数据库
*
* */

//缓存雪崩
/*
*缓存雪崩:是指同一时段内大量的key同时失效或者redis服务器宕机，导致大量的请求都直接打到数据库，从而导致数据库压力增大
* 解决方案:
* 1、给不同的key设置不同的过期时间，设置TTL添加随机值
* 2、利用Redis的集群提高服务的可用性(Redis哨兵机制实现服务的监控，将Redis集群形成主从关系，如果一个服务器宕机，比如主机宕机了
* 哨兵可以自动从从机中选一个出来去替代原来的主机，确保Redis能一直正常的对外服务。而且主从可以是艾女星一种数据到的同步，即使主机宕机了也不会造成数据的丢失)
* 防止Redis服务器宕机造成缓存雪崩
* 3、给缓存业务添加降级限流策略:当出现缓存雪崩时，给缓存业务添加降级限流策略，直接返回失败结果或者绝句服务，不让其访问数据库
* ，哪怕redis集群全部宕机也不要紧(限流降级可以使用微服务实现)
* 4、给业务添加多级缓存:因为浏览器、Neinx代理中都有缓存，所以如果Redis雪崩
* 可以先从浏览器缓存中获取数据，浏览器缓存中没有再从Nginx代理服务器的缓存中获取数据(多级缓存也会在微服务中讲到)
*
*
* */


//缓存击穿
/*
*缓存击穿问题也称热点key问题，就是一个被高并发访问且缓存重建业务较复杂的key突然失效，无数的请求同时访问这个key，
* 导致大量的请求直接打到数据库，从而导致数据库压力增大
* 缓存重建是指将数据库中的数据添加到Redis中需要经过耗时的业务逻辑，比如:需要多表关联查询等，即使是因为不是key失效，
* 该key在Redis更新时，因为耗时长，大量用户访问时都还没更新到Redis中，也可能触发缓存击穿问题
*
* 解决方案:互斥锁、逻辑过期
* 互斥锁:当一个线程访问到这个key时，发现它失效了，就去获取一个互斥锁，获取到锁的线程就去查询数据库，并将数据写入Redis中，释放锁。
* 其他的线程，在释放锁之前，就会阻塞在这里，只能一直重试访问Redsi，直到热点Key更新完成，锁释放，就能在Redis中就能获取到数据了，
* 从而避免了缓存击穿问题
* 缺点:所有后续线程都需要等待，造成性能下降，且如果锁的粒度过大，可能会导致大量线程阻塞，甚至死锁
* 优点:没有额外的内存的消耗，实现简单，保证数据的一致性
*
* 逻辑过期:因为设置TTL过期时间导致该热点Key一定会失效，从而导致缓存击穿问题，所以需要设置一个逻辑过期时间，
* 即使过期时间到了之后，数据只会失效，但是并不删除缓存中的数据。逻辑过期时间是设置在Value中的
* 当用户访问时逻辑过期时间已经到了，也会去获取一个互斥锁，获取到锁的线程，会开启一个新的线程去查询数据库，并将数据写入Redis中并重置逻辑过期时间，释放锁。
* 而这个旧线程会返回旧数据，从而避免了缓存击穿问题，其他的线程如果访问时发现逻辑过期时间到了，也会去获取锁。如果锁已经被其他线程获取，则会返回旧数据，
* 如果访问时已经重置了没过期了，则返回新数据
* 缺点:不能保证数据的一致性(拿到的是旧数据)，需要给value多加一个字段造成额外的内存消耗，实现复杂
* 优点:线程无需阻塞，性能提升
*
*互斥锁案例:修改根据id查询商铺的业务，基于互斥锁方式解决缓存击穿问题
*使用的不是Synchronized锁或者lock，因为这些是没拿到锁的线程会一直阻塞在这里，我们需要的是可以自定义的拿到和没拿到锁的执行逻辑的锁
*而是基于Redis的String类型的setNX命令实现，上锁通过SetNX命令实现(需要设置有效期，防止服务器问题导致死锁)，解锁通过del命令实现
*而在StringRedisTemplate中提供了setIfAbsent()方法来实现setNX命令，提供了delete()方法来实现del命令,分别封装成两个方法
*
当没有命中Redis中的数据和空对象时，则去获取互斥锁
因为真实情况下会存在多个线程同时被阻塞，会有很大的延时，为了测试的更真实，将数据库查询到后，给线程设置一个200ms的睡眠时间。
访问http://localhost:8080/api/shop/1,先把Redis缓存清空，并使用JMeter检验锁的可不可靠
* 使用:下载后点击Bin文件夹中的，找到jmeter.bat文件，双击等待几秒就会弹出图形操作界面了，
启动后，新建测试计划，添加线程组(配置你要模拟的并发用户数)，
添加HTTP请求/其他协议的取样器(配置你要的测试接口/服务信息)、添加查看结果报告|聚合报告等监控原件，点击运行(有弹窗时多点击几次第一个选项)，就能看到测试结果了
*
* 逻辑过期时间案例:修改根据id查询商铺的业务，基于逻辑过期方式解决缓存击穿问题
* 通过访问Redis中的数据，如果未命中数据(.isBlank=ture)在则说明这个不是热点Key，不用进行缓存击穿和缓存穿透，直接返回空
* 如果命中了数据，则判断逻辑过期时间是否已经过了，如果过了则去获取互斥锁重建Redis缓存数据，并返回旧数据，如果没有过则直接返回数据
* 因为原来的类中是没有逻辑过期时间字段的，但是如果给类添加一个新字段可能会造成一些麻烦，需要修改源码，所以建议新建一个类RedisData
* 在该类中添加一个逻辑过期字段，用于保存逻辑过期时间，和一个数据字段，用于保存店铺等类的数据，(不要让类继承RedisData)
* 因为当前Redis中还没有热点Key，先用测试方法，将数据保存到Redis中，并设置逻辑过期时间，
* 将一个添加热点Key的方法(public的非重写方法)写在逻辑层的某个实现类中，测试方法中调用该方法
* 注意添加的时候不要写TTL参数，就表示是永久的key，让逻辑过期时间在生效
* 注意！！！测试的时候要注入的是实现类的对象，而不是逻辑层接口
* 注意！！！获取互斥锁之后要开启一个新的线程去查询数据库并重建Redis缓存数据，此时最好顶一个线程池对象。通过线程池调用submit去启动一个新线程
*
* 注意！！！ObjectMapper无法序列化LocalDataTime，最好使用hututool的JSONUtil
* JSONUtil.tojsonStr()//将对象序列化为JSON字符串
* JSONUtil.toBean(jsonStr,xx.class)//将Json字符串反序列化为Java对象
* JSONUtil.parseObj(jsonStr)//将JSON字符串变为JSON对象
*
* 注意！！！
* 在获取到互斥锁之后，应该再次去查询Redis中的数据，防止在获取锁的过程中，其他线程已经更新了数据，导致数据不一致
* 如果还是没有获取到数据，则去数据库查询，并重建Redis缓存数据
*

* */

//缓存工具封装
/*
*基于StringRedisTemplate封装一个缓存工具类，要求满足下列需求
* 方法1:可以将任意的Java对象序列化为json并缓存到String类型的key中，并设置TTL过期时间
* 方法2:可以将任意对象序列化为json并存储在String类型的key中，并且设置逻辑过期时间，用于处理缓存击穿问题
* 方法3:根据指定的key查询缓存，并序列化为指定类型，利用缓存空值的方式解决缓存穿透问题
* 方法4:根据指定的key查询缓存，并序列化为指定的类型，需要利用逻辑过期来解决击穿问题
* 注意！！！
* 方法三和四中需要访问数据库查询，但是我们是不知道调用者是调用什么数据库的，所以要求调用者，需要将调用数据库的方法一并传参
* 因为调用数据库的方法是有参数有返回值的，所以用Function<参数类型,返回值类型>作为参数,因为不知道id类型、指定的序列化的类型
* 所以需要加两个泛型，ID表示id的类型，R表示指定序列化的类型,还需要指定TTL和TimeUnit，和一个字符串用于和id组成Key
* 调用处例如: cacheClient.JSONStrWithPassThrough(CACHE_SHOP_KEY,Shop.class,id,
* shopId->shopService.getById(shopId),CACHE_SHOP_TTL,TimeUnit.MINUTES);使用函数式接口或者方法引用把方法写入参数中
*
* 注意！！！方法四还需要用到线程池和锁，可以把这线程池和锁的方法直接写在工具类中，方便调用(别忘了，调用时是去工具类中执行方法的)
*
*
*
*
* */
