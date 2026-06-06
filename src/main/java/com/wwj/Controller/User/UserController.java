package com.wwj.Controller.User;

import cn.hutool.core.bean.BeanUtil;
import com.wwj.Constant.JwtClaimsConstant;
import com.wwj.Dto.UserLoginDto;
import com.wwj.Dto.UserRegisterDto;
import com.wwj.Pojo.MemberLevel;
import com.wwj.Pojo.User;
import com.wwj.Result.Result;
import com.wwj.Service.IMemberLevelService;
import com.wwj.Service.UserService;
import com.wwj.Service.impl.TokenService;
import com.wwj.Utils.JwtUtil;
import com.wwj.Vo.UserLoginVo;
import com.wwj.Vo.UserRegisterVo;
import com.wwj.context.BaseContext;
import com.wwj.properties.JwtProperties;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/user/user")
@Api(value = "用户管理")
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private JwtProperties jwtProperties;

    @Autowired
    private IMemberLevelService memberLevelService;


    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private TokenService tokenService;

    //生成发送验证码
    @PostMapping("/code")
    public Result<String> code(@RequestParam("phone") String phone) throws Exception {
      return  userService.Sentcode(phone);

    }


  //用户登录
    @PostMapping("/login")
    public Result<UserLoginVo> login(@RequestBody UserLoginDto userLoginDto){
        User user = userService.login(userLoginDto);
        if (user == null){
            return Result.error("登录失败，手机号或验证码错误");
        }
        // 生成双Token
        Map<String, String> tokens = tokenService.generateTokens(user.getId());

        UserLoginVo userLoginVo = UserLoginVo.builder()
                .username(user.getUsername())
                .avatar(user.getAvatar())
                .accessToken(tokens.get("accessToken"))
                .refreshToken(tokens.get("refreshToken"))
                .expiresIn(tokens.get("expiresIn"))
                .build();

        return Result.success(userLoginVo);

    /*    //生成token
        Map<String, Object> map =new  HashMap<>();
        map.put(JwtClaimsConstant.USER_ID,user.getId());
        String token = JwtUtil.createJWT(jwtProperties.getUserSecretKey(), jwtProperties.getUserTtl(), map);
        UserLoginVo userLoginVo = UserLoginVo.builder()
                .username(user.getUsername())
                .avatar(user.getAvatar())
                .token(token)
                .build();
        return Result.success(userLoginVo);*/
    }
    //用户注册
    @PostMapping("/register")
    public Result<UserRegisterVo> register(@RequestBody UserRegisterDto userRegisterDto){
        UserRegisterVo userRegisterVo = userService.register(userRegisterDto);
        return Result.success(userRegisterVo);
    }


    //修改用户信息
    @PutMapping("/update")
    public Result update(@RequestBody User user){
        userService.updateUser((user));
        return Result.success();
    }

    //查询回显
    @GetMapping("/get")
    public Result<User> get(){
        Long userId = BaseContext.getCurrentId();
        User user = userService.getById(userId);
        return Result.success(user);
    }

    //查询会员等级特权
    @GetMapping("/Member")
    public Result<MemberLevel> Member(){
        Long userId = BaseContext.getCurrentId();
        Long memberLevelId = userService.getById(userId).getMemberLevelId();
        MemberLevel MM = memberLevelService.getById(memberLevelId);
        return Result.success(MM);
    }

    //退出登录
    @PostMapping("/logout")
    public Result<String> logout(@RequestHeader(value = "refresh-token", required = false) String refreshToken) {
        tokenService.logout(refreshToken);
        return Result.success("退出成功");
    }
}
