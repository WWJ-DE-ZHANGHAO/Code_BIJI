//JavaRestClient
/*
* 之前的测试都是在Kibana中进行的，我们需要能在Java代码中进行使用并指定
* 使用需要用到JavaRestClient客户端，JavaRestClient是Elasticsearch官方提供的Java客户端，
* 因为是向Restful发送请求，所以叫称JavaRestClient
* 客户端初始化:(在搜索的微服务模块中引入)
* 1、引入es的RestHighLevelClient依赖
 <dependency>
 <groupId>org.elasticsearch.client</groupId>
 <artifactId>elasticsearch-rest-high-level-client</artifactId>
 </dependency>
* 2、因为SpringBoot中是管理了很多第三方库的版本的，也管理了es的版本
* 当SpringBoot中的版本和es的版本不兼容时，就会出现一些问题，比如:RestHighLevelClient类找不到，或者是一些方法找不到等问题
* 所以需要在父工程的pom文件中指定版本覆盖掉SpringBoot中的默认的es版本
* <properties>
* <elasticsearch.version>7.12.1</elasticsearch.version>
* </properties>

* 3、初始化客户端，指定es服务器的地址和端口号，建立连接
* RestHighLevelClient client = new RestHighLevelClient(
* RestClient.builder(HttpHost.create("http://192.168.56.10:9200")));
*
* 注意！！！
* 编写测试代码时，测试代码所在包要和启动类所在的包名一致，或是子包
*    @BeforeEach 执行前建立连接
    void setup() {
    client = new RestHighLevelClient(
            RestClient.builder(HttpHost.create("http://192.168.56.10:9200")));
   }


   @AfterEach
    void teardown() throws IOException {
        if (client!=null){
            client.close();
        }

   }
* 执行完之后需要关闭连接
*
* */

//实现搜索
/*
* 要实现商品查询，创建的商品索引库必须要满足页面搜索的需求
* 设计mapping映射字段需要包含:搜索字段、排序字段、展示字段
* 判断对应的商品数据库表中的各个字段是否需要添加到es(展示)，是否需要参与搜索(index=true)？
*比如:
* 商品Id和商品名称需要添加到es中，且需要参加搜索,索引index=true
* 销量需要加入es，因为需要参与排序所以index=true
* 评论数因为需要展示，但是不参与排序和搜索，因此index=false
*例:使用kibana控制台，创建商品索引库
* PUT /hmall
{
  "mappings": {
    "properties": {
      "id":{
        "type": "keyword"
      },
      "name":{
        "type": "text",
        "analyzer": "ik_smart"
      },
      "price":{
        "type": "integer"
      },
      "image":{
        "type": "text",
        "index": false
      },
       "category":{
        "type": "keyword"
      },
        "brand":{
        "type": "keyword"
      },
        "sold":{
        "type": "integer"
      },
      "commentCount":{
        "type": "integer",
        "index": false
      },
      "isAD":{
        "type": "boolean"
      },
      "updateTime":{
        "type": "binary"
      }

    }

  }

}
* */

//Java代码创建索引库
/*
* 1、使用CreateIndexRequest类创建请求方式和请求路径，Create开头就是PUT、Delete开头就是DELETE
* CreateIndexRequest request=new CreateIndexRequest("items")//就是PUT /items
*
* 2、使用CreateIndexReuqest的对象调用source方法，添加请求参数和参数类型
* request.source(MAPPING_TEMPLATE,XContentType.JSON);
* //MAPPING_TEMPLATE是存放请求参数的静态字符串名称，XContentType.JSON表示发送的是JSON格式请求
* //将资源映射参数添加到request对象中
*例如:
*  //指定请求参数
    private static final String MAPPING_TEMPLATE = "{\n" +
            "  \"mappings\": {\n" +
            "    \"properties\": {\n" +
            "      \"id\":{\n" +
            "        \"type\": \"keyword\"\n" +
            "      },\n" +
            "      \"name\":{\n" +
            "        \"type\": \"text\",\n" +
            "        \"analyzer\": \"ik_smart\"\n" +
            "      },\n" +
            "      \"price\":{\n" +
            "        \"type\": \"integer\"\n" +
            "      },\n" +
            "      \"image\":{\n" +
            "        \"type\": \"text\",\n" +
            "        \"index\": false\n" +
            "      },\n" +
            "       \"category\":{\n" +
            "        \"type\": \"keyword\"\n" +
            "      },\n" +
            "        \"brand\":{\n" +
            "        \"type\": \"keyword\"\n" +
            "      },\n" +
            "        \"sold\":{\n" +
            "        \"type\": \"integer\"\n" +
            "      },\n" +
            "      \"commentCount\":{\n" +
            "        \"type\": \"integer\",\n" +
            "        \"index\": false\n" +
            "      },\n" +
            "      \"isAD\":{\n" +
            "        \"type\": \"boolean\"\n" +
            "      },\n" +
            "      \"updateTime\":{\n" +
            "        \"type\": \"binary\"\n" +
            "      }\n" +
            "      \n" +
            "    }\n" +
            "    \n" +
            "  }\n" +
            "  \n" +
            "}\n";
* 3、使用client对象调用indices()方法会返回操作索引库的所有方法，
* 包括创建索引库、删除索引库、修改索引库、查询索引库等
* 所以：
* client.indices().create(request,RequestOptions.DEFAULT);
* //创建索引库，RequestOptions.DEFAULT表示默认参数
* void testCreateIndex() throws IOException {
      // 创建索引库
      //准备Request对象
      CreateIndexRequest request = new CreateIndexRequest("items");
      //准备请求参数
      request.source(MAPPING_TEMPLATE, XContentType.JSON);
      client.indices().create(request, RequestOptions.DEFAULT);
  }
*
* 删除索引库
* DeleteIndexRequest request=new DeleteIndexRequest("items");//就是DELETE /items
* client.indices().delete(request,RequestOptions.DEFAULT);
* 查询索引库
* GetIndexRequest request=new GetIndexRequest("items");//就是GET /items
* client.indices().get(request,RequestOptions.DEFAULT);
*如果只想判断索引库是否创建成功可以不用使用get获取所有内容，可以使用exists方法判断索引库是否存在
*  boolean response = client.indices().exists(request, RequestOptions.DEFAULT);
* */

//Java代码操作文档
/*
* 步骤:
* //新增文档操作，创建请求方式和请求路径 类似POST /items/1
* 1、IndexRequest request=new IndexRequest("items").id("1");
* //准备JSON文档
* 2、request.source("{\"name\":\"Jack\",\"age\":21}",XContentType.JSON);
* //发送请求
* 3、client.index(request,RequestOptions.DEFAULT);//操作文档不用调用indices()方法

*
* 注意！！！！
* 新增文档时，参数不用自己一个个手写，可以查询数据库，但是数据库中的字段不是都要用的，所以可以根据索引库字段创建一个类
* 因为数据库有对应的实体类，可以直接复制粘贴修改一下就行了
* 关键！！！
* 想要在测试中查询数据库，默认的配置文件环境是dev，如果要使用的Mysql配置的是放在local环境中，需要添加注解
* @SpringBootTest(properties = "spring.profiles.active=local")，才能正确获取数据库数据
*  然后将结果封装成新建实体类对象，
* 因为需要的参数是Json字符串，所以需要用JSONUtil.toJSONString()方法将实体类对象转换成JSON字符串
* 然后调用request.source()方法
*
* 还有就是文档的id要和查询的商品的id一致
* *例:
*   @Test
  void testAddDoc() throws IOException {
      //准备文档数据
      ItemDoc itemDoc = BeanUtil.copyProperties(itemService.getById(613357L), ItemDoc.class);
      //准备Request对象
      IndexRequest request = new IndexRequest("items").id(item.getId().toString()/ItemDoc.getId());//id和数据库中id一致
      //添加文档数据
      request.source(JSONUtil.toJsonStr(itemDoc), XContentType.JSON);
      client.index(request, RequestOptions.DEFAULT);
  }
* 删除文档操作
* 1、DeleteRequest request=new DeleteRequest("items","1");
* 2、client.delete(request,RequestOptions.DEFAULT);
*
* 查询文档操作
* 1、GetRequest request=new GetRequest("items","1");
 2、GetResponse response = client.get(request, RequestOptions.DEFAULT);
 3、String json=response.getSourceAsString()；
 *
注意！！！
* 查询文档返回的是整个文档内容，包括索引库名、文档id、版本、文档内容
* 但我们只想要文档内容，所以需要解析返回的GetResponse对象调用getSource()方法返回的是Map类型
* 所以要调用sourceAsString()方法，返回的是json字符串
* 如果想将json字符串转换成实体类对象，需要使用JSONUtil.toBean()方法
* 例如:
* @Test
    void testGetDoc() throws IOException {
        GetRequest request = new GetRequest("items","613357");
        GetResponse response = client.get(request, RequestOptions.DEFAULT);
        String json = response.getSourceAsString();
        ItemDoc doc = JSONUtil.toBean(json, ItemDoc.class);
        System.out.println("Doc="+doc);

    }
    *
修改文档操作
全量修改:
全量修改使用的APi和新增文档一样，如果文档id存在则是修改(删除旧的，添加新的)，不存在则是新增操作
* 1、IndexRequest request=new IndexRequest("items").id("1");
* 2、request.source("{\"name\":\"Jack\",\"age\":21}",XContentType.JSON);
* 3、client.index(request,RequestOptions.DEFAULT);
*局部修改:
* 1、UpdateRequest request=new UpdateRequest("items","1");
* 2、request.doc("name":"外文名","age":"18“);//可以使用可变参数或者Map对象，这里用的是可变参数
* 3、client.update(request,RequestOptions.DEFAULT);
* 例如：
* void testUpdateDoc() throws IOException {
        UpdateRequest request = new UpdateRequest("items","613357");
        request.doc(
                "price",26600
        );
        client.update(request, RequestOptions.DEFAULT);
    }
* */

//批量处理
/*
使用BlukRequest批量处理文档
1、创建BulkRequest对象
2、添加多个操作，调用add()方法
3、发送请求
例如:批量新增
* @Test
void testBulk() throws IOException {
    // 1.创建Request
    BulkRequest request = new BulkRequest();
    // 2.准备请求参数
    request.add(new IndexRequest("items").id("1").source("json doc1", XContentType.JSON));
    request.add(new IndexRequest("items").id("2").source("json doc2", XContentType.JSON));
    // 3.发送请求
    client.bulk(request, RequestOptions.DEFAULT);
}
注意！！！！
新增最好是用list查询到的数据的集合，在遍历集合来添加，这样效率更高
如果数据量很大，最好用Page分页查询，每次查询一页数据并放入索引库，不然一次添加太多了，会很慢
还可以用pageNo++自动翻页，一页页的添加
例如:
@Test
void testLoadItemDocs() throws IOException {
    // 分页查询商品数据
    int pageNo = 1;
    int size = 1000;//每页1000条
    while (true) {
        Page<Item> page = itemService.lambdaQuery().eq(Item::getStatus, 1).page(new Page<Item>(pageNo, size));
        // 非空校验
        List<Item> items = page.getRecords();
        if (CollUtils.isEmpty(items)) {
            return;
        }
        log.info("加载第{}页数据，共{}条", pageNo, items.size());
        // 1.创建Request
        BulkRequest request = new BulkRequest("items");
        // 2.准备参数，添加多个新增的Request
        for (Item item : items) {
            // 2.1.转换为文档类型ItemDTO
            ItemDoc itemDoc = BeanUtil.copyProperties(item, ItemDoc.class);
            // 2.2.创建新增文档的Request对象
            request.add(new IndexRequest()
                            .id(itemDoc.getId())
                            .source(JSONUtil.toJsonStr(itemDoc), XContentType.JSON));
        }
        // 3.发送请求
        client.bulk(request, RequestOptions.DEFAULT);

        // 翻页
        pageNo++;
    }
}
通过GET /Items/_count可以获取索引库中的文档数量
批量修改
* @Test
void testBulkUpdate() throws IOException {
    BulkRequest request = new BulkRequest();
    request.add(new UpdateRequest("items").id("1").doc("name","Jack"));
    request.add(new UpdateRequest("items").id("2").doc("name","Tom"));
}
批量删除
* @Test
void testBulkDelete() throws IOException {
    BulkRequest request = new BulkRequest();
    request.add(new DeleteRequest("items").id("1"));
    request.add(new DeleteRequest("items").id("2"));
}
*
*
* */