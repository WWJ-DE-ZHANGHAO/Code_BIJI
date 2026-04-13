package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CategorySalesVo {
    private String CategoryName;//类别名称
    private BigDecimal SaleRate;//销量占比
}
