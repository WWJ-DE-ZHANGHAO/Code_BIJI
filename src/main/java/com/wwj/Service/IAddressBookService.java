package com.wwj.Service;

import com.wwj.Pojo.AddressBook;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 * <p>
 * 用户收货地址表 服务类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
public interface IAddressBookService extends IService<AddressBook> {
     //修改收货地址
    void editAddressBook(AddressBook addressBook);
    //新增收货地址
    void addAddressService(AddressBook addressBook);
}
