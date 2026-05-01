package com.hmdp.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hmdp.config.AliyunSmsProperties;
import com.hmdp.dto.LoginFormDTO;
import com.hmdp.dto.Result;
import com.hmdp.dto.UserDTO;
import com.hmdp.entity.User;
import com.hmdp.mapper.UserInfoMapper;
import com.hmdp.mapper.UserMapper;
import com.hmdp.service.IUserService;

import com.hmdp.utils.RegexUtils;
import com.hmdp.utils.SmsService;
import com.hmdp.utils.UserHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.BitFieldSubCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpSession;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static com.hmdp.utils.RedisConstants.*;
import static com.hmdp.utils.SystemConstants.USER_NICK_NAME_PREFIX;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Slf4j
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {
@Autowired
private AliyunSmsProperties aliyunSmsProperties;



    private final UserInfoMapper userInfoMapper;

    public UserServiceImpl(UserInfoMapper userInfoMapper) {
        this.userInfoMapper = userInfoMapper;
    }

    @Autowired
    private StringRedisTemplate stringRedisTemplate;
    private static final ObjectMapper mapper = new ObjectMapper();
    @Override
    public Result SentCode(String phone, HttpSession session) throws Exception {
        SmsService smsService=new SmsService(aliyunSmsProperties);
        //校验手机号
        if (RegexUtils.isPhoneInvalid(phone)) {
            return Result.fail("手机号格式错误");
        }

        //生成验证码
        String code = RandomUtil.randomNumbers(6);
        //保存验证码,并设置过期时间
        stringRedisTemplate.opsForValue().set(LOGIN_CODE_KEY+phone,code,LOGIN_CODE_TTL, TimeUnit.MINUTES
        );

        //session.setAttribute("code",code);
        //发送验证码
       // smsService.sendSmsCode(code,phone);
        log.debug("发送验证码成功，验证码：{}", code);
        //返回结果
        return Result.ok();
    }

    @Override
    public Result Login(LoginFormDTO loginForm, HttpSession session) throws JsonProcessingException {
        String phone = loginForm.getPhone();
        String code = loginForm.getCode();
        //验证手机号
        if (RegexUtils.isPhoneInvalid(phone)){
            return Result.fail("手机号格式有误");
        }
        //验证验证码
        String cachecode = stringRedisTemplate.opsForValue().get(LOGIN_CODE_KEY+phone);
        //Object cachecode = session.getAttribute("code");
        if(cachecode==null||!cachecode.toString().equals(code)){
            return Result.fail("验证码有误");
        }
        //查询数据库中是否有该手机号
        User user = query().eq("phone", phone).one();
        if(user==null){
            user = createUserWithPhone(phone);

        }
        //将用户信息部分信息封装成UserDto存储到session中
        UserDTO userDTO = BeanUtil.copyProperties(user, UserDTO.class);
        String token = RandomUtil.randomString(10);
        //用hash类型，可以对每个字段进行CRUD
        Map<String, Object> map = BeanUtil.beanToMap(userDTO,
                new HashMap<>(),
                CopyOptions.create().setIgnoreNullValue(true).setFieldValueEditor((fieldName, fieldValue)->fieldValue.toString())
        );
        stringRedisTemplate.opsForHash().putAll(LOGIN_USER_KEY+token,map);
        //为了防止redis的内存被占满，设置过期时间
        stringRedisTemplate.expire(LOGIN_USER_KEY+token,LOGIN_USER_TTL,TimeUnit.MINUTES);
        //用String类型
       /* String s = mapper.writeValueAsString(userDTO);
        stringRedisTemplate.opsForValue().set("user:"+token,s);*/
        // session.setAttribute("user",userDTO);
        return Result.ok(token);


    }
    //签到功能
    @Override
    public Result sign() {
        Long userId = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        //获取当前时间的年月
        String format = now.format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String key =USER_SIGN_KEY+userId+":"+format;
        //获取当前是这个月的第几天
        int day = now.getDayOfMonth();//因为BitMap是从0开始，所以要减1，在作为offset使用
        stringRedisTemplate.opsForValue().setBit(key,day-1,true);
        return Result.ok();

    }
   //连续签到功能
    @Override
    public Result signCount() {
        Long userId = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        //获取当前时间的年月
        String format = now.format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String key =USER_SIGN_KEY+userId+":"+format;
        //获取当前是这个月的第几天
        int day = now.getDayOfMonth();//因为BitMap是从0开始，所以要减1，在作为offset使用
        //获取截止今天为止的签到天数
        List<Long> LL = stringRedisTemplate.opsForValue().bitField(key,
                BitFieldSubCommands.create().get(BitFieldSubCommands.BitFieldType.unsigned(day)).valueAt(0));
        //因为有多个子命令，所以可能不止会返回一个值，所以是用的List集合，如果只有一个值，那么返回的list集合中只有一个值，所以用get(0)
        if(LL==null||LL.size()==0){
            return Result.ok(0);
        }
        Long signCount = LL.get(0);//获取截止今天为止的签到天数
        if (signCount == null || signCount == 0) {
            return Result.ok(0);
        }
        //遍历挨个进行与运算
        int num = 0;
        while(true){
            //让该数与1进行与运算，判断该位是否为1，为1则说明签到，为0则说明未签到，会从最右边的低位开始进行判断
            if((signCount & 1)==0){//该天未签到
               break;
            }
            else{//该天签到
                num++;
            }
            //需要将数字无符号右移一位，让下一位数字进行判断
            signCount >>>=1;
        }
    return Result.ok(num);
    }

    private User createUserWithPhone(String phone) {
        User user=new User();
        user.setPhone(phone);
        user.setNickName(USER_NICK_NAME_PREFIX+RandomUtil.randomString(10));
        save(user);
        return user;
    }
}
