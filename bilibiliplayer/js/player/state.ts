export type SendPoolTuple = Readonly<[number, number]>;
export type SendInputTuple = Readonly<[number, number]>;
export type SendModeTuple = Readonly<[number, number, number, number]>;
export type SendFontSizeTuple = Readonly<[number, number, number, number, number, number, number]>;

/**
 * @desc playurl fnval类型（由playurl接口定义）
 * - 0 优先返回 flv 格式视频地址
 * - 1 只返回 mp4 格式的视频地址
 * - 16 优先返回 DASH-H265 视频的JSON内容
 * - 64 优先返回 HDR 的视频地址
 * - 128 优先返回 4K 的视频地址
 * - 256 优先返回 杜比音频 的视频地址
 * - 512 优先返回 杜比视界 的视频地址
 * - 1024 优先返回 8K 的视频地址
 * - 2048 优先返回 AV1 的视频地址
 */
export enum FNVAL_TYPE {
    FLV = 0,
    MP4 = 1,
    DASH_H265 = 16,
    HDR = 64,
    DASH_4K = 128,
    DOLBYAUDIO = 256,
    DOLBYVIDEO = 512,
    DASH_8K = 1024,
    DASH_AV1 = 2048
}
export enum PLAYER_CODEC_ID {
    HEVC_CODEC_ID = 12,
    AV1_CODEC_ID = 13
}
export interface PLAYER_STATE {
    video_state: number;
    repeat: boolean;
    danmaku: boolean;
    mode: number;
    play_type: number;
    video_type: number;
    /** 视频场景：1-单视频页 2-多p视频页 3-合集视频页 4-播单视频页 5-ogv视频页 6-拜年祭2021页 */
    video_scene: number;
    panoramicGesture: boolean;
}
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

    // 弹幕字体：[极小, 超小, 小, 中, 大, 超大, 极大]
    static readonly SEND_FONT_SIZE_UNLOGIN: SendFontSizeTuple = [0, 0, 0, 0, 0, 0, 0];
    static readonly SEND_FONT_SIZE_LIMITED: SendFontSizeTuple = [0, 0, 1, 1, 0, 0, 0];
    static readonly SEND_FONT_SIZE_REGISTERED: SendFontSizeTuple = [0, 0, 1, 1, 0, 0, 0];
    static readonly SEND_FONT_SIZE_NORMAL: SendFontSizeTuple = [0, 0, 1, 1, 0, 0, 0];
    static readonly SEND_FONT_SIZE_VIP: SendFontSizeTuple = [0, 1, 1, 1, 1, 0, 0];
    static readonly SEND_FONT_SIZE_ADVANCED: SendFontSizeTuple = [1, 1, 1, 1, 1, 1, 1];
    static readonly SEND_FONT_SIZE_ADMIN: SendFontSizeTuple = [0, 0, 1, 1, 1, 0, 0];

    // 弹幕模式：[滚动, 顶端, 低端, 逆向]
    static readonly SEND_MODE_UNLOGIN: SendModeTuple = [0, 0, 0, 0];
    static readonly SEND_MODE_LIMITED: SendModeTuple = [1, -2, -2, 0];
    static readonly SEND_MODE_REGISTERED: SendModeTuple = [1, -2, -2, 0];
    static readonly SEND_MODE_NORMAL: SendModeTuple = [1, -2, -2, 0];
    static readonly SEND_MODE_VIP: SendModeTuple = [1, 1, 1, 1];
    static readonly SEND_MODE_ADVANCED: SendModeTuple = [1, 1, 1, 1];
    static readonly SEND_MODE_LEVEL_LOW: SendModeTuple = [1, -2, -2, 0];
    static readonly SEND_MODE_LEVEL_TWO: SendModeTuple = [1, -2, -2, 0];
    static readonly SEND_MODE_LEVEL_NORMAL: SendModeTuple = [1, 1, 1, 0];

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
    static readonly SEND_ANSWER_STATUS_IN = 15; // 答题 状态  答题中
    static readonly SEND_STATUS_CANNOT_BUY = 16; // 课程调整中，暂不支持发送弹幕
    static readonly SEND_STATUS_UP_DM = 17; // 发个弹幕和观众互动吧

    // [输入框字数, 发送间隔]
    static readonly SEND_INPUT_UNLOGIN: SendInputTuple = [0, 100000];
    static readonly SEND_INPUT_LIMITED: SendInputTuple = [20, 10000];
    static readonly SEND_INPUT_REGISTERED: SendInputTuple = [20, 10000];
    static readonly SEND_INPUT_NORMAL: SendInputTuple = [100, 5000];
    static readonly SEND_INPUT_VIP: SendInputTuple = [100, 1000];
    static readonly SEND_INPUT_ADVANCED: SendInputTuple = [100, 1000];

    // 错误码
    static readonly PLAYER_ERROR = 1; // player接口失败
    static readonly PLAYER_NETWORK_ERROR = 1101; // 网络错误
    static readonly PLAYER_FORM_ERROR = 1103; // 返回数据不是标准xml格式
    static readonly PLAYER_ANALYZE_ERROR = 1104; // 返回数据是标准xml格式，但数据中包含<error>字段
    static readonly PLAYURL_ERROR = 2; // Playurl失败
    static readonly PLAYURL_NETWORK_ERROR = 2101; // playurl 网络错误
    static readonly PLAYURL_FORM_ERROR = 2103; // playurl json解析失败
    static readonly PLAYURL_RESOLVE_ERROR = 2104; // playurl 返回参数错误
    static readonly PLAYURL_BANGUMI_NETWORK_ERROR = 2108; // bangumi playurl 网络错误
    static readonly PLAYURL_BANGUMI_FORM_ERROR = 2110; // bangumi playurl json解析失败
    static readonly PLAYURL_BANGUMI_RESOLVE_ERROR = 2111; // bangumi playurl 返回参数错误
    static readonly VIDEO_ERROR = 3; // 与视频CDN建立链接失败
    static readonly VIDEO_URL_ERROR = 3001; // 获取到的url不正常
    static readonly VIDEO_ANALYZE_ERROR = 3002; // 获取到的数据格式不正常
    static readonly VIDEO_PLAY_ERROR = 3104; // mp4播放错误，可能是地址过期或地址不正确或断流
    static readonly NETWORK_EXCEPTION = 3111; // 网络错误
    static readonly NETWORK_STATUS_CODE_INVALID = 3112; // 网络状态码错误（403, 404等）
    static readonly NETWORK_UNRECOVERABLE_EARLY_EOF = 3113; // 断流，且重连失败
    static readonly NETWORK_RECOVERED_EARLY_EOF = 3114; // 断流，自动重试成功
    static readonly MEDIA_MSE_ERROR = 3121; // MSE错误
    static readonly MEDIA_FORMAT_ERROR = 3122; // 格式错误
    static readonly MEDIA_FORMAT_UNSUPPORTED = 3123; // 不是flv格式
    static readonly MEDIA_CODEC_UNSUPPORTED = 3124; // 不支持的音视频编码
    static readonly ABNORMAL_SEGMENT_BYTELENGTH = 3125; // abnormal_segment_bytelength

    // 错误提示信息
    static readonly ERROR_MESSAGES = {
        3104: '无法连接服务器或服务器返回异常',
        3111: '无法连接服务器',
        3112: '服务器返回异常',
        3113: '服务器连接中断',
        3121: '浏览器解码出错',
        3122: '视频格式错误',
        3123: '视频格式不支持',
        3124: '视频编码不支持',
        3125: '视频片段的字节长度不正确',

        4000: 'Dash播放器初始化错误',
        4001: 'MPD 下载错误',
        4002: 'XINK 下载错误',
        4003: 'INIT SEGMENT 下载错误',
        4004: 'MEDIA SEGMENT 下载错误',
        4005: 'INDEX SEGMENT 下载错误',
        4006: 'SWITCHING SEGMENT下载错误',
        4007: 'OTHER 下载错误',
        4008: 'SEGMENT fetch 下载错误',

        4100: 'Dash 卡死',

        5001: 'MPD 格式错误',
        5002: 'MPD 解析错误',

        6001: '媒体中断错误',
        6002: '媒体网络错误',
        6003: '媒体解码错误',
        6004: '媒体格式支持错误',
        6005: '媒体加密错误',
        6000: '媒体未知错误',
    };

    // 播放器内部事件列表
    static readonly EVENT = {
        VIDEO_MEDIA_ENTER: 'video_media_enter', // 视频第一次进入用户视野
        VIDEO_MEDIA_PLAY: 'video_media_play', // 播放
        VIDEO_MEDIA_PLAYING: 'video_media_playing', // 正在播放(真播放)
        VIDEO_MEDIA_CANPLAY: 'video_media_canplay', // canplay 事件
        VIDEO_MEDIA_PAUSE: 'video_media_pause', // 暂停
        VIDEO_MEDIA_SEEK: 'video_media_seek', // 开始seek
        VIDEO_MEDIA_SEEKING: 'video_media_seeking', // seek中
        VIDEO_MEDIA_SEEKED: 'video_media_seeked', // 结束seek
        VIDEO_MEDIA_SEEK_END: 'video_media_seek_end', // 结束seek(真结束)
        VIDEO_MEDIA_TIME: 'video_media_time', // 视频时间变化(每秒约3次)
        VIDEO_MEDIA_FRAME: 'video_media_frame', // 视频时间变化(逐帧回调)
        VIDEO_MEDIA_ERROR: 'video_media_error', // 视频出错
        VIDEO_MEDIA_BUFFER: 'video_media_buffer', // 开始缓冲
        VIDEO_MEDIA_BUFFER_END: 'video_media_buffer_end', // 结束缓冲
        VIDEO_MEDIA_BUFFER_FULL: 'video_media_buffer_full', // 视频缓冲完成
        VIDEO_MEDIA_LOADLAG: 'video_media_loadlag', // 视频卡顿
        VIDEO_MEDIA_ENDED: 'video_media_ended', // 视频播放结束
        VIDEO_MEDIA_VOLUME: 'video_media_volume', // 视频声音变化
        VIDEO_MEDIA_MUTE: 'video_media_mute', // 视频静音
        VIDEO_MEDIA_ATTACHED: 'video_media_attached', // 播放器容器加载完成
        VIDEO_PLAYER_LOAD: 'video_player_load', // 开始加载player接口
        VIDEO_PLAYER_LOADED: 'video_player_loaded', // 加载player接口完成
        VIDEO_PLAYURL_LOAD: 'video_playurl_load', // 开始加载playurl
        VIDEO_PLAYURL_LOADED: 'video_playurl_loaded', // 加载playurl完成
        VIDEO_METADATA_LOAD: 'video_media_load', // 开始加载metadata
        VIDEO_METADATA_LOADED: 'video_media_loaded', // 加载metadata完成
        VIDEO_DANMAKU_LOAD: 'video_danmaku_load', // 加载弹幕
        VIDEO_DANMAKU_LOADED: 'video_danmaku_loaded', // 加载弹幕
        VIDEO_PAGELIST_LOADED: 'video_pagelist_loaded', // 分P信息获取
        VIDEO_WEBSOCKET_LINK: 'video_websocket_link', // 开始连接websocket
        VIDEO_WEBSOCKET_LINKED: 'video_websocket_linked', // 已连接websocket
        VIDEO_WEBSOCKET_ERROR: 'video_websocket_error', // websocket连接出错
        VIDEO_WEBSOCKET_END: 'video_websocket_end', // 结束连接websocket
        VIDEO_INITIALIZING: 'video_initializing', // 初始化过程中
        VIDEO_INITIALIZED: 'video_initialized', // 初始化完成
        VIDEO_SCROLL: 'video_scroll', // 滚动
        VIDEO_RESIZE: 'video_resize', // 大小变化
        VIDEO_PLAYER_RESIZE: 'video_player_resize', // 容器大小变化
        VIDEO_PROGRESSBAR_RESIZE: 'video_progressbar_resize',
        VIDEO_REFULLSCREEN: 'video_refullscreen', // 全屏状态变化
        VIDEO_FULLSCREEN_MODE_CHANGED: 'video_fullscreen_mode_changed', // 全屏模式变化完成后触发
        VIDEO_MOUSEMOVE: 'video_mousemove', // 鼠标移动
        VIDEO_HEARTBEAT: 'video_heartbeat', // 心跳
        VIDEO_CONTROLBAR: 'video_controlbar', // 控制条显示与隐藏
        VIDEO_PROGRESS_UPDATE: 'video_progress_update', // 进度条
        VIDEO_BEFORE_DESTROY: 'video_before_destroy', // 销毁播放器之前
        VIDEO_DESTROY: 'video_destroy', // 销毁播放器
        VIDEO_LOG: 'video_log', // 播放器日志
        VIDEO_LOG_UPDATE: 'video_log_update', // 播放器日志更新
        VIDEO_LOG_CLOSE: 'video_log_close',
        VIDEO_PROMOTE_INIT: 'video_promote_init', // 播放器广告加载完毕
        VIDEO_PRELOAD_ERROR: 'video_preload_error',
        VIDEO_SUBTITLE_CHANGE: 'video_subtitle_change', // 字幕改变
        VIDEO_PANEL_HOVER: 'video_panel_hover', // hover显示浮层
        VIDEO_GUIDE_ATTENTION_POS_UPDATE: 'video_guide_attention_pos_update', // guide attention 更新

        VIDEO_MIRROR: 'video_mirror', // 切换镜像
        VIDEO_SIZE_RESIZE: 'video_size_resize', // 切换画面比例
        VIDEO_STATE_CHANGE: 'video_state_change', // video状态变化

        DASH_PLAYER_ERROR: 'dash_player_error',

        INTERACTIVE_VIDEO_ENDED: 'interactive_video_ended',
        INTERACTIVE_VIDEO_COUNTDOWN_START: 'interactive_video_countdown_start', //互动视频倒计时开始
        // INTERACTIVE_VIDEO_MIDDLE_COUNTDOWN_START: 'interactive_video_middle_countdown_start', //互动视频中插倒计时开始

        PLAYER_RELOAD: 'player_reload', // 播放器开始重载
        PLAYER_RELOADED: 'player_reloaded', // 播放器结束重载
        PLAYER_SEND: 'player_send', // 发送框数据更新

        DMID_LOAD_ERR: 'dmid_load_err', // 获取弹幕id 失败
    };

    static readonly QUALITY_NAME = {
        0: '自动',
        15: '360P 流畅',
        16: '360P 流畅',
        32: '480P 清晰',
        48: '720P 高清',
        64: '720P 高清',
        74: '720P60 高清',
        80: '1080P 高清',
        112: '1080P 高码率',
        116: '1080P 60帧',
        120: '4K 超清',
        125: 'HDR 真彩',
        126: '杜比视界',
        127: '8K 超高清'
    };

    // video_media_seek
    static readonly SEEK_TYPE = {
        DEFAULT: 0, // 未区分的程序 seek
        SLIDEBAR: 1, // 拖进度条 slidebar
        SLIDEKEY: 2, // 键盘按键 slidekey
        OUTER: 3, // 外部调用 player.seek
        PARAMS: 4, // t参数跳转行为
        TOAST: 5, // 历史toast跳转行为
    };

    // 埋点 logid
    static readonly TRACK = {
        OP: '001111',
        EVENT: '001114',
        AUDIO: '001156',
        MISAKA: 200002,
        QUALITYMONITOR: '002879',
    };
    // theme
    static readonly THEME = {
        RED: 'red',
        GREEN: 'green',
        BLUE: 'blue',
    };
}
