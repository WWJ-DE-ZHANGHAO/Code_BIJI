// Elasticsearch
/*
* Elsticsearch是一个高性能的搜索引擎，之前使用的搜索都是通过模糊匹配查询数据库完成的，但是测试后会发现当数据量非常大的时候
* 模糊匹配查询数据库的效率非常低，所以需要使用Elasticsearch进行搜索。
* 模糊匹配查询数据库，是要求查到的必须是精确的匹配，比如输入“张三”的时候，只能查出包含“张三”，不能是张大三这种
*
* Elasticsearch是一个开源的搜索引擎，基于Lucene，是一个分布式的搜索引擎，可以处理海量数据。
* Lucene是一个Java语言的搜索引擎类库，是Apache公司的顶级项目
* Elasticsearch官网: https://www.elastic.co/cn/products/elasticsearch
* elasticsearch优势:
* 支持分布式、可以水平扩展
* 提供Restful接口、可以被任何语言调用
* elasticsearch结合了kibaba、logstash、beats是一套技术栈，被叫做ELK，广泛应用于日志数据分析、实时监控等领域
* 可以将日志收集起来并通过图形化的界面进行查看，帮助运维人员进行日志分析，从而提高运维效率。
*
* Kibana:用于数据可视化、Elasticsearch:存储、计算、搜索数据、Logstash/Beats:数据抓取
*
*
* 在Dokcer中安装Elasticsearch和Kibana
*将镜像拷贝到Docker中
* 执行Elasticsearch的安装命令:
docker run -d \
  --name es \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  -e "discovery.type=single-node" \
  -v es-data:/usr/share/elasticsearch/data \
  -v es-plugins:/usr/share/elasticsearch/plugins \
  --privileged \
  --network WWJ \
  -p 9200:9200 \
  -p 9300:9300 \
  elasticsearch:7.12.1
  *
  * 安装完成之后:访问http://192.168.100.128:9200
  * 返回的是Elasticsearch的相关信息，说明安装成功了
 安装Kibana的命令:
docker run -d \
--name kibana \
-e ELASTICSEARCH_HOSTS=http://es:9200 \
--network=WWJ \
-p 5601:5601  \
kibana:7.12.1
* 访问http://192.168.100.128:5601
*
* 使用Kibana进行数据可视化，可以向Elasticsearch发送HTTP请求
* 因为Elasticsearch直接在浏览器发送HTTP请求，相应的数据很乱而且可读性差，还得记住各个请求路径，
* 所以使用Kibana发送HTTP请求，点击Kibana左侧的Dev Tools，
* 就可以进入Kibana的控制台，在控制台中就可以发送HTTP请求了，
* 发送的HTTP请求和直接在浏览器中发送的HTTP请求是一样的，只不过Kibana会对返回的数据进行格式化，方便我们查看。
* */


//ES倒排索引
/*
* ES之所以查询效率会比传统的关系型数据库要快是因为ES是倒排索引，而关系型数据库是正向索引。
* Mysql使用的引擎
是InnoDB引擎，会给Id创建基于B+树的聚簇索引，
 */
* 聚簇索引:是指数据文件本身按照索引(只会给Id建立索引)顺序存储，索引和数据在一起。
* B+树是一种多路平衡查找树，是MySQL中最常用的索引数据结构：
 特点：
 所有数据都存储在叶子节点：非叶子节点只存储键值和指针
 叶子节点形成链表：便于范围查询和排序
 树的高度较低：通常3-4层就能存储千万级数据
 查询效率稳定：每次查询都需要从根到叶子节点
*因为是把id创建的索引存储在叶子节点中，所以Mysql根据Id查询的效率会很高
*但是如果是根据标题模糊查询，因为是模糊匹配所以即使是给标题加索引也没用
* 只能一行行的匹配，如果数据量很大，效率会很低
*
* 倒排索引:
* 文档(document):每条数据就是一个文档
* 词条(term):文档按照语义分成的词语。比如:苹果手机这个文档就会被分成两个词条:苹果、手机
* 分好之后会将词条和对应的文档Id存放在一个词条列表查询中，形成一个词条到文档Id的映射关系，
* 如果多个文档中有相同的词条，只会写一个词条，后面的id字段中放多个文档的Id
* 倒排索引:会给文档表根据文档Id建立正向索引，还会给词条建立索引(可以通过哈希表来加索引)
* 比如:有三个文档，分别是:苹果手机、华为手机、苹果电脑
* 那么就会有四个词条:苹果、手机、电脑、华为
* 词条     文档Id
* 苹果     1,3
* 手机     1,2
* 电脑     3
* 华为     2
*
* 使用商品名进行默认匹配查询的时候，会先将搜索的关键词进行分词，
* 分成一个个词条，然后根据这些词条去词条列表中查找对应的文档Id，
* 然后根据查到的文档Id去数据文件中查找对应的文档，最后将查询到的文档存入结果集，
*
* 总结:
* 正向索引是先找文档，然后判断文档中是否有这个关键词，
* 倒排索引是先找关键词，然后找这个关键词对应的文档Id，然后根据文档Id去数据文件中查找对应的文档
*
* 因为正向索引因为没有对关键词建立索引，且是模糊匹配所以只能一个个查询，效率很慢
* 而倒排索引对词条和文档Id都建立索引，所以查询效率会很高
* */

//IK分词器
/*
* Elasticsearch官网对于英文分词比较容易，只需要根据空格/单词进行分词就行了，
* 但是中文分词比较麻烦，因为中文的语义很复杂，
* 所以需要用到国人开发的IK分词器，IK分词器是一个开源的中文分词器。
*
* 安装IK分词器:
* 只需要将下载并解压好的分词器放到Elasticsearch的插件目录下就行了
* 测试:分词器是怎么分词的，可以通过Kibana发送HTTP请求来测试，发送的HTTP请求如下:
POST /_analyze //请求方式和路径。因为在Kibana中配置了Elasticsearch的地址，所以只需要写请求路径名即可
  { //请求体，JSON格式的
  "analyzer": "standard", //分词器类型、默认使用的分词器是standard标准分词器，
  "text": "黑马程序员学习Java" //要分词的文本
 }
 结果会给一个tokens列表，里面包含分词后的结果，观察会发现中文会被分成一个个的汉字，
 而英文会被分成一个个的单词，这就是standard标准分词器的分词结果
POST /_analyze
{
 "analyzer": "ik_max_word",
 //使用IK分词器。Ik分词器有两种模式:
 //ik_max_word和ik_smart，ik_max_word会将文本分成尽可能多的词条，ik_smart会将文本分成最少的词条
//ik_max_word的分词结果是:黑马、程序员、程序、员、学习、Java
//ik_smart的分词结果是:黑马、程序员、学习、Java
//所以一般使用ik_max_word分词器，分词结果更细粒度，查询效率更高,查询到的结果也会更多
//而ik_smart分词器一般精确匹配更高，粗粒度，查询到的结果会少一些
 "text": "黑马程序员学习Java"
}
*
* IK分词的原理是什么?
* IK分词器内部有一个词典，，词典中包含所有的中文词语，名人和地名等等
* 当要进行分词的时候，IK分词器会拿输入的词分段(两个/三个一组)的去遍历词典，看看词典中有没有这个词语，
* 如果有，则把这个词分出来，没有则按其他汉字数量的词继续遍历词典，直到找到一个词语，或者遍历完词典，
* 因为词典的更新没有那么快，一些新词词可能没有加入词典，所以找不到
* 为此IK分词器允许我们配置拓展词典，来增加自定义的词库
在IK的config配置文件中的IkAnalyzer.cfg.xml文件中添加如下内容:
* <properties>
	<comment>IK Analyzer 扩展配置</comment>
	<!--用户可以在这里配置自己的扩展字典 -->
	<entry key="ext_dict"></entry> //写扩展字典的文件名，它会从配置文件所在的目录中寻找
	 <!--用户可以在这里配置自己的扩展停止词字典-->
	<entry key="ext_stopwords"></entry>//就是一些语气词，不需要分词也不会放进分词结果中，像是啊、哦
	<!--用户可以在这里配置远程扩展字典 -->
	<!-- <entry key="remote_ext_dict">words_location</entry> -->
	<!--用户可以在这里配置远程扩展停止词字典-->
	<!-- <entry key="remote_ext_stopwords">words_location</entry> -->
</properties>
*编写完拓展词典后将拓展词典文件放在Elasticsearch的插件目录下，然后重启Elasticsearch服务，
*
*
* */
注意！！！
我发现docker中有些安装的容器必须打开日志才能访问

//基础概念
/*
* Elasticsearch中的文档数据会被序列化为json格式后存储在Elasticsearch中
* Elasticsearch会对每个文档进行分类，分类的名称叫做索引(index)/索引库，每个索引中可以有多个文档(document)
* 商品都放在一个商品索引中，类似与Mysql中的表，只放同一类型的数据
* 所以需要对每个文档的字段(有什么字段、是什么类型)进行约束，类似表中的结果约束，这里的约束称为映射(mapping)
*
* Elasticsearch和Mysql的区别:
* Mysql      Elasticsearch
* Table      Index(索引库)
* Row        Document(文档)
* Column     Field(字段)
* Schema     Mapping(映射)
* SQL          DSL(DSL是Elasticsearch提供的JSON风格的请求语句，用于定于搜索条件)
*
* */


// Mapping映射属性
/* mapping是对索引库中文档的约束，常见的Mapping映射属性有:
* type:字段类型，常见的字段类型有
     字符串:text(可分词的文本)、keyword:精确值(不可分词的文本,例如品牌、国家、IP地址等)
     数值类型:常见的数值类型有:long、short、byte、float、double、integer
     布尔:boolean
     时间:date
     对象:object
  index:是否创建索引，默认为true，如果不需要用这个字段进行搜索，可以将该字段设置为false，这样就不会创建索引了
 ，节省存储空间和提高搜索效率
  analyzer:分词器，常见的分词器有standard(默认)、ik_max_word、ik_smart等，如果不是Text类型的字段，则不需要设置分词器
  properties:字段的子字段，子字段的属性和父字段一样，嵌套(只有该该字段的type类型为object才行)
 不用都写，因为有默认值
这么多映射属性就类似一个Mysql表中有多个字段，每条数据的字段值不同
*注意！！！！
* 固定写法是
* mapping:{
*       properties:{}
* }
* mapping:映射中需要在properties中存放的自定义的字段
* */

//索引库操作
/*
* Elasticsearch提供的所有API都是Restful接口，遵循Restful的基本规范
* 请求方式:
* 查询使用GET、新增使用POST、修改使用PUT、删除使用DELETE
* 请求路径:
* /资源名称/资源ID
*
* 创建索引库格式:
* PUT /索引库名称
* {
* "mapping":{
*  "properties":{
*   "字段名称":{
*    "type":"字段类型",
*    "index":true/false,
*    "analyzer":"分词器"
*          },
*    "字段名2":{
*     "type":"字段类型",
*     "index":true/false,
*     "analyzer":"分词器"
*          },
*     "字段名3":{
*      "type":"字段类型",
*     "index":true/false,
*    "analyzer":"分词器"
*      },
*     ………………
*     },
*    ………………
*   }
*
* }
* 注意！！！
* 这些字段名称就是文档的字段，类Mysql中的字段
*比如:user用户表有name、age、info、email字段，那么索引库中字段就是name、age、info、email，
*创建索引库的时候就需要在mapping中定义这些字段的属性，type、index、analyzer等
* 因为name分为firstname和lastname，所以name字段的mapping中属性type属性为object
* 和properties中子字段为firstname和lastname
* PUT /heima
{
  "mappings": {
    "properties": {
      "info":{
        "type" : "text",
        "analyzer": "ik_smart"
      },
      "age":{
        "type": "byte"
      },
      "email":{
        "type": "keyword",
        "index": false
      },
      "name":{
        "type": "text",
        "properties": {
          "firstName": {
            "type": "keyword"
          },
          "lastName":{
            "type": "keyword"
          }
        }
      }
    }
  }
}
发送请求到Elasticsearch服务器，如果成功了会返回acknowledged: true，说明索引库创建成功了
*删除索引库格式:DELETE /索引库名称
*查看索引库格式:GET /索引库名称
*新建索引库格式:PUT /索引库名称
*索引库是不支持修改索引库现有字段操作的，因为一旦修改了索引库，可能那么对应的词条就都失效了
*虽然不能修改旧的字段。
*可以新增字段
* 格式:PUT /索引库名称/ _mapping{
*     "properties": {
*       "新字段名称":{
*         "type":"字段类型",
*         "index":true/false,
*         "analyzer":"分词器"
*      }
* }
*
* */

//文档操作
/*
* 新增文档格式:POST /索引库名称/_doc/文档ID(不指定的话会随机生成ID，之后操作文档时就很不方便了)
* {
* "字段1":"字段值1",(注意这里是填写值，而不是类型,根据已创建的索引库中的字段来填写值，不能乱填)
* "字段2":"字段值2",
* "字段3":{
*   "子字段1":"子字段值1",
*   "子字段2":"子字段值2"
* }
* }
* 例如:
* POST /heima/_doc/1
{
  "info":"吴文俊天下第一",
  "email":"@wwj.cn",
  "name":{
    "firstName":"文俊",
    "lastName":"吴"
  }

}
* 删除文档格式:DELETE /索引库名称/_doc/文档ID
* 查询文档格式:GET /索引库名称/_doc/文档ID
* 修改文档格式:包括全量修改和增量修改
* 全量修改格式:PUT /索引库名称/_doc/文档ID
* {
* "字段1":"字段值1",(注意这里是填写值，而不是类型,根据已创建的索引库中的字段来填写值，不能乱填)
* "字段2":"字段值2",
* "字段3":{
*   "子字段1":"子字段值1",
*   "子字段2":"子字段值2"
* }
* 例如:
* PUT /heima/_doc/2
{
  "info":"吴文俊绝对天下第一",
  "email":"WW@wwj.cn",
  "name":{
    "firstName":"文俊",
    "lastName":"吴"
  }
}
* 会删除旧的文档，添加新的文档，所以修改时需要填写整个文档，如果你只写了部分字段，那么其他字段就会丢失
* 修改后只剩你写的部分字段。
* 增量修改格式:POST /索引库名称/_update/文档ID
*  {
*  "doc":{
* "字段1":"字段值1"
* }
* 只修改指定的字段，其他字段不变
* 注意！！！
*PUT /heima/_doc/文档 ID，如果该文档不存在，则创建该文档，如果该文档存在，则修改该文档
*所以PUT既可以新增也可以修改
*
* 响应的结果中
* index:索引库名称
* type:文档类型，默认是_doc
* id:文档ID
* version:文档版本号，每次修改文档都会增加版本号
* result:操作结果，可能的值有created(创建)、updated(修改)、deleted(删除)、not_found(未找到)、found(找到)
* source:文档的内容
* 例如查询
* {
  "_index" : "heima",
  "_type" : "_doc",
  "_id" : "1",
  "_version" : 6,
  "_seq_no" : 6,
  "_primary_term" : 1,
  "found" : true,
  "_source" : {
    "info" : "吴文俊炫酷无敌吊炸天",
    "email" : "@wwj.cn",
    "name" : {
      "firstName" : "文俊",
      "lastName" : "吴"
    }
  }
}
* */


//批量操作
/*
* 之前一次只能操作一个文档，使用批处理一次可以操作多个文档，批量删除和批量修改以及批量新增都可以，批量操作的格式如下:
* 格式:POST /_bulk
*{"index":{"_index":"索引库名","_id":"1"}} //index表示新增文档
*{"字段1":"字段值1","字段2":"字段值2","字段3":{"子字段1":"子字段值1","子字段2":"子字段值2"}} //要操作的文档内容
* //两两一组
* {"index":{"_index":"索引库名","_id":"1"}}
* {"字段1":"字段值1","字段2":"字段值2","字段3":{"子字段1":"子字段值1","子字段2":"子字段值2"}}
*
* {"index":{"_index":"索引库名","_id":"1"}}
* {"字段1":"字段值1","字段2":"字段值2","字段3":{"子字段1":"子字段值1","子字段2":"子字段值2"}}
*
* {"delete":{"_index":"test","_id":"2"}} //删除文档，指定索引库和文档ID
*
* {"update":{"_id":"1","_index":"test"}} //修改文档，指定索引库和文档ID
* {"doc":{"field2":"value2"}} //指定要修改的字段和修改后的值
*
*注意！！！
* 是可以同时完成多种操作的
* POST /_bulk
{"index": {"_index":"heima", "_id": "3"}}
{"info": "黑马程序员C++讲师", "email": "ww@itcast.cn", "name":{"firstName": "五", "lastName":"王"}}
{"index": {"_index":"heima", "_id": "4"}}
{"info": "黑马程序员前端讲师", "email": "zhangsan@itcast.cn", "name":{"firstName": "三", "lastName":"张"}}
{"delete":{"_index":"heima", "_id": "1"}}
* */