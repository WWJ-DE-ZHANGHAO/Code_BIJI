//每日签到
/*
tb_sign表存储签到信息
包括字段:用户Id、签到的年、月、日、是否补签
* 如果每人每天签一次就要新增一条数据，那么数据库会很快爆满
解决方案:使用二进制存储签到信息，使用一个整数的二进制位来表示一天的签到状态，0表示未签到，1表示已签到
比如:一个月有31天，那么就需要一个32个比特位;两个字节就能存31个状态
把每个bit位对应当月的一天，这种思路称为位图(BitMap)，bit和xx进行映射
Redis中利用String类型数据结构来实现BitMap，因此最大上限是512M，也就是2^29个bit位
*BitMap的操作命令有:
SETBIT key offset value:向指定位置(offset)存入一个0或1
GETBIT:获取指定位置(offset)的bit值
BITCOUNT:统计指定区间内bit值为1的个数
BITFIELD key GET type offset:操作(查询、修改、自增)BitMap中bit数据中的指定位置(offset)的值(可以一次查询多个位置)
参数:
type:返回的类型和数量，u是无符号整型、i有符号整型
offset:从那开始查询
例如:
BITFIELD key GET u2 0:表示从0开始获取两个bit的值，返回的是一个无符号的十进制数据
BITFIELD_OR:获取BitMap中的bit数组，并以十进制形式返回(可以一次查询多个位置)
BITOP:对多个BitMap进行位运算(与、或、异或)，并保存结果
BITPOS key bit [start] [end]:查找bit数组中指定范围内第一个0或1出现的位置
参数:
key:BitMap的key
start:开始位置
end:结束位置
*将二进制存入Redis中默认使用的是十六进制存储，因此需要点击下拉框选择十进制展示
* */

//实现签到功能
/*
将当前用户当天的签到信息保存到Redis中
* 请求接口:user/sign
因为BitMap的底层是基于String数据结构的，
Java中操作Bit使用的是,opsForValue的Opetions对象
bitField()
getBit()
setBit(key,offset,true/false)
存储到Rdeis中的数据结构中，key是用户:YYYY/MM/DD,value是二进制
注意！！！因为底层是以字节形式存储的，所以在Redis中是以8的倍数展示到的，不够8的倍数就补零
00000000000000000000000000100000
因为BITFIELD命令中的三个操作是查询、修改、自增属于是子命令
在参数中需要用BitFieldSubCommends.create()指定使用的是哪个子命令
BitFiledSubCommends.create().get(BitFieldSubCommands.BitFieldType.unsigned(1),0)就是BITFILED GET u1 0
* */

//实现连续签到功能
/*
* 连续签到:从最后一次签到开始向前统计，直到遇到第一次未签到为止，计算总的签到次数，就是连续签到天数
* 逻辑:
* 使用BITFIELD命令获取到当天为止的所有签到数据
* 但是得到是一个十进制数，还需要通过与1进行与运算，将十进制数转为二进制数，然后统计1的个数，就是连续签到天数
*
*  //连续签到功能
    @Override
    public Result signCount() {
        Long userId = UserHolder.getUser().getId();
        LocalDateTime now = LocalDateTime.now();
        //获取当前时间的年月
        String format = now.format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String key =USER_SIGN_KEY+userId+":"+format;
        //获取当前是这个月的第几天
        int day = now.getDayOfMonth();//因为BitMap是从0开始，所以要减1，在作为offset使用
        //获取截止今天为止的签到天数
        List<Long> LL = stringRedisTemplate.opsForValue().bitField(key,
                BitFieldSubCommands.create().get(BitFieldSubCommands.BitFieldType.unsigned(day)).valueAt(0));
        //因为有多个子命令，所以可能不止会返回一个值，所以是用的List集合，如果只有一个值，那么返回的list集合中只有一个值，所以用get(0)
        if(LL==null||LL.size()==0){
            return Result.ok(0);
        }
        Long signCount = LL.get(0);//获取截止今天为止的签到天数
        if (signCount == null || signCount == 0) {
            return Result.ok(0);
        }
        //遍历挨个进行与运算
        int num = 0;
        while(true){
            //让该数与1进行与运算，判断该位是否为1，为1则说明签到，为0则说明未签到，会从最右边的低位开始进行判断
            if((signCount & 1)==0){//该天未签到
               break;
            }
            else{//该天签到
                num++;
            }
            //需要将数字无符号右移一位，让下一位数字进行判断，否则会一直用最低位进行判断
            signCount >>>=1;
        }
    return Result.ok(num);
    }
* */


//UV统计\
//HyperLogLog基础概念
/*
* 使用HyperLogLog
* UV(Unique Visitor):也称为独立访客量，是指通过互联网访问，浏览这个网页的自然人，一天内同一个用户多次访问了该网站，只记录一次
* PV(Page View):也称为页面访问量或点击量，用户每访问网站的一个页面，记录一次PV，用户多次打开页面，则记录多次PV，往往用来衡量网站的流量
* 和用户粘度
*但是要UV统计在服务端实现比较麻烦，因为要判断用户是否已经统计，需要将统计过的数据进行保存，但是如果每个用户都保存到Redis中，
* 那么数据量会非常大
* 为此，使用HyperLogLog模拟统计UV
* HyperLogLog:是从LogLog算法派生出的概率算法，用于确定非常大的集合的基数，而不需要存储其所有的值
* 而在Java中操作HyperLogLog(HLL)的底层也是基于String数据结构实现的,可以保证单个HLL的内存永远小于16kb
* 因为是概率的，有小于0.81%的误差，但是对于UV统计来说，这个误差是可以接受的
* HLL的命令
* PFADD key element [element ...]:将一个或多个元素添加到HyperLogLog中,存入多个相同的元素，那么只会被记录一次
* PFCOUNT key:返回HyperLogLog中不同元素的数量//可能返回的有误差
* PFMERGE destkey sourcekey [sourcekey ...]:将多个HyperLogLog合并成一个HyperLogLog
*对应的Java方法:
* opsForHyperLogLog().add(key,element)//可以将
* opsForHyperLogLog().size(key)
* opsForHyperLogLog().union(destkey,key1,key2)
*
* 使用info memory查看Redis中的内存
*
    //模拟UV统计
    @Test
    void testHyperLogLog(){
        String[] values=new String[1000];
        int j=0;
        for (int i = 0; i < 1000000; i++) {//将100万个数据分一百次添加每次添加1000个数据
            j=i%1000;
            values[j]="user"+i;
            if (j==999){
                stringRedisTemplate.opsForHyperLogLog().add("h1",values);
            }
        }
        Long size = stringRedisTemplate.opsForHyperLogLog().size("h1");
        System.out.println("count="+size);
    }

* */