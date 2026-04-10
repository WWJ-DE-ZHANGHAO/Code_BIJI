package com.wwj.Service;

import com.wwj.Pojo.StockLog;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;

/**
 * <p>
 * 库存变动日志表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-07
 */
public interface IStockLogService extends IService<StockLog> {
    //分页查询库存变动日志列表
    PageResult<StockLog> queryStockLogPage(StockQuery stockQuery);
}
