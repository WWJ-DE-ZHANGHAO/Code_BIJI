package com.wwj.Service;

import com.wwj.Pojo.Product;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Query.ProductQuery;
import com.wwj.Result.PageResult;
import org.xml.sax.SAXException;

import java.io.IOException;

/**
 * <p>
 * 商品/书籍表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
public interface IProductService extends IService<Product> {
    //复杂条件分页查询
    PageResult<Product>  queryProductsPage(ProductQuery userProductQuery);
    //添加商品
    void ADD(Product product) throws IOException, SAXException;
    //编辑商品
    void Update(Product product);
}
