//缓存同步
/*
*实现了堆积缓存架构，大大提高了查询商品的性能。
* 但是多级缓存在提高查询性能的同时也带来了数据不一致的问题。
比如:数据库发生了修改，缓存依然是旧的数据，两者就产生了不一致。
*缓存同步策略:设置有效期(OpenResty本地缓存时使用的这个策略)、同步双写、异步通知
* 设置有效期:给缓存设置一个过期时间，过期后自动失效，下一次查询时重新从数据库加载数据到缓存中。
* 优点:简单易实现
* 缺点:可能会有短暂的数据不一致窗口。时效性差、缓存过期之前数据库可能修改
* 场景:适合更新频率较低，时效性要求低的业务
* 同步双写:在修改数据库的同时，直接修改缓存(把修改数据库和修改缓存的操作放在同一个事务中)，保证数据库和缓存的数据一致。
* 优点:数据一致性好，时效性高
* 缺点:有代码侵入、耦合性高
* 场景:对一致性要求高，时效性要求较高的缓存数据
* 异步通知:修改数据库时发送事件通知，相关服务监听到通知后修改缓存数据(可以利用消息队列/RabbitMQ实现异步通知)
* 优点:低耦合，可以同时通知多个缓存服务
* 缺点:时效性一般，可能有数据不一致窗口。
* 场景:时效性要求一般、有多个服务需要同步
*
* 我们是基于Canal实现的异步通知策略，
* Canal是阿里巴巴开源的一个分布式消息系统，可以监听数据库的变更事件(监听数据库的binlog)，
* 发现数据库有变更时，直接通知缓存服务完成更新缓存(就不会有侵入和耦合的问题了)，
*
* */

//安装Cannl
/*
* canal:意译为管道、水道，是阿里巴巴旗下的一款基于java开发，一句数据库增量日志解析，提供增量数据订阅&消费
* 官网:https://github.com/alibaba/canal
* Canal是基于mysql的主从同步实现的
* Mysql的主从同步原理:
* Mysql的主节点在进行数据的增删改查的时候，就会记录下这个操作的日志放到Binarylig文件中，这个文件称为二进制日志文件
* 其中记录的数据叫做binary log events(其实就是业务SQL)
* 记录之后，Mysqlslave从节点就从开启一个线程，不断的去读取这个日志文件，并解析这个日志文件，把日志文件中的数据返回，并放到一个Relay log(中继日志)中，
* 再开启一个线程，不断的从这个Relay log中读取数据，并执行这些SQL命令，就完成了主从同步的过程。
*
* Canal就是把自己为未装成一个Mysql的slave从节点，从而监听master的binary log ，
* 再把得到的变化信息通知给Canal的客户端，完成数据的同步更新，保证数据库和缓存的一致性。
*
* Canal的安装前先开启Mysql的主从模式:
log-bin=/var/lib/mysql/mysql-bin#设置binary log文件的存放地址和文件名，叫做mysql-bin
binlog-do-db=heima指定对哪个database#记录binary log events，这里记录heima这个库

*
* 重启Mysql:docker restart mysql
*
*设置用户权限:
create user canal@'%' IDENTIFIED by 'canal';//创建用户canal
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT,SUPER ON *.* TO 'canal'@'%' ;//给canal用户授权
FLUSH PRIVILEGES;//刷新权限
在dataGrip中执行
打开DataGrip的左侧的Mysql(就是那个海豚)下的服务器对象，下的用户可以看到刚刚创建的canal用户

*重启Mysql:docker restart mysq
*
*
* 创建网络;将Mysql、Canal、MQ放在同一个Docker网络
* docker network create heima
*
* 让Mysql容器加入到这个网络
* docker network connect heima mysql
*
* 安装Canal也加入这个网络
*
* 先将资料中的Canal.tar镜像文件下载到本地再上传到虚拟机，然后通过命令导入：docker load -i canal.tar
*
然后运行以下的命令创建Canal容器：

docker run -p 11111:11111 --name canal \
-e canal.destinations=heima \
-e canal.instance.master.address=mysql:3306  \
-e canal.instance.dbUsername=canal  \
-e canal.instance.dbPassword=canal  \
-e canal.instance.connectionCharset=UTF-8 \
-e canal.instance.tsdb.enable=true \
-e canal.instance.gtidon=false  \
-e canal.instance.filter.regex=heima\\..* \
--network heima \
-d canal/canal-server:v1.1.5
说明:

- `-p 11111:11111`：这是canal的默认监听端口
- `-e canal.instance.master.address=mysql:3306`：数据库地址和端口，如果不知道mysql容器地址，可以通过`docker inspect 容器id`来查看
- `-e canal.instance.dbUsername=canal`：数据库用户名
- `-e canal.instance.dbPassword=canal` ：数据库密码
- `-e canal.instance.filter.regex=`：要监听的表名称

*
表名称监听支持的语法：

mysql 数据解析关注的表，Perl正则表达式.
多个正则之间以逗号(,)分隔，转义符需要双斜杠(\\)
常见例子：
1.  所有表：.*   or  .*\\..*
2.  canal schema下所有表： canal\\..*
3.  canal下的以canal打头的表：canal\\.canal.*
4.  canal schema下的一张表：canal.test1
5.  多个规则组合使用然后以逗号隔开：canal\\..*,mysql.test1,mysql.test2
* */

//监听缓存
/*
* Canal客户端
* Canal提供了各种语言的客户端，当Canal监听到binlog变化时，会通知Canal的客户端，不过这里我们会使用Cithub上的第三方开源的
* cannal-starter
*地址:https://github.com/NormanGyllenhaal/canal-client
* 引入依赖
* <dependency>
<groupId>top.javatool</groupId>
<artifactId>canal-spring-boot-starter</artifactId>
* <version>1.2.1</version>
* </dependency>
* 编写配置:
* canal:
* destination: heima
* server:192.168.100.128:11111#canal地址
*
*
* 编写监听器，监听Canal消息
* @CanalTable("tb_item")//监听的表
* @Component
* public class ItemHandler implements EntryHandler<Item>{
*   @Override
*   public void  insert(Item item){
*    //写数据到Redsi，每当数据库进行了插入操作，Cannal就会通知执行调用这个方法
*    //写数据到JVM进程缓存
*  }
*
*   @Override
*   public void  update(Item item){
*   //写数据到Redsi
*    //写数据到JVM进程缓存
*  }
*
*   @Override
*   public void  delete(Item item){
     //删除数据到Redsi
*    //删除数据到JVM进程缓存
* }
*
* 注意！！！
* 因为之前RedisHandler已经写了缓存数据到Redis的逻辑了，所以不用在这里写数据到Redis了
* 把这个写数据到缓存的逻辑也写到RedisHandler中(定义一个方法)，让后在这个注入RedisHandler就行了
* 这个写JVM进程缓存用item_cache.get/ set
*
* 注意！！！需要给Item实体类加上注解
* @Id: 主键
* @Transient: 忽略字段不属于数据库的字段
*
*  }
* */