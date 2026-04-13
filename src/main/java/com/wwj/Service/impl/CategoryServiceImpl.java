package com.wwj.Service.impl;

import com.wwj.Pojo.Category;
import com.wwj.Mapper.CategoryMapper;
import com.wwj.Pojo.Product;
import com.wwj.Result.Result;
import com.wwj.Service.ICategoryService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Vo.CategorySalesVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    //统计各分类的销售额占比
     @Autowired
    private ProductServiceImpl productService;
    @Override
    public List<CategorySalesVo> Sales() {
        List<Product> productList = productService.list();
        //获取总销售额
        long totalCount = productList.stream()
                .mapToLong(Product::getSalesCount)
                .sum();

        //获取各分类的销售额
        Map<Long, Integer> categorySalesMap = productList.stream()
                .collect(Collectors.groupingBy(
                        Product::getCategoryId,
                        Collectors.summingInt(Product::getSalesCount)
                ));
        //获取所有分类信息，构建分类ID到分类对象的映射
        List<Category> allCategories = list();
        Map<Long, Category> categoryMap = allCategories.stream()
                .collect(Collectors.toMap(Category::getId, category -> category));
        //构建分类销售额占比信息
        List<CategorySalesVo> categorySalesVos = new ArrayList<>();
        //遍历分类销售额映射，构建分类销售额占比信息
        categorySalesMap.forEach((categoryId, salesCount) -> {
            Category category = categoryMap.get(categoryId);
            if (category != null) {
                BigDecimal saleRate = BigDecimal.valueOf(salesCount)
                        .divide(BigDecimal.valueOf(totalCount), 4, BigDecimal.ROUND_HALF_UP)//4位小数，四舍五入
                        .multiply(BigDecimal.valueOf(100));//转换成百分比

                CategorySalesVo vo = CategorySalesVo.builder()
                        .CategoryName(category.getName())
                        .SaleRate(saleRate)
                        .build();
                categorySalesVos.add(vo);
            }
        });
        return categorySalesVos;
    }
}
