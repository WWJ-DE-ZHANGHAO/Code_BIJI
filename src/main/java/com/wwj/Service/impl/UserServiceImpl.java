package com.wwj.Service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Constant.JwtClaimsConstant;
import com.wwj.Constant.MessageConstant;
import com.wwj.Constant.RedisConstants;
import com.wwj.Constant.StatusConstant;
import com.wwj.Dto.UserLoginDto;
import com.wwj.Dto.UserRegisterDto;
import com.wwj.Exception.*;
import com.wwj.Mapper.UserMapper;
import com.wwj.Pojo.User;
import com.wwj.Query.UserQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.UserService;
import com.wwj.Utils.JwtUtil;
import com.wwj.Utils.RegexUtils;
import com.wwj.Utils.SmsService;
import com.wwj.Vo.UserRegisterVo;
import com.wwj.context.BaseContext;
import com.wwj.properties.AliyunSmsProperties;
import com.wwj.properties.JwtProperties;
import lombok.extern.slf4j.Slf4j;
import net.bytebuddy.implementation.bytecode.Throw;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static com.wwj.Constant.MessageConstant.*;
import static com.wwj.Constant.RedisConstants.LOGIN_CODE_KEY;
import static com.wwj.Constant.RedisConstants.LOGIN_CODE_TTL;
@Slf4j
@Service
public class UserServiceImpl  extends ServiceImpl<UserMapper, User> implements UserService{

    @Autowired
    StringRedisTemplate stringRedisTemplate;

    @Autowired
    AliyunSmsProperties aliyunSmsProperties;

    @Autowired
    JwtProperties jwtProperties;

    //生成发送验证码
    @Override
    public Result<String> Sentcode(String phone) throws Exception {
        if (RegexUtils.isPhoneInvalid(phone)) {
            //如果手机号不合法，直接返回
            throw new PhoneNumberIsInvalidException(MessageConstant.PHONE_NUMBER_IS_INVALID);
        }
        //TODO 生成验证码
        String code = RandomUtil.randomNumbers(6);
        //保存验证码到Redis
        stringRedisTemplate.opsForValue().set(LOGIN_CODE_KEY+phone,code,LOGIN_CODE_TTL, TimeUnit.MINUTES);
        //发送验证码
        SmsService smsService = new SmsService(aliyunSmsProperties);
        smsService.sendSmsCode(code,phone);
        log.info("发送验证码成功：验证码为：{}",code);
        return Result.success("验证码发送成功");
    }
    //用户注册
    @Override
    @Transactional
    public UserRegisterVo register(UserRegisterDto userRegisterDto) {
        if (RegexUtils.isPhoneInvalid(userRegisterDto.getPhone())) {
            //如果手机号不合法，直接返回
            throw new PhoneNumberIsInvalidException(MessageConstant.PHONE_NUMBER_IS_INVALID);
        }
        User UU = lambdaQuery().eq(User::getPhone, userRegisterDto.getPhone()).one();
        if (UU!=null){
            throw new AlreadyExistsException(MessageConstant.ALREADY_EXISTS);
        }
        if (userRegisterDto.getPassword()==null||userRegisterDto.getUsername().length()<1){
            throw new UkonwnErrorException(MessageConstant.UNKNOWN_ERROR) ;
        }

        userRegisterDto.setPassword(DigestUtils.md5Hex(userRegisterDto.getPassword()));
        User user = BeanUtil.copyProperties(userRegisterDto, User.class);
        save(user);
        //生成token
        Map<String, Object> map = new HashMap<>();
        map.put(JwtClaimsConstant.USER_ID, user.getId());
        String token = JwtUtil.createJWT(jwtProperties.getUserSecretKey(), jwtProperties.getUserTtl(), map);
        UserRegisterVo userRegisterVo = UserRegisterVo.builder()
                .username(user.getUsername())
                .avatar(user.getAvatar())
                .token(token)
                .build();
        return userRegisterVo;
    }
    //用户登录
    @Override
    public User login(UserLoginDto userLoginDto) {
        String code = userLoginDto.getCode();
        String phone = userLoginDto.getPhone();
        String username = userLoginDto.getUsername();
        String password = userLoginDto.getPassword();
        if (phone != null && code != null) {
            if (RegexUtils.isPhoneInvalid(phone)) {
                //如果手机号不合法，直接返回
                throw new PhoneNumberIsInvalidException(MessageConstant.PHONE_NUMBER_IS_INVALID);
            }
            //从Redis中获取验证码
            String redisCode = stringRedisTemplate.opsForValue().get(LOGIN_CODE_KEY + phone);
            //如果Redis中没有验证码或者验证码不匹配，直接返回
            if (redisCode == null || !redisCode.equals(code)) {
               throw new PhoneCodeErrorException(PHONE_CODE_ERROR);
            }
            //查看数据库中是否存在该手机号
            User user = lambdaQuery().eq(User::getPhone, phone).one();
            if (user==null) {
                throw  new AccountNotFoundException(ACCOUNT_NOT_FOUND);
            }
            if (user.getStatus() == StatusConstant.DISABLE) {
                //账号被锁定
                throw new AccountLockedException(MessageConstant.ACCOUNT_LOCKED);
            }
            return user;

        }
        else{
            User user = lambdaQuery().eq(User::getUsername, username).one();
            if (user==null) {
                throw  new AccountNotFoundException(ACCOUNT_NOT_FOUND);
            }
            String s = DigestUtils.md5Hex(password);
            if (!s.equals(user.getPassword())) {
                throw new PhoneCodeErrorException(PHONE_CODE_ERROR);
            }
            if (user.getStatus() == StatusConstant.DISABLE) {
                //账号被锁定
                throw new AccountLockedException(ACCOUNT_LOCKED);
            }
            return user;

        }


    }
    //修改用户信息
    @Override
    public void updateUser(User user) {
        Long userId = BaseContext.getCurrentId();
        if (user.getUsername()==null||user.getPhone()==null||user.getGender()==null||user.getAvatar()==null){
            throw new UserInformationIsIncompleteException(USER_INFORMATION_IS_INCOMPLETE);
        }
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            String password = DigestUtils.md5Hex(user.getPassword());
            user.setPassword(password);
            lambdaUpdate().eq(User::getId, userId).update(user);
        }
       else {
            lambdaUpdate()
                    .eq(User::getId, userId)
                    .set(User::getUsername, user.getUsername())
                    .set(User::getPhone, user.getPhone())
                    .set(User::getGender, user.getGender())
                    .set(User::getAvatar, user.getAvatar())
                    .update();
        }
        lambdaUpdate().eq(User::getId,userId).update(user);
    }
   //复杂条件分页查询，
    @Override
    public PageResult<User> queryUsersPage(UserQuery userQuery) {
        String phone = userQuery.getPhone();
        String username = userQuery.getUsername();
        Integer status = userQuery.getStatus();
        //创建分页对象
        Page<User> page = userQuery.toMpPage("create_time", true);
        //执行查询
        lambdaQuery()
                .like(username != null, User::getUsername, username)
                .like(phone != null, User::getPhone, phone)
                .eq(status != null, User::getStatus, status)
                .page(page);
        //封装结果并返回
        PageResult<User> pageResult = new PageResult<>();
        pageResult.setList(page.getRecords());
        pageResult.setTotal(page.getTotal());
        pageResult.setPages(page.getPages());

        return pageResult;
    }


}
