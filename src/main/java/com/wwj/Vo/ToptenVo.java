package com.wwj.Vo;

import com.wwj.Pojo.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ToptenVo {
    private String bookName;//商品名称
    private Integer salesCount;//销量
}
