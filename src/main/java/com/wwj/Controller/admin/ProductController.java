package com.wwj.Controller.admin;


import com.wwj.Pojo.Comment;
import com.wwj.Pojo.Product;
import com.wwj.Query.ProductQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.IProductService;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

/**
 * <p>
 * 商品/书籍表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("AdminProductController")
@RequestMapping("/admin/book")
@Api(value = "管理端商品管理")
public class ProductController {
    @Autowired
    private IProductService productService;

    @GetMapping("/list")
    //复杂条件分页查询，点了重置按钮就会清空所有条件，会使用默认值
    public Result<PageResult<Product>> list( ProductQuery productQuery){
        PageResult<Product> productPageResult = productService.queryProductsPage(productQuery);
        return Result.success(productPageResult);
    }

    //根据id查询商品的详情
    @GetMapping("/{id}")
    public Result<Product> getById(@PathVariable("id") Long id){
        Product product = productService.getById(id);
        return Result.success(product);
    }
    //添加商品
    @PostMapping("/add")
    public Result add(@RequestBody Product product) throws IOException, SAXException {
        productService.ADD(product);
        return Result.success();
    }

    //修改商品信息

    @PutMapping("/update")
    public Result update(@RequestBody Product product){
        productService.Update(product);
        return Result.success();
    }

    //上/下架商品
    @PutMapping("/offSale/{id}")
    public Result offSale( @PathVariable Long id){
        Product product = productService.getById(id);
        if (product.getStatus()==1){
            product.setStatus(0);
        }
        else {
            product.setStatus(1);
        }
        productService.updateById(product);
        return Result.success();
    }


    //设否设为特价商品
    @PutMapping("/setSpecial/{id}")
    public Result setSpecial(@PathVariable Long id){
        Product product = productService.getById(id);
        if (product.getIsSpecial()==1){
            product.setIsSpecial(0);
        }
        else {
            product.setIsSpecial(1);
        }
        productService.updateById(product);
        return Result.success();
    }



}
