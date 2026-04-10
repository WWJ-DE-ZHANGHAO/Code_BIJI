package com.wwj.Mapper;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Pojo.Comment;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wwj.Query.CommentQuery;
import com.wwj.Vo.AdminCommentVo;

/**
 * <p>
 * 商品评价表 Mapper 接口
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-01
 */
public interface CommentMapper extends BaseMapper<Comment> {
    // 复杂条件分页查询查询评价列表
    Page<AdminCommentVo> selectCommentList (Page<AdminCommentVo> page, CommentQuery commentQuery);
    //拦截器会检查到page类，将SQL语句进行拦截，并改写
}
