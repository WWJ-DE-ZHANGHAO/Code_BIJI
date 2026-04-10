package com.wwj.Pojo;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import java.time.LocalDateTime;
import java.io.Serializable;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.Accessors;

/**
 * <p>
 * 库存变动日志表
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-08
 */
@Data
@EqualsAndHashCode(callSuper = false)
@Accessors(chain = true)
@TableName("stock_log")
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value="StockLog对象", description="库存变动日志表")
public class StockLog implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty(value = "主键ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    @ApiModelProperty(value = "商品ID")
    private Long productId;

    @ApiModelProperty(value = "库存变动值(正数表示增加,负数表示减少)")
    private Integer changeNum;

    @ApiModelProperty(value = "操作人ID(关联admin表)")
    private Long adminId;

    @ApiModelProperty(value = "操作人用户名")
    private String adminUsername;

    @ApiModelProperty(value = "操作时间")
    private LocalDateTime createTime;

    @ApiModelProperty(value = "书籍名称")
    private String productName;

    @ApiModelProperty(value = "书籍图片路径/URL")
    private String productImage;


}
