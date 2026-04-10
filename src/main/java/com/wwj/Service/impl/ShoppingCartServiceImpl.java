package com.wwj.Service.impl;

import com.wwj.Pojo.Product;
import com.wwj.Pojo.ShoppingCart;
import com.wwj.Mapper.ShoppingCartMapper;
import com.wwj.Result.Result;
import com.wwj.Service.IProductService;
import com.wwj.Service.IShoppingCartService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Vo.UserBuy;
import com.wwj.Vo.UserCartVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 购物车表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@Service
public class ShoppingCartServiceImpl extends ServiceImpl<ShoppingCartMapper, ShoppingCart> implements IShoppingCartService {

    @Autowired
    private IProductService productService;
    @Override
    public UserCartVo Settlement(List<Long> ids) {
        List<ShoppingCart> shoppingCarts = listByIds(ids);

        // 一次性查询商品，避免在 stream 里重复查库
        List<Long> productIds = shoppingCarts.stream()
                .map(ShoppingCart::getProductId)
                .collect(Collectors.toList());
        Map<Long, Product> productMap = productService.listByIds(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

        // 转换为 UserBuyNowVo
        List<UserBuy> buyNowVos = shoppingCarts.stream()
                .map(cart -> UserBuy.builder()
                        .productId(cart.getProductId())
                        .quantity(cart.getNumber())
                        .price(cart.getPrice())
                        .bookName(cart.getProductName())
                        .coverUrl(cart.getProductImage())
                        .description(cart.getProductDescription())
                        .build())
                .collect(Collectors.toList());

        // 购物车原价总金额
        BigDecimal originalTotal = shoppingCarts.stream()
                .map(cart -> cart.getPrice().multiply(BigDecimal.valueOf(cart.getNumber())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 仅统计特价商品总额（单价 * 数量）
        BigDecimal specialTotalAmount = shoppingCarts.stream()
                .filter(cart -> {
                    Product product = productMap.get(cart.getProductId());
                    return product != null && Integer.valueOf(1).equals(product.getIsSpecial());
                })
                .map(cart -> cart.getPrice().multiply(BigDecimal.valueOf(cart.getNumber())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 判断特价商品总额是否大于 199，可触发优惠
        BigDecimal activityDiscount = specialTotalAmount.compareTo(BigDecimal.valueOf(199)) > 0
                ? BigDecimal.valueOf(50)
                : null;

        UserCartVo userCartVo = new UserCartVo();
        userCartVo.setShoppingCartIds(ids);
        userCartVo.setBuyNows(buyNowVos);
        userCartVo.setOriginalTotal(originalTotal);
        userCartVo.setActivityDiscount(activityDiscount);
        return userCartVo;
    }
}
