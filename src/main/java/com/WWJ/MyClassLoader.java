package com.WWJ;

import net.bytebuddy.jar.asm.ClassWriter;
import net.bytebuddy.jar.asm.Opcodes;

import java.io.IOException;

public class MyClassLoader extends ClassLoader {
    public static void main(String[] args) throws IOException {
        System.in.read(); //阻塞主线程，等待用户输入
        MyClassLoader myClassLoader = new MyClassLoader();
        int count = 0;
        while (true) {
            String name = "Class" + count; //动态生成类的全类名
            ClassWriter classWriter = new ClassWriter(0); //创建ClassWriter对象
            classWriter.visit(Opcodes.V1_7, Opcodes.ACC_PUBLIC, name, null, "java/lang/Object", null); //创建字节码数据
            byte[] bytes = classWriter.toByteArray(); //将字节码数据转换为字节数组
            myClassLoader.defineClass(name, bytes, 0, bytes.length); //将字节码数据加载到内存中
            System.out.println(count++);
        }
    }
}
