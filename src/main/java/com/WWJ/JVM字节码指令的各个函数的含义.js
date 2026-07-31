//JVM指令
/*
* JVM 字节码指令分类通俗解读（面试够用，按功能分组）
先记住核心规则：
栈指令：操作虚拟机栈【操作数栈、局部变量表】
对象 | 数组指令：创建对象、访问数组
字段访问：成员变量、静态变量读写
方法调用指令（重中之重！面试高频）
控制跳转、异常、同步、常量加载
* /


//一、局部变量和操作数栈之间的数据传递的指令。局部变量表 ↔ 操作数栈【load /store】
/*
load：局部变量 → 压入操作数栈(将局部变量中的值复制一份放到操作数栈中)
store：操作数栈弹出 → 存入局部变量表
后缀区分类型：
i int；l long；f float；d double；a引用类型 (Object)
_n = 简写版本，0/1/2/3，例如 aload_0
plaintext
aload        加载引用类型变量到栈
aload_<n>
astore       保存引用到局部变量
astore_<n>

iload / iload_n / istore / istore_n    int
lload / lload_n / lstore / lstore_n    long
fload / fload_n / fstore / fstore_n    float
dload / dload_n / dstore / dstore_n    double
 */

//二、常量压栈指令（const /push/ldc）
 /*
plaintext
aconst_null        压入null引用
iconst_<i>         iconst_0 ~ iconst_5、iconst_m1 小int常量
lconst_<l>         lconst_0、lconst_1 long常量
fconst_<f>         fconst_0~2 float
dconst_<d>         dconst_0、dconst_1 double

bipush    单字节常量(-128~127)入栈
sipush    双字节常量(-32768~32767)入栈

ldc       加载常量池项：字符串、数字、Class
例如:ldc #2 <java/lang/String "Hello World!">,表示将常量池中编号为2的字符串字面量"Hello World!"压入操作数栈
ldc_w     ldc宽版本
ldc2_w    long/double（占2栈帧）
 */

//三、数组操作指令 [x]aload / [x]astore
/*
Xaload：数组下标取值 → 入操作数栈
Xastore：操作数栈顶部的数据值存入数组指定下标
plaintext
aaload/aastore    Object[] 引用数组
baload/bastore    byte[] / boolean[]
caload/castore    char[]
saload/sastore    short[]
iaload/iastore    int[]
laload/lastore    long[]
faload/fastore    float[]
daload/dastore    double[]

arraylength       获取数组长度，栈顶弹出数组引用，压入长度
*/

//四、对象创建 & 类型检查
/*plaintext
new               创建对象（分配堆内存，**未调用构造器**！）
newarray          创建基础类型数组 int[] long[]
anewarray         创建引用类型数组 String[]
multianewarray    多维数组

checkcast         强制类型转换 (User)obj
instanceof        判断对象类型，返回boolean
*/

//五、成员变量 / 静态变量读写
/*
plaintext
getfield       获取**实例成员变量**（对象属性）
putfield       设置**实例成员变量**

getstatic      获取**静态变量 static**
putstatic      设置**静态变量 static**
*/

//六、【超级重点】五大方法调用指令（面试必考）
/*invokevirtual
调用实例普通方法；动态分派（支持多态重写），绝大多数对象方法。
obj.test() 优先这个
invokespecial
调用私有方法、构造方法<init>、父类方法 super.xxx ()；静态绑定，无多态。
invokestatic
调用 static 静态方法，最简单，不需要对象实例。
invokeinterface
调用接口中的抽象方法，接口引用调用方法。
invokedynamic
JDK8 新增！Lambda 表达式、方法引用核心指令，实现动态语言支持。
*/

//七、方法返回指令
/*plaintext
ireturn      返回int/short/byte/char/boolean
lreturn      返回long
freturn      返回float
dreturn      返回double
areturn      返回引用类型Object
return       void方法无返回值
*/

//八、运算指令（加减乘除、位运算、类型转换）
/*算术运算
iadd,ladd,fadd,dadd 加法
isub,lsub,fsub,dsub 减法
imul,lmul,fmul,dmul 乘法
idiv,ldiv,fdiv,ddiv 除法
irem,lrem,frem,drem 取余
ineg,lneg,fneg,dneg 取负数
类型转换 x2y，将x类型转换为y类型
plaintext
i2b i2c i2s i2l i2f i2d
l2i l2f l2d
f2i f2l f2d
d2i d2l d2f
例：i2l  int → long
位运算
iand/land 与；ior/lor 或；ixor/lxor异或
ishl/lshl左移；ishr/lshr算术右移；iushr/lushr无符号右移
比较指令
dcmpg/dcmpl double 比较
fcmpg/fcmpl float 比较
lcmp long 比较
*/

//九、栈复制、弹出操作（dup/pop/swap）
/*操作操作数栈，用于复制栈顶元素
plaintext
pop        弹出1个栈元素（单字宽：int/引用）
pop2       弹出2个字宽 long/double

dup        复制栈顶1个
dup_x1
dup_x2
dup2
dup2_x1
dup2_x2

swap       交换栈顶两个元素
nop        空指令，啥也不干
*/

//十、流程控制：跳转、分支
/*plaintext
goto / goto_w          无条件跳转
if<cond>               ifeq ifne iflt ifgt 等，栈顶boolean判断
ifnull / ifnonnull    判断引用是否null
if_icmp<cond>          两个int数值比较跳转
if_acmp<cond>          两个引用 == / != 判断

tableswitch    连续switch-case
lookupswitch   稀疏不连续switch-case
jsr / jsr_w / ret 早期异常finally实现，现代几乎废弃
*/

//十一、异常 & 同步锁
/*plaintext
athrow          抛出异常 throw xxx
monitorenter    synchronized 进入锁
monitorexit     synchronized 释放锁
面试核心背诵精简总结
new ≠ 调用构造方法
new 分配内存 → invokespecial <init> 才执行构造器
方法调用区分
invokevirtual：普通实例方法，动态分派（多态）
invokespecial：构造、super、私有方法
invokestatic：静态方法
invokeinterface：接口方法
invokedynamic：lambda
getfield = 实例变量；getstatic = 静态变量
aload_0 永远代表 this（实例方法内
* */