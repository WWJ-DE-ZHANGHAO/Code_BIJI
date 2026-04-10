package com.wwj.Service;

import com.wwj.Pojo.Comment;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wwj.Query.CommentQuery;
import com.wwj.Result.PageResult;
import com.wwj.Vo.AdminCommentVo;

/**
 * <p>
 * 商品评价表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-01
 */
public interface ICommentService extends IService<Comment> {
    //商品评价列表，复杂条件分页查询
    PageResult<AdminCommentVo> CommentpageQuery(CommentQuery commentQuery);
}
