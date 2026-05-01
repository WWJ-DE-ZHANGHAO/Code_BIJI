package com.hmdp.entity;

public interface ILock {
    boolean tryLock(Long timeoutSec);

    void unlock();
}
