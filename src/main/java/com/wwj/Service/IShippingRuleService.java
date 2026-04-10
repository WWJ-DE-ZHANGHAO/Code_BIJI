package com.wwj.Service;

import com.wwj.Pojo.ShippingRule;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 运费规则表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
public interface IShippingRuleService extends IService<ShippingRule> {
    //添加运费规则
    void addRule(ShippingRule shippingRule);
    //修改运费规则
    void updateRule(ShippingRule shippingRule);
}
