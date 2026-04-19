package com.wwj.Controller.admin;

import cn.hutool.core.bean.BeanUtil;
import com.wwj.Dto.AdminReplyDto;
import com.wwj.Pojo.Admin;
import com.wwj.Pojo.Comment;
import com.wwj.Pojo.PointsLog;
import com.wwj.Pojo.User;
import com.wwj.Query.CommentQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.ICommentService;
import com.wwj.Service.IMemberLevelService;
import com.wwj.Service.IPointsLogService;
import com.wwj.Service.UserService;
import com.wwj.Vo.AdminCommentVo;
import com.wwj.Vo.UserCommentVo;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController("AdminCommentController")
@RequestMapping("/admin/comment")
@ApiModel(value = "管理端评价管理")
public class CommentController {
    @Autowired
    private ICommentService commentService;

    @Autowired
    private UserService userService;

    @Autowired
    private IPointsLogService pointsLogService;

    @Autowired
    private IMemberLevelService memberLevelService;

    //复杂条件分页查询查询评价列表
      @GetMapping("/list")
      public Result<PageResult<AdminCommentVo>> list( CommentQuery commentQuery){
          PageResult<AdminCommentVo> pageResult = commentService. CommentpageQuery(commentQuery);
          return Result.success(pageResult);
      }


    //审核通过评价
    @PutMapping("/agree/{id}")
    public Result agree(@PathVariable Long id){
          Comment comment = commentService.getById(id);
          comment.setAuditStatus(1);
          commentService.updateById( comment);
          //评价成功奖励积分和成长值
         userService.lambdaUpdate().eq(User::getId,comment.getUserId())
                 .setSql("growth_value=growth_value+5,points=points+50")
                 .update();
         //新增积分记录
        PointsLog PL = new PointsLog();
        PL.setUserId(comment.getUserId());
        PL.setChangeAmount(+50);
        PL.setReason("评价成功");
        PL.setCreateTime(LocalDateTime.now());
        pointsLogService.save(PL);
        //查看用户的成长值是否满足升级条件
        User user = userService.getById(comment.getUserId());
        Long memberLevelId = user.getMemberLevelId();
        Integer growthValue = user.getGrowthValue();
        if (memberLevelId<3&&growthValue >= memberLevelService.getById(memberLevelId).getMinGrowthValue()){
            user.setMemberLevelId(memberLevelId+1);
            userService.updateById(user);
        }


        return Result.success();
    }
    //审核不通过评价
    @PutMapping("/refuse/{id}")
    public Result refuse(@PathVariable Long id){
          Comment comment = commentService.getById(id);
          comment.setAuditStatus(2);
          commentService.updateById( comment);
        return Result.success();
    }

    //根据id查询评价详情
    @GetMapping("/{id}")
    public Result<Comment> get(@PathVariable Long id){
        Comment comment = commentService.getById(id);
        return Result.success(comment);
      }

      //删除评价可以删一个，也可以删多个
    @DeleteMapping("/delete")
    public Result delete(@RequestBody List<Long> ids){
          commentService.removeByIds(ids);
        return Result.success();
    }



    //商家回复评价
    @PostMapping("/reply")
    public Result<String> reply(@RequestBody AdminReplyDto adminReplyDto){
        Long commentId = adminReplyDto.getCommentId();
        String reply = adminReplyDto.getReply();
        if (reply.isBlank()){
            return Result.error("回复内容不能为空");
        }
        Comment comment = commentService.getById(commentId);
        comment.setReplyContent(reply);
        comment.setReplyTime(LocalDateTime.now());
        commentService.updateById(comment);
        return Result.success("成功回复");
    }


}
