//Nginx查询Tomcat
/*
* 请求到Nginx集群，会先查询本地缓存，缓存中没有，再查询Redis缓存，Redis缓存中没有，再查询Tomcat集群，
* 我此时先实现查询Tomcat
* 但是OpenResty所在的是虚拟器，而Tomcat是在我们的windows上
* 两者的ip地址不同，所以不能直接访问
* 小技巧:适用于所有虚拟器，不管虚拟器地址是什么，只需要管前三位，把最后一位替换为1，就就一定能访问到Windows地址(前提是关闭防火墙)
* 例如:192.168.100.128  替换为192.168.100.1
*
* 案例:获取请求路径中的商品ID信息，根据id向Tomcat查询商品信息
* 需要修改item.lua文件，来满足以下需求
* 1、获取氢气参数的路径参数id
* 2、根据id向Tomcat发送请求，获取商品信息
* 3、根据id向Tomcat发送请求，获取库存 信息
* 4、将上面两个的结果组合成一个json字符串，返回给页面、
* 分两次查询是因为数据在两张表中，且在Tomcat中是两个请求(我们之前已经查询过数据库，并把数据存储到进程缓存了)
* 而且相应给前端页面的数据既有商品信息，也有库存信息，所以要分两次查询
*
*
* nginx提供了一个内部的API用于发送http请求
* local resp = ngx.location.capture("/tomcat/item/"..id,{//capture表示捕获一个请求
*   method = ngx.HTTP_GET --GET请求,返回值是table类型
*   args = {a=1,b=2}  --get方式传参数
*   body = "c=3&d=4" --post方式传参(二选一)
* })
* 返回的响应数据内容包括:
* resp.status  --响应状态码
* resp.header  --响应头 是一个table类型
* resp.body  --响应体 相应数据
*
* 但是这个请求地址只有路径没有IP端口，请求发送到哪去了?
* 这里的请求会被Nginx自己监听并处理，需要Nginx进行反向代理到Tomcat的ip和端口
* 需要在OpenResty的nginx.conf中添加反向代理的配置
location /item {--监听/item路径，并转发到Tomcat
 proxy_pass http://192.168.100.1:8080; --这里的ip地址就是Tomcat所在Windows主机的ip地址
  }
  *
 又因为需要查询两次，所以需要将http查询封装成一个函数，
* 需要放在usr/local/openresty/nginx/lualib/comon.lua文件中
* 而我们之前写在nginx.conf中的lua模块
* #加载Lua模块
  lua_package_path "/usr/local/openresty/lualib/?.lua;;";
  当使用require("xx")加载文件时，去这些路径下找这些文件
  就会将comon.lua文件中的函数一并加载了
*
* 封装函数:
* local function read_http(path.params){
*  local resp = ngx.location.capture(path,{
*   method = ngx.HTTP_GET,
*   args = params
* })
*  if not resp then
*  ngx.log(ngx.ERR,"http not found", path,"args:",args)
*   ngx.exit(404)
* end
* return resp. body
end
* --以上就是http函数，如果想查询结果为空就报错退出，否则返回结果
* --将方法导出
* local _M = {--这是一个Table对象，里面存放的value就是方法
*  read_http = read_http
* }
* return _M
* 必须将方法放入这个table对象中，并返回，其他文件才能用这个table得到方法，才能调用这个函数
*
*
* 此时这个函数就被放到OpenResty的函数库中了
*
* 因为此时item.lua文件返回的还是假数据
* 修改item.lua文件，使其能调用封装的函数，并返回正确的数据
* #需要先导入common.lua文件
* local common = require("common")
* #获取common中的函数
* local read_http = common.read_http
* #获取请求参数
* local id = ngx.var[1]
* #调用函数查询商品信息
* local itemJSON = read_http("/item/"..id,nil) --因为参数是路径中，所以参数是nil
* #调用函数查询库存信息
* local stockJSON = read_http("/item/stock/"..id,nil)
*
* #返回结果
* ngx.say(itemJSON)
*
*此时只返回来商品信息，没有库存信息
* 要想把商品信息和库存信息进行拼接，但是Json是无法进行数据拼接的，需要将其转换为table对象，才能进行数据拼接
* 要实现需要用到OpenResty提供的一个cjson模块，来处理JSON的序列化和反序列化
* 官网:https://github.com/openresty/lua-cjson
* 步骤:
* 引入cjson模块
* local cjson = require"cjson"
* 序列化方法:table->json
* local obj={
* name='jack'
* age=18
* }
* local json = cjson.encode(obj)
* 反序列化方法:json->table
* local json = '{"name":"jack","age","18"}'
* local obj = cjson.decode(json)
* print(obj.name)
*
* 修改item.Lua文件
* --JSON转换为table
local item=cjson.decode(itemJSON)
local stock =cjson.decode(stockJSON)

--组合数据
item.stock=stock.stock
item.sold=stock.sold

--把拼接后的itme序列化为JSON进行响应
local json=cjson.encode(item)
* */

//Tomcat进行集群负载均衡
/*
修改nginx配置文件
* 编写Tomcat集群配置文件,负载均衡的策略是轮询
* upstream tomcat-cluster{
        server 192.168.100.1:8081;
        server 192.168.100.1:8082;
    }
  将反向代理的请求转发到集群
  location /item {
   proxy_pass http://nginx-cluster;
  }
  问题:
  因为Tomcat接收到请求之后会查询数据库，响应数据，并存储到本地进程缓存中，下次在访问这个Tomcat就不需要再查询数据库了
  但是Tomcat集群是不能共享数据的，而使用的策略又是轮询，因此就会导致，两次处理请求的Tomcat不同
  导致第二次需要再次查询数据库。
  解决:
  使用Nginx的负载均衡算法:hash $request_uri;
  request_uri:就是你的请求路径，而hash就是对路径进行哈希运算，得到一个hash值之后，用这个hash值对Tomcat服务器的数量取模/余
  得到的就是服务器编号(类似数组的索引)，然后Nginx会根据这个编号将请求转发给对应的Tomcat服务器
  只要请求路径不变，每次都会访问到同一个Tomcat服务器，从而解决数据不共享的问题(类似分片集群中的用key计算hash得到插槽值)


测试:
在Idea中再新建一个启动配置，端口为8082
发送此时发送同个请求，会发送一直是访问的同一个Tomcat服务器，从而解决数据不共享的问题

总结:
1、前端页面发送请求，Nginx接收到这个请求，进行反向代理给OpenResty集群
 location ~ /api/item/(\d+) {监听到请求路径
        #响应类型。这里返回json
        default_type application/json;
        #响应数据由lua/item.Lua这个文件决定
        content_by_lua_file lua/item.lua;//会调用common.lua中的方法,并将请求路径传给该方法
    }
2、此时因为item.lua文件中用require("common")加载了common.lua文件，就可以得到common.lua的table
--需要先导入common.lua文件
 local common = require("common")
  --获取common中的函数
 local read_http = common.read_http
  再用read_http方法发送请求
 local itemJSON = read_http("/item/"..id,nil)
3、在read_http方法中，会调用ngx.location.capture方法发送请求
    local resp = ngx.location.capture(path,{ //发送包含请求路径和方式以及参数的请求
    method = ngx.HTTP_GET,
    args = params
     })

4、这个请求又会被Nginx自己监听，并将请求转发给tomcat集群
 location /item {
     proxy_pass http://tomcat-cluster;
     #访问tomcat集群

    }
 tomcat集群会监听这个请求，将请求转发给对应的Tomcat服务器
 upstream tomcat-cluster{
        hash $request_uri;
        server 192.168.100.1:8081;
        server 192.168.100.1:8082;
        #这里的ip地址就是Tomcat所在Windows主机的ip地址
    }
 最后将Tomcat响应的数据返回给Nginx的item.lua文件中调用common.lua文件的方法的调用处，将数据返回给前端页面
* */


//添加Redis缓存
/*
* Nginx本地缓存为命中应该去查询Redis缓存
* 冷启动和缓存预热:
* 冷启动:
* 服务刚刚启动时，Redis中并没有缓存数据，会去查询数据库，将数据存储到Redis中。
* 如果所有商品数据都是要在第一次查询时添加缓存，会给数据库带来压力，
*缓存预热:
在实际开发中，我们利用大数据统计用户访问的热点数据，在项目启动时将这些热点数据提前查询并保存在Redis中

* 而我们的数较少可以，在启动时将所有数都存入缓存中
*
* 缓存预热:
* 1、利用Docker安装Redis
* docker run --name redis -p 6379:6379 -d redis redis-server --appendonly yes
* 2、在item-server服务中引入Redis依赖
* <dependency>
<groupId>org.springframework.boot</groupId>
* <artifactId>spring-boot-starter-data-redis</artifactId>
* </dependency>
* 3、配置Redis地址
* spring:
*   redis:
*   host:192.168.100.128
* 4、编写初始化类
* @Component
* class class RedisHandler implements InitializingBean{
*  @Autowired
* private RedisTemplate redisTemplate;
*
* @Autowired
* private ObjectMapper objectMapper;
*
* @Override
* public void afterPropertiesSet() throws Exception {
*  --初始化缓存
        List<Item> list = itemService.list();
        //将item序列化为json字符串，存储到redis中
        for (Item item : list) {
            String s = objectMapper.writeValueAsString(item);
            stringRdisTemplate.opsForValue().set("item:id:" + item.getId(),s );
        }
        List<ItemStock> stockList = stockService.list();
        for (ItemStock itemStock : stockList) {
            String s = objectMapper.writeValueAsString(itemStock);
            stringRdisTemplate.opsForValue().set("item:stock:id:" + itemStock.getId(),s );
        }
    }
* }
*
*为什么不设置过期时间
* 因为实际开发中
* 进行缓存预热的一般都是热门商品，或是固定不变的活动信息
* */


//OpenResty查询Redis
/*
* OpenrResty提供了操作Redsi的模块，只需要引入模块，就可以使用Redis
* redis模块是存放在lualib/resty目录下的redis.lua，而不是直接放在lualib目录下
*下面这些都写在lualib/common.lua中
*引入Redis模块
* local redis = require "resty.redis"
* 初始化Redis对象
* local redis = redis:new()
* 设置Redis超时时间
* redis:set_timeout(1000,1000,1000)//分贝是建立连接的超时时间，发送请求的超时时间，接收响应的超时时间
*
* 封装函数，用来释放Redis链接，其实就是放入连接池(避免每次都释放连接，导致性能变差)
* local function close_redis(red)
*  local pool_max_idle_time = 10000 --链接的空闲时间，单位是毫秒
*  local pool_size = 100 --连接池大小
*  local ok, err = red:set_keepalive(pool_max_idle_time, pool_size)
* //将Redis链接放入连接池的Api，并设置连接池大小和空闲时间，如果成功就返回ok 如果失败ok里面就是nil，报错就返回 err
*  if not ok then//not nil 就是!flase
*      ngx.log(ngx.ERR, "放入Redis连接池失败: ", err)
*  end
* end
*
* 封装函数，从Redis读取数据并返回
* local function read_redis(ip,port,key)//ip和port是Redis的地址，key是查询的key
*  local ok, err = red:connect(ip,port) //建立一个连接
*  if not ok then
*      ngx.log(ngx.ERR, "连接Redis失败: ", err)
*     retunr nil
*  end
*  //查询Redis
*  local resp, err = red:get(key)//只读取了key:value(String类型的数据)
* //查询失败
*  if not resp then
*      ngx.log(ngx.ERR, "从Redis中获取数据失败: ", err,",key",key)
*  end
* //查询为空
* if resp == ngx.null then
*      resp = nil
*     ngx.log(ngx.ERR, "从Redis中获取数据为空: ", key)
*  end
*  close_redis(red)//释放链接放回连接池
*  return resp//返回数据
* end
*
写入lualib/common.lua中
* 也需要暴露方法
* --将方法导出
 local _M = {
 read_http = read_http
 read_redis= read_redis
 --将read_redis也暴露出去
 --这是个table类型
 }
*
*这样item.lua中就也可以调用查询Redis的方法了
* local common = require("common")
* local read_redis = common.read_redis
* 此时就需要查询逻辑了，需要先查询Redis，如果Redis没有数据，就查询Tomcat
* 因为两个http请求都需要修改，最好就是封装成一个方法
* local function read_data(key,path,param)
* local resp = read_redis("127.0.0.1",6379,key)
*  if not resp then
*       resp = read_http(path,param)
*  end
*  return resp
*end
* 此时就可以直接调用这个方法了
*查询商品和商品库存都用这个方法，就不是只用之前那个http方法了
*  --调用函数查询商品信息
 local itemJSON = read_http("item:id:"..id,"/item/"..id,nil)
 --调用函数查询库存信息
 local stockJSON = read_http("item:stock:id"..id,"/item/stock/"..id,nil)
*
* */

注意！！！因为Redsi和OPenResty都是在同一个机器上，所以OpenResty访问Redis时可以直接使用127.0.0.1/localhost,
只有是两者在不同机器才需要使用对方机器的IP地址访问

注意！！！！有问题一定要去nginx下面查看错误日志
cd /usr/local/openresty/nginx/
tail -f logs/error.log


//Nginx本地缓存，
//注意!!!OpenRestuy(Nginx)的集群之间和Tomcat一样是不共享数据的，也需要在负载均衡的配置中写
//hash $reuqest_uri;
/*
* 搭建Nginx本地缓存
*OpenResty为Nginx提供了shard dict的功能，可以在Nginx的多个Woeker之间共享数据，实现缓存功能
* 开启共享字典，在nginx.conf中添加如下配置
* lua_shared_dict item_cache 150m;//缓存大小为150M，名字叫item_cache
*
* 操作共享字典
* local item_cache = ngx.shared.item_cache//获取共享字典对象
* //存储，指定key-value，并设置过期时间，单位s，默认0，表示不过期
* item_cache:set('key','value',1000)//设置key-value
* --读取
* local val = item_cache:get('key')//获取key对应的value
*
* 案例:在查询商品时，优先查询OpenResty的本地缓存
*修改readdata函数
* 优先查询本地缓存，本地缓存未命中再拆线呢Redis，Tomcat
* 查询Redis或Tomcat成功后，将数据写入本地缓存，并设置有效期
* 商品信息有效期30分钟、库存信息有效期1分钟
*
*在item.lua中添加如下代码
* --导入共享字典
local item_cache = ngx.shared.item_cache
* -- 导入cjson库
local cjson = require("cjson")

-- 导入common.lua文件
local common = require("common")

--导入共享字典
local item_cache = ngx.shared.item_cache

-- 获取common中的函数
local read_http = common.read_http
local read_redis = common.read_redis

-- 封装查询函数
function read_data(key, expire, path, params)//设置过期时间时间单位是秒
    --查询本地缓存
    local val = item_cache:get(key)
    if not val then
        ngx.log(ngx.ERR, "本地缓存查询失败，尝试查询Redis，key:", key)

        -- 查询Redis
        val = read_redis("127.0.0.1", 7001, key)

        -- 判断查询结果
        if not val then
            ngx.log(ngx.ERR, "redis查询失败，尝试http，key: ", key)
            -- redis查询失败，开始查询http
            val = read_http(path, params)
        end

        --查询成功，把数据写入本地缓存
        item_cache:set(key, val, expire)
    end
    return val  -- 修正1：resp 改为 val
end  -- 修正2：添加这个 end 来关闭 function

-- 获取路径参数
local id = ngx.var[1]

-- 调用函数查询商品信息
local itemJSON = read_data("item:id:" .. id, 1800, "/item/" .. id, nil)

-- 调用函数查询库存信息
local stockJSON = read_data("item:stock:id:" .. id, 60, "/item/stock/" .. id, nil)

-- JSON转换为table
local item = cjson.decode(itemJSON)
local stock = cjson.decode(stockJSON)

-- 组合数据
item.stock = stock.stock
item.sold = stock.sold

-- 把拼接后的item序列化为JSON进行响应
local json = cjson.encode(item)

-- 返回结果
ngx.say(json)
*
*
*
* 测试:
* 查看错误日志，
* 同一个key，第一次查询本地缓存时会提示报错
*  item.lua:19: read_data(): 本地缓存查询失败，尝试查询Redis，key:item:id:10003, client: 192.168.100.1,
* server: localhost, request: "GET /api/item/10003 HTTP/1.0", host: "nginx-cluster",
* referrer: "http://localhost/item.html?id=10003"
* 第二次就不会了
* */