/**
 * 类别描述：
 *   - Playurl
 *   - Player
 *   - 弹幕
 *   - 稍后再看、播单
 *   - 广播
 *   - 上报、监控
 *   - 广告
 *   - 其他
 */
export default class URLS {
    // protocol + //
    private static readonly P_AUTO = '//';
    private static readonly P_HTTP = 'http://';
    private static readonly P_HTTPS = 'https://';
    private static readonly P_WS = 'ws://';
    private static readonly P_WSS = 'wss://';

    // domain
    private static readonly D_WWW = 'www.bilibili.com';
    private static readonly D_API = 'api.bilibili.com';
    private static readonly D_MANAGER = 'manager.bilibili.co';
    private static readonly D_INTERFACE = 'interface.bilibili.com';
    private static readonly D_PASSPORT = 'passport.bilibili.com';
    private static readonly D_BANGUMI = 'bangumi.bilibili.com';
    private static readonly D_SPACE = 'space.bilibili.com';
    private static readonly D_STATIC_S = 'static.hdslb.com';
    private static readonly D_CHAT = 'chat.bilibili.com';
    private static readonly D_DATA = 'data.bilibili.com';
    private static readonly D_COMMENT = 'comment.bilibili.com';
    private static readonly D_BROADCAST = 'broadcast.bilibili.com';
    private static readonly D_MISAKA_SW = 'misaka-sw.bilibili.com';
    private static readonly D_MEMBER = 'member.bilibili.com';
    private static readonly D_BVC = 'bvc.bilivideo.com';
    private static readonly D_S1 = 's1.hdslb.com';

    /**
     * @kind Playurl
     */
    static readonly PLAYURL = URLS.P_AUTO + URLS.D_API + '/x/player/playurl'; // ugc playurl
    static readonly PLAYURL_PRE = URLS.P_AUTO + URLS.D_API + '/x/stein/playurl'; // interactive preview playurl
    static readonly PLAYURL_PGC = URLS.P_AUTO + URLS.D_API + '/pgc/player/web/playurl';
    static readonly PLAYURL_PUGV = URLS.P_AUTO + URLS.D_API + '/pugv/player/web/playurl';
    static readonly PLAYURL_UP = URLS.P_AUTO + URLS.D_MEMBER + '/x/web/archive/video/playurl';
    static readonly PLAYURL_TOKEN = URLS.P_AUTO + URLS.D_API + '/x/player/playurl/token';
    static readonly PLAYURL_INNER = URLS.P_AUTO + URLS.D_MANAGER + '/v2/playurl'; // ugc inner playurl
    static readonly PLAYURL_AUDIO = URLS.P_AUTO + URLS.D_WWW + '/audio/music-service-c/web/url';

    /**
     * @kind Player
     */
    // static readonly PLAYER = URLS.P_AUTO + URLS.D_API + '/x/player.so'; // player接口
    static readonly PLAYER = URLS.P_AUTO + URLS.D_API + '/x/player/v2'; // 新player接口
    // http://bpre-api.bilibili.co/project/1941/interface/api/281403
    static readonly onlineNum = URLS.P_AUTO + URLS.D_API + '/x/player/online/total'; // 全站的在线人数
    static readonly X_PLAYER_VIDEOSHOT = URLS.P_AUTO + URLS.D_API + '/x/player/videoshot'; // 帧预览
    static readonly X_PLAYER_PAGELIST = URLS.P_AUTO + URLS.D_API + '/x/player/pagelist'; // 连播视频信息
    static readonly SPONSOR_RANKWEB_RANKLIST = URLS.P_AUTO + URLS.D_BANGUMI + '/sponsor/rankweb/rank_list'; // bangumi承包排行
    static readonly WEBAPI_GETEPLIST = URLS.P_AUTO + URLS.D_API + '/pgc/web/season/section'; // bangumi连播
    static readonly PLUS_COMMENT = URLS.P_AUTO + URLS.D_WWW + '/plus/comment.php'; // 评分操作
    static readonly X_RELATION_MODIFY = URLS.P_AUTO + URLS.D_API + '/x/relation/modify'; // 关注
    static readonly PREMIERE_STATUS = URLS.P_AUTO + URLS.D_API + '/pgc/premiere/status'; // 首播EP状态
    static readonly USER_RELATION = URLS.P_AUTO + URLS.D_API + '/x/web-interface/relation'; // 获取指定用户是否关注

    // 控制新旧开关的功能
    // {code:0, data: {data: 'old'}, message: ''}
    // data.data = old 老功能
    // data.data = new 新功能
    static readonly X_PLAYER_POLICY = URLS.P_AUTO + URLS.D_API + '/x/player/policy?id=1';

    /**
     * @kind 弹幕
     */
    static readonly ADM_COMMENT = URLS.P_AUTO + URLS.D_API + '/x/dm/adv/state'; // 高级弹幕权限
    static readonly ADM_COMMENT_BUY = URLS.P_AUTO + URLS.D_API + '/x/dm/adv/buy'; // 高级弹幕购买

    static readonly DM_LIST = URLS.P_AUTO + URLS.D_API + '/x/v1/dm/list.so'; // 弹幕列表
    static readonly DM_PB = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/web/seg.so'; // 弹幕列表
    static readonly DM_PB_HISTORY = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/web/history/seg.so'; // 历史弹幕列表
    static readonly DM_PB_VIEW = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/web/view'; // 弹幕列表VIEW
    // https://info.bilibili.co/pages/viewpage.action?pageId=3672133
    static readonly DM_POST = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/post'; // 弹幕post地址
    // https://info.bilibili.co/pages/viewpage.action?pageId=119927674
    static readonly DM_COMMAND_POST = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/command/post'; // 指令弹幕post地址

    static readonly DM_VOTE = URLS.P_AUTO + URLS.D_API + '/x/web-interface/view/dm/vote';
    static readonly DM_SCORE = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/command/grade/post';
    static readonly DM_SHRINK_CONF = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/command/user/conf';
    static readonly DM_CHECKIN = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/command/checkin/record/add';

    static readonly DM_RECALL = URLS.P_AUTO + URLS.D_API + '/x/dm/recall';
    static readonly DM_REPORT = URLS.P_AUTO + URLS.D_API + '/x/dm/report/add';
    // https://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3%EF%BC%88%E6%96%B0%EF%BC%89-%E6%8C%87%E4%BB%A4%E5%BC%B9%E5%B9%95%E5%88%A0%E9%99%A4
    static readonly DM_DEL = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/command/del';
    // https://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3%EF%BC%88%E6%96%B0%EF%BC%89-web%E5%BC%B9%E5%B9%95%E9%85%8D%E7%BD%AE%E4%BF%AE%E6%94%B9
    static readonly DM_SETTING = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/web/config'; // 弹幕设置面板
    static readonly DM_BLOCKLIST = URLS.P_AUTO + URLS.D_API + '/x/dm/filter/user'; // 弹幕操作
    static readonly DM_BLOCK = URLS.P_AUTO + URLS.D_API + '/x/dm/filter/user/add'; // 弹幕屏蔽
    static readonly DM_UNBLOCK = URLS.P_AUTO + URLS.D_API + '/x/dm/filter/user/del'; // 取消弹幕屏蔽
    static readonly DM_BLOCK_BATCH = URLS.P_AUTO + URLS.D_API + '/x/dm/filter/user/add2'; // 批量屏蔽
    // https://info.bilibili.co/pages/viewpage.action?pageId=124112158#id-%E5%AF%B9%E5%A4%96%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3-%E5%BC%B9%E5%B9%95%E7%82%B9%E8%B5%9E%E5%BC%B9%E5%B9%95%E8%AF%A6%E6%83%85%E6%8E%A5%E5%8F%A3
    static readonly DM_LIKE_STATS = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/thumbup/stats'; // 只获取弹幕点赞数
    static readonly DM_LIKE_INFO = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/thumbup/detail'; // 点赞弹幕详情
    static readonly DM_LIKE = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/thumbup/add'; // 弹幕点赞
    // http://bpre-api.bilibili.co/project/1531/interface/api/141143
    static readonly DM_AD = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/ad'; // 弹幕广告
    // http://bpre-api.bilibili.co/project/1531/interface/api/349989
    static readonly DM_AD_GET = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/ad/submit'; // 弹幕广告数据提交

    // https://info.bilibili.co/pages/viewpage.action?pageId=74356679#id-%E9%A2%84%E7%BA%A6%E6%B4%BB%E5%8A%A8%E6%8E%A5%E5%8F%A3-1.%E5%8F%96%E6%B6%88%E9%A2%84%E7%BA%A6%E6%8E%A5%E5%8F%A3
    static readonly RESERVE = URLS.P_AUTO + URLS.D_API + '/x/activity/reserve'; // 预约
    static readonly UN_RESERVE = URLS.P_AUTO + URLS.D_API + '/x/activity/reserve/cancel'; // 取消预约

    static readonly SM_FEEDBACK = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/subtitle/report/add';
    // 保护弹幕相关的接口
    static readonly DM_PROTECT_APPLY = URLS.P_AUTO + URLS.D_API + '/x/dm/protect/apply';

    // 超管接口
    static readonly SA_ADMIN_PANEL = URLS.P_AUTO + URLS.D_INTERFACE + '/admin_panel';
    static readonly SA_DM_STATE = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/edit/state';
    static readonly SA_DM_POOL = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/edit/pool';
    static readonly SA_DANMAKU_MANAGEMENT = URLS.P_AUTO + URLS.D_INTERFACE + '/dmm';
    static readonly SA_DM_FILTER_ADD = URLS.P_AUTO + URLS.D_API + '/x/v2/dm/filter/up/black';

    // COMMENT
    static readonly PVINFO = URLS.P_AUTO + URLS.D_COMMENT + '/pvinfo';

    // https://info.bilibili.co/pages/viewpage.action?pageId=2491046#web-interface%E9%A1%B9%E7%9B%AE%E6%96%87%E6%A1%A3-%E8%A7%86%E9%A2%91%E8%AF%A6%E6%83%85%E9%A1%B5%E7%9B%B8%E5%85%B3%E7%A8%BF%E4%BB%B6
    static readonly RECOMMEND = URLS.P_AUTO + URLS.D_API + '/x/web-interface/archive/related';
    static readonly PLAYTAG = URLS.P_AUTO + URLS.D_COMMENT + '/playtag';
    /** //comment.bilibili.com/recommend/${aid}.json?html5=1 */
    static readonly RECOMMEND_ORIGIN = URLS.P_AUTO + URLS.D_COMMENT + '/recommend/';

    /**
     * @kind 稍后再看、播单
     */
    // 稍后再看
    static readonly TOVIEW_ADD = URLS.P_AUTO + URLS.D_API + '/x/v2/history/toview/add';
    static readonly TOVIEW_GET = URLS.P_AUTO + URLS.D_API + '/x/v2/history/toview/web';
    static readonly TOVIEW_DEL = URLS.P_AUTO + URLS.D_API + '/x/v2/history/toview/del';

    // 播单 https://info.bilibili.co/pages/viewpage.action?pageId=88178293
    static readonly PLAYLIST_LIST = URLS.P_AUTO + URLS.D_API + '/x/v2/medialist/resource/list';
    static readonly PLAYLIST_INFO = URLS.P_AUTO + URLS.D_API + '/x/v1/medialist/info';

    /**
     * @kind 广播
     */
    // CHAT
    static readonly CHAT_WS = URLS.P_WS + URLS.D_CHAT + ':88';
    static readonly CHAT_WSS = URLS.P_WSS + URLS.D_CHAT + ':8443';

    // BROADCAST
    static readonly BROADCAST_WS = URLS.P_WS + URLS.D_BROADCAST + ':4090';
    static readonly BROADCAST_WSS = URLS.P_WSS + URLS.D_BROADCAST + ':4095';

    static readonly BROADCAST_GET = URLS.P_AUTO + URLS.D_API + '/x/web-interface/broadcast/servers';

    /**
     * @kind 上报、监控
     */
    static readonly MISAKA = URLS.P_AUTO + URLS.D_MISAKA_SW + '/misaka.gif?'; // MISAKA
    static readonly APM_MISAKA = URLS.P_AUTO + URLS.D_API + '/x/web-frontend/data/collector'; // apm_MISAKA
    static readonly X_REPORT_HEARTBEAT = URLS.P_AUTO + URLS.D_API + '/x/click-interface/web/heartbeat'; // 心跳
    static readonly X_REPORT_CLICK_NOW = URLS.P_AUTO + URLS.D_API + '/x/click-interface/click/now'; // 获取首次点击时间
    static readonly X_REPORT_CLICK_WEB_H5 = URLS.P_AUTO + URLS.D_API + '/x/click-interface/click/web/h5'; // 上报首次点击行为
    static readonly X_SHARE_ADD = URLS.P_AUTO + URLS.D_API + '/x/web-interface/share/add';
    static readonly BVC_REPORT = URLS.P_AUTO + URLS.D_BVC + '/pcdnd/webprom?content_type=json';
    static readonly FEEDBACK = URLS.P_AUTO + URLS.D_API + '/x/web-interface/feedback'; // 反馈

    // 原来统计用
    static readonly LOG_WEB = URLS.P_AUTO + URLS.D_DATA + '/log/web';

    /**
     * @kind 广告
     */
    static readonly X_PLAYER_CAROUSEL = URLS.P_AUTO + URLS.D_API + '/x/player/carousel.so'; // 顶部滚动消息
    static readonly X_WEBSHOW_RES_LOC = URLS.P_AUTO + URLS.D_API + '/x/web-show/res/loc?pf=0&id='; // 广告接口：用以展示播放器右侧广告
    static readonly X_AD_VIDEO = URLS.P_AUTO + URLS.D_API + '/x/ad/video'; // 贴片广告信息
    static readonly VIEW = URLS.P_AUTO + URLS.D_API + '/x/web-interface/view';
    static readonly PUGV_VIEW = URLS.P_AUTO + URLS.D_API + '/pugv/view/web/season';

    /**
     * @kind 其他
     */
    static readonly PAGE_LOGIN = URLS.P_HTTPS + URLS.D_PASSPORT + '/login'; // PASSPORT
    static readonly PAGE_REGISTER = URLS.P_HTTPS + URLS.D_WWW + '/register'; // Register
    static readonly PAGE_SPACE = URLS.P_AUTO + URLS.D_SPACE + '/'; // SPACE
    static readonly PAGE_HELP = URLS.P_AUTO + URLS.D_WWW + '/blackboard/help.html'; // Help
    static readonly BILI_QUICK_LOGIN = URLS.P_HTTPS + URLS.D_STATIC_S + '/account/bili_quick_login.js'; // QuickLogin
    static readonly MINI_LOGIN = URLS.P_HTTPS + URLS.D_S1 + '/bfs/seed/jinkela/short/mini-login/miniLogin.umd.min.js'; // MiniLogin
    static readonly CARD = URLS.P_AUTO + URLS.D_API + '/x/web-interface/card'; // 用户卡片信息
    static readonly JUMPCARD = URLS.P_AUTO + URLS.D_API + '/x/player/card/click'; // 用户预约、追番

    /**
     * @kind 互动视频
     */
    static readonly NODE_INFO = URLS.P_HTTPS + URLS.D_API + '/x/stein/nodeinfo'; // 查询下一节点信息
    static readonly NODE_INFO_V2 = URLS.P_HTTPS + URLS.D_API + '/x/stein/edgeinfo_v2'; // 查询下一节点信息(支持中插)
    static readonly IV_MARK = URLS.P_HTTPS + URLS.D_API + '/x/stein/mark'; // 互动视频评分
    static readonly NODE_INFO_PREVIEW = URLS.P_HTTPS + URLS.D_API + '/x/stein/nodeinfo/preview'; // 预览查询下一节点信息
    static readonly NODE_INFO_MANAGER = URLS.P_AUTO + URLS.D_MANAGER + '/x/stein/nodeinfo/audit'; // ugc inner playurl
    static readonly NODE_INFO_PREVIEW_V2 = URLS.P_HTTPS + URLS.D_API + '/x/stein/edgeinfo_v2/preview'; // 预览查询下一节点信息v2
    static readonly NODE_INFO_MANAGER_V2 = URLS.P_AUTO + URLS.D_MANAGER + '/x/stein/edgeinfo_v2/audit'; // ugc inner playurlv2
}
