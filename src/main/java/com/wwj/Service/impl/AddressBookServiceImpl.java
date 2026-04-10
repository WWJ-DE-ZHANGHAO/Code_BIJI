package com.wwj.Service.impl;

import com.wwj.Exception.AddressInformationIsIncompleteException;
import com.wwj.Pojo.AddressBook;
import com.wwj.Mapper.AddressBookMapper;
import com.wwj.Result.Result;
import com.wwj.Service.IAddressBookService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import static com.wwj.Constant.MessageConstant.ADDRESS_INFORMATION_IS_INCOMPLETE;


/**
 * <p>
 * 用户收货地址表 服务实现类
 * </p>
 *
 * @author 吴哥
 * @since 2026-04-02
 */
@Service
public class AddressBookServiceImpl extends ServiceImpl<AddressBookMapper, AddressBook> implements IAddressBookService {
    //修改收货地址
    @Override
    public void editAddressBook(AddressBook addressBook) {
        Long id = addressBook.getId();
        //判断字段是否为空
        if (addressBook.getDetailAddress() == null || addressBook.getPhone() == null || addressBook.getReceiverName() == null || addressBook.getGender() == null) {
            throw new AddressInformationIsIncompleteException(ADDRESS_INFORMATION_IS_INCOMPLETE);
        }
        //如果修改为默认地址
        if (addressBook.getIsDefault() == 1){
            //先把该用户的其他所有地址都设置为非默认地址
            lambdaUpdate().eq(AddressBook::getUserId, addressBook.getUserId()).set(AddressBook::getIsDefault, 0).update();
            //再把该地址设置为默认地址
            lambdaUpdate().eq(AddressBook::getId, id).set(AddressBook::getIsDefault, 1).update();
        }
        updateById(addressBook);
    }
    //新增收货地址
    @Override
    public void addAddressService(AddressBook addressBook) {
        //判断字段是否为空
        if (addressBook.getDetailAddress() == null || addressBook.getPhone() == null || addressBook.getReceiverName() == null || addressBook.getGender() == null) {
            throw new AddressInformationIsIncompleteException(ADDRESS_INFORMATION_IS_INCOMPLETE);
        }
        if (addressBook.getIsDefault() == 1){
            //先把该用户的其他所有地址都设置为非默认地址
            lambdaUpdate().eq(AddressBook::getUserId, addressBook.getUserId()).set(AddressBook::getIsDefault, 0).update();
        }
        save(addressBook);
    }
}
