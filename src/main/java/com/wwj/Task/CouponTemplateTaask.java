package com.wwj.Task;

import com.wwj.Pojo.CouponTemplate;
import com.wwj.Pojo.User;
import com.wwj.Pojo.UserCouponRecord;
import com.wwj.Service.ICouponTemplateService;
import com.wwj.Service.IMemberLevelService;
import com.wwj.Service.IUserCouponRecordService;
import com.wwj.Service.UserService;
import org.jetbrains.annotations.Async;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Component
public class CouponTemplateTaask {

    @Autowired
    private IUserCouponRecordService userCouponRecordService;

    @Autowired
    private UserService userService;

    @Autowired
    private ICouponTemplateService couponTemplateService;

    @Autowired
    private IMemberLevelService memberLevelService;
    //每月20日给会员发送优惠券
    @Scheduled(cron = "0 0 0 20 * *")
    public void checkCouponTemplate(){

        List<CouponTemplate> CT = couponTemplateService.lambdaQuery().eq(CouponTemplate::getSource, 1).list();
        List<User> list = userService.list();
        List<UserCouponRecord> collect = list.stream().filter(user -> user.getMemberLevelId() == 1).flatMap(user -> {//将优惠券的集合转换为流
            Long memberLevel = user.getMemberLevelId();
            Integer couponQuota = memberLevelService.getById(memberLevel).getCouponQuota();
            int repeatCount = couponQuota;
            return Stream.generate(() -> CT)// 用于生成无限流，可以生成很多个优惠券流
                    .limit(repeatCount)// 限制生成多少个优惠券流。(如果有两个就相当于要在这个user对象下面要有两个优惠券集合）
                    .flatMap(List::stream)//将每个优惠券流(集合)单独转换为流，然后将所有优惠券流合并成一个流，
                    .map(couponTemplate -> {//将合并的流中的每一个优惠券对象映射为UserCouponRecord对象
                        UserCouponRecord record = new UserCouponRecord();
                        record.setUserId(user.getId());
                        record.setCouponId(couponTemplate.getId());
                        record.setStatus(0);
                        record.setSourceType(2);
                        record.setReceiveTime(LocalDateTime.now());
                        return record;
                    });

        }).collect(Collectors.toList());
        userCouponRecordService.saveBatch(collect);//批量保存
    }
}
