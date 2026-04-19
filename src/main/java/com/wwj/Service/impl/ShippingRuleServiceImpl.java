package com.wwj.Service.impl;

import com.wwj.Exception.BaseException;
import com.wwj.Pojo.RegionRule;
import com.wwj.Pojo.ShippingRule;
import com.wwj.Mapper.ShippingRuleMapper;
import com.wwj.Pojo.ShippingTemplate;
import com.wwj.Service.IShippingRuleService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Service.IShippingTemplateService;
import com.wwj.context.BaseContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * <p>
 * 运费规则表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-03
 */
@Service
public class ShippingRuleServiceImpl extends ServiceImpl<ShippingRuleMapper, ShippingRule> implements IShippingRuleService {
    @Autowired
    private IShippingTemplateService shippingTemplateService;
    //添加运费规则
    @Override
    public void addRule(ShippingRule shippingRule) {
        Long adminId = BaseContext.getCurrentId();
        Long STPId = shippingRule.getShippingTemplateId();
        String region = shippingRule.getRegion();
        BigDecimal freight = shippingRule.getFreight();
        if (STPId== null|| region==null || freight==null) {
            throw new BaseException("运费规则信息不完整，无法添加");
        }
        ShippingTemplate one = shippingTemplateService.lambdaQuery().eq(ShippingTemplate::getId , STPId).one();
        shippingRule.setShippingTemplateName(one.getName());
        shippingRule.setCreatedBy(adminId);
        shippingRule.setUpdatedBy(adminId);
        shippingRule.setCreateAt(LocalDateTime.now());
        save(shippingRule);
    }
     //修改运费规则
    @Override
    public void updateRule(ShippingRule shippingRule) {
        Long adminId = BaseContext.getCurrentId();
        Long STPId = shippingRule.getShippingTemplateId();
        String region = shippingRule.getRegion();
        Long id = shippingRule.getId();
        BigDecimal freight = shippingRule.getFreight();
        if (STPId== null|| region==null || freight==null) {
            throw new BaseException("运费规则信息不完整，无法添加");
        }
        ShippingTemplate one = shippingTemplateService.lambdaQuery().eq(ShippingTemplate::getId , STPId).one();
        ShippingRule SR = lambdaQuery().eq(ShippingRule::getId, id).one();
        SR.setUpdatedBy(adminId);
        SR.setShippingTemplateId(STPId);
        SR.setShippingTemplateName(one.getName());
        SR.setUpdateAt(LocalDateTime.now());
        SR.setRegion(region);
        SR.setFreight(freight);
        updateById(SR);
    }
}
