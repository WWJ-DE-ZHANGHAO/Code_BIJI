package com.wwj.Constant;

public class TokenConstants {
  /*Token 有效期配置*/
    /** Access Token 有效期：15分钟 */
    public static final long ACCESS_TOKEN_TTL = 15 * 60 * 1000;

    /** Refresh Token 有效期：7天 */
    public static final long REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 * 1000;

    /** 提前刷新阈值：5分钟（剩余时间小于此值时自动刷新） */
    public static final long REFRESH_THRESHOLD = 5 * 60 * 1000;

    // ========== Redis Key 前缀 ==========
    /** Refresh Token 存储前缀 */
    public static final String REFRESH_TOKEN_KEY = "refresh_token:";

    /** 用户最新Refresh Token映射（用于单点登录） */
    public static final String USER_REFRESH_TOKEN_KEY = "user_refresh_token:";

    /** 管理员最新Refresh Token映射（用于单点登录） */
    public static final String ADMIN_REFRESH_TOKEN_KEY = "admin_refresh_token:";

    // ========== JWT Claims 字段 ==========
    /** Token类型 */
    public static final String CLAIM_TYPE = "type";

    /** Token类型：Access Token */
    public static final String TYPE_ACCESS = "access";

    /** Token类型：Refresh Token */
    public static final String TYPE_REFRESH = "refresh";

    /** 用户ID */
    public static final String CLAIM_USER_ID = "userId";

    /** 管理员ID */
    public static final String CLAIM_ADMIN_ID = "adminId";

    /** Token唯一标识 */
    public static final String CLAIM_TOKEN_ID = "tokenId";

    /** 设备信息 */
    public static final String CLAIM_DEVICE = "device";
}
