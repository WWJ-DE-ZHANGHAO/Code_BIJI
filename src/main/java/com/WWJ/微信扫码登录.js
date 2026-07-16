//微信登录
/*
* 使用微信在第三方应用进行登录的优势:
* 便捷方面:登录更加快捷，面对不同平台不同的用户名和密码问题，使用微信在第三方应用进行登录正好解决这个问题，几乎可以直接一个账号搞定所有
* 还可以将自己在某个应用下的动态信息(头像)同步到当前应用下，无需还在为每个应用重新写到个人资料
*
* 安全方面:微信在这种第三方应用进行登录有很多资料信息是可以公用的(比如头像，昵称等)，但是一些敏感信息(比如手机号，邮箱等)是不会提供给第三方应用的
*
* 营销价值:简化了登录过程，降低了注册门槛，更能回去海量用户，有效降低用户流失，目前市面上的短信验证的加强约是0.05元一条，微信登录可以节省这笔费用
* 当前主流的登录注册方式就是:本地注册+第三方登录
*
* */
//基础原理:OAuth2.0协议
/*
* OAuth(Open Authorization)是一个关于授权(authorization)的开放网路标准，允许用户授权第三方应用(使用微信登录的系统应用)
* 访问他们存储在另外的服务提供者(微信)上的信息(昵称，头像)，而不需要将用户名和密码提供方给第三方，OAuth在全世界得到广泛的应用，
* 目前的主流的第三方登录方式都是基于OAuth2.0协议的
* 协议的特点:
* 简单:不管是OAuth服务提供者还是应用开发者，都很易于理解和使用
* 安全:没有涉及到用户密钥等信息，更安全更灵活
* 开放:任何服务提供商都可以实现OAuth，任何软件开发商都可以使用OAuth
* */

//Oauth2.0协议-角色说明
/*
* 客户端(使用微信登录的应用):（本身不存储资源(用户信息)，需要通过资源拥有者(用户)授权去请求资源服务器(例如微信)的资源
* 资源拥有者:通常为用户，也可以是应用程序，即资源的拥有者
* 授权服务器(认证服务器):用于服务提供商对资源拥有者的身份进行认证，对访问资源进行授权，认证成功后会给客户端发放令牌，作为客户端访问资源服务器的凭证
* 资源服务器:存储资源的服务器，比如微信端存储的用户信息
*
* 四种授权模式:
* (最常用的模式)授权码模式(Authorization Code Grant):
* 隐式授权模式(Implicit Grant):
* 用户名密码模式(Resource Owner Password Credentials Grant):
* 客户端模式(Client Credentials Grant):
*
* 授权码模式时序图:
* 资源拥有者(用户) -> 客户端(使用微信登录的应用) -> 授权服务器(微信) -> 资源服务器(微信)
* 1、资源拥有者(用户)委托客户端访问受保护资源(微信头像，昵称等)
* 2、客户端请求获取访问受保护资源的权限(将用户引导到微信的授权页面)
* 3、重定向到授权服务器(微信)进行认证
* 4、授权服务器认证成功后，资源拥有者(用户)同意授权给客户端
* 5、授权服务器(微信)会返回一个授权码(code)给客户端请求的URL
* 6、浏览器携带码请求到重定向的URL
* 7、客户端通过授权码请求令牌，授权服务器校验授权码的有效性
* 8、确认授权码有效后，给客户端发放令牌，令牌包含访问受保护资源的权限
* 9、客户端通过令牌请求访问受保护资源
* 10、资源服务器(微信)校验令牌有效性、确认令牌有效后，返回受保护的资源给客户端
* 11、令牌过期后刷新令牌
* 12、客户端通过刷新令牌请求新的令牌，授权服务器给客户端发放新的令牌
* */

//二维码
/*
* 二维码:设备通过扫描二位条码的长度和宽度中记载的二进制数据，可以获取其中所包含的信息
* 总之二维码是信息的载体，还可以将网站的地址连接转换成二维码，手机扫描二维码就可以打开对应的网站
* 二维码的生成:常见的都是使用草料二维码生成器，输入需要生成二维码的链接。
* 但是实际工作中，都是使用Java代码生成二维码，常用的使用Huyool工具包中的QRCodeUtil工具类生成二维码
* 1、引入Huyool工具包
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>5.7.5</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.3.3</version>
</dependency>

使用工具类生成二维码:
QrCodeUtil.generate("https://www.baidu.com", 300, 300, FileUtil.file("D:/qrcode.png"));
//参数1:二维码内容，参数2:二维码的宽，参数3:二维码的高，参数4:二维码保存路径
编写测试类
   @Test
    public void QRCodeTest(){
        QrCodeUtil.generate("https://www.baidu.com", 300, 300, FileUtil.file("D:/qrcode.png"));
    }

二维码纠错级别:L、M、Q、H(由低到高)
低级别的像素块更大，可以远距离识别，但是遮挡了一部分就会造成无法识别
高级别则相反，像素块小，二维码允许被遮挡一定范围一样可以被识别，但是像素块更密集
使用QrConfig对象调用setErrorCorrection(ErrorCorrectionLevel.H)方法来设置二维码的纠错级别
然后再用工具类QrCodeUtil.generate()方法生成二维码
*
测试
 @Test
    public void QRCodeTest2(){
        QrConfig qrConfig = new QrConfig(1000, 1000);
        qrConfig.setErrorCorrection(ErrorCorrectionLevel.H);
        QrCodeUtil.generate("https://www.baidu.com",qrConfig , FileUtil.file("D:/qrcode1.png"));
    }
 @Test
    public void QRCodeTest2(){
        QrConfig qrConfig = new QrConfig(1000, 1000);
        qrConfig.setErrorCorrection(ErrorCorrectionLevel.L);
        QrCodeUtil.generate("https://www.baidu.com",qrConfig , FileUtil.file("D:/qrcode1.png"));
    }
会发现纠错级别越高，二维码的线越密，纠错级别越低，二维码的线越稀疏
还可以使用QrConfig对象调用setMargin()方法来设置二维码的边距、setBackColor()方法来设置二维码的背景颜色
setImage()方法来设置二维码的图片
*
* 测试
*     @Test
    public void QRCodeTest4() throws FileNotFoundException {
        QrConfig qrConfig = new QrConfig(1000, 1000);
        qrConfig.setErrorCorrection(ErrorCorrectionLevel.H);
        //使用 ClassLoader 读取利用类加载器去获取路径是最稳妥的。
        String imgPath = this.getClass().getResource("/liuyifei.jpg").getPath();
        qrConfig.setImg(new File(imgPath));

        QrCodeUtil.generate("https://www.baidu.com",qrConfig , FileUtil.file("D:/qrcode3.png"));
    }

* */
注意！！！
相对路径，会在当前类所在的包下寻找
String imgPath = this.getClass().getResource("liuyifei.jpg").getPath();
如果图片在 resources 根目录下，必须加 / 变成绝对路径：
绝对路径，从 classpath 根目录开始找
String imgPath = this.getClass().getResource("/liuyifei.jpg").getPath();
//准备工作-账号申请
/*
*扫码登录微信有两种实现方式
* 1、基于微信公众号平台的扫码登录
* 让第三方应用投入微信的怀抱而设计的，这第三方应用指的是比如android、ios、web等应用
* 2、基于微信开放平台的扫码登录
* 为了让程序员小伙伴利用微信自家技术(公众号、小程序)开发公众号、小程序而准备的
* 区别:
* 微信开放平台需要开企业认证才能注册
* 微信公众号平台需要认证微信服务号，才能进行扫码登录的开发。只需要申请一个公众号
微信为每个微信号提供了一个测试公众号申请:
网址: https://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
扫码获取测试号信息，包括:appID 和 appsecret
我的是:
appID:
wx223934c2498d026b
appsecret:
8936221f8146f8002f451062dd0f94aa

接口配置(目的就是让微信服务器能发送消息到我们的服务器上):
下面可以看到还要填写接口配置信息，要填URL和Token
这里的信息需要是我们开发的应用的URL，URL需要正确响应微信发送的Token验证
填写完URL和Token，点击提交按钮
微信会通过这个URL调用我们的服务器，如果不通过或者返回合适的值，就会配置不成功
微信服务器将发送GET请求到填写的服务器地址URL上，GET请求携带的参数如下:
signature: 微信加密签名，signature结合了开发者填写的token参数和请求中的timestamp参数、nonce参数。
timestamp: 时间戳
nonce: 随机数
echostr: 随机字符串
开法者需要检验signature对请求进行校验，如果这个GET请求是来自微信服务器，需要将echostr返回给微信服务器，此时就算是接入成功，否则，接入失败
检验方法步骤:
1、将token、timestamp、nonce三个参数进行字典序排序
2、将三个参数字符串拼接成一个字符串进行sha1加密
3、开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
但是我们服务器的IP是内网的，外界服务器无法访问，此时就需要用到内网穿透工具，临时将内网的服务器映射到公网，方便微信服务器访问我们的服务器

内网穿透工具:cpolar
打开cpolar终端窗口输入cpolar http 8080
终端会立刻输出类似这样的信息：
Session Status    online
Forwarding        https://xxxxxxxxxx.cpolar.top -> http://localhost:8080
其中 https://xxxxxxxxxx.cpolar.top 就是你临时的公网地址。任何人通过这个链接都能访问你本地的 8080 端口。

我这里的是http://550bef0d.r31.cpolar.top
创建一个控制类和方法
@RestController
@Slf4j
public class WxSignatureCheck {
    @RequestMapping("/checkSignature")
    public String checkSignature(SIGN sign) {
     log.info("收到微信交校验请求，echostr:{}",sign.getEchostr());
        return sign.getEchostr();
    }
}
这里是没有真正进行签名校验的，只是返回了echostr参数，表示接入成功，后续可以在这个方法中进行签名校验
是将四个参数封装到一个类SIGN中，使用get方法获取echostr参数，然后返回给微信服务器
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SIGN {
    private String signature;
    private String timestamp;
    private String nonce;
    private String echostr;
}
此时的URL就是http://550bef0d.r31.cpolar.top/checkSignature
随便写一个Token。运行项目后，点击提交按钮，
微信会发送GET请求到我们服务器的/checkSignature接口上，携带参数signature、timestamp、nonce、echostr
*

回调域名:
注意！！！
再微信公众号请求用户网页授权之前，开发者需要到公众号平台官网中的设置与开发-》功能设置-》网页授权域名中修改授权回调域名
直接在测试号管理页中
点击体验接口权限表中的网页服务中的网页账号(网页授权获取用户基本信息)的右侧修改按钮，就会弹出一个窗口，填写域名，然后点击保存
注意！！！
这里填写的是域名(是一个字符串)，不是一个URL，不加http://等协议
*
*

*
测试二维码:
让多个用户都可以使用这个测试账号，同一个开发团队的用户使用同一个测试账号进行开发和测试
扫描测试号管理页中的测试号二维码
* */

//实现细节
/*
*第一步:用户同意授权，获取code
* 确保微信公众号有授权作用域(scope参数)的权限的前提下(已认证的服务号，默认拥有scope参数中的snsapi_base和snsapi_userinfo两个权限)，
* 引导用户进入授权页面同意授权，获取code
微信服务器提供了一个跳转授权页面的链接:
https://open.weixin.qq.com/connect/oauth2/authorize?appid=APPID&redirect_uri=REDIRECT_URI&response_type=code
&scope=SCOPE&state=STATE#wechat_redirect
链接中的参数
appid: 微信公众号唯一标识appid(必填)

redirect_uri: 授权后重定向的回调链接地址，使用URLEmcoder类对象调用encode方法对链接进行处理(必填)

response_type: 返回类型，请填写code(必填)

scope: 应用授权作用域，值为snsapi_base(不弹出授权页面，直接跳转，只能获取用户openid)，
值为snsapi_userinfo(弹出授权页面，可通过openid拿到昵称、性别、所在地。并且，即使在未关注的情况下，只要用户授权，也能获取其信息)

state: 重定向后会带上state参数，开发者可以填写a-zA-Z0-9的参数值，最多128字节(可选)

#wechat_redirect: 无论直接打开还是做页面302重定向时候，必须带此参数

forcePopup: 强制此次授权需要用户弹窗确认，默认为false；需要注意的是，若用户命中了特殊场景下的静默授权逻辑，则此参数不生效(可选)
*
*
但是不能让用户自己去输入这个链接，所以需要将这个链接生成二维码，用户扫描二维码后就会跳转到这个链接，进入授权页面
*

接口编写为:
   @GetMapping("/wxlogin")
    public void wxloginPage(HttpServletResponse response) throws Exception {
        String redirectUrl = URLEncoder.encode("http://550bef0d.r31.cpolar.top/wxcallback", "UTF-8");
        //用获取的公网域名和接口的请求地址拼接成完整的回调地址，然后使用URLEncoder类对象调用encode方法对链接进行处理，
        //当用户扫码并确认授权之后，会跳转到这个回调地址，访问wxcallback这个接口，并携带code参数
        String url = "https://open.weixin.qq.com/connect/qrconnect?appid=wx223934c2498d026b&redirect_uri="
                + redirectUrl + "&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect";
        response.setContentType("image/png");//设置响应头为图片格式的png
        QrCodeUtil.generate(url,300,300,"jpg",response.getOutputStream());
        //生成二维码，并将二维码图片写入响应输出流
        log.info("生成二维码成功");
    }

*第二步:通过code换取网页授权access_token(与基础支持中的access_token不同)
用户扫完码之后，点击同意授权按钮之后，需要通过拿到的code换取网页授权access_token
需要通过一个链接来获取access_token
https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
链接中的参数
appid: 微信公众号唯一标识appid(必填)
secret: 获取access_token的凭证(必填)就是公众号提供的appsecret
code: 填写第一步获取的code参数(必填)
grant_type: 填authorization_code(必填)

响应结果中包括:
access_token(具有有效期，单位是秒): 网页授权接口调用凭证,注意：此access_token与基础支持的access_token不同
expires_in: access_token的过期时间，单位是秒
refresh_token: 用于刷新access_token
openid: 用户的唯一标识，注意，在未关注公众号时，用户访问公众号的网页，也会产生一个用户和公众号唯一的OpenID
scope: 用户授权的作用域，使用逗号（,）分隔，如：snsapi_userinfo snsapi_friends
is_snapshot_user: 是否为快照页模式虚拟账号，只有当用户是快照页模式虚拟账号时，返回此字段，值为1
unionid: 用户统一标识(针对一个微信开放平台账号下的多个应用，同一个用户访问时产生的unionid是唯一的(同一个))只有当scope为snsapi_userinfo时返回

因为返回的数据很多，所以定义一个类来封装响应结果
@Data
public class TokenInfo {
private String access_token;
private Integer expires_in;
private String refresh_token;
private String openid;
private String scope;
private Integer is_snapshot_user;
private String unionid;
}

编写回调的接口
@RequestMapping("/wxcallback")
@ResponseBody
public String pccallback(String code,String state,HttpServletRequest request,
HttpServletResponse response.HttpSession session) throws Exception {
 user=WechatUtil.getUserInfo(code);
 return JSON.toJSONString(user);
 }

*第三步:如果需要，开发者可以刷新网页授权access_token，避免过期
因为access_token的有效期很短，当access_token失效时，可以通过refresh_token获取新的access_token
refresh_token的有效期为30天，当refresh_token失效时，需要用户重新授权
请求方法:
当获取第二步的refresh_token之后，请求以下的链接获取新的access_token
https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=APPID&grant_type=refresh_token&refresh_token=REFRESH_TOKEN
链接中的参数:
appid: 微信公众号唯一标识appid(必填)
grant_type: 填写为refresh_token(必填)
refresh_token: 填写通过access_token获取到的refresh_token参数(必填)


*第四步:通过网页授权access_token和openid获取用户基本信息(需scope为snsapi_userinfo)支持UnionID机制
*请求方法:
GET方式的http请求
https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
链接中的参数:
access_token: 网页授权接口调用凭证,注意：此access_token与基础支持的access_token不同
openid: 用户的唯一标识
lang: 返回国家地区语言版本，zh_CN 简体，zh_TW 繁体，en 英语


编写点击统一授权按钮，将code传递给后端的接口，后端通过code换取accseeToekn，并返回响应值的方法
 使用SpringBoot提供的HttpClient工具类发送GET请求，获取响应值，并将响应值封装到TokenInfo对象中返回给前端
public static WechatUser getUserInfo(String code) throws Exception {
HttpClient client = HttpClientBuilder.createDefault();
String tokenUrl = "https://api.weixin.qq.com/sns/oauth2/access_token?
appid="+appID+"&secret="+secret+"&code="+code+"&grant_type=authorization_code";
HttpGet get = new HttpGet(tokenUrl);
String responseResult =" ";
HttpResponse response = client.execute(get);
if (response.getStatusLine().getStatusCode() == 200) { //响应成功
 responseResult = EntityUtils.toString(response.getEntity(),"UTF-8");
    }
 log.info("获取access_token返回的结果："+responseResult);
 //将响应结果转换成TokenInfo对象
 TokenInfo tokenInfo = JSON.parseObject(responseResult, TokenInfo.class);
 //用access_token获取用户信息
 String userInfoUrl = "https://api.weixin.qq.com/sns/userinfo?access_token="+
 tokenInfo.getAccess_token()+"&openid="+tokenInfo.getOpenid()+"&lang=zh_CN";
//构造http请求客户端
HttpGet httpGet = new HttpGet(userInfoUrl);
//接受数据
HttpResponse userInfoResponse = client.execute(httpGet);
if (userInfoResponse.getStatusLine().getStatusCode() == 200) { //响应成功
 responseResult = EntityUtils.toString(userInfoResponse.getEntity(),"UTF-8");
}
log.info("获取用户信息返回的结果："+responseResult);
//将响应结果转换成WechatUser对象
WechatUser user = JSON.parseObject(responseResult, WechatUser.class);
return user;


 }


 可以拿到并返回的用户信息包括
 openid: 用户唯一标识
 nickname: 用户昵称
 sex: 用户性别
 province: 用户所在省份
 city: 用户所在城市
 country: 用户所在国家
 headimgurl: 用户头像
 privilege: 用户特权信息
 unionid: 只有在用户将公众号绑定到微信开放平台帐号后，才会出现该字段
 这些信息就通过定义一个类WechatUser来封装

 第五步:保存本地会话
 获取到用户授权的信息后，需要保存在应用端，防止频繁需要用户授权
 本地会话实现方式可用:Redis+Cookie、JWT令牌等技术
 本地会话保存之后就能进行前端页面跳转到首页，或者其他页面
 */
注意！！！
 OpenID（用户唯一标识）
用户在一个 AppID 下的专属编号
规则：同一个用户，在不同AppID里，OpenID 不一样
用户 A 在你的 APP（AppID1）→ OpenID-A
用户 A 在你的小程序（AppID2）→ OpenID-B