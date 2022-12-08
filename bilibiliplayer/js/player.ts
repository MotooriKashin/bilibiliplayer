// 工具
import md5 from 'md5';
import csrf from './plugins/csrf';
import SessionController from './player/session-controller';
import ScreenSHOT from './plugins/screen-shot';
import EventLogger from './plugins/event-logger';
import VideoInfo from './plugins/video-info';
import AllPlugins from './plugins/all-plugins';
import AdvDanmaku from './adv-danmaku/adv-danmaku';
import STATE, { FNVAL_TYPE, PLAYER_CODEC_ID, PLAYER_STATE } from './player/state';
import BILIBILI_PLAYER_SETTINGS from './player/settings';

import VideoEvent from './player/out-event/video-event';
import WindowEvent from './player/out-event/window-event';

import Template from './player/template';
import LoadingPanel from './player/loading-panel';
import EndingPanel from './player/ending-panel';
import Controller from './player/controller';
import Setting, { ISettingType } from './player/controller/setting';
import Block from './player/block';
import Playlist from './player/playlist';
import PlaylistNoView from './player/watchlater';
import User, { IUserStatusInterface } from './player/user';
import VideoTop from './player/video-top';
import GlobalFunction from './player/global-function';
import Send from './player/send';
import Danmaku from './player/danmaku';
import ErrorHandler from './player/error-handler';

import Resolve, { IMediaDataSourceInterface, VIDEO_DATA } from './player/r';
import QuickLogin from './player/quicklogin';
import PartManager from './player/part-manager';
import ElectricPanel from './player/electric-panel';
import BangumiPayPanel from './player/bangumi-pay-panel';
import VideoInfoData from './player/video-info-data';
import Toast from './player/toast';
import RealTimeDanmaku from './player/realtime-danmaku';
import BasDanmaku from '@jsc/bas-danmaku/js';
import BasPanel from './player/bas-panel';
import Popup, { IPoputBodyInterface } from './player/popup';
import Subtitle from './player/subtitle';
import Record from './player/record';
import { DirectiveManager } from './player/directive-manager';
import rebuildPlayerExtraParams, { IPlayerExtraParams } from './io/rebuild-player-extra-params';
import InteractiveVideo, { IIVideoConfig } from './player/interactive-button';

import { IPlayerConfig } from './io/rebuild-player-config';
import { gtQualityNeedLogin, gtQualityNormal } from './config';
import URLS from './io/urls';
import { VI_DATA_INIT } from './const/player-directive';
import * as WD from './const/webpage-directive';
import Lab from './player/lab';

import { FlvEventHandler } from './player/flv-event-handler';
import { ReloadMedia } from './player/reload-media';
import { DashEventHandler } from './player/dash-event-handler';
import { ContentType, ActionType } from '@jsc/namespace';
import {
    Log,
    detectGPU,
    getBit,
    setLocalSettings,
    getLocalSettings,
    getSessionID,
    getSearchParam,
    getCookie,
    setCookie,
    qualityMap,
    browser,
    timeParser,
    thumbnail,
    dateParser
} from '@shared/utils';
import ApiPremiereStatus, { ApiPremiereStatusInData, ApiPremiereStatusOutData } from './io/api-premiere-status';
import DashPlayer from '@jsc/dash-player';
import { METADATA } from '@jsc/namespace/metadata';
import PlayerAuxiliary from '@jsc/player-auxiliary';
import { BilibiliPlayer } from '../bilibiliPlayer';
import flvjs from '@jsc/flv.js';
import { DolbyEffectType } from './player/controller/dolby-button';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { screenshot } from './plugins/screenshot';
import { Track } from './player/track';

export interface IReceivedInterface {
    _id: number;
    _origin: string;
    _directive: number;
    data?: any;
}

interface IUIInterface {
    [key: string]: any;
    button: any;
    buttonset: any;
    selectable: any;
}

interface IRangePlay {
    isEnable?: boolean;
    endPause?: boolean;
    s_from?: number;
    s_to?: number;
}

type DocumentHideType = 'hidden' | 'webkitHidden' | 'mozHidden' | 'msHidden' | 'oHidden';

class Player {
    static video: HTMLVideoElement;
    static aside: HTMLElement;

    // parameters
    prefix = 'bilibili-player';
    pid!: number;
    session: string;
    config: IPlayerConfig;
    container: JQuery;
    window: Window;
    $window: JQuery<Window>;
    iframe?: HTMLElement;
    $iframe?: JQuery;
    $body!: JQuery;
    documentElement!: HTMLElement;
    $parent!: JQuery;
    playerQualityChanging!: boolean;
    video: HTMLVideoElement;
    videoContinueTime!: number;
    videoContinueTimeChecker!: number;
    videoContinueCurrentTime!: number;
    videoContinueCompareTime = +new Date();
    videoSeeking!: boolean;
    videoSeekingRelay!: boolean;
    seekLoad!: boolean;
    lagLoad!: boolean;
    headLoad!: boolean;
    nullLoad!: boolean;
    state!: PLAYER_STATE;
    videoSettings: typeof BILIBILI_PLAYER_SETTINGS;
    videoDisableTime!: number;
    userLoadedCallbacks: ((info: IUserStatusInterface) => void)[] = [];
    initialized = false;
    initializing = false;
    firstErrorEvent = false;
    allowFlv: boolean;
    videoQuality!: number;
    adPlayer?: BilibiliPlayer;
    errorPlayurl!: boolean;
    videoRealQuality!: number;
    videoData!: VIDEO_DATA;
    loadlagSymbol: any;
    keepFocus!: boolean;
    // others
    firstEnded!: boolean;
    // module
    toast!: Toast;
    template!: Template;
    loadingpanel!: LoadingPanel;
    bangumipaypanel!: BangumiPayPanel;
    controller!: Controller;
    settingPanel!: Setting;
    setting!: ISettingType;
    block!: Block;
    realTimeDanmaku!: RealTimeDanmaku;
    videoTop!: VideoTop;
    globalFunction!: GlobalFunction;
    send!: Send;
    electricpanel!: ElectricPanel | null;
    partmanager!: PartManager | null;
    videoInfo!: VideoInfo | null;
    allPlugins!: AllPlugins | null;
    endingpanel!: EndingPanel | null;
    advDanmaku!: AdvDanmaku;
    basDanmaku!: BasDanmaku;
    baspanel!: BasPanel;
    eventLog!: EventLogger;
    user!: User;
    ui!: IUIInterface;
    quicklogin!: QuickLogin;
    playlist!: Playlist;
    playlistNoView!: PlaylistNoView;
    videoTime!: number;
    bufferStartTime!: number;
    flvPlayer?: flvjs.Player;
    dashPlayer?: DashPlayer;
    danmaku!: Danmaku;
    popup!: Popup;
    subtitle!: Subtitle;
    record!: Record;
    extraParams!: IPlayerExtraParams | null;
    destroyed: boolean = false; // 播放器是否已经销毁
    earlyEOFTrackHandler!: (...args: any[]) => void;
    earlyEOFTrackSymbol!: boolean;
    endingpanelInitialized!: boolean;
    // danmakuSetting!: DanmakuSetting;
    directiveManager!: DirectiveManager;
    flvEventHandler: FlvEventHandler;
    reloadMedia: ReloadMedia;
    dashEventHandler: DashEventHandler;
    errorHandler!: ErrorHandler;
    abtid!: string;
    playlistLimit = false;
    totalReceivedBytes: number[] = [];
    p2pLoadInfo: { [key: string]: number } = {};
    currentReceivedAudioIndex: string[] = [];
    currentReceivedVideoIndex: string[] = [];
    repeatReceivedAudioIndex: string[] = [];
    repeatReceivedVideoIndex: string[] = [];
    firstAudioFrameReported = false; // 切P不报，不需要在销毁时重置
    firstVideoFrameReported = false;
    sourceSwitching = false;
    segmentSizeMaps: { [key: string]: boolean } = {};
    reportParamMaps: { [key: string]: boolean } = {};
    mediaDataSource?: IMediaDataSourceInterface;
    currentStreamType?: string;
    backupURLIndex = 0;
    interactive?: number;
    interactiveVideo?: InteractiveVideo;
    interactiveVideoConfig?: IIVideoConfig;
    buvid?: string;
    // mock: Mock;
    rangePlay: IRangePlay = {};
    feedbackTooltip!: Tooltip;
    isSupportWebGL = !!(detectGPU().renderer || detectGPU().vendor);
    videoReuse!: boolean; // 切p/切清晰度时，video标签是否复用
    syncEnable = true;
    premiereSyncTimer = 0;

    // 杜比音效类型（默认无）
    dolbyEffectType: DolbyEffectType = DolbyEffectType.None;
    // 杜比音效开关状态
    dolbyEffectOpend = false;
    // HiRes音效有无
    audioHiRes = false;
    // HiRes音效开关状态
    flacEffectOpened = false;

    // private
    private timerChecker!: number | null;
    private timerVideoStatus!: number;
    private lastPauseTime = 0;
    private admode!: number;
    private flag1 = false;
    private cdnTimeStart!: number;
    private laterLoadTemplateTimer = 0;
    private corePreloadUsed = false;
    private multipleDanmakuDebug!: {
        aid?: number;
        cid: number;
        bvid?: string;
        playurl: string;
    } | null;
    private forceReportSymbol = false;

    readonly corePreload?: any;
    readonly bVideo: VideoEvent | WindowEvent;
    readonly createdTime: number;
    initStart: number; // 播放器生命周期起始时间点
    outerInfo: any = {}; // 用来存放播放器的各种因为异步需要暂存起来的数据
    auxiliary!: PlayerAuxiliary;
    track?: Track; // 去除所有跟踪上报，只保留了视频心跳

    constructor(config: IPlayerConfig, corePlayer?: any, bVideo?: any) {
        this.createdTime = Date.now();
        this.initStart = performance.now();
        if (Player.video) {
            this.videoReuse = true;
            this.video = Player.video;
        } else {
            this.video = document.createElement('video');
        }

        if (bVideo) {
            this.bVideo = new VideoEvent(bVideo);
        } else {
            this.bVideo = new WindowEvent(this);
        }
        this.config = config;
        this.container = $(this.config.element);
        this.corePreload = corePlayer && corePlayer['delivery']();
        // iframe compatible
        try {
            this.window = window.parent && window.parent.document ? window.parent : window;
            // @ts-ignore
            this.$window = window.parent && window.parent !== window ? $(window.parent).add($(window)) : $(window);

            this.iframe = <HTMLElement>window.frameElement!;

            this.$iframe = $(this.iframe);
        } catch (e) {
            this.window = window;
            this.$window = $(window);
        }
        this.videoSettings = $.extend(
            true,
            {},
            BILIBILI_PLAYER_SETTINGS,
            JSON.parse(getLocalSettings(this.config.storageName)!),
        );

        if (browser.version.safari && !browser.version.safariSupportMSE) {
            // disable because of Safari buggy MSE implementation
            this.allowFlv = false;
        } else {
            this.allowFlv = window['flvjs']['isSupported']();
        }
        if (this.corePreload) {
            this.corePreload['clearInteraction']();
        }
        if (this.corePreload && this.corePreload['session']) {
            this.session = this.corePreload['session'];
        } else {
            this.session = getSessionID();
        }
        this.buvid = getCookie('buvid3');
        // this.mock = new Mock();

        this.flvEventHandler = new FlvEventHandler(this);
        this.dashEventHandler = new DashEventHandler(this);
        this.reloadMedia = new ReloadMedia(this);
        const start = () => {
            if (this.corePreload) {
                this.video = this.corePreload['typedInfo']['video'];
                this.cdnTimeStart = this.corePreload['playurlStartTime'];
                this._beforeInit();
                this._init();
                this.deliveryVideoData();
                this.totalReceivedBytes.push(this.corePreload['partialReceivedBytes']);
                this.currentReceivedAudioIndex = this.corePreload['partialReceivedAudioIndex'];
                this.currentReceivedVideoIndex = this.corePreload['partialReceivedVideoIndex'];
                for (const item of this.corePreload['reportQueues']) {
                    if (item['type'] === 'first_audio_frame_decoded') {
                        this.firstAudioFrameReported = true;
                    }
                    if (item['type'] === 'first_video_frame_decoded') {
                        this.firstVideoFrameReported = true;
                    }
                }
                for (const item of this.corePreload['eventQueues']) {
                    if (item['type'] === STATE.EVENT.VIDEO_PRELOAD_ERROR) {
                        this.errorHandler.videoOnError(...item['parms']);
                    } else if (item['type'] === STATE.EVENT.DASH_PLAYER_ERROR) {
                        // @ts-ignore
                        this.errorHandler.videoErrorHandler(...item['params']);
                    } else {
                        setTimeout(() => this.trigger(item['type'], item), 0);
                    }
                }
            } else {
                if (
                    (window['__playinfo__'] && typeof window['__playinfo__'] === 'object') ||
                    (window['__playurlMap__'] && window['__playurlMap__'][this.config.cid])
                ) {
                    this._beforeInit();
                    this._init();
                    this.getVideoData();
                } else {
                    this.getVideoData();
                    this._beforeInit();
                    this._init();
                }
            }
            if (typeof this.config.beforeplay === 'function') {
                this.config.beforeplay();
            }
        };

        if (config.playlistId && (!config.aid || !config.bvid)) {
            this.playlist = new Playlist(
                {
                    playlistBvid: this.config.playlistBvid,
                    playlistOtype: this.config.playlistOtype,
                    playlistFirstRid: this.config.playlistFirstRid,
                    playlistFirstType: this.config.playlistFirstType,
                    playlistPn: this.config.playlistPn,
                    playlistId: this.config.playlistId,
                    onLoad: () => {
                        start();
                    },
                },
                this,
            );
        } else {
            start();
        }
    }

    private deliveryVideoData() {
        const that = this;
        const ratio = this.corePreload['typedInfo']['hasPrefetchData'] ? 20 : 0;
        if (this.corePreload['typedInfo']['type'] === 'FLV') {
            this.flvPlayer = this.corePreload['typedInfo']['player'];
            this.flvEventHandler.registerFlvPlayerEvents(this.flvPlayer, true);
            if (this.flvPlayer!['type'] === 'FlvPlayer') {
                that.state.video_type = ratio + 1;
            } else {
                that.state.video_type = ratio + 2;
            }
        } else {
            this.dashPlayer = window['dashPlayer'] = this.corePreload['typedInfo']['player'];
            this.dashEventHandler.registerDashPlayerEvents(this.dashPlayer);
            this.state.video_type = ratio + 3;

            const HEVC_CODEC_ID = 12;
            if (this.dashPlayer?.getCurrentCodecID('video') === HEVC_CODEC_ID) {
                this.state.video_type = ratio + 4;
            }
            // if (!that.isSvipQuality(this.corePreload['defQuality'])) { // dash总是自动
            //     this.corePreload['defQuality'] = 0;
            // }
        }
        this._videoEventListener(this.video);

        const r = Resolve.parse(window['__playinfo__'], this.config.enableSSLStream, null, null, null, that)!;
        delete window['__playinfo__'];
        const result = this.transformQuality(<any>r)!;

        if (this.corePreload['defQuality'] === 0 && this.dashPlayer) {
            try {
                let autoRealQuality = 0;
                for (let i in this.dashPlayer['state']['qualityNumberMap']['video']) {
                    if (
                        this.dashPlayer['state']['qualityNumberMap']['video'][i] ===
                        this.dashPlayer['state']['currentQualityIndex']['video']
                    ) {
                        autoRealQuality = Number(i);
                    }
                }
                if (autoRealQuality !== result.quality) {
                    result.quality = autoRealQuality;
                }
            } catch (e) {
                console.debug(e);
            }
        }

        this.errorPlayurl = false;
        this.mediaDataSource = result.mediaDataSource;
        this.currentStreamType = result.streamType;
        this.flushExtraParams();
        const notStart =
            this.extraParams &&
            typeof this.extraParams.isStart === 'boolean' &&
            !this.extraParams.isStart &&
            this.extraParams.canWatch;

        this.userLoadedCallback(() => {
            this.previewToast(result);
        });

        if (!this.config.isPremiere && notStart) {
            this.controller && this.controller.addPVHint();
        }

        // if (this.corePreload['typedInfo']['type'] === 'DASH' && !that.isSvipQuality(result.quality)) { // dash总是自动
        //     this.corePreload['defQuality'] = 0;
        //     if (result.quality > gtQualityNormal) {
        //         result.quality = gtQualityNormal;
        //     }
        // }

        this.videoQuality = this.corePreload['defQuality'];
        this._setVideoQuality(result.quality!);
        this.controller.updateQuality(result, this.videoQuality);
        this.videoData = {
            acceptQuality: result.acceptQuality!,
            videoQuality: this.videoQuality,
            bp: result.bp,
            hasPaid: result.hasPaid,
            isPreview: result.isPreview,
        };
        this.registerMetadataloadedEvent();
        if (!that.initialized) {
            // some 三倍アイスクリーム！ video can't set canplay state in Firefox, replace with loadedmetadata
            that.loadingpanel.complete(3, true);

            // that.trigger(STATE.EVENT.VIDEO_METADATA_LOADED);
            that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER);
            this.controller.fixControllerState();
            if (!that.adPlayer) {
                that.trigger(STATE.EVENT.VIDEO_MEDIA_ENTER);
            }
            const tp = timeParser(that.config.t!);
            if (!tp && that.config.autoplay) {
                that.controller.setState(STATE.V_PLAY);
            }
        }
    }

    previewToast(result: any) {
        const unpaid = this.unpaid(result.isPreview);

        if (result.timelength && result.mediaDataSource['duration'] && unpaid) {
            this.videoDisableTime = Math.max(0, (result.timelength - result.mediaDataSource['duration']) / 1000);
            this.controller && this.controller.addVideoHint(result);
        }
        if (this.config.type === ContentType.Pugv) {
            const status = this.user.status();
            if (status.pugv_watch_status !== 2 && status.pugv_pay_status === 2) {
                this.controller?.addVideoHint(result);
            }
        }
    }

    unpaid(isPreview: boolean) {
        if (this.config.type === ContentType.Pugv) {
            return isPreview;
        }
        if (this.config.seasonType === 0) {
            return this.user.status().is_pay_preview;
        }
        if (this.extraParams) {
            return this.extraParams.isPreview || this.extraParams.preSaleToast;
        } else {
            return isPreview;
        }
    }
    next(specPart?: any, doneCallback?: Function, failCallback?: Function) {
        this.initStart = performance.now();
        const aidUsed = typeof specPart === 'boolean' && specPart;
        if (aidUsed) {
            if (Boolean(this.playlistNoView)) {
                return this.playlistNoView.playNextLogicList();
            }
            if (Boolean(this.playlist)) {
                return this.playlist.playNextLogicList();
            }
        } else {
            const that = this;
            const options = {
                p: specPart,
                doneCallback: doneCallback,
                failCallback: failCallback,
            };
            return that.reloadMedia.callNextPart(options, null, true);
        }
    }
    screenshot(isPNG: number) {
        // 0(false):生成gif  1(true): 生成png
        const config = {
            fps: 24,
            time: 2000,
            isPNG: isPNG,
            background: '#000',
            rate: 0.7, // 比例
            fixedSize: true, // 是否固定尺寸(若固定尺寸 则rate无效 )
            imgWidth: 400, // 固定尺寸宽px
            imgHeight: 300, // 固定尺寸高px
            quality: 80, // gif画质 越小越高
        };
        return new ScreenSHOT(config, this);
    }

    flushExtraParams() {
        $.extend(true, this.extraParams, rebuildPlayerExtraParams(this));
    }

    duration(video?: HTMLVideoElement, isReal?: boolean, isAbsolute?: boolean) {
        video = video || this.video;
        if (video) {
            let offset = this.getTimeOffset(),
                continueTime = this.videoContinueTime || 0,
                disableTime = this.videoDisableTime || 0;
            if (isReal) {
                continueTime = 0;
                disableTime = 0;
            }
            if (isAbsolute) {
                offset = 0;
            }
            const duration = video.duration - offset;
            if (this.config.lightWeight) {
                //轻量播放器移除播放器预览
                return duration + continueTime;
            }
            return duration + continueTime + disableTime;
        } else {
            return undefined;
        }
    }
    currentTime(video?: HTMLVideoElement, isReal?: boolean, isAbsolute?: boolean) {
        video = video || this.video;
        if (video) {
            let offset = this.getTimeOffset(),
                continueTime = this.videoContinueTime || 0;
            if (isReal) {
                continueTime = 0;
            }
            if (isAbsolute) {
                offset = 0;
            }
            const duration = this.duration(video, true) || 0;
            const currentTime = video.currentTime - offset;
            if (this.videoContinueCurrentTime >= duration) {
                return Math.min(
                    duration + this.videoContinueTime,
                    this.videoContinueCurrentTime +
                    (this.state.video_state === STATE.V_PLAY
                        ? (+new Date() - this.videoContinueCompareTime) / 1000
                        : 0),
                );
            } else {
                return currentTime || 0;
            }
        } else {
            return undefined;
        }
    }

    getTimeOffset() {
        if (this.video) {
            return Number(this.video.getAttribute('data-offset')) || 0;
        } else {
            return 0;
        }
    }

    load(data: any, reload: any, currentTime?: number) {
        const that = this;
        if (data.mediaDataSource['type'] === 'dash') {
            const video = (this.video = this.videoReuse ? this.video : document.createElement('video'));
            let quality = this.videoRealQuality;
            if (this.config.highQuality === '1') {
                quality = 80;
            }

            let defaultAudioQuality;
            if (this.dolbyEffectType && (this.get('setting_config', 'dolbyAtmos') || quality === 126)) {
                this.set('setting_config', 'dolbyAtmos', true);
                defaultAudioQuality =
                    Number(
                        data.mediaDataSource['url']?.dolby?.audio?.[0]?.id ||
                        data.mediaDataSource['url']?.audio?.[0]?.id,
                    ) || 30280;
            } else if (this.audioHiRes && this.get('setting_config', 'audioHiRes')) {
                this.set('setting_config', 'audioHiRes', true);
                defaultAudioQuality =
                    Number(
                        data.mediaDataSource['url']?.flac?.audio?.id ||
                        data.mediaDataSource['url']?.audio?.[0]?.id,
                    ) || 30280;
            } else {
                defaultAudioQuality = Number(data.mediaDataSource['url']?.audio?.[0]?.id) || 30280;
            }
            const dashPlayer = (window['dashPlayer'] = this.dashPlayer = new window['DashPlayer'](video, {
                defaultVideoQuality: quality,
                defaultAudioQuality,
                enableHEVC: true,
                enableAV1: true,
                isAutoPlay: false,
                isDynamic: false,
                abrStrategy: window['DashPlayer']['STRING']['ABR_DYNAMIC'],
                stableBufferTime: this.getDynamicBuffer()[0],
                // DRM fields
                protectionDataSet: data.mediaDataSource.protection?.protectionData,
                ignoreEmeEncryptedEvent: data.mediaDataSource.protection?.ignoreEmeEncryptedEvent
            }));
            $(video).appendTo(this.template.videoWrp.empty());
            this._videoEventListener(video);
            // 提前初始化以避免DASH视频信息加载过快
            this.getVideoInfo().update(VideoInfoData.generateVideoInfoItems('DashPlayer'));
            dashPlayer['initialize'](data.mediaDataSource['url'])
                .then(() => {
                    that.trigger(STATE.EVENT.VIDEO_METADATA_LOAD);
                    if (that.videoQuality === 0) {
                        dashPlayer['setAutoSwitchQualityFor']('video', true);
                        dashPlayer['setAutoSwitchQualityFor']('audio', true);
                    }
                    // const isLogin = Boolean(getCookie('DedeUserID'));
                    // if (!isLogin) {
                    //     dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNeedLogin);
                    // } else {
                    dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNormal);
                    // }
                    // const dashCorePlayer = dashPlayer && dashPlayer['getCorePlayer']();
                    // dashCorePlayer && dashCorePlayer['setBufferAheadToKeep'](this.getDynamicBuffer()[5]);
                    if (typeof currentTime !== 'undefined') {
                        dashPlayer['seek'](currentTime || 0);
                    }
                })
                .catch(() => {
                    this.errorHandler.videoErrorHandler(4000, 'dashPlayer initializing error.');
                });
            this.dashEventHandler.registerDashPlayerEvents(dashPlayer);
            this.state.video_type = 3;

            if (dashPlayer?.getCurrentCodecID('video') === PLAYER_CODEC_ID.HEVC_CODEC_ID) {
                this.state.video_type = 4;
            } else if (dashPlayer?.getCurrentCodecID('video') === PLAYER_CODEC_ID.AV1_CODEC_ID) {
                this.state.video_type = 6;
            }
        } else {
            const config = {
                enableWorker: false,
                stashInitialSize: 1024 * 64,
                accurateSeek: true,
                seekType: data.seekType || 'param',
                rangeLoadZeroStart: false,
                lazyLoadMaxDuration: 100,
                lazyLoadRecoverDuration: 50,
                deferLoadAfterSourceOpen: false,
                fixAudioTimestampGap: false,
                reuseRedirectedURL: true,
            };

            if (
                browser.version.safari ||
                browser.version.edge ||
                browser.version.trident
            ) {
                // Edge/IE may send Origin: blob:// insider worker. Disable for now.
                config['enableWorker'] = false;
                // Safari/Edge/IE use RangeLoader, set 2 min lazyLoad
                config['lazyLoadMaxDuration'] = 100;
            }
            window['flvjs']['LoggingControl']['forceGlobalTag'] = true;
            window['flvjs']['LoggingControl']['enableVerbose'] = false;
            this.earlyEOFTrackHandler = this.flvEventHandler.earlyEOFTrack.bind(this.flvEventHandler);
            window['flvjs']['LoggingControl']['addLogListener'](this.earlyEOFTrackHandler);

            that.trigger(STATE.EVENT.VIDEO_METADATA_LOAD);
            const flvPlayer = (this.flvPlayer = window['flvjs']['createPlayer'](data.mediaDataSource, config));
            that.flvEventHandler.registerFlvPlayerEvents(flvPlayer, !reload);
            const video = (this.video = this.videoReuse ? this.video : document.createElement('video'));
            if (typeof currentTime !== 'undefined') {
                flvPlayer['currentTime'] = currentTime;
            }
            flvPlayer['attachMediaElement'](video);
            flvPlayer['load']();

            if (flvPlayer['type'] === 'FlvPlayer') {
                that.state.video_type = 1;
            } else {
                that.state.video_type = 2;
            }
            if (this.playlistLimit) {
                const mask = $(`
                    <div class="${this.prefix}-playlist-limit-mask">
                        <div class="${this.prefix}-playlist-limit-img"></div>
                        <div class="${this.prefix}-playlist-limit-text">非常抱歉，收藏夹暂不支持该内容的播放哦~</div>
                    </div>
                `);
                mask.appendTo(this.template.videoWrp.empty());
                if (this.config.isAudio) {
                    this.window['showToast'] &&
                        typeof this.window['showToast'] === 'function' &&
                        this.window['showToast'](2);
                } else {
                    this.window['showToast'] &&
                        typeof this.window['showToast'] === 'function' &&
                        this.window['showToast'](1);
                }
            } else if (this.config.isAudio) {
                const audioItem = this.playlist.currentItem();

                const circleLength = this.template.videoWrp.height()! * 0.4;
                const mask = $(`
                    <div class="${this.prefix}-video-poster-bottom">
                        <img src="${thumbnail(
                    audioItem!.pic.replace(/https?:\/\//, '//'),
                    this.template.videoWrp.width()!,
                    this.template.videoWrp.height(),
                    true,
                )}">
                    </div>
                    <div class="${this.prefix}-video-poster-center"></div>
                    <div class="${this.prefix
                    }-video-poster-top" style="height:${circleLength}px;width:${circleLength}px;">
                        <div class="${this.prefix}-video-poster-top-circle1"></div>
                        <div class="${this.prefix}-video-poster-top-circle2"></div>
                        <img src="${thumbnail(
                        audioItem!.pic.replace(/https?:\/\//, '//'),
                        circleLength,
                        circleLength,
                        true,
                    )}">
                    </div>
                `);
                mask.appendTo(this.template.videoWrp.empty());

                const topWrap = this.template.videoWrp.find(`.${this.prefix}-video-poster-top`);
                const topthat = topWrap.find(`.${this.prefix}-video-poster-that`);
                this.bind(STATE.EVENT.VIDEO_RESIZE, () => {
                    const circleLength = this.template.videoWrp.height()! * 0.4;
                    topWrap.width(circleLength);
                    topWrap.height(circleLength);
                });
            } else {
                $(video).appendTo(this.template.videoWrp.empty());
            }
            this.getVideoInfo() && this.getVideoInfo().update(VideoInfoData.generateVideoInfoItems(<"FlvPlayer">flvPlayer['type']));
            this._videoEventListener(video);
        }

        this.loadingpanel.ready(3);
        this.volume(this.config.ad ? 0.67 : this.videoSettings['video_status']['volume']);

        if (!reload) {
            this.controller.setState(STATE.V_READY);
            // set video load source start
            // use the property name to generate the prefixed event name
            this.registerMetadataloadedEvent();
        }
        this.controller.clearTimeMark();
    }

    private registerMetadataloadedEvent() {
        this.one(STATE.EVENT.VIDEO_MEDIA_CANPLAY, () => {
            this.dashEventHandler.reportCanplaySpeed();

            !this.config.preAd && this.loadingpanel && this.loadingpanel.hide();
            if (this.laterLoadTemplateTimer) {
                this.laterLoadTemplate();
            }

            this.loadingpanel.ready(1);

            if (!this.config.isAudio) {
                this.user.load();
            } else {
                this.loadingpanel.complete(1, true);
            }

            this.block = new Block(this); // 屏蔽面板

            // if (!this.config.isAudio && this.config.type !== ContentType.PugvCenter) {
            this.videoTop = new VideoTop(this); // 顶部消息
            // }

            this.initPartmanager();

            if (!this.config.isAudio && !this.playlistLimit && !this.errorPlayurl) {
                this.loadDanmaku();
            }
            // 126001
            this.directiveManager.sender(VI_DATA_INIT, {
                aid: this.config.aid,
                cid: this.config.cid,
                bvid: this.config.bvid,
                isPremiere: this.config.isPremiere,
            });

            if (
                this.errorPlayurl &&
                this.playlist &&
                this.playlist.currentItem() &&
                getBit(this.playlist.currentItem()!.attr, 1)
            ) {
                this.reloadMedia.callNextPart(
                    {
                        forceToNext: true,
                    },
                    () => { },
                    true,
                );
            }

            this.window.auxiliary = this.auxiliary = new PlayerAuxiliary(this, this.config); // 右侧面板
        });
        this.one(STATE.EVENT.VIDEO_METADATA_LOADED, () => {
            if (this.config.isPremiere) {
                this.play();
            }
        });
    }
    // 这种写法注意destroy时，吧partmanager重置
    initPartmanager() {
        if (!this.partmanager) {
            this.partmanager = new PartManager(this);
        }
        return this.partmanager;
    }
    private loadDanmaku() {
        let danmakuConfig = $.extend(
            {
                container: this.template.playerArea.find('.' + this.prefix + '-video-danmaku')[0],
                visible: this.state.danmaku,
                verticalDanmaku: this.config.verticalDanmaku,
            },
            this.videoSettings['setting_config'],
        );
        const getSession = SessionController.getSession();
        if (getSession) {
            danmakuConfig = $.extend(danmakuConfig, getSession['video_status']);
        }
        if (danmakuConfig['fontfamily'] === 'custom') {
            danmakuConfig['fontfamily'] = danmakuConfig['fontfamilycustom'];
        }
        danmakuConfig['preventshade'] = false;

        this.multipleDanmakuDebug = {
            cid: this.config.cid,
            playurl: this.getPlayurl(),
        };
        if (this.config.bvid) {
            this.multipleDanmakuDebug.bvid = this.config.bvid;
        } else {
            this.multipleDanmakuDebug.aid = this.config.aid;
        }

        this.danmaku && this.danmaku.destroy();
        this.danmaku = new Danmaku(
            {
                // 弹幕层
                url: `${URLS.DM_LIST}?oid=${this.config.cid}`,
                video: this.video,
                list_config: {},
                danmaku_config: danmakuConfig,
                timestamp: dateParser(this.config.d!, 8), // 北京时间0点时候的UTC时间
            },
            this,
        );
        // this.initFilterTab(getSessionSettings('player_last_filter_tab_info'));
        if (!this.config.hasDanmaku) {
            return;
        }
        this.userLoadedCallback((status: IUserStatusInterface) => {
            if (this.flag1) return;
            this.flag1 = true;
            this.realTimeDanmaku = new RealTimeDanmaku(this);
            if (this.interactive) {
                if (this.interactiveVideo) {
                    const promise = this.interactiveVideo.reload();
                    promise &&
                        promise
                            .then((res: any) => {
                                if (res && !res['no_backtracking']) {
                                    this.controller.lastInteractive();
                                }
                                this.trigger(STATE.EVENT.VIDEO_PLAYER_RESIZE);
                            })
                            .catch((err) => { });
                } else {
                    this.interactiveVideo = new InteractiveVideo(this);
                    const promise = this.interactiveVideo.init();
                    promise &&
                        promise
                            .then((res: any) => {
                                if (res && !res['no_backtracking']) {
                                    this.controller.lastInteractive();
                                }
                                this.trigger(STATE.EVENT.VIDEO_PLAYER_RESIZE);
                            })
                            .catch((err) => { });
                }
            } else {
                this.controller.lastWatchProgressHandler();
            }
        });
    }

    get(type?: string, key?: string) {
        if (typeof type === 'string' && typeof this.videoSettings[<keyof typeof BILIBILI_PLAYER_SETTINGS>type] !== 'object') {
            return false;
        } else if (typeof type === 'undefined' && typeof key === 'undefined') {
            return this.videoSettings;
        } else if (typeof type === 'string' && typeof key === 'undefined') {
            return this.videoSettings[<keyof typeof BILIBILI_PLAYER_SETTINGS>type];
        } else if (typeof type === 'string' && typeof key === 'string') {
            return (<any>this).videoSettings[type][key];
        } else {
            return false;
        }
    }

    set(type: string, key?: any, value?: any) {
        switch (arguments.length) {
            case 3:
                {
                    if (
                        ((<any>this).videoSettings[type][key] === value && typeof value !== 'object') ||
                        (type === 'video_status' && key === 'volume' && this.config.ad)
                    ) {
                        return false;
                    }
                    (<any>this).videoSettings[type][key] = value;
                    if (type === 'setting_config' && this.danmaku && this.danmaku.option) {
                        // 目前没法引用，特殊处理
                        if (key === 'fontfamilycustom') {
                            this.danmaku.option('fontfamily', value);
                        } else if (key === 'fontfamily' && value === 'custom') {
                            this.danmaku.option('fontfamily', this.videoSettings[type]['fontfamilycustom']);
                        } else if (key === 'type') {
                            this.danmaku.option(key, value);
                            // this.danmakuSetting.danmakuMask && this.danmakuSetting.danmakuMask.changeContainer();
                        } else {
                            this.danmaku.option(key, value);
                        }
                    }
                    if (type === 'block' && this.danmaku) {
                        this.danmaku.fresh();
                    }
                    setLocalSettings(this.config.storageName, JSON.stringify(this.videoSettings));
                }
                break;

            case 2:
                {
                    try {
                        if (typeof arguments[0] === 'string') {
                            const videoSettings = JSON.parse(getLocalSettings(this.config.storageName)!);
                            if (videoSettings) {
                                let value = arguments[1];
                                if (typeof arguments[1] === 'object') {
                                    value = arguments[1];
                                } else if (typeof arguments[1] === 'string') {
                                    // 只接受可以被解析的string参数
                                    try {
                                        value = JSON.parse(arguments[1]);
                                    } catch (e) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                                videoSettings[arguments[0]] = value;
                                setLocalSettings(this.config.storageName, JSON.stringify(videoSettings));
                            }
                        } else {
                            return false;
                        }
                    } catch (e) { }
                }
                break;

            default: {
                return false;
            }
        }
    }
    userLoadedCallback(callback: (info: IUserStatusInterface) => void) {
        if (this.user) {
            this.user.addCallback(callback);
        } else if (typeof callback === 'function') {
            this.userLoadedCallbacks.push(callback);
        }
    }

    one(type: any, callback?: any) {
        this.container.one(type + this.config.namespace, callback);
    }
    bind(type: any, callback?: any) {
        this.container.bind(type + this.config.namespace, callback);
    }
    unbind(type: any, callback?: any) {
        this.container.unbind(type + this.config.namespace, callback);
    }
    trigger(type: string, ...args: any[]) {
        this.container.trigger.apply(this.container, [
            type + this.config.namespace,
            Array.prototype.slice.call(arguments, 1, arguments.length),
        ]);
        this.bVideo?.emit(type, ...args);
    }

    reload(config: any, preloadPlayurlData?: any, preloadVideoData?: any, persistentDanmaku?: boolean) {
        this.initStart = performance.now();
        if (preloadPlayurlData && this.dashPlayer) {
            this.initialized = false;
            this.flag1 = false;

            this.config = $.extend(this.config, config);
            this.extraParams = rebuildPlayerExtraParams(this);
            this.trigger(STATE.EVENT.PLAYER_RELOAD, {
                persistentDanmaku: persistentDanmaku,
            });

            Lab.destroy(this);

            this.loadingpanel.ready(1);
            this.loadingpanel.ready(2);

            if (this.videoQuality !== 0) {
                this.videoQuality = preloadPlayurlData.quality;
            }
            this._setVideoQuality(preloadPlayurlData.quality);
            if (
                preloadVideoData &&
                this.isSvipQuality(Number(this.videoRealQuality)) !==
                this.isSvipQuality(Number(preloadVideoData.videoid))
            ) {
                preloadVideoData = undefined;
            }
            this.controller.updateQuality(preloadPlayurlData, this.videoQuality);
            this.videoData = {
                acceptQuality: preloadPlayurlData.acceptQuality,
                videoQuality: this.videoQuality,
                bp: preloadPlayurlData.bp,
                hasPaid: preloadPlayurlData.hasPaid,
                isPreview: preloadPlayurlData.isPreview,
            };
            this.loadingpanel.complete(2, true);
            this.loadingpanel.ready(3);
            const playbackRate = this.video.playbackRate;
            if (this.dashPlayer.switchSuccess) {
                this.dashPlayer.switchSuccess = undefined;
                this._reload(playbackRate);
            } else {
                clearInterval(this.timerChecker!);
                clearTimeout(this.videoContinueTimeChecker);
                clearTimeout(this.timerVideoStatus);
                this.sourceSwitching = true;
                this.dashPlayer
                    .switchSource(preloadPlayurlData.mediaDataSource['url'], preloadVideoData, true)
                    .then((res: { cost: number }) => {
                        this.dashPlayer!.play();
                        this._reload(playbackRate);
                    })
                    .catch((err: any) => {
                        this.reloadMedia.cidLoader(config);
                    });
            }
        } else {
            this.reloadMedia.cidLoader(config);
        }
    }

    _reload(playbackRate?: number) {
        if (this.video.playbackRate !== playbackRate) {
            this.video.playbackRate = playbackRate || 1;
        }

        if (this.videoQuality === 0) {
            this.dashPlayer!['setAutoSwitchQualityFor']('video', true);
            this.dashPlayer!['setAutoSwitchQualityFor']('audio', true);
        }
        // const isLogin = Boolean(getCookie('DedeUserID'));
        // if (!isLogin) {
        //     this.dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNeedLogin);
        // } else {
        this.dashPlayer!['setAutoSwitchTopQualityFor']('video', gtQualityNormal);
        // }

        this.window['aid'] = this.config.aid;
        this.window['cid'] = this.config.cid;
        if (this.config.bvid) {
            this.window['bvid'] = this.config.bvid;
        }
        Lab.load(this);
        this.videoContinueCurrentTime = 0;
        this.user.reload(() => {
            this.loadingpanel.complete(1, true);
            this.initialized = true;
            this.trigger(STATE.EVENT.PLAYER_RELOADED);
        });
    }

    getPlayurl() {
        try {
            if (this.flvPlayer) {
                // always get a url
                return (
                    (<any>this).flvPlayer['statisticsInfo']['redirectedURL'] ||
                    this.flvPlayer['statisticsInfo']['url'] ||
                    this.mediaDataSource!['segments']![0]['url']
                );
            } else if (this.dashPlayer) {
                return (
                    this.dashPlayer['getCurrentPlayURLFor']('video') +
                    ',' +
                    this.dashPlayer['getCurrentPlayURLFor']('audio')
                );
            } else {
                return (
                    this.mediaDataSource &&
                    this.mediaDataSource['segments'] &&
                    this.mediaDataSource['segments'][0]['url']
                );
            }
        } catch (e) {
            return '';
        }
    }
    prev(doneCallback?: Function, failCallback?: Function) {
        this.initStart = performance.now();
        const that = this;
        if (this.playlistNoView) {
            return this.playlistNoView.playPrevLogicList();
        } else if (this.playlist) {
            return this.playlist.playPrevLogicList();
        } else {
            let p = this.config.p - 1;
            if (this.config.seasonType > 0) {
                p = +this.initPartmanager().search(this.config.episodeId, 'episode_id', true) - 1;
            }
            if (this.config.type === ContentType.Pugv) {
                p = +this.initPartmanager().search(this.config.cid, 'cid', true) - 1;
            }
            if (p < 1) {
                return;
            }
            const options = {
                p,
                doneCallback: doneCallback,
                failCallback: failCallback,
            };
            return that.reloadMedia.callNextPart(options, null, true);
        }
    }
    mode(mode: any) {
        if (this.controller) {
            this.controller.setMode(mode);
        }
    }
    option(key: string, value?: any) {
        if (!key) {
            return false;
        } else if (typeof value === 'undefined') {
            return this.config[<keyof IPlayerConfig>key];
        } else {
            (<any>this).config[key] = value;
        }
    }
    getBufferRate() {
        if (this.controller) {
            return this.controller.getBufferRate();
        }
    }
    getPlaylist() {
        if (this.initPartmanager()) {
            return this.partmanager!.getParts();
        }
    }
    setMute() {
        if (!this.isMute()) {
            this.volume(0);
            this.video.muted = true;
        } else {
            this.video.muted = false;
            this.volume(this.controller.getLastVolume());
        }
    }
    getVersion() {
        return METADATA;
    }
    getState() {
        const state = ['IDEL', 'READY', 'BUFFERING', 'PLAYING', 'PAUSED', 'COMPLETE'];
        return state[this.state.video_state];
    }
    isFullScreen() {
        return this.state.mode === STATE.UI_FULL || this.state.mode === STATE.UI_WEB_FULL;
    }
    getWidth() {
        if (this.template) {
            return this.template.container.outerWidth();
        }
    }
    getHeight() {
        if (this.template) {
            return this.template.container.outerHeight();
        }
    }
    isMute() {
        return this.volume() === 0;
    }
    getPlaylistIndex() {
        return Number(this.config.p) - 1;
    }
    stop() {
        if (this.flvPlayer) {
            this.flvPlayer['currentTime'] = this.duration() || 0;
        }
        if (this.dashPlayer) {
            this.dashPlayer['seek'](this.duration() || 0);
        }
        this.controller.setState(STATE.V_PAUSE);
        this.controller.setState(STATE.V_COMPLETE);
    }
    exitFullScreen() {
        if (this.isFullScreen() && this.state.mode !== STATE.UI_NORMAL) {
            this.mode(STATE.UI_NORMAL);
        }
    }
    reloadAccess(callback?: Function) {
        if (this.user) {
            this.user.reload(callback);
        }
    }
    logger(visibility?: boolean) {
        if (this.eventLog) {
            if (typeof visibility === 'undefined') {
                return window['eventLogText'] || false;
            } else {
                if (visibility) {
                    this.eventLog.show();
                } else {
                    this.eventLog.hide();
                }
            }
        }
    }
    play(fromTrigger?: any) {
        // if (this.playerQualityChanging) {
        //     return false;
        // }
        if (this.config.isPremiere) {
            this.premiereSeekSync();
            return false;
        }
        if (this.interactiveVideo && this.interactiveVideo.getChooseStatus()) {
            return false;
        }
        if (this.interactiveVideo && this.interactiveVideo.countdownSymbol) {
            return false;
        }
        if (this.video) {
            const duration = this.duration(this.video, true)!;
            const ended = this.videoContinueTime ? false : this.video.ended;
            if (
                (this.currentTime() === duration + this.videoContinueTime || ended) &&
                this.controller.getLastState() !== STATE.V_COMPLETE
            ) {
                this.seek(0);
            } else if (this.currentTime()! >= duration && this.videoContinueTime > 0) {
                clearTimeout(this.videoContinueTimeChecker);
                this.videoContinueCurrentTime = this.currentTime()!;
                this.videoContinueCompareTime = +new Date();
                this._end_timer(this.videoContinueCurrentTime);
                if (this.bangumipaypanel) {
                    this.bangumipaypanel.show(this.currentTime()! - duration, this.videoContinueTime);
                }
            }
            if (this.rangePlay.isEnable && this.rangePlay.endPause) {
                this.rangePlay.isEnable = false;
                this.toast.addTopHinter('您已离开剪影区间，恢复正常播放', 4000);
            }
            this.controller.setState(STATE.V_PLAY, fromTrigger, this.currentTime()! >= duration);
        }
        this.trigger(STATE.EVENT.VIDEO_MEDIA_PLAY);
    }
    pause(fromTrigger?: any) {
        if (this.interactiveVideo && this.interactiveVideo.getChooseStatus()) {
            return false;
        }
        if (this.interactiveVideo && this.interactiveVideo.countdownSymbol) {
            return false;
        }
        if (this.video) {
            // audio out of sync with video hack
            if (Math.abs(this.lastPauseTime - this.currentTime()!) > 300 && this.currentTime()! < this.duration()!) {
                this.video.currentTime = this.video.currentTime;
                this.lastPauseTime = this.currentTime()!;
            }

            clearTimeout(this.videoContinueTimeChecker);
            if (this.videoContinueTime > 0) {
                this.videoContinueCurrentTime = this.currentTime()!;
            }
            this.controller.setState(STATE.V_PAUSE, fromTrigger, this.currentTime()! >= this.duration()!);
        }
        this.trigger(STATE.EVENT.VIDEO_MEDIA_PAUSE);
    }

    // videoReuse - video标签是否复用，复用后的video无需再绑定事件（_videoEventListener）
    destroy(remove?: any, videoReuse = true) {
        this.videoReuse = videoReuse;
        this.flag1 = false;
        this.destroyed = true;
        this.segmentSizeMaps = {};
        this.reportParamMaps = {};
        this.multipleDanmakuDebug = null;
        this.partmanager = null;
        this.videoInfo = null;
        this.firstAudioFrameReported = false;
        this.firstVideoFrameReported = false;
        this.window.auxiliary = this.auxiliary = <any>undefined;
        this.dolbyEffectType = DolbyEffectType.None;
        this.dolbyEffectOpend = false;
        this.flacEffectOpened = false;
        this.trigger(STATE.EVENT.VIDEO_BEFORE_DESTROY);
        Lab.destroy(this);
        this.electricpanel = null;
        clearInterval(this.timerChecker!);
        clearTimeout(this.videoContinueTimeChecker);
        clearTimeout(this.timerVideoStatus);
        clearTimeout(this.premiereSyncTimer);
        // this.hideErrorMsg();
        this.cacheVideoElement();
        if (this.video) {
            !videoReuse && (this.video['disablePictureInPicture'] = true); // video不复用，destroy时退出画中画
            this.video.pause();
            if (this.flvPlayer) {
                this.flvPlayer['destroy']();
                this.flvPlayer = <any>null;
            }
            if (this.dashPlayer) {
                this.dashEventHandler.unregisterDashPlayerEvent(this.dashPlayer);
                this.dashPlayer['destroy']();
                this.dashPlayer = <any>null;
                window['dashPlayer'] = undefined;
            }
            if (!videoReuse) {
                const video = $(this.video);
                // @ts-ignore
                this.video = null;
                video.remove();
            }
            $(this.video).off();
        }
        this.dashEventHandler.reportTotalReceivedBytes();
        Resolve.destroy();
        this.earlyEOFTrackHandler && window['flvjs']['LoggingControl']['removeLogListener'](this.earlyEOFTrackHandler);
        this.trigger(STATE.EVENT.VIDEO_DESTROY, remove);
    }
    seek(time: number, type: number = 0, autoSeek?: any, seekEndPause?: boolean) {
        if (this.dashPlayer && this.dashPlayer.switchSuccess) {
            return false;
        }
        if (this.playerQualityChanging && !this.dashPlayer) {
            return false;
        }
        if (this.config.ad) {
            return false;
        }
        if (this.interactiveVideo && this.interactiveVideo.getChooseStatus()) {
            return false;
        }
        if (this.interactiveVideo && this.interactiveVideo.countdownSymbol) {
            return false;
        }
        // 首播EP禁止t参数/外部调用/快捷键/拖进度条进行seek
        if (
            this.config.isPremiere &&
            (type === STATE.SEEK_TYPE.PARAMS ||
                type === STATE.SEEK_TYPE.OUTER ||
                type === STATE.SEEK_TYPE.SLIDEKEY ||
                type === STATE.SEEK_TYPE.SLIDEBAR)
        ) {
            return false;
        }
        if (this.interactiveVideo && this.duration()) {
            const t = this.interactiveVideo.getDisableTime(time);
            if (t) {
                time = Math.min(time, this.duration()! - t - 0.4); // 中插选项间隔是 0.5s 一个
            }
        }
        this.trigger(STATE.EVENT.VIDEO_MEDIA_SEEK, {
            time,
            from: type,
        }); // 设置currentTime之前
        this.videoSeeking = true;
        if (!autoSeek) {
            this.seekLoad = true;
        }
        if (this.video) {
            const offset = this.getTimeOffset();
            const realDuration = this.duration(this.video, true)!; // video.duration - offset
            const duration = this.duration()!; // video.duration - offset + disableTime
            const that = this;
            // prevent sometimes fire video ended but currentTime is 0
            if (duration === realDuration && time >= realDuration - 1) {
                time = realDuration - 1.1;
            } else if (duration !== realDuration && time >= realDuration - 1 && time <= realDuration + 0.1) {
                time = realDuration - 1.1;
            } else if (duration !== realDuration && time >= duration) {
                time = duration - 0.1;
            }
            if (time < 0) {
                time = 0;
            }
            this.checkRangeSeek(time);
            if (time > realDuration && time <= duration) {
                this.lastPauseTime = time;
                if (this.videoContinueTime) {
                    this.videoContinueCurrentTime = time;
                    this.videoContinueCompareTime = +new Date();
                    this._end_timer(time);
                    setTimeout(function () {
                        that.video.pause();
                    });
                    if (time !== duration) {
                        seekEndPause ? this.pause() : this.play();
                    } else {
                        if (this.bangumipaypanel) {
                            this.bangumipaypanel.show(duration, duration);
                        }
                    }
                    // 最后假时间的seeked事件。真实视频seek完成时同样会触发这个事件
                    // 这个事件和video_media_before_seek、video_media_after_seek并不相同
                    // video_media_seeked和video_media_after_seek重复
                    this.trigger(STATE.EVENT.VIDEO_MEDIA_SEEKED, { time: this.currentTime() });
                } else if (this.videoDisableTime) {
                    clearTimeout(this.videoContinueTimeChecker);
                    this.videoContinueCurrentTime = 0;
                    time = realDuration - 1.1;
                    if (this.dashPlayer) {
                        this.dashPlayer['seek'](time + offset || 0);
                    }
                    if (this.flvPlayer) {
                        if (type === STATE.SEEK_TYPE.SLIDEKEY) {
                            this.video.currentTime = time + offset || 0;
                        } else {
                            this.flvPlayer['currentTime'] = time + offset || 0;
                        }
                    }
                    seekEndPause ? this.controller.setState(STATE.V_PAUSE) : this.controller.setState(STATE.V_PLAY);
                    // this.controller.setState(STATE.V_COMPLETE);
                }
            } else {
                clearTimeout(this.videoContinueTimeChecker);
                this.videoContinueCurrentTime = 0;
                if (time === realDuration) {
                    this.controller.setState(STATE.V_PAUSE);
                }
                if (this.flvPlayer) {
                    if ((type = STATE.SEEK_TYPE.SLIDEKEY)) {
                        this.video.currentTime = time + offset || 0;
                    } else {
                        this.flvPlayer['currentTime'] = time + offset || 0;
                    }
                }
                if (this.dashPlayer) {
                    this.dashPlayer['seek'](time + offset || 0);
                }

                if (time !== realDuration) {
                    seekEndPause ? this.controller.setState(STATE.V_PAUSE) : this.controller.setState(STATE.V_PLAY);
                }
            }
        }
    }
    volume(volume?: number) {
        if (typeof volume !== 'undefined') {
            if (volume !== this.volume()) {
                this.trigger(STATE.EVENT.VIDEO_MEDIA_VOLUME);
            }
            if (volume === 0) {
                this.trigger(STATE.EVENT.VIDEO_MEDIA_MUTE);
            }
            volume = volume || 0;
            this.controller.volume(volume);
        } else if (this.video) {
            return this.video.volume;
        } else {
            return false;
        }
    }
    private _beforeInit() {
        Player.video = <any>null;
        SessionController.updateConfig(this.config.storageName, this.config.aid, this.config.bvid);
        this.pid = new Date().getTime() * 1000 + Math.floor(Math.random() * (999 - 100 + 1)) + 100;
        this.$body = $(this.window.document.body);

        this.documentElement = this.window.document.documentElement;

        if (this.$body.find('#bilibili-player').length) {
            this.$parent = this.$body.find('#bilibili-player');
        } else {
            this.$parent = this.$body.find('#bofqi');
        }
        // 给游戏播放器用
        // if (this.config.gamePlayer) {
        //     const auto = this.videoSettings['video_status']['auto'];
        //     if (typeof auto === 'undefined') {
        //         this.config.autoplay = this.config.autoplay;
        //     } else {
        //         this.config.autoplay = auto;
        //     }
        //     if (this.config.autoplay) {
        //         this.videoSettings['video_status']['volume'] = 0;
        //     }
        // }

        if (!this.$parent.length) {
            this.$parent = this.$body;
        }
        this.extraParams = rebuildPlayerExtraParams(this);

        try {
            if (SessionController.getSession()) {
                this._initSession();
                this.videoSettings['block'] = SessionController.getSession()['block'];
            } else {
                const defaultSettings = {
                    setting_config: {
                        preventshade: false,
                    },
                    video_status: {},
                    block: {
                        type_reverse: true,
                        function_normal: true,
                        function_subtitle: true,
                    },
                    message: {},
                };

                this._initReset('block', defaultSettings);
                this._initSession();
            }
        } catch (e) { }

        // this.autopartTransition();
        csrf();
    }

    // // // 播放方式autopart字段过渡到新字段playtype
    // private autopartTransition() {
    //     const autopart = this.get('video_status', 'autopart');
    //     if (typeof autopart === 'number') {
    //         if (autopart > 0) {
    //             this.set('video_status', 'playtype', 1);
    //         } else {
    //             this.set('video_status', 'playtype', 2);
    //         }
    //         this.set('video_status', 'autopart', '');
    //     }
    // }

    private _initSession() {
        // 初始化session操作,所有的涉及到播放器完全初始化(palyer.init())后需要读取的session都保存在这里(倍速等不涉及player.init()的在_videoUpdateKeep方法替换video标签后)
        try {
            if (typeof sessionStorage !== 'undefined') {
                SessionController.setSession('block', this.get('block'));
            }
        } catch (e) { }
    }
    private _videoUpdateKeep() {
        // 针对切换video标签后的状态改变
        const videoStatus = SessionController.getSession('video_status');
        const videosize = videoStatus['videosize'];
        if (this.video) {
            // 首播EP视频保持1.0倍速不变；非首播EP视频倍速由Session存储的videospeed决定
            this.video.defaultPlaybackRate = this.config.isPremiere ? 1 : parseFloat(videoStatus['videospeed']) || 1;
            this.video.playbackRate = this.video.defaultPlaybackRate;
        }
        if (videoStatus['videomirror']) {
            this.template.videoWrp.addClass('video-mirror');
        }
        if (videosize !== 'video-size-default') {
            this.template.videoWrp.addClass(videosize);
            this.controller.setVideoSize();
        }
    }
    private _initReset(type: string, def: any) {
        // 针对一些仅需要临时保存的不需要永久记忆的类型,该方法会重写本地localStorage为默认值
        const local = this.get(type);
        this.videoSettings[<keyof typeof BILIBILI_PLAYER_SETTINGS>type] = $.extend(true, {}, local, def[type]);
        this.set(type, this.videoSettings[<keyof typeof BILIBILI_PLAYER_SETTINGS>type]);
    }
    private _getAdMode() {
        if (typeof this.config.admode !== 'undefined' && this.config.admode !== null) {
            return true;
        }
        return false;
    }
    _init(state?: any, isChangeP?: boolean) {
        if (!this.config.ad) {
            this.track = new Track(this);
        }
        if (state) {
            // 第一次 _init 会把 getVideoData 提前，不再需要执行
            this.getVideoData();
        }

        const that = this;
        this.destroyed = false;
        this.endingpanel = null;
        this.videoContinueTime = 0; // 番剧承包等可播假进度条
        this.videoDisableTime = 0; // 进度条可见但无法播到的进度条 与可播假进度条不会同时出现
        this.videoContinueCurrentTime = 0;
        this.videoContinueCompareTime = +new Date();
        this.userLoadedCallbacks = []; // 用户加载完成后的回调事件队列
        this.initialized = false;
        this.initializing = false;
        this.timerChecker = null;
        this.firstErrorEvent = false;
        const config = this.config;

        this.state = $.extend(
            {
                // 播放器状态
                video_state: STATE.V_IDEL,
                repeat: STATE.V_REPEAT_OFF,
                danmaku: this.config.danmaku ? STATE.DM_ON : STATE.DM_OFF,
                mode: that._getAdMode()
                    ? this.config.admode
                    : (this.videoSettings['video_status']['iswidescreen'] &&
                        this.videoSettings['video_status']['widescreensave']) ||
                        config.asWide
                        ? STATE.UI_WIDE
                        : STATE.UI_NORMAL,
                play_type: this.videoSettings['video_status']['autopart'] > 0 ? 1 : 0,
                video_type: 1,

                video_scene: 1
            },
            state,
        );

        // 继承直播播放器状态，拜年祭切换用
        try {
            if (typeof window.top?.['__LIVEPLAYER_MODE__'] !== 'undefined') {
                const mode = Number(window.top['__LIVEPLAYER_MODE__']);
                if (mode === 1) {
                    this.state.mode = STATE.UI_WEB_FULL;
                    this.$body.addClass('player-fullscreen-fix');
                    this.state.mode = STATE.UI_WEB_FULL;
                    if (window.frameElement) {
                        const rootHead = $(window.frameElement.parentElement!.ownerDocument!).find('head');
                        const tempClass = 'temp-page-full';
                        $(window.frameElement).addClass(tempClass);
                        if (rootHead.find('.bilibiliHtml5PlayerClass').length > 0) {
                            rootHead.find('.bilibiliHtml5PlayerClass').remove();
                        }
                        const style = `<style class="bilibiliHtml5PlayerClass">.player-fullscreen-fix {position: fixed;top: 0;left: 0;margin: 0;padding: 0;width: 100%;height: 100%;}.player-fullscreen-fix iframe.${tempClass}{position: fixed!important;border-radius: 0;z-index: 100000!important;left: 0;top: 0;width: 100%!important;height: 100%!important;}</style>`;
                        $(rootHead[0]).append($(style)[0]);
                    }
                } else if (mode === 2) {
                    this.state.mode = STATE.UI_FULL;
                }
                delete window.top['__LIVEPLAYER_MODE__'];
            }
        } catch (e) { }

        if (this.corePreloadUsed) {
            this.container = this.container.addClass(this.prefix).unbind().empty();
        } else {
            this.container = this.container.addClass(this.prefix).unbind();
            this.corePreloadUsed = true;
        }
        if (this.config.isAudio) {
            this.container.addClass('mode-audio');
        } else {
            this.container.removeClass('mode-audio');
        }
        if (this.config.preAd) {
            this.container.addClass('mode-pread');
        } else {
            this.container.removeClass('mode-pread');
        }
        this.directiveManager = new DirectiveManager(this);
        this.directiveManagerEvents();
        this.eventLog = new EventLogger(this);
        this.user = new User(this);
        if (!this.initialized) {
            this.loadTemplate(isChangeP);
            isChangeP && (this.session = getSessionID());
            // if (!isChangeP) {
            //     // 初始化播放器，执行片头片尾模块初始化，切p时等页面更新才初始化
            //     this.ogvUpdate(ActionType.extra);
            // }
            this.laterLoadTemplateTimer = window.setTimeout(() => {
                this.laterLoadTemplate();
            }, 1500);
        }
        // keep light state after reload
        this.controller && this.controller.turnLight(this.controller.isLightOn() ? 'on' : 'off');
        // if (typeof that.window['onLoginInfoLoaded'] === 'function') {
        //     that.window['onLoginInfoLoaded'](function () {
        //         that.user.load();
        //     });
        // } else {
        // this.user.load();
        // }

        if (this.config.record) {
            this.record = new Record({
                container: this.template.record,
                duration: 2,
                time: () => {
                    if (this.video) {
                        return this.currentTime();
                    } else {
                        return 0;
                    }
                },
            });
        }
        this.userLoadedCallback(function (status: any) {
            if (that.initialized) {
                const resolveParams = {
                    domain:
                        that.config.seasonType >= 1
                            ? Resolve.domains.bangumi
                            : that.config.playerType === 1
                                ? Resolve.domains.bangumiS
                                : Resolve.domains.interface,
                    enableSSLResolve: that.config.enableSSLResolve,
                    enableSSLStream: that.config.enableSSLStream,
                    cid: that.config.cid,
                    episodeId: that.config.episodeId,
                    quality: 0,
                    type: that.allowFlv ? '' : 'mp4',
                    requestFromInit: true,
                    extra_params: that.config.extraParams,
                    player: that,
                };
                if (resolveParams.extra_params) {
                    resolveParams.extra_params += `&qn=${resolveParams.quality}`;
                } else {
                    resolveParams.extra_params = `qn=${resolveParams.quality}`;
                }
                if (that.config.seasonType) {
                    if (!getSearchParam('season_type', `?${resolveParams.extra_params}`)) {
                        resolveParams.extra_params += `&season_type=${that.config.seasonType}`;
                    }
                }
                if (that.window.typeid) {
                    resolveParams.extra_params += `&tid=${that.window.typeid}`;
                }
                that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOAD);
                Resolve.r(resolveParams, function (result: any) {
                    result = that.transformQuality(result);
                    that.errorHandler.backupURLIndex = 0;
                    that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOADED);
                    if (result !== undefined && result.mediaDataSource !== null) {
                        that.eventLog.log('\r\n' + JSON.stringify(result) + '\r\n', 3);
                        that._setVideoQuality(result.quality);
                        that.controller.updateQuality(result, that.videoQuality);
                        that.videoData = {
                            acceptQuality: result.acceptQuality,
                            videoQuality: that.videoQuality,
                            bp: result.bp,
                            hasPaid: result.hasPaid,
                            isPreview: result.isPreview,
                        };
                    }
                });
                if (that.dashPlayer) {
                    // if (status.login) {
                    that.dashPlayer['setAutoSwitchTopQualityFor']('video');
                    // } else {
                    //     that.dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNeedLogin);
                    // }
                }
                return false;
            }
            if (that.initializing) {
                return false;
            }
            that.initializing = true;

            if (status.allow_bp && !that.errorPlayurl && !that.config.lightWeight && !that.interactive) {
                that.bangumipaypanel = new BangumiPayPanel(that);
                that.videoContinueTime = 15;
                that.bind(STATE.EVENT.VIDEO_PLAYURL_LOADED, function () {
                    if (that.errorPlayurl) {
                        that.videoContinueTime = 0;
                    } else {
                        that.videoContinueTime = 15;
                    }
                });
            }

            if (status.ad && status.ad['aid'] && status.ad['cid'] && !that.config.ad) {
                const ad = $('<div class="' + that.prefix + ' ' + that.prefix + '-ad"></div>').prependTo(
                    that.template.container,
                );
                that.container.removeClass('mode-pread');
                that.config.autoplay = false;
                that.admode = that.state && that.state.mode ? that.state.mode : 0;
                that.adPlayer = new window['BilibiliPlayer']({
                    element: ad[0],
                    namespace: '.bilibiliplayerad' + (+new Date()).toString().substr(-8), // unique video namespace
                    ad: status.ad['url'],
                    sourceplayer: that,
                    aid: status.ad['aid'],
                    cid: status.ad['cid'],
                    bvid: status.ad['bvid'],
                    skipable: status.ad['allow_jump'],
                    autoplay: true,
                    show_bv: that.config.show_bv,
                    admode: that.admode,
                    beforeplay: function () {
                        that.pause();
                    },
                    afterplay: function () {
                        if (that.adPlayer) {
                            that.adPlayer['destroy'](true);
                            that.controller && that.controller.resize();
                            that.play();
                            delete that.adPlayer;
                            that.trigger(STATE.EVENT.VIDEO_MEDIA_ENTER);
                        }
                    },
                });
                that.loadingpanel.complete(3, true);
                that.loadingpanel.hide();
            }
            that.initRangePlayParam();
        });
        this.one(STATE.EVENT.VIDEO_DANMAKU_LOADED, () => {
            if (!performance.timing.perfPFDPEnd) {
                performance.timing.perfPFDPEnd = Date.now();
            }
        });
        this.controller.timeLimitWatch();
        this.controller.whitelistToast();

        if (this.window['playlistNextPage'] && typeof this.window['playlistNextPage'] === 'function') {
            this.window['playlistNextPage']({
                aid: this.config.aid,
                cid: this.config.cid,
                bvid: this.config.bvid,
                p: this.playlist && this.playlist.findPartNumber(this.config.cid),
                index:
                    this.playlist &&
                    this.playlist.findListIndex(this.config.aid, this.config.bvid)! + this.playlist.listInfo.index,
            });
        }
        this.playlist && this.playlist.init();
        this.playlist && this.playlist.switchAuxiliary();
        this.playlistNoView && this.playlistNoView.switchAuxiliary();
    }
    private directiveManagerEvents() {
        // 226001
        this.directiveManager.on(WD.VI_RETRIEVE_DATA.toString(), (e, received: IReceivedInterface) => {
            this.directiveManager.responder(received, {
                duration: this.duration(),
                currentTime: this.currentTime(),
                sTime: this.advDanmaku && this.advDanmaku.advDanmaku.sTime,
            });
        });
        // 228002
        this.directiveManager.on(WD.WP_GET_PLAYER_STATE.toString(), (e, received: IReceivedInterface) => {
            this.directiveManager.responder(received, <any>this.getPlayerState());
        });
        // 228003
        this.directiveManager.on(WD.WP_SET_PLAYER_STATE.toString(), (e, received: IReceivedInterface) => {
            const list = received.data && Object.keys(received.data);
            if (list) {
                list.forEach((item: string) => {
                    this.setPlayerState(item, received.data[item]);
                });
            }
        });
    }
    private loadTemplate(isChangeP?: boolean) {
        this.globalFunction = new GlobalFunction(this); // 定义全局函数
        this.template = new Template(this); // 播放器框架形成
        // if (isChangeP) {
        //     this.template.initAuxiliaryTemplate();
        // }

        // TODO：之后考虑把所有plugins放在此处维护
        this.allPlugins = this.allPlugins || new AllPlugins(this);
        this.toast = new Toast(this); // Toast

        if (!this.config.ad) {
            this.track?.init();
        }

        this.loadingpanel = new LoadingPanel(this, this.template.videoPanel); // 加载信息面板

        if (this.corePreload || this.config.interactiveNode) {
            this.loadingpanel.hide();
        }

        this.loadingpanel.ready(2, this.cdnTimeStart);
        this.loadingpanel.ready(0);

        if (this.config.playlist) {
            this.playlistNoView = new PlaylistNoView(this);
        }
        this.feedbackTooltip = new Tooltip({
            name: 'controll-tooltip',
            target: this.template.container.find('[data-text="反馈"]'),
            type: 'tip',
            // arrow: true,
            margin: 1,
        });
        this.controller = new Controller(this); // 播放器控制组件

        this.popup = new Popup(
            {
                container: this.template.popup,
                time: () => {
                    return this.currentTime() || 0;
                },
            },
            this,
        );

        this.errorHandler = new ErrorHandler(this);
    }

    private laterLoadTemplate() {
        const that = this;
        clearTimeout(this.laterLoadTemplateTimer);
        this.laterLoadTemplateTimer = 0;

        this.send = new Send(this); // 发送弹幕控制
        // this.danmakuSetting = new DanmakuSetting(this, this.send.template.danmakuSetting);
        // TODO：之后考虑把设置按钮移到右侧面板
        this.settingPanel = new Setting(this);
        this.setting = this.settingPanel.setting; // 播放设置面板

        this.flvPlayer && this.getVideoInfo().update(VideoInfoData.generateVideoInfoItems((<any>this).flvPlayer['type']));
        this.dashPlayer && this.getVideoInfo().update(VideoInfoData.generateVideoInfoItems('DashPlayer'));

        this.loadingpanel.complete(0, true);

        this.endingpanelInitialized = false;

        // initialize tooltips
        this.template.container.find('[data-tooltip="1"]').each((i, e) => {
            new Tooltip({
                name: 'controll-tooltip',
                target: $(e),
                type: 'tip',
                // arrow: true,
                margin: 1,
                // top: -18,
                game: this.config.gamePlayer,
            });
        });
        this.template.container
            .find('[data-tooltip="3"]')
            .not('[data-text="反馈"]')
            .each(function (i, e) {
                new Tooltip({
                    name: 'controll-tooltip',
                    target: $(e),
                    type: 'tip',
                    // arrow: true,
                    margin: 1,
                });
            });

        if (this.config.hasDanmaku) {
            // advanced danmaku
            this.advDanmaku = new AdvDanmaku(this, this.template.advDanmaku, {
                visible: this.state.danmaku,
            });

            this.basDanmaku = new BasDanmaku(
                {
                    container: this.template.basDanmaku[0],
                    visible: this.state.danmaku,
                    fontFamily: this.videoSettings['setting_config']['fontfamily'],
                    timeSyncFunc: () => {
                        if (this.video) {
                            return this.currentTime()! * 1000;
                        } else {
                            return 0;
                        }
                    },
                    blockJudge: (options: any) => {
                        return this.block.judge(options);
                    },
                },
                this,
            );
            if (
                this.flvPlayer &&
                this.flvPlayer['mediaInfo'] &&
                this.flvPlayer['mediaInfo']['width'] &&
                this.flvPlayer['mediaInfo']['height']
            ) {
                this.basDanmaku.resize(this.flvPlayer['mediaInfo']['width'], this.flvPlayer['mediaInfo']['height']);
                this.popup.resize(this.flvPlayer['mediaInfo']['width'], this.flvPlayer['mediaInfo']['height']);
            }
            this.bind(STATE.EVENT.VIDEO_METADATA_LOADED, () => {
                if (this.flvPlayer && this.flvPlayer['mediaInfo']) {
                    this.basDanmaku.resize(this.flvPlayer['mediaInfo']['width'], this.flvPlayer['mediaInfo']['height']);
                    this.popup.resize(this.flvPlayer['mediaInfo']['width'], this.flvPlayer['mediaInfo']['height']);
                }
            });
            // dash tmp width height
            if (this.dashPlayer) {
                this.basDanmaku.resize(this.video.videoWidth, this.video.videoHeight);
                this.popup.resize(this.video.videoWidth, this.video.videoHeight);
            }
            this.bind(STATE.EVENT.VIDEO_METADATA_LOADED, () => {
                this.video && this.basDanmaku.resize(this.video.videoWidth, this.video.videoHeight);
                this.video && this.popup.resize(this.video.videoWidth, this.video.videoHeight);
            });
            this.baspanel = new BasPanel(this, this.basDanmaku);

            if (!this.config.isAudio && !this.config.gamePlayer) {
                this.subtitle = new Subtitle(
                    {
                        container: this.template.subtitle,
                        time: () => {
                            return this.currentTime() || 0;
                        },
                    },
                    this,
                );
                this.controller.subtitleButton && this.controller.subtitleButton.init();
            }
        }

        this.quicklogin = new QuickLogin(this);

        Lab.load(this);
    }
    getVideoInfo() {
        if (!this.videoInfo) {
            this.videoInfo = new VideoInfo(this);
        }
        return this.videoInfo;
    }
    checkCurrentQuality(quality: number | string) {
        if (!(Number(getCookie('CURRENT_QUALITY')) === Number(quality)) && Number(quality) !== 125) {
            setCookie('CURRENT_QUALITY', String(quality));
        }
    }

    // 不记忆清晰度
    isNoCacheQuality(quality: number): boolean {
        return quality === 125 || quality === 126;
    }

    // fnval取值判断
    getFnval() {
        return (
            FNVAL_TYPE.DASH_AV1 +
            FNVAL_TYPE.DASH_8K +
            FNVAL_TYPE.DOLBYVIDEO +
            FNVAL_TYPE.DOLBYAUDIO +
            FNVAL_TYPE.DASH_4K +
            FNVAL_TYPE.HDR +
            FNVAL_TYPE.DASH_H265
        );
    }

    /**
     * @desc 开启/关闭杜比音效
     */
    openDolbyEffect(open: boolean) {
        this.dolbyEffectOpend = open;
    }

    getVideoData(defaultQuality?: any, vtype?: any, reload?: boolean) {
        if (this.playlistLimit) {
            setTimeout(() => {
                this.loadingpanel.complete(2, true);
                this.load(
                    {
                        mediaDataSource: {
                            type: 'mp4',
                            url: '//s1.hdslb.com/bfs/static/player/media/encoding.mp4',
                        },
                    },
                    reload,
                );
            }, 0);
            return;
        }

        if (!defaultQuality) {
            const localQuality = Number(this.videoSettings['setting_config']['defquality']);
            const isLogin = Boolean(getCookie('DedeUserID'));
            defaultQuality = qualityMap(localQuality) || localQuality || qualityMap(0);
            if (this.config.quality) {
                defaultQuality = this.config.quality;
            }
            if (defaultQuality > qualityMap(64) && !this.allowFlv) {
                defaultQuality = qualityMap(64);
            }
            if (!isLogin && defaultQuality > gtQualityNeedLogin) {
                defaultQuality = 0;
            }

            this.checkCurrentQuality(localQuality);
        }
        if (!vtype) {
            vtype = this.allowFlv ? '' : 'mp4';
        }

        const that = this;
        const config = this.config;
        this.cdnTimeStart = +new Date();

        const resolveParams: any = {
            domain:
                that.config.seasonType >= 1
                    ? Resolve.domains.bangumi
                    : that.config.playerType === 1
                        ? Resolve.domains.bangumiS
                        : Resolve.domains.interface,
            enableSSLResolve: that.config.enableSSLResolve,
            enableSSLStream: that.config.enableSSLStream,
            cid: that.config.cid,
            episodeId: this.config.episodeId,
            quality: defaultQuality,
            type: this.allowFlv ? '' : 'mp4',
            requestFromInit: true,
            extra_params: that.config.extraParams,
            player: that,
        };

        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&qn=${resolveParams.quality}`;
        } else {
            resolveParams.extra_params = `qn=${resolveParams.quality}`;
        }
        if (that.config.seasonType) {
            if (!getSearchParam('season_type', `?${resolveParams.extra_params}`)) {
                resolveParams.extra_params += `&season_type=${that.config.seasonType}`;
            }
        }
        let fnval = this.getFnval();
        // only UGC and MSE supported browser can use dashplayer
        resolveParams.fnver = 0;
        resolveParams.fnval = fnval;
        resolveParams.session = that.session;
        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&fnver=0&fnval=${fnval}`;
        } else {
            resolveParams.extra_params = `fnver=0&fnval=${fnval}`;
        }
        if (this.window.typeid) {
            resolveParams.extra_params += `&tid=${this.window.typeid}`;
        }
        that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOAD);
        // true initial time when player start load to player ready to request playurl
        this.bVideo.initialCallback();

        Resolve.r(
            resolveParams,
            function (result?: any) {
                if (that.destroyed) {
                    return;
                }
                result = that.transformQuality(result);
                that.errorHandler && (that.errorHandler.backupURLIndex = 0);
                if (result !== undefined && result.mediaDataSource !== null) {
                    that.eventLog && that.eventLog.log('\r\n' + JSON.stringify(result) + '\r\n', 3);
                    that.errorPlayurl = false;
                    that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOADED);
                    that.mediaDataSource = result.mediaDataSource;
                    that.currentStreamType = result.streamType;
                    that.flushExtraParams();
                    const noauth =
                        (Number(result.vipType) === 0 || Number(result.vipStatus) !== 1) &&
                        Number(result.bp) !== 1 &&
                        !result.hasPaid;
                    const notStart =
                        that.extraParams &&
                        typeof that.extraParams.isStart === 'boolean' &&
                        !that.extraParams.isStart &&
                        that.extraParams.canWatch;
                    let seekType = 'range';

                    if (result.mediaDataSource['type'] === 'flv') {
                        const segments = result.mediaDataSource['segments'];
                        for (let i = 0; i < segments.length; i++) {
                            if (segments[i]['url'].match(/\/ws\.acgvideo\.com\//)) {
                                // ws.acgvideo.com: Use param seek (bstart/bend)
                                seekType = 'param';
                                break;
                            }
                        }
                    }
                    that.userLoadedCallback(() => {
                        that.previewToast(result);
                    });

                    if (!that.config.isPremiere && notStart) {
                        that.controller && that.controller.addPVHint();
                    }
                    // if (that.mediaDataSource && that.mediaDataSource.type === 'dash' && !that.isSvipQuality(result.quality)) { // dash总是自动
                    //     defaultQuality = 0;
                    //     if (result.quality > gtQualityNormal) {
                    //         result.quality = gtQualityNormal;
                    //     }
                    // }
                    that.videoQuality = defaultQuality;
                    that._setVideoQuality(result.quality);
                    that.controller && that.controller.updateQuality(result, defaultQuality);
                    that.videoData = {
                        acceptQuality: result.acceptQuality,
                        videoQuality: that.videoQuality,
                        bp: result.bp,
                        hasPaid: result.hasPaid,
                        isPreview: result.isPreview,
                    };
                    that.load(
                        {
                            mediaDataSource: result.mediaDataSource,
                            seekType: seekType,
                        },
                        reload,
                    );
                    that.loadingpanel.complete(2, true);
                } else {
                    that.loadingpanel.complete(
                        2,
                        false,
                        'Video url error.',
                        that.config.seasonType >= 1 ? STATE.PLAYURL_BANGUMI_RESOLVE_ERROR : STATE.PLAYURL_RESOLVE_ERROR,
                    );
                    that.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYURL_ERROR,
                        that.config.seasonType >= 1 ? STATE.PLAYURL_BANGUMI_RESOLVE_ERROR : STATE.PLAYURL_RESOLVE_ERROR,
                    );
                }
            },
            function (type?: any, error?: any, playurl?: any) {
                if (that.destroyed) {
                    return;
                }
                const errorTypes = Resolve.errorTypes;
                that.errorPlayurl = true;
                if (error === 'Resolve Error: video is encoding.') {
                    that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOADED);
                    // encoding
                    that.load(
                        {
                            mediaDataSource: {
                                type: 'mp4',
                                url: '//s1.hdslb.com/bfs/static/player/media/encoding.mp4',
                            },
                        },
                        reload,
                    );
                } else {
                    if (/JSON/.test(error)) {
                        that.trigger(
                            STATE.EVENT.VIDEO_MEDIA_ERROR,
                            STATE.PLAYURL_ERROR,
                            that.config.seasonType >= 1 ? STATE.PLAYURL_BANGUMI_FORM_ERROR : STATE.PLAYURL_FORM_ERROR,
                            (error ? 'status:' + error + ',' : '') + 'url:' + playurl,
                        );
                    } else if (type === errorTypes.resolve) {
                        that.trigger(
                            STATE.EVENT.VIDEO_MEDIA_ERROR,
                            STATE.PLAYURL_ERROR,
                            that.config.seasonType >= 1
                                ? STATE.PLAYURL_BANGUMI_RESOLVE_ERROR
                                : STATE.PLAYURL_RESOLVE_ERROR,
                            (error ? 'status:' + error + ',' : '') + 'url:' + playurl,
                        );
                    } else {
                        // errorTypes.network
                        that.trigger(
                            STATE.EVENT.VIDEO_MEDIA_ERROR,
                            STATE.PLAYURL_ERROR,
                            that.config.seasonType >= 1
                                ? STATE.PLAYURL_BANGUMI_NETWORK_ERROR
                                : STATE.PLAYURL_NETWORK_ERROR,
                            'error_type:' +
                            (that.option('enableSSLResolve') === 1 ? 'https' : 'http') +
                            (error ? ',status:' + error + ',' : ',') +
                            'url:' +
                            playurl,
                        );
                        if (that.option('enableSSLResolve') === true && window.location.protocol === 'http:') {
                            that.option('enableSSLResolve', false);
                            that.loadingpanel.complete(
                                2,
                                false,
                                '<span style="opacity: 0.5;">https resolve failed, fallback to http</span>',
                            );
                            that.loadingpanel.reset(2);
                            setTimeout(function () {
                                that.loadingpanel.ready(2);
                                that.getVideoData(defaultQuality, vtype, reload);
                            }, 1000);
                            return false;
                        }
                    }
                    that.record && that.record.disable();
                    that.load(
                        {
                            mediaDataSource: {
                                type: 'mp4',
                                url: '//s1.hdslb.com/bfs/static/player/media/error.mp4',
                            },
                        },
                        reload,
                    );
                }
                that.controller.updateQuality(null, qualityMap(64));
                that.videoData = {
                    acceptQuality: [],
                    videoQuality: qualityMap(64),
                    bp: false,
                    hasPaid: false,
                };
                that.loadingpanel.complete(2, true);
                // that.loadingpanel.complete(2, false, error || 'No Access-Control-Allow-Origin header or other error');
                that.trigger(STATE.EVENT.VIDEO_PLAYURL_LOAD);
            },
        );
    }

    _setVideoQuality(quality: number) {
        this.videoRealQuality = quality;
    }

    private _getHiddenProp(): DocumentHideType | null {
        const prefixes = ['webkit', 'moz', 'ms', 'o'];

        // if 'hidden' is natively supported just return it
        if ('hidden' in document) {
            return 'hidden';
        }

        // otherwise loop over all the known prefixes until we find one
        for (let i = 0; i < prefixes.length; i++) {
            if (prefixes[i] + 'Hidden' in document) {
                return <DocumentHideType>(prefixes[i] + 'Hidden');
            }
        }

        // otherwise it's not supported
        return null;
    }
    private _isDocumentHidden() {
        const prop = this._getHiddenProp();
        if (!prop) {
            return false;
        }
        return document[<keyof Document>prop];
    }

    _videoEventListener(video: HTMLVideoElement) {
        const that = this;
        this.video = video || document.createElement('video');
        this.allPlugins?.update(this.video);
        this.timerVideoStatus = window.setTimeout(function () {
            if (!that.config.ad) {
                that._videoUpdateKeep();
            }
        }, 0);
        const controller = this.controller;
        let stalled = false;
        let lastPos = 0;
        let lastSeekPos = 0;
        // dirty check when video might in buffering
        // this.mock.setMock('stalled', () => {
        //     stalled = true;
        //     that.controller.setState(STATE.V_BUFF);
        //     that.bufferStartTime = +new Date();
        // });
        let latestBufferingInfo: any = {};
        const dirtyChecker = function () {
            that.timerChecker = window.setInterval(function (this: any) {
                if (lastPos === that.currentTime(this.video, true)! && !that.sourceSwitching) {
                    stalled = true;
                    that.controller.setState(STATE.V_BUFF);
                    if (!that.bufferStartTime) {
                        // that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER);
                        let info: any = {};
                        if (that.currentTime()! < that.getBufferRate()! * that.duration()! - 4) {
                            // 缓冲充足的卡顿
                            that.lagLoad = true;
                        } else if (
                            that.dashPlayer &&
                            that.dashPlayer?.getBufferingInfo() &&
                            that.dashPlayer?.getBufferingInfo().type === '161'
                        ) {
                            that.headLoad = true;
                        } else if (
                            !info.type &&
                            (that.state.video_type === 3 ||
                                that.state.video_type === 23 ||
                                that.state.video_type === 4 ||
                                that.state.video_type === 24)
                        ) {
                            that.nullLoad = true;
                        } else if (!that.seekLoad) {
                            that.dashPlayer && that.dashPlayer['getCorePlayer']().setP2pPermission(false, 2);
                        }
                        // 跳过存在的 gap
                        if (that.video && that.video.buffered && that.video.buffered.length > 1) {
                            for (let i = 0; i < that.video.buffered.length - 1; i++) {
                                let seekTarget = 0;
                                if (
                                    that.video.buffered.start(i) < that.video.currentTime &&
                                    that.video.buffered.end(i) >= that.video.currentTime - 4 &&
                                    that.video.buffered.start(i + 1) > that.video.currentTime - 4 &&
                                    that.video.buffered.start(i + 1) - that.video.buffered.end(i) < 4 // gap 大小
                                ) {
                                    seekTarget =
                                        Math.max(that.video.buffered.start(i + 1), that.video.currentTime) -
                                        that.getTimeOffset();
                                }
                                if (seekTarget && lastSeekPos !== seekTarget) {
                                    lastSeekPos = seekTarget;
                                    that.seek(seekTarget, STATE.SEEK_TYPE.DEFAULT, true);
                                }
                            }
                        } else if (!that.seekLoad) {
                            if (that.lagLoad) {
                                that.controller.bufferHas();
                            } else {
                                that.controller.bufferNoHas();
                                that.controller.boceGuideToast();
                            }
                        }
                        that.bufferStartTime = +new Date();
                    }
                } else {
                    that.template.playerArea.removeClass('video-state-buff'); // edge
                    controller.loadlagTimer5s = 0;
                    controller.playLagTimer5s = 0;
                    lastPos = that.currentTime(this.video, true)!;
                }
            }, 150);
        };

        $(video).on('play', function () {
            if (performance?.timing && !performance.timing.playerStage4) {
                performance.timing.playerStage4 = +new Date();
            }
            if (!video.ended) {
                if (that.bangumipaypanel && that.bangumipaypanel.isShow) {
                    that.bangumipaypanel.hide();
                    that.seek(0);
                }
            }
            // prevent video play when video is buffing and last state is pause
            if (
                that.state.video_state !== STATE.V_PLAY &&
                !(controller.getLastState() === STATE.V_PAUSE && that.state.video_state === STATE.V_BUFF)
            ) {
                setTimeout(function () {
                    that.controller.setState(STATE.V_PLAY);
                });
            }
            clearInterval(that.timerChecker!);
            dirtyChecker();
            if (that.videoSeeking) {
                that.videoSeeking = false;
                that.videoSeekingRelay = true;
                that.trigger(STATE.EVENT.VIDEO_MEDIA_SEEKED, { time: that.currentTime() });
            }
            that.trigger(STATE.EVENT.VIDEO_MEDIA_PLAYING);
            that.track?.view();
            that.errorHandler.hideErrorMsg();
        });
        $(video).on('pause', function () {
            const duration = that.duration(video, true)!;
            // prevent video pause when video is buffing and last state is play
            if (
                that.currentTime() !== duration &&
                that.state.video_state !== STATE.V_PAUSE &&
                !(controller.getLastState() === STATE.V_PLAY && that.state.video_state === STATE.V_BUFF)
            ) {
                // audio out of sync with video hack
                if (Math.abs(that.lastPauseTime - that.currentTime()!) > 300 && that.currentTime()! < duration) {
                    that.video.currentTime = that.video.currentTime;
                    that.lastPauseTime = that.currentTime()!;
                }

                clearTimeout(that.videoContinueTimeChecker);
                if (that.videoContinueTime > 0) {
                    that.videoContinueCurrentTime = that.currentTime()!;
                }
                that.controller.setState(STATE.V_PAUSE, null, that.currentTime()! >= duration);
                that.trigger(STATE.EVENT.VIDEO_MEDIA_PAUSE);
                that.controller.setState(STATE.V_PAUSE);
            }
            clearInterval(that.timerChecker!);
        });
        $(video).on('seeked', function () {
            if (that.controller.getLastState() !== STATE.V_PAUSE) {
                const playedPromise = video.play();
                if (playedPromise) {
                    playedPromise.catch((err: any) => {
                        if (that.state.video_state <= STATE.V_READY) {
                            that.pause();
                        }
                    });
                }
            }
            if (that.videoSeeking || that.videoSeekingRelay) {
                if (!that.videoSeekingRelay) {
                    that.trigger(STATE.EVENT.VIDEO_MEDIA_SEEKED, { time: that.currentTime() });
                }
                that.videoSeeking = false;
                that.videoSeekingRelay = false;
                if (stalled) {
                    stalled = false;
                    that.controller.setState(that.controller.getLastState());
                    if (that.bufferStartTime && that.bufferStartTime < +new Date()) {
                        if (latestBufferingInfo) {
                            const bufferTime = String(+new Date() - that.bufferStartTime);
                            latestBufferingInfo.bufferTime = bufferTime;
                        }
                        latestBufferingInfo = {};
                        that.bufferStartTime = 0;
                    }
                }
                that.seekLoad = false;
            }
            that.trigger(STATE.EVENT.VIDEO_MEDIA_SEEK_END);
        });
        $(video).on('stalled', function () {
            // if(!stalled) {
            //     stalled = true;
            //     that.controller.setState(STATE.V_BUFF);
            // }
        });
        $(video).on('timeupdate', function () {
            if (that.currentTime(video, true) !== 0) {
                that.videoTime = that.currentTime(video, true)!;
            }
            that.trigger(STATE.EVENT.VIDEO_MEDIA_TIME);
            that.trigger(STATE.EVENT.VIDEO_MEDIA_FRAME);
            if (stalled && lastPos !== that.currentTime(video, true)) {
                stalled = false;
                if (that.controller.getLastState() !== STATE.V_COMPLETE) {
                    that.controller.setState(that.controller.getLastState());
                }
                if (that.bufferStartTime && that.bufferStartTime < +new Date()) {
                    // that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER_END);
                    if (latestBufferingInfo) {
                        const bufferTime = String(+new Date() - that.bufferStartTime);
                        latestBufferingInfo.bufferTime = bufferTime;
                    }

                    latestBufferingInfo = {};
                    that.lagLoad = false;
                    that.headLoad = false;
                    that.nullLoad = false;
                    that.bufferStartTime = 0;
                }
            }
            if (that.loadlagSymbol) {
                // dashPlayer playurl
                that.loadlagSymbol = false;
            }
            // safari progress bug hack
            // when buffered area reaching end and seek to no buffer area, safari won't fire progress event
            if (this.buffered != null && browser.version.safari) {
                that.controller.buffer(this.buffered, that.duration(), that.currentTime()!);
            }
            if (that.rangePlay.isEnable) {
                if (that.currentTime()! > that.rangePlay.s_to!) {
                    that.controller.setState(STATE.V_PAUSE);
                    that.rangePlay.endPause = true;
                }
            }
        });
        $(video).on('loadstart', function () {
            if (!that.initialized) {
                that.loadingpanel.ready(3);
            }
            if (!that.sourceSwitching) {
                clearInterval(that.timerChecker!);
            }
            that.controller.setState(STATE.V_IDEL);
        });
        $(video).on('waiting', function () {
            // that.controller.setState(STATE.V_BUFF);
            that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER);
        });
        $(video).on('canplay', function () {
            that.errorHandler.errorMessage = null;
            that.errorHandler.hideErrorMsg();
            that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER_END);
            if (that.sourceSwitching) {
                that.sourceSwitching = false;
            }
        });
        $(video).on('ended', function () {
            const currentTime = that.currentTime(video, true)!;
            const duration = that.duration(video, true)!;
            if (browser.version.safari && !that.dashPlayer) {
                if (duration < that.controller.getDuration() - 1) {
                    that.seek(duration - 0.1);
                    return false;
                }
                if (
                    Math.round(currentTime * 100) !== Math.round(duration * 100) &&
                    duration === that.controller.getDuration() &&
                    currentTime !== 0
                ) {
                    that.seek(currentTime);
                    return false;
                }
            }
            // if (video.currentTime === 0 && !that.config.ad) {
            //     that.seek(0);
            //     return false;
            // }
            clearInterval(that.timerChecker!);
            if (that.videoContinueTime > 0) {
                that.videoContinueCurrentTime = duration;
                that.videoContinueCompareTime = +new Date();
                that._end_timer(duration);
                setTimeout(function () {
                    that.video.pause();
                }, 0);
                that.play();
            } else {
                that.controller.setState(STATE.V_COMPLETE);
            }
        });
        $(video).on('progress', function () {
            if (this.buffered != null) {
                that.controller.buffer(this.buffered, that.duration(), that.currentTime()!);
            }
            // buffer policy
            // http://info.bilibili.co/pages/viewpage.action?pageId=12877158
            const dynamicBufferArray = that.getDynamicBuffer();
            if (that.dashPlayer && that.dashPlayer['getStableBufferTime']() < dynamicBufferArray[4]) {
                if (
                    that.videoTime > dynamicBufferArray[3] &&
                    that.dashPlayer['getStableBufferTime']() < dynamicBufferArray[4]
                ) {
                    that.dashPlayer['setStableBufferTime'](dynamicBufferArray[4]);
                    that.dashPlayer['getCorePlayer']().setBufferToKeep(dynamicBufferArray[5]);
                } else if (
                    that.videoTime > dynamicBufferArray[1] &&
                    that.dashPlayer['getStableBufferTime']() < dynamicBufferArray[2]
                ) {
                    that.dashPlayer['setStableBufferTime'](dynamicBufferArray[2]);
                    that.dashPlayer['getCorePlayer']().setBufferToKeep(dynamicBufferArray[5]);
                }
            }
        });
        $(video).on('canplay', function () {
            if (!that.initialized) {
                // 带有贴片广告的视频会将loadingpanel面板移除放在贴片广告播放器初始化之后
                !that.config.preAd && that.loadingpanel.complete(3, true);
                that.controller.setState(STATE.V_READY);
                that.trigger(STATE.EVENT.VIDEO_MEDIA_CANPLAY);
                const tp = timeParser(that.config.t!);
                if (!tp && that.config.autoplay) {
                    that.controller.setState(STATE.V_PLAY);
                }
            } else {
                that.trigger(STATE.EVENT.VIDEO_MEDIA_CANPLAY);
            }
        });
        $(video).on('loadedmetadata', function () {
            if (!that.initialized) {
                // send loaded_time (but real loaded_time should be set in canplay event)
                that.bVideo.loadedCallback();
                that.trigger(STATE.EVENT.VIDEO_METADATA_LOADED);
                that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER);
                if (!that.adPlayer) {
                    that.trigger(STATE.EVENT.VIDEO_MEDIA_ENTER);
                }
            } else {
                that.trigger(STATE.EVENT.VIDEO_METADATA_LOADED);
                that.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER);
            }
            if (this.buffered != null) {
                that.controller.buffer(this.buffered, that.duration(), that.currentTime()!);
            }
        });
        $(video).on('error', function (e) {
            if (that.video === this) {
                // video removed but can fire error continuously ?!
                if (that.flvPlayer && that.flvPlayer['type'] === 'FlvPlayer') {
                    that.errorHandler.videoErrorHandler(
                        STATE.NETWORK_EXCEPTION,
                        '[NetworkError] Exception: 3111 Failed to fetch',
                    );
                } else {
                    const videoElement = document.createElement('video');
                    if (
                        that.mediaDataSource &&
                        that.mediaDataSource['backupURL'] &&
                        that.mediaDataSource['backupURL'].length > that.errorHandler.backupURLIndex
                    ) {
                        that.errorHandler.reloadBackupURL();
                    } else if (
                        videoElement &&
                        typeof videoElement['canPlayType'] === 'function' &&
                        videoElement['canPlayType']('video/mp4; codecs="avc1.42001E, mp4a.40.2"')
                    ) {
                        if (!that.dashPlayer) {
                            that.errorHandler.videoErrorHandler(
                                STATE.VIDEO_PLAY_ERROR,
                                '[NetworkError] Exception: 3104 Failed to fetch',
                            );
                        }
                    } else {
                        that.errorHandler.videoErrorHandler(
                            STATE.VIDEO_PLAY_ERROR,
                            '[MediaError] Exception: Unsupported codecs, Please install H.264 codec in your system.',
                        );
                    }
                }
            }
        });
        $(video).on('ratechange', function (e) {
            that.danmaku && that.danmaku.option && that.danmaku.option('videospeed', video['playbackRate'] || 1);
            that.advDanmaku &&
                that.advDanmaku.option &&
                that.advDanmaku.option('videospeed', video['playbackRate'] || 1);
            // that.setting && that.setting.getItem('videospeed').value(video['playbackRate'] || 1);
        });
        // chrome 监听video是否真正进入/退出画中画
        $(video).on('leavepictureinpicture', () => {
            that.controller.pipButton.container.addClass('closed');
            // this.danmakuSetting && this.danmakuSetting.dMaskInInlineMode(true);
        });
        $(video).on('enterpictureinpicture', () => {
            // this.danmakuSetting && this.danmakuSetting.dMaskInInlineMode(false);
        });
        // safari 监听当前播放模式的变化
        $(video).on('webkitpresentationmodechanged', () => {
            if (video['webkitPresentationMode'] === 'inline') {
                that.controller.pipButton.container.addClass('closed');
                // this.danmakuSetting && this.danmakuSetting.dMaskInInlineMode(true);
            } else if (video['webkitPresentationMode'] === 'picture-in-picture') {
                // this.danmakuSetting && this.danmakuSetting.dMaskInInlineMode(false);
            }
        });
        this.requestFrameTime(video);

        this.trigger(STATE.EVENT.VIDEO_MEDIA_ATTACHED);
    }

    private requestFrameTime(video: HTMLVideoElement) {
        if (this.video === video) {
            const currentTime = this.currentTime(video, true);
            if (!video.paused && currentTime !== this.videoTime && currentTime) {
                this.videoTime = currentTime;
                this.trigger(STATE.EVENT.VIDEO_MEDIA_FRAME);
            }
            requestAnimationFrame(() => {
                this.requestFrameTime(video);
            });
        }
    }

    private _end_timer(time: number) {
        const that = this;
        if (this.duration()! >= time) {
            clearTimeout(this.videoContinueTimeChecker);
            this.videoContinueTimeChecker = <any>setTimeout(function () {
                that.videoContinueCurrentTime = that.currentTime()!;
                that.controller.setState(STATE.V_COMPLETE);
            }, (this.duration()! - time) * 1000);
        }
    }

    transformQuality<T extends {
        bp?: boolean; quality?: number; acceptQuality?: number[]; abtid?: string
    }>(result: T): T {
        if (result) {
            if (result.quality) {
                result.quality = qualityMap(result.quality) || result.quality;
            }
            if (Array.isArray(result.acceptQuality)) {
                result.acceptQuality = result.acceptQuality.map((q: number) => qualityMap(q) || q);
            }
            this.setQualityGraySymbol(result.abtid!);
        }
        return result;
    }

    private setQualityGraySymbol(abtid: string) {
        this.abtid = abtid;
    }

    private initRangePlayParam() {
        if (this.video) {
            const playerDuration = this.duration()!;
            const videoDuration = this.duration(this.video, true)!;
            if (!this.config.s_from && !this.config.s_to) {
                this.rangePlay.isEnable = false;
            } else if (typeof this.config.s_from === 'number' || typeof this.config.s_to === 'number') {
                if (isNaN(this.config.s_from!)) {
                    this.config.s_from = 0;
                }
                if (isNaN(this.config.s_to!)) {
                    this.config.s_to = playerDuration;
                }
                if (this.config.s_from! > this.config.s_to!) {
                    const temp = this.config.s_from;
                    this.config.s_from = this.config.s_to;
                    this.config.s_to = temp;
                }
                if (
                    this.config.s_to! - this.config.s_from! < 1 ||
                    (this.config.s_from! <= 0 && this.config.s_to! >= videoDuration)
                ) {
                    this.rangePlay.isEnable = false;
                } else {
                    if (this.config.s_from! < 0) {
                        this.config.s_from = 0;
                    }
                    if (this.config.s_to! > videoDuration) {
                        this.config.s_to = playerDuration;
                    }
                    this.rangePlay.isEnable = true;
                    this.rangePlay.s_from = this.config.s_from;
                    this.rangePlay.s_to = this.config.s_to;
                    this.rangePlay.endPause = false;
                }
            }
        }
    }

    private checkRangeSeek(time: number) {
        if (this.rangePlay.isEnable) {
            if (time < this.rangePlay.s_from! || time > this.rangePlay.s_to!) {
                this.rangePlay.isEnable = false;
                this.toast.addTopHinter('您已离开剪影区间，恢复正常播放', 4000);
            } else {
                if (this.rangePlay.endPause) {
                    this.rangePlay.endPause = false;
                }
            }
        }
    }

    isSvipQuality(quality: number): boolean {
        return quality === 112 || quality === 116 || quality === 120 || quality === 125 || quality === 126 || quality === 127;
    }
    // getDynamicBuffer() {
    //     if (this.isSvipQuality(this.videoRealQuality)) {
    //         return [30, 5, 45, 20, 60, 80];
    //     } else {
    //         return [30, 5, 50, 20, 80, 100];
    //     }
    // }

    getDynamicBuffer() {
        const session = this.session;

        // buffer policy
        const groupArray = [
            [
                20, // 初始 buffer 长度
                5, // 变更 buffer 时间(s)
                40, // 中间 buffer 长度
                20, // 变更 buffer 时间(s)
                60, // 最终 buffer 长度
                20, // 向前保留长度
            ],
            // 4K 用 buffer 长度
            [20, 5, 21, 20, 22, 10],
            // 灰度闲时buffer
            [60, 5, 60, 20, 60, 20],
            // 白名单 buffer 1
            [60, 5, 60, 20, 60, 20],
            // 白名单 buffer 2
            [40, 5, 50, 20, 60, 20],
        ];
        let dynamicBufferArray = groupArray[0];
        if (this.videoRealQuality === 120) {
            dynamicBufferArray = groupArray[1];
        } else if (this.getPlayerIdle() === 'eg') {
            dynamicBufferArray = groupArray[2];
        } else if (this.getPlayerUserWhite() === 'eg1') {
            dynamicBufferArray = groupArray[3];
        } else if (this.getPlayerUserWhite() === 'eg2') {
            dynamicBufferArray = groupArray[4];
        }
        return dynamicBufferArray;
    }

    getPlayerIdle(): string {
        if (this.getPlayurl() && Number(getSearchParam('agrr', this.getPlayurl())) > 0) {
            if (this.session && parseInt(this.session[0], 16) < 8) {
                return 'eg';
            } else {
                return 'cg';
            }
        } else {
            return '';
        }
    }

    getPlayerUserWhite(): string {
        if (this.getPlayurl() && Number(getSearchParam('uagrr', this.getPlayurl())) > 0) {
            const uagrr = Number(getSearchParam('uagrr', this.getPlayurl()));
            if (uagrr === 1) {
                return 'eg1';
            } else if (uagrr === 2) {
                return 'eg2';
            } else if (uagrr === 3) {
                return 'cg';
            } else {
                return '';
            }
        } else {
            return '';
        }
    }

    reloadPlayurl() {
        const that = this;
        return new Promise((resolve, reject) => {
            const resolveParams: any = {
                domain:
                    that.config.seasonType >= 1
                        ? Resolve.domains.bangumi
                        : that.config.playerType === 1
                            ? Resolve.domains.bangumiS
                            : Resolve.domains.interface,
                enableSSLResolve: that.config.enableSSLResolve,
                enableSSLStream: that.config.enableSSLStream,
                cid: that.config.cid,
                episodeId: that.config.episodeId,
                quality: that.videoQuality,
                type: that.allowFlv ? '' : 'mp4',
                requestFromInit: true,
                extra_params: that.config.extraParams,
                player: that,
            };

            if (resolveParams.extra_params) {
                resolveParams.extra_params += `&qn=${resolveParams.quality}`;
            } else {
                resolveParams.extra_params = `qn=${resolveParams.quality}`;
            }
            if (that.config.seasonType) {
                if (!getSearchParam('season_type', `?${resolveParams.extra_params}`)) {
                    resolveParams.extra_params += `&season_type=${that.config.seasonType}`;
                }
            }
            let fnval = this.getFnval();
            // only UGC and MSE supported browser can use dashplayer
            resolveParams.fnver = 0;
            resolveParams.fnval = fnval;
            resolveParams.session = that.session;
            if (resolveParams.extra_params) {
                resolveParams.extra_params += `&fnver=0&fnval=${fnval}`;
            } else {
                resolveParams.extra_params = `fnver=0&fnval=${fnval}`;
            }
            Resolve.r(
                resolveParams,
                (result: any) => {
                    result = that.transformQuality(result);
                    if (result !== undefined && result.mediaDataSource !== null && result.mediaDataSource['url']) {
                        resolve(result);
                    } else {
                        reject(result);
                    }
                },
                (err: any) => {
                    reject(err);
                },
            );
        });
    }

    updateSource(from: string) {
        return new Promise((resolve: (value?: any) => void, reject) => {
            if (this.dashPlayer && typeof this.dashPlayer.updateSource === 'function') {
                this.reloadPlayurl()
                    .then((result: any) => {
                        if (this.dashPlayer && this.dashPlayer.updateSource) {
                            this.dashPlayer
                                .updateSource(result.mediaDataSource['url'])
                                .then((res: any) => {
                                    resolve();
                                })
                                .catch((err: any) => {
                                    // fallback to flvPlayer
                                    const errMsg = err.msg;
                                    reject(errMsg);
                                });
                        } else {
                            reject('no dashplayer updateSource');
                        }
                    })
                    .catch(() => {
                        reject('load playurl failed');
                    });
            } else {
                reject('no dashplayer');
            }
        });
    }

    loadLab(index: number, params?: any) {
        Lab.loadByLabIndex(this, index, params);
    }

    biliMessage(data: string) {
        let info;
        try {
            info = JSON.parse(data);
        } catch (error) {
            info = {};
        }
        switch (info['type']) {
            case 'login':
                if (this.user && info['value'] !== this.user.status().login) {
                    this.user.reload();
                }
                break;
            default:
                break;
        }
    }

    updatePageList() {
        this.initPartmanager().updateList();
    }
    // ogv更新数据
    ogvUpdate(type: number | string, obj?: any) {
        this.extraParams = rebuildPlayerExtraParams(this);
        switch (type) {
            case ContentType.ogvFollowers:
            case ActionType.followers:
                if (obj?.num >= 0) {
                    this.controller.showFollowerNum(obj.num);
                }
                break;
            case ContentType.OgvPageList:
            case ActionType.pageList:
                this.initPartmanager().getFromPage();
                break;
            case ContentType.OgvExtraParams:
            case ActionType.extra:
                // 进度控制条太挤了，暂时不添加片头片尾跳过功能
                // const headTail = this.extraParams?.headTail;
                // if (headTail?.hasData) {
                //     this.controller.progressBar.newSkip(headTail);
                // }
                // if (headTail?.hasSkip) {
                //     this.controller.settingButton.initSkipHeadTail();
                // }
                break;

            default:
                break;
        }
    }

    // private canPlayerRecommend() {
    //     let canPlayRecommend;
    //     if (this.interactive) {
    //         if (this.interactiveVideoConfig?.interactiveLastPart) {
    //             canPlayRecommend = true;
    //         } else {
    //             canPlayRecommend = false;
    //         }
    //     } else {
    //         if (this.state.repeat) {
    //             canPlayRecommend = false;
    //         } else {
    //             canPlayRecommend = true;
    //         }
    //     }
    //     return canPlayRecommend;
    // }

    getPlayerState(data?: any) {
        if (data?.screen) {
            return screenshot({
                dom: this.video,
                ...data?.screen,
            });
        }
        return {
            controller: {
                show: this.template && this.template.controllerShow,
            },
            danmaku: {
                show: this.state.danmaku,
            },
            gamePlayer: this.config.gamePlayer,
            videoInfo: {
                videoHeight: this.video.videoHeight || 1,
                videoWidth: this.video.videoWidth || 1,
            },
            repeat: this.state.repeat,
            pipMode: !!(
                document['pictureInPictureElement'] ||
                (this.video && this.video['webkitPresentationMode'] === 'picture-in-picture')
            ),
            webFullScreen: this.state.mode === STATE.UI_WEB_FULL,
            fullScreen: this.state.mode === STATE.UI_FULL,
            // playerType: this.controller?.settingButton?.playerType?.value(),
            lightOn: this.controller?.isLightOn(),
            colorEffect: this.danmaku?.exportColorEffect(),
            audioEffect: this.allPlugins?.exportAudioEffect(),
            shortcut: {
                show: this.danmaku?.isHotKeyPanelOpened(),
            },
            // canPlayRecommend: this.canPlayerRecommend(),
            realTime: this.track?.getRealTime() || 0,
        };
    }
    setPlayerState(key: string, value: any) {
        switch (key) {
            case 'danmaku':
                // this.send?.emitDmSwitch(value);
                break;
            case 'hasCoupon':
                this.userLoadedCallback(() => {
                    if (this.config.type === ContentType.Pugv) {
                        const status = this.user.status();
                        this.outerInfo[key] = value;
                        if (status.pugv_watch_status !== 2 && status.pugv_pay_status === 2) {
                            this.controller?.addVideoHint();
                        }
                    }
                });
                break;
            default:
                break;
        }
    }
    noAuxiliary() {
        this.container.addClass(`${this.prefix}-no-auxiliary`);
        // this.danmakuSetting && this.danmakuSetting.optionsHeightUpdate(330);
    }

    getVideoMessage() {
        return {
            aid: this.config.aid,
            cid: this.config.cid,
            bvid: this.config.bvid,
            videoInfo: this.danmaku && this.danmaku.getVideoDetails(),
            /**
             * @beta
             */
            testLog: Log.filter({ version: `${METADATA.version}-${METADATA.revision}` }),
        };
    }

    // 强制上报反馈日志，临时抽样用
    forceReportFeedback() {
        // 取样万分之一
        if (
            this.forceReportSymbol ||
            (Math.random() > 0.0001 && md5(getCookie('buvid3')) !== '82efa98e6c2c2ca17233b21fd9241339')
        ) {
            return true;
        } else {
            this.forceReportSymbol = true;
        }
        let data = {
            content: 'ForceReport',
            aid: this.config.aid,
            bvid: this.config.bvid,
            tag_id: 307,
            browser: window.navigator.userAgent,
            version: 'ForceReport',
            jsonp: 'jsonp',
            other: JSON.stringify({
                progress: this.currentTime(),
                cid: this.config.cid,
                playurl: this.getPlayurl(),
                video_info: this.getVideoMessage().videoInfo,
                test_log: this.getVideoMessage().testLog,
                event_log: window.eventLogText || [],
                speed: 0,
                speedDetails: '',
                dashDetails: this.dashPlayer?.getLogHistory()?.log
                    ? this.dashPlayer?.getLogHistory()?.log.split('\n')
                    : undefined,
            }),
        };
        $.ajax({
            url: URLS.FEEDBACK,
            type: 'post',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
        });
    }

    premiereSeekSync() {
        const that = this;
        const syncRequest = function () {
            clearTimeout(that.premiereSyncTimer);
            that.premiereSyncTimer = 0;
            if (!that.config.isPremiere || isNaN(that.config.episodeId)) return;
            if (that.video && !that.checkPlayEnded()) {
                that.syncEnable = false;
                that.template.playerArea.addClass('video-state-buff');
                new ApiPremiereStatus(<ApiPremiereStatusInData>{
                    episodeId: that.config.episodeId,
                }).getData({
                    success: (result: ApiPremiereStatusOutData) => {
                        const progress = result.data.progress;
                        if (progress >= 0) {
                            const delayTime = result.data.delay_time;
                            that.seek((progress - delayTime) / 1000);
                        } else {
                            that.syncEnable = true;
                        }
                        that.template.playerArea.removeClass('video-state-buff');
                    },
                    error: (result: JQuery.jqXHR<any>) => {
                        that.premiereSyncTimer = window.setTimeout(function () {
                            syncRequest();
                        }, 1000);
                    },
                });
            }
        };
        if (this.syncEnable) {
            syncRequest();
        }
    }

    checkPlayEnded() {
        if (this.video) {
            const duration = this.duration(this.video, true)!;
            const ended = this.videoContinueTime ? false : this.video.ended;
            if (
                (this.currentTime() === duration + this.videoContinueTime || ended) &&
                this.controller.getLastState() !== STATE.V_COMPLETE
            ) {
                return true;
            } else {
                return false;
            }
        } else {
            return undefined;
        }
    }

    // 首播开始toast提示，供页面调用
    premiereToast(partInfo: any) {
        if (typeof partInfo !== 'undefined') {
            const title = partInfo.title || '首播 首映会已开始';
            const text = `<span>${title}</span>`;
            this.toast &&
                this.toast.addBottomHinter({
                    timeout: 10000,
                    closeButton: true,
                    text: text,
                    jump: '前往查看',
                    jumpFunc: () => {
                        this.reloadMedia && this.reloadMedia.cidLoader(partInfo);
                    },
                });
        }
    }

    // 判断首播EP状态
    checkPremiereStatus() {
        if (this.config.isPremiere) {
            if (typeof this.window['getPremiereStatus'] === 'function') {
                return this.window['getPremiereStatus']()['after_premiere_type'];
            }
        }
        return false;
    }
    // todo: delete
    updateGuideAttention(list: string, dragable: boolean) {
        try {
            let val: IPoputBodyInterface[] = JSON.parse(list);
            this.popup && this.popup.setDragable(dragable);
            this.popup && this.popup.update(val);
        } catch (e) {
            console.warn(e);
        }
    }
    // todo: delete
    updateAdvDm(list: string, dragable: boolean) {
        try {
            let val: any[] = JSON.parse(list);
            let link = [];
            let combo = null;
            for (let i = 0; i < val.length; i++) {
                switch (val[i].type) {
                    case 2:
                        link.push(val[i]);
                        break;
                    case 4:
                        combo = val[i];
                        break;
                    default:
                        break;
                }
            }
            this.allPlugins?.updateLink(link);
            // this.allPlugins?.updateCombo(combo);
        } catch (e) {
            console.warn(e);
        }
    }
    // 创作中心设置
    editorCenter(info: string, dragable: boolean) {
        try {
            const data: any = JSON.parse(info);
            if (!data) return;
            for (const key in data) {
                switch (key) {
                    case 'dm2':
                        this.allPlugins?.updateLink(data[key]);
                        break;
                    case 'dm8':
                        this.allPlugins?.startCombo(data[key]);
                        break;
                    case 'dm10':
                        this.allPlugins?.updateReserve(data[key]);
                        break;
                    case 'dm5':
                        this.popup?.setDragable(dragable);
                        this.popup?.update(data[key]);
                        break;
                    case 'dm11':
                        const [scoreList, scoreSummaryList] = [
                            data[key].filter((d: any) => !d.data.summary),
                            data[key].filter((d: any) => d.data.summary),
                        ];
                        this.allPlugins?.updateScoreDM(scoreList);
                        this.allPlugins?.updateScoreSummary(scoreSummaryList);
                        break;
                    case 'dm14':
                        this.allPlugins?.updateClockIn(data[key]);
                        break;
                    default:
                        break;
                }
            }
        } catch (e) {
            console.warn(e);
        }
    }
    outActions(obj: any) {
        if (typeof obj?.dmSwitch !== 'undefined') {
            // 更新弹幕状态，(因为弹幕接口有缓存，建议外部状态改变后，250-300ms,再调用此方法更新播放器状态)
            this.danmaku?.loadPb?.loadViewSend();
        }
    }

    private cacheVideoElement() {
        const div = Player.aside || document.createElement('div');
        div.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; opacity: 0; overflow: hidden';
        if (!div.parentElement) {
            document.body.appendChild(div);
        }
        div.appendChild(this.video);
        Player.aside = div;
        Player.video = this.video;
    }
}

export default Player;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        dashPlayer?: DashPlayer;
        showToast?: (v: number) => void;
        __LIVEPLAYER_MODE__?: number;
        typeid?: number;
        playlistNextPage?: Function;
        getPremiereStatus?: Function;
        auxiliary: PlayerAuxiliary;
    }
    interface HTMLVideoElement {
        webkitPresentationMode?: 'inline' | 'picture-in-picture';
    }
}