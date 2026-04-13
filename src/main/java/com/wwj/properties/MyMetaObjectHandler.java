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
        LocalDateTime now = LocalDateTime.now();
        // 兼容项目中多种时间字段命名
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "createdAt", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updatedAt", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "createAt", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updateAt", LocalDateTime.class, now);

    }

    // 更新时的填充策略
    @Override
    public void updateFill(MetaObject metaObject) {
        log.info("开始更新填充...");
        LocalDateTime now = LocalDateTime.now();
        // 更新时仅填充更新时间字段
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, now);
        this.strictUpdateFill(metaObject, "updatedAt", LocalDateTime.class, now);
        this.strictUpdateFill(metaObject, "updateAt", LocalDateTime.class, now);
    }
}
