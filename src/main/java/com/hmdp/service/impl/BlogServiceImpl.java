package com.hmdp.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.BooleanUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Blog;
import com.hmdp.entity.Follow;
import com.hmdp.entity.ScrollResult;
import com.hmdp.entity.User;
import com.hmdp.mapper.BlogMapper;
import com.hmdp.service.IBlogCommentsService;
import com.hmdp.service.IBlogService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.service.IFollowService;
import com.hmdp.service.IUserService;
import com.hmdp.utils.RedisConstants;
import com.hmdp.utils.SystemConstants;
import com.hmdp.utils.UserHolder;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.hmdp.utils.RedisConstants.BLOG_FOLLOW_KEY;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class BlogServiceImpl extends ServiceImpl<BlogMapper, Blog> implements IBlogService {
    @Autowired
    private IUserService userService;

    @Resource
    private RedissonClient redissonClient;

    @Autowired
    private IFollowService  followService;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;
    // 点赞脚本
    private static final DefaultRedisScript<Long> LIKE_SCRIPT ;
    static {
        LIKE_SCRIPT = new DefaultRedisScript<>();
        LIKE_SCRIPT.setLocation(new ClassPathResource("liked.lua"));
        LIKE_SCRIPT.setResultType(Long.class);
    }


    @Override
    public Result queryBlogById(Long id) {
        Blog one = getById( id);
        if (one == null) {
            return Result.fail("数据不存在");
        }
        Long userId = one.getUserId();
        User user = userService.getById(userId);
        one.setIcon(user.getIcon());
        one.setName(user.getNickName());
        //查询该用户是否已经点赞过了
        isBlogLiked(one);
        return Result.ok(one);
    }
    //判断用户是否点赞过了
    private void isBlogLiked(Blog blog) {
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


    @Override
    public Result likeBlog(Long id) {
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        //判断是该用户是否已经点赞过了
        Long rr = stringRedisTemplate.execute(LIKE_SCRIPT,
                Collections.emptyList(),
                userId.toString(),//以字符串形式添加到Redis中
                id.toString(),String.valueOf(System.currentTimeMillis()));
        int code = rr.intValue();
        // 如果已经点赞过了
        if (code!=0){
            // 修改点赞数量
            update().setSql("liked = liked -1").eq("id", id).update();
            return Result.ok();
        }

        // 修改点赞数量
       update().setSql("liked = liked + 1").eq("id", id).update();
        return Result.ok();
    }

    @Override
    public Result queryHotBlog(Integer current) {
        // 根据用户查询
        Page<Blog> page =query()
                .orderByDesc("liked")
                .page(new Page<>(current, SystemConstants.MAX_PAGE_SIZE));
        // 获取当前页数据
        List<Blog> records = page.getRecords();
        // 查询用户,将用户信息封装到Blog中
        records.forEach(blog ->{
            Long userId = blog.getUserId();
            User user = userService.getById(userId);
            blog.setName(user.getNickName());
            blog.setIcon(user.getIcon());
        });
        //遍历所有笔记查询用户是否点赞过
        records.forEach(blog ->{
           this. isBlogLiked(blog);

        });
        return Result.ok(records);
    }
    //点赞排行榜
    @Override
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

    @Override
    public Result saveBlog(Blog blog) {
        // 获取登录用户
        UserDTO user = UserHolder.getUser();
        Long userId = user.getId();
        blog.setUserId(userId);
        // 保存探店博文
        save(blog);
        //查询笔记作者的粉丝
        List<Long> collect = followService.lambdaQuery().eq(Follow::getFollowUserId, userId).list().stream()
                .map(follow -> follow.getUserId()).collect(Collectors.toList());
        //推送笔记id给粉丝
        collect.forEach(followUserId -> {
            stringRedisTemplate.opsForZSet().add(BLOG_FOLLOW_KEY+followUserId,blog.getId().toString(),System.currentTimeMillis());
        });
        // 返回id
        return Result.ok(blog.getId());
    }
    //查询用户的关注的作者的笔记
    @Override
    public Result queryBlogOfFollow(Long max, Integer offset) {
        Long userId = UserHolder.getUser().getId();
        Set<ZSetOperations.TypedTuple<String>> typedTuples = stringRedisTemplate.opsForZSet()
                .reverseRangeByScoreWithScores(BLOG_FOLLOW_KEY + userId, 0, max, offset, 2);
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


}
