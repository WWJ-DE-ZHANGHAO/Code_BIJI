package com.wwj.Controller.User;


import cn.hutool.core.bean.BeanUtil;
import com.wwj.Pojo.*;
import com.wwj.Query.ProductQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.*;
import com.wwj.Vo.UserBuy;
import com.wwj.Vo.UserBuyNowVo;
import com.wwj.Vo.UserCouponJudgmentVo;
import com.wwj.Vo.UserProductDetailVo;
import com.wwj.context.BaseContext;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static com.wwj.Constant.RedisConstants.PRODUCT_SHOP_KEY;
import static com.wwj.Constant.RedisConstants.PRODUCT_SHOP_STOCK;

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

    @Autowired
    private ITopicService topicService;

    @Autowired
    private ICategoryService categoryService;

    @Autowired
    private ICouponTemplateService couponTemplateService;

    @Autowired
    private IUserCouponRecordService couponRecordService;

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private RedisTemplate redisTemplate;

    @Autowired
    private StringRedisTemplate stringRedisTemplate;


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
    //热门推荐，默认按照销量排序取20个数据，后续
    @GetMapping("/hot")
    public Result<List<Product>> hot(){
        List<Product> list = productService.lambdaQuery()
                .orderByDesc(Product::getSalesCount)//按照销量降序排序，保证销量高的商品优先展示
                .orderByDesc(Product::getId)//如果销量相同，按照id降序排序，保证最新的商品优先展示
                .last("limit 20").list();
        return Result.success(list);
    }

    //高分好书，按照书籍的评分排序取20个数据如果评分相同，按照id降序排序，保证最新的商品优先展示
    @GetMapping("/high")
    public Result<List<Product>> high(){
        List<Product> list = productService.lambdaQuery()
                .orderByDesc(Product::getScore)//按照评分降序排序，保证评分高的商品优先展示
                .orderByDesc(Product::getId)//如果评分相同，按照id降序排序，保证最新的商品优先展示
                .last("limit 20").list();
        return Result.success(list);
    }

    //猜你喜欢，根据用户浏览记录，按照用户书籍点击次数降序排序，取前20个数据
    @GetMapping("/like")
    public Result<List<Product>> like(){
        return Result.success(null);
    }


    //根据id查询商品的详情
    @GetMapping("/{id}")
    public Result<UserProductDetailVo> getById(@PathVariable("id") Long id){
        Product product = productService.getById(id);
        //计算该商品的评分
        List<Comment> list = commentService.lambdaQuery()
                .eq(Comment::getProductId, id)
                .eq(Comment::getAuditStatus, 1)
                .list();
        BigDecimal score=BigDecimal.ZERO;
        //判断评价列表是否为空
        if (list.size()!=0&&!list.isEmpty()){
             score = list.stream().map(Comment::getScore).map(BigDecimal::valueOf)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(list.size()));
        }
        else{
            score = product.getScore();
        }
        product.setScore(score);
        UserProductDetailVo UPD = BeanUtil.copyProperties(product, UserProductDetailVo.class);
        //判断该商品是否有优惠券可领
        List<CouponTemplate> LC = couponTemplateService.lambdaQuery().eq(CouponTemplate::getScope, 2).or().eq(CouponTemplate::getScope, 3)
                .ge(CouponTemplate::getTotalStock,0)//优惠券库存数量大于0
                .list();
        Integer isSpecial = product.getIsSpecial();
        LocalDateTime createTime = product.getCreateTime();
        if(!LC.isEmpty()) {//优惠券列表不为空
            if (isSpecial == 1 && createTime.plusDays(30).isAfter(LocalDateTime.now())) {
                UPD.setCouponTemplates(LC);
            } else if (createTime.plusDays(30).isAfter(LocalDateTime.now()) && isSpecial == 0) {
                List<CouponTemplate> LC1 = LC.stream().filter(couponTemplate -> couponTemplate.getScope() == 3).collect(Collectors.toList());
                UPD.setCouponTemplates(LC1);
            } else if (isSpecial == 1 && createTime.plusDays(30).isBefore(LocalDateTime.now())) {
                List<CouponTemplate> LC2 = LC.stream().filter(couponTemplate -> couponTemplate.getScope() == 2).collect(Collectors.toList());
                UPD.setCouponTemplates(LC2);

            } else {
                UPD.setCouponTemplates(null);
            }
        }
        else {
            UPD.setCouponTemplates(null);
        }

        return Result.success(UPD);
    }


    //点击优惠券，查看优惠券是否已经到领取限制了，如果到了，弹窗里面的按钮就是已领取，且无法点击
    @PostMapping("/limit/{CouponTemplateId}")
    public Result<List<UserCouponJudgmentVo>> limit(@RequestBody List<Long> CS){
        Long userId = BaseContext.getCurrentId();
        List<UserCouponJudgmentVo> UC = new ArrayList<>();
        List<CouponTemplate> couponTemplates = couponTemplateService.listByIds(CS);
        for (CouponTemplate c : couponTemplates) {
            UserCouponJudgmentVo ucj = BeanUtil.copyProperties(c, UserCouponJudgmentVo.class);
            Integer limitPerUser = c.getLimitPerUser();
            List<UserCouponRecord> list = couponRecordService.lambdaQuery().eq(UserCouponRecord::getUserId, userId)
                    .eq(UserCouponRecord::getCouponId, c.getId()).list();
            if (list.size()==limitPerUser){
                ucj.setIsLimit(0);
             }
            else{
                ucj.setIsLimit(1);
                }
            UC.add(ucj);
        }
        return Result.success(UC);
    }



    //点击领取优惠券
    @PostMapping("/coupon/{CouponTemplateId}")
    public Result<String> coupon(@PathVariable Long CouponTemplateId){
        Long userId = BaseContext.getCurrentId();
        UserCouponRecord UCP = new UserCouponRecord();
        UCP.setUserId(userId);
        UCP.setCouponId(CouponTemplateId);
        UCP.setStatus(0);
        UCP.setSourceType(1);
        UCP.setReceiveTime(LocalDateTime.now());
        couponRecordService.save(UCP);
        return Result.success("领取成功");
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


   /* //立即购买，直接根据商品id查询商品详情，前端展示后用户确认下单
    @GetMapping("/buy")
    public Result<UserBuyNowVo> buy(
            @RequestParam Long productId,
            @RequestParam Integer quantity,
            @RequestParam String source){
        UserBuyNowVo userBuyNowVo = new UserBuyNowVo();
        Product product = productService.getById(productId);
        UserBuy userBuy = BeanUtil.copyProperties(product, UserBuy.class);
        userBuy.setProductId( productId);
        userBuy.setQuantity(quantity);
        BigDecimal multiply = product.getPrice().multiply(BigDecimal.valueOf(quantity));
        int i = multiply.compareTo(BigDecimal.valueOf(199));
        //判断是否是特价商品，并且价格大于等于199.00，如果是，则将价格减去50
        if (product.getIsSpecial() == 1&&i>=0) {
            userBuyNowVo.setActivityDiscount(BigDecimal.valueOf(50));
        }
        userBuyNowVo.setOriginalTotal(multiply);
        userBuyNowVo.setBuy(userBuy);

        return Result.success(userBuyNowVo);
    }*/
   //立即购买，直接根据商品id查询商品详情，前端展示后用户确认下单，进行高并发处理，使用Redis加Lua脚本，防止超卖
   @GetMapping("/buy")
   public Result<UserBuyNowVo> buy(
           @RequestParam Long productId,
           @RequestParam Integer quantity,
           @RequestParam String source){
       String s = stringRedisTemplate.opsForValue().get(PRODUCT_SHOP_STOCK + productId);
       int num = Integer.parseInt(s);
       if (num<=quantity){
           return Result.error("库存不足");
       }
       UserBuyNowVo userBuyNowVo = new UserBuyNowVo();
       Product product = productService.getById(productId);
       UserBuy userBuy = BeanUtil.copyProperties(product, UserBuy.class);
       userBuy.setProductId( productId);
       userBuy.setQuantity(quantity);
       BigDecimal multiply = product.getPrice().multiply(BigDecimal.valueOf(quantity));
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


    //专题书籍
    @GetMapping("/specialtopic")
    public Result<Map<Topic,List<Product>>> specialTopic(){
        List<Topic> TP = topicService.lambdaQuery().eq(Topic::getStatus, 1).list();
        Map<Topic,List<Product>> map = new HashMap<>();
        for (Topic topic : TP) {
            List<Product> list = productService.lambdaQuery()
                    .in(Product::getCategoryId, topic.getCategoryId())//只查询指定专题下的商品
                    .orderByDesc(Product::getSalesCount)//按照销量降序排序，保证销量高的商品优先展示
                    .orderByDesc(Product::getId)//如果销量相同，按照id降序排序，保证最新的商品优先展示
                    .list();
            map.put(topic,list);
        }

       return Result.success(map);
    }

}
