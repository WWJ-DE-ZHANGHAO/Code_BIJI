package com.wwj.Vo;

import com.wwj.Pojo.Comment;
import lombok.Data;

@Data
public class AdminCommentVo {
    private String userName;
    private String productName;
    private Comment comment;
}
