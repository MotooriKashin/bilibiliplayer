/**
 * Rebuild player config from input.
 *
 * @author Hellcom
 */
import { browser, noop } from '@shared/utils';
import Player from '../player';
import rebuildPlaylistData, { PlaylistDataConverted } from './rebuild-watchlater-data';

export interface IPlayerConfig {
    fjw?: boolean;
    replyDmid?: string;
    highQuality?: '1';
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
    sourcePlayer?: Player;
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

function praseValue<T>(value: T) {
    try {
        value = JSON.parse(<any>value);
    } catch {
        switch (value) {
            case "undefined":
                value = <any>undefined;
                break;
            case "NaN":
                value = <any>undefined;
                break;
            default:
        }
    }
    return value;
}

function rebuildPlayerConfig(input: any): IPlayerConfig {
    if (input == null) {
        throw new Error('Input must not be null or undefined');
    }
    return {
        get element(): HTMLElement {
            return input['element'] ?? document.getElementById('bilibiliPlayer');
        },
        set element(val: HTMLElement) {
            input['element'] = val;
        },
        get parentId(): string {
            return input['parentId'] ?? 'bofqi';
        },
        set parentId(val: string) {
            input['parentId'] = val;
        },
        get namespace(): string {
            return input['namespace'] ?? '.bilibiliplayer';
        },
        set namespace(val: string) {
            input['namespace'] = val;
        },
        get storageName(): string {
            return input['storageName'] ?? 'bilibili_player_settings';
        },
        set storageName(val: string) {
            input['storageName'] = val;
        },
        get aid(): number {
            return input['aid'];
        },
        set aid(val: number) {
            input['aid'] = val;
        },
        get cid(): number {
            return +input['cid'];
        },
        set cid(val: number) {
            input['cid'] = val;
        },
        get bvid(): string {
            if (this.show_bv) {
                return input['bvid'];
            } else {
                return '';
            }
        },
        set bvid(val: string) {
            input['bvid'] = val;
        },
        get show_bv(): number {
            return +(praseValue(input['show_bv']) ?? 1);
        },
        set show_bv(val: number) {
            input['show_bv'] = val;
        },
        get seasonId(): number {
            return +input['seasonId'];
        },
        set seasonId(val: number) {
            input['seasonId'] = val;
        },
        get episodeId(): number {
            return +input['episodeId'];
        },
        set episodeId(val: number) {
            input['episodeId'] = val;
        },
        get quality(): number {
            return +input.quality;
        },
        set quality(val: number) {
            input.quality = val;
        },
        get p(): number {
            return +(input['p'] ?? 1);
        },
        set p(val: number) {
            input['p'] = val;
        },
        get live(): boolean {
            return Boolean(input['live']);
        },
        set live(val: boolean) {
            input['live'] = val;
        },
        get hasNext(): boolean {
            return Boolean(input['has_next']);
        },
        set hasNext(val: boolean) {
            input['has_next'] = val;
        },
        get listLoop(): boolean {
            return Boolean(input['listLoop']);
        },
        set listLoop(val: boolean) {
            input['listLoop'] = val;
        },
        get autoplay(): boolean {
            if (+input['isPremiere']) {
                return false;
            }
            if (input['autoplay'] == null) {
                return <any>undefined;
            }
            // 兼容字符串
            if (input['autoplay'] === 'true') {
                return true;
            }
            if (input['autoplay'] === 'false') {
                return false;
            }
            return Boolean(+input['autoplay']);
        },
        set autoplay(val: boolean) {
            input['autoplay'] = val;
        },
        get playerType(): number {
            return +input['player_type'] || 0;
        },
        set playerType(val: number) {
            input['player_type'] = val;
        },
        get seasonType(): number {
            return +input['season_type'] || 0;
        },
        set seasonType(val: number) {
            input['season_type'] = val;
        },
        get lastepid(): number {
            return +input['last_ep_id'];
        },
        set lastepid(val: number) {
            input['last_ep_id'] = val;
        },
        get lastplaytime(): number {
            return +input['lastplaytime'];
        },
        set lastplaytime(val: number) {
            input['lastplaytime'] = val;
        },
        get enableSSLStream(): boolean {
            return Boolean(input['enable_ssl_stream'] ?? true);
        },
        set enableSSLStream(val: boolean) {
            input['enable_ssl_stream'] = val;
        },
        get enableSSLResolve(): boolean {
            return Boolean(input['enable_ssl_resolve'] ?? true);
        },
        set enableSSLResolve(val: boolean) {
            input['enable_ssl_resolve'] = val;
        },
        get dev(): boolean {
            return Boolean(input['dev']);
        },
        set dev(val: boolean) {
            input['dev'] = val;
        },
        get extra(): boolean {
            return Boolean(input['extra'] ?? true);
        },
        set extra(val: boolean) {
            input['extra'] = val;
        },
        get logger(): boolean {
            return Boolean(input['logger']);
        },
        set logger(val: boolean) {
            input['logger'] = val;
        },
        // 这个选项不接受外部传值且仅供稍后再看使用
        // 考虑从 IPlayerConfig 中移除
        // playerConfig.autoShift = !!value;
        get autoShift(): boolean {
            return Boolean(input['autoShift']);
        },
        set autoShift(val: boolean) {
            input['autoShift'] = val;
        },
        get watchlater(): boolean {
            if (input['watchlater'] === undefined) {
                return false;
            } else {
                return input['watchlater'] === null ? false : !!input['watchlater'];
            }
        },
        set watchlater(val) {
            input['watchlater'] = val === null ? null : !!val;
        },
        get playlist(): PlaylistDataConverted {
            return rebuildPlaylistData(input['playlist'] || input['watchlater']);
        },
        set playlist(val: PlaylistDataConverted) {
            input['playlist'] = val;
        },
        get playlistId(): number {
            return +input['playlistId'];
        },
        set playlistId(val: number) {
            input['playlistId'] = val;
        },
        get playlistOtype(): number {
            return +input['playlistOtype'] || 2;
        },
        set playlistOtype(val: number) {
            input['playlistOtype'] = val;
        },
        get playlistBvid(): string {
            const playlistBvid = input['playBvid'];
            return playlistBvid === 'undefined' || playlistBvid === undefined ? '' : playlistBvid;
        },
        set playlistBvid(val: string) {
            input['playBvid'] = val || null;
        },
        get playlistType(): number {
            if (input['playlistType'] == null) {
                return 3;
            } else {
                return +input['playlistType'];
            }
        },
        set playlistType(val: number) {
            input['playlistType'] = val;
        },
        get playlistFirstRid(): number {
            return +input['playlistFirstRid'] || 0;
        },
        set playlistFirstRid(val: number) {
            input['playlistFirstRid'] = val;
        },
        get playlistFirstType(): number {
            return +(input['playlistFirstType'] ?? 2);
        },
        set playlistFirstType(val: number) {
            input['playlistFirstType'] = val;
        },
        get playlistPn(): number {
            return +(input['playlistPn'] ?? 1);
        },
        set playlistPn(val: number) {
            input['playlistPn'] = val;
        },
        get plMax(): number {
            return +input['pl_max'] || 0;
        },
        set plMax(val: number) {
            input['pl_max'] = val;
        },
        get beforeplay(): () => void {
            return input['beforeplay'] ?? noop;
        },
        set beforeplay(val: () => void) {
            input['beforeplay'] = val;
        },
        get afterplay(): () => void {
            return input['afterplay'] ?? noop;
        },
        set afterplay(val: () => void) {
            input['afterplay'] = val;
        },
        get extraParams(): string {
            return input['extra_params'];
        },
        set extraParams(val: string) {
            input['extra_params'] = val;
        },
        get t(): string {
            return input['t'];
        },
        set t(val: string) {
            input['t'] = val;
        },
        get start_progress(): string {
            return input['start_progress'];
        },
        set start_progress(val: string) {
            input['start_progress'] = val;
        },
        get d(): string {
            return input['d'];
        },
        set d(val: string) {
            input['d'] = val;
        },
        get pb(): boolean {
            return Boolean(input['pb']);
        },
        set pb(val: boolean) {
            input['pb'] = val;
        },
        get ad(): string {
            return input['ad'];
        },
        set ad(val: string) {
            input['ad'] = val;
        },
        get preAd(): boolean {
            return praseValue(input['pre_ad']);
        },
        set preAd(val: boolean) {
            input['pre_ad'] = val;
        },
        get asWide(): boolean {
            return Boolean(input['as_wide']);
        },
        set asWide(val: boolean) {
            input['as_wide'] = val;
        },
        get admode(): number {
            return input['admode'];
        },
        set admode(val: number) {
            input['admode'] = val;
        },
        get record(): string {
            return input['record'] ?? '';
        },
        set record(val: string) {
            input['record'] = val;
        },
        get danmaku(): boolean {
            return Boolean(input['danmaku'] ?? true);
        },
        set danmaku(val: boolean) {
            input['danmaku'] = val;
        },
        get hasDanmaku(): boolean {
            return Boolean(input['hasDanmaku'] ?? true);
        },
        set hasDanmaku(val: boolean) {
            input['hasDanmaku'] = val;
        },
        // get gamePlayerType(): boolean {
        //     if(input['gamePlayerType'] === undefined) {
        //         return this.hasDanmaku;
        //     } else {
        //         this.hasDanmaku = input['gamePlayerType'];
        //     }
        // },
        get skipable(): boolean {
            return Boolean(input['skipable']);
        },
        set skipable(val: boolean) {
            input['skipable'] = val;
        },
        get sourcePlayer(): Player {
            return input['sourceplayer'];
        },
        set sourcePlayer(val: Player) {
            input['sourceplayer'] = val;
        },
        get verticalDanmaku(): boolean {
            return Boolean(input['verticalDanmaku']);
        },
        set verticalDanmaku(val: boolean) {
            input['verticalDanmaku'] = val;
        },
        get dashSymbol(): boolean {
            return Boolean(input['dashSymbol']);
        },
        set dashSymbol(val: boolean) {
            input['dashSymbol'] = val;
        },
        get inner(): boolean {
            return Boolean(input['inner']);
        },
        set inner(val: boolean) {
            input['inner'] = val;
        },
        get upPreview(): boolean {
            return Boolean(input['upPreview']);
        },
        set upPreview(val: boolean) {
            input['upPreview'] = val;
        },
        get isAudio(): boolean {
            return Boolean(input['isAudio']);
        },
        set isAudio(val: boolean) {
            input['isAudio'] = val;
        },
        get lightWeight(): boolean {
            return Boolean(input['lightWeight']);
        },
        set lightWeight(val: boolean) {
            input['lightWeight'] = val;
        },
        get editorEdges(): boolean {
            return Boolean(input['editEdges']);
        },
        set editorEdges(val: boolean) {
            input['editEdges'] = val;
        },
        get gamePlayer(): boolean {
            return Boolean(input['gamePlayer']);
        },
        set gamePlayer(val: boolean) {
            input['gamePlayer'] = val;
        },
        get stableController(): boolean {
            return Boolean(input['stableController']);
        },
        set stableController(val: boolean) {
            input['stableController'] = val;
        },
        get disableInteractive(): boolean {
            return Boolean(input['disableInteractive']);
        },
        set disableInteractive(val: boolean) {
            input['disableInteractive'] = val;
        },
        get interactiveNode(): string {
            return input['interactiveNode'];
        },
        set interactiveNode(val: string) {
            input['interactiveNode'] = val;
        },
        get interactiveTime(): number {
            return +input['interactiveTime'];
        },
        set interactiveTime(val: number) {
            input['interactiveTime'] = val;
        },
        get interactiveGraphId(): number {
            return +input['interactiveGraphId'];
        },
        set interactiveGraphId(val: number) {
            input['interactiveGraphId'] = val;
        },
        get interactivePreview(): boolean {
            return Boolean(input['interactivePreview']);
        },
        set interactivePreview(val: boolean) {
            input['interactivePreview'] = val;
        },
        get interactivePersistentDanmaku(): boolean {
            return Boolean(input['interactivePersistentDanmaku']);
        },
        set interactivePersistentDanmaku(val: boolean) {
            input['interactivePersistentDanmaku'] = val;
        },
        get musth5(): boolean {
            return Boolean(input['musth5']);
        },
        set musth5(val: boolean) {
            input['musth5'] = val;
        },
        get theme(): string {
            return input['theme'] ?? 'blue';
        },
        set theme(val: string) {
            input['theme'] = val;
        },
        get type(): number {
            return +input['type'];
        },
        set type(val: number) {
            input['type'] = val;
        },
        get touchMode(): boolean {
            return Boolean(input['touchMode'] ?? (browser.version.iPad || browser.version.tesla));
        },
        set touchMode(val: boolean) {
            input['touchMode'] = val;
        },
        get noEndPanel(): boolean {
            return Boolean(input['noEndPanel']);
        },
        set noEndPanel(val: boolean) {
            input['noEndPanel'] = val;
        },
        get s_from(): number {
            return +input['s_from'];
        },
        set s_from(val: number) {
            input['s_from'] = val;
        },
        get s_to(): number {
            return +input['s_to'];
        },
        set s_to(val: number) {
            input['s_to'] = val;
        },
        get isPremiere(): number {
            return +input['isPremiere'];
        },
        set isPremiere(val: number) {
            input['isPremiere'] = val;
        },
        get dmid(): string {
            return String(input.dmid || '');
        },
        get dmProgress(): number {
            return +input.dm_progress;
        },
        get recommendAutoPlay(): boolean {
            return Boolean(+input['recommendAutoPlay']);
        },
        set recommendAutoPlay(val: boolean) {
            input['recommendAutoPlay'] = val;
        },
        get replyDmid(): string {
            return input['replyDmid'];
        },
        set replyDmid(val: string) {
            input['replyDmid'] = val;
        },
        get fjw(): boolean {
            return input['fjw'];
        },
        set fjw(val: boolean) {
            input['fjw'] = val;
        },
    };
}
export default rebuildPlayerConfig;
