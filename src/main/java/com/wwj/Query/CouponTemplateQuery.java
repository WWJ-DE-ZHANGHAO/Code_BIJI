package com.wwj.Query;

import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(value = "优惠券查询参数")
public class CouponTemplateQuery extends  PageQuery {
    @ApiModelProperty(value = "优惠券关键词")
    private String keyword;
    @ApiModelProperty(value ="优惠券类型")
    private Integer type;
    @ApiModelProperty(value ="使用范围")
    private Integer scope;
    @ApiModelProperty(value = "优惠券来源")
    private Integer source;
}
