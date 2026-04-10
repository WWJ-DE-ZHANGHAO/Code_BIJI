package com.wwj.Controller.admin;


import cn.hutool.core.bean.BeanUtil;
import com.wwj.Pojo.AddressBook;
import com.wwj.Pojo.RegionRule;
import com.wwj.Pojo.ShippingRule;
import com.wwj.Pojo.ShippingTemplate;
import com.wwj.Result.Result;
import com.wwj.Service.IAddressBookService;
import com.wwj.Service.IShippingRuleService;
import com.wwj.Service.IShippingTemplateService;
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
@RestController("AdminShippingTemplateController")
@RequestMapping("/admin/shipping-template")
@Api(tags = "管理端运费模板表")
public class ShippingTemplateController {

    @Autowired
    private IShippingTemplateService shippingTemplateService;
    //查询运费模板列表
    @GetMapping("/list")
    public Result<List<ShippingTemplate>> list() {
        return Result.success(shippingTemplateService.list());
    }

    //添加运费模板
    @PostMapping("/add")
    public Result add(@RequestBody ShippingTemplate shippingTemplate) {
        shippingTemplateService.add(shippingTemplate);
        return Result.success();
    }

    //修改运费模板,要让前端将id传过来，才能修改
    @PostMapping("/update")
    public Result update(@RequestBody ShippingTemplate shippingTemplate) {
        shippingTemplateService.Update(shippingTemplate);
        return Result.success();
    }

     //根据id查询运费模板，进行查询回显
    @GetMapping("/{id}")
    public Result<ShippingTemplate> get(@PathVariable Integer id) {
        return Result.success(shippingTemplateService.getById(id));
    }

    //删除运费模板
    @DeleteMapping("/delete/{id}")
    public Result delete(@PathVariable("id") Long id) {
        shippingTemplateService.removeById(id);
        return Result.success();
    }


}
