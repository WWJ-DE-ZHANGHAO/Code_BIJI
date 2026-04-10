package com.wwj.Config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;

import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisConfig {
    @Bean
 public MybatisPlusInterceptor mybatisPlusInterceptor() {
  //初始化核心组件
 MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
 //创建分页插件
 PaginationInnerInterceptor pageInterceptor = new PaginationInnerInterceptor(DbType.MYSQL);//初始化分页插件指定数据库类型为MySQL
 pageInterceptor.setOverflow(true); //当请求页码超过总页数时，自动跳转到最后一页
 pageInterceptor.setMaxLimit(1000L); //设置单页最大记录数为1000条
  interceptor.addInnerInterceptor(pageInterceptor);//添加分页插件到MybatisPlus的拦截器链中
  return interceptor;
 }
}
