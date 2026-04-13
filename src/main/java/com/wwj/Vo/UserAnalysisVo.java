package com.wwj.Vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserAnalysisVo {
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;
    private Integer totalUser;//总用户数
    private Integer newUser;//新增用户数
}
