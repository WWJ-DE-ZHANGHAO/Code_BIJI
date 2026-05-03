//Redis网络模型
//用户空间和内核空间
/*
* 服务器大多采用的是Linux系统，所以这里是以Linux为例
* 就当前我们用的Ubuntu系统和CnetOs都是Linux的发行版，其系统内核是Linux，我们在发行版中安装的Redis，Mysql等用户应用是无法直接与硬件交互的
* 都需要通过Linux内核与硬件进行交互
* 硬件主要就是:CPU、内存(RAM) 网卡(NETwork Adapter) 硬盘(Hard Disk)等等设备
  内核（Kernel）:是操作系统的核心程序，它是操作系统最底层、最核心的部分，负责管理和协调计算机的所有硬件资源，并为上层应用程序提供服务。
* 内核是可以操作这些设备的，但是也需要通过这些设备的驱动来进行操作，在驱动的基础上就可以形成对内存的管理、进程的管理、文件系统的管理、网络管理等等
* 内核的组成：进程管理、内存管理、文件系统、网络管理、设备驱动、系统调用接口
* 而想要让用户应用能访问，就必须封装一些系统调用的接口，这些接口就是内核提供的，用户应用/依赖库调用这些接口，就可以间接的完成对硬件的访问
*
┌─────────────────────────┐
│     用户空间              │  ← 用户应用运行在这里
│  (Redis, MySQL, Browser)│     权限受限，不能直接访问硬件
├─────────────────────────┤
│   系统调用接口             │  ← 边界（门）
├─────────────────────────┤
│     内核空间              │  ← 内核运行在这里
│  (进程/内存/文件/网络管理)  │     拥有最高权限，可访问所有硬件
└─────────────────────────┘
         ↓
      硬件设备
   (CPU/内存/网卡/硬盘)
* 其实内核的本质也是一个应用，即使不开启任何用户应用也会消耗占用设备资源。此时用户应用和系统内核都在消耗设备资源，
* 如果不加以任何的限制，让用户应用随意操作各种各样的资源，很有可能导致一些冲突，甚至导致系统崩溃
* 注意！！！无论是内核还是用户应用，都不能直接访问硬件设备，而不是给它们分配不同的虚拟内存空间。映射到不同的物理内存
*
* 为了避免用户应用导致冲突甚至内核崩溃，用户应用应该和内核进行隔离:
1、进程的寻址空间会划分为两部分:用户空间和内核空间
寻址空间:(访问虚拟内存空间的时候，需要知道该空间的地址，这个地址是一个无符号的整数(0-max)，max取决于CPU总线和寄存器带宽)
*例如:一个32位的系统则max=2的32次方，即用四个字节来表示一个地址
* 则它的寻址空间为0-0xffffffff，每一个值就代表一个存储单元，也就对应是一个字节的存储空间，0-0xffffffff共有4GB个存储单元
* 其中低位的3GB为用户空间，高位1GB为内核空间
*
 2、对系统权限进行划分为R0-R3。R3是风险等级最低的任何用户应用都可以访问，R0是风险等级最高的主要是一些系统型的指令
*用户空间只能执行受限的命令(Ring3),而且不能直接调用系统资源，必须通过内核提供的接口访问
*内核空间可以执行特权命令(Ring0)，可以调用一切系统资源
* 一般用户应用是运行在用户空间的，内核应用是运行在内核空间的
* 一个进行在执行的过程中因为业务比较多，可能会执行普通的命令，也可能需要执行一些特权命令，调用系统资源，因此进程就会在用户空间和内核空间之间进行切换
* 当一个进行运行在用户空间的时候就把它称为用户态，当一个进行运行在内核空间就把它称为内核态
例如:在进行IO读写操作的时候，Linux系统为了提高IO效率，会在用户空间和内核空间都加入缓冲区
* 写数据时，要把用户缓冲数据拷贝到内核缓冲区，然后写入设备
* 读数据时，要把设备数据拷贝到内核缓冲区，然后把内核缓冲数据拷贝到用户缓冲区
* 这也是一个内核态和用户态的切换
* 但是有问题:
* 当用户应用发出一个读取请求的时候，进入内核空间，如果这个数据还没准备好，比如:读取网卡但是别人还没向网卡发送数据，这时读取的进程就需要阻塞等待数据准备
* 当硬件设备的数据准备好了并将数据放到内核缓冲区中，进程就会从内核缓冲区中拷贝数据到用户缓冲区中
* 设备读取完成后，需要将读取的数据放到内核缓冲区中，然后把内核缓冲区中的数据拷贝到用户缓冲区中
* 但进程阻塞等待和拷贝数据都很影响性能。
*
* 优化提升效率的方案:
* 减少无效的进程等待、减少内核态和用户态之间缓冲区的数据拷贝
*
* */


//阻塞IO
/*
* 顾名思义，阻塞IO就是用户进程在两个阶段(等待设备数据就绪和将数据拷贝到用户缓冲区的过程)都必须阻塞等待
* 这种IO模型的优点是简单，缺点是性能下降
* */


//非阻塞IO
/*
*当读取数据时，用户进程发出一个读取请求，然后进入内核空间，内核空间会检查设备数据是否就绪，如果数据没有就绪
* 内核会返回给用户进程一个失败信号，用户进程收到信号后，会再一次发送一个读取请求，内核空间会检查设备数据是否就绪，如果还是没有就绪，
* 内核会返回给用户进程一个失败信号，用户进程收到信号后，会再一次发送一个读取请求，内核空间会检查设备数据是否就绪，如果还是没有就绪，
* 内核会返回给用户进程一个失败信号，用户进程收到信号后，会再一次发送一个读取请求，直到数据就绪就会将数据从内核缓冲区拷贝到用户缓冲区，
* 用户进程会阻塞。拷贝完成后返回一个Ok信号给用户进程，用户进程收到信号后，就会开始处理数据
* 这种IO模型，用户进程会一直的请求，出现忙等待的效果，会导致CPU空转，造成CPU使用率暴增，性能并没有比阻塞IO好
*
* */

//IO多路复用(两阶段都会阻塞)
/*
* 无论是阻塞IO还是非阻塞IO，当用户进程发出一个读取请求的时候，内核空间会检查设备数据是否就绪，如果数据没有就绪
* 阻塞IO会阻塞等待，非阻塞IO会导致CPU空转，都不能充分发挥CPU性能，
* 例如:
* 服务端处理客户端Scoket请求时，在单线程情况下，只能依次处理每一个Socket请求。如果正在处理的Socket请求的数据没有就绪，那么只能等待，
* 线程会被阻塞，其他的所有客户端Socket都必须等待，性能自然会下降
*
* Socket:指的是 网络套接字，它是操作系统提供的一种抽象接口，用于网络通信。
* 是计算机网络中用于进程间通信的一个核心概念。你可以把它想象成网络通信的“插座”或“端点”，应用程序通过这个“插座”连接到网络，从而与其他设备上的应用程序交换数据。
  它本质上是由操作系统提供的一组编程接口（API），屏蔽了底层复杂的TCP/IP协议细节，让开发者能够方便地实现网络通信。
  * Socket（中文常译为“套接字”）是计算机网络中用于进程间通信的一个核心概念。你可以把它想象成网络通信的“插座”或“端点”，应用程序通过这个“插座”连接到网络，从而与其他设备上的应用程序交换数据。
它本质上是由操作系统提供的一组编程接口（API），屏蔽了底层复杂的TCP/IP协议细节，让开发者能够方便地实现网络通信。
📚 Socket的主要类型:
Socket主要根据其通信特性来分类，最常见的两种类型是流式套接字和数据报套接字，它们分别对应TCP和UDP协议。
流式套接字 (SOCK_STREAM)	TCP	面向连接、可靠、数据有序、字节流	网页浏览(HTTP)、文件传输(FTP)、电子邮件等要求数据准确无误的场景。
数据报套接字 (SOCK_DGRAM)	UDP	无连接、不可靠、数据可能乱序或丢失、传输快	视频直播、在线游戏、语音通话等对实时性要求高、能容忍少量数据丢失的场景。
此外，还有一种原始套接字 (SOCK_RAW)，它允许开发者直接访问底层的网络协议（如IP、ICMP），通常用于网络诊断工具（如ping命令）或协议开发。
⚙️ Socket是如何工作的:
Socket通信通常遵循客户端-服务器（C/S）模型。我们以更常用的TCP（流式套接字）为例，其通信过程可以类比为打电话：
TCP Socket 通信流程
建立连接 (三次握手)
服务器端：首先创建一个Socket，并绑定一个固定的IP地址和端口号，然后进入“监听”状态，等待客户端的连接请求。
客户端：创建一个Socket，然后主动向服务器的IP地址和端口号发起“连接”请求。
服务器收到请求后，会与客户端完成“三次握手”，建立一个可靠的连接通道。
数据传输
连接建立后，客户端和服务器就可以通过这个连接双向地发送和接收数据了。TCP协议会保证数据的完整性和顺序。
断开连接 (四次挥手)
当数据传输完毕后，任意一方都可以发起断开连接的请求。双方通过“四次挥手”来确保所有数据都已传输完毕，然后关闭连接，释放资源。
UDP Socket 通信流程
UDP的通信过程则简单得多，它不需要建立连接：
客户端直接使用sendto()函数向服务器的IP和端口发送数据。
服务器通过recvfrom()函数接收数据，并能知道数据来自哪个客户端。
*
* 解决方案:
* 1、使用多线程，虽然提升了效率，但是对CPU的消耗变高
* 2、等到数据就了，用户应用才去调用读取数据的接口
* 文件描述符(File Descriptor):FD,是一个从0开始递增的无符号整数，用来关联Linux中的一个文件，在Linux中，一切都是文件，
* 例如:常规文件、视频、硬件设备，当然也包括套接字(Socket)
*
* IO多路复用:是利用单个线程来同时监听多个FD，并在某个FU可读、可写时得到通知、从而避免无效的等待、充分利用CPU资源
*
* 此时用户进程会调用select()而不是recvfrom()直接尝试读取数据(没数据导致阻塞)，Select可以接受(监听)多个Socket请求对应的Socket文件
* 然后会将这些传到内核，内核就可以检查Select监听的多个FD是否就绪(万一都没就绪，用户进程就会阻塞等待一会，等待过程中会有一个后台进程去监听哪些FD就绪
* 、一旦有FD就绪就会返回就绪信号给用户进程)如果某个FD就绪，内核会返回给用户进程一个信号告诉数据就绪了，此时用户进程会调用请求这个FD的recvfrom()
* 直接就会开始拷贝数据到用户缓冲区，拷贝过程中用户进程会阻塞，如果是多个FD就绪，用户进程会反复调用recvfrom()
*
* 监听FD的方式，通知方式又有多种实现:
* 1、select()
* 2、poll()
* 以上两种如果某个FD就绪，只会通知用户有FD就绪，但是不确定是哪个FD就绪，需要用户进程逐个遍历，进行判断，
* 3、epoll()
* epoll则会在通知用户进程FD就绪的同时，将已就绪的FD写入用户空间中，用户进程可以立马知道哪个FD就绪，从而进行数据处理
* */

//IO多路复用的实现- select
/*
* select是Linux中最早的IO多路复用实现方式
*步骤:
* typedef long int __fd_mask;//给long int定义一个别名__fd_mask，在c语言中long int是32位
* //创建一个fd_set结构体，就是存发被监听的FD的集合
* struct fd_set {
* __fd_mask fds_bits[__FD_SETSIZE / __NFDBITS];//两常量分别是1024和32 ，所以fd_set结构体的大小为1024/32=32，而__fd_mask的大小为32
* 所以可以存储1024位，而一个FD占用一个bit，所以可以监听1024个FD，
* }
*
* select()函数:
* int select(int nfds, //要监听的fd_set中的最大的FD + 1(内核会根据这个最大值进行遍历)
* fd_set *readfds, //要监听的读事件的FD集合
* fd_set *writefds, //要监听的写事件的FD集合
* fd_set *exceptfds, //要监听的异常事件的FD集合
* struct timeval *timeout);//超时时间
* 执行select函数，用户进程会切换成内核态进入内核执行，
*
* 如果要监听的FD=1、2、6，会创建一个fd_set集合并将1、2、6三个位置的bit置1
* 执行select()函数，拷贝一份__fd_set到内核空间
* 内核会根据最大值nfds，遍历__fd_set找要监听的FD，并查看对应的是否就绪，
* 如果都没就绪，内核态的用户进程会在内核中休眠、后台的进程会继续监听，一旦有FD就绪，会将用户进程唤醒，开始遍历
* 并将fd_set中非就绪的要求监听的bit置0，
* ，随后将结果__fd_set覆盖到用户空间的，但仅返回已就绪的FD，没有告诉具体是哪一个，用户进程需要自行判断
* 且这次还有未就绪的FD。还需要重新创建fd_set并调用Select函数，这就会很浪费空间每次都要重新创建并调用函数
*
* 问题:
* 1、需要将整个fd_set集拷贝到内核空间，结束时还需要将fd_set集拷贝回用户空间
*2、select无法得知具体是哪个FD就绪，只能返回已就绪的FD，不能返回具体是哪一个FD就绪
* 3、fd_set最多只能监听1024个FD
*
* */

//IO多路复用的实现- poll
/*
* poll相对select来说做了改进，但是性能提升不明显
* typedef long int __fd_mask;//给long int定义一个别名__fd_mask，在c语言中long int是32位
*
* pollfd中的事件类型
* POLLIN: 读事件
* POLLOUT: 写事件
* POLLERR: 异常事件
* POLLNVAL: fd未打开
*
* //创建一个pollfd结构体，就是被监听的FD
* struct fd_set {
* int fd; //要监听的FD
 short int events; //监听的事件，读、写、异常事件
 short int revents; //实际发生的事件
* }
*
* select()函数:
* struct pollfd *fds, //pollfd数组。可以自定义大小
*nfds_t  nfds, //pollfd数组的长度
* int timeout);//超时时间
*
* 与select()函数一样，相比，Pollfd是无上限的，可以监听任意个FD，依旧是需要拷贝两次，而且当FD很多的时候，每次遍历的时间消耗也会较长
*性能反而下降。
* */

//IO多路复用的实现- epoll
/*
* epoll模式是对select和poll的改进，性能提升明显
* 提供了三个函数:epoll_create()、epoll_ctl()、epoll_wait()
* 创建epoll实例
* struct eventpoll {
*   struct rb_root rbr;//这是一个红黑树，用于记录要监听的FD
*   struct list_head rdlist;//这是一个链表，用于记录已经就绪的FD
* };
* int epoll_create(int size);//调用该方法，会在内核创建eventpoll实例，并返回对应的句柄epfd，作为eventpoll实例的唯一标识
*
* int epoll_ctl(int epfd, //eventpoll实例句柄,就能知道要将就绪的FD添加到哪个eventpoll实例中
* int op, //要执行的操作，包括:ADD、MOD、DEL，可以给rb——root红黑树添加、修改、删除FD
* int fd, //要监听的FD
* struct epoll_event *event//监听的事件类型
* );//这个方法会将一个FD添加到eventpoll实例中，并设置ep_poll_callback。当callback触发时，就把对应的FD加入到rdlist就绪列表中
*
* int epoll_wait(
* int epfd, //eventpoll实例句柄
* struct epoll_event *events, //空events数组，用于接受就绪的FD
* int maxevents, //events数组的最大长度
* int timeout//超时时间，-1表示无超时、0表示立即返回、正数表示阻塞时间
* );
*
* 流程:
* 1、创建epoll实例
* 2、调用epoll_ctl()方法将FD添加到eventpoll实例的rbr红黑树中，设置回调函数ep_poll_callback，一旦FD就绪，就会调用回调函数ep_poll_callback
* 3、调用epoll_wait()方法，会查看rdlist链表中，是否有数据
* 如果此时还没有就绪的FD，则会根据设置的timeout阻塞一段时间，等待有FD就绪
* 一旦有rdlist有数据，会被唤醒，则将rdlist中的FD放入events数组中，返回已就绪的FD数量
* 4、用户进程直接遍历events数组，就行。
* 5、再次监听时也只需要调用epoll_wait()方法，将就绪的FD加入到rdlist链表中，
*

* 总结:
* 与select相比，
* 1、epoll性能提升明显，且无上限，可以监听任意个FD，与poll相比poll是链表，epoll是红黑树，数量很多的时候，epoll的查询效率也不会很低
* 2、epoll不需要将所有的FD都拷贝用户空间，只需要将就绪的FD拷贝到用户空间
* 3、epoll不用每次都将fd_set集拷贝到内核空间，每个FD只拷贝一次，会放到rb_root红黑树中，下次调用epoll_wait就行
* 4、epoll拷贝到用户空间的不是就绪的FD的数量，而是只将就绪的FD拷贝到用户空间，用户进程不需要判断，直接遍历读取就行
*
* 所以epoll是最适合的IO多路复用方式
*
* */

//IO多路复用的-事件通知机制
/*
* 当FD有数据可读的时候，我们调用epoll_wait可以得到通知，但是事件通知的模式有两种
* levelTriggered:简称LT。当FD有数据可读的时候，会重复通知多次，直到数据处理完成，是Epoll的默认模式
* EdgeTrihhered:简称ET。当FD有数据可读的时候，只会通知一次，不管数据是否处理完成
*
* 例如:
* 1假设一个客户端Socket对应的FD已经注册了epoll
* 2客户端socket发送了2KB的数据
* 3服务端调用epoll_wait，得到通知说FD就绪
* 4服务端从FD读取了1Kb数据
* 5回到步骤3(再次调用epoll_wait,形成循环)
*
* 总结:
* ET模式可以避免LT模式可能出现的惊群现象
* ET模式最好结合非阻塞IO读取FD数据，相比LT会复杂一些
* */

//IO多路复用-Web服务流程、
/*
epoll_create  →  创建ssfd  →  epoll_ctl添加  →  epoll_wait
                                                    │
                                                    ▼
                                            ┌───────┴───────┐
                                            │ 就绪链表为空？ │
                                            └───────┬───────┘
                                                    │
                          ┌─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                          ▼                         ▼                         ▼
                        [是]                      [否]                      [超时]
                          │                         │                         │
                          ▼                         ▼                         ▼
                      继续等待                返回就绪FD                   返回0
                                                    │
                                                    ▼
                                            ┌───────┴───────┐
                                            │ 判断事件类型   │
                                            └───────┬───────┘
                                                    │
                          ┌─────────────────────────┴─────────────────────────┐
                          │                                                   │
                          ▼                                                   ▼
                    ┌──────────┐                                       ┌──────────┐
                    │ ssfd可读 │                                       │普通FD可读│
                    └────┬─────┘                                       └────┬─────┘
                         │                                                  │
                         ▼                                                  ▼
                    accept()                                           recv/read()
                    得到新FD                                             读取数据
                         │
                         ▼
                    epoll_ctl
                    加入新FD
                         │
                         └──────────────→ 回到 epoll_wait
*
第一阶段：初始化（图的左半部分）
这部分是 Redis 服务器启动时做的准备工作。
服务端启动 -> epoll_create 创建实例
含义：Redis 启动后，首先会在操作系统内核中创建一个 epoll 实例（可以想象成一个专门的管理中心）。
底层：调用 epoll_create() 系统调用，返回一个文件描述符（epfd），用来后续操作这个实例。
创建 serverSocket 得到 FD，记做 ssfd
含义：Redis 初始化网络监听，创建一个标准的 Socket，绑定端口（默认6379）并开始监听。这个 Socket 对应的文件描述符（FD）被称为 ssfd。
作用：这个 ssfd 专门用来接受新的客户端连接请求。
epoll_ctl 监听 FD
含义：Redis 告诉 epoll 管理中心：“请帮我盯着 ssfd 这个文件描述符，一旦它有事件（比如有新连接来了），就通知我。”
底层：调用 epoll_ctl(epfd, EPOLL_CTL_ADD, ssfd, ...)。
图中细节：
红黑树 (rb_root)：epoll 内部使用红黑树来存储所有被监听的 FD（这里先存入了 ssfd）。红黑树的查找效率很高（O(logN)），适合管理大量连接。
注册回调：当 FD 就绪时，内核会将该 FD 加入到就绪链表中。

第二阶段：事件循环（图的核心循环）
这部分是 Redis 一直在重复做的事情（主循环）。
epoll_wait 等待 FD 就绪
含义：Redis 此时进入“休眠”或“阻塞”状态，它问 epoll：“有哪些连接已经准备好了可以读写？告诉我，没有的话我就等着。”
作用：如果没有事件发生，Redis 线程不会占用 CPU；一旦有事件（比如有客户端发数据来了），epoll_wait 会立即返回。
是否有 FD 就绪？
否：如果没有就绪的 FD，继续回到 epoll_wait 等待。
是：如果有就绪的 FD，epoll 会把这些就绪的 FD 放入一个双向链表 (list_head) 中返回给 Redis。

第三阶段：事件分发与处理（图的右侧分支）
Redis 拿到了就绪的 FD 列表，开始逐个处理。
判断事件类型 / 是否是 ssfd 可读？
Redis 遍历就绪的 FD 列表，检查具体是哪个 FD 有事发生。
关键判断：这个就绪的 FD 是不是我们一开始创建的监听套接字 ssfd？
情况 A：是 ssfd 可读（分支 -> 是）
含义：说明有一个新的客户端尝试连接 Redis。
动作：调用 accept() 接收连接，得到一个新的客户端 socket 文件描述符（client fd）。
后续（图中未画出但隐含）：这个新的 client fd 也需要被注册到 epoll 中（再次调用 epoll_ctl），以便后续监听该客户端的读写请求。
情况 B：不是 ssfd（分支 -> 否）
含义：说明是一个已经连接好的客户端发来了数据（比如执行 SET key value 命令）。
动作：
读取请求数据：从 socket 中读取客户端发送的命令。
写出响应：处理命令（如操作数据库），然后将结果写回给客户端。
*
*关键点:是不是新连接的客户端？
* 1、如果FD是ssfd，则它是一个新连接的FD，新的客户端，需要处理连接请求。
* 2、如果FD不是ssfd，则它不是新连接的FD，而是一个已经连接好的客户端，需要处理客户端发来的数据(命令)。
* */

//信号驱动IO
/*
*信号驱动IO是与内核建立SIGIO的信号关联并设置回调，当内核中有FD就绪时，会发送SIGIO信号给进程，进程收到信号后，会调用回调函数，处理就绪的FD
* 第一阶段不会阻塞，第二阶段会阻塞。
*但是对于高并发的需求，可能会溢出导致信号丢失
* */


//异步 IO
/*
*异步IO，通过aio_read()方法发送读取请求，内核会异步处理，当请求完成时，会调用回调函数，处理请求结果
* 在这两个阶段，用户进程都不会被阻塞
* 但是如果并发请求过多，会导致内核的崩溃
* */

//Redis网络模型
//面试问题:
/*
* Redis到底是单线程还是多线程?
* 1、如果讨论的是Redis的核心业务部分(命令处理),则Redis是单线程的
* 2、如果聊得是整个Redis，那么Redis是多线程的
* 在Redis4.0版本引入了多线程异步处理一些耗时较长的任务，例如:异步删除命令UNlink
* Redis6.0版本在核心网络模型中引入了多线程，进一步提高对于多核CPU的利用率
*
* 为什么Redis的作者要坚持使用单线程?
* 1、抛开持久化不谈，Redis是纯内存操作，执行速度非常快，它的性能瓶颈是网络延迟而不是执行速度，因此多线程冰壶会带来巨大的性能提升
* 2、多线程会导致过多的上下文切换，带来不必要的开销
* 3、引入多线程会面临线程安全问题，必然要引入线程锁，这样的安全手段，导致实现复杂度增高，而且性能也会大大折扣
*
* */

//Redis网络模型分析
/*
* Redis通过IO多路复用来提高网络性能，并且支持各种不同的多路复用实现，并且将这些实现进行封装，提供了统一的高性能事件库API库 AE:
* 其中
* aeApiCreate()方法创建一个事件循环实例类似Epoll的epoll_create()方法
* aeApiAddEvent()方法将FD添加到事件循环实例中，类似Epoll的epoll_ctl()方法
* aeApiPoll()方法会检查事件循环实例中的事件，类似Epoll的epoll_wait()方法
*
*命令回复和解析请求的部分使用多线程，来提高查询效率。
*
*
* */

//Redis通信协议
/*
* Redis的通信协议是RESP(REdis Serialization Protocol),
* Redis是一个CS架构的软件，通信一般分为两步:
* 客户端向服务器发送命令
* 服务端解析并执行命令，返回响应结果给客户端
* 因此客户端发送命令的格式和服务器返回结果格式必须有一个规范，这个规范就是通信协议
*
* Redis1.2版本引入了RESP协议
* Redis2.0版本中成为与Redis服务端通信的标准，称为RESP2协议
* Redis6.0版本引入了RESP3协议，增加了新的数据类型和功能，并支持客户端缓存
* 目前默认使用的是RESP2协议。
*
* 在RESP协议中，通过首字节的字符来区分不同数据类型，常见的数据类型包括5种:
* 单行字符串:首字节是"+"，后面跟上单行字符串，以CRLF("\r\n")结尾,例如返回""+ok\r\n"
* 错误:首字节是"-"，后面跟上错误信息，以CRLF("\r\n")结尾，例如返回一个错误: "-ERR message\r\n"
* 数值:首字节是":"，后面跟上数字格式的字符串，以CRLF("\r\n")结尾，例如返回一个整数: ":1000\r\n"
* 多行字符串:首字节是"$"，表示二进制安全的字符串，以CRLF("\r\n")结尾。最大支持512MB。
* 例如返回一个字符串: "$5\r\nhello\r\n"，5表示字符串长度为5字节，hello是真正的字符串内容。如果大小是0，则返回"$0\r\n\r\n"，表示一个空字符串。
* 如果大小是-1，则返回"$-1\r\n"，表示不存在
* 数组:首字节是"*",后面跟上数组元素的数量，以CRLF("\r\n")结尾，然后依次是每个元素的RESP格式，
* 例如返回一个数组:
* "*2\r\n
* $3\r\nfoo\r\n //这两个是数组元素，第一个元素是字符串"foo"，第二个元素是字符串"bar"
* $3\r\nbar\r\n"
*
* 发送一个命令:set name wuwenjun
* *3\r\n
* $3\r\nset\r\n
* $4\r\nname\r\n
* $8\r\nwuwenjun\r\n
* */

//基于RESP协议的通信协议，模拟一个客户端类似RedisTemplate
/*
*通过Redis的IP端口，使用字符输出流写数据到Redis/用字节流输入流从Redis中读数据(因为多行字符串是二进制安全的，如果包含特殊字符的话，用字符流的ReadLine可能会读不全)，
*模拟一个客户端，发送命令，并接收响应结果
* 因为会需要对字节进行处理判断
*public class Redis {
   static Socket  s;
    static  PrintWriter PW;
    static   BufferedReader BF;
   static InputStream IS;
    static byte[] buffer = new byte[1024];
   public static void main(String[] args) {
        try {
            String host = "192.168.100.128";
            int port = 6379;
            s=new Socket(host, port);
            s.getOutputStream();
           s.getInputStream();
            //使用字符输出流将数据写入Redis服务器，并用PrintWriter将数据发送给Redis服务器
             PW = new PrintWriter(new OutputStreamWriter( s.getOutputStream(), StandardCharsets.UTF_8));
            //使用字节输入流读取Redis服务器返回的数据
            //BF = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
IS= s.getInputStream();

//获取权限
SenRequest("auth","123321");
//解析Redis服务器返回的数据
Object o = handleResponse();
System.out.println("o为"+o);

//向Redis服务器发送命令
SenRequest("set","name","jack");
//解析Redis服务器返回的数据
o=handleResponse();
System.out.println("o为"+o);

//向Redis服务器发送命令
SenRequest("get","name");
//解析Redis服务器返回的数据
o=handleResponse();
System.out.println("o为"+o);

} catch (IOException e) {
    e.printStackTrace();
} finally {
    //释放资源
    try {
        if (IS!=null) IS.close();

        if (PW!=null) PW.close();

        if (s!=null) s.close();
    }
    catch (IOException e) {
        throw new RuntimeException(e);
    }
}

}

private static Object handleResponse() throws IOException {
    //读取首字节
    int firstByte = IS.read();
    //判断数据类型
    switch (firstByte) {
        case '+':
            //简单字符串
            return readLineAsString();//读取一行数据
        case '-':
            //错误
            throw new RuntimeException(readLineAsString());//读取一行数据并抛出异常
        case ':':
            //整数
            return Integer.parseInt(readLineAsString());//转换为整型
        case '$':
            //批量字符串
            int length = Integer.parseInt(readLineAsString());//读取总长度
            //因为$5\r\nhello\r\n是通过\r\n换行了的，第一行是长度，第二行是数据hello，而第一行的$已经被读了，所以第一行只剩5
            if (length == -1) {//-1表示不存在
                return null;
            }
            if (length==0) {//表示空字符串
                return "";
            }
            byte[] data = new byte[length];
            IS.read(data);
            // 跳过末尾的 \r\n
            IS.read(new byte[2]);
            return new String(data, StandardCharsets.UTF_8);
        case '*':
            //数组
            return readBulkString();
        default:
            throw new IOException("未知的数据类型: ");
    }

}
// 辅助方法：从字节流读取一行（直到 \r\n）
private static String readLineAsString() throws IOException {
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    int b;
    while ((b = IS.read()) != -1) {
        if (b == '\r') {
            IS.read(); // 读取 \n
            break;
        }
        baos.write(b);
    }
    return baos.toString(StandardCharsets.UTF_8.name());
}

private static Object readBulkString() throws IOException {
    int len = Integer.parseInt(readLineAsString());//读取数组长度/数组元素个数
    if (len<0) {
        return null;
    }
    //定义集合，接受多个数组元素
    List<Object> list = new ArrayList<>();
    for (int i = 0; i < len; i++) {
        list.add(handleResponse());//因为数组中可能存在多行字符串、整数、错误等，所以需要递归调用handleResponse方法来处理每个元素

    }
    return list;
}

private static void SenRequest(String ... args) {//使用可变参数，可以发送多个参数来替代硬编码
    //因为这里会自动添加换行符，所以这里不需要添加换行符
    PW.println("*"+args.length);//发送数组长度
    for (String arg : args) {
        PW.println("$"+arg.getBytes(StandardCharsets.UTF_8).length);//发送每个参数的字节大小
        PW.println(arg);//发送参数内容
    }
    PW.flush();
}
}
* */

//Redis的内存策略
//过期策略
/*
*
*Redis之所以性能强大是因为，主要的原因是因为他是基于内存存储的，然而单节点的Redis的内存大小有限，会大大影响持久化或主从同步性能
可以通过设置配置文件来改变内存大小。格式: maxmemory </bytes>
* 当内存使用达到上限时，Redis无法存储更多数据。
* 为此Redis提供了以下内存策略:过期策略、淘汰策略
* 过期策略:当一个key设置了过期时间，当过期时间到了之后，Redis会自动删除这个key
* 淘汰策略:当内存使用达到上限时，Redis会根据设置的淘汰策略来删除一些key，以腾出空间来存储新的数据
*
* 过期策略的实现原理:
* 问题一:Redis是如何通过过期时间来判断key是否过期的？
* Redis数据库的结构的底层源码:
* typedef struct redisDb {
    dict *dict;     //存放所有key及value的地方，也称为keyspace
    dict *expires;   //存放每一个key以及其对应的TTL存活时间(value)，只包含设置了过期时间的key,也是Dict类型
    dict *blocking_keys; //存放被阻塞的key以及对应的客户端列表，key是被阻塞的key，value是一个链表，链表中存放所有被这个key阻塞的客户端
    dict *ready_keys;   //存放所有已经到期的key，key是已经到期的key，value是一个链表，链表中存放所有已经到期的key对应的客户端列表
    dict *watched_keys; //存放被监视的key以及对应的客户端列表，key是被监视的key，value是一个链表，链表中存放所有监视这个key的客户端
    int id;   //数据库的编号
    long long avg_ttl;  //存储所有key的TTL平均值
    unsigned long expires_cursor; //存储所有key的TTL平均值的游标
    list *defrag_later;    //存储需要被重新整理(defrag)的key列表
} redisDb;
* 通过Redis数据库中的两个分别记录key-value和key-ttl的Dict字典，
* 想要判断key是否过期，那么只需要拿着这个key去Dict字典中查找对应的TTL时间，如果这个TTL时间小于当前时间，那么这个key就过期了
* 问题二:是不是TTL到期就立即删除了呢?
* 如果想实现这种一到期立马删除，要为每个key设置一个定时器，当定时器到期时，将这个key从数据库中删除，
* 这样的实现方式会导致性能下降，因为当key数量很多的时候，定时器的数量也会很多，系统资源消耗也会很大
* 所以使用的是的惰性删除或者周期删除
*
* 惰性删除:当访问(增删改查)一个key时，才会检查这个key是否过期，如果过期了就删除这个key
*这是底层源码:
* robj *lookupKeyWriteWithFlags(redisDb *db, robj *key, int flags) {
    expireIfNeeded(db,key);//检查key是否过期，如果过期了就删除这个key,
    return lookupKey(db,key,flags);
}
* 如果一直没有人来访问这个key，那么这个key就会一直存在，占用内存空间，所以还需要周期删除来清理这些过期的key
* 周期删除:通过一个定时任务，周期性的抽样“部分”过期的key，然后执行删除，执行周期有两种方式
* 1、服务器初始化时，Redis会设置一个定时任务serverCron，按照server.hz的频率来执行过期key清理，模式为Slow(执行时间较长，执行频率较低,默认一秒钟执行10次)
* void initServer(void) {
* //创建一个定时任务，定时执行serverCron方法
*  aeCreateTimeEvent(server.el, serverCron, NULL, NULL);
* }
* int serverCron(struct aeEventLoop *eventLoop, long long id, void *clientData) {
*
* }
* 2、Redis的每个事件循环前会调用beforeSleep()方法，执行过期key清理，模式为Fast(执行频率较高，执行时间较短(不超过1ms))
*循环频率很高
*
* SLOW模式规则:(清理的会比较彻底，适合一些不太重要的数据，例如:缓存数据，过期了就过期了，不需要立马删除，周期删除就行)
* 执行频率受server.hz影响，默认是10，也就是每秒钟执行10次，每个执行周期为100ms
* 执行清理耗时不超过一次执行周期的25%
* 逐个遍历db，逐个遍历db中的bucket，抽取20个key判断是否过期、
* 如果没达到过期时间上限(25ms，即清理耗时)并且过期key比例大于%10，再进行一次抽样，否则结束遍历
*
*
* FAST模式规则:
*执行频率受beforeSleep()调用频率影响，但是两次FAST模式的执行间隔不低于2ms
* 执行清理耗时不超过1ms
* 逐个遍历db，逐个遍历db中的bucket，抽取20个key判断是否过期、
* 如果没达到过期时间上限(1ms)并且过期key比例大于%10，再进行一次抽样，否则结束遍历
*
* 应用场景:
* 1、适合一些不太重要的数据，例如:缓存数据，过期了就过期了，不需要立马删除，周期删除就行
* 2、适合一些访问频率较高的数据，例如:热点数据，过期了就过期了，不需要立马删除，周期删除就行
* */


//淘汰策略
/*
*在一些非常庞大的项目中，因为数据量非常的大，非常的多。不断的往Redis中存储，仅仅通过过期来清理数据也难以满足内存的使用，此时内存也容易达到上限
*此时就有了淘汰策略，
* 淘汰策略:当Redis内存使用达到设置的阈值上限时，Redis会主动挑选部分key删除，以释放更多内存的流程。
* Redis提供了以下几种淘汰策略:
* 问题一:Redis什么时候去检查内存够不够，内存什么时候会超出这个阈值?
* 只要访问Redis执行命令了，都会触发内存检查，检查内存是否超出阈值，只要超过阈值了都会去清理掉一部分数据
* 处理命令的源码:
* int processCommand(client *c) {
* //…………
if (server.maxmemory && !server.lua_timedout) {//如果服务器设置了server.maxmemory(内存阈值)，并且没有执行Lua脚本
* //尝试进行内存淘汰执行perfromEvictions
     int out_of_memory = (performEvictions() == EVICT_FAIL);//如果执行的结果是EVICT_FAIL，说明内存淘汰失败了，内存已经超出阈值了

if (server.current_client == NULL) return C_ERR;

int reject_cmd_on_oom = is_denyoom_command;

if (c->flags & CLIENT_MULTI &&
    c->cmd->proc != execCommand &&
    c->cmd->proc != discardCommand &&
    c->cmd->proc != resetCommand) {
    reject_cmd_on_oom = 1;
}

if (out_of_memory && reject_cmd_on_oom) {
    rejectCommand(c, shared.oomerr);//如果内存淘汰失败了，会拒绝执行命令，返回错误信息给客户端
    return C_OK;
}
if (c->cmd->proc == evalCommand || c->cmd->proc == evalShaCommand) {
    server.lua_oom = out_of_memory;
  }
 }
}
* 问题二:
* 淘汰内存的时候，怎么知道要淘汰那一部分数据呢?
*在preformEvictions()方法中，支持八种内存淘汰策略:
* 1、noeviction: 不进行内存淘汰，如果内存使用超出阈值，则拒绝执行命令，默认是这种策略
* 2、volatile-ttl:对设置了TTL的key，比较key的剩余TTL值，TTL值越小的key优先被淘汰
* 3、allkeys-random:对全体key，随机进行淘汰，也就是直接从db->expires字典中随机获取一个key，然后进行淘汰
* 4、volatile-random:对设置了TTL的key，随机进行淘汰，也就是从db->expires字典中随机获取一个key，然后进行淘汰
* 5、allkeys-lru:对全体key，基于LRU算法比较key的最近访问时间，最近访问时间越久远的key优先被淘汰
* 6、volatile-lru:对设置了TTL的key，基于LRU算法比较key的最近访问时间，最近访问时间越久远的key优先被淘汰
* 7、allkeys-lfu:对全体key，基于LFU算法，比较key的访问频率，访问频率越低的key优先被淘汰
* 8、volatile-lfu:对设置了TTL的key，基于LFU算法，比较key的访问频率，访问频率越低的key优先被淘汰
*
* LRU(Least Recently Used)算法:最少最近使用算法，用当前时间减去最后一次访问时间。
* LFU(Least Frequenty Used)算法:最近最不常用算法，统计每个key的访问频率。
* 可以手动修改配置文件来设置淘汰策略，
* 例如: maxmemory-policy volatile-ttl
*
* 问题三:Redis怎么知道key的访问频率和最近访问时间呢?
* 在RedisObject结构中有字段: lru: LRU_BITS;这个字段的长度为24位.
* 、typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:LRU_BITS;
    //长度为24位，一句Redis配置文件中的 maxmemory-policy 选项来决定使用的是LRU算法 还是 LFU 算法
   //如果是LRU:以秒为单位记录最近一次访问时间，
  //如果为LFU:高16位以分钟记录最近访问时间，低8位记录逻辑访问(不是真实的访问次数)次数，
 //逻辑访问:不是每次key被访问都计数，而是通过运算:
//1、生成0~1之间的随机数R 2、计算1/(旧次数 * lfu_log_factor + 1)结果为P，lfu_log_factor默认为10.
//3、如果R小于P，则增加访问次数，且最大次数不能超过255,4、访问次数会随着时间衰减，距离上一次访问时间每隔lfu_decay_time(默认1)分钟，访问次数就会减少1，不会减到0以下，
int refcount;
void *ptr;
} robj;
*
*
* performEvictions()方法:
* 1、会先判断内存是否充足，如果充足就结束方法
* 2、如果不充足，会判断淘汰策略，如果策略是noeviction，就结束方法
* 3、如果策略不是noeviction，
* 4、再判断策略是不是allkeys-xx，
* 5、如果是从db中的dict中进行遍历，然后进行淘汰
*   如果不是会遍历db中的expires字典，然后进行淘汰
*
* 6、然后回判断是进行Random随机淘汰，还是LRU算法淘汰，还是LFU算法淘汰还是TTL淘汰
*   如果是Random随机淘汰，就随机获取一个key，然后删除这个key，删完之后会判断已释放的内存是否满足需要释放的内存，
*   如果不满足，回到步骤6继续淘汰，直到满足需要释放的内存或者没有key可以淘汰了
* 7、如果是LRU/LFU/TTL算法淘汰,会比较对这些字段值，进行排序，但是Redis中key的数量可能非常大，一个个比较排序不现实，性能会很差，
*    所以Redis使用了evictionPool(淘汰池，默认是空的)来优化这个过程，
*    evictionPool是一个固定长度的数组，默认长度为16，每次从一个db中的dict或者expires字典中随机抽取(maxmemory_samples,默认是5)个key进行比较
*
*    然后将这些key按照LRU/LFU/TTL算法进行排序，选出最适合淘汰的key放入evictionPool中，最后从evictionPool中淘汰掉最适合淘汰的key，
*    如果是TTL淘汰，就比较key的剩余TTL时间，剩余TTL时间越小的key优先被淘汰，存入时会用最大TTL时间减去剩余TTL时间，得到一个数值，数值越大越先被淘汰
*    如果是LRU淘汰，就比较key的最近访问时间，最近访问时间越久远的key优先被淘汰，存入时会用当前时间减去LRU，得到一个数值，数值越大越先被淘汰
*    如果是LFU淘汰，就比较key的访问频率，访问频率越低的key优先被淘汰，存入时会用255减去LFU计数值，得到一个数值，数值越大越先被淘汰
     注意！！！
     如果淘汰池已经满了
     存入evictionPool时还会和此时淘汰池中的最排序数值最大的key进行比较，如果比最大的小，则不能放入淘汰池中，
     如果比最大的大，则放入淘汰池中，并且淘汰掉此时淘汰池中数值最大的key
     evictionPool中会默认按照某种方式作升序排列，值越大的越先被淘汰，这样淘汰池中淘汰的逻辑就是固定的了，而根据什么方式，则看设置的淘汰策略了

     一个库处理完了，还会判断是否还有其他的库需要处理，回到步骤7，如果有就继续处理，直到满足需要释放的内存或者没有key可以淘汰了
     * 没有的话就会按照倒序从evictionPool中获取一个key进行删除，删除之后会判断已释放的内存是否满足需要释放的内存，
     * 如果不满足回到步骤6继续淘汰，直到满足需要释放的内存或者没有key可以淘汰了
* */

