export type SendPoolTuple = Readonly<[number, number]>;
export type SendInputTuple = Readonly<[number, number]>;
export type SendModeTuple = Readonly<[number, number, number, number]>;
export type SendFontSizeTuple = Readonly<[number, number, number, number, number, number, number]>;

export default class STATE {
    // filter tab
    static readonly TAB_RECOMMEND = 1;
    static readonly TAB_WATCHLATER = 2;
    static readonly TAB_PLAYLIST = 3;
    static readonly TAB_DANMAKULIST = 4;
    static readonly TAB_BLOCKLIST = 5;

    // 界面状态
    static readonly UI_NORMAL = 0; // 普通模式
    static readonly UI_WIDE = 1; // 宽屏模式
    static readonly UI_WEB_FULL = 2; // 网页全屏
    static readonly UI_FULL = 3; // 全屏模式
    static readonly UI_MINI = 4; // 迷你播放器

    // 视频状态
    static readonly V_IDEL = 0; // 未初始化 空闲状态
    static readonly V_READY = 1; // 加载完视频
    static readonly V_BUFF = 2; // 缓冲状态
    static readonly V_PLAY = 3; // 播放状态
    static readonly V_PAUSE = 4; // 暂停状态
    static readonly V_COMPLETE = 5; // 播放完毕

    // 弹幕状态
    static readonly DM_OFF = false; // 关闭弹幕
    static readonly DM_ON = true; // 开启弹幕

    // 循环播放
    static readonly V_REPEAT_OFF = false; // 关闭循环
    static readonly V_REPEAT_ON = true; // 开启循环

    // 用户角色
    static readonly USER_UNLOGIN = 0; // 未登录
    static readonly USER_LIMITED = 1; // 受限制
    static readonly USER_REGISTERED = 2; // 已注册
    static readonly USER_NORMAL = 3; // 正式用户
    static readonly USER_VIP = 4; // VIP
    static readonly USER_ADVANCED = 5; // 职人

    // 用户身份
    static readonly P_ROLE_FREE = 0; // 没有身份
    static readonly P_ROLE_ASSISTANT = 1; // 协管身份

    // 屏蔽
    static readonly BLOCK_DISABLED = 0; // 未屏蔽
    static readonly BLOCK_SCROLL = 1; // 滚动弹幕
    static readonly BLOCK_REVERSE = 2; // 逆向弹幕
    static readonly BLOCK_BOTTOM = 3; // 底部弹幕
    static readonly BLOCK_TOP = 4; // 顶部弹幕
    static readonly BLOCK_COLOR = 5; // 彩色弹幕
    static readonly BLOCK_GUEST = 6; // 游客弹幕
    static readonly BLOCK_FONTSIZE = 7; // 字体大小
    static readonly BLOCK_NORMAL = 8; // 普通弹幕
    static readonly BLOCK_SUBTITLE = 9; // 字幕弹幕
    static readonly BLOCK_SPECIAL = 10; // 高级弹幕
    static readonly BLOCK_LIST_USER = 11; // 用户屏蔽
    static readonly BLOCK_LIST_KEYWORD = 12; // 关键词屏蔽
    static readonly BLOCK_LIST_COLOR = 13; // 颜色屏蔽
    static readonly BLOCK_LIST_REGEXP = 14; // 正则匹配关键词
    static readonly BLOCK_CLOUD_VIDEO = 15; // 云屏蔽 视频
    static readonly BLOCK_CLOUD_PARTITION = 16; // 云屏蔽 分区
    static readonly BLOCK_CLOUD_ALL = 17; // 云屏蔽 全区
    static readonly BLOCK_CLOUD_UP = 18; // 云屏蔽 UP主

    // 屏蔽tab类型
    static readonly BLOCK_TAB_TEXT = 0; // 文本
    static readonly BLOCK_TAB_REGEXP = 1; // 正则
    static readonly BLOCK_TAB_USER = 2; // 用户

    // 弹幕类型：[普通弹幕, 字幕弹幕]
    // @ts-ignore
    // @see https://github.com/Microsoft/TypeScript/issues/13126
    // @see https://github.com/Microsoft/TypeScript/pull/14646
    static readonly SEND_POOL_NORMAL: SendPoolTuple = [];
    static readonly SEND_POOL_ADMIN: SendPoolTuple = [1, 1];

    // 弹幕颜色
    static readonly SEND_COLOR_UNLOGIN = 0;
    static readonly SEND_COLOR_LEVEL_LOW = 1;
    static readonly SEND_COLOR_NORMAL = 2;

    // SEND 状态
    static readonly SEND_STATUS_UNLOGIN = 0; // 未登录
    static readonly SEND_STATUS_LEVEL_LOW = 1; // 等级不足LV1
    static readonly SEND_STATUS_MORAL_LOW = 2; // 节操不足60
    static readonly SEND_STATUS_DISABLED_WORDS = 3; // 无法发送弹幕
    static readonly SEND_STATUS_LIMITED = 4; // 禁言
    static readonly SEND_STATUS_NORMAL = 5; // 正常
    static readonly SEND_STATUS_TYPING = 6; // 输入中
    static readonly SEND_STATUS_BEYOND_WORDS = 7; // 输入超出字数
    static readonly SEND_STATUS_SENDING = 8; // 发送中
    static readonly SEND_STATUS_SENT = 9; // 发送完成
    static readonly SEND_STATUS_FREQUENTLY = 10; // 发送太频繁
    static readonly SEND_STATUS_BLOCKING = 11; // 封禁中,天数>0
    static readonly SEND_STATUS_BLOCKED = 12; // 被封禁,天数<0
    static readonly SEND_STATUS_CLOSED = 13; // 系统关闭了这个视频的弹幕功能
    static readonly SEND_STATUS_UPDATE = 14; // 该视频弹幕为空

    // SEND 状态
    static readonly DANMAKU_LIST_DEFAULT = 0; // 弹幕列表默认状态
    static readonly DANMAKU_LIST_CLOSED = 1; // 弹幕列表关闭
    static readonly DANMAKU_LIST_UPDATE = 2; // 弹幕列表升级

    // [输入框字数, 发送间隔]
    static readonly SEND_INPUT_UNLOGIN: SendInputTuple = [0, 100000];
    static readonly SEND_INPUT_LIMITED: SendInputTuple = [20, 10000];
    static readonly SEND_INPUT_REGISTERED: SendInputTuple = [20, 10000];
    static readonly SEND_INPUT_NORMAL: SendInputTuple = [220, 5000];
    static readonly SEND_INPUT_VIP: SendInputTuple = [220, 1000];
    static readonly SEND_INPUT_ADVANCED: SendInputTuple = [220, 1000];

    // 播放器内部事件列表
    static readonly EVENT = {
        AUXILIARY_PANEL_RESIZE: 'auxiliary_panel_resize', // 辅助面板resize
        AUXILIARY_PANEL_RELOAD: 'auxiliary_panel_reload', // 辅助面板reload
        AUXILIARY_PANEL_DESTROY: 'auxiliary_panel_destroy', // 辅助面板destroy
        AUXILIARY_PANEL_SCROLL: 'auxiliary_panel_scroll', // 辅助面板scroll
        AUXILIARY_PANEL_REFULLSCREEN: 'auxiliary_panel_refullscreen', // 辅助面板refullscreen
        AUXILIARY_PANEL_CHANGE: 'auxiliary_panel_change', // 辅助面板切换
    };
    // 播放器内部事件列表
    static readonly PANEL = {
        DANMAKU: 'danmakuList',
        BLOCK: 'blockSetting',
        ADVDANMAKU: 'advDanmaku',
        CODEDANMAKU: 'codeDanmaku',
        BASDANMAKU: 'basDanmaku',
        BASDANMAKUVISUAL: 'basDanmakuVisual',
        FUNCTIONWINDOW: 'functionWindow'
    };

    // 埋点 logid
    static readonly TRACK = {
        OP: '001111',
        EVENT: '001114',
    };
    // theme
    static readonly THEME = {
        RED: 'red',
        GREEN: 'green',
        BLUE: 'blue',
    };
}
