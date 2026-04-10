package com.wwj.Controller.User;


import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wwj.Dto.UsersSaveShoppingCartDto;
import com.wwj.Pojo.Product;
import com.wwj.Pojo.ShoppingCart;
import com.wwj.Result.Result;
import com.wwj.Service.IProductService;
import com.wwj.Service.IShoppingCartService;
import com.wwj.Vo.UserBuy;
import com.wwj.Vo.UserCartVo;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 购物车表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@RestController
@RequestMapping("/user/shopping-cart")
@Api(value = "用户购物车管理")
public class ShoppingCartController {
    @Autowired
    private IShoppingCartService shoppingCartService;

    @Autowired
    private IProductService productService;

    //添加购物车
    @PostMapping("/save")
    public Result save(@RequestBody UsersSaveShoppingCartDto usersSaveShoppingCartDto){
        Long id = usersSaveShoppingCartDto.getProductId();
        Integer number = usersSaveShoppingCartDto.getNumber();
        //先判断该用户的购物车中是否有已经有该商品，有的话就是更新，没有的话就是添加
        Long userId = BaseContext.getCurrentId();
        ShoppingCart one = shoppingCartService.lambdaQuery().eq(ShoppingCart::getUserId, userId).eq(ShoppingCart::getProductId, id).one();
        if (one!=null){
            one.setNumber(one.getNumber()+number);
            shoppingCartService.updateById(one);
        }else {
            ShoppingCart shoppingCart = new ShoppingCart();
            shoppingCart.setUserId(userId);
            shoppingCart.setProductId(id);
            shoppingCart.setNumber(number);
            shoppingCart.setProductName(productService.getById(id).getBookName());
            shoppingCart.setProductImage(productService.getById(id).getCoverUrl());
            shoppingCart.setPrice(productService.getById(id).getPrice());
            shoppingCart.setProductDescription(productService.getById(id).getDescription());

            shoppingCartService.save(shoppingCart);
        }
        return Result.success();
    }

    //查询购物车
    @GetMapping("/list")
    public Result<List<ShoppingCart>>list(){
        Long userId = BaseContext.getCurrentId();
        List<ShoppingCart> list = shoppingCartService.lambdaQuery().eq(ShoppingCart::getUserId, userId).list();
        return Result.success(list);
    }

    //清空购物车
    @DeleteMapping("/clean")
    public Result clean(){
        Long userId = BaseContext.getCurrentId();
        //最优解
        shoppingCartService.remove(new LambdaQueryWrapper<ShoppingCart>()
                .eq(ShoppingCart::getUserId, userId));
        //生成的sql语句:DELETE FROM shopping_cart WHERE user_id = 100
        return Result.success();
    }

    //删除购物车中的某个商品
    @DeleteMapping("/delete")
    public Result delete(@RequestParam("Id") Long Id){
        Long userId = BaseContext.getCurrentId();
            shoppingCartService.removeById( Id);
        return Result.success();
    }

    //批量删除购物车中的某些商品
    @DeleteMapping("/deleteBatch")
    public Result deleteBatch(@RequestParam("ids") List<Long> ids){
         shoppingCartService.removeByIds(ids);
        return Result.success();
    }

    //修改购物车中的某个商品数量
    @PutMapping("/update")
    public Result update(@RequestParam("id") Long id, @RequestParam("number") Integer number){
        if (id == null || number == null || number <= 0) {
            return Result.error("参数错误");
        }

        Long userId = BaseContext.getCurrentId();

        // 同时验证 ID 存在性和用户所有权
        boolean updated = shoppingCartService.lambdaUpdate()
                .eq(ShoppingCart::getId, id)
                .eq(ShoppingCart::getUserId, userId)  // 确保只更新当前用户的记录
                .set(ShoppingCart::getNumber, number)
                .update();

        if (!updated) {
            return Result.error("购物车记录不存在或无权操作");
        }

        return Result.success();
    }

    //结算购物车，将购物车中的商品添加到订单详情表中
    @PostMapping("/checkout")
        public Result<UserCartVo> checkout(@RequestParam("shippingAddressIds") List<Long>ids){
        UserCartVo settlement = shoppingCartService.Settlement(ids);
        return Result.success(settlement);

    }



}
