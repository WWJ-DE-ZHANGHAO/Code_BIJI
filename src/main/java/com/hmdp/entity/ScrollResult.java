package com.hmdp.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ScrollResult {
    private List<?> list;//列表数据
    private Long minTime;//时间戳
    private Integer offset;//偏移量
}
