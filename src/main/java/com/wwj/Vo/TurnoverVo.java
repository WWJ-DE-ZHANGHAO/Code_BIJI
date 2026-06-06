package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TurnoverVo {
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate date ;
    private BigDecimal turnover;
}
