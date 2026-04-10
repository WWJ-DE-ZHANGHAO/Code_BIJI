package com.wwj.Query;

import lombok.Data;

@Data
public class StockQuery extends PageQuery {
    private Long productId;
    private String  keyword;
}
