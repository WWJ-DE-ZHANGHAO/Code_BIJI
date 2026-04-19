package com.wwj.Query;

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
@ApiModel(description = "优惠券领取记录查询条件")
public class CouponRecordQuery extends  PageQuery{
    @ApiModelProperty("优惠券id")
    private Long couponId;
    @ApiModelProperty("用户id")
    private Long userId;
    @ApiModelProperty("领取状态 0-未使用 1-已使用 2-已过期")
    private Integer status;
}
