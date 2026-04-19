package com.wwj.Controller.User;

import com.wwj.Pojo.MemberLevel;
import com.wwj.Pojo.User;
import com.wwj.Result.Result;
import com.wwj.Service.IMemberLevelService;
import com.wwj.Service.UserService;
import com.wwj.Vo.UsepointsVo;
import com.wwj.context.BaseContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@RestController
@RequestMapping("/user/pointsLog")
public class UserPointsLogController {

    @Autowired
    private UserService userService;

    @Autowired
    private IMemberLevelService memberLevelService;



    // 使用积分
    @PostMapping("/use")
    public Result<UsepointsVo> use(){
        Long userId = BaseContext.getCurrentId();
        User one = userService.lambdaQuery().eq(User::getId, userId).one();
        Long Mid = one.getMemberLevelId();
        Integer points = one.getPoints();
        BigDecimal pointsExchangeRate = memberLevelService.lambdaQuery().eq(MemberLevel::getId, Mid).one().getPointsExchangeRate();
        if (points<=0){
            UsepointsVo usepointsVo = new UsepointsVo();
            usepointsVo.setAmount(BigDecimal.ZERO);
            usepointsVo.setPoints(0);
            return Result.success(usepointsVo);
        }
        BigDecimal rate = memberLevelService.lambdaQuery().eq(MemberLevel::getId, Mid).one().getPointsExchangeRate();
        BigDecimal amount = BigDecimal.valueOf(points);
        BigDecimal money = amount.multiply(rate);
        UsepointsVo usepointsVo = new UsepointsVo();
        usepointsVo.setAmount(money);
        usepointsVo.setPoints(points);
        return Result.success(usepointsVo);
    }
}
