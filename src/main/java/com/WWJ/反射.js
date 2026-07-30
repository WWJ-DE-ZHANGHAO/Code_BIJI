//反射
/*
* 反射允许对封装类(这里指的是不知道类中的信息)的字段(成员变量/属性)、方法和构造函数的信息进行编程访问
* 为什么要用反射获取封装类的信息，不能直接进行IO流读写吗？
* 因为使用IO流进行读写时，如果该类中的成员变量和局部变量的类型和名称相同，就无法知道获取到的是什么变量
* 而使用反射可以将封装类中的所有信息都获取出来，
*
* 对于字段:可以获取修饰符、获取名字、获取类型、并对拿出来的字段进行赋值、获取字段的值、判断字段是否存在等等
* 对于构造方法:可以获取修饰符、获取名字、获取参数类型、并对拿出来的构造方法进行创建对象
* 对于成员方法:获取修饰符、获取名字、获取参数类型、获取返回值类型、方法抛出的异常，方法的注解，还可以运行获取出来的方法
* 以上都是分为两部分。先获取，再对获取的信息进行解剖
*
* 必须先获取Class字节码文件对象，再通过Class对象获取字段、构造方法、成员方法
*
*
* */

//获取Class字节码文件对象的方式
/*
* 第一种:通过Class.forName("全类名")获取该全类名对应的Class对象
* 第二种:通过对象.getClass()获取Class对象
* 第三种:通过类名.class获取Class对象
*
* 三种方式的应用场景:
* 想要创建一个类的对象是分为以下三个阶段的
* 第一:需要先将Java文件编译成class字节码文件(这是在硬盘中进行的操作,这个阶段也叫做源代码阶段)
* 在这个阶段，使用的是Class.forName("全类名")获取Class对象
*
* 第二:将class字节码文件加载导内存当中(这个阶段也叫做加载阶段)
* 在这个阶段，使用的是类名.class获取Class对象
*
* 第三:在内存当中创建这个类的对象(这个阶段也叫做运行阶段)
* 这个阶段，使用对象.getClass()获取Class对象
*
*
* 在实际操作中，主要是以第一种方式为主
* 第二种方式更多是当做参数进行传递的，
* 例如:在悲观锁Synchronized锁中，使用类名.class获取Class对象作为获取锁的对象
*  synchronized (Student.class){
* }
* */
注意！！！
Java中有一个思想：一切皆对象
字节码文件可以看作Class类的对象
构造方法可以看作是Constructor类的对象
成员方法可以看作是Method类的对象
成员变量可以看作是Field类的对象
//反射获取构造方法
/*
*Class类中用于获取构造方法的方法
getConstructors()：获取所有的公共构造方法的数组
getDeclaredConstructors()：获取所有的构造方法(包括私有、受保护、默认、公有)的数组
getConstructor(Class<?>... parameterTypes)：获取指定参数列表的单个公共构造方法
getDeclaredConstructor(Class<?>... parameterTypes)：获取指定的参数列表的单个构造方法(包括私有、受保护、默认、公有)
例如:
Class clazz = Class.forName("com.WWJ.Student");//获取Student类的Class对象
Constructor con1 = clazz.getConstructor();//表示获取空参的公共构造方法
Constructor con2 = clazz.getDeclaredConstructor(String.class,int.class);
//表示获取参数类型为String和int的构造方法(包括私有、受保护、默认、公有)

构造方法对象调用getModifiers()方法获取修饰符，
返回的是1表示public，返回的是2表示private，返回的是4表示protected，
引用场景:当类中有多个不同修饰符的构造方法时，
使用构造方法创建对象时，会发现如果修饰符为private时，Idea不会给出提示，
这是因为
IDEA通过反射，用构造函数的对象调用getModifiers()方法获取构造方法的修饰符，
发现是private修饰符，所以Idea不会给出提示，提示是根据修饰符来判断的

构造方法对象调用getParameterTypes()方法获取参数类型，返回的是一个Class数组，
构造方法对象调用getParameterCount()方法获取参数个数，返回的是一个int类型的值，
构造方法对象调用getParameters()方法获取参数信息，返回的是一个Parameter数组

Constructor类中的方法
newInstance(Object... initargs)：创建一个新对象
setAccessible(boolean flag)：设置是否允许访问，如果为true，则忽略访问权限修饰符，否则访问权限修饰符将限制访问
例如:
Class clazz = Class.forName("com.WWJ.Student");
Constructor con = clazz.getDeclaredConstructor();//这个的修饰符是private
所以无法调用NewInstance()方法创建对象
此时就可以使用setAccessible()方法，临时取消访问权限修饰符的检查，设置为true，
就可以调用newInstance()方法创建对象了
con.setAccessible(true);
Student student = (Student) con.newInstance();
 */




//反射获取成员变量
/*
*Class类中用于获取成员变量的方法
getFields()：获取所有的公共成员变量的数组
getDeclaredFields()：获取所有的成员变量(包括私有、受保护、默认、公有)的数组
getField(String name)：获取指定变量名称的单个公共成员变量
getDeclaredField(String name)：获取指定变量名称的单个成员变量(包括私有、受保护、默认、公有)
*
成员变量对象调用getModifiers()方法获取修饰符，返回的是1表示public，返回的是2表示private，返回的是4表示protected，
成员变量对象调用getType()方法获取成员变量的类型，返回的是一个类的全类名，
成员变量对象调用getName()方法获取成员变量的名称，返回的是一个String类型的值
*
Class clazz = Class.forName("com.WWJ.Student");
Field field = clazz.getDeclaredField("name"); //获取成员变量name的Field对象


*Field类中的创建对象的方法
get(Object obj)：获取指定对象obj的成员变量的值
set(Object obj,Object value)：为指定对象obj的成员变量赋值为value
field.getModifiers()：获取成员变量的修饰符，返回的是1表示public，返回的是2表示private，返回的是4表示protected
field.setAccessible(true); //设置是否允许访问，如果为true，则忽略访问权限修饰符，否则访问权限修饰符将限制访问
Student S = new Student("张三", 20,'男');
filed.get(S); //获取对象S中的成员变量name的值
field.set(S,"李四"); //为对象S中的成员变量name修改为李四
 */



//反射获取成员方法
/*
*Class类中用于获取成员方法的方法
getMethods()：获取所有的公共成员方法的数组，包括继承的(从父类中继承的方法，但没有显示在方法体中的)
getDeclaredMethods()：获取所有的成员方法(包括私有、受保护、默认、公有)的数组,不包括继承的
getMethod(String name,Class<?>... parameterTypes)：获取指定方法名称和参数列表的单个公共成员方法
getDeclaredMethod(String name,Class<?>... parameterTypes)：获取指定方法名称和参数列表的单个成员方法(包括私有、受保护、默认、公有)
*
成员方法对象调用getModifiers()方法获取修饰符，返回的是1表示public，返回的是2表示private，返回的是4表示protected，
成员方法对象调用getParameterTypes()方法获取参数类型，返回的是一个Class数组，
成员方法对象调用getParameterCount()方法获取参数个数，返回的是一个int类型的值，
成员方法对象调用getParameters()方法获取参数信息，返回的是一个Parameter数组
成员方法对象调用getReturnType()方法获取返回值类型，返回的是一个类的全类名
成员方法对象调用getExceptionTypes()方法获取异常类型，返回的是一个Class数组，
成员方法对象调用getName()方法获取方法名称，返回的是一个String类型的值
*
* Class clazz = Class.forName("com.WWJ.Student");
* Method method = clazz.getDeclaredMethod("show",String.class);//获取方法名为show，参数类型为String的Method对象
*

*Method类中的创建对象的方法
 Object invoke(Object obj,Object... args)：
 //运行指定对象obj的成员方法(即方法的调用者)，args是执行该方法需要传入的参数，没有就不写 ，返回值为方法返回值，没有就不写
Student S = new Student("张三", 20,'男');
*method.invoke(S,"Hello"); //调用对象S中的方法show，传入参数为Hello

 */


应用场景:Spring通过@Autowired注解实现依赖注入时，

通过反射获取Bean的构造方法如果是无参构造方法就通过
获取到的构造方法Constructor对象Class对象调用getDeclaredConstructor()方法获取无参构造方法对象
再通过Constructor对象调用newInstance()方法创建对象

如果是有参构造方法就通过反射获取构造方法的参数类型，
通过Class对象调用getDeclaredConstructor(参数类型)方法获取有参构造方法对象
再通过构造方法Constructor对象调用newInstance(参数类型)方法创建对象


如果Bean还依赖了其他的Bean，
就需要先通过反射获取依赖Bean的构造方法，在通过构造方法Constructor对象调用newInstance()方法创建依赖Bean对象，交给容器管理
再通过带参构造方法Constructor对象调用newInstance(注入的依赖Bean对象)方法创建Bean对象，交给容器管理


