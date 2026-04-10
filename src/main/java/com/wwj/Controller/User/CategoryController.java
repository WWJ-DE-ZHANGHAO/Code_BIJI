package com.wwj.Controller.User;


import com.wwj.Pojo.Category;
import com.wwj.Result.Result;
import com.wwj.Service.ICategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * <p>
 * 商品分类表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("UserCategoryController")
@RequestMapping("/user/category")
public class CategoryController {
    @Autowired 
    private ICategoryService categoryService;
    
    //分类列表
    @GetMapping("/list")
    public Result<List<Category>> list(){
        List<Category> list = categoryService.lambdaQuery().eq(Category::getStatus, 1).list();
        return Result.success(list);
    }

}
