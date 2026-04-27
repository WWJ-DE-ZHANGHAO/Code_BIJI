//Redis(Remote Dictionary Server 远程词典服务):键值对存储,常被用作数据库、缓存和消息中间件。也称为NoSQL数据库。
//特征:
/*
* 键值(KEY-VALUE)型，value支持多种不同数据结构，功能丰富
* 单线程，每个命令具备原子性
* 低延迟，速度快(基于内存，IO多路复用)
* 支持数据持久化
* 支持主从集群，分片集群
* 支持多种语言
* */
/*

* SQL和NoSQL的对比:
* SQL:Structured结构化，必须满足字段的类型、长度等约束，修改时会有很大的影响
* NoSQL:Not Structured非结构化，没有字段类型、长度等约束，修改时无太大影响，比如:Redis(键值对)、MongoDB(文档)、elasticsearch
* SQL:Relational关联的，表与表直接有关联关系
* NoSQL:Non-Relational非关联的，数据之间没有关系，数据库不会帮助进行维护，需要程序员自己维护数据与数据之间的关联
* SQL:有通用的SQL查询语法，所有的关系型数据库都能用
* NoSQL:没有通用的语法，不同的数据库有不同的语法，
* SQL:事务特性方面:ACID(原子性(安全)、一致性、隔离性、持久性)
* NoSQL:事务特性:BASE(基本可用、Soft-state、Partition-tolerant)
* SQL:存储方式为磁盘
* NoSQL:存储方式为内存(所有查询性能更高)
* 使用场景:数据结构固定、相关业务数据安全性、一致性要求较高使用 SQL/数据结构不固定、对一致性、安全性要求不高，性能要求高，使用 NoSQL
* */


//安装Linux版本的Redis
/*
* 先准备一个虚拟机，VMware Workstation，再安装Linux的镜像，点击启动虚拟机，输入密码，登录，输入命令:
* 输入yum install -y gcc tcl下载Redis的依赖
* 再将redis的压缩包拖拉到/usr/local/src目录下，解压，输入命令:tar zxvf redis-3.2.8.tar.gz
* 进入redis目录，输入命令:make && make install进行编译安装Redis
* 之后就能启动Redis了
* 有三种启动方式:
* 1、直接启动:输入命令:redis-server。但这种是前台启动，不能建立连接，要想连接，需要再打开一个窗口重新建立连接
* 但是把这个界面关闭，Redis就会停止运行。想要Redis后台启动，就必须修改配置文件。
*
* 2、指定配置文件启动:先CTRL+C将Redis停止。修改Redis安装包下的redis.conf文件，
* 修改bind 127.0.0.1改为0.0.0.0，这样Redis就可以接受外部任意Ip地址的连接了
* 将daemonize no改为yes，即可以后台启动Redis
* 设置密码:requirepass xxx
* 还可以设置工作目录命令:dir.就会将当前命令执行的目录作为工作目录，当前命令产生的日志和持久化文件都会保存在这个当前目录下
* 修改端口号，设置数据库的数量，设置日志文件(日志默认为空，设置logfile "redis.log"，也会存储在当前目录)。
* 配置完成后，进入Redis安装目录，输入命令:redis-server redis.conf就能指定配置文件启动Redis了
* 通过命令ps -ef | grep redis查看Redis进程
* 想要停止Redis:输入命令:kill 进程号
*
* 3、开机自启动:
* 创建一个系统服务文件
* 创建完成之后，使用systemctl daemon-reload命令重新加载系统服务
* 在输入systemctl enable redis命令将Redis设置为开机启动
* systemctl start redis启动Redis
* systemctl status redis查看Redis状态
* systemctl stop redis停止Redis
* */

//使用redis客户端，实现数据的CRUD，包括:命令行客户端、图形化桌面客户端、编程语言客户端
/*
* 命令行客户端:是在安装完成之后自带的，即redis-cli
* 使用方式:redis-cli [options] [commonds]
* options是选项，commonds是命令
* options:-h 指定要连接的Redis服务器的Ip地址、-p 端口号、-a 密码
* 注意！！！这个ip地址，是虚拟机的IP地址或所在的设备的本地IP地址即127.0.0.1
* commonds:就是Redis的操作命令，例如ping命令，如果服务端正常返回PONG，
* 不指定commond时，会进入redis-cli的交互式控制台(不断地输入命令->返回，更便捷)
* 可以不用a输入密码，直接用-h -p 再输入AUTH命令指定密码。会更安全点
*
* 图形化客户端:
* 由Giyhub的大神编写了Redis的图形化桌面客户端，地址:https://github.com/uglide/RedisDesktopManager
* 要连接虚拟机上的Redis的话，需要用虚拟机的IP地址
* 注意！！！！要在Linux虚拟机CentOS上执行这两条命令。放行Redis的6379端口,否则图形化桌面客户端没法连接到虚拟机上的Redis
* firewall-cmd --add-port=6379/tcp --permanent
* 成功后重载防火墙规则
* firewall-cmd --reload
* 图形化界面的操作也可以在命令行中执行
* 使用SELECT NUM选择几号库，在进行库的操作
*
*
*
* */

//Redis数据结构
/*
* Redis是一个KEY-VALUE的数据库，key一般是String类型，不过value的类型多种多样
* String、Hash、List、Set、SortedSet(前五个是基本类型)、GEO、BitMap、HyperLog(这后三个是特殊类型)
* String:就是字符串类型的值
* Hash:就是哈希表。例:{name:"Jack",age:21}
* List:[A->B->C->C],一个有序的集合，实质上是一个链表
* Set:{A,B,C}，一个无序集合，不能重复
* SortedSet:{A:1,B:2,C:3},一个有序集合，可排序，不能重复
* GEO:{A:(120.3 30.5)}，一个地理坐标，经纬度
* BitMap:0110110101110101011。这最后两个都是按位进行存储的一种方式，底层的本质都是一种字符串
* HyperLog:0110110101110101011
* 除了这些类型，还有其他的用于消息队列等功能的类型。
* 可以在官网文档中查看命令，也可以在命令行中使用help命令进行查看各个命令
* 比如:help @generic进行查看通用命令
*
* */

//通用命令
/*
* KEYS命令:查看符合条件的所有键Key(在生产环境中不建议使用，因为Redis是单线程的,如果库中有很多的话，会导致线程阻塞)
* 例如:KEYS *:查看库中的所有键KEY
* ！！！！！！小技巧:通过help[command]可以查看一个命令的具体用法
* DEL:删除一个/或多个指定的key，用空格隔开
* MSET:插入多个键值对，用空格隔开
* EXISTS:判断key是否存在，存放返回1，不存在返回0
* ！！！！注意键名的大小写是区别的
* EXPIRE key second:给一个key设置有效期，有效期到期时该key自动删除
* TTL key:查看key的剩余有效期，返回-1表示永久有效，-2表示key不存在
* PERSIST key:取消key的过期时间
* */
//String类型的命令
/*
* String类型，是Redis中最简单的存储类型
* 其value值是字符串，不过根据字符串的格式不同，又可以分为3类
* 1、普通字符串：普通字符串，字符串的格式是纯字符串，例如:SET name Jack
* 2、整数：整数，字符串的格式是纯数字，可以做自增自减操作，例如:SET age 21
* 3、浮点数：浮点数，字符串的格式是数字加.可以做自增自减操作，例如:SET score 98.5
* 不管是那种格式:底层都是字节数组形式存储的，只不过是编码方式不同，字符串类型的最大空间不能超过512M
* set:插入一个键值对，如果key已经存在，则覆盖
* get:获取一个key对应的value
* Mset:批量添加多个String类型的键值对
* mget:批量获取多个String类型的键值对
* incr:对一个key对应的整型value进行自增操作
* decr:对一个key对应的整型value进行自减操作
* incrby:对一个key对应的整型value进行自增操作，可以指定自增的步长
* Incrbyfloat:对一个key对应的浮点型value进行自增操作，可以指定自增的步长，并且可以保留小数点后2位
* setnx:如果key不存在，则插入一个键值对，如果key已经存在，则返回0不进行任何操作(注意！！等同于 set key nx)
* setex:添加key-value对时，并指定有效期(注意！！！等同于 set key value ex)
*
*
* */


//Redis命令-key的层级格式
/*
* Redis中没有类似MySQL中table的概念，我们该如何区分不同类型的key
* 例如:需要存储用户，商品信息到redis，有一个用户id是1，一个商品的id也是1。可以通过拼接来达到区分的效果
* Redis的key允许有多个单词形成曾是结构，多个单词之间用:隔开。格式:项目名:业务名:类型:id
* 例如:一个名为RUOYI的项目，有user和product两种不用类型的数据，我们可以定为
* RUOYI:user:1、RUOYI:product:1
* 如果value是一个java对象，则可以将对象序列化为JSON字符串后存储
* 例:
* set RUOYI:user:1 {"id":1,"name":"jack","age":21}
* 在图形化界面展示出来的就是树状的，一层一层的
* */

//Redis的hash类型命令
/*
* Hash类型也叫做散列，其value是一个无序字典，类似java中的HashMap结构
* Stirng结构是将对象类型的Value序列化为JSON字符串后存储，当需要修改对象中的某个字段时很不方便
* 而Hash结构可以将对象的每个字段独立存储，可以针对单个字段作CRUD
* 它的Value由key-value组成
* 例:heima:user:1  name jack   age 21
* 命令:
* Hset key file value:添加或者修改hash类型的key的file的值(添加多个file)
* Hget key file :获取一个hash类型key的filed的值
* Hmset:批量添加多个hash类型key的filed的值(与hset功能一样，已被废弃)
* Hmget:批量获取多个hash类型key的filed的值
* HgetAll:获取多个hash类型的key中的所有的filed和value
* Hkeys:获取一个hash类型的key中所有filed
* HVALS:获取一个hash类型的key的所有value
* Hincrby:让一个hash类型key的字段自增并指定步长
* hsetNX:添加一个hash类型的key的filed值，前提是这个filed不存在，否则不执行(等同于 hset key NX)
*
* */

//Redis的List类型命令
/*
* Redis中的List类型与Java中的LinkedList类似，可以看做是一个双向链表结构，既可以支持正向检索和也可以支持反向检索
* key是String。value是双向链表
* 特征:有序、元素可以重复、插入和删除快、查询速度一般
* 应用场景:常用于存储一个有序的数据:例如朋友圈点赞，评论列表等
* 命令:(注意！！！L就是Left左侧，R就是Right右侧)
* LPUSH key elelment…………:向指定列表左侧插入一个或多个元素
* LPOP key :移除并返回列表左侧的第一个元素，没有则返回null(注意！！可以指定移除几个)
* RPUSH key element……:向列表右侧插入一个或多个元素
* RPOP key:移除并返回列表右侧的第一个元素(注意！！可以指定移除几个)
* LRANGE key star end:返回一段角标范围内的所有元素(这里的start和end是对应的索引，1表示第二个元素)，只是查看不会移除,-1表示最后一个元素
* BLPOP和BRPOP:与LPOP和RPOP类似，只不过在没有元素时等待指定时间，而不是直接返回
* (可以设置等待时间，也可以在这个端等待时，在另一个端中给这个key添加元素)
* 注意！！！L推1、2、3得到的会是321。R推1、2、3得到的会是123。多个元素之间用空格隔开
*
* 面试问题；
* 如何用list结构模拟一个栈？(栈的特点是，从哪进就从哪出)
* 入口和出口在同一边，入用LPUSH出用LPOP
* 如何利用List模拟一个队列？(队列特点，一个口进，另一个口出)
* 入口和出口不在同一边，入用LPUSH出用RPOP
* 如何利用List模拟一个阻塞队列?
* 入口和出口不在同一边
* 出队列时用BLPOP或BRPOP
*
* */

//set类型
/*
* Redis的SET结构和Java中的hashset类似，可以看做是一个value为null的HashMap。因为是一个hash表，因此具备与HashSet类似的特征
* key是string valu是一个set集合
* 特征:无序、元素不可重复、查找快、支持交集、并集差集等功能
* 命令:
* SADD key member……:向set中添加一个或多个元素
* SREM key member……:移除set中的指定元素
* SCARD key:返回set中元素的个数
* SISMEMBER key member:判断一个元素是否存在于set中
* SMEMBERS:获取set中所有的元素
*
* SINTER key1 key2……:求key1和key2的交集
* SDIFF key1 key2……:求key1和key2的差集(key1有而key2没有的)注意！！是按顺序的，谁在前面。结果就是就是谁有而后面没有的元素，
* SUNION key1 key2……:求key1和key2的并集(重复的就用一个)
*
* */

//SortedSet类型
/*
* Redis的sortedSet是一个可排序的set集合，与Java中的TreeSet类似，但是底层数据结构差别很大，SortedSet中的每个元素到带有一个score属性
* ，可以基于score属性对元素排序，底层的实现是一个跳表(skipList)加hash表
* SortedSet具备:可排序、元素不重复、查询速度快。也支持交集、并集、差集
* 应用场景:由于可排序特性、经常被用于实现排行榜这样的功能
* ZADD key score member:添加一个或多个元素到sorted set，如果已经存在则更新其score值
* ZREM key member:删除sorted set中的一个指定元素
* ZSCORE key member :获取sorted set中指定元素的score值，如果不存在则返回null
* ZRANK key member:获取sorted set中指定元素的排名(实现按照socre排序之后，排名从0开始，默认升序。最大的在最下面)
* ZCARD key member:获取sorted set中元素个数
* ZCOUNT key min max :统计score值在给定范围的所有元素个数(按照的是分数值即score的值，查多少分以下的，用0~xx。反过来就是xx~xx)，返回元素个数
* ZINCRBY key increment member:让sorted set的指定元素的score自增、步长为指定的increment
* ZRANGE key min max:按照socre排序后。获取指定排名范围内的元素(按照排名，min和max是排名)，返回元素名称,
* 默认是根据升序查询的，根据降序查询则需要加上REV即ZREVRANGE
* ZRANGEBYSCORE key min max:按照score排序后，获取指定score范围内的元素(按照分数值，min和max是分数值)，返回元素名称
* ZDIFF、ZINTER 、ZUNION:求差集、交集、并集
* 注意！！以上这些默认都是按升序的，如果想要降序则需要在Z后面加上REV
* 例如:1、3、4、7.升序就是1347
*
*
* */

//Redis的Java客户端
/*
* Java常用的客户端:jedis、lettuce、Redisson
* Jedis:以Redis命令作为方法名称，很方便。但是Jedis实力是线程不安全的，多线程环境下需要基于连接池来使用
* Lettuce:Lettuce是基于Netty(高性能的)实现的，支持同步、异步和响应式编程方式，并且线程安全，支持Redis的哨兵模式、集群模式和管道模式
* Redisson:Redisson是一个基于Redis实现的分布式、可伸缩的Java数据结构集合、包含诸如Map、Queue、Lock、Semaphore、AtomicLong等功能
* 后续学习的String Data Redis中可以兼容Jedis和Lettuce
*
*
* */
//Jedis
/*
* Jedis官网地址:https://github.com/redis/jedis
* 使用步骤:
* 1、创建一个Maven工程:引入依赖
* <dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>xxxx</version>
* </dependency>
* 2、建立连接
* 创建一个Jedis对象实例，并指定Redis服务器的IP地址和端口号
* 创建一个测试类，可以先引入Junit5的路径再用alt+insert，生成setUp()方法，添加@BeforeEach注解可以，在每个@Test方法执行之前执行
* @BeforeEach
* public void setUp() {
* Jedis jedis = new Jedis("192.168.1.100", 6379);
* jedis.auth("xxxx");设置密码
* jedis.select(0);选择库
* }
* 就可以实现每次测试之前，都先创建一个Jedis对象，并连接Redis服务
* 3、测试String
* String result=jedis.set("key", "value");插入数据
* String result=jedis.get("key");获取数据
* 4、释放资源
* jedis.close();
*注意!!!!在关闭资源之前要确保Jedis对象已经创建，并且已经连接Redis服务，否则会报空指针异常
*
*
* Jedis连接池
* jedis本身是不安全的，并且频繁的创建和销毁Jedis连接会有性能消耗，因此我们推荐大家使用Jedis连接池代替Jedis直连方式
* 创建一个JedisPool对象实例，并指定Redis服务器的IP地址和端口号
* 用静态代码块初始化JedisPool对象实例，设置它的最大连接数、最大空闲连接数、最小空闲连接数，设置最长等待时间，连接超时时间等参数
* 创建一个方法，用于获取Jedis对象，每次用完就将Jedis对象还给JedisPool
* */

//SpringDataRedis
/*
*SpringData是Spring中数据操作的模块，包含对各种数据库的集成，其中对Redis的集成模块就叫做SpringDataRedis
* 官网:https://spring.io/projects/spring-data-redis
* 提供了对不同Redis客户端的整合(Lettuce和Jedis)
* 提供了RedisTemplate统一API来操作Redis(类似之前的JDBCTemplate来封装对MySQL数据库的各种操作)
* 支持Redis的发布订阅模型
* 支持Redis哨兵和Redis集群
* 支持基于Lettuce的响应式编程
* 支持JDK、JSON、字符串、Spring对象的数据序列化以及反序列化(之前的Jedis只能处理字符串类型的键值对，如果是Java对象就不太行，需要自己手动给它序列化)
* 支持基于Redis的JDKCollection实现(就是JDK中的各种集合，Redis对其重新实现，即重写)
*注意！！！SpringDataRedis的底层实现是Lettuce，所以编写配置时要选择Lettuce的连接池配置
* SpringDataRedis中提供了RedisTemplate类，其中封装了各种对Reids的操作方法，用这些方法的返回值(xxxoperation对象)来调用操作方法
* 包括:
* opsForValue():返回操作String类型的数据的对象 ValueOperations
* opsForHash():返回操作Hash类型数据的对象 HashOperations
* opsForZSet():返回操作ZSet类型数据的对象 ZSetOperations
* opsForList():返回操作List类型数据的对象 ListOperations
* opsForSet():返回操作Set类型数据的对象 SetOperations
* 直接用redisTemplate对象调用的是通用的命令
*
* 例如:
* redisTemplate.opsForValue()会返回一个ValueOperations对象，这个ValueOperations类中封装了各种操作方法，用该对象调用操作方法
* 用链式编程就是redisTemplate.opsForValue().set("key","value");就是Redis的操作String类型的命令set(key,value)
*
*步骤:
* 1、创建一个StringBoot项目
* 要添加Lombok依赖和NOSQL中的SpringDataRedis依赖
* 还要引入连接池的依赖
* <dependency>
  <groupId>org.apache.commons</groupId>
  <artifactId>commons-pool2</artifactId>
* </dependency>
*2、配置Redis连接信息
* Spring
*    Redis
*      host:192.168.100.128
*      port:6379
*      password:123321
*      lettuce:
*        pool:
*          max-active:8
*          max-idle:8
*          min-idle:0
*          max-wait:100
* 3、直接注入RedisTemplate对象
* @Autowired
* private RedisTemplate redisTemplate;
* 4、编写测试
* 注意！！！
* 因为RedisTemplate对象的方法接受的是Object对象，所以添加的value值会被当成object
* 添加的value值被看成object/Java对象，底层会将该值序列化形式存储到Redis中，获取到Java程序中时又会进行反序列化，将其变回原样
* 这样会导致，可读性差。这个底层默认是使用的JDKSerialization转换
* 为了避免，需要将value值进行序列化存储，获取时进行反序列化。我们可以使用另外两张序列化器
* 1、StringRedisSerializer:将value值存储为String类型。(当键值为字符串时)他的底层就是使用getBytes()方法
* 2、GenericJackson2JsonRedisSerializer:将value值存储为JSON类型(value值为对象时)
* 步骤:
* 创建一个配置类
* @Configuration
* 编写一个第三方的Bean
* @Bean
* public RedisTemplate<String,object> redisTemplate(RedisConnectionFactory redisConnectionFactory) throw UnkonwHostException{
* 创建Template对象
*  RedisTemplate<String,object> redisTemplate = new RedisTemplate<>();
* 设置连接工厂
*  redisTemplate.setConnectionFactory(redisConnectionFactory);
* 设置序列化工具
* GenericJackson2JsonRedisSerializer jsonRedisSerializer = new GenericJackson2JsonRedisSerializer();
* key和hashkey采用string序列化
* redisTemplate.setKeySerializer(RedisSerializer.string());
* redisTemplate.setHashKeySerializer(RedisSerializer.string());
* value和hashvalue采用json序列化
* redisTemplate.setValueSerializer(jsonRedisSerializer);
* redisTemplate.setHashValueSerializer(jsonRedisSerializer);
* 返回对象
* return redisTemplate;
*
* }
* 没有设置反序列化，却能反序列化到程序中，这是因为序列化成JSON对象的时候，会标上一个例如:@class:com.atguigu.redis.entity.User一起存储到Redis中
* ,才能知道要反序列化成什么对象
* 注意！！！要添加jackson的依赖，否则会报异常
*
* 优化:使用JSON的序列化器能自动实现序列化和反序列化，确实很方便，但是每次存储都会存入一个@class属性，这样会增加存储空间，如果有成百上千个数据会很耗费空间
* 为了节省空间，统一使用String序列化器，不使用JSON序列化器，当需要存储Java对象时，手动完成对象的序列化和反序列化
*
* 也不用修改配置类，使用String提供的StringRedisTemplate类，它的key和value的序列化方式默认是String方式
* 需要手动序列化和反序列化时，可以使用SpringMVC中默认使用的ObjectMapper类
* 提供的writeValueAsString()和readValue(json,xxx.class)方法进行序列化和反序列化
*
* 再练习用StringRedisTemplate调用opsForHash()方法，调用put(key,fileter,value)方法添加键值对。
*
*
* */
