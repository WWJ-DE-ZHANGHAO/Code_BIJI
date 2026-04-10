package com.wwj.properties;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
@Component
@Slf4j
public class MyMetaObjectHandler implements MetaObjectHandler {
    // 插入时的填充策略
    /*这个配置类是自动填充逻辑的执行者。
实体类上的注解 (@TableField) 只是标记：“这里需要填”。
配置类 (MyMetaObjectHandler) 是干活的：“我来填时间”。*/
    @Override
    public void insertFill(MetaObject metaObject) {
        log.info("开始插入填充...");
        // 遇到标记为 INSERT 的字段，自动填入当前时间
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        // 如果 updateTime 也想自动填，也可以在这里加
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        // 如果 createdAt 也想自动填，也可以在这里加
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, LocalDateTime.now());
        // 如果 updatedAt 也想自动填，也可以在这里加
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());

    }

    // 更新时的填充策略
    @Override
    public void updateFill(MetaObject metaObject) {
        log.info("开始更新填充...");
        // 遇到标记为 UPDATE 的字段，自动更新为当前时间
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        // 如果 updatedAt 也想自动填，也可以在这里加
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, LocalDateTime.now());
    }
}
