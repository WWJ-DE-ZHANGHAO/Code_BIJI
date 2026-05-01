//多级缓存
/*
* 因为缓存的作用就是减轻数据的压力、缩短服务的响应时间、从而提高整个服务的并发能力
* 虽然Redis单机的并发能力已经是很高了，但是依然是有上限的，特别是遇到淘宝618和12306这种网站，它的并发量能达到亿级以上的流量
* 此时仅仅依靠redis，是无法满足如此高的并发需求的，
* 因此需要多级缓存来应对这种高并发的场景
* 传统缓存策略一般是请求到达tomcat之后，先查询Redis如果未命中则查询数据库，
* 但是存在以下问题:
* 1、用户的请求依旧要经过tomcat，而后再由tomcat去查询Redis缓存，但是tomcat的并发能力是不如redis的，
* 因此，tomcat的并发能力就成为整个系统的瓶颈
* 2、Redis缓存是有过期的可能性的，因为Redis是有淘汰策略的，当部分缓存失效或者整个Redis宕机时，
* 用户的请求就会直接打到数据库上，导致数据库压力过大
*
* 多级缓存:就是充分利用请求处理的每一个环节，分别添加缓存，减轻Tomcat的压力，提升服务性能
* 多级缓存的层次:
* 1、浏览器/客户端缓存
* 2、Nginx缓存
* 3、Redis缓存
* 4、Tomcat缓存
* 5、数据库缓存
* 浏览器/客户端缓存:浏览器/客户端会缓存一些静态资源在本地，例如图片、css、js等，下次再需要访问时，
* 直接检查本地数据有没有变化，没有的话直接返回状态码304:表示资源没有被修改，可以直接使用浏览器/客户端缓存的资源，从而减少对服务器的请求，提高页面加载速度
*
* Nginx本地缓存:Nginx缓存静态资源，例如图片、css、js等，当用户访问静态资源时，Nginx会先检查本地缓存，如果有缓存则直接返回，
* 不需要再请求服务端，从而提高页面加载速度，因为Nginx也可以进行编程，如果Nginx本地没有，可以直接访问Redis缓存，减少对Tomcat的请求，提高服务性能
*
* Redis缓存:只有未命中Redis才会去访问Tomcat服务器
*
* Tomcat缓存:Tomcat服务器也可以添加缓存，叫做Tomcat进程缓存(在服务器内部利用类似Map的形式形成一个进程缓存)，
* 如果Tomcat进程缓存命中，则直接返回，不访问数据库，从而提高服务性能，这样解决了Redis因为宕机或失效直接打到数据库的的问题了
*
* 数据库缓存:数据库缓存，就是将数据缓存到数据库中，当用户访问数据时，先去数据库中
*
*
* 此时请求压力都集中在了Nginx上了,需要在Nginx的内部去实现对于Redis的访问和Tomcat访问的业务逻辑
* 此时Nginx就不再仅仅只是一个反向代理服务器了，而是一个具有业务逻辑的Web服务器了，
* 因此后续Nginx需要部署成一个集群来应对高并发的请求了，此时还可以准备一个单独的Nginx来处理反向代理请求，
* 这样当请求到达这个反向代理的Nginx的时候，它再反向代理到我们多个这样的本地缓存、编写业务的Nginx服务器上去，
* 再由这些Nginx服务器去访问Redis和Tomcat，从而达到多级缓存的目的
*
* 关键学习点:
* Tomcat的进程缓存需要用到JVM进程缓存
* Nginx服务器的业务逻辑需要用到Lua脚本来实现，Lua脚本是Nginx内置的脚本语言，可以在Nginx中编写业务逻辑，访问Redis和Tomcat
* 之后再学习多级缓存方案的实现细节，缓存实现后还要做数据库与缓存之间的数据同步即缓存同步策略
*  */


//JVM进程缓存
/*
使用docker配置一个新的Mysql容器
用于后期进行数据同步需要用到Mysql的主从功能，所以需要大家在虚拟器中利用Docker运行一个Mysql容器

为了方便后期配置Mysql，先准备两个目录，用于挂载容器的数据和修改Mysql的配置文件，观察它里面的数据和日志
cd tmp
mkdir mysql(创建mysql目录，放哪都行)
cd mysql

运行Docker命令，
docker run \
-p 3306:3306 \
--name mysql \
-v $PWD/conf:/etc/mysql/conf.d \
-v $PWD/logs:/logs \
-v $PWD/data:/var/lib/mysql \
-e MYSQL_ROOT_PASSWORD=123 \
--privileged \
-d \
mysql:8
注意！！！一定要将CentOs中的原先的Mysql关闭或者删了，防止端口冲突，
或者直接修改上面的-p参数改成其他的端口号，例如-p 3307:3306
*
在conf中添加my，cnf文件
touch /tmp/mysql/conf/my.cnf
内容如下:
[mysqld]
skip-name-resolve
character-set-server=utf8
datadir=/var/lib/mysql
server-id=1000
修改配置之后重启容器
docker restart mysql


导入资料中的案例项目
记得需要将配置文件中的数据库的ip地址改成自己的
  datasource:
    url: jdbc:mysql://192.168.100.128:3306/heima?useSSL=false
    username: root
    password: 123
需要用一个商品查询页面来请求访问这个后端的接口
这个页面放在Nginx服务器上的，这个页面需要的数据通过ajax向服务端(Nginx业务集群)查询
如果请求不加端口，会将请求直接发送到Nginx反向代理服务器，但是反向代理服务器无法处理请求，
需要将这个请求发送给后台的nginx业务集群，然后业务集群完成后续的多级缓存处理

步骤:
1、在Nginx服务器完成反向代理的配置，配置文件如下:
sendfile        on;
    #tcp_nopush     on;
    keepalive_timeout  65;
  #nginx的业务集群，用于做nginx本地缓存、redis缓存、tomcat缓存、查询，将每一个OpenResty的ip端口都写在upstream中
    upstream nginx-cluster{
        server 192.168.150.101:8081;
    }
    server {
        listen       80;
        server_name  localhost;
        #监听/api路径，反向代理到nginx-cluster集群
	location /api {
            proxy_pass http://nginx-cluster;
        }
启动nginx服务器:可以通过cmd命令:start nginx.exe或者直接点击nginx.exe图标启动
访问地址：http://localhost/item.html?id=10001

* 添加进程缓存需要用到的技术:Caffeine
*进程缓存和传统的分布式缓存的差异:
分布式缓存:例如Redis；
优点:存储容量大(Redis自己也可以建立集群)、可靠性更高、可以集群共享(多台Tomcat服务器之间可以共享同一台Redis服务器的缓存数据)
缺点:访问缓存有网络开销
场景:缓存数据量较大、可靠性要求高、需要在集群间共享数据的场景

进程缓存:例如HashMap、GuavaCache
优点:读取本地内存、没有网络开销、速度更快
缺点:存储容量小、可靠性较低、不能集群共享(多台Tomcat服务器之间不能共享同一台进程缓存的缓存数据,就像某一个JVM中的HashMap的数据其他的Tomcat无法访问一样)
场景:缓存数据量较小、可靠性要求较低的场景
使用Caffeine实现进程本地缓存:
Caffeine是一个基于Java8开发的，提供了几乎最佳命中的高性能本地缓存库，目前Spring内部使用的就是Caffeine
官网地址:https://github.com/ben-manes/caffeine
使用Caffeine
    // 创建缓存对象
        Cache<String, String> cache = Caffeine.newBuilder().build();

        // 存数据
        cache.put("gf", "迪丽热巴");

        // 取数据，不存在则返回null
        String gf = cache.getIfPresent("gf");
        System.out.println("gf = " + gf);

        // 取数据，不存在则去数据库查询
        String defaultGF = cache.get("defaultGF", key -> {
            // 这里可以写去数据库根据 key查询value的业务逻辑
            return "柳岩";
        });
        System.out.println("defaultGF = " + defaultGF);
*
*如果一直向进程本地缓存中一直存数据，缓存爆满怎么办？
Caffeine提供了三种缓存驱逐策略:
1、基于时间:设置缓存时间
Caffeine.newBuilder().expireAfterWrite(Duration.ofSeconds(10)).build();//设置写入后10秒没有人使用，就过期
 @Test
    void testEvictByTime() throws InterruptedException {
        // 创建缓存对象
        Cache<String, String> cache = Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(1)) // 设置缓存有效期为 10 秒
                .build();
        // 存数据
        cache.put("gf", "柳岩");
        // 获取数据
        System.out.println("gf: " + cache.getIfPresent("gf"));
        // 休眠一会儿
        Thread.sleep(1200L);
        System.out.println("gf: " + cache.getIfPresent("gf"));
    }
2、基于大小
Caffeine.newBuilder().maximumSize(1).build();//设置缓存大小为1(最大存一个可以)，当缓存大小达到1时，会自动删除最近最少使用的缓存项，和Redis的LRU缓存策略一致
  @Test
    void testEvictByNum() throws InterruptedException {
        // 创建缓存对象
        Cache<String, String> cache = Caffeine.newBuilder()
                // 设置缓存大小上限为 1
                .maximumSize(1)
                .build();
        // 存数据
        cache.put("gf1", "柳岩");
        cache.put("gf2", "范冰冰");
        cache.put("gf3", "迪丽热巴");
        // 延迟10ms，给清理线程一点时间
        Thread.sleep(10L);
        // 获取数据
        System.out.println("gf1: " + cache.getIfPresent("gf1"));
        System.out.println("gf2: " + cache.getIfPresent("gf2"));
        System.out.println("gf3: " + cache.getIfPresent("gf3"));
    }
3、基于引用
Caffeine.newBuilder().weakKeys().weakValues().build();
//设置缓存项的键和值都是弱引用，当缓存项不再被强引用时，垃圾回收器可以回收它们，从而释放内存，但是性能太差，不建议使用

默认请情况下，当一个缓存元素过期的时候，Caffeine不会自动立即将其清理和驱逐，
而是在一次读写操作后，或者空闲时间完成对失效数据的驱逐，存入立马退出JVM是没法立马清除



使用JVM进程缓存，实现商品查询的本地进程缓存

案例:
利用Caffeine实现以下需求
给根据id查询商品的业务添加缓存，缓存未命中时查询数据库
给根据id查询商品库存的业务添加缓存，缓存未命中时查询数据库
缓存初始大小为100
缓存上限为10000
需要创建Caffeine配置类的@Bean，让其交给Spring管理，
  @Bean
    public Cache<Long, Item> itemCache() {
        return Caffeine.newBuilder()
                .initialCapacity(100)//初始化缓存空间大小
                .maximumSize(10_000)
                .build();
    }
    @Bean
    public Cache<Long, ItemStokc> stockCache() {
        return Caffeine.newBuilder()
                .initialCapacity(100)//初始化缓存空间大小
                .maximumSize(10_000)
                .build();
    }
之后在需要使用缓存的业务类中注入这个Caffeine配置类，获取到Cache对象进行缓存操作
使用Caffeine实现类对象调用Get方法可以先查询本地进程缓存，缓存中不存在则调用getIfPresent方法去数据库查询
cache.get("defaultGF", key -> {})
测试查询两次会发现第一次是从数据库查询的，第二次是从缓存中查询的，不会走数据库查询
* */


//Lua语言
/*
* 使用Lua语言实现Nginx集群服务器的业务逻辑
* Nginx内置了Lua模块，可以在Nginx中编写Lua脚本来实现业务逻辑，访问Redis和Tomcat
* Lua语言:是一种轻量级的脚本语言，具有简单易学、性能高效、可扩展性强等特点，常用于嵌入式系统、游戏开发、Web服务器等领域,底层是用C语言编写的
* 官网:https://www.lua.org/
* 使用步骤：
* 在Linux虚拟机的任意目录下创建一个hello.lua文件
* touch hello.lua
* 在hello.lua文件中写入如下代码
* print("hello world")
* 然后执行lua hello.lua命令，就会在控制台输出hello world
*
* Lua语言的基本语法:
* 数据类型:nil、boolean、number、string、table、function
* nil:表示空值，只有nil属于这个类，类似于Java中的null，在条件表达式中，nil相当于 false
* boolean:true、false
* number:整数、小数、科学计数法
* string:字符串
* table:数组、字典
* function:函数
* 可以利用type函数查看数据类型
* print(type("hello world"))--输出string
* print(type(123))--输出number
* print(type(true))--输出boolean
*
* 注意！！！可以先执行lua命令就能进入Lua的交互式环境，在这个环境中可以直接输入Lua代码进行测试，输入exit()或者按Ctrl+D可以退出交互式环境
*
* 变量
* Lua声明变量的时候，不需要指定数据类型
* 声明字符串
* local name = "hello world"
* 声明数字
* local age = 18
* 声明布尔值
* local isStudent = true
*声明数组，就是key为索引的table
* local arr = {"hello", "world"}
*
* 声明table 类似Java的Map
* local map= {name= 'jack',age=21}
* map和arr都属于 table
* 访问数组
* print(arr[1])//Lua的数组是从1开始的
* 访问table
* print(map.name)
* print(map["name"])
*
* 字符串是用..拼接的
* print("hello".."world")--输出helloworld
* 注意！！！声明时加上local和不加local的区别
* local声明的变量是局部变量，只能在当前块级作用域内访问，块级作用域由do...end、函数定义等构成
* 不加local声明的变量是全局变量，可以在整个程序中访问，甚至在其他文件中也可以访问
*
* 如果想要循环的去数组变量的数据，可以是使用for循环
* local arr = {"hello", "world"}
* for index, value in ipairs(arr) do//ipairs(arr)函数用于解析数组的数据
*     print(index, value)
* end
* loacl map = {name= 'jack',age=21}
* for key, value in pairs(map) do//pairs(table)函数用于解析table的数据
*     print(key, value)
* end
*
* 注意！！！
* 因为便利循环的代码一行写不完，需要将代码写在lua文件中，再执行lua lua文件命令来执行这个lua文件
* Lua函数:
*定义函数的语法:
* local function functionName(param1, param2)
*      --函数体
* return 返回值
* end
例如，定义一个函数用于打印数组
 function printArr(arr)
     for index, value in ipairs(arr) do
         print(index, value)
     end
  end
*
* 但是函数的内部也要考虑函数的健壮性
* 所以要做一些条件控制
* 例如if 、else语句
* if(布尔表达式)
* then
*     --执行代码
* else //一般不用写
*     --执行代码
* end
* 与Java中不同，布尔表达式的逻辑运算时基于英文单词的
* and 表示逻辑与
* or 表示逻辑或
* not 表示逻辑非
*
*
* 案例:自定义一个函数，可以打印table，当参数为nil时，打印错误信息
* local function printTable(t)
*     if (not t) then //not t 就相当于! t 因为如果的为空就是nil而nil在条件表达式中相当于false，所以not nil就相当于！false就是true
*        print("错误：参数为nil")
*       return nil
*   end
*       for key, value in pairs(t) do
*             print(value)
*         end
 end
*
* */

//OpenResty
//安装OpenResty
/*
* 想要在Nginx中使用Lua脚本来实现业务逻辑，需要安装OpenResty组件，
* OpenResty是一个基于Nginx的高性能Web服务器(Tomcat也是一个Web服务)，用于方便地搭建能够处理超高并发，扩展性极高的动态Web应用
* Web服务和动态网关，具有以下特点:
* 具备Nginx的所有功能
* 基于Lua语言进行扩展，集成了大量精良的Lua库、第三方模块
* 允许使用Lua自定义业务逻辑，自定义库
* 官网:https://openresty.org/cn/
*
* 需要联网在虚拟机中安装
* 1、安装OpenRestu的依赖
* yum install -y pcre-devel openssl-devel gcc --skip-broken
* 2、安装OpenResty的插件管理仓库
* yum-config-manager --add-repo https://openresty.org/package/centos/openresty.repo
* 如果说命令不存在册运行
* yum install -y yum-utils
*
* 3、安装OpenResty
* yum install -y openresty
* 4、安装OpenResty的管理工具
* yum install -y openresty-opm
* 5、查看目录
* 默认情况下:OpenResty安装在/usr/local/openresty目录下，
* 其中的luajit和lualib是OpenResty提供的第三方模块。
* 比如:操作Redis和Mysql的工具模块都已经封装到lualib中
* 这里还有一个nginx目录，里面存放了Nginx的配置文件和Windows中的Nginx的文件差不多
* 在bin(可执行文件)目录下有一个openresty文件
* (其实是一个软连接，连的是/usr/local/openresty/nginx/sbin/nginx)，这个文件就是Nginx的可执行文件，
* 所以当启动OpenResty的时候，实际上就是启动了Nginx服务器
* 可以直接把OpenResty当成Nginx来使用
* 6、配置nginx的环境变量
* 修改ect/profile文件，在文件末尾添加如下内容,这样之后在那个文件下都可以运行nginx
* export NGINX_HOME=/usr/local/openresty/nginx
* export PATH=${NGINX_HOME}/sbin:$PATH
* 让配置生效
* source /etc/profile
* 之后执行ng 再点击tab就能列出所有的nginx命令了
* 7、启动和运行
* 启动:nginx
* 重新加载:nginx -s reload
* 停止:nginx -s stop
* 8、启动前需要修改usr/local/openresty/nginx/conf/nginx.conf文件.内容如下
worker_processes  1;
error_log  logs/error.log;

envents {
    worker_connections  1024;
}

http {
include mime.types;
default_type application/octet-stream;
sendfile on;
keepalive_timeout 65;
server {
    listen 8081;
    server_name localhost;
    location / {
        root html;
        index index.html index.html;
    }
   error_page  500 502 503 504  /50x.html;
    location = /50x.html {
        root html;
    }
 }
}
此时执行nginx命令
再执行 ps -ef | grep nginx，会输出
root      26215      1  0 23:34 ?        00:00:00 nginx: master process nginx
nobody    26217  26215  0 23:34 ?        00:00:00 nginx: worker process
root      26449  19077  0 23:34 pts/0    00:00:00 grep --color=auto nginx
之后就可以去访问http://192.168.100.128:8081/
* 浏览器会输出welcome to OpenResty！就表示成功配置了，可以访问了
*
* */

//OpenResty快速入门
/*
在Nginx的conf配置文件中的
#nginx的业务集群，用于做nginx本地缓存、redis缓存、tomcat缓存、查询，将每一个OpenResty的ip端口都写在upstream中
    upstream nginx-cluster{
        server 192.168.150.101:8081;
    }
这个server 的ip地址和端口号，就是我们OpenResty的配置文件中的ip地址和端口号
* 案例:实现商品详情页的数据查询
*在商品的查询页面中，会发送一个请求http://localhost/api/item/10001
这个请求会先到达Nginx反向代理服务器，反向代理服务器会将这个请求转发到nginx-cluster集群中的某一个OpenResty服务器上去，
*我们需要用OpenResty来处理这个请求，查询数据库中的数据，并返回给页面


步骤一:
1、修改OpenResty的nginx.conf的http下面，添加对OpenResty的Lua模块的加载
#加载Lua模块
lua_package_path "/usr/local/openresty/lualib/?.lua;;";
#加载c模块
lua_package_cpath "/usr/local/openresty/lualib/?.so;;";
注意！！！这两个类似Java中的CLASSPATH 或 Maven 的依赖配置
使用require("文件名时")加载模块时
会先去lualib目录下找.lua文件，找不到就去lualib目录下找.so文件，找到后执行文件，
(这个文件必须要有显示的return，如果只有local声明的变量或函数，那它的作用域只能是这个文件，别的外部文件无法执行)
需要在文件最后返回一个table类型的对象，这个对象会作为返回结果返回给调用方，table的vlaue就是文件中的函数或其他什么
返回结果就是一个table类型了，返回到加载该文件的lua文件中require的位置，再用这个table对象，就可以得到函数或其他什么
再调用这些函数或其他什么
2、在nginx.conf的server下面，添加对/api/item路径的监听
location /api/item/ {//这个就类似Java中的Controller层
    #响应类型，这里返回json
    default_type application/json;
    #响应数据由lua/item.lua这个文件决定
    content_by_lua_file "lua/item.lua";//这个就类似于Java的Service层
}
步骤二:
1、在nginx目录下创建lua目录，并创建item.lua文件，内容如下
mkdir lua
touch lua/item.lua
ngx.say('{"id":10001,"name":"SALSA AIR","title":"RIMOWA 21寸托运箱拉杆箱 SALSA AIR系列果绿色 820.70.36.4","price":17900,"image":"https://m.360buyimg.com/mobilecms/s720x720_jfs/t6934/364/1195375010/84676/e9f2c55f/597ece38N0ddcbc77.jpg!q70.jpg.webp","category":"拉杆箱","brand":"RIMOWA","spec":"","status":1,"createTime":"2019-04-30T16:00:00.000+00:00","updateTime":"2019-04-30T16:00:00.000+00:00","stock":2999,"sold":31290}"')
//这里的ngx.say()方法就类似于Java中的Response.getWriter().write()方法，可以将数据写入到响应体中返回给页面，要用单引号和内容的双引号区分开来
2、重新加载配置
nginx -s reload

注意！！要将win上的nginx重新加载
*
* */

//OpenResty的各种API用来获取不同类型的请求参数
/*
* 路径占位符参数(类似Java的路径参数):
* /item/10001 ,使用正则表达式匹配:
*   location ~ /item/(\d+) {
* //~ 开启正则匹配 \d+ 匹配任何数字,匹配到的参数会存入ngx.var数组(从1开始)中，可以使用角标获取，local id = ngx.var[1] 就可以获取到路径中的10001了
    content_by_lua_file lua/item.lua;
    }

  请求头参数:id : 10001
  直接用local headers = ngx.req.get_headers()方法获取，返回的是table类型，因为请求头是key-value结构

  Get请求参数:?id=10001
  ngx.req.get_uri_args()方法获取,返回值是table类型 因为Get请求参数是key-value结构

  Post表单参数:id=10001
  先ngx.req.read_body()方法读取请求体，再ngx.req.get_post_args()方法获取表单参数，返回值是table类型 因为Post表单参数是key-value结构

  JSON参数:{"id":10001}
  读取请求体ngx.req.read_body()方法，然后使用ngx.req.get_body_data()方法获取请求体的json参数，返回值是string类型
  *

  * 案例:在查询商品信息的请求中，通过路径占位符方式传递商品id到后台
  * http://localhost/api/item/10001
  * 需求:在OpenResty中接受这个请求，并获取路径中的id信息，拼接结果的json字符串返回
  *
  * 修改OpenResty的nginx.conf文件，使其能监听/api/item/10001请求
  * location ~/api/item/(\d+)
  * 修改item.lua文件，使其能获取到路径中的id参数，local id = ngx.var[1]
  * 还要将id拼接到ngx.say()方法中，ngx.say('{"id":'..id..',"name":………………）返回给页面
  * 请求为http://localhost/api/item/10002
  * 响应结果为:
  * {
    "id": 10002,
    "name": "SALSA AIR",
    "title": "RIMOWA 21寸托运箱拉杆箱 SALSA AIR系列果绿色 820.70.36.4",
    "price": 19900,
    "image": "https://m.360buyimg.com/mobilecms/s720x720_jfs/t6934/364/1195375010/84676/e9f2c55f/597ece38N0ddcbc77.jpg!q70.jpg.webp",
    "category": "拉杆箱",
    "brand": "RIMOWA",
    "spec": "",
    "status": 1,
    "createTime": "2019-04-30T16:00:00.000+00:00",
    "updateTime": "2019-04-30T16:00:00.000+00:00",
    "stock": 2999,
    "sold": 31290
}证明此时id是动态变化的
* */
