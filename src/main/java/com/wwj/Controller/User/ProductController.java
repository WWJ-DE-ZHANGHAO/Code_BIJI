package com.wwj.Controller.User;


import cn.hutool.core.bean.BeanUtil;
import com.wwj.Dto.UserBuyNow;
import com.wwj.Pojo.Comment;
import com.wwj.Pojo.Product;
import com.wwj.Query.ProductQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.ICommentService;
import com.wwj.Service.IProductService;
import com.wwj.Vo.UserBuy;
import com.wwj.Vo.UserBuyNowVo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * <p>
 * 商品/书籍表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("UserProductController")
@RequestMapping("/user/book")
@Slf4j
public class ProductController {
    @Autowired
    private IProductService productService;

    @Autowired
    private ICommentService commentService;
    //搜索框查询
    @GetMapping("/select")
    public Result<List<Product>> select(@RequestParam("keyword") String KWORD){//@RequestParam将前端的keyword参数映射到KWORD变量中
        //判断是否为空，必须是非空才能进行查询
        List<Product> list = productService.lambdaQuery().and(StringUtils.hasText(KWORD),
                wrapper -> wrapper//用lambda查询，将后续的条件进行拼接存放到第一个wrapper对象中
                .like(Product::getBookName, KWORD)
                .or()
                .like(Product::getAuthor, KWORD)).list();
        return Result.success(list);

    }

    @GetMapping("/list")
    //复杂条件分页查询
    public Result<PageResult<Product>> list(ProductQuery userProductQuery){
        PageResult<Product> productPageResult = productService.queryProductsPage(userProductQuery);
        return Result.success(productPageResult);
    }
    //热门推荐，默认按照销量排序取20个数据，后续改成高分好书，按照书籍的评分排序取20个数据如果评分相同，按照id降序排序，保证最新的商品优先展示
    @GetMapping("/hot")
    public Result<List<Product>> hot(){
        List<Product> list = productService.lambdaQuery()
                .orderByDesc(Product::getSalesCount)//按照销量降序排序，保证销量高的商品优先展示
                .orderByDesc(Product::getId)//如果销量相同，按照id降序排序，保证最新的商品优先展示
                .last("limit 20").list();
        return Result.success(list);
    }
    //根据id查询商品的详情
    @GetMapping("/{id}")
    public Result<Product> getById(@PathVariable("id") Long id){
        Product product = productService.getById(id);
        //计算该商品的评分
        List<Comment> list = commentService.lambdaQuery().eq(Comment::getProductId, id).list();
        BigDecimal score=BigDecimal.ZERO;
        //判断评价列表是否为空
        if (list.size()!=0&&!list.isEmpty()){
             score = list.stream().map(Comment::getScore).map(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(list.size()));
        }
        product.setScore(score);
        return Result.success(product);
    }
    //商品销量排行榜，按照销量降序排序，取前10个数据
    @GetMapping("/rank")
    public Result<List<Product>> rank(){
        List<Product> list = productService.lambdaQuery()
                .orderByDesc(Product::getSalesCount)//按照销量降序排序，保证销量高的商品优先展示
                .orderByDesc(Product::getId)//如果销量相同，按照id降序排序，保证最新的商品优先展示
                .last("limit 10").list();
        return Result.success(list);
    }


    //立即购买，直接根据商品id查询商品详情，前端展示后用户确认下单
    @PostMapping("/buy")
    public Result<UserBuyNowVo> buy(@RequestBody UserBuyNow userBuyNow){
        UserBuyNowVo userBuyNowVo = new UserBuyNowVo();
        Long id = userBuyNow.getProductId();
        Product product = productService.getById(id);
        UserBuy userBuy = BeanUtil.copyProperties(product, UserBuy.class);
        userBuy.setProductId( id);
        BigDecimal multiply = product.getPrice().multiply(BigDecimal.valueOf(userBuyNow.getQuantity()));
        int i = multiply.compareTo(BigDecimal.valueOf(199));
        //判断是否是特价商品，并且价格大于等于199.00，如果是，则将价格减去50
        if (product.getIsSpecial() == 1&&i>=0) {
            userBuyNowVo.setActivityDiscount(BigDecimal.valueOf(50));
        }
        userBuyNowVo.setOriginalTotal(multiply);
        userBuyNowVo.setBuy(userBuy);

        return Result.success(userBuyNowVo);
    }


    //特价专区商品列表
    @GetMapping("/special")
    public Result<List<Product>> special(){
        List<Product> list = productService.lambdaQuery()
                .eq(Product::getIsSpecial, 1)//只查询特价商品
                .orderByDesc(Product::getSalesCount)//按照销量降序排序，保证销量高的商品优先展示
                .orderByDesc(Product::getId)//如果销量相同，按照id降序排序，保证最新的商品优先展示
                 .list();
        return Result.success(list);
    }


    //新书列表

    @GetMapping("/new")
    public Result<List<Product>> newBook(){
        log.info("查询新书列表");
        LocalDateTime now = LocalDateTime.now();
        List<Product> list = productService.lambdaQuery()
                .ge(Product::getCreateTime, now.minusDays(30))//只查询最近30天新上架的商品
                .orderByDesc(Product::getCreateTime)//按照创建时间降序排序，保证最新的商品优先展示
                .orderByDesc(Product::getId)//如果创建时间相同，按照id降序排序，保证最新的商品优先展示
                .list();

        return Result.success(list);
    }

}
