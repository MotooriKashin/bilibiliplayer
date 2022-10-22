/**
 * Rebuild player config from input.
 *
 * @author Hellcom
 */
import { PlaylistDataConverted } from './rebuild-playlist-noview-data';

export interface IPlayerConfig {
    element: HTMLElement;
    theme: string;
    parentId: string;
    namespace: string;
    storageName: string;
    aid: number;
    cid: number;
    bvid: string;
    seasonId: number;
    episodeId: number;
    p: number;
    live: boolean;
    hasNext: boolean; // 是否有下一P
    listLoop: boolean; // 播放列表循环
    autoplay: boolean;
    playerType: number;
    seasonType: number; // 番剧的业务类型:1番剧；2-电影；3-记录片；4-国漫；5-电视剧
    lastepid: number | null;
    lastplaytime: number | null;
    enableSSLStream: boolean;
    enableSSLResolve: boolean;
    dev: boolean;
    extra: boolean;
    logger: boolean;
    autoShift: boolean; // 自动换P标识，仅供稍后再看使用
    watchlater: boolean;
    playlist: PlaylistDataConverted;
    playlistId: number;
    playlistBvid?: string;
    playlistOtype?: number; // 音/视频类型
    playlistType: number; // 1空间页 2稍后再看 3收藏夹 4每周必看
    playlistFirstRid: number;
    playlistFirstType: number;
    playlistPn: number;
    beforeplay: Function;
    afterplay: Function;
    extraParams?: string;
    plMax?: number;

    t?: string | null;
    d?: string;
    pb?: boolean;
    ad?: string;
    preAd?: boolean;
    asWide?: boolean;
    admode?: number;
    quality?: number;
    record?: string;
    danmaku?: boolean;
    hasDanmaku?: boolean; // 是否有弹幕功能
    skipable?: boolean;
    isListSpread?: number;
    verticalDanmaku?: boolean; // 竖排弹幕 愚人节活动
    isAudio?: boolean; // 是否为音频资源
    lightWeight?: boolean; // 是否为轻量级播放器（就是功能少）
    gamePlayer?: boolean; // 是否为游戏播放器
    stableController?: boolean; // 是否总是显示控制栏

    dashSymbol?: boolean; // 是否请求dash playurl地址
    inner?: boolean; // 是否请求内网 playurl地址
    upPreview?: boolean; // 是否请求 up 预览接口
    disableInteractive?: boolean; // 禁止互动视频功能

    interactiveNode?: string; // 互动视频当前node
    interactiveTime?: number; // 互动选项选择时间
    editorEdges?: boolean; //互动视频编辑模式
    interactivePreview?: boolean; // 是否是互动视频预览
    interactiveGraphId?: number; // (审核用) 互动视频审核图ID
    interactivePersistentDanmaku?: boolean; // 互动选项切 p 时是否保留弹幕
    musth5?: boolean; // 不支持flash跳转
    show_bv?: number;
    noEndPanel?: boolean;
    type?: number; // 播放器类型
    touchMode?: boolean; // 触摸屏模式
    s_from?: number; // 视频分享的开始时间
    s_to?: number; // 视频分享的结束时间
    isPremiere?: number; // 是否为首播EP：0-否；1-是
    start_progress?: string | null; // 运营配置的视频跳转时间(ms)
    dmid?: string | null;
    dmProgress?: number | null;
    recommendAutoPlay?: boolean;
}
export interface IPlayerConfigExtend extends IPlayerConfig {
    [key: string]: any;
}