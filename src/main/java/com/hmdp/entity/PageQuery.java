package com.hmdp.entity;


import com.baomidou.mybatisplus.core.metadata.OrderItem;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Slf4j
public class PageQuery {
    private Integer current = 1;//当前页码
    private Integer PageSize = 10;//每页条数
    private String keywords;//关键字
    private Integer TypeId;//分类id
    private String sortBy;//排序字段
    private boolean isAsc;//是否升序

    public <T> Page<T> toPage(OrderItem... orderItems) {
        // 1.分页条件
         Page<T> p = Page.of(current, PageSize);
        // 2.排序条件
        // 2.1.先看前端有没有传排序字段
        if (sortBy != null) {
            OrderItem orderItem = new OrderItem();
            orderItem.setAsc(isAsc);
            orderItem.setColumn(sortBy);
            p.addOrder(orderItem);
            return p;
        }
        // 2.2.再看有没有手动指定排序字段
        if(orderItems != null){
            p.addOrder(orderItems);
        }
        return p;
    }
    // 手动设置默认排序字段和排序方式，
    // 在构建分页条件时会调用这个方法，需要自己设置如果前端没有传来排序字段和方式的默认值，执行时回调用另一个toMaPage()方法,
    //进行两次判断，分别判断前端是否传了排序字段和排序方式，优先使用
    public <T> Page<T> toPage(String defaultSortBy, boolean isAsc){
        OrderItem orderItem = new OrderItem();
        orderItem.setAsc(isAsc);
        orderItem.setColumn(defaultSortBy);
        return this.toPage(orderItem);
    }

}
