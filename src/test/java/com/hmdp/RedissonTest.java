package com.hmdp;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.management.relation.Role;
import java.util.concurrent.TimeUnit;

@SpringBootTest
@Slf4j
public class RedissonTest {

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private RedissonClient redissonClient2;

    @Autowired
    private RedissonClient redissonClient3;

    private RLock lock;
    @BeforeEach
    public void setup() {
      RLock lock1 = redissonClient.getLock("order");
      RLock lock2 = redissonClient2.getLock("order");
      RLock lock3 = redissonClient3.getLock("order");
      //创建联锁
        lock = redissonClient.getMultiLock(lock1,lock2,lock3);
    }

  @Test
    void method1() throws InterruptedException {
        //尝试获取锁
      boolean b = lock.tryLock(1L,TimeUnit.SECONDS);
      if (!b){
          log.error("获取锁失败");
          return;
      }
      try {
          log.info("获取锁成功");
          method2();
          log.info("执行业务逻辑");
      } finally {
          log.warn("释放锁成功");
          lock.unlock();
      }

  }

  void method2()  {
      //尝试获取锁
      boolean b = lock.tryLock();
      if (!b){
          log.error("获取锁失败---2");
          return;
      }
      try {
          log.info("获取锁成功---2");
          log.info("执行业务逻辑---2");
      }
      finally {
          log.warn("释放锁成功---2");
          lock.unlock();
      }


  }
}
