package com.wwj.Query;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(description = "用户商品查询条件")
public class ProductQuery extends PageQuery {
    @ApiModelProperty("商品类目")
    private Integer categoryId=10;//默认为10，表示查询所有类目

    @ApiModelProperty("最低价格")
    private Integer minBalance=0;//默认为最小值为0

    @ApiModelProperty("最高余额")
    private Integer maxBalance=Integer.MAX_VALUE;//默认最大值为Integer.MAX_VALUE

    @ApiModelProperty("关键字")
    private String keyword;

    private  Integer status=1;//默认为1，表示查询上架的商品
}
