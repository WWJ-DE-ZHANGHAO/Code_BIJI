// Redisson源码
/*
* 调用trylock()开始尝试获取锁时，
* 根据参数的值，底层会调用不同的方法，如果没有传过期时间，则
* 调用tryLock(waitTime, -1, unit)
* 即:public boolean tryLock(long waitTime, long leaseTime, TimeUnit unit) throws InterruptedException {
        long time = unit.toMillis(waitTime);//将等待时间转换为毫秒
        long current = System.currentTimeMillis();//获取当前时间
        long threadId = Thread.currentThread().getId();//获取当前线程的id
        Long ttl = tryAcquire(waitTime, leaseTime, unit, threadId);
        //尝试获取锁，返回值ttl是锁的剩余时间，即锁的过期时间减去当前时间，如果为null，则锁获取成功了，否则说明锁获取失败了，返回值为锁的剩余时间
         if (ttl == null) {
            return true;
        }

        time -= System.currentTimeMillis() - current;//获取等待时间的剩余时间，即等待时间减去已经等待的时间
        if (time <= 0) {//如果等待时间已经用完，则返回false
            acquireFailed(waitTime, unit, threadId);
            return false;
        }

        current = System.currentTimeMillis();//获取当前时间
        CompletableFuture<RedissonLockEntry> subscribeFuture = subscribe(threadId);//订阅锁的释放事件

 尝试获取锁方法tryAcquire(waitTime, leaseTime, unit, threadId);底层会调用
   private <T> RFuture<Long> tryAcquireAsync(long waitTime, long leaseTime, TimeUnit unit, long threadId) {
        RFuture<Long> ttlRemainingFuture;//锁的剩余时间
        if (leaseTime > 0) {//对过期时间的值进行判断
            ttlRemainingFuture = tryLockInnerAsync(waitTime, leaseTime, unit, threadId, RedisCommands.EVAL_LONG);
            //如果有过期时间，则将过期时间传入tryLockInnerAsync方法
            //返回值ttlRemainingFuture 是一个容器/包装器，代表"将来会有一个 Long 类型的结果"
            //此时结果可能还没出来（因为要访问 Redis，是网络操作)
        } else {
            ttlRemainingFuture = tryLockInnerAsync(waitTime, internalLockLeaseTime,
                    TimeUnit.MILLISECONDS, threadId, RedisCommands.EVAL_LONG);
            //如果没有过期时间，则将默认的过期时间传入tryLockInnerAsync方法
            // 这里的internalLockLeaseTime是锁的过期时间，默认值为30000毫秒，即30秒
           //internalLockLeaseTime = commandExecutor.getConnectionManager().getCfg().getLockWatchdogTimeout();
           //WatchdogTimeout是Redisson中锁的看门狗时间，默认值为30秒，如果没有传入过期时间，则会使用这个默认值作为锁的过期时间

        }
        //CompletionStage<Long> 的值是一个异步计算的结果容器，它代表一个可能会在未来完成的计算阶段，最终会产生一个 Long 类型的值。
         CompletionStage<Long> f = ttlRemainingFuture.thenApply(ttlRemaining -> {
         //这个是一个回调函数，只有当tryLockInnerAsync方法执行完成后，会将ttlRemainingFuture容器解包出里面的 Long 值
         //即ttlRemaining，这是实际的数值，将其传入这个回调函数中进行处理，
            // lock acquired
            if (ttlRemaining == null) {//锁获取成功则返回的值为null
                if (leaseTime > 0) {//如果有过期时间
                    internalLockLeaseTime = unit.toMillis(leaseTime);//设置将过期时间设置为毫秒
                } else {
                    scheduleExpirationRenewal(threadId);
                    //调用scheduleExpirationRenewal方法，开启一个定时任务，定时续期锁的过期时间
                }
            }
            return ttlRemaining;//返回锁的剩余时间
        });
    return new CompletableFutureWrapper<>(f);//把 Java 标准的 CompletionStage f包装成 Redisson 的 RFuture 接口
    //作用是类型适配，让 Java 标准的异步接口能转换成 Redisson 自己的接口，返回的即是一个 RFuture 对象，里面包含了锁的剩余时间或者null

 无论怎么样都会调用
     <T> RFuture<T> tryLockInnerAsync(long waitTime, long leaseTime,
     TimeUnit unit, long threadId, RedisStrictCommand<T> command) {//获取锁方法的底层方法
        return evalWriteAsync(getRawName(), LongCodec.INSTANCE, command,
                "if (redis.call('exists', KEYS[1]) == 0) then " +
                        "redis.call('hincrby', KEYS[1], ARGV[2], 1); " +
                        "redis.call('pexpire', KEYS[1], ARGV[1]); " +
                        "return nil; " +
                        "end; " +
                        "if (redis.call('hexists', KEYS[1], ARGV[2]) == 1) then " +
                        "redis.call('hincrby', KEYS[1], ARGV[2], 1); " +
                        "redis.call('pexpire', KEYS[1], ARGV[1]); " +
                        "return nil; " +
                        "end; " +
                        "return redis.call('pttl', KEYS[1]);",
                Collections.singletonList(getRawName()), unit.toMillis(leaseTime), getLockName(threadId));
    }
// tryLockInnerAsync方法底层会调用evalWriteAsync方法，该方法会调用Redis的eval命令，
//将这里硬编码的Lua脚本传入eval命令中执行，判断key是否存在，不存在就添加key并重置过期时间，并将获取次数加一，并返回nil，
*如果key存在，则判断key的value是否等于当前线程的id，如果相等，则将获取次数加一，并返回nil，
* 如果以上都不是，则返回key的剩余时间，即锁的过期时间减去当前时间
//如果返回值为nil，则说明获取锁成功了，否则说明获取锁失败了，返回值为锁的剩余时间
*evalWriteAsync方法会返回一个RFuture对象，会将null或者锁的剩余时间，放进这个对象中
如果为null，则说明获取锁成功，否则说明获取锁失败了，返回值为锁的剩余时间
*/