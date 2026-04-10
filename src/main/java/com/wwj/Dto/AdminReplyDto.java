package com.wwj.Dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AdminReplyDto {
    private Long commentId;
    private String reply;
}
