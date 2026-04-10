package com.wwj.Controller.admin;

import com.wwj.Constant.StatusConstant;
import com.wwj.Pojo.User;
import com.wwj.Query.UserQuery;
import com.wwj.Result.PageResult;
import com.wwj.Result.Result;
import com.wwj.Service.UserService;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/userManager")
@Api(tags = "管理端的用户管理")
public class UserManagerController {
    @Autowired
    private UserService userService;
    //查询用户列表
  @GetMapping("/list")
    public Result<PageResult<User>> list(UserQuery userQuery){
        PageResult<User> userPageResult = userService.queryUsersPage(userQuery);
        return Result.success(userPageResult);
    }
    //封禁/解封用户
    @GetMapping("/updateStatus")
    public Result<String> updateStatus(Long id){
      User user = userService.getById(id);
      int status = user.getStatus();
      if (status== StatusConstant.ENABLE){
          user.setStatus(StatusConstant.DISABLE);
      }
      else{
          user.setStatus(StatusConstant.ENABLE);
      }
        userService.updateById(user);
      return Result.success("操作成功");
  }



}
