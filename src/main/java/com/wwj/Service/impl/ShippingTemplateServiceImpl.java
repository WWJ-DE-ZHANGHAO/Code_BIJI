package com.wwj.Service.impl;

import com.wwj.Exception.BaseException;
import com.wwj.Pojo.ShippingTemplate;
import com.wwj.Mapper.ShippingTemplateMapper;
import com.wwj.Service.IShippingTemplateService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.context.BaseContext;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 运费模板表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@Service
public class ShippingTemplateServiceImpl extends ServiceImpl<ShippingTemplateMapper, ShippingTemplate> implements IShippingTemplateService {
    //更新运费模板
    @Override
    public void Update(ShippingTemplate shippingTemplate) {//此时这个对象是一个只有三个字段有值的 ，id，name，isFree
        Long adminId = BaseContext.getCurrentId();
        String name = shippingTemplate.getName();
        Integer isFree = shippingTemplate.getIsFree();
        Long id = shippingTemplate.getId();
        if (name.isBlank()||isFree==null){
                throw new BaseException("请完善运费模板信息");
        }
        ShippingTemplate SP = lambdaQuery().eq(ShippingTemplate::getId, id).one();
        if ((!name.equals(SP.getName()))&&(lambdaQuery().eq(ShippingTemplate::getName, name).one()!=null)){
            throw new BaseException("运费模板已存在");
        }
        SP.setName(name);
        SP.setIsFree(isFree);
        updateById(SP);



    }
   //添加运费模板
    @Override
    public void add(ShippingTemplate shippingTemplate) {
        Long adminId = BaseContext.getCurrentId();
        String name = shippingTemplate.getName();
        Integer isFree = shippingTemplate.getIsFree();
        if (name.isBlank() || isFree == null) {
            throw new BaseException("请完善运费模板信息");
        }
        ShippingTemplate one = lambdaQuery().eq(ShippingTemplate::getName, name).one();
        if (one != null) {
            throw new BaseException("运费模板已存在");
        }
        save(shippingTemplate);
    }
}
