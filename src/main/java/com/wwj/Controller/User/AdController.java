package com.wwj.Controller.User;


import com.wwj.Pojo.Ad;
import com.wwj.Result.Result;
import com.wwj.Service.IAdService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * <p>
 * 广告位表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-29
 */
@RestController("userAdController")
@RequestMapping("/user/ad")
public class AdController {
    @Autowired
    private IAdService adService;
    //广告列表
    @GetMapping("/list")
    public Result<List<Ad>> list(){
        List<Ad> list = adService.list();
        return Result.success(list);
    }

}
