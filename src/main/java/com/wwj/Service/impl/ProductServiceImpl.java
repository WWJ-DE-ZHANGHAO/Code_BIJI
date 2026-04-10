package com.wwj.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Exception.ProductInformationIsIncompleteException;
import com.wwj.Pojo.Product;
import com.wwj.Mapper.ProductMapper;
import com.wwj.Query.ProductQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.IProductService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import org.xml.sax.SAXException;

import javax.xml.transform.Source;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * <p>
 * 商品/书籍表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@Service
public class ProductServiceImpl extends ServiceImpl<ProductMapper, Product> implements IProductService {


    @Autowired
    private Validator validator;
    //复杂条件分页查询
    @Override
    public PageResult<Product> queryProductsPage(ProductQuery productQuery) {
        Integer max = productQuery.getMaxBalance();
        Integer min = productQuery.getMinBalance();
        Integer categoryId = productQuery.getCategoryId();
        String keyword = productQuery.getKeyword();
        Integer PS = productQuery.getStatus();

        if (min> max){
            Integer temp = max;
            max = min;
            min = temp;
        }

        //构建分页条件构建排序条件，如果前端有排序字段，则用前端的排序字段，否则用默认的排序字段即价格降序
        Page<Product> page = productQuery.toMpPage("id", true);
        boolean useKeyword =  StringUtils.hasText(keyword);

        //执行分页查询
                if (categoryId == 10) {
                    page = lambdaQuery()
                            .ge(Product::getPrice, min)
                            .le(Product::getPrice, max)
                            .eq(PS!=null,Product::getStatus, PS)
                            .like(useKeyword, Product::getBookName, keyword)
                            .page(page);
                } else  {
                    page = lambdaQuery().eq(Product::getCategoryId, productQuery.getCategoryId())
                            .ge(Product::getPrice, min)
                            .le(Product::getPrice, max)
                            .eq(PS!=null,Product::getStatus, PS)
                            .like(useKeyword, Product::getBookName, keyword)
                            .page(page);
                }


        //封装结果并返回
        PageResult<Product> result = new PageResult<>();
        result.setList(page.getRecords());
        result.setPages(page.getPages());
        result.setTotal(page.getTotal());
        return result;


    }
    //添加商品
    @Override
    public void ADD(Product product) throws IOException, SAXException {
        Set<ConstraintViolation<Product>> violations = validator.validate(product);
        if (!violations.isEmpty()) {
            String allMessages = violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .collect(Collectors.joining("; "));
            throw new ProductInformationIsIncompleteException(allMessages);
        }
        save(product);
    }
    //修改商品信息
    @Override
    public void Update(Product product) {
        Set<ConstraintViolation<Product>> violations = validator.validate(product);
        if (!violations.isEmpty()) {
            String allMessages = violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .collect(Collectors.joining("; "));
            throw new ProductInformationIsIncompleteException(allMessages);
        }
        updateById(product);
    }


}
