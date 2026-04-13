package com.wwj.Controller.admin;


import com.wwj.Pojo.StockLog;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.IStockLogService;
import com.wwj.Service.IStockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * <p>
 * 库存变动日志表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-09
 */
@RestController
@RequestMapping("admin/stock-log")
public class StockLogController {

    @Autowired
    private IStockLogService stockLogService;
    @Autowired
    private IStockService stockService;

    //分页查询库存变动日志列表
    @GetMapping("/list")
    public Result<PageResult<StockLog>> list( StockQuery stockQuery) {
        PageResult<StockLog> pageResult = stockLogService.queryStockLogPage(stockQuery);

        return Result.success(pageResult);
    }

    //删除库存变动日志
    @DeleteMapping("/delete/{id}")
    public Result delete(@PathVariable Long id) {
        stockLogService.removeById(id);
        return Result.success();
    }

}