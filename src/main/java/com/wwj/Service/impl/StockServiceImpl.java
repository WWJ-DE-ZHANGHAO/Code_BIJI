package com.wwj.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Pojo.Stock;
import com.wwj.Mapper.StockMapper;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.IStockService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * <p>
 * 商品库存表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-07
 */
@Service
public class StockServiceImpl extends ServiceImpl<StockMapper, Stock> implements IStockService {
    //分页查询查询商品库存列表
    @Override
    public PageResult<Stock> queryStockPage(StockQuery stockQuery) {
        String keyword = stockQuery.getKeyword();
        Long productId = stockQuery.getProductId();
        //创建分页对象，按照创建时间降序排序
        Page<Stock> page = stockQuery.toMpPage("create_time", false);
        page = lambdaQuery()
                .like(StringUtils.hasText(keyword), Stock::getProductName, keyword)
                .eq(productId != null, Stock::getProductId, productId)
                .page(page);
        //封装结果并返回
        PageResult<Stock> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setPages(page.getPages());
        result.setList(page.getRecords());
        return result;
    }
}
