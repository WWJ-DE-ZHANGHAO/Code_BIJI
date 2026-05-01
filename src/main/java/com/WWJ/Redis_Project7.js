//分布式缓存:使用Redis集群存储数据
/*
* 因为单节点的缓存存在问题:
* 1、Redis是内存存储，服务重启可能会丢失数据
* 2、当该节点压力过大时，数据无法处理，比如681上百万的并发请求
* 3、当该节点宕机，则服务不可使用了，需要一种自动回复手段(哨兵机制)
* 4、Redis基于内存，单节点能存储的数据量难以满足海量数据的需求
* */

//Redis持久化
/*
* RDB(RedisDataBase Backup file): Redis数据备份文件，也称Redis数据快照，保存数据到磁盘，默认60秒执行一次bgsave命令
* 当Redis故障重启后，可以从磁盘中读取快照文件，回复数据，默认保存在当前运行目录下(虚拟机或者windows系统下的目录)
* 使用save命令保存，但是是由Redis主进程来执行的，会导致其他的命令请求被阻塞，效率很低，因此不建议使用save命令(当Redis停机时会自动执行一次save)
* 使用bgsave命令，Redis会创建一个子进程来执行保存数据的操作，主进程继续处理其他的命令请求，不会被阻塞，因此效率更高，建议使用bgsave命令
*
* bgsave命令的触发条件是可以在Redis.conf中配置的，比如save 60 10，如果60秒内有10个文件改变，则触发bgsave命令，保存数据到磁盘中
* 还也可以在redis.conf中配置存放RDB文件的名称，比如dbfilename test.rdb，就是将RDB文件保存在test.rdb文件中
* rdbccompression 是否压缩RDB文件，默认是yes，压缩后可以节省磁盘空间，但会增加CPU的负载，因为需要进行压缩和解压缩操作
* 如果配置save "",则表示禁用RDB持久化，即Redis不会保存数据到磁盘
* 缺陷:
* 1、在触犯时间未到的时候，Redis宕机了，数据就会丢失，但是又不能将时间设置的太短，如果很短的话会频繁的创建RDB文件，
* 2、因为fork子进程、压缩、写出RDB文件的过程是很耗时的，
* 总结:停机时触发执行save、运行时自动触发执行bgsave
*
*测试:关闭再重启Redis，再次执行get key命令可以看到之前的数据，说明数据已经持久化了
* rdb文件中是各个键的数据
*
* bgsave开始时会fork主进程得到子进程，子进程共享主进程的内存数据，完成fork后读取内存数据并写入RDB文件
* fork:是操作系统的一个概念，指的是创建一个进程的副本，fork过程中主进程是阻塞的
* 注意！！！在linux系统中所有进程都无法操作物理内存，进程只能操作虚拟内存，
* 虚拟内存是操作系统为每个进程分配的一块连续的地址空间，进程只能访问自己的虚拟内存，操作系统会维护一张虚拟内存与物理内存之间的映射表，称为页表
* 虚拟内存会基于页表映射关系到物理内存这样就能实现对物理内存的读写操作了
* fork会创建一个子进程，fork的过程就是将页表复制一份给子进程，
* 子进程和父进程的页表是一样的，因此子进程和父进程映射的是同一块物理内存区域，从而实现子进程和父进程共享内存数据的效果
* 子进程就能读取主进程的虚拟内存数据，写新的RDB文件存放到磁盘中(新的RDB会替换旧的RDB文件)，完成数据的持久化了
*
* 因为是异步的，所以在子进程读取的时候，主进程仍然写新数据，，此时可能会造成脏数据
* 为此fork采用了写时复制(Copy On Write)的机制，fork后子进程和父进程共享同一块物理内存区域并把该区域标记为只读的(only read)，
* 当主进程写入新数据时，操作系统会将这块物理内存区域复制一份让主进程将新数据写入这个新的物理内存区域，之后主进程也只能读取这个新的物理内存区域，

* */

//AOF
/*AOF(Append Only File):称为Redis数据追加文件，Redis处理的每一个写命令都会记录在AOF文件中，可以看做是命令日志文件
当Reids宕机重启后，只需要将AOF中的所有命令文件全部重新执行一遍，就可以恢复数据，因此AOF文件可以理解为Redis的持久化文件
注意！！！AOF默认是关闭的，需要手动开启，在redis.conf中配置appendonly yes来开启AOF持久化，
默认保存在当前运行目录下(虚拟机或者windows系统下的目录)，文件名默认为为appendonly.aof

AOF记录命令的频率和RDB一样可以通过在redis.conf中
配置appendfsync 来设置，
appendfsync everysec:写命令执行完之后先放入AOF缓冲区，然后表示每隔一秒就将缓冲区的数据写到AOF文件，这是默认方案(效率较高，但是可能会丢失一秒内的数据）
appendfsync always:表示每次执行命令，就立即记录到AOF文件(可靠性高，几乎不会丢失数据，但是效率会下降)
appendfsync no:写命令执行完之后先放入AOF缓冲区，然后由操作系统决定什么时候将缓冲区的数据写到AOF文件中(性能最高，但是可能会丢失数据，甚至可能会丢失所有数据)
都由主进程来执行，当主进程接收到Redis命令后，先操作内存，再将命令写到AOF文件中(类似数据库)

测试AOF持久化功能:先关闭RDB持久化，然后开启AOF持久化，删除rdb文件。
执行一些写命令，查看AOF文件中是否有记录这些命令，重启Redis后查看数据是否恢复了
缺陷:
AOF会记录所有命令，即使是set num 11、set num 12这样对一个键进行多次赋值，AOF文件也会记录这两个命令，这样AOF文件就会非常大，
而RDB文件则只记录最后一次给键赋值的结果，因此RDB文件会比较小，
为了解决该问题:
就有了AOF重写功能，通过执行bgrewriteaof命令来触发AOF重写，这个命令是后台开启一个新的线程异步执行的，因此不会阻塞Redis的命令
AOF重写会创建一个新的AOF文件，新的AOF文件中只记录最后一次给键赋值的结果，会将AOF文件中的命令进行合并，
合并成一个命令来记录到新的AOF文件中，这样AOF文件就会变小很多
例如:set num 11、set num 12 set name zhangsan重写后变为mset num 12 name zhangsan
，这样就只记录了最后一次给num赋值的结果了，重写后的AOF文件就会比较小了。

注意！！！！！
设置save ""和删除rdb文件以及开启AOF后需要重启Redis才能生效
重启命令:sudo systemctl restart redis

可以通过设置配置来触发AOF重写
auto-aof-rewrite-percentage 100 :默认是100，表示AOF文件大小比较上次，增长超过100%时，触发AOF重写
auto-aof-rewrite-min-size 64mb :默认是64mb，表示AOF文件大小超过64mb时，触发AOF重写

注意！！
每次使用AOF重写功能只会将此时之前的命令进行合并，之后的命令不会进行合并
总结:
AOF持久化是将命令先放到aof_buf内存缓冲区，然后开启一个独立线程根据策略进行刷到磁盘中(fsync:刷盘)
主线程会进行判断fsync的时间，如果刷盘时间超过2秒，就会认为缓存的数据出问题了，主线程会阻塞等待直到fsync结束
导致在这期间的其他的所有操作都没法继续执行。
AOFRewrite操作的是当前内存中的数据，不是已经持久化到磁盘的旧的AOF文件



* */
//Redis持久化总结
/*
* RDB是定时对整个内存进行快照保存，AOF是记录每次执行的命令
* RDB两次备份的间隔时间间隔较大数据丢失较多，
* AOF记录每次执行的命令，数据丢失较少，
* RDB文件较小，AOF文件较大，
* RDB恢复数据较快，因为RDB存储的是key的数据，只需要读取key的数据，
* AOF恢复数据较慢，因为AOF存储的是命令，需要执行命令才能恢复数据
* 如果同时有RDB和AOF两个文件，Redis重启的时会以AOF文件优先读取，因为AOF文件记录了每次执行的命令，数据更完整，RDB文件可能会丢失一些数据
* RDB对于系统的资源占用高，因为在极端情况下，RDB会占用两倍的内存，因为为在执行bgsave命令时会创建一个子进程来执行保存数据的操作，
* 主进程继续处理其他的命令请求，RDB会创建一个临时文件保存数据，然后把临时文件移动到RDB文件中
* 使用场景:
* 1.数据量小的场景，数据量小的场景下，使用RDB持久化，因为RDB文件较小，数据恢复较快，效率较高，但是数据丢失较多
* 2.数据量大的场景，数据量大的场景下，使用AOF持久化，因为AOF文件较大，数据恢复较慢，但是数据更完整，效率较高
* 可以同时开启RDB和AOF持久化，这样既能保证数据的安全性，又能提高效率
* */


//Redis主从集群结构
/*
* 单节点的Redis的并发能力是有上限的，要进一步提高Redis的并发能力，需要搭建主从集群，实现读写分离
* 因为Redis应用当中都读操作的占比较大，写操作较少，更多是应对读操作的请求
* 写操作访问主节点，读操作访问从节点，这样就能提高Redis读的并发能力了
* 为了让用户无论访问哪个从节点读取到的都是同样对的数据，所以需要把主节点的数据同步给每一个从节点
* 从节点在5.0以前是叫Slave，5.0以后叫Replica
*
* 搭建主从集群:
* 注意！！！需要先将redis.conf恢复到原始模式:开启RDB关闭AOF
*  创建了3个从节点，分别是6380、6381、6382
* 开启主从关系:可以使用replicaof或者slaveof命令来开启主从关系，replicaof是5.0以后的命令，slaveof是5.0以前的命令，作用是一样的
* 有两种临时和永久两种模式
* 永久模式:在从节点的redis.conf中添加一行配置:slaveof <masterip> <masterport>，然后重启从节点，这样就能永久的开启主从关系了
* 临时模式:使用slaveof命令来开启主从关系，
* 例如:slaveof <masterip> <masterport>，这样开启主从关系，但是重启节点后，主从关系就会丢失，
*
* 查看主从关系:在主节点执行info replication命令，可以查看该节点在集群状态信息
* 注意！！！
* 建立了关系后，从节点就无法在进行写操作了
* 主节点写的数据，可以在从节点上进行读取，说明主从关系建立成功了
* 注意！！！！
* 如果主节点有密码，
* 临时关系:从节点需要配置密码，CONFIG SET masterauth 主节点密码
* 密码配置成功后，让从节点变为独立主节点之后，主节点和从节点才能重新建立关系，
* 如果想让从节点变回独立节点:使用REPLICAOF NO ONE命令。 的意思是让当前节点不再作为任何节点的从节点，变为独立的主节点
* 永久关系:在从节点的redis.conf中添加
指定主节点地址和端口
replicaof 192.168.100.128 6379
主节点的密码（必须配置，否则无法连接）
masterauth 你的主节点密码

* 注意！！！
* 当某个主节点停机状态，此时一个节点设为该主节点的从节点，因为主节点停机了，从节点就会一直尝试连接主节点，
* 直到主节点恢复后，从节点就会进行全量同步
*
* */

//数据同步原理
//全量同步
/*
全量同步:将主节点的数据全部同步给从节点，适用于主从第一次同步或者主从关系断开后重新建立关系的情况
* 主从第一次同步是全量同步
* 1、当从节点执行replicaof命令后，会向主节点发送请求数据同步
* 2、主节点会进行判断是不是第一次同步(通过判断从节点发送的replid和offset)，
* 如果是第一次同步，主节点会先将其版本信息(主节点的replid和offset)返回给从节点，从节点会保存该版本信息(用这个replid替换自己的replid)
  并后续进行全量同步
* (如果不是第一次同步，主节点会判断从节点的offset判断同步进度，如果从节点的offset落后于主节点，则说明需要进行增量同步)
* (以上是第一阶段)
* 3、主节点会通过bgsave命令，生成一个RDB文件，然后把RDB文件发送给从节点，
* 4、从节点接收到RDB文件后，会先将本地数据清空再加载RDB文件中的数据，完成第一次全量同步，使得主从节点的数据基本一致
* 因为bgsave是异步子进程，主进程可能会在bgsave执行过的过程中，继续处理其他命令请求，将新数据写入内存。所以主从节点的数据可能不一致
* 为了使得主从节点数据一致，主进程会将bgsave执行期间处理的各种写命令记录到repl_backlog缓冲区中，
* (以上是第二阶段)
* 5、等到bgsave执行完成后，主节点会发送增量命令，将repl_backlog缓冲区中的命令(执行bgsave期间的处理的命令)发送给从节点，
从节点执行这些命令后，就能使得主从节点的数据完全一致了
*
*
如何判断slave是不是第一次来同步数据?
会使用Replication Id和offset来判断
Replication Id:简称replid，是数据集的标记，id一致则说明是同一数据集，每一个master都有唯一的replid，slave则会继承master的replid
offset:是数据集的偏移量，随着记录在repl_backlog中的数增大而逐渐则增大，slave完成同步时也会记录当前同步的offset(同步一个条命令就会增加1)
如果slave的offset小于master的offset，则说明slave的数据落后于master，需要更新
因此slave做数据同步，必须向master声明自己的replid和offset，master才可以判断到底需要同步哪些数据

只要replid不一致，一定是第一次同步数据，需要进行全量同步，slave会将master的replid替换掉自己的replid
而且注意！！！
slave在成为从节点之前也是主节点，所以slave也有自己的replid，只有在第一次向某个主节点申请同步数据时，
才会继承该主节点的replid替换自己的replid

全量同步因为耗时较长，性能较差，所以最好是用增量同步来保持主从数据的一致性。
 */

//增量同步
/*
* 一般会在slave重启后进行增量同步，因为slave在重启的过程中Master可能会继续处理命令请求，
* 导致数据发生变化，主从不一致，此时slave重启后就需要进行增量同步了
* 1、当从节点重启后，会向主节点发送请求数据同步
* 2、主节点会进行判断是不是第一次同步(通过判断从节点发送的replid和offset)，
* 3、发现不是第一次同步，主节点会发送continue命令，告诉从节点继续进行增量同步
* 4、主节点会根据从节点的offset去读取repl_backlog缓冲区中，在offset之后的命令，发送给从节点
* 5、从节点收到命令后，会执行这些命令，完成增量同步，使得主从节点的数据完全一致了
*
* 提问:offset是记录在repl_backlog缓缓冲区的哪个部分，是怎么找到offset之后命令的？
* repl_backlog的本质是一个数组，这个数组很特殊，当其数据到达上限后，会重新开始覆盖之前的数据，
* 因此这个数组中存储的命令是一个环形的队列，offset就是这个环形队列中的一个指针，
* master的offset和slave的offset都会在循环队列中，
* slave的offset指向的位置就是当前从节点已经同步的命令的位置，
* master的offset指向的位置就是当前主节点处理的命令的位置
* 当slave的offset和master的offset相差的值超过repl-backlog-size()，salve会无法找到。
* 则slave无法进行增量同步了，只能区访问主节点的内存进行全量同步
*
* 因为遇到这种情况后是无法避免不使用全量同步的，只能避免遇到和优化全量同步
* 优化:
* 在master中配置repl-diskless-sync yes 启用无磁盘复制，避免全量同步是的磁盘IO
* Redis单节点的内存占用不要太大，减少RDB导致到的过多磁盘IO
* 避免:
* 适当提高repl-backlog的大小，发现slave宕机时尽快实现故障恢复，尽可能避免全量同步
* 限制一个master上的节点数量，如果实在太多slave，则可以采用主-从-从的链接结构，减少master的压力
*
* */


//哨兵机制
/*
* slave节点宕机恢复后可以从主节点进行同步数据，
* 但是如果主节点宕机了怎么办?
* 如果master进行了持久化还好，如果没有进行持久化，那么master宕机了就会丢失数据了
* 此时就有了哨兵机制
* 哨兵(Sentinel)机制的作用:
* 监控:Sentinel会不断的检查你的master和slave节点是否正常工作
* 自动故障恢复:当master故障，Sentinel会将一个slave提升为master，当故障的master实例恢复后也会以新的master为主
* 通知:当master故障时，Sentinel会将一个slave提升为master，此时写操作要访问的地址就变了，但是访问Redis的客户端还不知道
* 此时就需要通知客户端，告诉客户端新的master地址，这样客户端才能继续访问Redis(其实第一次客户端访问Redis也是不知道主从地址的，也是通过哨兵获取的)
*
* 哨兵是如何监控主从节点的，它怎么知道哪个出故障了?
* Sentinel基于心跳机制监测服务状态，每隔一秒向集群的每一个实例发送一个ping命令，需要实例响应pong命令
* 主观下线:如果某Sentinel节点发现某实例未在规定时间响应，则认为该实例主观下线了
* 客观下线:若超过指定数量(quorum)的Sentinel节点都认为某实例主观下线了，则认为该实例客观下线了，
* quorum值最好超过Sentinel实例数量的一半
*
* 哨兵是怎么选择新的master的?
* 要选的一定时与master节点的数据同步度最高的 slave节点即与master节点的数据差异最小的slave节点、
* 怎么判断呢？
* 1、首先判断slave节点与master节点断开时间的长短，如果超过指定值则会排除该slave节点
* 2、然后判断slave节点的slave-priority值，slave-priority值越小优先级越高，如果slave-priority值为0，则永远不会被选为master节点
* 但是slave节点的slave-priority值默认是一样的,可以跳过这个判断
* 3、如果slave-prority值一样，则判断slave节点与master节点的数据同步度即offset的值，如果offset值越大说明数据同步度越高，优先级越高
* 4、如果offset值也一样，则根据slave节点的运行id大小，越小的优先级越高
*
* 当选择了一个新的master节点之后，需要开始进行故障转移了，故障转移的步骤如下:
* 1、Sentinel会向选中的新的master节点发送一个请求让其slaveof no one命令，让新的master节点变为独立的主节点，
* 2、Sentinel会向其他的slave发送广播，让它们执行slaveof <newmasterip> <newmasterport>命令，让它们成为新的master节点的从节点，
* 3、Sentinel会强制修改故障的原先的主节点的配置文件，添加slaveof <newmasterip> <newmasterport>，让它也成为新的master节点的从节点，
*
* */

//搭建哨兵集群
/*
* Sentinel集群搭建:哨兵也需要配置IP与端口号
* 要在同一个虚拟机中开启三个实例，必须准备散步不同的配置文件和目录，配置文件所在的目录也就是工作目录
* 使用mkdir命令创建三个目录，mkdir s1 s2 s3
* 再创建三个配置文件，分别s1/sentinel.conf s2/sentinel.conf s3/sentinel.conf
* 使用vi s1/sentinel.conf会新建并进行该配置文件的编辑
* 配置文件内容如下:
port 27001
sentinel announce-ip 192.168.100.128//声明该Sentinel实例的IP地址
sentinel monitor mymaster 192.168.100.128 6379 2
//表示监控的集群(即主节点），参数依次为：主节点名称 主节点IP 主节点端口 主节点的quorum值(即认为下线的哨兵的数量超过quorum的值，就认为是客观下线)
sentinel down-after-milliseconds mymaster 5000
//slave与master断开的最长超时时间，表示当Sentinel节点发现主节点在5000毫秒内没有响应时，就认为主节点宕机了,默认就是5000毫秒
sentinel failover-timeout mymaster 60000
//故障恢复的超时时间，表示当Sentinel节点发现主节点宕机了，开始进行故障转移时，如果在60000毫秒内没有完成故障转移，则认为故障转移失败了，默认就是60000毫秒
dir "usr/local/src/redis-6.2.6/Setninel/s1"
*
* 注意！！！如果主从节点有密码(有的话主从节点要求密码要是一样的)
port 27002
sentinel announce-ip "192.168.100.128"
sentinel monitor mymaster 192.168.100.128 6379 2
sentinel auth-pass mymaster 123321 #要添加密码
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
dir "/usr/local/src/redis-6.2.6/Sentinel/s2"
*配置一个之后其他到的直接拷贝粘贴就行了，修改端口号和工作目录就行了
* 端口号分别为27001、27002、27003
*使用echo s2 s3 | xargs -t -n 1 cp s1/sentinel.conf 命令进行批量复制
使用sed -i 's/^port 27001$/port 27002/; s/s1/s2/' s2/sentinel.conf修改端口与目录
*
*
* 启动哨兵:
* redis-sentinel s1/sentinel.conf
* redis-sentinel s2/sentinel.conf
* redis-sentinel s3/sentinel.conf
*因为三个哨兵都是监听的端口6379的主节点
*
* 测试:
* 将主节点的6379端口停机(注意！！！！如果节点是有密码的，要真正的停机需要的命令是:redis-cli -p 6379 -a 123321 shutdown)，
* 此时日志中会出现sdown的日志，表示该哨兵主观认为该主节点下线了，
* 当超过quorum值的哨兵都认为该主节点下线了，此时就会出现odown的日志，
* 表示该主节点客观下线了，
* 此时会出现try-failover表示启动故障转移，但是三个哨兵是平等的，只需要有一个哨兵进行故障恢复就行了
* 需要投票选一个领导者哨兵来进行故障转移，就会有日志vote-for-leader，会根据谁最先发现宕机来选举领导者哨兵，
* 领导者哨兵会从从节点中选一个提升为主节点，此时会有一个日志select-slave slave 192.168.100.128 6380
* 表示选择了6380这个从节点提升为主节点了，之后会有一个日志send-slaveof-noone slave 192.168.100.128 6380
* 让6380这个节点执行slaveof no one命令，变为独立的主节点了
* 此时6380的日志中会出现MASTER MODE enable表示进入Master模式
* 然后会有一个日志reconf-slaves master 192.168.100.128 6379表示强制将6379端口的配置文件修改为slaveof 192.168.100.128 6380
* 并有日志setn-slave让其他的节点执行slaveof/replicaof
* 此时6379端点启动后，会在6380的端的日志出现replica 192.168.100.128 6379 ask for synchronization
* 表示6379这个节点向6380这个节点请求数据同步了
*
* 哨兵模式的缺陷:
* 为了提高主从同步的性能:
* Redis单节点的内存不能太大，否则在RDB持久化或全量同步的时候，会导致需要做大量的IO操作，导致性能下降
* 但是Redis的内存变低了，但又有海量的数据需要写进Redis，就会导致数据丢失
* 而且哨兵集群只能提高高并发读的性能，不能提高高并发写的性能，如果遇到像618那种需要高并发写的场景，会导致一个Master的压力很大
* 为此就需要用到Redis的分片集群
* */



//RedisTemplate的哨兵模式
/*
* Sentinel集群监管下的Redis主从集群，其节点会因为自动故障转移而发生变化，Redis的客户端必须感知到节点的变化，及时更新连接信息
* Spring的RedisTemplate底层利用lettuce实现了节点的感知和自动切换
* 引入资料中的RedisDemoData Redis依赖
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
* 在yml配置文件中指定sentinel相关信息
*为什么不配置Redis集群的节点信息呢？
* 因为集群节点的主从信息会因为故障转移而发生变化，所以不能写死Redsi集群的节点信息
* 写哨兵集群的信息，哨兵会将故障恢复后的新主节点信息返回给
* RedisTemplate，RedisTemplate会自动进行节点的切换
* 配置文件:
* spring:
  data:
    redis:
      password: 123321 #如果主节点有密码的话需要配置密码
      sentinel:
        master: mymaster  #指定监控的主节点名称,之前配置Sentinel的配置文件中写了
        nodes:  #指定redis-sentinel集群信息
          - 192.168.100.128:27001
          - 192.168.100.128:27002
          - 192.168.100.128:27003
* Java客户端可以根据这个地址找到Sentinel，从而得知Redis集群地址
* 注意！！！
* 还需要保证集群的读写操作分离，即写操作只访问Master节点，写操作只访问Slave节点
* 使用配置类
* @Bean
* public LettuceClientConfigurationBuilderCustomizer configurationBuilderCustomizer() {
* //对Lettuce的自定义配置，因为RedsiTemplate的底层就是用的Lettuce
* return configuration -> configBuilder.readFrom(ReadFrom.REPLICA_PREFERRED);
* }
* //ReadFrom是一个枚举类，
* 包括MASTER、MASTER_PREFERRED、REPLICA、REPLICA_PREFERRED
* MASTER：从主节点读取
* MASTER_PREFERRED：优先从主节点读取，如果主节点不可用，则从节点读取
* REPLICA：只从节点读取
* REPLICA_PREFERRED：优先从节点读取，如果从节点不可用，则从主节点读取(推荐)
* 用的这下面的这两个枚举。
*
*
*demo项目中的接口是传进一个key，然后根据这个key去redis中查询这个key对应的值，返回给客户端
*@RestController
public class HelloController {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @GetMapping("/get/{key}")
    public String hi(@PathVariable String key) {
        return redisTemplate.opsForValue().get(key);
    }
* 需要先开启Redis哨兵集群
*当接口接受请求后，日志中会出现尝试连接Sentinel集群的日志:
* Trying to connect to a Redis Sentinel connection for one of:[
* RedisURI [host='192.168.100.128',port=27001] ,RedisURI [host='192.168.100.128',port=27002]
* ,RedisURI [host='192.168.100.128',port=27003]]
*
*然后会根据Sentinel的配置，找到Sentinel集群，然后选择一个Sentinel节点进行连接，日志:
* connecting to Redis Sentinel address: RedisURI [host='192.168.100.128',port=27001]
*
* 开始建立连接，连接成功后会有日志:
* Connecting to Redis at 192.168.100.128/<unresolved>:27001
*
* 尝试从哨兵里面获取Redis集群的真实地址:使用的是类似集群的方法;日志:
*  dispatching
*  command SubscriptionCommand [type=SUBSCRIBE, output=MapOutput [output=null, error=null, type=multi],commandType=io.lettuce.core.protocol.Command]
* 订阅之后，哨兵就会将集群的节点信息发给客户端，日志:
* [output={name=mymaster, ip=192.168.100.128, port=6380, ]主节点、
* 后续还会发从节点的信息
* 拿到之后客户端会开始连接集群中的所有节点，日志:
* Trying to get a Redis connection for :RedisURI [host='192.168.100.128',port=6380]
* ………
* ………
* 在执行查询命令是会显示日志:
* 在lettuce中所有请求都会被翻译为comment
*日志中会有；AsyncCommand [type=GET]，表示这个请求命令是get命令，并把这个请求交给从节点处理，
* 当执行修改命令时，日志中会有；AsyncCommand [type=SET]，表示这个请求命令是set命令，并把这个请求交给主节点处理
*
* 当主节点宕机，哨兵会进行故障转移，会选择一个从节点作为新的主节点，日志中会有
* Trying to connect to a Redis Sentinel connection for one of:[
* RedisURI [host='192.168.100.128',port=27001] ,RedisURI [host='192.168.100.128',port=27002]
* ,RedisURI [host='192.168.100.128',port=27003]]，客户端尝试重新获取集群信息
*
* */


//Redis的分片集群
/*
* 使用Redis的分片集群解决Redsi单节点内存小和提高高并发读的性能
* 分片集群特征:
* 集群中有多个master，每个master保持不同数据
* 每个master都可以有多个slave，每个slave保持数据
* master之间通过ping检测彼此的健康状态(当多个master都主观认为某个master挂了，就会进行故障转移，让其从节点替代它)
* 解决内存小的问题:
*一个master的内存小，但是多个就大了，能存储的数据就更多了，此时数据存储的上限就取决于集群中master的数量。
* 解决没法高并发写的问题:
* 每个master都可以写数据，那么高并发写的问题就解决掉了，而每个master又可以有多个slave，那么高并发读依旧可以满足
*
* 此时没有哨兵，那么客户端怎么知道要访问哪个节点呢？
* 事实上此时的客户端可以访问集群中的任意节点，因为这些节点之间会做一个自动的路由，把客户端的请求路由到正确的节点去
*
* 因此此时就不需要哨兵了
*
* */

//搭建分片集群
/*
* 将之前的节点都删了，哨兵停了，
* 重新配置集群节点
* 新的配置文件:
* port 6380
* cluster-enabled yes #开启集群模式
* cluster-config-file /usr/local/src/redis-6.2.6/data/6380/nodes.conf #指定集群配置文件的路径和名称,nodes.conf会自动创建
* cluster-node-timeout 5000 #指定集群节点的超时时间，单位毫秒master之间如果5秒没有响应ping，就主观的认为宕机了，默认是5000毫秒
* dir /usr/local/src/redis-6.2.6/data/6380 #指定数据存储的目录
* bind 0.0.0.0 #任何地址都可以访问它
* daemonize yes//启动为守护进程,启动之后就不会有日志输出了
* replica-announce-ip 192.168.100.128 #声明节点的IP地址，
* protected-mode no #关闭保护模式，允许外部访问，不需要做用户名密码的校验了，谁都可以访问
* database 1 #指定默认数据库为1
* logfile /usr/local/src/redis-6.2.6/data/6380/redis.log #指定日志文件的路径和名称
*
*
*一键启动命令
* printf "%s\n" 6380 6381 6382 6383 6384 6385 | xargs -t -I{} redis-server {}/redis.conf
* {}/redis{}.conf会被替换为6380/redis.conf、6381/redis.conf、6382/redis.conf
*{}可以放在你想放的位置
*
* 关闭集群命令
* printf "%s\n" 6380 6381 6382 6383 6384 6385 | xargs -t -I{} redis-cli -p {} shutdown
* 注意！！！对conf文件修改之后一定要重新启动节点
*
* 此时master之间还没有建立关系，
* 创建集群命令:
* 在Redis5.0以前是用redis安装包下的src/redis-trib.rb来创建集群，但是Redis5.0以后，redis-trib.rb被弃用，
*
* 现在是用redis-cli --cluster命令来创建集群
* 可以用redis-cli --cluster help来获取帮助
* create命令是创建集群的命令，参数依次是
* --cluster-replicas 1表示每个master只有一个从节点，后面是集群中所有节点的地址
* Redis是将后面的地址中的前半数的端口号作为master的端口号，后面的端口号作为slave的端口号
* 例如:
* redis-cli --cluster create  --cluster-replicas 1 192.168.100.128:6380 192.168.100.128:6381 192.168.100.128:6382 192.168.100.128:6383 192.168.100.128:6384 192.168.100.128:6385
*
* 查看集群状态命令:
* redis-cli -p 6380 cluster nodes
* 该命令会显示集群中所有节点的状态信息，包括节点ID、节点地址、节点角色、主从关系、连接状态等
* */
//注意！！在分片集群环境下，连接节点的命令需要加上-c。例如redis-cli -c -p 6380

//散列插槽机制
/*
* 我们发现查看集群状态时每一个master上都会有一个hash slot，这个hash slot就是散列插槽
* 问题:写入/读取某个数据的时候，Redis怎么知道数据应该存储在哪个节点呢？
* 1、在集群创建的时候
* Redis会把每一个master节点映射到0~16383共16384个插槽(hash slot)上,由这些节点分这些插槽,每个插槽会分一部分
* 2、拿到key计算hash值，再根据hash值计算出插槽值、
* 3、根据插槽值，就能判断数据应该存储在哪个节点上了
* 为什么能使用hash slot来定位数据所在的节点了
* 因为数据key不是和节点绑定的，而是和hash slot绑定的，redis会根据key的有效部分，计算插槽值
* 分为两种情况:
* key中包含{}且{}中至少包含一个字符，{}中部分是有效部分
* key中不包含{}，key有效部分就是key
* 例如:key是num，那就根据num计算，如果是{itcast}num，那就根据itcast计算，计算方式是利用CRC16算法
* 得到一个hash值，然后对16384取余，得到的结果就是hash slot的值了
* 然后只需要查看这个hash slot所在的插槽部分是哪个节点的，Redis就知道这个数据存储在哪个节点了
*
* 为什么不和节点绑定?
* 因为一旦节点挂掉，宕机了数据就丢失了,而绑定插槽的话，即使这个节点宕机了，数据也可以跟着插槽转移到正常的节点
*
* 如果存取的时候，Redis计算出这个key不是在存储在当前节点的这个hash slot，那么Redis会重定向到正确的节点上去
* ，客户端会根据重定向的信息重新连接到正确的节点上去
*例如:
* 7001几点的hash slot是0-5460，7002节点的hash slot是5461-10922，7003节点的hash slot是10923-16383
* 当在7001节点上set a 1
* Redis根据a计算出这个key的hash slot是15495，应该存储在7003节点上，
* 但是当前连接的节点是7001节点，会立马重定向
* Redirected to slot 15495 located at 192.168.100.128:7003
* ok
*如果在7003节点上get num 1
* Redis根据num计算出这个key的hash slot是2765，应该存储在7001节点上，但是当前连接的节点是7003节点，会立马重定向
* Redirected to slot 2765 located at 192.168.100.128:7001
* 123
*
* 问题:如何将同一类数据固定的保存在同一个Redis实例(节点)避免重定向?
* 让同一类数据的key的有效部分一样，即key的大括号的值一样，
* 例如：{itcast}num1、{itcast}num2、{itcast}num3，这样它们的有效部分都是itcast，
* 计算出来的hash slot值就一样了，就会被保存在同一个节点上了
* */

//集群伸缩
/*
*集群需要可以减少和增加节点来满足业务的需求，集群伸缩就是指在集群中增加或减少节点的过程
* create:创建集群/或者创建节点
* add-node new_host:new_port existing_host:existing_port [--cluster-slave][--cluster-master-id<arg>]:添加节点
* 参数:
* new_host:new_port:新节点的IP和端口 existing_host:existing_port:集群已有节点的IP和端口
* 写已有的节点是为让集群的其他节点知道这个新节点的存在
* 如果写了这个参数--cluster-slave:就表示添加的是从节点 --cluster-master-id<arg>:指定是作为哪个master的从节点
* (不写默认添加的就是主节点)
 del-node host:port node_id:删除节点
* info:查看节点状态
*
* 案例:向集群中添加一个新的master节点，并其中存储num=10
* 因为num的hash slot是7001节点上的，想要存储num=10就要把7001的插槽放到新的master节点上
* 需求:
* 启动有一个新的master节点，端口号为7004
* 给7004节点分配插槽，使得num这个key可以存储到7004节点上
* 步骤:
* 1、先创建并将该节点添加到集群中
* 2、查询num的插槽值，并将该插槽分配给新的节点
* 分配插槽的命令:reshard host:port(集群中任意一个节点的IP和端口)
* 注意！！！分片集群的任何命令都必须要加上redis-cli --cluster的前缀
* 执行redis-cli --cluster reshard 192.168.100.128:7001
* 会输出你想将多少个插槽分配给新的节点，然后输入想要的数量
* 输入数量后，会输出你先让谁接受这些插槽，然后输入节点的id 就是IP和端口号前面的部分
* 输入id后，会输出你要从哪个节点获取这些插槽，然后输入节点的id
* 输入id后，输入done表输入id输入结束
* 输入id后，会输出是否确定，然后输入yes
*
* 课后案例:删除刚新增的节点
* 注意！！删除节点前需要将节点中的插槽迁移到其他节点中
* 删除节点的命令:del-node host:port node_id
* */

//故障转移
/*
* 测试:
* 先用watch命令:watch redis-cli -p 6380 cluster nodes，观察集群状态
* 再使用redis-cli -p 6380 shutdown让节点宕机，再观察该节点的状态
* 发现它会先从connected 变为 disconnected，然后变为 fail，
* 再过一会就会将其从节点变为master节点，再次将该节点重启后，会发现它变成了slave节点
* 以上的是自动的故障转移
*
* 手动故障转移:
* 某个节点太过老旧了，将一个新的节点作为其从节点，再将该节点宕机，此时新节点就会升级为master节点，从而实现机器的升级
* 步骤:
* 在新的节点上执行cluster failover命令
* 就可以让该新节点对应的那个master宕机，从而升级为master节点
* 底层流程:
* slave节点执行cluster failover命令
* 会向master节点发送一个消息，让其拒绝任何客户端的请求，防止会出现数据丢失
* master节点收到该消息后，会返回master当前的offset值给slave节点，slave根据该offset，并开始同步数据
* 等数据一致之后，开始故障转移，slave升级为master节点。master变为slave节点
* slave标记自己为maste并广播给集群中的master节点，故障转移的结果
* 原先的老master接受到之后就可以继续处理客户端的请求了
* 手动Failover支持三种模式:
* 缺省(默认,及上述流程)
* force:省略对offset的一致性校验，
* takeover:直接执行第5步，忽略数据一致性、忽略master状态和其他master的意见
*
* */

//RedisTemplate访问分片集群
/*
*在配置文件中写
* spring:
    data:
      redis:
        cluster:
          nodes:
            - 192.168.100.128:27001
            - 192.168.100.128:27002
            - 192.168.100.128:27003
其他的配置是和RedisTemplate的哨兵模式一样的
* */