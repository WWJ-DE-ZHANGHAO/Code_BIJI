package com.wwj.Service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wwj.Pojo.Comment;
import com.wwj.Mapper.CommentMapper;
import com.wwj.Pojo.Order;
import com.wwj.Query.CommentQuery;
import com.wwj.Result.PageResult;
import com.wwj.Service.ICommentService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wwj.Service.IProductService;
import com.wwj.Service.UserService;
import com.wwj.Vo.AdminCommentVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * <p>
 * 商品评价表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-01
 */
@Service
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements ICommentService {
    @Autowired
    private IProductService productService;
    @Autowired
    private UserService userService;

    @Autowired
    private CommentMapper commentMapper;
    //复杂条件分页查询查询评价列表
    //这里就得使用多表查询了，前端传过来的参数有商品名称，用户名称，评分，所以需要关联商品表和用户表进行查询
    @Override
    public PageResult<AdminCommentVo> CommentpageQuery(CommentQuery commentQuery) {
        //构建分页条件构建排序条件，如果前端有排序字段，则用前端的排序字段，否则用默认的排序字段即订单时间降序
        Page<AdminCommentVo> page = commentQuery.toMpPage("create_time", false);

        //进行多表查询
      page=  commentMapper.selectCommentList(page, commentQuery);

        /*//执行分页查询
        page = lambdaQuery()
                .like(StringUtils.hasText(productName), productService.getById()  productName)
                .like(StringUtils.hasText(userName), Comment::getUserId, userName)
                .eq(score != null, Comment::getScore, score)
                .page(page);*/

        //封装结果并返回
        PageResult<AdminCommentVo> result = new PageResult<>();
        result.setList(page.getRecords());
        result.setPages(page.getPages());
        result.setTotal(page.getTotal());
        return result;
    }
}
