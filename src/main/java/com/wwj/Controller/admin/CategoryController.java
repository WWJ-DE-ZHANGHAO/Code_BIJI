package com.wwj.Controller.admin;


import com.wwj.Pojo.Category;
import com.wwj.Result.Result;
import com.wwj.Service.ICategoryService;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * <p>
 * 商品分类表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("AdminCategoryController")
@RequestMapping("/admin/category")
@Api(tags = "管理端的商品分类")
public class CategoryController {
    @Autowired 
    private ICategoryService categoryService;

    //查询所有分类
    @GetMapping("/list")
    public Result<List<Category>> list() {
        List<Category> list = categoryService.list();
        return Result.success(list);
    }

    //添加分类
    @PostMapping("/add")
    public Result<String> add(@RequestBody Category category) {
        if (category.getName() == null){
            return Result.error("请输入分类名称");
        }
        categoryService.save(category);

        return Result.success();
    }

    //修改分类
    @PutMapping("/edit")
    public Result<String> edit(@RequestBody Category category) {
        if (category.getName() == null){
            return Result.error("请输入分类名称");
        }
        categoryService.updateById(category);
        return Result.success();
    }

    //隐藏/开启分类
    @PutMapping("/status/{id}")
    public Result<String> status(@PathVariable("id") Long id) {
        Category category = categoryService.getById(id);
        if (category.getStatus() == 1) {
            category.setStatus(0);
        } else {
            category.setStatus(1);
        }
        categoryService.updateById(category);
        return Result.success();
    }

    //根据id查询分类，进行查询回显
    @GetMapping("/{id}")
    public Result<Category> getById(@PathVariable("id") Long id) {
        Category category = categoryService.getById(id);
        return Result.success(category);
    }

    //删除分类
    @DeleteMapping("/delete/{id}")
    public Result<String> delete(@PathVariable("id") Long id) {
        categoryService.removeById(id);
        return Result.success();
    }


}
