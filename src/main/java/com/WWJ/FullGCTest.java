package com.WWJ;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class FullGCTest { public static void main(String[] args) throws IOException {
List<Object> list = new ArrayList<>();
int count=0;
while (true) {
System.in.read();
System.out.println(++count);
list.add(new byte[1024 * 1024*1]);//每次创建1M的对象
}
 }
}
