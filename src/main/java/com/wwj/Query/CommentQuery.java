package com.wwj.Query;

import io.swagger.annotations.ApiModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(description = "评价查询条件")
public class CommentQuery extends PageQuery{
    private String  ProductName;
    private String  UserName;
    private Integer Score;
    private Integer AuditStatus;
}
