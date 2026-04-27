//探店笔记
//发布笔记
/*
tb_blog:探店笔记表
tb_blog_comment:探店笔记评论表,包含点赞数据
新知识:
*发布笔记的图片存放在前端服务器(Nginx)中，而不是阿里云OSS中，对于本地项目来说很简便，不用配置阿里云依赖和配置，且不用花钱
* //上传图片
* @PostMapping("blog")
    public Result uploadImage(@RequestParam("file") MultipartFile image) {
        try {
            // 获取原始文件名称
            String originalFilename = image.getOriginalFilename();
            // 生成新文件名
            String fileName = createNewFileName(originalFilename);
            // 保存文件
            image.transferTo(new File(SystemConstants.IMAGE_UPLOAD_DIR, fileName));//将文件保存到指定目录下，文件名为fileName
            // 返回结果
            log.debug("文件上传成功，{}", fileName);
            return Result.ok(fileName);
        } catch (IOException e) {
            throw new RuntimeException("文件上传失败", e);
        }
    }
    * //删除图片
       @GetMapping("/blog/delete")
    public Result deleteBlogImg(@RequestParam("name") String filename) {
        File file = new File(SystemConstants.IMAGE_UPLOAD_DIR, filename);
        if (file.isDirectory()) {
            return Result.fail("错误的文件名称");
        }
        FileUtil.del(file);
        return Result.ok();
    }
    //创建新文件名
    private String createNewFileName(String originalFilename) {
        // 获取后缀
        String suffix = StrUtil.subAfter(originalFilename, ".", true);
        // 生成目录
        String name = UUID.randomUUID().toString();
        int hash = name.hashCode();
        int d1 = hash & 0xF;
        int d2 = (hash >> 4) & 0xF;
        // 判断目录是否存在
        File dir = new File(SystemConstants.IMAGE_UPLOAD_DIR, StrUtil.format("/blogs/{}/{}", d1, d2));
        if (!dir.exists()) {
            dir.mkdirs();
        }
        // 生成文件名
        return StrUtil.format("/blogs/{}/{}/{}.{}", d1, d2, name, suffix);
    }
}
*
*
*
*
* */

//查看笔记
/*
*
*比较简单
* */
//点赞笔记
/*
我还是用的Lua脚本来实现点赞判断用户是否点过赞了，点赞数的增加和减少，点赞状态的改变
Lua脚本:
local likeKey = 'blog:liked:' .. ARGV[2]
local likeCount = 'blog:likeCount:' .. ARGV[2]
local userId = ARGV[1]
local blogId = ARGV[2]

if redis.call('SISMEMBER', likeKey, userId)==1 then
    redis.call('DECRBY', likeCount, 1)
    redis.call('SREM', likeKey, userId)
    return 1
    end
redis.call('INCRBY', likeCount, 1)
redis.call('SADD', likeKey, userId)
return 0
Redis中存储点赞该笔记的用户id的Set集合，key为blog:liked:笔记id，value为用户id的列表
Redis中存储点赞数的String，key为blog:likeCount:笔记id，value为点赞数
点赞不需要考虑线程并发，只要能保证点击点一次是增加点赞数，再点一次就是取消点赞，点赞数减一就行了，想点多少次都没影响
* 重点:
* 当已经被用户点过赞点赞按钮要显示为高亮，没点则是灰色，
* 这里要由isLike这个字段来判断，注意这个isLike是和用户绑定的，不能和笔记绑定，不然一个人点了赞，其他人也会看到高亮了
* 如果用户已经点赞了，再点击点赞按钮，则返回1，就是取消点赞，则将用户id从Set中删除，并返回1，表示成功取消点赞，并将isLike字段改为false
* 如果用户没有点赞了，再点击点赞按钮，则返回0，就是点赞，则将用户id添加到Set中，并返回0，表示成功点赞，并将isLike字段改为true

修改查看笔记的接口，
需要查询是否已经被该用户点赞了，如果已经点赞了，则将isLike字段设置为true，如果没有点赞了，则将isLike字段设置为false
  //判断用户是否点赞过了
    private void isBlogLiked(Blog blog) {
        //获取当前用户
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        String key = "blog:liked:" + blog.getId();
        Boolean member = stringRedisTemplate.opsForSet().isMember(key, userId.toString());
        blog.setIsLike(BooleanUtil.isTrue(member));//设置是否点赞,如果是true则将点赞状态设置为true，否则为false
    }
    注意！！因为高亮点赞会显示在推荐页，还会显示在笔记详情页
    所以在查看笔记的接口中，需要调用isBlogLiked(Blog blog)将isLike字段设置为true或者false
    每次刷新页面会发送hot的分页查询请求，也需要在hot的分页查询接口中遍历所有笔记，调用isBlogLiked(Blog blog)设置isLike字段，
    判断用户是否点赞了，如果点赞了则设置为true，否则为false
* */

//点赞排行
/*
* 在笔记的详情页，应该将给该该笔记点赞的人显示出来，比如:最早点赞的top5
* Redis中value使用SortedSet类型,用于实现排行榜功能，
* key为点赞榜，value为给该笔记点赞的用户ID的treeSet集合，每个绑定一个score:点赞时间的时间戳，按照时间戳排序，时间戳越小越靠前
* 修改点赞接口，使其往Zset中添加用户ID和点赞时间的时间戳，取消点赞时则从Zset中删除用户ID
* 通过ZSCORE key member 判断用户是否存在(是否已点赞)
* 通过ZRANGE key min max:按照socre排序后。获取指定排名范围内的元素(按照排名)
*
*  Long rr = stringRedisTemplate.execute(LIKE_SCRIPT,
    Collections.emptyList(),
    userId.toString(),//以字符串形式添加到Redis中
    id.toString(),String.valueOf(System.currentTimeMillis()));
* Lua脚本:
local likeKey = 'blog:liked:' .. ARGV[2]
local userId = ARGV[1]
local blogId = ARGV[2]
local score = tonumber(ARGV[3])//获取点赞时间，传入的时候用的是字符串，这里需要转换为数字
local exist=redis.call('ZSCORE', likeKey, userId)

if exist==false then
    redis.call('ZADD', likeKey, score,userId)
    return 0
end
redis.call('ZREM', likeKey,userId)
return 1

*注意！！！nil在Lua中用false表示
* 因为已经将数据存储到Zset中，所以判断用户是否点赞过了，就不需要再去Set中判断了，
* 直接通过ZSCORE key member 判断用户是否存在(是否已点赞)，如果返回值为null，则说明没有点赞过，如果返回值不为null，则说明已经点赞过了
*private void isBlogLiked(Blog blog) {
        //获取当前用户
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        String key = "blog:liked:" + blog.getId();
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        blog.setIsLike(score!=null);//设置是否点赞,如果不是null则将点赞状态设置为true，否则为false
    }
编写获取点赞排行的接口
* @GetMapping("/likes/{id}")
* 别忘了存进去的用户Id时候是字符串，这里需要转换为数字
* 逻辑层
*  @Override
    public Result queryBlogLikes(Long id) {
      //ZRANGE
        Set<String> TOP5 = stringRedisTemplate.opsForZSet().range("blog:liked:" + id, 0, 4);
        if (TOP5 == null || TOP5.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
        List<Long> user = TOP5.stream().map(Long::valueOf).collect(Collectors.toList());
        String idstr = StrUtil.join(",", user);
        List<User> users = userService.lambdaQuery().in(User::getId, user).
                last("ORDER BY FIELD(id," +idstr+ ")" ).list();
        List<UserDTO> userDTOS = BeanUtil.copyToList(users, UserDTO.class);

       return Result.ok(userDTOS);
    }
*注意！！！因为这个项目的进入首页是不需要登录的，所以需要在查询是否点赞的方法中判断
* private void isBlogLiked(Blog blog) {
        //获取当前用户
        UserDTO user = UserHolder.getUser();
        if (user == null) {
            //用户未登录，无法判断是否点赞过了
            return;
        }
        Long userId = user.getId();
        String key = "blog:liked:" + blog.getId();
        Double score = stringRedisTemplate.opsForZSet().score(key, userId.toString());
        blog.setIsLike(score!=null);//设置是否点赞,如果不是null则将点赞状态设置为true，否则为false
    }
*重点注意！！！
*  Set<String> TOP5 = stringRedisTemplate.opsForZSet().range("blog:liked:" + id, 0, 4);
        if (TOP5 == null || TOP5.isEmpty()) {
            return Result.ok(Collections.emptyList());
        }
List<Long> user = TOP5.stream().map(Long::valueOf).collect(Collectors.toList());
* List<User> users = userService.listByIds(user);这个底层的SQL语句的查询结果默认是按照id升序排序的，
这里要用LambdaQuery自定义排序
* 因为这个Set<String> TOP5集合中的用户的顺序已经是按照点赞时间排好序了，再使用LambdaQuery自定义排序，不要再用orderBy()
* 要用last()方法传入一个手写SQL语句，按照集合中已经拍好的顺序进行排序
* 将集合转换成字符串，用逗号隔开。String idstr = StrUtil.join(",", user);
*  List<User> users = userService.lambdaQuery().in(User::getId, user).
                last("ORDER BY FIELD(id," +idstr+ ")" ).list();

* */

//好友关注
//关注与取关
 /*
 * 共同关注会用到Set集合的交集运算
 * 将关注的存放在Redis中，key是userId value是该用户关注的用户的Id的Set集合
 *实现是通过tb_follow中间表来存储用户之间的关注关系，
 * 表中有两个字段：user_id和follow_user_id，分别表示用户id和被该用户所关注用户id
 *逻辑:关注了就是新增一条数据，取消关注就是删除一条数据
 * 关注/取关好友的接口：
 * @PUTMapping("{id}/{isFollow}")
 * 其中id是被关注用户的id，isFollow是一个boolean值，表示是关注还是取关,如果isFollow为true，则表示关注，如果isFollow为false，则表示取关
 * 与点赞一样，不用考虑多线程并发，点多少次也只是取关与关注之间切换
 * 还需要在点击进入笔记的详情页时，发送一个判断是否已关注该笔记作者的请求，接口如下：
 * @GetMapping("/or/ont/{id}")
 * 通过查询tb_follow表中是否存在user_id为当前用户id，follow_user_id为笔记作者id的数据来判断是否已关注该笔记作者
 * */
//共同关注
/*
//先完成查询当前笔记作者的信息和该笔记作者的所有笔记的接口
查询当前笔记作者的信息的请求路径为/api/user/{id}
查询当前笔记作者的所有笔记的请求路径为/api/blog/of/user?&id={id}&current=PageNum
* 通过发送请求，请求路径为/api/follow/common/{id}
* 参数：id为笔记作者的id，查询当前用户和该笔记作者的关注的交集
*
* */

//关注推送
/*
关注推送页叫做Feed流，直译为投喂
* 类似订阅推送，当用户A关注了用户B，用户B的笔记被用户A所关注，用户A就会收到用户B的发笔记推送
* 逻辑：
Feed流有两种常见模式:
Timeline模式：不做内容筛选、简单的按照内容发布时间排序，常用于好友或关注
优点:信息全面、不会有缺失，并且实现相对简单
缺点:信息噪音较多、用户不一定感兴趣，内容获取效率低

智能排序模式：利用智能算法屏蔽违规、用户不感兴趣的内容，推送用户感兴趣的内容
优点:投喂用户更感兴趣，用户粘度很高
缺点:如果算法不准确会起反作用

本项目中使用的是Timeline模式，在本用户的个人首页的关注页中，显示当前用户所关注的用户的笔记，笔记按照发布时间排序
该模式的实现方案有三种:推模式、拉模式、推拉结合。
*拉模式:也叫做读扩散，类似发件箱和收件箱，笔记作者将笔记写在发件箱，如果用户A该关注了笔记作者，
那么用户A查看时是将笔记作者的笔记从发件箱拉到(读取到)自己的收件箱，但是这种模式下，如果用户A关注了成百上千个作者，要拉的笔记太多了会导致延时高

*推模式:也叫写扩散，笔记作者直接将笔记推送到(写到)用户的收件箱中，但这如果该笔记作者的粉丝很多，很么作者需要发送很多份笔记，延时低、但是很占存储空间

*推拉结合:也叫读写混合模式，将笔记作者的粉丝分为两类，活跃粉丝和普通粉丝，普通粉丝是采用拉模式，而活跃粉丝是采用推模式，
既拉又推，既延时低又不占存储空间
*
因为本项目的用户量不多，且没有大V，使用的是推模式

*
基于推模式实现关注推送功能
需求:
1、修改新增探店笔记业务，在保存blog到数据库的同时，推送到粉丝的收件箱(使用Redis实现)
2、收件箱满足可以根据时间戳排序、必须用Redis的数据结构实现
(List可以根据先插入的靠后后插入的靠前的排序，SortedSet可以根据数据的时间戳倒序排序。让最新的在最上面)
3、查询收件箱数据时，可以实现分页查询
(因为传统分页查询是需要有当前页和Pagesize的，让后由这两个算出查询开始的索引:索引=(当前页-1)*PageSize)，
List可以根据索引查询，sortedSet可以根据排名查询)

注意！！！因为收件箱的数据是会不断变化的，因此排名在不断地变化，
当查询第一页的数据时，突然插入了一条新的数据，那当前的排序就会发生改变，当开始查询第二页的数据时，就会有数据未查询和重复查询的问题
例如:刚开始数据为1,2,3,4,5,6,7,8,9,10，查询第一页:PageNum=1,PageSize=5,索引为0-4，查询结果为1,2,3,4,5。此时插入一条数据，
数据变为0,1,2,3,4,5,6,7,8,9,10，查询第二页:PageNum=2,PageSize=5,索引为5-9，查询结果为5,6,7,8,9
导致不能用传统的分页模式

因此要采用的是Feed的滚动分页模式:
记录每一次查询的结束元素，下一次查询的开始为结束元素的下一个元素
此时就没法用List，因为List只能按照索引查询，无法知道最后一个元素是谁，当索引变化了，就无法知道上一次查询的结束元素在哪了
而SortedSet是根据Sorce(时间戳)进行的降序查询的，可以用SortedSet的score的值，每次查询都记住最小的score，
下次查询时就是从比这个score更小的数据开始查询
例如:刚开始数据为10,9,8,7,6,5,4,3,2,1，查询第一页: PageSize=5, lastId=无穷大,查询结果为10,9,8,7,6。
此时插入一条数据，数据变为11,10,9,8,7,6,5,4,3,2,1，查询第二页: PageSize=5, lastId=6,查询结果为5,4,3,2,1，完全不会有问题

实现个人主页的关注卡片中，查询推送到收件箱的数据，通过滚动分页模式实现
请求路径:/blog/of/follow?&lastId=1777258473134:从lastId开始查询
实现逻辑:
根据SortedSet的ZRANGEBYSCORE命令:ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]，
根据时间戳值进行查询而不是排名
参数：
key:收件箱的key，格式为：follow:{userId}
min:指定最小时间戳值
max:指定最大时间戳值
WITHSCORES:返回数据中包含score
LIMIT offset count:限制返回的个数，offset:偏移量;
为从大于等于上一次最小时间戳的数据的第几个开始(规律:第一次查询是0，之后根据上一次查询中与最小值一样的元素的个数决定)
count为返回的个数，
因为需要根据上一次查询的最小时间戳值进行查询，
因此返回值中除了笔记列表，还需要将最小时间戳值、偏移量offset一并返回。
这样下次查询时前端才能传递这个最小时间戳值和偏移量offset。
//查询用户的关注的作者的笔记
    @Override
    public Result queryBlogOfFollow(Long max, Integer offset) {
        Long userId = UserHolder.getUser().getId();
        Set<ZSetOperations.TypedTuple<String>> typedTuples = stringRedisTemplate.opsForZSet()
                .reverseRangeByScoreWithScores(BLOG_FOLLOW_KEY + userId, 0, max, offset, 2);//需要将score值和排行榜一起返回
        if (typedTuples == null || typedTuples.isEmpty()) {
            return Result.ok();
        }
        //解析数据
        List<Long> ids = new ArrayList<>(typedTuples.size());//创建一个集合，用于存储笔记id
        long mintime= 0;//创建一个变量，用于存最小储时间戳
        int OS= 1;//创建一个变量，用于存偏移量，查看有多少个等于最小时间戳，最少是1
        for (ZSetOperations.TypedTuple<String> typedTuple : typedTuples) {
            String blogId = typedTuple.getValue();
            ids.add(Long.valueOf(blogId));
            long time = typedTuple.getScore().longValue();
            if (time == mintime) {//如果时间戳等于最小时间戳，则偏移量加1
                OS++;
            }
            else {//如果时间戳不等于最小时间戳，则更新最小时间戳，并清空偏移量
                mintime = time;
                OS = 1;
            }
        }
        //根据id查询笔记
        String idstr = StrUtil.join(",", ids);
        List<Blog> blogs = query().in("id", ids).last("ORDER BY FIELD(id," + idstr + ")").list();
        for (Blog blog : blogs) { //遍历所有笔记查询用户是否点赞过
            this.isBlogLiked(blog);
            blog.setName(userService.getById(blog.getUserId()).getNickName());
            blog.setIcon(userService.getById(blog.getUserId()).getIcon());

        }
        ScrollResult scrollResult = new ScrollResult(blogs, mintime, OS);

        return Result.ok(scrollResult);
    }


注意！！！还需要查询是否点赞和查看笔记的方法
发现:每次移动页面的滚动条超过每页的大小时，都会发送请求查询第二页的数据
如果要返回的排行带上score，那么返回的set集合的泛型是ZSetOperations.TypedTuple<String>，这是一个对象，包含score和value
Set<ZSetOperations.TypedTuple<String>> typedTuples = stringRedisTemplate.opsForZSet()
.reverseRangeByScoreWithScores(BLOG_FOLLOW_KEY + userId, 0, max, offset, 2);
注意！！！@RequestParam()括号中的参数要和前端传递的参数名一致
* */



//GEO数据结构实现地理位置查询
//GEO基础概念
/*
* GEO(Geolocation),代表地理坐标，Redis在3.2版本加入对GEO的支持，允许存储地理坐标信息，帮我们根据经纬来检索数据
*添加地理位置
geoadd：添加地理位置的坐标。包括经度(longitude)、纬度(latitude)、值(member),这个值可以是地名或者其他什么
GEOADD key [NX|XX] [CH] longitude latitude member [longitude latitude member ...]

获取坐标
geopos：获取指定地理位置的坐标。
GEOPOS key member [member ...]

* 计算距离
geodist：计算两个位置之间的距离。并返回距离。默认单位为米。
GEODEST key member1 member2 [WITHDIST] [WITHCOORD] [WITHHASH] [ANDROID] [ASC|DESC] [LIMIT offset count]

* 获取指定范围内的地理位置成员
georadius：指定圆心、半径、找到圈内包含的所有member、并按照与圆心之间的距离排序后返回(6.2之后就废弃了)
将指定的地理坐标转化为hash字符串
geohash：将指定member的坐标转化为hash字符串形式返回

* 搜索范围内的地理位置成员
 GEOSEARCH key [FROMMEMBER member] [FROMLONLAT longitude latitude] [BYRADIUS radius m|km|ft|mi]
 [BYBOX width height m|km|ft|mi] [ASC|DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]
参数:
key:指定的是存储地理位置的key
* FROMMEMBER member:将key的某个member作为圆心
* longitude latitude:指定圆心的坐标
* BYRADIUS:根据半径进行查询，单位默认为米
* BYBOX:根据矩形进行查询
* WITHCOORD:返回member的坐标
* WITHDIST:返回member与指定圆心的距离
*注意！！！ 其实搜索是该key中符合条件的地理位置成员（member）
这些 member 必须是之前通过 GEOADD 命令添加到该 key 中的
geosearch:在指定范围内搜member，并按照与指定点之间的距离排序后返回(6.2之后新出的，代替georadius)

* 将搜索结果保存
geosearchstore:与geosearch相同，但将结果保存在指定的key中
*
* GEO的底层存储结构为：ZSET，存入Redis时，会将坐标转化为hash字符串保存在ZSET中
*
* 案例:
* 添加地理坐标(北京南站:116.378248 39.865275、北京站:116.42803 39.903738、北京西站:116.322287 39.893729)
* 计算坐标之间的距离;计算北京西站到北京站之间的距离
* 搜索指定范围内的数据;搜索天安门(116.397904 39.909005) 附近10km内的所有火车站
*
*
* */

//实现附近商铺查询
/*
请求路径为:/shop/of/type?&typeId=1&current=1&x=116.397904&y=39.909005
*修改根据商铺类型查询id，要查询的结果可以根据地理坐标排序
* 因为还没有获取用户所在的地理坐标的功能，所以是用前端传递的经纬度
* 当前的数据全部是存储在数据库中，而通过数据库查询是无法进行地理坐标排序的
*需要将这些数据存储在Redis中，用GEO才能进行地理坐标排序
但是不用存储所有的数据，只需要存储商铺的id和经纬度即可，因为GEO命令只要member和经纬度就可以进行排序
但是请求是需要根据商铺类型查询的，在查询Redis的时候也要根据商铺类型查询，，为此可以将GEO存储的key和商铺类型绑定在一起
例如:shop:geo:food、shop:geo:ktv，根据不同的key存储不同类型的商品地理坐标
逻辑:使用GeoSearch key member [FROMLONLAT longitude latitude] [BYRADIUS radius m|km|ft|mi] WITHDIST，将对应的距离一并返回


private static final String SHOP_GEO_KEY = "shop:geo:";
    @Test
    void loadshopdata() throws InterruptedException {
        //获取所有店铺
        List<Shop> list= shopService.lambdaQuery().list();
        //使用Stream流对集合根据typeId进行分组
        Map<Long, List<Shop>> map = list.stream().collect(Collectors.groupingBy(Shop::getTypeId));
        for (Map.Entry<Long, List<Shop>> entry : map.entrySet()) {//将map集合变为键值对的set集合
            Long typeId = entry.getKey();
            List<Shop> value = entry.getValue();
            for (Shop shop : value) {
                stringRedisTemplate.opsForGeo().add(SHOP_GEO_KEY+typeId,
                        new Point(shop.getX(),shop.getY()),shop.getId().toString());
            }
        }
    }
 Java中使用的Point对象封装了经纬度，Point point = new Point(shop.getX(),shop.getY());
 但是这样一个个的添加数据，效率很低，所以使用批量添加
 使用opsForGeo().add(key, Iterable<GeoLocation<String>> locations)方法,这个GeoLocation对象封装了member和Point对象
 泛型是String，String是member的类型
 Iterable<>表示一个可以迭代的集合，所以可以使用List<GeoLocation<String>> locations = new ArrayList<>();来创建一个GeoLocatio集合
 再将这个集合传入opsForGeo().add(key, locations)方法中就能实现批量添加
    @Test
    void loadshopdata() throws InterruptedException {
        //获取所有店铺
        List<Shop> list= shopService.lambdaQuery().list();
        //使用Stream流对集合根据typeId进行分组
        Map<Long, List<Shop>> map = list.stream().collect(Collectors.groupingBy(Shop::getTypeId));
        for (Map.Entry<Long, List<Shop>> entry : map.entrySet()) {//将map集合变为键值对的set集合
            Long typeId = entry.getKey();
            List<Shop> value = entry.getValue();
            List<RedisGeoCommands.GeoLocation<String>> locations=new ArrayList<>();
           for (Shop shop : value) {
               Point point = new Point(shop.getX(), shop.getY());
               String string = shop.getId().toString();
               RedisGeoCommands.GeoLocation<String> stringGeoLocation = new RedisGeoCommands.GeoLocation<>(string, point);
               locations.add(stringGeoLocation);
               //stringRedisTemplate.opsForGeo().add(SHOP_GEO_KEY+typeId,
                        //new Point(shop.getX(),shop.getY()),shop.getId().toString());
            }
                 stringRedisTemplate.opsForGeo().add(SHOP_GEO_KEY+typeId,locations);
        }
}


* */

//实现接口
/*
*    //复杂条件的分页查询
    @Override
    public Result queryShopByType(Integer typeId, Integer current, Double x, Double y) {
        //判断是否需要根据坐标查询
        if(x==null||y==null){
            // 不需要坐标查询，按数据库查询
            Page<Shop> page =query()
                    .eq("type_id", typeId)
                    .page(new Page<>(current, SystemConstants.DEFAULT_PAGE_SIZE));
            // 返回数据
            return Result.ok(page.getRecords());
        }
        //需要的话，计算分页参数
        int from = (current-1)*SystemConstants.DEFAULT_PAGE_SIZE;
        int end = current*SystemConstants.DEFAULT_PAGE_SIZE;
        //查询Redis，按照距离排序、分页、结果要包含distance字段,因为这个limit只能限制查到哪结束，不能限制从哪开始，锁要从查询的结果中再截取
        String key = SHOP_GEO_KEY+typeId;
        GeoResults<RedisGeoCommands.GeoLocation<String>> search = stringRedisTemplate.opsForGeo()
                .search(key, GeoReference.fromCoordinate(x, y), new Distance(5000),//默认单位是 米
                RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().includeDistance().limit(end));
        //GeoResults 是一个包含多个 GeoResult 的集合，每个 GeoResult 包含：
         //content就是GeoLocation<String>,就是店铺传入Redis中的数据包含member(店铺Id)、point(经纬度)
        //距离用户的距离（distance）
        //GeoResults只算是一个包装盒，里面是包含了一个List<GeoResult>的集合

        if (search==null){
            return Result.ok(Collections.emptyList());
        }
        //解析出id
        List<GeoResult<RedisGeoCommands.GeoLocation<String>>> content = search.getContent();//通过getContent()方法获取实际的List<GeoResult>集合
        //截取集合,利用skip方法表示跳过这个集合中的前from个元素，然后返回剩余的元素
        List<Long> ids = new ArrayList<>(content.size());//创建一个集合，用于存储店铺Id
        Map<String,Distance> distances = new HashMap<>(content.size());//根据店铺Id和距离进行一一映射
        //注意！！如果返回的集合的长度小于from，则不要跳过直接返回空
        if (content.size()<from){
            return Result.ok(Collections.emptyList());
        }
        content.stream().skip( from).forEach(
               geoResult -> {
                   //获取店铺Id
                   String shopId = geoResult.getContent().getName();
                   ids.add(Long.valueOf(shopId));
                   //查询距离
                   Distance distance = geoResult.getDistance();
                   //将店铺数据写入Redis
                   distances.put(shopId,distance);
               }
        );
        //根据id查询shop
        String idsStr = StrUtil.join(",", ids);
        List<Shop> SP= query().in("id", ids).last("ORDER BY FIELD(id," + idsStr + ")").list();
        for (Shop shop : SP) {
            shop.setDistance(distances.get(shop.getId().toString()).getValue());//Shop类中添加了distance属性
        }
        return Result.ok(SP);

    }
* */

