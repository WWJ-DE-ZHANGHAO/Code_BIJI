package com.wwj.Pojo;

import java.math.BigDecimal;

import com.baomidou.mybatisplus.annotation.*;

import java.text.DecimalFormat;
import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.experimental.Accessors;

/**
 * <p>
 * 商品/书籍表
 * </p>
 *
 * @author 吴哥
 * @since 2026-03-31
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("product")
@ApiModel(value="Product对象", description="商品/书籍表")
public class Product implements Serializable {

    private static final long serialVersionUID = 1L;
    //前端没有分类类名的信息，此时通过多表查询到分类的名称，再封装给PtoductVO对象，返回给前端展示就行了，
    //用MP，getById方法查询分类表，获取分类名称，封装到VO对象中返回给前端展示就行了
    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "分类ID")
    @NotNull(message = "分类ID不能为空")
    private Long categoryId;

    @ApiModelProperty(value = "书籍名称")
    @NotBlank(message = "书籍名称不能为空")
    private String bookName;

    @ApiModelProperty(value = "作者")
    @NotBlank(message = "作者名不能为空")
    private String author;

    @ApiModelProperty(value = "销售价格")
    @NotNull(message = "销售价格不能为空")
    private BigDecimal price;

    @ApiModelProperty(value = "库存数量")
    private Integer stock=0;

    @ApiModelProperty(value = "封面图片URL")
    @NotBlank(message = "封面图片URL不能为空")
    private String coverUrl;

    @ApiModelProperty(value = "书籍介绍视频URL")
    private String videoUrl;

    @ApiModelProperty(value = "书籍简介(短描述)")
    @NotBlank(message = "书籍简介(短描述)不能为空")
    private String description;

    @ApiModelProperty(value = "书籍详情(富文本内容)")
    private String detailContent;

    @ApiModelProperty(value = "销量")
    private Integer salesCount=0;

    @ApiModelProperty(value = "上架状态 (0:下架 1:上架)")
    private Integer status=1;

    @ApiModelProperty(value = "评分")
    @NotNull(message = "评分不能为空")
    private BigDecimal score;

    @ApiModelProperty(value = "是否是特价书籍 (0:否 1:是)")
    @TableField("is_special")
    private Integer isSpecial=0;

    @ApiModelProperty(value = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @ApiModelProperty(value = "更新时间")
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

}
