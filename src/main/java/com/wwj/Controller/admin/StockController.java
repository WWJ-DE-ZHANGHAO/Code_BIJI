package com.wwj.Controller.admin;


import cn.hutool.core.bean.BeanUtil;
import com.wwj.Pojo.Stock;
import com.wwj.Pojo.StockLog;
import com.wwj.Query.StockQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.AdminService;
import com.wwj.Service.IStockLogService;
import com.wwj.Service.IStockService;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * <p>
 * 商品库存表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-07
 */
@RestController
@RequestMapping("/admin/stock")
@Api(tags = "管理端商品库存表")
public class StockController {
    @Autowired
    private IStockService stockService;

    @Autowired
    private IStockLogService stockLogService;

    @Autowired
    private AdminService adminService;

    //分页查询查询商品库存列表
    @GetMapping("/list")
    public Result<PageResult<Stock>> list(@RequestBody StockQuery stockQuery) {
        PageResult<Stock> result = stockService.queryStockPage(stockQuery);
        return Result.success(result);
    }

    //增加商品库存
    @PutMapping("/add/")
    public Result add(@RequestParam Long id, @RequestParam Integer num) {
        Long adminId = BaseContext.getCurrentId();
        Stock SS = stockService.getById(id);
        SS.setStockNum(SS.getStockNum() + num);
        SS.setSaleStock(SS.getSaleStock() + num);
        stockService.updateById(SS);
        //增加库存日志
        StockLog SL = BeanUtil.copyProperties(SS, StockLog.class);
        SL.setAdminId(adminId);
        SL.setChangeNum(+num);
        SL.setAdminUsername(adminService.getById(adminId).getUsername());
        stockLogService.save(SL);
        return Result.success();
    }
    //减少商品库存

    @PutMapping("/reduce/")
    public Result reduce(@RequestParam Long id, @RequestParam Integer num) {
        Long adminId = BaseContext.getCurrentId();
        Stock SS = stockService.getById(id);
        SS.setStockNum(SS.getStockNum() - num);
        SS.setSaleStock(SS.getSaleStock() - num);
        stockService.updateById(SS);
        //增加库存日志
        StockLog SL = BeanUtil.copyProperties(SS, StockLog.class);
        SL.setAdminId(adminId);
        SL.setChangeNum(-num);
        SL.setAdminUsername(adminService.getById(adminId).getUsername());
        stockLogService.save(SL);
        return Result.success();
    }

}