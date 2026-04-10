package com.wwj.Controller.User;

import cn.hutool.core.bean.BeanUtil;
import com.wwj.Dto.SubmitCommentDto;
import com.wwj.Pojo.Comment;
import com.wwj.Pojo.OrderDetail;
import com.wwj.Pojo.User;
import com.wwj.Result.Result;
import com.wwj.Service.ICommentService;
import com.wwj.Service.IOrderDetailService;
import com.wwj.Service.UserService;
import com.wwj.Vo.UserCommentVo;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController("UserCommentController")
@RequestMapping("/user/comment")
@Api(value = "用户评价管理")
public class CommentController {
    @Autowired
    private ICommentService commentService;
    @Autowired
    private UserService userService;

    @Autowired
    private IOrderDetailService orderDetailService;
    //商品评价查询
    @GetMapping("/{productId}")
    public Result<List<UserCommentVo>> list(@PathVariable Long productId){
        List<Comment> list = commentService.lambdaQuery().eq(Comment::getProductId, productId).eq(Comment::getAuditStatus, 1).list();
        List<UserCommentVo> userCommentVos = BeanUtil.copyToList(list, UserCommentVo.class);
        if (!list.isEmpty()&&list.size()!=0){
           userCommentVos.forEach(userCommentVo -> {
               User user = userService.getById(userCommentVo.getUserId());//值访问一次数据库，优化了性能
               userCommentVo.setUsername(user.getUsername());
               userCommentVo.setAvatar(user.getAvatar());
           });
       }
       return Result.success(userCommentVos);

    }

    //用户提交评价
    @PostMapping("submint")
    public Result submint(@RequestBody SubmitCommentDto  submitCommentDto){
        Long ID = submitCommentDto.getOrderDetailId();
        String content = submitCommentDto.getContent();
        List<String> images = submitCommentDto.getImages();
        if (content.isBlank()||images.size()==0){
            return Result.error("评价内容和图片不能为空");
        }
        OrderDetail one = orderDetailService.lambdaQuery().eq(OrderDetail::getId, ID).one();
        Long productId = one.getProductId();
        String orderId = one.getOrderId();
        Comment comment = BeanUtil.copyProperties(submitCommentDto, Comment.class);
        Long userId = BaseContext.getCurrentId();
        comment.setUserId(userId);
        comment.setProductId(productId);
        comment.setOrderId(orderId);
        commentService.save(comment);
         one.setCommentStatus(1);
         orderDetailService.updateById(one);
        return Result.success();
    }
}
