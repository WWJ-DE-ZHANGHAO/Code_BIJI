package com.hmdp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.hmdp.dto.Result;
import com.hmdp.entity.RedisData;
import com.hmdp.entity.Shop;
import com.hmdp.mapper.ShopMapper;
import com.hmdp.service.IShopService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmdp.utils.SystemConstants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

import static com.hmdp.utils.RedisConstants.CACHE_SHOP_KEY;
import static com.hmdp.utils.RedisConstants.SHOP_GEO_KEY;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2021-12-22
 */
@Service
public class ShopServiceImpl extends ServiceImpl<ShopMapper, Shop> implements IShopService {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Override
    public Result queryById(Long id) {
        //查询Redis缓存
        StringRedisTemplate stringRedisTemplate = new StringRedisTemplate();
        String shop = stringRedisTemplate.opsForValue().get("shop:" + id);
        //判断是否存在，存在，返回
        if(shop!=null){
            return Result.ok(shop);
        }
        //不存在，根据id查询数据库
        Shop S = query().eq("id", id).one();
        Result result =Result.ok(S);
        //依旧不存在，返回错误
        if(result== null){
            return Result.fail("店铺不存在");
        }
        //存在将查询到的数据返回，并存入Redis
        stringRedisTemplate.opsForValue().set("shop:"+id,result.getData().toString());
        return result;

    }
    //复杂条件的分页查询
    @Override
    public Result queryShopByType(Integer typeId, Integer current, Double x, Double y) {
        //判断是否需要根据坐标查询
        if(x==null||y==null){
            // 不需要坐标查询，按数据库查询
            Page<Shop> page =query()
                    .eq("type_id", typeId)
                    .page(new Page<>(current, SystemConstants.DEFAULT_PAGE_SIZE));
            // 返回数据
            return Result.ok(page.getRecords());
        }
        //需要的话，计算分页参数
        int from = (current-1)*SystemConstants.DEFAULT_PAGE_SIZE;
        int end = current*SystemConstants.DEFAULT_PAGE_SIZE;
        //查询Redis，按照距离排序、分页、结果要包含distance字段,因为这个limit只能限制查到哪结束，不能限制从哪开始，锁要从查询的结果中再截取
        String key = SHOP_GEO_KEY+typeId;
        GeoResults<RedisGeoCommands.GeoLocation<String>> search = stringRedisTemplate.opsForGeo()
                .search(key, GeoReference.fromCoordinate(x, y), new Distance(5000),//默认单位是 米
                RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().includeDistance().limit(end));
        //GeoResults 是一个包含多个 GeoResult 的集合，每个 GeoResult 包含：
         //content就是GeoLocation<String>,就是店铺传入Redis中的数据包含member(店铺Id)、point(经纬度)
        //距离用户的距离（distance）
        //GeoResults只算是一个包装盒，里面是包含了一个List<GeoResult>的集合

        if (search==null){
            return Result.ok(Collections.emptyList());
        }
        //解析出id
        List<GeoResult<RedisGeoCommands.GeoLocation<String>>> content = search.getContent();//通过getContent()方法获取实际的List<GeoResult>集合
        //截取集合,利用skip方法表示跳过这个集合中的前from个元素，然后返回剩余的元素
        List<Long> ids = new ArrayList<>(content.size());//创建一个集合，用于存储店铺Id
        Map<String,Distance> distances = new HashMap<>(content.size());//根据店铺Id和距离进行一一映射
        //注意！！如果返回的集合的长度小于from，则不要跳过直接返回空
        if (content.size()<from){
            return Result.ok(Collections.emptyList());
        }
        content.stream().skip( from).forEach(
               geoResult -> {
                   //获取店铺Id
                   String shopId = geoResult.getContent().getName();
                   ids.add(Long.valueOf(shopId));
                   //查询距离
                   Distance distance = geoResult.getDistance();
                   //将店铺数据写入Redis
                   distances.put(shopId,distance);
               }
        );
        //根据id查询shop
        String idsStr = StrUtil.join(",", ids);
        List<Shop> SP= query().in("id", ids).last("ORDER BY FIELD(id," + idsStr + ")").list();
        for (Shop shop : SP) {
            shop.setDistance(distances.get(shop.getId().toString()).getValue());//Shop类中添加了distance属性
        }
        return Result.ok(SP);

    }

    //添加热点Key方法
    public void saveShopRedis(Long id,Long expireSeconds) throws InterruptedException {
         Shop shop = getById( id);
         Thread.sleep(200);
        RedisData redisData = new RedisData();
        redisData.setData(shop);
        redisData.setExpireTime(LocalDateTime.now().plusSeconds(expireSeconds));
        stringRedisTemplate.opsForValue().set(CACHE_SHOP_KEY+id, JSONUtil.toJsonStr(redisData));
    }
}
