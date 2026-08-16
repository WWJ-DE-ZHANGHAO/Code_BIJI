//自动垃圾回收
/*
在类被加载到运行时数据区后，JVM会为类的实例分配内存空间，
当对象不再被使用时，执行引擎中的垃圾回收器会自动释放对象占用的内存空间

*在Java自最初版本中就有垃圾回收机制，Java虚拟机在运行时会自动进行垃圾回收
* 而C/C++语言中没有垃圾回收机制，程序员需要手动进行垃圾回收，否则会出现内存泄露
*
* 将这种释放对象的过程称为垃圾回收，而需要程序员编写代码来进行回收的方式为手动垃圾回收
* 内存泄露:是指不再使用的对象在系统中未被回收，内存泄露的积累会导致超过操作系统的内存上限从而导致报错并程序退出，即内存溢出
*
*
* 例如:C语言编写的代码
* int main(){
*  while(true){
*  Test *test=new Test();
*  }
*  return 0;
* }
* 此时每次循环都会创建一个新的Test对象，但是没有进行释放，导致内存泄露，最终会报错并退出程序
*
* 使用C语言的delect关键字可以进行手动垃圾回收
* 即：
* int main(){
* while(true){
*  Test *test=new Test();
* delect test; //将创建的Test对象的内存进行释放
* }
* return 0;
* }

Java中为了简化对象的释放，引入了自动的垃圾回收机制(Garbage Collection简称GC)，通过垃圾回收器来对不再使用的对象完成自动的回收、
，垃圾回收器主要负责对堆上的内存进行回收，其他语言例如:C#、Python、Go都拥有自己的垃圾回收器

注意！！！
垃圾回收器主要负责对堆上的内存进行回收，

自动垃圾回收机制和手动垃圾回收机制的区别:
自动垃圾回收机制:自动根据对象是否使用由虚拟机来回收对象
优点:降低程序员实现垃圾回收的难度，降低对象回收Bug的出现概率
缺点:程序员无法控制对象的回收的及时性

手动垃圾回收机制:程序员需要手动编写代码来进行对象的回收
优点:程序员可以控制对象的回收的及时性
缺点:编写不当容易出现悬空指针，重复释放、内存泄露等问题

自动垃圾回收的引用场景:
1、解决系统僵死的问题:程序在运行中，因为频繁的垃圾回收，导致用户访问时，程序没有响应
2、性能优化:对程序性能进行优化中，就有对垃圾回收器的优化，
3、应对高频面试:常见的垃圾回收器、常见的垃圾回收算法、四种引用、项目中用了哪种垃圾回收器
 */

注意！！！
一旦对象占用的内存被回收释放，这个对象就“不存在”了。
逻辑层面:
在 Java 中，一个对象“活着”的唯一标准是可达性（Reachability）——即是否被 GC Roots（如栈局部变量、静态变量等）引用。
如果内存被回收，说明该对象已经没有任何强引用指向它了。
物理层面:
JVM 将回收的内存标记为空闲（Free）。这块内存会被放入 JVM 的内存分配池（如 TLAB 或空闲列表）中，等待后续新对象的分配。
//方法区回收
/*
*对于运行时数据区中的程序计数器、Java虚拟机栈、本地方法栈。不是线程共享的，不需要进行垃圾回收，
* 因为这些区域的内存分配和回收是由线程的生命周期决定的，随着线程的销毁，内存会自动释放
* 注意！！
* 在Java虚拟机栈和本地方法中的方法的栈帧在方法执行完毕后会自动从栈中弹出，并释放对应的内存空间
*
* 而对于方法区和堆内存是线程共享的，可以被垃圾回收器进行回收释放
  其中方法区存放的是类的结构信息、常量池、静态变量、即时编译器编译后的代码等数据，
* 这些数据在类被加载后就会一直存在，直到类被卸载才会被回收
*
* 方法区中判断一个类是否可以被卸载，需要同时满足下面三个条件:
* 1、该类的所有实例都已经被回收，在堆中不存在任何该类的实例对象以及子类对象
* 2、加载该类的类加载器已经被回收
* 3、该类对应的java.lang.Class对象没有在任何地方被引用
*
* 注意！！
* 想要对象和类加载器以及Class对象被回收，只需要给他们的引用赋值为null即可
* 例如:
* Class<?> clazz=loader.loadClass("com.wwj.jvm.Demo"); //加载Demo类
* Object o=clazz.newInstance(); //创建该类的实例对象
* o=null; //将o引用赋值为null
* clazz=null; //将clazz引用赋值为null
* loader=null; //将类加载器的引用赋值为null
* 但是！！！
* 如果创建的对象未被使用，那么就不用手动将对象的引用赋值为null，因为这个对象会被自动垃圾回收释放
*
* 注意！！！
* 在死循环中创建对象，只要当该轮循环结束后，对象没有被引用，就会被自动垃圾回收释放，不需要手动编写代码来进行回收
* 测试:
* public class Demo{
*    public static void main(String[] args) throws InterruptedException {
*     try{
* ArrayList<Class<?>> list=new ArrayList<>();
* ArrayList<Object> list2=new ArrayList<>();
* ArrayList<URLClassLoader> list3=new ArrayList<>();
*        while(true){
*   URLClassLoader loader=new URLClassLoader(new URL[]{new File("D:\\Java\\JVM\\target\\classes").toURI().toURL()});
*   Class<?> clazz=loader.loadClass("com.wwj.jvm.Demo");
*   Object o=clazz.newInstance(); //如果每次循环没有将创建的对象添加到集合中，
*   //该轮循环结束后，o、clazz、loader的引用都会被回收释放
*       // list.add(clazz);
*      // list2.add(o);
*      //list3.add(loader);
*       //loader=null;
*       //只要这四个被注释，就会达到垃圾回收的条件，类加载器、类对象、实例对象都会被回收释放
*       //但是只要有一个没有被注释，就不会达到垃圾回收的条件，类加载器、类对象、实例对象都不会被回收释放
*      System.gc(); //手动调用垃圾回收器，让其进行垃圾回收,但是只是向JVM虚拟机发出一个垃圾回收请求，
*      是否回收。依旧会判断是否达到垃圾回收的条件
*     }
* }
* catch (Exception e){
*     e.printStackTrace();
* }
*  }
*
*
* 注意！！！
* 可以点击右上角的配置按钮，选择编辑配置，
* 在VM选项中添加-XX:+TraceClassLoading参数和-XX:+TraceClassUnloading参数
* 运行代码时就可以打印出加载的类和卸载的类的日志
* 即:
* Demo类被加载了
* [Unloading class com.wwj.jvm.Demo] //表示卸载了Demo类
* */
注意！！！
问题:
自定的类是由应用程序类加载器加载的，而应用程序类加载器在运行中是不会被回收的，所以自定义的类在运行中是不会被卸载的
不是的。
在OSgi、JSP这些支持热部署的框架中，方法区回收的机制在这些框架中是有意义的
例如:每个jsp文件对应一个类加载器
当一个jsp文件被修改后，就直接卸载原来的类加载器，重新创建新的类加载器来加载新的jsp文件


//堆回收
/*如果判断堆中对象需要被回收?
* 这就需要用到引用计数法和可达性分析法
*
*判断Java中对象是否能被回收，
* 是根据对象是否被引用来决定的，如果对象被引用了，说明该对象还在使用，不允许被回收。
* 例如:
* public class Demo{
*  public static void main(String[] args){
*   Demo demo=new Demo();//会在堆内存中创建一个Demo对象，
*    //在栈的栈帧的局部变量表中给demo变量分配一个引用地址，指向堆内存中的Demo对象
*   demo=null; //将demo变量引用赋值为null,此时demo引用不再指向Demo对象，说明Demo对象不再使用，可以被回收
*  }
* }
* 但是这种说法是不够准确的
* 因为有一个问题，就是如果两个对象互相引用了，但是没有其他对象引用它们，那么这两个对象就无法被回收了
* 例如:
* public class Demo{
* public static void main(String[] args){
* A a1=new A();
* B b1=new B();
* a1.b=b;//将A对象中的b属性引用赋值为B对象的引用地址
* b1.a=a;//将B对象中的a属性引用赋值为A对象的引用地址
* //此时对象a1和b1互相引用了，此时想要将a1和b1回收释放，必须要将a1和b1的引用赋值为null，且a1和b1的属性b和a的引用也要赋值为null
* //但是如果此时在main方法中编写了a1=null;b1=null;此时a1和b1的引用都不再指向A对象和B对象了，
* //虽然A对象和B对象的属性b和a的引用还是互相指向的，但是因为方法中已经没有使用引用去访问A对象和B对象了，所以A对象和B对象就可以被回收释放了
* //这就需要了解引用计数法和可达性分析法
* }
* }
* class A{
* B b;
* }
* class B{
* A a;
* }
* 此时a1和b1互相引用了，但是没有其他对象引用它们，那么这两个对象就无法被回收了
* 但是实际上，这两个对象已经不再使用了，可以被回收
*
* */

//引用计数法
/*
引用计数法会为每个对象维护一个引用计数器(对象刚创建出来时为0)，
当有一个地方引用该对象时，计数器就加1，当引用失效(取消)时，计数器就减1，
*
当JVM虚拟机扫描堆内存发现某个对象的引用计数器为0时，就说明该对象不再使用，可以被回收释放
但是如果两个对象互相引用了，
例如:
* public class Demo{
* public static void main(String[] args){
* A a1=new A();
* B b1=new B();
* a1.b=b;//将A对象中的b属性引用赋值为B对象的引用地址
* b1.a=a;//将B对象中的a属性引用赋值为A对象的引用地址

* }
* }
* class A{
* B b;
* }
* class B{
* A a;
* }
此时A对象和B对象的引用计数器都为2，即使此时将a1和b1的引用赋值为null，A对象和B对象的引用计数器还是为1
那么这两个对象就无法被回收了
这种情况就是引用计数法的一个缺陷，无法解决循环引用的问题，此时就需要用到可达性分析法来解决循环引用的问题
注意！！！
通常Java虚拟机是使用可达性分析法来判断对象是否可以被回收的，而不是使用引用计数法

注意！！！
如果想查看垃圾回收的信息，可以点击右上角的配置按钮，选择编辑配置，
在VM选项中添加-verbose:gc参数，运行代码时就可以打印出垃圾回收的日志信息
在控制台就会打印出类似
[GC (System.gc())  1024K->512K(2048K), 0.0012345 secs]
[Full GC (System.gc())  512K->0K(2048K), 0.0012345 secs]
两行记录表示执行了两次垃圾回收
GC (System.gc())和Full GC (System.gc())表示垃圾回收的类型
1024K->512K(2048K)和512K->0K(2048K)表示垃圾回收前后的年轻代的变化，括号中的是整个堆的大小
0.0012345 secs和0.0012345 secs表示垃圾回收的耗时
* */

//可达性分析法
/*
*Java使用的是可达性分析法来判断对象是否可以被回收的，可达性分析将对象分为两类:垃圾回收的根对象(GC Roots)和普通对象
*对象和对象之间存在引用关系
*
* 注意！！！
* Java虚拟机中GC Roots对象一般是不能被回收的。Java虚拟机会持有一个所有GC Roots对象的列表
* 可达性分析法:指的就是如果从某个GC Root对象开始，通过它的引用链可以访问到某个对象，那么这个对象就是可达的，不会被回收
* 反之，如果从GC Root对象开始，通过它的引用链无法访问到某个对象，那么这个对象就是不可达的，会被回收
* 引用链:指的是从GC Root对象开始，通过引用关系可以访问到的对象的链条
* 即:A对象引用B对象，B对象引用C对象，B对象引用D对象，那么A、B、C、D就是一条引用链,A对象通过B对象可以访问到C对象和D对象
*                     ->D对象
* A对象----->B对象-----|
*(GC Root对象)         ->C对象
*
* 此时如果将A到B的引用关系断开，那么B对象、C对象和D对象就无法被访问到，就会被回收释放
*
* 问题:
* 如何判断一个对象是GC Root对象还是普通对象呢?
* 有四种对象是GC Root对象,其他的对象都是普通对象
* 1、线程Thread对象(线程创建后，这整个线程对象就是线程对象)
* 2、系统类加载器加载的java.lang.Class对象，引用类中的静态变量，(有待商榷,不一定对)
* 注意！！！只有 JVM 启动时“天生自带”的两个加载器（Bootstrap 和 AppClassLoader）加载的类是
*  GC Root；后天人工添加的（扩展、自定义）统统不是。
* 3、监视器对象(Buzy Monitor)、用于保存同步锁synchronized关键字持有的对象
* 4、本地方法调用时使用的全局对象(JNI Global)
*
* 第一种例如:
* public class Demo{
* public static void main(String[] args){
* A a1=new A();
* B b1=new B();
* a1.b=b;//将A对象中的b属性引用赋值为B对象的引用地址
* b1.a=a;//将B对象中的a属性引用赋值为A对象的引用地址

* }
* }
* class A{
* B b;
* }
* class B{
* A a;
* }
* 因为main方法进的方法栈所关联的线程就是一个Thread对象，Thread对象就是GC Root对象，
* 所以栈中可以访问到A对象和B对象，所以A对象和B对象是可达的，不会被回收
* 将a1和b1的引用赋值为null后，A对象和B对象就无法被栈访问到，所以此时A对象和B对象是不可达的，会被回收释放
* 即使A对象和B对象互相引用了
*
* 第二种例如:
* sun.misc.Launcher -->ApplicationClassLoader--> public class Demo{public static A a1=new A(); }
* Launcher是GC Root对象，
* Lanuncher类时JVM内部的引导器类，位于rt.jar中，用于创建启动类、扩展类以及应用程序类加载器
* Lanuncher类内部会通过New创建类加载器对象
* ApplicationClassLoader对象又加载类Demo类到堆内存中，内部会保存Demo类的class对象的地址
* Demo类中有一个静态变量a1引用了A对象，
* 从而形成了一个引用链:Launcher-->ApplicationClassLoader-->Demo类-->A对象
* 只要这个引用链存在，那么A对象就是可达的，不会被回收释放
*
* 第三种
* 监视器对象是指在Java中使用synchronized关键字给某个对象上锁时，JVM会为每个对象创建一个监视器对象，用于保存同步锁
例如:
* synchronized (ReferenceCountingGC.class)
* public class ReferenceCountingGC{
*   public static A a1=new A(); //类被加载到堆内存中后，静态变量也会被放在堆内存中的Class对象中，静态变量a1引用了A对象
* }
* 此时JVM会为ReferenceCountingGC类的class对象创建一个监视器对象，这个监视器对象就是GC Root对象
*会保存ReferenceCountingGC类的class对象的引用地址
* 此时对象A因为被ReferenceCountingGC类的静态变量a1引用，所以A对象是可达的，不会被回收释放
*
*
* 第四种:
* 本地方法是由JVM虚拟机控制调用的，所以不需要程序员过度的关注
*
*
*注意！！！
* 查看GC Root对象的方法:通过arthas和MAT工具可以查看GC Root对象
*步骤:
*1、使用Arthas的heapdump 保存路径+文件名(.hprof)命令,将堆内存快照保存到本地磁盘中
*2、使用MAT工具打开堆内存快照文件，查看对象的引用关系
*3、选择GC Roots工具查看所有的GC Root对象
* */


//软引用
/*
*除了上述可达性算法中通过GC Root对象引用普通对象的这种引用关系外，Java还提供了其他引用
* GC Root对象引用普通对象的这种引用关系是属于是强引用，只要强引用存在，即使内存不足，普通对象就不会被回收释放
* Java还提供了软引用、弱引用、虚引用以及终结器引用
*
* 软引用:相比于强引用是一种比较弱的引用关系，如果一个对象只有软引用关联到它，当程序内存不足时，就会将软引用中的数据进行回收
* 在JDK1.2版本之后提供了SoftReference类来实现软引用，不能使用软引用关联一些重要的数据。软引用常用于缓存中
* (缓存一般是用于提高程序的性能，即使缓存中的数据被回收了，因为内存中还有数据，因此也不会影响程序的正常运行)
*
* 使用SoftReference类实现软引用的步骤:
* new SoftReference<对象类型>(对象) //创建一个软引用对象，相当于是在堆内存中创建一个软引用的空间，然后在这个空间中创建了一个对象
* 如果内存不足时，虚拟机会进行垃圾回收，如果垃圾回收仍不能解决内存不足的问题，那么就会回收软引用中的对象
* 、如果依旧不能解决内存不足的问题，那么就会抛出OutOfMemoryError异常
* 例如:
* byte[] data=new byte[1024*1024*10]; //创建一个10M的数组对象
* SoftReference<byte[]> softReference=new SoftReference<byte[]>(data);
* //创建一个软引用对象，softReference引用了data数组对象
* 注意！！！
* 最好data=null; //将data引用赋值为null，就能将强引用断开，只使用软引用来引用data数组对象
*
*
* 测试:将堆内存的大小设置为200mb
* public class Demo{
* public static void main(String[] args){
* byte[] data=new byte[1024*1024*10]; //创建一个10M的数组对象
* SoftReference<byte[]> softReference=new SoftReference<byte[]>(data);
* data=null; //将data引用赋值为null，就能将强引用断开，只使用软引用来引用data数组对象
* System.out.println(softReference.get()); //打印出软引用中的对象地址
*
* byte[] data2=new byte[1024*1024*10]; //创建一个10M的数组对象，此时会把软引用回收掉
* System.out.println(softReference.get()); //打印出软引用中的对象地址
* }
* }
* 运行结果:
* [B@1b6d3586 //打印出软引用中的对象地址
* null //打印出软引用中的对象地址为null，说明data数组对象被回收释放了
如果再创建一个10M的数组对象，此时即使将软引用回收了，依旧会把内存不足导致OutOfMemoryError异常抛出
*
* 注意！！！
* 上述的软引用回收只是将软引用中的对象回收了，但是软引用对象本身还是存在的
* 但是如何知道哪些SoftReference对象需要被回收呢?
* SoftReference类中提供了一套队列机制:
* 1、软引用创建时，通过构造器传入引用队列的对象
* 2、在软引用中包含的对象被回收时，该软引用对象会被放入引用队列
* 3、通过代码遍历引用队列，将SoftReference的强引用断开，就可以将SoftReference对象回收释放
*
* 测试:
* public class Demo{
* public static void main(String[] args){
* ReferenceQueue<byte[]> referenceQueue=new ReferenceQueue<byte[]>(); //创建一个引用队列对象
* ArrayList<SoftReference> list=new ArrayList<>(); //创建一个软引用集合
* for(int i=0;i<10;i++){
* byte[] data=new byte[1024*1024*100]; //创建一个100M的数组对象
* SoftReference softReference=new SoftReference<byte[]>(data,referenceQueue);
* //创建一个软引用对象，softReference引用了data数组对象,并将引用队列对象传入软引用对象的构造器中，底层会将对象被回收时的软引用对象放入引用队列中
* list.add(softReference); //将软引用对象添加到集合中，防止软引对象用因为没有被引用而被回收释放
* }
*
* SoftReference<byte[]> reference=null;//创建一个空指向的软引用对象，用于接收引用队列中的软引用对象
* int count=0; //计数器，用于统计回收了多少个软引用对象
* while((reference=(SoftReference<byte[]>) referenceQueue.poll())!=null){
* //将引用队列中的软引用对象使用poll弹出，并赋值给reference，直到引用队列为空
* count++; //计数器加1
* }
* System.out.println("回收了"+count+"个软引用对象");
* 将堆内存的大小设置为200mb，运行结果:
* 回收了9，因为最多只能创建一个100M的数组对象，每轮循环结束都会把上轮创建的数组对象回收释放，软引用对象也会被放入引用队列中，
* 只有最后一个软引用对象没有被回收释放
*
* 注意！！！
*Java中提供了一个缓存框架Caffeine，Caffeine在创建缓存对象的时候，可以将value值设置为软引用
* ，这样当内存不足时，缓存中的value值就会被回收释放
* 即:Cache<Object ,Object> build=Caffeine.newBuilder().softValues().build();
*
* 注意！！
* SoftReference类中是可以被继承的，还能指定泛型类型，
* 例如:public class MySoftReference extends SoftReference<Student>{}//创建一个继承SoftReference类的MySoftReference类，用于引用Student对象
*
* */
练习:使用软引用实现学生数据的缓存，自动回收缓存中的数据的程序
需要创建一个Cache类，用于缓存学生数据，缓存中的数据使用软引用来引用
一个HashMap集合用于存放缓存中的数据，key为学生的ID，value为软引用对象
通过一个方法来获取学生数据，如果缓存中有数据，就直接返回缓存中的数据，如果缓存中没有数据，就从数据库中获取数据，并将数据放入缓存中
通过一个方法来清理缓存中的数据，将引用队列中的软引用对象从缓存中移除
即:


//弱虚终结器引用
/*
*弱引用的整体机制和软引用基本一致，区别在于弱引用包含的对象在垃圾回收时，不管内存够不够都会直接被回收
* 在JDK1.2版本之后提供了WeakReference类来实现弱引用，弱引用主要在ThreadLocal类中使用
* 弱引用对象本身也可以使用引用队列进行回收
*测试:
* public class Demo{
* public static void main(String[] args){
* byte[] data=new byte[1024*1024*100]; //创建一个100M的数组对象
* WeakReference weakReference=new WeakReference<byte[]>(data);
* data=null; //将data引用赋值为null，就能将强引用断开，只使用弱引用来引用data数组对象
* System.out.println(weakReference.get()); //打印出弱引用中的对象地址
*
* System.gc(); //手动调用垃圾回收器，让其进行垃圾回收
* System.out.println(weakReference.get()); //打印出弱引用中的对象地址
* }
* }
* 运行结果:
* [B@1b6d3586 //打印出弱引用中的对象地址
* null //打印出弱引用中的对象地址为null，说明data数组对象被回收释放了
*
* 虚引用:也叫幽灵引用/幻影引用，不能通过虚引用对象获取包含的对象
* (不能像弱引用weakReference.get()和软引用softReference.get()这样通过get方法获取包含的对象)，
* 虚引用唯一用途是当对象被垃圾回收器回收时，
* 可以接收到对应的通知。Java中使用PhantomReference类来实现虚引用，直接内存为了及时知道直接内存对象不再使用，
* 从而回收内存，使用了虚引用来实现
* 应用场景:
*ByteBuffer directBuffer=ByteBuffer.allocateDirect(1024*1024*10); //创建一个直接内存对象
*directBuffer=null; //将directBuffer引用赋值为null
*虽然将直接内存对象回收了，但是申请的内存还在，此时就需要PhantomReference类告诉我们直接内存对象已经被回收了，
* 可以回收申请的内存
*
* 终结器引用:指的是在对象需要被回收时，对象将会被放置在Finalizer类中的引用队列中，
* 并在稍后由一条由FinalizerThread线程从队列中获取对象，然后，执行对象的finalize()方法，
* 在这个过程中可以在finalize()方法中再将自身对象使用强引用关联上，但是不建议这样做，如果耗时过长会影响其他对象的回收

* */




