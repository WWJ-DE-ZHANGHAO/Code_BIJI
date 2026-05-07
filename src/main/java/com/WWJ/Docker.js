//Docker
/*
* Docker:快速构建、运行、管理应用的工具
* 主要的应用场景:运维工具
* 在Docker之前都是用Linux系统命令，操作Linux服务器和一些脚本。来实现部署的。太麻烦了
* 需要记住命令、选择合适的安装包，初始化服务器、启动服务等等
* Docker的出现，极大的简化了部署的流程。实现一键部署。
* */

//Docker安装
/*
* 卸载虚拟机中旧版的Docker，防止旧版和新版的Docker冲突(无论有没有都卸一下)
 yum remove docker \
  docker-client \
  docker-client-latest \
    docker-common \
    docker-latest \
    docker-latest-logrotate \
    docker-logrotate \
    docker-engine

*1、下载配置文件
* 以防你的系统无法解析官方域名，我们需要直接指定阿里云的地址下载配置文件
* 先执行以下命令备份原有的Repo文件:
* mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup
* 下载阿里云的 CentOS-Base.repo 文件:
* curl -o /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
* 清理缓存并生成新的缓存:
* yum clean all
 yum makecache
 2、Docker 安装
 * 安装依赖工具
  yum install -y yum-utils
 * 设置Docker的阿里云镜像源(配置yml源)
 yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
 * 安装Docker
 * yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
 * 启动Docker
 * systemctl start docker//启动docker
   systemctl enable docker//设置开机启动
   systemctl status docker//查看docker状态
   systemctl restart docker//重启docker
   systemctl stop docker//停止docker
  验证安装是否成功
  docker --version
3、查看Docker状态
 systemctl status docker
* 预期结果：你会看到绿色的 active (running) 字样，按 q 键退出查看
* 因为Docker默认的镜像仓库在国外，网络连接可能会不稳定或被阻断，导致无法拉取镜像。
* 因此要配置国内的镜像加速器
 mkdir -p /etc/docker
 tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://registry.docker-cn.com"
  ]
}
EOF
这里配置了三个国内常用的镜像加速地址（中科大、网易、Docker 中国官方），Docker 会自动选择一个可用的。
*也可以去阿里云官网的容器产品中选择镜像加速器，然后复制命令到 /etc/docker/daemon.json 文件中。
* 配置完之后需要重启Docker服务才能生效：
*  systemctl daemon-reload
   systemctl restart docker
 拉去镜像验证是否正常
  docker run hello-world
*如果打印出 Hello from Docker! 的欢迎信息。这标志着你的 Docker 环境已经完全配置成功，可以愉快地使用了
*
6、目前你每次输入 docker 命令都需要加上 sudo，这比较繁琐。我们可以把当前用户加入到 docker 用户组，这样就可以直接使用 docker 命令了
*  usermod -aG docker $USER
* 行完这条命令后，你需要断开 FinalShell 的连接并重新登录（或者重启虚拟机）
* ，权限设置才会生效。重新登录后，你可以直接输入 docker ps 来测试是否还需要密码。
* docker ps 命令会列出当前正在运行的容器，如果没有报错并显示了容器列表（即使是空的），说明你已经成功配置了 Docker 的权限，可以直接使用 docker 命令了。
*
*用Docker安装Mysql和原生直接Mysql安装的区别:
* Docker安装Mysql:
* Mysql会被完整安装在一个独立到的容器中，与CentOS系统本身隔离开，不会对CENTOS系统本身产生任何影响
* 所有的运行文件、依赖、环境都在容器内部
* 原生直接安装:
* Mysql安装在CENTOS系统本身，与CENTOS系统本身有联系，对CENTOS系统本身有影响
* 写配置在系统的目录、存数据在系统磁盘、端口、依赖全部混入系统、容易卸载不干净、与系统环境冲突
*
* 注意!!!!Docker的主要作用:负责环境隔离、软件打包、同一项目部署
* */

//部署Mysql
/*
 docker run -d \
  --name mysql \
  -p 3306:3306 \
  -e TZ=Asia/Shanghai \
  -e MYSQL_ROOT_PASSWORD=123456 \
  mysql

  Docker下载下来的应用不是安装包，不需要我们再安装，直接运行就可以使用。它是下载的镜像(image)，镜像不仅包括应用本身，还包含应用运行所需的唤醒、配置、系统函数库
  Docker会在运行时出创建一个隔离环境，称为容器(多个应用之间可能因为所依赖的环境和配置不一样可能会有冲突，而有了容器就和其他的应用的进程互不干扰，甚至可以部署集群)

  注意！！！
如果安装报错:
 Unable to find image 'mysql:latest' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/":
net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers).
这是因为当前的镜像已经没法用了，得换
{"registry-mirrors": [
"https://docker.1panel.dev",
"https://docker.fxxk.dedyn.io",
"https://docker.xn--6oq72ry9d5zx.cn",
"https://docker.m.daocloud.io",
"https://a.ussh.net",
"https://docker.zhai.cm"]}
*
*
问题镜像从哪来的?
会把镜像放在一个仓库中，这个仓库就是镜像仓库，Docker官方维护了一个公共仓库，叫Docker Hub
由于Docker Hub的访问速度慢，所以我们使用阿里云的镜像仓库，这样访问速度更快
安装第一次应用会把应用的镜像放在本地仓库中，以后再运行创建该应用容器
Docker会自动从本地仓库中查找对应的镜像，如果找到就直接运行，不用再下载镜像了，如果没有找到就从镜像仓库中下载
运行后会直接返回唯一容器 ID（完整格式，64位）
(类似java的依赖库)
Docker容器有自己的存储空间和网络空间，容器的ip地址外部是无法访问的，都是与外界隔离的
只能访问容器所在的宿主机的ip地址和端口
比如:创建多个Mysql容器，它们的端口可以都是3306，因为是容器之间互相隔离的，用的是容器中的端口，所以端口可以重复
但是宿主机的ip地址和端口不可以重复，所以只能用宿主机的不同端口映射多个Mysql容器的端口
比如:-p 3306:3306 -p 3307:3306。注意！！！容器的名称不能重复
* */

//Docker命令解读
/*
docker run -d \
  --name mysql \
  -p 3306:3306 \
  -e TZ=Asia/Shanghai \
  -e MYSQL_ROOT_PASSWORD=123456 \
  mysql
* docker run:创建并运行一个容器 -d:后台运行
--name:指定容器的名称
-p 3306:3306:将主机的端口映射到容器端口，因为直接是无法访问容器的端口，所以需要映射间接访问，连接客户端时要用的是宿主机的ip地址和端口
-e TZ=Asia/Shanghai:设置时区
-e MYSQL_ROOT_PASSWORD=123456:设置数据库的密码
mysql:指定要运行的镜像，格式:镜像名称:镜像版本,(不写版本，默认镜像版本为latest)
*-e是设置环境变量，格式为-e 变量名=变量值
* */


//Docker常见命令
/*
之前在docker run -d创建容器的时候，已经指定了镜像名称和版本，会自动拉取镜像
* 拉取镜像:docker pull 镜像名称:镜像版本
* 查看本地镜像:docker images
* 删除镜像:docker rmi 镜像名称:镜像版本
* 自定义镜像需要自己创建一个DOKERFILE文件，然后执行docker build 完成镜像的创建
  把本地镜像交给其他人使用:
  1、使用docker save -o 文件名(保存在当前命令执行位置) 镜像名称:镜像版本 > 镜像名称.tar，变成一个压缩文件，
  其他人拿到这个压缩文件后，就可以使用docker load 镜像名称.tar，把这个镜像加载到本地
  2、使用docker push 镜像名称:镜像版本 ，把镜像推送到公共镜像仓库或者私有镜像仓库，其他区要用的人都可以使用docker pull 镜像名称:镜像版本来取得镜像

  创建容器:使用docker run 镜像名称:镜像版本，会创建一个容器，并运行该容器
  停止容器:docker stop 容器名称，这里停止的其实是执行容器的进程，而不是容器本身
  启动容器:docker start 容器名称，启动的其实是执行容器的进程，而不是容器本身
  查看容器的运行状态:docker ps，就能知道哪些容器正在运行，哪些容器已经停止了，哪些容器已经删除了。docker ps -a:可以查看所有容器，包括已经停止的
  删除容器:docker rm 容器名称，这里是删除的容器本身，而不是镜像，如果容器正在运行，则不能删除，可以使用docker stop 容器名称 -f 强制删除
  查看容器运行的日志:docker logs 容器名称
  进入容器内部:docker exec -it 容器名称 bash(控制台)
  也可以直接docker exec -it 容器名称  命令，例如:docker exec -it mysql mysql -uroot -p123456
  注意！！！！
  进入容器内部，会发现容器内部的文件系统和宿主机的文件系统是一样的，这是因为容器内部是模拟的宿主机的环境，所以文件系统也一样
  在容器内部，也可以执行mysql等命令，例如:连接Mysql:mysql -uroot -p123456
  退出容器:exit,退出命令也是exit(或者Ctrl+D)

  命令别名:(如果命令太长了)
  进入配置文件:vi ~/.bashrc，可以在配置文件中添加别名，例如:alias docker='sudo docker'
  修改配置之后需要执行:source ~/.bashrc才能生效


  注意！！！
  Docker容器只包含运行容器所需的函数和命令，不包含ll、vi等系统命令
* */


//数据卷
/*
案例:修改Nginx容器内的html目录下的index.html文件
但是进入容器后，进入/usr/share/nginx/html/index.html。发现无法使用vi命令进行index.html文件
此时就需要用到数据卷
*数据卷(VOLUME):是一个虚拟目录，是容器内目录和宿主机目录之间的桥梁、
创建数据卷:docker volume create 数据卷名称。执行后会在宿主机上生成这个名称的目录，从而实现宿主机目录和数据卷之间的映射
默认会放置在/var/lib/docker/volumes/数据卷名称/_data。
然后让容器的目录和数据卷进行挂载，此时容器的目录就和宿主机的目录通过数据卷进行映射了
注意！！！
通过数据卷映射后，宿主机和容器是双向绑定的宿主机的目录修改了，容器内的目录也会修改，反向也一样，容器内的目录修改了，宿主机的目录也被会修改

数据卷命令:
docker volume create 数据卷名称 :创建数据卷
docker volume ls :查看所有数据卷
docker volume rm 数据卷名:删除指定数据卷
docker volume inspect 数据卷名称:查看数据卷的详细信息
docker volume prune :删除所有未使用的数据卷
挂载命令:docker run -v 数据卷:容器目录,就可以挂载数据卷了，
注意！！！
必须是在创建容器的时候进行挂载，已经创建的容器无法进行数据卷挂载，
如果挂载了数据卷但是数据卷不存在，会自动创建数据卷
例如:docker run -d --name nginx -p 80:80  -v  html:/usr/share/nginx/html  nginx //最后写应用的镜像
修改宿主集中的html目录下的index.html文件，容器内的html目录下的index.html文件就会修改，打开浏览器访问就能看到修改后的内容


docker inspect  容器名:查看容器的详细信息
会发现容器中的目录挂在的数据卷和宿主机目录的信息，如docker inspect nginx:
"Mounts": [
            {
                "Type": "volume",
                "Name": "html",
                "Source": "/var/lib/docker/volumes/html/_data",
                "Destination": "/usr/share/nginx/html",
                "Driver": "local",
                "Mode": "z",
                "RW": true,
                "Propagation": ""
            }
        ],

此时再查看docker inspect mysql:
也会发现一个挂载信息，数据卷的名称很长，但是我们并没有对Mysql进行挂载
这是容器运行时自动创建的卷，所以上述就说了，需要在容器创建的时候进行挂载数据卷，不然会自动创建数据卷这种叫匿名数据卷，名称会很长
挂载的容器目录是var/lib/mysql。这是一个数据存储的目录，增删改查的数据都会存储在这个目录中，对应的宿主机目录在/var/lib/docker/volumes/数据卷名
可以在这里看到数据库的数据都在这里，各个数据库和表名都有

为什么Mysql要把它的数据存储目录挂载到宿主机中？
因为如果只是放在容器中，一旦容器被删除，数据就会丢失，
但是此时是用的匿名卷，一旦把旧版本的容器删除，使用新版本的容器，就会重新创建一个匿名卷，旧的数据卷的数据无法被使用等于丢失了

方案一:把旧匿名卷的数据迁移到新的数据卷中，但是这种方法很麻烦，因为匿名数据卷的名称太长了，不好操作
方案二:把容器的存储目录挂载到指定的数据卷中，也不要用数据卷名:容器目录，因为会默认挂载在宿主机的/var/lib/docker/volumes下很麻烦
直接挂载在本地目录
挂载命令和之前的类似，docker run -d   -v 本地目录:容器目录 就可以完成本地目录挂载
本地目录必须以"/"或"./"开头，如果直接以名称开头，会被识别为数据卷而非本地目录
例如:
-v mysql:/var/lib/mysql会被识别为一个叫mysql的数据卷，而不是一个本地目录,就会被放在/var/lib/docker/volumes/mysql/_data目录下，
-v  /mysql:/var/lib/mysql会被识别为一个本地目录，而不是一个数据卷
把宿主机Mysql目录下的数据目录

*案例:实现宿主机目录和Mysql数据目录、配置文件、初始化脚本的挂载
Mysql容器配置文件:/etc/mysql/conf.d
Mysql数据目录:/var/lib/mysql
Mysql容器初始化脚本:/docker-entrypoint-initdb.d  注意！！初始化脚本只有在容器创建的时候才会生效

对应的宿主机目录，可以自定义，就写
root/mysql/data对应var/lib/mysql
root/mysql/conf对应/etc/mysql/conf.d
 root/mysql/init对应/docker-entrypoint-initdb.d

 先删除旧的容器
 docker rm -f mysql

 命令为
 docker run -d \
 --name mysql \
  -p 3306:3306 \
  -e TZ=Asia/Shanghai \
  -e MYSQL_ROOT_PASSWORD=123456 \
   -v /root/mysql/data:/var/lib/mysql\
   -v /root/mysql/conf:/etc/mysql/conf.d \
   -v /root/mysql/init:/docker-entrypoint-initdb.d \
   mysql
* */




//自定义镜像、
/*
镜像需要包含应用程序、程序运行所需的系统函数库，运行配置等文件的文件包，构建就是将这些文件打包成镜像的过程
* 部署一个Java应用的步骤:
* 1、准备一个Linux服务器
* 2、安装JRE并配置环境变量
* 3、拷贝jar包
* 4、运行jar包
 构建一个Java镜像的步骤:
 1、准备一个Linux运行环境
 2、按装JRE并配置环境变量
 3、拷贝jar包
 4、编写运行脚本

 注意！！！
 以上进行的每一步都会产生文件，但是Docker在构建镜像的时候，不会将这些产生的文件打成一个包做镜像的
 而是将每一步产生的文件分别打包成压缩包，作为镜像的一部分，最终合在一起才是一个完整的镜像
 而这些压缩包在Docker种称为Layer(层)，每一步操作的产生的文件作为一层
 就像之前安装Mysql的镜像一样，产生的日志会有很多行，而不是一行日志，这就是在分层下载，下载完之后合并在一起才是完成的镜像
 为什么要把这些文件分层的打包?
 1、 比如:在构建镜像的时候，不知道应用需要具体用到哪些函数库，可能会把所有的函数库都打包，上传到仓库
 突然有一天，你知道要具体的用的是什么函数了，需要把用不上的剔除掉再次构建镜像，但是万一后面有发现还有需要剔除的函数，又要再一次构建镜像，就会很麻烦，
 而使用分层打包后，只需要把修改后的函数库打成jar包，单独上传到仓库，再次构建镜像，就会只下载修改后的函数库。省时间

 2、而且一般最底层的基础层(应用依赖的函数库、环境配置等)都是通用的，打成jar包后上传到仓库后，下载其他应用的镜像时，如果也用到了这个基础层，
 而你已经下载到本地了，那就不会再下载了，会显示这一层的jar已存在(Already exists)，可以加快下载速度，减少空间占用


 顶层一般都是入口层，镜像运行入口，一般是程序启动的脚本和参数

 想要找到每层结构，并将每一层进行压缩打包，可以使用Dockerfile文件
 通过其中的指令来描述要执行什么操作来构建镜像，Docker就可以根据Dockerfile来帮我们构建进行
 常见的指令:
 FROM  指定基础镜像   例如:FROM ubuntu FROM openjdk:11.0-jre-buster等等
 ENV 环境变量     例如：ENV TZ=Asia/Shanghai
 RUN  执行Linux的shell命令 ，一般都是安装过程的命令 例如:RUN tar -zxvf /root/mysql.tar.gz EXPORTS
 COPY  拷贝本地文件到镜像的指定目录  例如:COPY  /root/mysql/data:/var/lib/mysql
 ECPOSE 指定容器运行时监听的端口， 例如:EXPOSE 8080
 ENTRYPOINT  镜像种的应用的启动命令，容器运行时调用  例如:ENTRYPOINT java -jar /app.jar
*

注意！！！
其实可以这些步骤很多人都已经写好了上传了，我们只需要使用FROM 命令指定别人写好的部分镜像，然后添加自己需要的内容，构建镜像
例如:
FROM openjdk:11.0-jre-buster //里面包括了环境变量、执行命令，端口的配置，
COPY  docker-demo.jar /app.jar
ENTRYPOINT java -jar /app.jar

对于使用好的Dockerfile，可以使用下面到的命令来进行构建镜像
docker build -t 镜像名称:镜像版本(不写就是latest) .  //.是指Dockerfile所在目录。就是当前目录
注意！！这个FROM openjdk:11.0-jre-buster需要下载的，可以先下载不然会耗时很久


使用的Dockerfile:
# 基础镜像
FROM openjdk:11.0-jre-buster
# 设定时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
# 拷贝jar包
COPY docker-demo.jar /app.jar  //这是要放入的镜像的Java应用的jar包，之后创建运行这个容器的时候，就是将这个Java应用运行起来
# 入口
ENTRYPOINT ["java", "-jar", "/app.jar"]
构建成功镜像后，
使用Docker run -d --name  -p 8080:8080  镜像名称:镜像版本。创建和运行容器

运行之后，通过查看容器日志，就可以看到Java应用启动的日志，经典的SpringBoot日志，就说明Java已经运行了
docker logs -f DD

通过虚拟器ip访问容器的8080端口，就可以访问到Java应用了
http://192.168.100.128:8080/hello/count
* */


//Docker网络互联
/*
使用Docker inspect 容器名
可以看到每个容器都有一个Network配置
 "Networks": {
                "bridge": {
                    "IPAMConfig": null,
                    "Links": null,
                    "Aliases": null,
                    "MacAddress": "02:42:ac:11:00:02",
                    "NetworkID": "46332f37740090ef6352559e23a1e9d7ab1ec1ce90b6a3e01463cdc023c472d6",
                    "EndpointID": "7a0e9f5fe7ce391abcf9abc91b888fb1f1a4361b618cc60249402ba3b5a027ec",
                    "Gateway": "172.17.0.1",
                    "IPAddress": "172.17.0.2",
                    "IPPrefixLen": 16,
                    "IPv6Gateway": "",
                    "GlobalIPv6Address": "",
                    "GlobalIPv6PrefixLen": 0,
                    "DriverOpts": null,
                    "DNSNames": null
                }
            }

里面有IPAddress和Gateway
会发现每个容器的IPAddress都是172.17.0只是最后一位不同
这说明这些容器是在同一个网段中，就可以互相访问

问题:不是说Docker容器都是独立的隔离空间吗，为什么有相同的网段，可以互相访问呢？
因为他们都是同一个网关Gateway，都是172.17.0.1
*Docker安装时候，会在虚拟中创建一张虚拟网卡，这个网卡的名字默认是docker0，这个网卡会充当一个虚拟的网桥的作用
这个网卡的地址是172.17.0.1/16，表示这个IP地址的前十六位是不能动的，后16位可以随意分配，所以整个 172.17.x.x 段都属于这个 Docker 网络，
这些容器的Ip地址都是172.17.0.x，是因为这些容器都连到docker0网桥，都会被分配到一个IP，范围就是172.17.0.x
所有连上这个网桥的容器，就可以通过网桥互相访问了
A[容器A<br/>172.17.0.2] -->|veth| B[docker0网桥<br/>172.17.0.1]
C[容器B<br/>172.17.0.3] -->|veth| B
D[容器C<br/>172.17.0.4] -->|veth| B

     A<-->|B|<-->C
     A<-->|B|<-->D
     C<-->|B|<-->D
*所以容器之间互相访问，那就可以进入之前的Java应用的容器中去操作Mysql和Nginx了

*通过ping 172.17.0.2 可以看到有响应，但是使用Ip地址进行容器之间的访问，是不对的
，因为这个Ip地址是docker0网桥分配的，当一个容器停了，这个Ip地址就会释放，
此时一个新的容器启动，就会分配到这个Ip地址，导致之前停的容器重启时分配到的Ip地址就变了

使用自定义网络互相访问
自定义网络:就会有一个新的网桥，且加入同一个自定义网络的多个容器还可以通过容器名互相访问(即使IP地址变了，也没关系)，Docker的网络操作命令
docker network create  创建一个网络
docker network ls 查看所有网络
docker network rm 删除指定 网络
docker network prune 删除所有未使用的网络
docker network connect 使指定容器连接到指定网络
docker network disconnect 使指定容器从指定网络中分离
docker network inspect 显示指定网络的信息
使用ip addr查看网卡网桥的信息
加入自定义网络的容器执行docker inspect 容器名，可以看到多了一个Networks字段



可以再创建容器的时候，将容器加入自定义网络，这时该容器就只会有这个自定义网络的Network字段，没有其他的
例如:docker run -d --name  -p 8080:8080  --network 自定义网络 镜像名称:镜像版本
* */

//部署Java应用到Docker容器中
/*
*将Java应用在Idea中Package进行打包，成jar包。因为里面有dockerfile文件，
* 直接将Target里面的jar包和dockerfile文件一起上传到虚拟机中，时间hm-server的jar包放到虚拟机root目录下
* 创建镜像:docker build -t 镜像名称:镜像版本 .
* 运行容器:docker run -d --name  -p 8080:8080 --network 自定义网络  镜像名称:镜像版本
*
* 注意！！！
* Java应用的配置文件中的Mysql的host可以用容器名，因为我已经将Mysql容器和Java应用容器加入同一个自定义网络了，所以它们之间可以通过容器名互相访问了
* 访问http://192.168.100.128:8080/search/list?pageNo=1&pageSize=5
* */


//部署前端的Nginx到Docker容器中
/*
把旧的Nginx容器删除掉
docker rm -f nginx
Nginx的配置文件nginx.conf中配置了用户端和服务端访问的端口，服务端访问的端口是18081 访问用户端的端口是18080
需要将Nginx的html和conf文件挂载到宿主机中，
conf配置文件放在容器中的/etc/nginx/nginx.conf目录中，
html文件放在容器中的/usr/share/nginx/html目录中
要用挂载在本地目录，不是数据卷。
docker run -d \
--name nginx \
-p 18080:18080 \
-p 18081:18081 \
-v /root/nginx/nginx.conf:/etc/nginx/nginx.conf \
-v /root/nginx/html:/usr/share/nginx/html \
-- network WWJ \
nginx
将导入的资料的html和conf文件也放到了nginx容器中了
此时访问http://192.168.100.128:18080,就可以访问到前端页面了

注意！！！
1、Nginx的conf配置文件中，后端接口的反向代理的地址也要改成Java应用容器名
* */


//Docker Compose
/*
* 之前的部署还是很麻烦，容易出错，而且每次部署都要手动输加入网络和挂载
* Docker Compose:是一个工具，可以让我们通过一个单独的docker-compose.yml文件来定义一组关联的应用容器，
* 帮助我们实现多个相互关联的Docker容器的快速部署，相当于把整个项目进行了统一管理，维护起来更方便了
* 一个docker-compose.yml文件通过定义多个容器的镜像、环境变量、端口映射、数据卷挂载、网络等配置，之后只需要一条命令就可以启动整个项目了
* 与docker run命令相似，都是要描述容器的配置信息
* 例如:
version: "3.8"

services:
  mysql:
    image: mysql //镜像名称
    container_name: mysql //容器名称
    ports:
      - "3306:3306"
    environment:
      TZ: Asia/Shanghai
      MYSQL_ROOT_PASSWORD: 123
    volumes:
      - "./mysql/conf:/etc/mysql/conf.d"
      - "./mysql/data:/var/lib/mysql"
      - "./mysql/init:/docker-entrypoint-initdb.d"
    networks:
      - hm-net
  hmall:
    build:
      context: .
      dockerfile: Dockerfile  //通过Dockerfile进行构建镜像
    container_name: hmall
    ports:
      - "8080:8080"
    networks:
      - hm-net
    depends_on:   //这里是依赖关系，hmall容器启动时，必须依赖mysql容器启动成功后才能启动，所以回显去创建Mysql容器后才能创建hmall容器
      - mysql
  nginx:
    image: nginx
    container_name: nginx
    ports:
      - "18080:18080"
      - "18081:18081"
    volumes:
      - "./nginx/nginx.conf:/etc/nginx/nginx.conf"
      - "./nginx/html:/usr/share/nginx/html"
    depends_on:
      - hmall
    networks:
      - hm-net
networks:
  hm-net:
    name: hmall

用docker-compose up -d启动整个项目，(要在docker-compose.yml文件所在目录下执行)
docker-compose down停止整个项目
*
* 注意！！！
* DockerCompose会自动创建一个网络，并把所有容器都加入这个网络中，
* DockerCompose会自动创建给镜像命名
*
* 命令为docker-compose [OPTIONS] [COMMAND]
* OPTIONS:选项
* -f 指定docker-compose.yml文件
* -p 指定项目名
* COMMAND:命令
* up:创建并启动所有services容器(就是docker-compose.yml文件下的services:中的容器和镜像创建)
* down:停止并移除所有容器、网络 //注意！！只会移除由docker-compose创建的容器和网络，其他容器不会被删除
* ps:列出所有容器
* logs:查看指定容器日志
* stop:停止指定容器
* start:启动指定容器
* restart:重启指定容器
* top:查看运行的进程
* exec:在指定运行中容器中执行命令
*
*
* 注意！！！DockerCompose还可以部署集群。
* */