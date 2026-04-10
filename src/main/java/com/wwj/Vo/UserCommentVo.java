package com.wwj.Vo;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.wwj.Pojo.Comment;
import com.wwj.Pojo.Product;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@ApiModel(description = "查看书籍详情返回的评价内容")
public class UserCommentVo {
    @ApiModelProperty(value = "头像URL")
    private String avatar;

    @ApiModelProperty(value = "用户名")
    private String username;

    @ApiModelProperty(value = "用户ID")
    private Long userId;

    @ApiModelProperty(value = "评分 1-5分")
    private Integer score;

    @ApiModelProperty(value = "评价内容")
    private String content;

    @ApiModelProperty(value = "评价图片")
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<String> images;

    @ApiModelProperty(value = "评价时间")
    private LocalDateTime createTime;

    @ApiModelProperty(value = "商家回复内容")
    private String replyContent;

    @ApiModelProperty(value = "商家回复时间")
    private LocalDateTime replyTime;
}
