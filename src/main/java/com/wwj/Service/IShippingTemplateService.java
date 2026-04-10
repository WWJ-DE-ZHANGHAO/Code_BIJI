package com.wwj.Service;

import com.wwj.Pojo.ShippingTemplate;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 运费模板表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
public interface IShippingTemplateService extends IService<ShippingTemplate> {
    //修改运费模板
    void Update(ShippingTemplate shippingTemplate);
     //添加运费模板
    void add(ShippingTemplate shippingTemplate);
}
