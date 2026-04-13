package com.wwj.Controller.admin;


import cn.hutool.core.bean.BeanUtil;
import com.aliyun.oss.common.utils.StringUtils;
import com.wwj.Pojo.Order;
import com.wwj.Pojo.Product;
import com.wwj.Pojo.User;
import com.wwj.Result.Result;
import com.wwj.Service.ICategoryService;
import com.wwj.Service.IOrderService;
import com.wwj.Service.IProductService;
import com.wwj.Service.UserService;
import com.wwj.Vo.CategorySalesVo;
import com.wwj.Vo.ToptenVo;
import com.wwj.Vo.TurnoverVo;
import com.wwj.Vo.UserAnalysisVo;
import io.swagger.annotations.Api;
import net.sf.jsqlparser.statement.select.Top;
import org.springframework.beans.factory.ListableBeanFactory;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import javax.print.attribute.standard.RequestingUserName;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin/home")
@Api(value = "首页")
public class HomeController {

    @Autowired
    private IProductService productService;
   @Autowired
   private ICategoryService categoryService;
   
   @Autowired
   private IOrderService orderService;

   @Autowired
   private UserService userService;
    //销量前十的商品
    @GetMapping("/topTen")
    public Result<List<ToptenVo>> topTen(){
        List<Product> list = productService
                .lambdaQuery().orderByDesc(Product::getSalesCount).orderByDesc(Product::getId)
                .last("limit 10").list();
        List<ToptenVo> toptenVos = BeanUtil.copyToList(list, ToptenVo.class);

        return Result.success(toptenVos);
    }

    //统计各个商品类别的销量占比
    @GetMapping("/categorySales")
    public Result<List<CategorySalesVo>> categorySales(){
        List<CategorySalesVo>CS= categoryService.Sales();
        return Result.success(CS);

    }
    //统计营业额
    @GetMapping("/turnover")
    public Result<List<TurnoverVo>> turnover(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate){
        List<TurnoverVo> TV=new ArrayList<>();
        List<LocalDate> dateList = new ArrayList<>();
       dateList.add(startDate);
       while (startDate.isBefore(endDate)){
           dateList.add(startDate);
           startDate = startDate.plusDays(1);
       }
        for (LocalDate localDate : dateList) {
            LocalDateTime start = LocalDateTime.of(localDate, LocalTime.MIN);
            LocalDateTime end = LocalDateTime.of(localDate, LocalTime.MAX);
            BigDecimal turnover = orderService.lambdaQuery()
                    .ge(Order::getCheckoutTime, start)
                    .le(Order::getCheckoutTime, end)
                    .ge(Order::getOrderStatus, 2)
                    .le(Order::getOrderStatus, 4)
                    .list()
                    .stream().map(Order::getActualPay).reduce(BigDecimal.ZERO, BigDecimal::add);
            TurnoverVo turnoverVo = new TurnoverVo(localDate, turnover);
          TV.add(turnoverVo);
        }
        return Result.success(TV);
    }
    //统计用户分析新增用户和总用户数
    @GetMapping("/userAnalysis")
    public Result<List<UserAnalysisVo>> userAnalysis(@RequestParam LocalDate startDate, @RequestParam LocalDate endDate){
        List<UserAnalysisVo> UA=new ArrayList<>();
        List<LocalDate> dateList = new ArrayList<>();
        dateList.add(startDate);
        while (startDate.isBefore(endDate)){
            dateList.add(startDate);
            startDate = startDate.plusDays(1);
        }
        for (LocalDate localDate : dateList) {
            LocalDateTime start = LocalDateTime.of(localDate, LocalTime.MIN);
            LocalDateTime end = LocalDateTime.of(localDate, LocalTime.MAX);
            int newcount = userService.lambdaQuery()
                    .ge(User::getCreateTime, start)
                    .le(User::getCreateTime, end)
                    .list()
                    .size();
            int totalcount = userService.lambdaQuery()
                    .le(User::getCreateTime, end).list().size();

            UserAnalysisVo userAnalysisVo = new UserAnalysisVo(localDate, totalcount, newcount);
            UA.add(userAnalysisVo);
        }
        return Result.success(UA);
    }



}
