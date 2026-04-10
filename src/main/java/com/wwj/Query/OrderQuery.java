package com.wwj.Query;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "订单查询条件")
public class OrderQuery extends PageQuery{
    @ApiModelProperty("订单号")
    private String id;
    @ApiModelProperty("订单状态: 1待付款、2待发货、3已发货、4已完成、5已取消")
    private Integer status;
}
