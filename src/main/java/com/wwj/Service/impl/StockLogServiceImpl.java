package com.wwj.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Pojo.Stock;
import com.wwj.Pojo.StockLog;
import com.wwj.Mapper.StockLogMapper;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.IStockLogService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * <p>
 * 库存变动日志表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-07
 */
@Service
public class StockLogServiceImpl extends ServiceImpl<StockLogMapper, StockLog> implements IStockLogService {
    //分页查询查询库存变动日志列表
    @Override
    public PageResult<StockLog> queryStockLogPage(StockQuery stockQuery) {
        String keyword = stockQuery.getKeyword();
        Long productId = stockQuery.getProductId();
        //创建分页对象，按照创建时间降序排序
        Page<StockLog> page = stockQuery.toMpPage("create_time", false);
        page = lambdaQuery()
                .like(StringUtils.hasText(keyword), StockLog::getProductName, keyword)
                .eq(productId != null, StockLog::getProductId, productId)
                .page(page);
        //封装结果并返回
        PageResult<StockLog> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setPages(page.getPages());
        result.setList(page.getRecords());
        return result;
    }
}
