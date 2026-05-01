//分布式锁
/*
* 在之前的实现一个人一单时，为集群环境时Synchronized就失效了，所以我们需要分布式锁来解决这个问题。
* 解决方式：在JVM外部放一个锁监视器，用于管理多个JVM的锁，所有的JVM的线程都去这个锁监视器上获取锁，
* 只有获取到锁的线程才能进入代码块执行，其他的JVM等待
*
* 分布式锁:满足分布式系统或集群模式下多进程可见并且互斥的锁，保证同一时间只有一个进程执行代码块
  必须满足以下条件:多进程可见，互斥，高可用、高性能、安全性
* 分布式锁的实现方式有很多种常见的有:基于数据库的分布式锁、基于Redis的分布式锁、基于Zookeeper的分布式锁等
*
* MySQL的分布式锁:
* 用InnoDB存储引擎的行锁机制，通过事务来实现锁的互斥。
* 获取锁
客户端在一个事务中执行 SELECT ... FOR UPDATE 语句。该语句会对查询到的行加上排他锁，其他事务在锁释放前无法读取或修改该行。
START TRANSACTION;
-- 这条语句会阻塞，直到获取到行锁
SELECT * FROM pessimistic_lock WHERE lock_key = 'my_lock' FOR UPDATE;
-- 执行业务逻辑...
* 事务结束时自动释放所有锁：
- COMMIT   → 释放锁 ✅
- ROLLBACK → 释放锁 ✅
- 连接断开 → 释放锁 ✅
* 有错误时会自动回滚事务并释放锁，保证安全性
* 主要是因为多个服务使用同一个MySQL实例
*
* Redsis的分布式锁:
* 通过Redis的setnx命令实现，通过setnx命令设置一个key，如果key不存在则设置成功，如果key已存在则设置失败，来实现上锁
* delete命令删除key就能释放锁，setnx命令还可以设置过期时间，防止死锁问题保证安全性，需要手动设置过期时间，安全性较低
*主要是因为多个服务使用的是同一个Redis实例
*
* Zookeeper的分布式锁:
* 利用节点的唯一性和有序性实现互斥，当许多线程来Zookeeper创建节点时，可以规定只有最小的节点可以获取锁，就能实现互斥
* 将最小的节点删除就能释放锁，因为这些是临时节点，连接断开时会自动删除节点，保证安全性
* */


//基于Redis的分布式锁
/*
* 使用SET key value NX 命令获取锁，EXPIRE key seconds 命令设置锁的过期时间，防止死锁问题保证安全性
* DEL key 命令释放锁
* 但是如果刚上锁还未设置过期时间，服务器就宕机了，会导致锁无法释放，从而导致死锁问题
* 优化:
* 使用SET key value NX EX seconds 命令获取锁和设置过期时间的原子操作，保证安全性
* DEL key 命令释放锁
* value值用线程的唯一标识符(name/id)，为的是释放锁的时候能判断出锁的拥有者，从而保证安全性
* 使用Thread.currentThread().getId()获取线程的唯一标识符
*
* 案例:基于Redis实现分布式锁的初级版本
*实现这个接口，并重写tryLock()和unLock()方法
* public interface ILock {
    boolean tryLock(Long timeoutSec);

    void unLock();
}
使用setIfAbsent(KEY_PREFIX + name, clientId, timeoutSec, TimeUnit.SECONDS);
* 方法来获取锁，并同时可以在参数中设置锁的过期时间，值用线程的唯一标识符(name/id)，
* 为的是能判断出锁的拥有者线程是否变化，以及后续用于在释放锁进行判断value是否是该线程的标识，和续期过期时间,从而保证安全性
* setIfAbsent方法会在key不存在时设置key的值并返回true，如果key已经存在则返回false
*
* 案例:修改一人一单的实现，使用锁对象来获取锁和释放锁，不用Synchronized(){}锁来锁住代码块了
*因为多个服务是使用同一个Redis的，通过SETNX命令获取锁，一旦Redis中存在这个key，就无法再设置key的值
* //使用锁对象
        SimpleRedisLock lock = new SimpleRedisLock("order:" + userId, stringRedisTemplate);
        boolean isLock = lock.tryLock(1200L);
        if (!isLock) {
            return Result.fail("请勿重复下单");
        }
        try {
            IVoucherOrderService proxy = (IVoucherOrderService)AopContext.currentProxy();
            //获取的是IVourcherOrderService的接口的代理对象，调用时会触发事务拦截器
            return proxy.createVoucherOrder(voucherId);
        } finally {
            lock.unLock();
        }
只要有一个线程获取到锁设置了key，就能进入代码块执行，其他无论是哪个服务的该用户的线程，都无法再设置key的值，
因为key已经存在了，因此无法获取锁，只会返回false。只有等到锁的过期时间到了或者锁被释放了，其他线程才能获取到锁进入代码块执行
从而实现了分布式锁，保证了在集群环境下同一时间只有一个线程执行代码块，解决了之前Synchronized(){}锁在集群环境下失效的问题
* */

//基于Redis的分布式锁的高级版本
/*
* 基于Redis的分布式锁的初级版本存在一个问题：
* 比如:线程A获取锁后在执行代码块的过程中意外发生了阻塞，且阻塞时间过长甚至超过了锁的过期时间，就会导致锁被自动释放，
* 此时线程B可以获取到锁进入代码块执行，但是等到线程A执行完业务代码时会执行DEL key 命令释放锁，导致锁被释放，但这个是线程B的锁
* 此时线程C可以获取锁进入代码块执行，此时就有两个线程同时拿到了锁，从而导致了安全性问题*/


//优化1、每个线程获取锁时要设置一个自己的唯一标识符，但是如果用线程Id作为唯一标识符，可能会存在一个问题
/* 因为线程Id是由当前JVM虚拟器递增生成的，集群中在不同JVM中生成的线程Id可能会重复，
* 因此需要使用UUID.randomUUID().toString()生成一个全局唯一的标识符，来保证安全性
* 让每个线程只能删除value为自己线程唯一标识符的锁，保证安全性，需要在DEL key 命令中添加判断，判断value是否为自己的线程唯一标识符
* 只有线程自己拿到的锁才能释放，否则不操作。还是不够完美
* 极端情况:
* 线程A去释放锁，在判断value是否为自己线程唯一标识符的时候，刚要去执行释放锁，此时由于JVM的垃圾回收机制，会阻塞所有的线程，
* 导致锁无法释放，如果阻塞时间过长，超时自动释放了。线程B就可以获取到锁进入代码块执行，就在此时线程A又继续执行了，
* 因为刚刚已经判断过了，线程A认为这就是自己的锁，然后执行释放锁，导致线程B的锁被释放了，线程C就可以获取到锁进入代码块执行，从而导致安全性问题
* 为此更优化的解决方案：
* 让判断和释放锁的操作成为一个原子操作，使用Lua脚本来实现，保证安全性
* 虽然Redis中也有事务机制但是Redis的事务是批处理的，判断不会立马给出结果，而是先执行完所有命令，再统一返回结果，需要配合乐观锁才能实现
* 但是很麻烦
* Lua脚本:在一个脚本中编写多条Redis命令，确保多条命令执行时的原子性，Lua是一种编程语言，
* 它的基础语法可以在https://www.runoob.com/lua/lua-tutorial.html上学习
* 下载地址:https://github.com/rjpcomputing/luaforwindows/releases
* 定义变量:
* a = 5               -- 全局变量
* local b = 5         -- 局部变量
* 条件语句:
* if(0)
then
    print("0 为 true")
end
*想要在Lua中调用Redis命令，通过了一个内置函数redis.call('命令名称','key','其他参数',……)，
这个函数可以调用Redis命令，并返回结果，例如set name "张三" 在Lua脚本中可以写成redis.call('set','name','张三')

写好脚本后，使用Redis的EVAL命令来执行Lua脚本(在虚拟机中运行)，EVAL命令的语法如下:
EVAL script numkeys key [key ...] arg [arg ...]
其中script是Lua脚本的内容，numkeys是脚本中使用的key的数量，key是脚本中使用的key，arg是脚本中使用的value等其他参数
使用时为了知道使用哪个key，可以使用KEYS[]和ARGV[]来代替key和value参数，KEYS[]是一个数组，ARGV[]是一个数组，
例如:
EVAL "return redis.call('get', KEYS[1])" 1 name
//1是脚本中使用的key的数量，name是key的名称，KEYS[1]表示使用的是第一个key的名称，KEYS[1]=name，从而不把key和value写死
这个命令会执行Lua脚本，获取name这个key的值并返回

* 案例:编写Lua脚本实现分布式锁的释放，保证安全性
* local key = KEYS[1] local value = ARGV[1] -- 获取传入的key和value参数
* if (redis.call('get', KEYS[1]) == ARGV[1]) then
* return redis.call('del', KEYS[1])
* end
* return 0
*
* 案例:在Java代码中调用Lua脚本来释放锁，保证安全性
* 要在Java代码中调用用Lua脚本需要调用RedisTemplate去调用Lua脚本的Api:
* public <T> execute(RedisScript<T> script, List<K> keys, Object... args){
* //execute方法类似于EVAL命令,参数分别为Lua脚本，key和value参数，会将key和value参数传入Lua脚本中执行，keys要求是一个单元素列表
* //用Collections.singletonList()方法将key参数转换为单元素列表
*   return scriptExecutor.execute(script,  keys, args);
* }
*但是最好不是直接在Java代码中写Lua脚本，而是写在一个外部文件中，然后将Lua脚本文件导入到项目中，然后调用RedisTemplate的execute方法传入Lua脚本文件，
* 要在Idea中创建一个Lua文件，需要安装EmmyLua插件，安装好后就可以在Idea中创建一个Lua文件了
*
* private static final DefaultRedisScript<Long> unlock_script ;
* //创建一个静态变量，保存Lua脚本,DefaultRedisScript继承自RedisScript是用于创建一个Lua脚本的对象，泛型为Lua脚本的返回值类型
    static {//在静态代码块中初始化DefaultRedisScript对象
        unlock_script = new DefaultRedisScript<>();//创建一个DefaultRedisScript对象
        unlock_script.setLocation(new ClassPathResource("unlock.lua"));//使用类路径获取Lua脚本
        unlock_script.setResultType(Long.class);//设置Lua脚本的返回值类型为Long
    }
 //因为这个静态变量和静态代码块只会在类加载的时候执行一次，之后都不会再执行
 之后通过RedisTemplate的execute方法传入Lua脚本对象和key参数，就可以执行Lua脚本，并返回结果
*stringRedisTemplate.execute(unlock_script, Collections.singletonList(KEY_PREFIX + name),
* ID_PREFIX + Thread.currentThread().getId());
*
* */







//优化2、
/*
基于setnx实现的Redis分布式锁存在不可重入问题:同一个线程无法多次获取同一把锁
例如:
一个业务中需要在方法A中调用方法B，方法A需要获取锁才能去执行业务调用方法B，而方法B也需要获取同一把锁才能去执行业务调用，
但同一个线程无法多次获取同一把锁，此时就会等待锁的释放，但是方法A还没有执行完，锁就不能释放，就一直等待，那么就会导致死锁问题

存在不可重试问题:获取锁只尝试一遍就返回false，没有重试机制

存在超时释放问题：锁的过期时间过短，可能会导致业务还没有执行完成就到期释放锁了，导致锁被其他线程获取，引发线程安全，
而锁的过期时间过长，线程被阻塞很久，无法执行，导致线程安全，

存在主从一致性问题:如果Redis提供了主从集群，因为写操作是访问主节点，读操作是访问从节点，
主节点需要将数据同步给所有从节点，保证主从节点之间的数据一致性，从而可以在多个从节点读取数据，提高读性能，
因为主从节点之间存在数据同步延迟，而setnx上锁是写操作，需要访问主节点，极端情况下倘若此时主节点宕机了，
但数据还没有同步到从节点，所选出来的替代主节点的从节点中没有锁的数据，其他的线程就可以获取锁，因为有多个从节点，就会导致多个线程拿到锁
导致线程安全问题
想要完全解决这些问题会很麻烦 ，

因此我们可以使用Redisson来实现分布式锁，
官网:https://redisson.org/ Github:https://github.com/redisson/redisson
Redisson是一个基于Redis的基础上实现的Java驻内存数据网格(In-Memory Data Grid)，提供了丰富的功能，其中就包括分布式服务

Redisson的分布式锁服务中就包括了各种锁的实现:
可重入锁:同一个线程可以多次获取同一把锁，Redisson会记录锁的持有者线程和锁的获取次数，只有当获取次数为0时才会真正释放锁，保证安全性
公平锁:公平锁会按照FIFO顺序获取锁，即先来的线程会先获取锁，保证线程安全
连锁:锁的实现中，锁的过期时间会根据锁的持有者线程的活跃度进行自动调整，即锁的过期时间会根据锁的持有者线程的活跃度进行自动调整，
红锁:红锁会自动选择一个主锁，其他锁会自动选择从锁，保证线程安全
读写锁:读写锁可以同时支持读和写操作，读操作可以并发执行，写操作需要获取锁，保证线程安全
信号量:信号量可以限制并发访问的线程数，保证线程安全
可过期性信号量:可过期性信号量可以限制并发访问的线程数，并且可以设置锁的过期时间，保证线程安全
闭锁:闭锁可以等待多个线程的完成，保证线程安全

* */

//Redisson入门
/*
* 1、引入依赖
* <dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.17.6</version>
</dependency>
*2、 配置Redisson客户端
* @Configuration
* public class RedisConfig {
* @Bean
* public RedissonClient redissonClient(){
* //配置类
* Config config = new Config();
* //单节点配置，添加redis地址和密码，如果要用Redis集群模式，使用config.useClusterServers()方法进行配置
* config.useSingleServer().setAddress("redis://192.168.100.128:6379").setPassword("123321");
* //创建客户端
* return Redisson.create(config);
* }
* }
* 3、
* 使用时通过@Resource注解注入RedissonClient对象，然后调用RedissonClient对象中的方法即可
*  RLock lock = redissonClient.getLock("order:" + userId);
        lock.tryLock();
        //可以传三个参数，分别是等待时间、锁的过期时间和时间单位，等
        可以是两个参数等待时间和时间单位，或者不传参数等，
        等待时间是指如果获取锁失败了，等待多长时间后重试获取锁，默认值为-1表示不等待，获取锁失败就返回false
        锁的过期时间是指锁的过期时间，单位是秒，默认值是30秒。超过30秒后锁就会自动释放，
        lock.unlock();
*
* */

//Redisson可重入锁原理
/*
* 之前的不可重入是因为setnx操作，存入到Redis中的key-value都是字符串，字符串的value是固定的，已经设置可以不能再次设置，
* 导致无法实现锁的可重入
* Redisson可重入锁原理：使用的是value值为hash的命令，hash的key为线程唯一标识，value为锁的获取次数，不会因为key被设置了，而不能再次设置
* 当获取锁时会将获取次数加1，当释放锁时将获取次数减1，当获取次数为0时，表示已经没有任务要执行了，删除key。
* 例如:
个业务中需要在方法A中调用方法B，方法A需要获取锁才能去执行业务调用方法B，而方法B也需要获取同一把锁才能去执行业务调用，
线程在方法A中获得锁之后将获取次数加1，方法B获得锁之后将获取次数加1，方法B执行完方法的业务后会对获取次数进行判断，如果次数大于0
* 将获取次数减1，回到方法A继续执行，否则直接删除key释放锁
方法A执行完毕之后，，将获取同样会对获取次数进行判断，如果次数大于0，进行次数减1。否则删除key，
* 因为hash类型命令无法实现只能设置一次key
* 为了防止相同用户Id的线程来获取锁，导致锁被其他线程获取，
* 会用Lua脚本进行判断(流程很多为了保证原子性):
* 会先判断Redis中是否有这个key，如果有key则判断value的filed是否为当前线程的标识，
* 如果为当前线程的标识则将value值+1，并重置过期时间，否则返回false，不让该线程获取锁
* -- KEYS[1] 是锁的Key (如 lock:user_1001)
-- ARGV[1] 是当前线程的唯一标识 (如 a1b2c3d4-...:101)
-- ARGV[2] 是锁的过期时间

-- 1. 如果锁不存在，直接创建并设置重入次数为1
if (redis.call('exists', KEYS[1]) == 0) then
    redis.call('hset', KEYS[1], ARGV[1], 1)
    redis.call('expire', KEYS[1], ARGV[2])//重置锁的过期时间
    return 1 -- 成功
end

-- 2. 如果锁存在，检查线程唯一标识，判断持有者是不是自己
if (redis.call('hexists', KEYS[1], ARGV[1]) == 1) then
    -- 是自己，重入次数加1
    redis.call('hincrby', KEYS[1], ARGV[1], 1)
    redis.call('expire', KEYS[1], ARGV[2])//重置锁的过期时间
    return 1 -- 成功重入
end

-- 3. 锁存在但不是自己持有的，返回失败
return 0
*
*释放锁时还需要判断此时的锁是否是改线程的，不是的话就不操作
是的话将获取的次数减一，然后会判断锁的获取次数，如果获取次数不为0，则重置锁的过期时间，否则删除key
* 释放锁的Lua脚本:
* local key = KEYS[1]
* local threadId = ARGV[1]
* local  releaseTime = ARGV[2]
* //判断锁是否是自己的
* //如果已经不是自己的锁，则直接返回
* if (redis.call('hexists', key, threadId) == 0) then
* return nil;
*
* end;
* //是自己的就，将锁的获取次数减
* local count=redis.call('hincrby', key, threadId, -1)
* //获取次数大于0，则重置锁的过期时间
* if (count > 0) then
* redis.call('expire', key, releaseTime)
* return nil;
* end;
* //获取次数为0，则删除锁
* redis.call('del', key)
* return nil;
*
* end;
*
* 案例:测试可重入锁，Redisson可重入锁的实现原理
* 注意！！！
* 最好是在每个测试方法
* 开始前初始化RedissonClient对象，因为RedissonClient对象是单例的
* 所以可以定义一个方法，在测试方法开始前调用，
* @BeforeEach
    public void setup() {
        lock = redissonClient.getLock("order");
    }
*
* 小技巧:查看源码中方法的实现类，ctrl + alt + B
* 在源码中可以看到，也是用Lua脚本实现的
*
* */

//Redisson解决锁重试、超时释放问题的方法的原理
/*
* 查看源码:
* 重试和超时释放:
* 调用trylock()开始尝试获取锁时，
* 根据参数的值，底层会调用不同的方法，如果没有传过期时间，则
* 调用tryLock(waitTime, -1, unit)
* 即调用tryLock(waitTime, leaseTime, unit)方法
* 再调用 Long ttl =tryAcquire(waitTime, leaseTime, unit, threadId);
* 会执行Lua脚本，判断返回的TTL是否为null
* 如果ttl为null，则说明锁获取成功，
* 再判断如果传过了过期时间，则直接返回true，
*  if (ttl == null) {
            return true;
        }
* 如果没有过期时间，则调用看门狗时间，看门狗时间默认是30秒，开启watchDog()方法，开启一个定时任务，定时续期锁的过期时间
*              tlRemaining == null) {//锁获取成功则返回的值为null
                if (leaseTime > 0) {//如果有过期时间
                    internalLockLeaseTime = unit.toMillis(leaseTime);//设置将过期时间设置为毫秒
                } else {
                    scheduleExpirationRenewal(threadId);
                    //调用scheduleExpirationRenewal方法，开启一个定时任务，定时续期锁的过期时间
                }
  如果返回的TTL不为null
    time -= System.currentTimeMillis() - current;//计算锁的剩余时间
 // 判断锁的剩余时间，如果剩余时间小于等于0，则说明锁已经过期了，就会直接返回false，不再尝试获取锁了
        if (time <= 0) {
            acquireFailed(waitTime, unit, threadId);
            return false;
        }
* 判断锁的剩余时间，如果剩余时间大于0，则订阅并监听锁的释放信号，此时收到其他线程释放锁的信号了，会判断是否超时，
* 如果等待时间大于锁的剩余时间，则直接返回false，不再尝试获取锁了
* 如果未超时，会再次尝试获取锁回到第一步
*
*unlock()方法
* 调用unlock()方法时，会执行Lua脚本，
* KEYS[1]:锁的 key、KEYS[2]:Redis 发布订阅的频道名、ARGV[1]:发布的消息内容（通常是解锁信号）、ARGV[2]:锁的过期时间（毫秒）
ARGV[3]:当前线程的唯一标识
* "if (redis.call('hexists', KEYS[1], ARGV[3]) == 0) then " +//如果锁不是自己的
                        "return nil;" +
                        "end; " +
                        "local counter = redis.call('hincrby', KEYS[1], ARGV[3], -1); " +//是自己的则减1
                        "if (counter > 0) then " +
                        "redis.call('pexpire', KEYS[1], ARGV[2]); " +//重置锁的过期时间
                        "return 0; " +
                        "else " +
                        "redis.call('del', KEYS[1]); " +//删除锁
                        "redis.call('publish', KEYS[2], ARGV[1]); " +//发布释放锁信号给订阅者
                        "return 1; " +
                        "end; " +
                        "return nil;",
* 如果释放锁成功，则返回true，否则返回false并记录错误日志
* 释放锁成功，会通过publish发布释放锁信号给订阅者，并取消watchDog的定时任务
*
*总结:
*可重试:是通过利用信号量和订阅发布的机制实现等待、唤醒、获取锁失败的重试机制(只有传了等待时间才会启动重试机制)
*锁超时释放:利用看门狗机制(watchDog)当没有传入过期时间时，会开启一个定时任务，定时续期锁的过期时间(每隔一段时间就重置过期时间)
*
* */


//Redisson解决主从一致性问题的原理
/*
* 因为主从集群的Redis的服务器毕竟不是同一个，所以主从节点之间进行数据的同步时会存在延时，
* 极端的情况下，当主节点宕机了，Redis哨兵监控到了，会从从节点选举出一个新的主节点了，但是数据还没有同步到新的主节点上，此时其他线程就可以获取到锁了，
* RedisMaster是主节点，RedisSlave是从节点。
* 解决方法:移除主从节点的概念，全部都是一样的节点，
* 这样的话线程获取锁的方式就变了，之前只需要在RedisMaster节点获取锁就行了，现在需要依次向多个节点都获取锁，才算是获取锁成功了，
* 此时就不会出现主从不一致性问题，当某一个节点宕机了，其他节点上仍有锁，其他线程就无法获取锁了，保证了线程安全
* 为了提高可用性，因为这样的话每宕机一台集群就会少一台，，所以可以让每一个节点都有一个从节点，这样即使这台节点宕机了，还能有它的从节点来提供服务，保证高可用性
* 加上了从节点，也不会引起主从不一致性问题，因为线程被要求必须在多个节点上获取锁，才算获取锁成功，即使某一台出现了主从不一致性问题了
*其他线程在这个台节点上获取到了锁，但是其他的节点没有获取到锁，仍然不算是获取锁成功了，保证了线程安全
* 这用的是Redisson的multiLock(连锁)原理
* 测试:
*
* 在Redis中开启多个端口实例，模拟Redis集群效果(使用单程序多配置文件)
* 在虚拟机中，找到原先的Redis的配置文件redis.conf。
* 复制多个配置文件：cp redis.conf redis-6380.conf，cp redis.conf redis-6381.conf
* 再创建两个文件夹来存储日志文件
* mkdir /usr/local/src/redis-6.2.6/data/6380、mkdir/usr/local/src/redis-6.2.6/data/6381
* 有一个批量复制的命令(使用的是管道组合命令，批量复制)
* mkdir 7001 7002 7003 : 创建三个文件夹7001、7002、7003并放置在当前目录下
* echo 7001 7002 7003 | xargs -t -n 1 cp redis.6.2.6/redis.conf:就能将redis.conf复制到7701、7002、7003三个文件夹下
*
* 在 vi 界面中，按键盘上的 i 键，左下角会出现 -- INSERT --，表示可以输入了。
  修改/添加以下 4 项内容（可以用方向键移动光标）：
  端口：找到 port 6379，改为 port 6380和port 6381
   后台运行：找到 daemonize no，改为 daemonize yes（这很重要，否则关闭窗口进程就断了）
   PID 文件：找到 pidfile /var/run/redis_6379.pid，改为 pidfile /var/run/redis_6380.pid
   数据目录：找到 dir ./，建议改为一个绝对路径，例如 dir /usr/local/src/redis-6.2.6/data/6380
   注意！！！6379是默认端口，所以Linux系统的防火墙可能会默认放行6379端口，
   所以需要在Linux系统的防火墙中放行6380和6381端口或者关闭Linux系统的防火墙

有一个快速修改配置信息的命令
* sed -i 's/^port 6379$/port 6383/; s|^dir \./|dir /usr/local/src/redis-6.2.6/data/6383|' redis-6383.conf
* 批量修改的命令:
* printf '%s\n' 6380 6381 6382 6383 | xargs -I{} sed -i "s/^port 6379$/port {}/; s|^dir \./|dir /usr/local/src/redis-6.2.6/data/{}|" data/{}/redis.conf
* 表示:批量修改文件夹下的redis.conf文件，将端口号从6379改为xxxx，数据目录从./改为/usr/local/src/redis-6.2.6/data/xxxx
* 将redis-6380.conf文件中端口号从6379改为6383，数据目录从./改为/usr/local/src/redis-6.2.6/data/6383
port{}就是占位符，将{}中的内容替换掉
注意！！！因为虚拟本身有多个IP，所以为了避免混乱，需要在redis.conf中指定一个实例绑定ip信息
* 格式:replica-announce-ip 192.168.100.128
* 使用命令修改:sed -i 'la replica-announce-ip 192.168.100.128' redis-6383.conf
* 批量修改命令:
* printf '%s\n' data/6380 data/6381 data/6382 data/6383 | xargs -t -I{}  sed -i '$a replica-announce-ip 192.168.100.128' {}/redis.conf
* 表示:批量修改7001、7002、7003三个文件夹下的redis.conf文件，将replica-announce-ip 192.168.100.128添加到文件末尾中
使用cat 7001/redis.conf命令可以查看配置信息

* 然后在Redis配置类中再写几个RedissonClient的@Bean对象
* 方法名要不一样
* @Bean
 public RedissonClient redissonClient() {
     //配置类
     Config config = new Config();
     //单节点配置，添加redis地址和密码，如果要用Redis集群模式，使用config.useClusterServers()方法进行配置
     config.useSingleServer().setAddress("redis://192.168.100.128:6379").setPassword("123321");
     //创建客户端
     return Redisson.create(config);

 }
 * @Bean
 public RedissonClient redissonClient1() {
     //配置类
     Config config = new Config();
     //单节点配置，添加redis地址和密码，如果要用Redis集群模式，使用config.useClusterServers()方法进行配置
     config.useSingleServer().setAddress("redis://192.168.100.128:xxxx");
     //创建客户端
     return Redisson.create(config);

 }
 ………………
在测试类中注入多个RedissonClient对象，注意Bean在容器中的名称就是方法名，
注入时要用Bean名称注入，可以防止注入的是同一个RedissonClient对象
*
* @Autowired
 private RedissonClient redissonClient;
  @Autowired
 private RedissonClient redissonClient2;
 @Autowired
  private RedissonClient redissonClient3;
  @BeforeEach
    public void setup() {
* 并分别调用getlock()获取锁，
*  lock=redissonClient.getLock("lock")
* lock2=redissonClient2.getLock("lock")
*lock3= redissonClient3.getLock("lock")
* 再调用getMultiLock()
*redissonClient.getMultiLock(lock,lock2,lock3)//这里无论是用哪一个RedissonClient对象调用底层都是一样的
* }
*
* 总结 :多个独立的Redis节点，必须所有节点都获取重入锁，才算获取锁成功
* */
//注意！！！！Redisson中的分布式锁都是可重入的
