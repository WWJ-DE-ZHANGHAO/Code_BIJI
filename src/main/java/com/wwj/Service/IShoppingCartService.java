package com.wwj.Service;

import com.wwj.Dto.UsersSaveShoppingCartDto;
import com.wwj.Pojo.ShoppingCart;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Vo.UserCartVo;

import java.util.List;

/**
 * <p>
 * 购物车表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
public interface IShoppingCartService extends IService<ShoppingCart> {
    //结算购物车
    UserCartVo Settlement(List<Long> ids);
    //添加购物车
    void Add(UsersSaveShoppingCartDto usersSaveShoppingCartDto);
}
