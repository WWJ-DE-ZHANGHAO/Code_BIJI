package com.wwj.Controller.admin;


import com.wwj.Pojo.Ad;
import com.wwj.Result.Result;
import com.wwj.Service.IAdService;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * <p>
 * 广告位表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("AdminAdController")
@RequestMapping("/admin/ad")
@Api(tags = "管理端广告管理")
public class AdController {
    @Autowired
    private IAdService adService;


    //进入广告页面就发送的请求，查看广告列表
    @GetMapping("/list")
    public Result<List<Ad>> list(){
        List<Ad> list = adService.list();
        return Result.success(list);
    }
   //新增广告
    @PostMapping("/add")
    public Result add(@RequestBody  Ad ad){
        String URL = ad.getTargetUrl();
        String imgUrl = ad.getImgUrl();
        if (imgUrl == null || URL == null) {
           return Result.error("图片链接和跳转链接不能为空");
       }
        Ad one = adService.lambdaQuery().eq(Ad::getImgUrl, imgUrl).one();
        if (one != null) {
            return Result.error("该广告图片已存在");
        }
        Ad one1 = adService.lambdaQuery().eq(Ad::getTargetUrl, URL).one();
        if (one1 != null) {
            return Result.error("该广告链接已存在");
        }
        adService.save(ad);
       return Result.success();
    }

    //编辑广告
    @PutMapping("/edit")
    public Result edit(@RequestBody  Ad ad){
        String URL = ad.getTargetUrl();
        String imgUrl = ad.getImgUrl();
        Long id = ad.getId();
        if (imgUrl== null || URL == null) {
            return Result.error("图片链接和跳转链接不能为空");
        }
        if (!imgUrl.equals(adService.lambdaQuery().eq(Ad::getId, id).one().getImgUrl())&&(adService.lambdaQuery().eq(Ad::getImgUrl, imgUrl).one())!=null) {
            return Result.error("该广告图片已存在");
        }
        if (!URL.equals(adService.lambdaQuery().eq(Ad::getId, id).one().getTargetUrl())&&(adService.lambdaQuery().eq(Ad::getTargetUrl, URL).one())!=null) {
            return Result.error("该广告链接已存在");
        }
        adService.updateById(ad);
        return Result.success();
    }

    //根据id查询回显广告详情
    @GetMapping("/{id}")
    public Result<Ad> getById(@PathVariable("id") Long id){
        Ad ad = adService.getById(id);
        return Result.success(ad);
    }


    //删除广告
    @DeleteMapping("/delete")
    public Result delete(@RequestParam("id") Long id){
        boolean b = adService.removeById(id);
        return Result.success();
    }

}
