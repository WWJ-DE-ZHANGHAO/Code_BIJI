package com.wwj.Controller.admin;


import com.wwj.Pojo.ShippingRule;
import com.wwj.Result.Result;
import com.wwj.Service.IShippingRuleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * <p>
 * 运费规则表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-09
 */
@RestController
@RequestMapping("/shipping-rule")
public class ShippingRuleController {
    @Autowired
    private IShippingRuleService shippingRuleService;

    //查询运费规则列表
    @GetMapping("/list")
    public Result<List<ShippingRule>> list() {
        shippingRuleService.list();
        return Result.success(shippingRuleService.list());
    }


    //添加运费规则
    @PostMapping("/addRule")
    public Result addRule(@RequestBody ShippingRule shippingRule) {
        shippingRuleService.addRule(shippingRule);
        return Result.success();
    }

    //修改运费规则,要让前端将id传过来，才能修改
    @PostMapping("/updateRule")
    public Result updateRule(@RequestBody ShippingRule shippingRule) {
        shippingRuleService.updateRule(shippingRule);
        return Result.success();

    }

    //根据id查询运费规则，进行查询回显
    @GetMapping("/getRule/{id}")
    public Result<ShippingRule> getRule(@PathVariable Integer id) {
        return Result.success(shippingRuleService.getById(id));
    }
    //删除运费规则
    @DeleteMapping("/deleteRule/{id}")
    public Result deleteRule(@PathVariable("id") Long id) {
        shippingRuleService.removeById(id);
        return Result.success();
    }

}
