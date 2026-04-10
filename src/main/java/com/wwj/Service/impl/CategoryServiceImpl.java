package com.wwj.Service.impl;

import com.wwj.Pojo.Category;
import com.wwj.Mapper.CategoryMapper;
import com.wwj.Service.ICategoryService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 商品分类表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements ICategoryService {

}
