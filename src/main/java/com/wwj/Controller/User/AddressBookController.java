package com.wwj.Controller.User;


import com.wwj.Pojo.AddressBook;
import com.wwj.Result.Result;
import com.wwj.Service.IAddressBookService;
import com.wwj.context.BaseContext;
import io.swagger.annotations.Api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * <p>
 * 用户收货地址表 前端控制器
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@RestController
@RequestMapping("/user/address-book")
@Api(tags = "用户收货地址表")
public class AddressBookController {
    @Autowired
    private IAddressBookService addressBookService;
    //新增收货地址
    @PostMapping("/add")
    public Result add(@RequestBody AddressBook addressBook){
        Long userId = BaseContext.getCurrentId();
        addressBook.setUserId(userId);
        addressBookService.addAddressService(addressBook);
        return Result.success( );
    }

    //根据用户id查询收货地址列表
    @GetMapping("/list")
    public Result<List<AddressBook>> list(){
        Long userId = BaseContext.getCurrentId();
        List<AddressBook> list = addressBookService.lambdaQuery().eq(AddressBook::getUserId, userId).list();
        return Result.success(list);
    }

    //设置默认地址
    @PutMapping("/default/{id}")
    public Result setDefault(@PathVariable Long id) {
        Long userId = BaseContext.getCurrentId();
        //先把该用户的所有地址都设置为非默认地址
        addressBookService.lambdaUpdate().eq(AddressBook::getUserId, userId).set(AddressBook::getIsDefault, 0).update();
        //再把该地址设置为默认地址
        addressBookService.lambdaUpdate().eq(AddressBook::getId, id).set(AddressBook::getIsDefault, 1).update();
        return Result.success();

    }
    //编辑收货地址
    @PutMapping("/edit")
    public Result edit(@RequestBody AddressBook addressBook){
        addressBookService.editAddressBook(addressBook);
        return Result.success();
    }
    //查询回显
    @GetMapping("/{id}")
    public Result<AddressBook> get(@PathVariable Long id){
        AddressBook addressBook = addressBookService.getById(id);
        return Result.success(addressBook);
    }

    //删除地址
    @DeleteMapping("/{id}")
    public Result delete(@PathVariable Long id){
        addressBookService.removeById(id);
        return Result.success();
    }

}
