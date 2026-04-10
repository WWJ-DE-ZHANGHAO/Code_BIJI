package com.wwj.Service;

import com.wwj.Pojo.Stock;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;

/**
 * <p>
 * 商品库存表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-07
 */
public interface IStockService extends IService<Stock> {
    //分页查询商品库存列表
    PageResult<Stock> queryStockPage(StockQuery stockQuery);
}
