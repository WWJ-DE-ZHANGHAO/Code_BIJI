//类的生命周期
/*
*类的生命周期分为五个阶段：加载(Loading)、连接(Linking)、初始化(Initialization)、使用(Use)以及卸载(Unloading，主要是垃圾回收中用到)。
* 其中连接(Linking)阶段又分为三个子阶段：
* 验证(Verify)、准备(Prepare)、解析(Resolve)
* */

//加载阶段
/*
*1、加载阶段第一步是类加载器根据类的全类名通过不同的渠道以二进制流的形式获取字节码信息
*不同的渠道包括:本地字节码文件、程序运行时动态代理生成的类、通过网络传输的类
* 程序员可以使用Java代码拓展不同的渠道，比如;需要将类持久化到数据库中，再从数据库中获取字节码信息
*
* 2、类加载器将类的字节码信息加载到内存中
*
* 3、类加载器在加载完类之后，Java虚拟机会将字节码中的信息保存到方法区中，
* 生成一个InstanceKlass(为了和源代码中的Class区分开，这个对象是用C++编写的)对象,
* 保存类的所有信息，里面还包含实现特定功能比如多态的信息
* 包括:字节码文件的基本信息、常量池、字段信息、方法信息、属性信息，对于特定功能还有其他的信息(比如实现多台的虚方法表)
* 注意！！！
* 方法区只是java虚拟机规范中的一个虚拟概念，不同款甚至不同版本的的Java虚拟器器设计方法区的时候都用到了不同的内存空间
* 在jdk1.8之前，是使用的堆内存中的永久代来实现方法区的功能
* 在jdk1.8之后，是使用的堆内存中的元空间来实现方法区的功能
*
* 4、除了将字节码保存到方法区中，Java虚拟机还会在堆内存中创建一份和方法区中数据类似的Java.lang.Class类的对象
* 作用是在Java代码中去获取类的信息以及存储静态字段的数据(JDK8及之后),
* 用于通过反射获取类中的方法和成员变量的信息，
* Class clazz=String.class;//使用Class类
* clazz.getMethods();clazz.getFields();clazz.getConstructors();等等
*
* 注意!!!
* 方法区和堆之间是相互关联的，可以通过方法区中的InstanceKlass对象获取堆内存中对应的Class对象，
* 也可以通过堆内存中的Class对象获取方法区中对应的InstanceKlass对象
*
* 在堆的Class对象中还会存放一份静态字段的数据，之后在类里面创建的静态变量，
* 它的真实数据就会存放在堆中的Class对象中的静态字段数据中
*
* 使用Jdk字段的hsdb工具可以查看Java虚拟机内存信息，
* 工具位于安装目录下lib文件夹中的sa-jdi.jar文件中，
* 使用命令java -cp sa-jdi.jar sun.jvm.hotspot.HSDB启动工具
  注意！！！
  sa-jdi.jar 只存在于 JDK8 及更早版本；JDK9 + 模块化改造后彻底删除，不再提供这个 jar 包
JDK9之后是使用 jhsdb工具，会放在在bin\jhsdb.exe
如果配置了环境变量，在任意地方打开cmd窗口，输入jhsdb hsdb
系统会自动去 PATH 里找到 jhsdb.exe 执行。
如果没配环境变量（临时执行方案）
先切到 JDK bin 目录执行
cmd
cd /d D:\Java\OPJDK17\bin
jhsdb hsdb

* 会打开一个可视化界面，点击File然后点击Attach to HotSpot process，
* 弹出一个窗口，选择一个Java进程ID，点击Ok
* 再点击Tools里面的Objects Histogram，弹出一个窗口,会展示整个Java虚拟机创建的各个类型的对象
* 点击要找的自定义类，双击后会弹出一个窗口，
里面有一个是创建的自定义类的对象在JVM堆内存中的虚拟内存地址、创建的对象在虚拟机中的的名字、
InstanceKlassforxx描述自定义类的元空间中元信息的结构

元空间:JVM虚拟机对方法区的实现

点击下方的Inspect 按钮，会打开一个窗口，
顶部的文件夹名字是是创建的类对象和其在堆内存中的虚拟内存地址，即Oop fro xxxx @xxxxxx
这个文件夹包含了一个文件夹，名字是这个对象所指向的元空间(即JVM为这个类创建的InstanceKlass对象的虚拟内存地址），,
即_metadata_compresed_klass:instanceKlass for xxxx
这个文件夹中包含了，
以这个元空间所关联的堆区中的Class对象的虚拟内存地址的命名的文件夹即
Oop for java.lang.Class @xxxxxx(即JVM为这个类创建的 Class对象的虚拟内存地址)
 */

这个文件夹中就是创建的类中的静态变量的数据
！！！！
所以，静态字段的数据存放在堆内存中的Class对象中，
 */


小技巧:
打开cmd窗口，执行jps命令，可以查看所有当前运行中的Java进程(进程ID和类名)

面试:
为什么类加载要将字节码文件加载内存中后，要分成两份数据，一份放在方法区中，一份放在堆内存中，不能只放在方法区中吗?

第一:因为方法区中的InstanceKlass对象是用C++编写的，开发者使用的Java代码不能直接去操作InstanceKlass对象，
因此JVM虚拟机就在堆上创建一份Java.Lang.Class这种用Java语言包装之后的对象，
可以让我们在Java代码中去获取类的信息以及存储静态字段的数据(JDK8及之后)

第二:因为方法区中的不是所有信息都需要用到的，像是虚方法表，
所以只将我们用得到的信息放到堆区中的Class对象中，这样开发者只需要去访问Class对象
Class只包含需要用到的方法和字段，

这样的设计，可以很好的控制开发者访问数据的范围、提升了数据的安全性。


大大注意！！！！！！！！
是每个类的.class字节码文件，都单独对应一个InstanceKlass对象和一个Class对象，两个对象是相互关联的
不是整个方法区和整个堆内存中只有一个InstanceKlass对象和一个Class对象

//连接阶段
/*
*连接部分是分成了三个子阶段
* 1、验证阶段:验证内容是否满足《Java虚拟机规范》的要求，这个阶段程序员是不需要参与的
* 验证通过后才会进入下一个阶段
* 主要包含四部分校验:
* 1、文件格式验证:验证字节码文件的魔数、主次版本号、常量池、字段表、方法表、属性表
* 2、元信息验证:例如类必须有父类(super不能为空),即字节码文件中的父类索引必须有
* 3、校验程序执行指令的语义，比如方法内的指令执行中跳转到不确定的位置
* 4、符号引用验证、例如是否访问了其他类中的private的方法等
* 注意！！！
* 其中对于版本号的检测是需要人工去校验的
* 一段JDK8中的源码:
* return (major>=JAVA_MIN_SUPPORTED_VERSION
* && major<=max_version) && ((major!=max_version)
* ||(minor<=JAVA_MAX_SUPPORTED_MINOR_VERSION));
* JAVA_MIN_SUPPORTED_VERSION表示当前JDK支持的最小主版本号，即45
* JAVA_MAX_SUPPORTED_MINOR_VERSION表示当前JDK支持的最大次版本号，即0
* major为主版本号，minor为次版本号
* 总的就是说主版本号不能高于运行环境主版本号，如果主版本号等于最高主版本号，那么次版本号不能高于运行环境次版本号
*
* 2、准备阶段:给类的静态变量分配堆内存并设置默认初始值，
* 注意！！！这里是设置默认初始值，而不是设置我们在类中定义的初始值
* (int/short/byte类型的默认初始值是0，long类型为0L、boolean为false、String类型的默认初始值是null)
* 例如:
* public class Test{
*     public static int a=1;
*     public static String b="test";
* }
* 在准备阶段，在堆内存中的Class对象中为a设置默认初始值0，为b设置默认初始值null
* 在后续的初始化阶段，才会将a设置为1，b设置为"test"
* 这样设计是因为
* 如果不给静态变量设置初始值，万一在内存区域有之前残留的值，此时再把这个静态变量打印出来
* ，会出现随机值，造成了数据安全问题
*
* 但是注意！！！
* 如果静态变量是用final修饰的常量，那么在准备阶段就会
* 直接在堆内存中的Class对象中设置为你定义的初始值，而不是默认初始值
* 加了fianl，就在编译阶段就能确定静态变量的初始值
*
* 3、解析阶段:将常量池中的符号引用替换为指向内存的直接引用
* 符号引用就是在字节码文件中使用编号(cp_info#6)，来访问常量池中的内容
* 直接引用不再使用编号，而是使用内存中地址进行访问具体的数据
* 例如:public class java lang Object@0x00000007c0000f28
*
* 使用HSDB工具中的CLassBrowser工具查看Class对象的虚拟内存地址
* 还能看到父类的虚拟内存地址，父类的父类的虚拟内存地址，直到Object类的虚拟内存地址
* */

//初始化阶段
/*
*初始化阶段会执行静态代码块中的代码，并为静态变量赋值
*初始化阶段会执行字节码文件中的clinit(class init)方法部分的字节码指令
*例如:
* public class Demo{
public static int a=1;
static{
* a=2;
* }
* public static void main(String[] args){
* System.out.println(Demo.a);
* }
*
* 将该类编译后的字节码文件中，会看到三个方法:无法构造方法、main方法、clinit初始化方法
* clinit方法中的指令为
* 0: iconst_1 // 将1放到操作数栈中
* 1: putstatic #2 <Demo.a> // 将操作数栈中的最顶部的数值，赋值给常量池中的Demo类中的静态变量a。
* 也就是常量池中编号为2的变量
* 4: iconst_2 // 将2放到操作数栈中
* 5: putstatic #2 <Demo.a> // 将操作数栈中的最顶部的数值，赋值给常量池中的Demo类中的静态变量a
* 8: return
*
* 可以看到，clinit方法中先将1赋值给a，再将2赋值给a，最后打印出来的结果是2
* 可以在编写一个
* public class Demo2{
* static{
* a=2;
* }
* public static int b=1;
* public static void main(String[] args){
* System.out.println(Demo.a);
* }
* }
查看字节码文件中clinit方法的字节码指令
* 0: iconst_2 // 将2放到操作数栈中
* 1: putstatic #2 <Demo.a> // 将操作数栈中的最顶部的数值，赋值给常量池中的Demo类中的静态变量a。
* 4: iconst_1 // 将1放到操作数栈中
* 5: putstatic #3 <Demo.b> // 将操作数栈中的最顶部的数值，赋值给常量池中的Demo类中的静态变量b。
* 8: return
*
*总结:
*clinit方法中的执行顺序和Java中的编写顺序是一样的，
* 不会先执行静态变量的赋值，再执行静态代码块中的代码
* */
面试问题:
有哪些中方式会触发类的初始化？
1、访问一个类的静态变量或者静态方法
注意！！！如果访问的变量是final修饰的并且等号右边是常量不会触发类的初始化
2、调用Class.forName(全类名)方法进行创建Class对象
3、new一个类对象时
4、执行Main方法的当前类

注意！！！
在配置类的编辑配置中，添加虚拟参数，并在新增的的VM options中
添加-XX:+TraceClassLoading参数，
代码执行时就可以打印出加载并初始化的类是哪些

注意！！！
如果一个类中有多个触发类初始化的方式，那么只要第一个条件被满足，就会触发类的初始化
执行其他条件，类就不会被再次初始化

面试高频问题:
public class Test1{
 public static void main(String[] args){
  System.out.println("A");
  new Test1();
  new Test1();
}
 public Test1(){
  System.out.println("B");
 }
{
 System.out.println("C");
}
static {
 System.out.println("D");
}

}

请问输出的结果是什么？
查看字节码文件中clinit方法中的字节码指令为
0: getstatic #2 <java.lang.System.out> //表示将常量池中过的System类中的静态变量out放到操作数栈中
1: ldc #3 <java.lang.String.D> //表示将常量池中的编号为3的字符串"D"放到操作数栈中
2: invokevirtual #4 <java.io.PrintStream.println>
//弹出操作数栈中的两个数据，"D"和out，调用常量池中编号为4的PrintStream类中的println方法
//调用方法 out.println("D")输出"D"

main()方法中的字节码指令为
0: getstatic #2 <java.lang.System.out> //表示将常量池中过的System类中的静态变量out放到操作数栈中
1: ldc #3 <java.lang.String.A> //表示将常量池中的编号为3的字符串"A"放到操作数栈中
2: invokevirtual #4 <java.io.PrintStream.println>
//弹出操作数栈中的两个数据，"A"和out，调用常量池中编号为4的PrintStream类中的println方法

init()构造方法的字节码指令为
0 aload_0 //将局部变量表中下标为0的this对象放到操作数栈中
1 invokespecial #5 <java.lang.Object.<init>> //调用父类Object的构造方法
4 getstatic #2 <java.lang.System.out> //表示将常量池中过的System类中的静态变量out放到操作数栈中
7 ldc #5 <java.lang.String.C>
9 invokevirtual #4 <java.io.PrintStream.println>
12 getstatic #2 <java.lang.System.out> //表示将常量池中过的System类中的静态变量out放到操作数栈中
15 ldc #6 <java.lang.String.B>
17 invokevirtual #4 <java.io.PrintStream.println>
20 return


因为先进行类的初始化，执行clinit方法，再按顺序执行类中的方法
又因为初始化时，会先执行静态代码块中的代码，并给静态变量的赋值
再执行main方法的代码，再执行两次构造方法中的代码
构造方法中先执行super、再执行实例代码块、再执行构造方法中的代码

因此最终的输出结果为
D
A
C
B
C
B

注意！！！！
当你写代码：System.out.println("D")
编译器做两件关键事：
解析方法签名：println(String)，得到形参数量 = 1
生成字节码时，强制按规则生成指令：
先压入 this (即方法的调用者out) → 再依次压入所有实参 ("D")
最后输出 invokevirtual
编译器保证：到达这条 invokevirtual 的时候，栈上一定已经准备好了【this + 全部参数】。


注意！！！
类中的已经进行初始化的成员变量和实例代码块(非静态代码块)在类被编译后，都会被放置到类中的所有构造函数中
面试问题1:
这样设计的原因是什么？
设计原因：
Java 语法要求：不管调用哪个构造器，实例代码块都必须执行
一个类可以有多个重载构造方法。
如果代码块独立存在，JVM 就要额外逻辑：每次 new 对象，先执行代码块再执行构造，复杂度高。

编译器做简化处理（javac 的编译优化）
最简单的实现方案：
编译阶段，直接把代码块里面的代码，拷贝到类的每一个构造方法内部。

面试问题2:
那构造方法执行时内部的，执行顺序是怎么样的呢？
按照Java代码的编写顺序，会将实例代码块放在super()之后，构造方法的代码之前
已经初始化的成员变量会放在super()之后，实例代码块之前
所以执行顺序为:
1、先执行super()，即父类的构造方法
3、再执行子类的成员变量的初始化
3、再执行子类的实例代码块



注意！！！
clinit方法在以下的情况时，不会出现
1、无静态代码块且无静态变量
2、有静态变量的声明，但是没有对静态变量赋值
3、静态变量进行了赋值，但是用final修饰了，这类变量会在连接阶段的准备阶段就进行初始化

注意！！！
如果有继承的类，初始化阶段会有以下情况
1、直接访问父类的静态变量，不会触发子类的初始化
2、子类初始化clinit调用之前，会先调用父类的clinit初始化方法

面试高频问题:
public class Demo2{
 public static void main(String[] args){
  new B02();
  System.out.println(B02.a);
 }
}
Class A02{
 static int a = 0;
 static{
  a=1;
 }
}
Class B02 extends A02{
 static{
  a=2;
 }
}
请问输出结果是什么？

答:
因为Demo类中没有静态代码块和静态变量，所以没有clinit
会最先执行main中的代码
因为B02继承A02，new B02()会强制执行B02的clinit方法，
但是执行B02的clinit方法之前，会先执行A02的clinit方法
A02的clinit方法中会先给a赋值为0，再给a赋值为1
B02的clinit方法中会给a赋值为2
所以最终输出结果为2

如果将new B02()注释掉，直接打印B02.a
会直接访问继承自父类的静态变量，不会触发子类的初始化
所以输出结果为1

注意！！！
1、如果final修饰的静态变量的赋值内容需要执行指令才能得到结果，会执行clinit进行初始化
public static final int a = new Random().nextInt();
2、数组的创建是不会导致数组中元素对应的类进行初始化的
例如: Student[] students = new Student[10];
