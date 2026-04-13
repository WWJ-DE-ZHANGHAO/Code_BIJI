package com.wwj.Message;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderRemindMessage {
    private String orderId;//订单号
    private Long userId;//催单用户
    private String content;//消息内容
    private LocalDateTime createTime;//消息创建时间

}
