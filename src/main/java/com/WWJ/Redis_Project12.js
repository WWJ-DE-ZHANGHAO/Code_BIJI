//Redis原理
//Redis数据结构
/*
*Redis的String类型Hash类型的命令，大多都是基于Redis底层的数据结构来实现的
* 而放入Redis的key-vlalue又都是转为RedisObject进行存储的
*
* 动态字符串SDS
* Redis中保存的key都是字符串，而其value要么就是字符串，要么就是包含字符串的集合或者entry，所以字符串几乎是Redis中最常见的数据结构
* Redis的底层不会直接使用C语言的字符串，因为C语言中的字符串会有很多问题，
* 比如:C语言中的字符串都是字符数组，且末尾为\0，导致字符串的长度需要计算得到，字符串的复制和拼接操作非常麻烦
* 所以Redis的底层是构建了一种新的字符串结构，称为简单动态字符串SDS(Simple Dynamic String)
SDS的结构体
* struct __attribute__ ((__packed__)) sdshdr64 {//struc类似java中的class sdshdr64就是类似java中的类名
*这下面三个就是Header的组成部分，类型java中的成员变量
uint64_t len; //表示buf已保存的字符串字节数(一个字符char占用一个字节)，该属性占用一个字节
uint64_t alloc; //buf申请的总字节数，不包含结束标识，该属性占用一个字节
unsigned char flags; //不同SDS的头类型，用来控制SDS的头大小;flags:0～5分别对应5种不同的SDS结构体大小，字符类型所以也占用一个字节
五种类型:SDS_TYPE_5,SDS_TYPE_8,SDS_TYPE_16,SDS_TYPE_32,SDS_TYPE_64
* SDS_TYPE_5:表示5字节的SDS结构体
* SDS_TYPE_8:表示8字节的SDS结构体
* SDS_TYPE_16:表示16字节的SDS结构体
* SDS_TYPE_32:表示32字节的SDS结构体
* SDS_TYPE_64:表示64字节的SDS结构体
char buf[];
};
* 例如:存入的set name "jack"
* name在SDS结构是
*len:4 alloc:4 flags:1 n a m e//前三个是Header，后面的都是Body
*
*
*特性:具备动态扩容的能力，例如一个内容为"hi"的SDS
* len:2 alloc:2 flags:1 h i
* 加入现在要追加一个字符串",amy"，这里首先会申请新内存空间
* 如果新字符串(追加的拼接原先对的)小于1M，则新空间位扩展后字符串长度的两倍+1
* 如果新字符串(追加的拼接原先对)大于1M，则新空间位扩展后字符串长度的两倍+1M+1，
* 上述称为内存预分配，实际需要的内存空间是小于申请的内存空间的，申请刚好的下次要追加一个很小的字符串，也会需要申请内存，
* 用内存预分配就避免了申请新内存的次数，造成性能损失，
* 优点:
* 获取字符串长度的时间复杂度为O(1)
* 支持动态扩容
* 减少内存分配次数
* 二进制安全
* */


注意！！！
C语言存储英文26个字母时，一个字符是一个字节的，'A'
汉字时要根据编码方式，如果是UTF-8一个汉字字符两个字节，'无'
存储十进制元素的时候，是先其先变为二进制再存储的，而一个字节是8位，有符号位的话，只能存储-128-127的数字，无符号位的话，可以存储0-255的数字。
如果在这个范围外，则要用16位存储，两个字节存储。即-32768-32767，无符号位的话，0-65535


//InSet
/*
* InSet是Redis中set集合的一种实现方式，基于整数数组类实现，并且具备长度可变、"有序"等特征
* 结构如下
*typedef struct intset {
    uint32_t encoding;//这个是Redis自己定义的存储规则编码方式，支持存放16位、32位、64位整数，这里unint32_t表示encoding属性字段占了4个字节
    uint32_t length;//元素个数，unint32也表示length字段占4个字节，类似C语言中的int声明该变量的类型
    int8_t contents[];//整数数组，保存集合数据，int表示整数，int8_t表示8位整数，一个字节
    * ，但是这里的数组并不是和C语言的规范那样，依赖于这个int8_t,而是由encoding属性来决定的
    * ，如果encoding:INT16_ENCODING，那么contents[]数组每个元素占两个字节
    * 这里的contents[]数组就充当一个指针，指向了数组中的第一个元素的地址，之后的增删改查都是由inset自己来控制，
    * encoding包含三种模式:(带符号的)
    * INTSET_ENC_INT16 (sizeof(int16_t)) //表示16位2个字节，范围类似java中的short，数组中的每个元素占两个字节，范围是-32768到32767
    * INTSET_ENC_INT32 (sizeof(int32_t)) //表示32位4个字节，范围类似java中的int
    * INTSET_ENC_INT64 (sizeof(int64_t)) //表示64位8个字节，范围类似java中的long
} intset;
*
* 为了方便查找，Redis会将Inset中的所有整数按照升序一次保存在contents数组
* 例如: encoding:INISET_ENC_INT16 length:3   5   10   20
* encoding占4字节、length占4字节、contents中每个元素占2字节，共3个元素即6个字节。
* 因此这个整个Inset占14字节
*为什么要明明5、10、20这么小的数字，为什么要用两个字节，明明一个字节就可以表,为什么要统一编码格式?
* 目的是为了方便Inset基于数组角标快速寻址找到对应的元素，C语言操作内存中的数据都是靠指针去寻址的，指针是一个8字节大小的无符号整数
* 这个整数会映射物理内存的一片空间，所以可以把指针看做是指向内存的一个地址，根据它就能够寻找到对应的内存空间上存储的和数据
* 我们这里的contents[]数组就是一个指针,它指向的是数组当中的起始的(第一个元素)地址，而数组是连续内存空间，知道了第一个元素的地址，
* 就能找到下一个元素的地址，
*   关键点：
    指针本身占8字节（64位系统）
    指针存储的是内存地址值
    地址值用十六进制表示，可以是任意长度（通常省略前导零）
* 例如:假设这个元素5占了两个字节，它的地址是0x001(8)，改地址向后移动两个字节，就能找到下一个元素是10，它的地址是0x003
* 也可以看元素的角标来推断该元素的存储地址，如果角标是0，那么该元素的地址就是起始地址，
* 如果角标是3，那么该元素的地址就是起始地址+角标*元素占用的字节数,建议角标从0开始
* 公式:startPtr + index*(sizeof(int16))
*
*
* 当数组储存了一个所占字节大于2个字节的元素时，Inset会进行升级
* 案例:假设有一个inset，元素为{5、10、20}，采用的编码为INISET_ENC_INI16,即每个元素的数组空间占两个字节
* 现在插入一个元素50000，因为50000最少需要占三个字节，此时Inset会自动升级编码方式到合适的大小，之后再插入元素50000
* 流程:
* 1、升级编码方式为INISET_ENC_INI32,每个元素占4个字节，并按照新的编码方式和元素个数扩容数组(此时有4个元素，每个元素四个字节，则新数组需要扩容为16个字节大小)
* 2、倒序依次将数组中的元素拷贝到扩容后的正确位置，元素扩容:加入刚开始元素起始位置是数组中的第n字节，
* 数组扩了2倍,该元素的起始位置的字节就是数组中的第2n个字节(底层是先将元素拿出来再插入)
* 比如:元素20的起始字节是4,扩容后元素20的起始字节是8,结束字节是12
* (如果是正序，就会先给第一个元素扩容，它的起始字节是0，结束字节变为4，但此时第二个元素还没扩容，就会被第一个元素覆盖，导致数据丢失)
* 所以要倒序先将最后一个元素扩容，再倒序依次将数组中的元素拷贝到扩容后的正确位置
* 3、将新元素插入到数组最后的位置
* 注意！！！扩容后数组中元素元素的角标是不会变的。
* 扩容后整个Inset的大小变为24，encoding的属性值变为INISET_ENC_INI32,length的属性值变为4
*
* 如果新增的元素大小没有超过编码，则不需要升级编码，会先去数组查找看有没有和新增的元素相同的元素，如果有则返回-1，
* 如果没有则将数组扩容+1，将并且因为要求是有序的，还要进行二分查找，找到插入的角标，如果该角标已经有元素则和该元素比较，
* 如果大于则再与其后面一个元素比较，小于则与其前面的一个元素继续比较，如果等于则返回-1，确保有序性和去重
*
* 但是Inset在数据量很大的时候，性能会下降，因为数组扩容会重新赋值，所以会耗时，且需要连续的内存空间也不方便
* */



//Dict(Dictionary)
/*
Redis就是一个键值性的数据库，需要根据键去获取值，Dict是一个字典，就可以把键和值的映射关系保存起来方便我们根据键去找值
类似中的Java中的HashMap，而HashMap底层就是一个数组，数组的元素是一个个Entry对象，而当将key保存到HashMap的时候，其实就会
根据key做hash运算，然后计算出它应该在数组的哪个位置，然后把Entry对象保存到这个位置。
而在Redis中键值映射关系就是通过Dict来实现的
Dict由三部分组成:哈希表(DictHashTable)、哈希节点(DictEntry)、字典(Dict)
DictHashTable:底层就是数组，数组保存的就是DictEntry哈希节点，
DictEntry:保存键值对
Dict:保存DictHashTable和DictEntry，即Dct本身

Dict的结构体
typedef struct dictht {//就是DictHashTable，entry数组
    dictEntry **table;//这里的**table不是指向数组的指针，而是用于寻找指向数组的指针的地址的指针，而数组中保存的指向entry的指针，
    unsigned long size;//数组大小，是2的n次方
    unsigned long sizemask;//数组大小掩码，即2的n次方减1，用于做hash运算
    unsigned long used;
    //Enrtry个数，即数组的元素个数，但是元素个数可能大于数组大小，因为可能会有keyhash计算出来的数组索引一样，就需要用用链表或者红黑树来保存
} dictht;

typedef struct dictEntry {//DictEntry
    void *key;//键，也是一个指针指向SDS字符串
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;//value，在C语言中是联合体，就是说v可以是这个联合体的任意一个成员，是指针或是无符号的64位整数，但不能同时成立，
    struct dictEntry *next;//下一个Entry
} dictEntry;

*当向Dict中添加键值对时，Redis首先会根据Key计算出hahs值(h)，然后利用h&sizemask与运算，计算出元素应该存储到数组中的哪个索引位置
之前HashMap想要根据hahs值去找索引位置，是通过用h对数组长度取模，得到索引位置的，但是这样效率很低
而hash值与数组长度大小减一进行与运算，与对数组大小取模的效果是相同的
存入元素后，会将数组中对应角标位置用于储存指向该元素的指针

当存储的新元素计算出的hash值与数组大小掩码结果即角标，在数组中已经存在的元素，会让角标存储指向新的元素的指针，
而指向旧的元素的指针会存储在新元素的*next里面，就形成了链表
为什么要把新的元素存储放在链表的头部？
因为这样在查找的时候，比较方便，如果放尾部，还要遍历链表找到最后一个元素把指向新元素的指针存储在尾部元素的*next里面


typedef struct dict {//字典本身
    dictType *type;//Dict的类型，因为不同的场景下用到的hash函数可能是不一样的
    void *privdata;//私有数据，在做特殊hash运算时使用
    dictht ht[2];//一个Dict包含两个hash表，一个用于存储数据，一个用于存储临时数据(一般是null)，当数据量达到一定程度时，会进行rehash，将数据从ht[0]移动到ht[1]
    long rehashidx;//rehahs的进度 -1表示没有进行rehash，大于0表示进行rehash的进度
int16_t pauserehash; //rehash是否暂停 1表示暂停，0表示没有暂停
} dict;


注意！！！Rehash（重新哈希） 是哈希表在扩容或缩容时，将原有数据重新计算哈希值并迁移到新哈希表的过程。
* */

//Dict的扩容
/*
* Dict中的HashTable就是数组结合单向链表的实现，当集合中元素较多时，必然会导致哈希冲突增多，链表过长，则查询效率就会大大降低
* 例如:数组大小为4但是元素个数为100，则LoadFactor=25，每个链表上都挂了25个元素
* 扩容：Dict在每次新增键值对的时候，都去检查负载因子(LoadFactor=used/size)，满足以下条件就会触发哈希扩容
* 哈希表的LoadFactor>=1;并检查Redis服务器没有执行BGSAVE或者BGREWRITEOF等后台进程
* 哈希表的LoadFactor>5;不管有没有执行bgsave或bgrewriteof
*
* 底层使用dictExpand(原数组，目标大小)方法
* 如果是新Dict，方法为dictExpand(d,DICT_HT_INITAL_SIZE),DICT_HT_INITAL_SIZE=4，初始化为默认大小4
* 不是新的，方法为dictExpand(d, d->ht[0].used +1)表示扩容为原大小加一，
* 但是实际上会找一个大于等于used+1的2的n次方作为扩容大小，
*
* Dixt除了扩容，每次删除元素时，也已对负载因子进行检查，当LoadFactor<0.1时，会进行哈希表收缩
* 收缩时也会调用dictExpand(d,minimal)方法进行收缩，底层如果发现数组大小小于4，会重置为4
*
* 底层会进行rehash，创建新的hash表
* 1、计算新的hash表，值取决于当前是要进行扩容还是收缩
* 如果是扩容，则新的size为第一个大于等于dict.ht[0].used+1的2的n次方
* 如果是收缩，则新的size为第一个大于等于dict.ht[0],used的2的n次方，不得小于4
*
* 2、按照新的size申请内存空间，创建dictht，并赋值给dict.ht[1]
* 3、设置dict.rehashidx=0,标示开始rehash
* 问题:如果数组中有几十上百万数据，用rehash转移数据时，一次性完成。会非常耗时，导致主线程阻塞，造成数据丢失
* 所以Dict的rehash是分多次的，渐进式的完成，因此称为渐进式rehash，所以下一步是
* 4、每次执行新增、查询、修改、删除操作时，都检查一下dict.rehashidx是否大于-1，如果是则将dict.ht[0].table[rehashidx]的enry的链表
* rehash到dict.ht[1],并且将rshashidx++。直到dict.ht[0]的所有数据都rehash到dict.ht[1]
* 5、将dict.ht[1]赋值给dict.ht[0],给dict.ht[1]初始化为空hash表，释放原来的dict.ht[0]的内存
*
* 问题:如果在渐进过程中，要进行增删改查了，该去哪张hash表执行?
* 在rehash过程，不是复制是迁移，
* 如果是新增操作，在ht[1]执行
* 数据在哪，就去哪操作就行，查询、删除、删除则会在ht[1]和ht[0]依次查找数据并执行，这样可以确保ht[0]的数据只减不增，随着rehash最终为空
*
* 总结:
因为在Dict的底层是hash表的，而且是基于数组结合链表实现的，数组中的entry中是键值对，key通过指针指向SDS字符串
而entry之间又是通过指针建立联系的，一个entry指向下一个entry依次如此
所以Dict的内部是使用了大量指针，所以它在内存中分配空间的时候地址是不连续的，一个个分散的内存块，不得不通过指针去指向不同的内存块进行寻址
* 优点:查询性能较好
* 缺点:会造成内存的浪费，因为内存不连续会产生内存碎片，而且每个指针本身也要占用大量的内存(一个指针占用8个字节)
* */


//ZipList(压缩列表，为了节省内存而来的)
/*
* ZipList:是一种特殊的"双端链表"(其实不是链表，不是用指针关联节点的，具备双端列表的大部分特性)，由一系列特殊编码的"连续"内存块组成，
* 可以在任意一端，进行压入/弹出操作。并且该操作的时间复杂度为O(1)
* 问题:ZipList没有指针，是怎么遍历链表的？
*
* ZipList的结构:
* zlbytes(压缩列表的总字节数)  zltail(尾节点的偏移量:尾节点与压缩列表的起始地址之间的字节数)  zllen(entry个数)  entry(头结点)  entry ………………  entry(尾结点)  zlend(结束标识，固定值0xff，两十六进制就是8位一个字节)
*为什么要尾偏移量？:当知道起始地址的情况下，就可以用尾偏移量计算出尾节点的地址
* 其中zlbytes、zltail、zllen和zlend四个部分的大小是固定的，
* zlbytes类型为unint32_t，占用4个字节
* zltail类型为unint32_t,占用4个字节
* zllen类型为unit16_t,占用4个字节 能记录的最大值为UINT16_MAX(65534),如果超过这个值，会被记录为65535(多多少都是记录这个值)，单节点的真实数量需要遍历整个压缩列表才能计算出
*
* entry 列表字节  每个entry的占用字节是不确定的，为了充分利用空间，值越大占用的更多
* ZipList中的entry不是和普通链表那样记录前后节点，因为两个指针要都要占用16字节了，浪费内存，而是采用以下结构:
*
* previous_entry_length:前一节点的长度，占1个或5个字节(可以逆序遍历找到起始地址)
* 如果前一节的长度小于254字节，则采用一个字节来保存这个长度
* 如果前一节点的长度大于等于254字节，则采用5个字节来保存这个长度值，第一个字节为0xfe，后四个字节才是真实长度数据
*
* encoding:编码属性，记录Content的数据结构(字符串还是整型)以及长度，encoding本身占用1个或2个或5个字节(第一个字节为标识)
* encoding可以分为字符串和整数两种编码
* 字符串又可以分为"00"、"01"、"10"开头，以这些开头则证明content是字符串
* "00"表示encoding自己占了1个字节、格式:|00pppppp|，高位是标识，低六位用来记录content大小，所以只能记录content<=63字节的
* "01"表示encoding自己占了2个字节、格式|01pppppp|qqqqqqqq|用低12位记录，能记录<=16383个字节的
* "10"表示encoding自己占了5个字节、格式|10000000|pppppppp|qqqqqqqq|sssssssss|rrrrrrrr|第一个字节空着做标识，后四个记录，记录<=4294967295字节的
*整数类型(以11开头),encoding固定占一个字节，根据encoding的值表示不同字节数
11000000:表示整数，占2个字节
11010000:表示整数，占4个字节
11100000:表示整数，占8个字节
11110000:表示整数，占3个字节
11111110:表示整数，占1个字节
特殊情况:当数值很小时，encoding为1111xxxx
就不用content记录数据了，而是直接用encoding的后四位记录数据(但是0000、1110和1111都已经被占用作为标识了，只能用0001-1101保存0-12，编码值减一)
占用1个字节，此时entry只有两个字节，previous_entry_length占1个字节，encoding占1个字节

*
* contents:负责保存字节的数据，可以是字符串或整数
* 所以整个entry所占用的字节数=previos_entry_length所在字节+encoding所占字节+contents所占字节
*
* 注意！！！previous_entry_length和encoding都是用小端字节序存储的
* 按照常识，读取数值都是左边为高位右边是低位，例如3456，3是千分位，6是个位，读的时候是从左往右读的
* 小端字节序:就是和常识相反，是从低位向高位进行保存的，例如:0x1234(16进制12是一个字节，34是一个字节),
* 采用小端字节序后实际存储的值为，0x3412，先存低位的字节，再存高位字节
*
*
* zlend unint8_t ,占用1个字节
*
* 例如:要保存"ab"则
* encoding编码为|00000010|、由于这个是第一个元素所以它前面节点字节长度为0，previous_entry_length为00000000
* content为(把字符串变为字符，占两个字节，再用Ascll码算出a为97，b位98，即为01100001 01100010
* 所以保存"ab"它的entry只需要占用4个字节，整个压缩列表占用字节数=4+4+4+4+1=17字节
* 因为利用小端排序:先存低位字节，再存高位字节(entry不是用这个)
* 所以压缩列表总字节数17是|00|00|00|0x11|,但存储后为|0x11|00|00|00|(16进制中9之后就是a、b、c……f)
* 压缩列表起始地址到尾节点的偏移量是12即|00|00|00|0x0c(12字节),存储后就是|0x0c|00|00|00|
*  整个压缩列表就是:
* zlbytes(0x11|00|00|00)  zltail(0x0c|00|00|00|)  zllen(0x01|00|00|00|)  entry(0x00|0x02|0x61|0x62|)  zlend(0xff)
*
*
* 例如:保存整数值5和2
* encoding编码分别为11110110和11110011没有content，entry共占用字节数=2*2四个字节
* 整个压缩列表为
* zlbytes(0x11|00|00|00)  zltail(0x0e|00|00|00|)  zllen(0x02|00|00|00|)  entry(0x00|0xf6|) entry(0x02|0xf3|) zlend(0xff)
*
* 缺陷:要遍历ZipList的时候，只能从后往前或者从前往后，当存储的数据很多时，而要查找的节点又在中间位置会需要遍历很久，比较耗时
 解决问题:使用跳表
* */

//ZipList的连锁更新问题
/*
* ZipList的每一个Entry都包含previous_entry_length来记录上一个字节的大小，长度是1个或5个字节，可能会导致连锁更新问题
* 假设我们有N个连续的、长度为250~253字节之间的entry，因此entry的previous_entry_length长度只需要为1字节
* 如果此时新增一个长度为254字节的entry，放在首字节的位置，此时后面的entry的previous_entry_length长度变为5字节，这个entry也大于254字节了
* 再后面的entry的previous_entry_length长度也变为5字节，导致后续的previous_entry_length都要变，造成连锁更新
* 问题:
* 连续更新时，entry需要增加节点，整个压缩列表就要去申请扩容，因为是连续内存地址，还会导致后续的内存地址都往后迁移，
* 如果内存空间地址不够，又要去申请新的内存空间，如果刚完成迁移，因为连锁更新，又一个entry新增节点，又要迁移和申请新的内存空间
* 频繁的申请新的内存空间、频繁的迁移，会牵扯到“内核态”的切换，对性能造成很大影响
* 概率较低，还未有解决方案
  ListPack（紧凑列表）是 Redis 5.0 引入的新数据结构，
  * 主要用于替代 ZipList，它解决了以下问题
核心改进点：
移除 previous_entry_length 字段
ZipList：每个 entry 都记录前一个节点的长度
ListPack：完全移除了这个字段，从根源上消除了连锁更新问题
编码方式改变：
    ZipList Entry 结构：
   [prevlen][encoding][data]

   ListPack Entry 结构：
   [encoding][data]
遍历方向优化
ZipList：支持双向遍历（因为有 prevlen）
ListPack：只支持从头到尾单向遍历，但避免了连锁更新

*
* */


//QuickList
/*
ZipList虽然节省内存空间，但是因为ZipList是连续内存地址，当存储大量数据时，没法找到一大片连续内存空间的
为了解决这个问题:必须限制ZipList的长度和entry大小，稳定在一个最佳上限

又引出了问题2:但是就是要存储大量数据，不得不超过ZipList的最佳上限怎么办？
可以通过创建多个ZipList来分片存储数据解决，

这又引出了问题3:使用多个ZipList分片存储，那么数据就被拆分存储到了内存中的不同地方，不方便查找和管理，多个ZipList之间怎么建立联系？
为此在Redis3.2版本之后引入了一个新的数据结构QuickList，他是一个双端链表，只不过链表中的每个节点都是一个ZipList，就能在多个ZipList之间建立联系

QuickList如果限制每个ZipList的大小？
*为了避免QuickList中的每个ZipList中的entry过多，Redis提供了一个配置项:list-max-ziplist-size(默认为-2)来限制
如果值为正，则表示ZipList的允许的entry个数的最大是
如果值为负，则表示ZipList的最大内存大小，分5种情况:
-1:每个ZipList的内存占用不能超过4KB(1 KB = 1024 字节 (Bytes))
-2:每个ZipList的entry个数不能超过8KB
-3:每个ZipList的entry个数不能超过16KB
-4:每个ZipList的entry个数不能超过32KB
*
除了控制ZipList的大小，QuickList还可以对节点的ZipList进行压缩，通过配置项:list-compress-depth(默认为0)
因为链表一般都是从收尾访问的较多，所以首尾是不压缩的，这个参数是控制首尾不压缩的节点个数:
0:特殊值，代表不压缩
1:标示QuickList的首尾各有1个节点不压缩，中间节点压缩
2:标示QuickList的首尾各有2个节点不压缩，中间节点压缩
以此类推

QuickList的结构
typedef struct quicklist {
    quicklistNode *head;//头结点指针
    quicklistNode *tail;//尾结点指针
    unsigned long count;//所有ZipList的总的entry个数
unsigned long len;    //链表节点个数
int fill : QL_FILL_BITS; //ZipList的entry上限，默认为-2
unsigned int compress : QL_COMP_BITS; //首尾不压缩的节点个数，1表示首尾各一个节点(ZipList)不压缩，2表示首尾各两个节点不压缩，以此类推
unsigned int bookmark_count: QL_BM_BITS;//内存重分配时书签数量及数组，一般用不到
quicklistBookmark bookmarks[];
} quicklist;

QuickList的每个节点的结构
typedef struct quicklistNode {
    struct quicklistNode *prev;//前一个节点指针。用于倒序遍历
    struct quicklistNode *next;//后一个节点指针，用于正序遍历
    unsigned char *zl;//当前节点的ZipList指针
    unsigned int sz;  //当前节点的ZipList字节数
unsigned int count : 16;//当前节点的ZipList的entry个数
unsigned int encoding : 2; //当前节点的ZipList的编码方式,1表示ZipList编码方式，2表示lzf压缩方式
unsigned int container : 2;  //数据容器类型 1表示其他、2表示ZipList
unsigned int recompress : 1;//是否需要解压 1说明被解压了(解压是为了读取数据)，将来需要重新压缩
unsigned int attempted_compress : 1;
unsigned int extra : 10;
} quicklistNode;
*
* */

//SkipList
/*
* ZipList和QuickList虽然都很节省内存空间，但是它们都只能从从头到尾遍历或者尾到头的遍历，但数据量大的时候查询中间的某个元素的时候性能就很差
* 解决办法：因为此时指针的跨度是一，每次只能指向下一个元素，所以一个个遍历会很耗时，如果可以增大指针的跨度，指针指向几个元素之后的元素就可以快很多
* 比如:要找中间的某个元素，直接让指针指向中间元素。
* 为此Redis引入了SkipList数据结构，SkipList被称为跳表(本事还是链表)，但与传统的链表相比有几点差异
* 1、元素按照升序排列存储
  2、节点可能包含多个指针，指针的跨度不同，根据跨度可以分为不同几倍的指针，
  * 跨度为1的指针叫一级指针，跨度越大的指针级别越高，每个节点中用数组存储多个指针(最多是32级指针)
SkipList结构
*typedef struct zskiplist {
    struct zskiplistNode *header, *tail;
    unsigned long length;
    int level;
} zskiplist;
* SkipList节点结构
* typedef struct zskiplistNode {
    sds ele;//节点存储的值
    double score;//节点存储的分数,用于排序
    struct zskiplistNode *backward;//前一个节点指针
    struct zskiplistLevel {
        struct zskiplistNode *forward;
        * //后一个节点指针，这个根据跨度可以分为不同几倍的指针(跨几个元素时根据跨度索引，n级指针跨越2的n减一次方个元素去找)，例如:三级指针跨4个元素
        * //拿各级指针挨个去找，找到的元素的score比目标值小的时候，就返回用更高级别的指针去查找，
        * //找到的元素score比目标值大时，就返回用更低级别的指针去查找
        unsigned long span;//跨度索引
    } level[];//多级指针用数组存储，默认最少有一个一级指针
} zskiplistNode;
*SkipList的增删改查效率和红黑树基本一致，实现更简单，所以Redis中就用这个代替红黑树
* */


//RedisObject
/*
* Redis中的任意的数据类型的键和值都会被封装成一个RedisObject对象，也称为Redis对象
*
*RedisObject结构:
* typedef struct redisObject {
    unsigned type:4;//对象类型，有5种类型:0是字符串String、1是List、2是Set、3是Zset、4是hash，type属性占4位
    unsigned encoding:4;//对象的编码方式，共有十一种，根据不同的数据类型选择不同的编码方式，encoding属性占4位
    unsigned lru:LRU_BITS; //记录Redis对象最近一次被访问的时间，占了24位 ，如果长期不使用，Redis会删除对象
int refcount;
* //对象引用计数器，该Redis对象每被引用一次，计数器就会加1，释放一次引用，计数器就会减1，如果引用计数器为0，则说明Redis对象不再被使用，可以回收，该属性占32位
void *ptr;//对象指针，根据对象类型不同，ptr属性不同，指向存放实际数据的空间，指针占用8字节
} robj;
* 以上的Redis头信息就共占用16个字节，所以存储数据时不要用字符串类型存，每个字符串占用16字节，有很多个的话就会占用很多内存，
* 最好将数据都放入集合，用集合类型存储，将会节省很多内存。
*
* Redis中的编码方式包括:
* OBJ_ENCODING_RAW:字符串类型，存储字符串数据，字符串数据存储在ptr中
* OBJ_ENCODING_INT:long类型整数类型，存储整数数据，整数数据存储在ptr中
* OBJ_ENCODING_HT:Hash类型，存储Hash数据，Hash数据存储在ptr中(底层就是Dict)
* OBJ_ENCODING_ZIPMAP:已废弃
* OBJ_ENCODING_LINKEDLIST:双端链表
* OBJ_ENCODING_ZIPLIST:压缩列表
* OBJ_ENCODING_INTSET:整数集合
* OBJ_ENCODING_SKIPLIST:跳表
* OBJ_ENCODING_STREAM:流数据
* OBJ_ENCODING_EMBSTR:embstr的动态字符串
* OBJ_ENCODING_QUICKLIST:快速列表
*
*
* */
注意！！！！
编码方式(Encoding): 是 Redis 底层用来存储数据的实际数据结构。它决定了数据在内存中是如何组织和保存的。
同一个 Redis 类型可以用不同的底层结构实现，Redis 会根据数据的特点自动选择最优的编码方式，以平衡性能和内存占用。
例如:RAW底层的数据结构就是用SDS动态字符串保存，
Set name
* struct __attribute__ ((__packed__)) sdshdr64 {//SDS动态字符串结构
    uint64_t len;
    uint64_t alloc;
    unsigned char flags;
    char buf[];
};
len:4 alloc:4 flags:1 n a m e//存储形式
RedisObject格式:
struct redisObject {
    unsigned type:OBJ_STRING;//对象类型，有5种类型:0是字符串String、1是List、2是Set、3是Zset、4是hash，type属性占4位
    unsigned encoding:OBJ_ENCODING_EMBSTR;//对象的编码方式，共有十种，根据不同的数据类型选择不同的编码方式，encoding属性占4位
    unsigned lru:LRU_BITS; //记录Redis对象最近一次被访问的时间，占了24位 ，如果长期不使用，Redis会删除对象
int refcount;
void *ptr;//对象引用计数器，该Redis对象每被引用一次，计数器
}
//五种数据类型

//String
/*
* String是Redis中最常见的数据存储类型
* 其基本的编码方式是RAW,基于简单的SDS动态字符串实现，存储上限位512mb
*
* 如果存储的SDS的长度小于44字节，则会采用EMBSTR编码方式(内嵌字符串)，
* 此时object head与SDS是一段连续空间，申请内存只需要调用一次内存分配函数，效率更高
* 原先的SDS需要申请两次内存，一次是申请RedisObject结构，一次是申请SDS结构，
* 为什么是小于44字节呢？
* 因为Redis底层的内存分配采用的算法是JEMALLOC，这种算法在分配内存的时候会以2的n次方做内存分配
* 当字符串为44字节时，SDS结构的总字节就是44+结束字符\0(一个字节）+头部(3个字节)共48个字节，再加上RedisObject结构有16字节，共64个字节，
* 所以建议存储的SDS的长度小于44字节，效率会更高。
*
*  如果存储的字符串是整数值，并且大小在LONG_MAX范围内，则会采用INT编码方式，
  直接将数据保存在RedisObject结构中的ptr指针中(8字节，而无论什么语言中都规定数值大小不能大于8字节),都不用SDS了，更加节省内存，
  *
 总结:String类型的编码方式有RAW、EMBSTR、INT三种
 * RAW:
 * RedisObject结构和SDS结构是碎片化的，需要申请两次内存，一次是申请RedisObject结构，一次是申请SDS结构
 * EMBSTR:
 * RedisObject和SDS结构都保存在连续空间中，只需要申请一次内存，效率更高
 * INT:
 * RedisObject结构中保存的是整数值，不需要SDS结构，节省内存
 *
 *
*/

// List类型
/*
* 之前使用LPUSH RPUSH等命令从首尾操作List队列中的元素
* 底层可以通过LINKEDLIST实现，但是LinkedList不止连续的内存地址，需要通过指针来建立节点之间的联系
* 但是使用大量指针会很浪费内存，
*
* 所以Redis中将List的底层实现改为了ZIPLIST，ZIPLIST是一个压缩列表，拥有链表的特性，但不通过指针来建立节点之间的联系
* 通过记录前一个节点的大小来查找节点的内存地址，内存连续的，但是倘若数据量巨大，需要申请很大片的连续内存很难
*
* 所以又改为用QucikList，QucikList的每个节点是一个ZipList，通过指针来建立节点之间的联系
* ZipList中的的节点依旧是内存连续，还可以限制节点的大小和对列表中的节点进行压缩。
*
* 查看源码:
* 在Redis3.2版本之前，List类型的底层是采用ZipList和LinkedList结合来实现的，当元素数量小于512并且大小小于64字节时，
* 采用ZipList，超出了否则采用LinkedList、
* 在Redis3.2版本之后，List类型的底层实现被改为统一使用QuickList，
*这是Lpush的源码
* void pushGenericCommand(client *c, int where, int xx) {
  //client *c: 指向客户端的结构体，包含了客户端发送的命令、参数等信息。
  //int where: 指定插入位置。通常为 LIST_HEAD (列表头部) 或 LIST_TAIL (列表尾部)。
  //int xx: 一个标志位。如果为真（非0），则表示“仅当键存在时才操作”（类似 LPUSHX/RPUSHX 的行为）；
  //如果为假（0），则键不存在时会自动创建（类似 LPUSH/RPUSH 的行为）。
    int j;

    for (j = 2; j < c->argc; j++) {
        if (sdslen(c->argv[j]->ptr) > LIST_MAX_ITEM_SIZE) {//从数组中拿出命令段，然后拼接成完整的字符串
            addReplyError(c, "Element too large");
            return;
        }
    }
    //作用：在正式处理前，先检查所有待插入的元素大小。
    // 含义：c->argc 是命令参数的总个数，c->argv 是参数数组。
    //例如 LPUSH mylist a b c，argv[0]是"LPUSH"，argv[1]是"mylist"，从 argv[2] 开始才是待插入的元素 "a", "b", "c"。
    // 这个循环遍历所有待插入元素，如果任何一个元素的大小超过了 LIST_MAX_ITEM_SIZE 限制，就立即向客户端返回一个 "Element too large" 错误并终止操作。
    //这是一种防御性编程，避免处理过大的数据。

    robj *lobj = lookupKeyWrite(c->db, c->argv[1]);
    if (checkType(c,lobj,OBJ_LIST)) return;
    //lookupKeyWrite: 尝试从当前Redis数据库(c->db) 中查找键名为 c->argv[1] (即 mylist) 的对象。
    //checkType: 检查找到的对象 lobj 是否为列表类型 (OBJ_LIST)。如果键存在但不是列表类型（例如是一个字符串），则向客户端返回类型错误并终止。
    if (!lobj) {
        if (xx) {
            addReply(c, shared.czero);
            return;
        }

        lobj = createQuicklistObject();
        quicklistSetOptions(lobj->ptr, server.list_max_ziplist_size,
                            server.list_compress_depth);
        dbAdd(c->db,c->argv[1],lobj);
    }
    //if (!lobj): 如果上一步查找失败，说明这个键不存在。
    // if (xx): 如果 xx 标志为真（例如执行 LPUSHX），则不应该创建新列表。此时向客户端返回 0 (shared.czero) 并终止。
    // createQuicklistObject: 如果 xx 为假（例如执行 LPUSH），则创建一个新的 quicklist 对象。quicklist 是 Redis 3.2 版本后列表的底层实现，它结合了链表和压缩列表（ziplist）的优点。
    // quicklistSetOptions: 设置新创建的 quicklist 的配置参数，如每个节点的最大大小 (list_max_ziplist_size) 和压缩深度 (list_compress_depth)。
    // dbAdd: 将这个新创建的列表对象添加到数据库中，键名为 c->argv[1]。

    for (j = 2; j < c->argc; j++) {
        listTypePush(lobj,c->argv[j],where);
        server.dirty++;
    }
    //作用：遍历所有待插入的元素，并逐个添加到列表中。
    // listTypePush: 这是执行插入操作的核心函数。它会根据 where 参数（LIST_HEAD 或 LIST_TAIL）将元素 c->argv[j] 插入到 lobj 列表的相应位置。
    // server.dirty++: server.dirty 是一个全局计数器，用于记录当前服务器状态相对于持久化文件（RDB/AOF）的“脏”数据量。每次修改数据都递增它，以便决定何时进行数据持久化。

    addReplyLongLong(c, listTypeLength(lobj));
    //作用：向客户端发送回复。

    char *event = (where == LIST_HEAD) ? "lpush" : "rpush";
    signalModifiedKey(c,c->db,c->argv[1]);
    notifyKeyspaceEvent(NOTIFY_LIST,event,c->argv[1],c->db->id);
    //signalModifiedKey: 标记该键已被修改。这对于主从复制和集群环境非常重要。
    // notifyKeyspaceEvent: 触发键空间通知。如果客户端订阅了相关事件（例如 __keyevent@0__:lpush），
    //Redis 会发布一条消息，告知有客户端对该列表执行了 lpush 或 rpush 操作。
}
*
* */


//set类型
/*
Set是Redis中的单列集合，需要满足以下特点
1. 不重复
2. 保存元素唯一性。可以判断元素是否存咋
3、可以求交集、并集、差集
* 之前使用Set的交集来实现共同关注功能
* set集合的底层实现；
可以通过Dict哈希表通过角标快速查询到元素，(哈希表本质就是数组加链表)
也可以通过SkipList跳表的多级指针来快速查询元素，
但是他是通过数值score保存有序的，但是set不是有序的，甚至不一定存数值

实际上，Redis中Set的底层实现是通过HT(哈希表)编码即Dict，利用Dict中的key来存储元素，value统一是null，例如 Sadd S1 a。就是用key来存储元素a
但是Dict的底层的数组中的存储的是指向DictEntry的指针，DictEntry中有存储了指向下一个DictEntry的指针，
因为Dict的内存是碎片化的，不连续，有大量的指针很占内存空间。

为了Redis中提供了第二种实现Set的编码方式，就是Inset编码，只有当存储的数据都是整数并且元素数量不超过set-max-inset-entries的时候才会使用这种编码
这是数据结构的底层使用的是整数数组，所以元素的内存地址是连续的，不需要用大量的指针，从而节省内存空间。


Set的底层源码:
robj *setTypeCreate(sds value) {//初始化(第一次存储的值)Set的RedisObject对象。创建一个RedisObject对象保存数据类型、编码类型和指针
    //判断value是不是数值类型long long
    if (isSdsRepresentableAsLongLong(value,NULL) == C_OK)
    //如果是数值类型，则采用Inset编码
        return createIntsetObject();
    //否则采用Dict编码
    return createSetObject();
}

robj *createIntsetObject(void) {
    intset *is = intsetNew();
    robj *o = createObject(OBJ_SET,is);//创建RedisObject对象
    o->encoding = OBJ_ENCODING_INTSET;//编码改为Intset
    return o;
}

robj *createSetObject(void) {
    dict *d = dictCreate(&setDictType,NULL);
    robj *o = createObject(OBJ_SET,d);
    o->encoding = OBJ_ENCODING_HT;//编码改为Dict
    return o;
}
进行Add命令时
即int setTypeAdd(robj *subject, sds value) {………………}
subject是RedisObject对象保存了数据类型、编码类型和指针
底层会进行判断传的的编码类型是Inset还是HT

如果是Ht直接添加元素

如果是Inset则再次进行判断，如果存储的元素值是不是字符串，
不是的话则
通过ptr指针找到用来存储的数组，判断元素数量是否大于指定的set-max-inset-entries(默认是512）
如果大于了，则将Inset编码转换成Ht编码

元素值是字符串则将Inset编码转换成Ht编码，再添加元素

*
例如:使用setTypeCreate初始化的时候存储的是字符串类型，则初始化的RedisObject对象编码为Dict
下一次添加的元素值不是字符串，
则进行一系列判断看是将Dict编码转换成Inset编码，再添加元素，还是依旧保持Dict编码，再添加元素

* */


//Zset类型
/*
* Zset就是SortedSet，其中每个元素都需要指定一个score值和member值
* 需要可以根据score值进行排序
* member必须唯一(存储相同的member会更新score值)
* 可以根据member值进行查询分数
* 因此zset底层数据结构必须满足键值存储、件必须唯一，可排序。
* 使用SkipList可以实现，SkipList中的每个节点，可以用ele存储member值，用score值保存score值
* 但是SkipList无法通过member值查询score值，而且member不唯一
*
* 也可以通过Dict实现，用key存储member值，value存储score值，但是不能排序
*
* 实际上Redis在实现Zset的底层时，是通过使用SkipList和Dict结合的方式实现的
*
* Zset的数据结构:
* type struct zset {
*   dict *dict;//Dict指针
*   skiplist *zsl;//SkipList指针
*
* }zset;
* 创建Zset对象的源码:
* robj *createZsetObject(void) {
    zset *zs = zmalloc(sizeof(*zs));//申请Zset的内存空间，然后得到一个指向该内存空间的指针
    robj *o;//声明一个RedisObject对象的指针

    zs->dict = dictCreate(&zsetDictType,NULL);//创建Dict对象，并将zs指针赋值给Dict指针
    zs->zsl = zslCreate();//创建SkipList对象，并将zs指针赋值给SkipList指针
    o = createObject(OBJ_ZSET,zs);//创建RedisObject对象，声明是Zset类型，指针为 zs
    o->encoding = OBJ_ENCODING_SKIPLIST;//编码为SkipList，只是显示为SkipList，其实是HT和SkipList两者都用
    return o;//返回RedisObject对象即Zset对象
}
*创建的Zset对象保存了Dict指针和SkipList指针，用Dict进行保证唯一性，和通过member值查询score值，用SkipList进行排序
* 即Zset的底层会存储两个数据结构，一个Dict，一个SkipList，这会很占内存空间，有很多指针，它的查询性能很好
*
* 所以就出现了第二种实现方式，当元素数量不多(小于128个)，无论是用哈希查询还是遍历列表查询，其实查询效率差别不大，HT和SkipList的优势不明显，
* 而且更耗内存，因此zset、会采用ZipList结构来节省内存空间，不过需要满足以下条件：
* 1、元素数量小于zset_max_ziplist_entries(默认是128)
* 2、每个元素小于zset_max_ziplist_value字节(默认是64)
*
*1、提问:ZipList怎么通过member值查询score值呢？
  ZipList 存储 ZSet 时，采用交替存储的方式：
* [member1][score1][member2][score2][member3]，每个 entry 依次存储 member 和 score，形成键值对。
*2、提问:ZipList怎么排序呢？
* 关键点：插入时就保持有序
*   插入流程：
1. 计算新元素的 score
2. 从前往后遍历 ZipList（每次跳过一个 entry，只比较 score）
3. 找到第一个 score > 新元素 score 的位置
4. 在该位置之前插入 [new_member][new_score]
*
*创建zset对象的的源码:
*  zobj = lookupKeyWrite(c->db,key);//根据key找到对应的Zset对象，不存在则创建一个新的Zset对象
    if (checkType(c,zobj,OBJ_ZSET)) goto cleanup;
    //判断是否存在
    * if (zobj == NULL) {
        if (xx) goto reply_to_client;
       //将zset_max_ziplist_entries设置为0表示禁用了ZipList
if (server.zset_max_ziplist_entries == 0 ||
    server.zset_max_ziplist_value < sdslen(c->argv[scoreidx+1]->ptr))//value的大小超过zset_max_ziplist_value字节，则采用SkipList结构
{
    zobj = createZsetObject();//使用SkipList结构
} else {
    zobj = createZsetZiplistObject();//使用ZipList结构
}
dbAdd(c->db,key,zobj);
}
*
* ZAdd添加元素的源码:
* int zsetAdd(robj *zobj, double score, sds ele, int in_flags, int *out_flags, double *newscore) {………………}
* //zobj是创建的Zset对象
* //会先判断编码方式，如果是ZipList结构，判断当前元素是否已经存在，已存在则更新score值，不存在则添加元素
* //不存在的话会判断添加的元素数量是否超过zset_max_ziplist_entries(默认是128)，如果超过则将ZipList结构转换成SkipList结构
*
* 如果编码就是SkipList结构，则添加元素，无需转换
*
*
* 总结:元素数量小于zset_max_ziplist_entries(默认是128)，则采用ZipList结构存储元素
* 元素数量大于zset_max_ziplist_entries(默认是128)，则采用SkipList结构存储元素
* 虽然SkipList结构存储占用的内存空间更多，但是查询性能更好。用空间换时间的策略
*
* */


//Hash类型
/*
* Hash和Redis中的Zset非常类似:
* 都是键值对
* 都需要根据键或者值
* 键必须唯一，值可以重复
* 区别:
* Zset存储的键是member，值是score;hash的键和值可以是任意值
* Zset要根据score排序；hash则无需排序
* Hash的底层实现采用的数据结构是和Zset很类似的，只是不用SkipList，而是只用Dict
* Hash结构默认采用ZipList编码，用以节省内存，ZipList相邻的entry分别存储filed和 value
* 当数据量过大时，ZipList需要大片的连续内存空间，此时就需要改变编码方式为HT编码，触发条件为
* 1、ZipList的元素数量超过hash_max_ziplist_entries(默认是512)
* 2、ZipList的元素大小超过hash_max_ziplist_value字节(默认是64)
*
*hset的命令的底层源码:
* void hsetCommand(client *c) {
    int i, created = 0;
    robj *o;
    if ((c->argc % 2) == 1) {
        addReplyErrorFormat(c,"wrong number of arguments for '%s' command",c->cmd->name);
        return;
    }
    //判断hash的key是否存在，不存在则创建一个，默认采用ZipList编码
    if ((o = hashTypeLookupWriteOrCreate(c,c->argv[1])) == NULL) return;
    //判断是否需要把ZipList结构转换成HT结构，判断是否满足转换条件
    hashTypeTryConversion(o,c->argv,2,c->argc-1);
    //循环遍历每一对filed和value，并执行hset命令
    for (i = 2; i < c->argc; i += 2)
        created += !hashTypeSet(o,c->argv[i]->ptr,c->argv[i+1]->ptr,HASH_SET_COPY);


char *cmdname = c->argv[0]->ptr;
if (cmdname[1] == 's' || cmdname[1] == 'S') {

    addReplyLongLong(c, created);
} else {

    addReply(c, shared.ok);
}
signalModifiedKey(c,c->db,c->argv[1]);
notifyKeyspaceEvent(NOTIFY_HASH,"hset",c->argv[1],c->db->id);
server.dirty += (c->argc - 2)/2;
}
*
* 一定要看看源码！！！
*
*新增和修改之后还会进行判断是否满足会触发转换条件
*
* */
