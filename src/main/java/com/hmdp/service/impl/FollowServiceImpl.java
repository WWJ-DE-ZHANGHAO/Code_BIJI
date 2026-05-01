package com.hmdp.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.BooleanUtil;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.Follow;
import com.hmdp.entity.User;
import com.hmdp.mapper.FollowMapper;
import com.hmdp.service.IFollowService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.service.IUserService;
import com.hmdp.utils.UserHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class FollowServiceImpl extends ServiceImpl<FollowMapper, Follow> implements IFollowService {
    @Autowired
    private StringRedisTemplate stringRedisTemplate;
    @Autowired
    private IUserService userService;

    private static final String FOLLOW_KEY = "follow:";
    //关注与取关
    @Override
    public Result follow(Long followId, Boolean isFollow) {
        Long userId = UserHolder.getUser().getId();
        if (!isFollow){
         stringRedisTemplate.opsForSet().remove(FOLLOW_KEY+userId,followId.toString());
         lambdaUpdate().eq(Follow::getUserId,userId).eq(Follow::getFollowUserId,followId).remove();
         return Result.ok();
     }
        Follow follow = new Follow();
        follow.setUserId(userId);
        follow.setFollowUserId(followId);
        save(follow);
        stringRedisTemplate.opsForSet().add(FOLLOW_KEY+userId,followId.toString());
        return Result.ok();
    }
    //是否关注
    @Override
    public Result isFollow(Long id) {
        Long userId = UserHolder.getUser().getId();
        Boolean member = stringRedisTemplate.opsForSet().isMember(userId.toString(), id.toString());
        return Result.ok(BooleanUtil.isTrue(member));
    }
    //查询共同关注
    @Override
    public Result common(Long id) {
        Long userId = UserHolder.getUser().getId();
        Set<String> users = stringRedisTemplate.opsForSet().intersect(FOLLOW_KEY+userId,FOLLOW_KEY+ id);
        List<Long> CC = users.stream().map(Long::valueOf).collect(Collectors.toList());
        List<User> UU = userService.listByIds(CC);
        List<UserDTO> userDTOS = BeanUtil.copyToList(UU, UserDTO.class);
        return Result.ok(userDTOS);

    }
}
