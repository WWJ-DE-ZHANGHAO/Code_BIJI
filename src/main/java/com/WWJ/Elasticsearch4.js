//使用Java语言进行DSL查询
//DSL查询
/*
*1、准备Request对象
* SearchRequest request = new SearchRequest("索引库名");//就是GET /索引库名/_ search
* 2、组织DSL参数
* request.source().query(QueryBuilders.matchQuery("字段名","查询内容"));//就是"query":{"match":{}}
* 3、执行查询
* SearchResponse response = client.search(request,RequestOptions.DEFAULT);
*
*通过解析SearchResponse对象获取查询结果
* SearchHit searchhits = response.getHits()获取查询结果
* searchhits.getTotalHits().value获取总记录数
* searchhits.getHits()获取查询结果数据的数组
* 遍历数组就能得到每个文档数据。
* 例如:
*  //获取Restquest
       SearchRequest request = new SearchRequest("items");
       //配置DSL参数
       request.source().query(QueryBuilders.matchAllQuery());
       //执行查询
       SearchResponse rp = client.search(request, RequestOptions.DEFAULT);
       //解析结果
       SearchHits HT = rp.getHits();
       //获取总条数
       long total =HT.getTotalHits().value;
       System.out.println("总条数："+total);
       //获取数据数组
       SearchHit[] hits = HT.getHits();
       for (SearchHit hit : hits) {
           String json = hit.getSourceAsString();//获取文档中的source即itemDoc对象
           //转换成对象
           ItemDoc itemDoc = JSONUtil.toBean(json, ItemDoc.class);
           System.out.println("itemDoc ="+itemDoc);
       }
* */

//构建查询条件
/*
* 在JavaRestAPI中，所有类型的query查询条件都是由QueryBuilders类来构建的
* 全文检索查询:
* 单字段查询:
* QueryBuilders.matchQuery("字段名","查询内容")
* 多字段查询:
* QueryBuilders.multiMatchQuery("查询内容","字段1","字段2")
*
* 精确查询:
* 词条查询:
* QueryBuilders.termQuery("字段名","查询内容")
* 词条范围查询:
* QueryBuilders.rangeQuery("字段名").gte("开始值").lte("结束值")
*
* 复合查询:
* 布尔查询
* 1、创建布尔查询
* BoolQueryBuilder boolQuery = QueryBuilders.boolQuery();
* 2、添加must条件
* boolQuery.must(QueryBuilders.matchQuery("字段名","查询内容"));
* 3、添加filter条件
* boolQuery.filter(QueryBuilders.rangeQuery("字段名").gte("开始值").lte("结束值"));
* 注意！！！
* 如果需要must或filter要添加多字段，需要调用多次调用boolQuery.must().must()或boolQuery.filter().filter()
*
*
* 案例:利用JavaRestClient实现搜索功能，条件如下
* 搜索关键字为脱脂牛奶
* 品牌必须为德亚
* 价格必须低于300
*
* 1、需要创建布尔查询组合叶子查询,品牌和价格使用filter，搜索关键词使用must
*
* */

//排序和分页
/*
* 使用JavaRestClient实现排序和分页功能，格式:
* request.source().sort("字段名",SortOrder.ASC);//排序
* request.source().from(0).size(10);//分页，其实索引=页码-1*页大小
*注意！！！
* 有多个排序条件时，需要调用多个即，request.source().sort().sort()
*
* */

//高亮显示
/*
* 使用JavaRestClient实现高亮显示功能，格式:
* request.source().highlighter(
*      SearchHighlightBuilder.highlight()//高亮构建器，或者new HighlightBuilder().field()
*           .field("字段名")
*           .preTags("<em>")
*           .postTags("</em>")
* );
* 注意！！！
* 查询结果中的高亮字段和source是分开的不在source字段中,
* 直接使用用response.getHits().getHits()再hit.getSourceAsString()获取到的并没有高亮字段
* 需要获取高亮字段，需要用hit.getHighlightFields()获取存放高亮字段的map，
* 因为高亮字段是键值对的值为数组
* Map<String, HighlightField> hfs = hit.getHighlightFields();
        if (CollUtils.isNotEmpty(hfs)) {
            // 5.1.有高亮结果，获取name的高亮结果
            HighlightField hf = hfs.get("name");//返回值是一个高亮字段
            if (hf != null) {
                // 5.2.获取第一个高亮结果片段，就是商品名称的高亮值
                String hfName = hf.getFragments()[0].string();//调用getFragment获取数组，并获取高亮数组的第一个值
                item.setName(hfName);//设置高亮名称
            }
        }
*
* */


//聚合
/*
*聚合(Aggregations)可以对文档数据进行统计、分析、运算，聚合常见的由三类，类似Mysql的聚合函数，
* 桶(Bucket)聚合:用于对文档做分组 ，类似Mysql的group by
* TermAggregation:按照文档字段值分组
* DateHistogram:按照日期阶梯分组，例如以周为一组、或一月为一组
* 度量(Metric)聚合:用以计算一些值，比如:最大值、最小值、平均值 类似Mysql的聚合函数，例如:Avg、Sum、Count、Max、Min
* Avg:求平均值
* Max:求最大值
* Min:求最小值
* Stats:同时求max、min、avg、sum等
* 管道(pipeline)聚合:其他聚合的结果为基础做聚合 对聚合结果进行聚合，像是对多个平均值进行求平均和或者对多个最大值进行求最大
*
* */

//DSL聚合语法
/*
* 我们要统计所有商品中共有哪些商品，其实就是以分类字段对数据分组。categroy值一样的放在同一组，数据Bucket聚合中的Term聚合
*桶聚合格式:
* GET /items/_search
{
  //不写query字段默认是match_all查询
  "size": 0, //设置size为0，不返回文档数据，只返回聚合结果，可以减少查询时间
  "aggs": { //定义聚合
    "category_agg": { //给聚合起个名字
      "terms": { //聚合类型为terms
        "field": "category", //参与的聚合字段
        "size": 20 //希望获取的聚合结果数量，最多返回20个
      }
    }
  }
}
*
* 如果要根据多个字段进行聚合，可以写多个聚合
* "category_agg": { //给聚合起个名字
      "terms": { //聚合类型为terms
        "field": "category", //参与的聚合字段
        "size": 20 //希望获取的聚合结果数量，最多返回20个
      }
   "brand_agg": { //给聚合起个名字
      "terms": { //聚合类型为terms
        "field": "brand", //参与的聚合字段
        "size": 20 //希望获取的聚合结果数量，最多返回20个
      }
      *
  响应结果中
  * aggregations字段中包含所有聚合结果
  * buckets字段中是各个聚合结果[{"key":"Apple","doc_count":"2"},………………]
  *
  *
带条件的聚合:
*GET /items/_search
{
  "query": {
    "bool": {
      "filter": [
        {
          "term": {
            "category": "手机"
          }
        },
        {
          "range": {
            "price": {
              "gte": 300000
            }
          }
        }
      ]
    }
  },
  "size": 0,
  "aggs": {
    "brand_agg": {
      "terms": {
        "field": "brand",
        "size": 20
      }
    }
  }
}
*
使用度量聚合计算聚合结果中的字段平均值，度量聚合的定义要放在桶聚合的内部作为子聚合
* "size": 0,
  "aggs": {
    "brand_agg": {
      "terms": {
        "field": "brand",
        "size": 20
      },
      "aggs": {
        "stats_meric": { //定义度量聚合
          "stats": {
            "field": "price"
          }
        }
      }
    }
* */


//Java客户端实现聚合功能
/*
使用JavaRestClient实现聚合功能，格式:
*request.source().aggregation(
* AggregationBuilders.terms("聚合名称").//聚合类型为terms
* field("聚合字段")).size(20);

解析结果:
Terms brandTerms=response.getAggregations().get("聚合名称");//获取聚合结果，是什么类型就用什么类型获取
 List<?extends Term.Bucket>buckets=brandTerms.getBuckets());//获取聚合结果中的桶的数组，桶中包含聚合结果中的字段和数量
 对桶数组进行遍历
 for (Terms.Bucket bucket : buckets) {
   String key=bucket.getKeyAsString();//获取桶中的字段值
   long docCount=bucket.getDocCount();//获取桶中的数量
 }

*
*
* */

