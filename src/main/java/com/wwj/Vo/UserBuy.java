package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserBuy {
    private Long productId;
    private Integer quantity;
    private BigDecimal price;
    private String bookName;
    private String coverUrl;
    private String description;
}
