package com.wwj.Controller.User;


import cn.hutool.core.bean.BeanUtil;
import com.wwj.Pojo.*;
import com.wwj.Result.Result;
import com.wwj.Service.*;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * <p>
 * 运费模板表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@RestController("UserShippingTemplateController")
@RequestMapping("/user/shipping-template")
@Api(tags = "运费模板表")
public class ShippingTemplateController {

    @Autowired
    private IShippingTemplateService shippingTemplateService;

    @Autowired
    private IShippingRuleService shippingRuleService;

    @Autowired
    private IAddressBookService addressBookService;

    @Autowired
    private UserService userService;

    // 查询所有运费模板
    @GetMapping("/list")
    public Result<List<ShippingTemplate>> list(){
        return Result.success(shippingTemplateService.list());
    }

    //查询运费
    @GetMapping("/cost")
    public Result<BigDecimal> detail(@RequestParam("addressBookId") Long addressBookId){
        Long userId = BaseContext.getCurrentId();
        if(userService.lambdaQuery().eq(User::getId, userId).one().getMemberLevelId()!=1) {
            return Result.success(BigDecimal.ZERO);
        }

        List<ShippingRule> list = shippingRuleService.lambdaQuery().list();
        AddressBook AB = addressBookService.getById(addressBookId);
        RegionRule ABRR = BeanUtil.copyProperties(AB, RegionRule.class);
        for (ShippingRule rule : list) {
            String RE = rule.getRegion();
            if (RE.equals(ABRR.getProvinceName())) {
                return Result.success(rule.getFreight());
            }
        }
        return Result.success(BigDecimal.ZERO);
    }

}
