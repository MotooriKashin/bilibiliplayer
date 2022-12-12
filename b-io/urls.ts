export class URLS {
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

    static readonly USER_CARD = URLS.P_AUTO + URLS.D_API + '/x/web-interface/card'; // 用户卡片
}