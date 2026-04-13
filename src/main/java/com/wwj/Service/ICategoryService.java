package com.wwj.Service;

import com.wwj.Pojo.Category;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Vo.CategorySalesVo;

import java.util.List;

/**
 * <p>
 * 商品分类表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
public interface ICategoryService extends IService<Category> {

    List<CategorySalesVo> Sales();
}
