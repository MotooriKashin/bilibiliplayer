import STATE from './state';
import SessionController from './session-controller';
import StartButton from './controller/start-button';
import NextButton from './controller/next-button';
import TimeLabel from './controller/time-label';
import VolumeBar from './controller/volume-bar';
import AutoPlay from './controller/auto-button';
import PipButton from './controller/pip-button';
import Quality from './controller/quality';
import ScreenButton from './controller/screen-button';
import SpeedList from './controller/speed-list';
import SubtitleButton from './controller/subtitle-button';
import FollowerNum from './controller/follower-num';
import Player from '../player';
import EndingPanel from './ending-panel';
import ElectricPanel from './electric-panel';
import { ContentType } from '@jsc/namespace';
import { IPartsInfo } from './part-manager';
import Hammer from 'hammerjs';
import { browser, Deferred, fmSeconds, focusInput, getLocalSettings, qualityMap, setLocalSettings, timeParser } from '@shared/utils';
import SyncButton from './controller/sync-button';
import { VI_DATA_INIT } from '../const/player-directive';
import PlayLagDetection from './controller/playlag-detection';
import URLS from '../io/urls';
import { DanmakuSettingLite } from './controller/danmaku-setting-lite';
import { RepeatButton } from './controller/repeat-button';
import { ProgressBar } from './controller/progress-bar';
import { BILIBILI_PLAYER_SETTINGS } from './settings';
import DolbyButton from './controller/dolby-button';
import { HiResButton } from './controller/hires-button';
import { IUserStatusInterface } from './user';
import ViewPointList from './controller/viewpoint';

interface IToastMsg {
    text: string;
    class: string;
    tip: string;
}

interface IKeydownStatus {
    [key: number]: boolean;
}

class Controller {
    player: Player;
    container: JQuery;
    startButton!: StartButton;
    progressBar!: ProgressBar;
    timeLabel!: TimeLabel;
    volumeBar!: VolumeBar;
    followerNum!: FollowerNum;
    pipButton!: PipButton;
    quality!: Quality;
    autoButton!: AutoPlay;
    screenButton!: ScreenButton;
    speedList!: SpeedList;
    subtitleButton!: SubtitleButton;
    syncButton!: SyncButton | null;
    nextButton!: NextButton;
    lastWidth!: number;
    lastHeight!: number;
    loadlagTimer5s!: number;
    playLagTimer5s!: number;
    private lagSpeedShowTimer!: number;
    private lagSpeedUpdateTimer!: number;
    private speedReported = false;
    private abnormalSpeedLimit = 10240; // 卡顿连续两秒下载字节 > 10MB 时，主动上报一次日志
    readonly prefix: string;
    private currentRatioClass = 'video-size-default';
    private hintClickRemoved = false;
    private bufferRanges: any[] = [];
    private TPL = '';
    private lagLastSeekTime = -1;
    private containerFocus: boolean;
    private seekTime!: number;
    private lastSeekTime?: number;
    private lastState!: number;
    private loadlagTimer!: number;
    private updateDurationMark!: boolean;
    private mouseTimeout!: number;
    private controllerTimeout!: number;
    private toastShowTimes: number = 2;
    private toastShowBetween: boolean = false;
    private isPugv: boolean = false;
    private relayMode!: number;
    private lowerQualitySelfRemoved = false;
    private boceGuideToastShow: boolean = false;
    private playLagDetection!: PlayLagDetection;
    private deferred!: Deferred<void>;
    private notAllowAutoplayShowed: boolean = false;
    preloadAjax: any;
    // private dragMask!: DragMask;
    private payHinter: any;
    noKeyDowm!: boolean;
    bufferLoad: any = {
        lagTimes: [],
        netTimes: [],
        playLagTimes: [],
    };
    private panoramicFocus = false;
    danmakuLite!: DanmakuSettingLite;
    repeat!: RepeatButton;
    private keydownStatus: IKeydownStatus = {};
    panoramicShortcut = false; // 优先全景视频快捷键（WD）
    config: BILIBILI_PLAYER_SETTINGS;
    dolbyButton?: DolbyButton;
    hiresButton?: HiResButton;
    viewPointList?: ViewPointList;
    constructor(player: Player) {
        this.player = player;
        this.prefix = this.player.prefix;
        this.container = this.player.template.controller;
        this.config = this.player.videoSettings;
        if (player.keepFocus) {
            this.containerFocus = true;
            player.keepFocus = false;
        } else {
            this.containerFocus = false;
        }
        this.init();
        this.globalEvents();
    }

    private globalEvents() {
        const player = this.player;
        player.bind(STATE.EVENT.VIDEO_DESTROY, (e: Event) => {
            this._destroy();
        });
        player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
            if (!player.extraParams && player.videoData.isPreview) {
                this.getEndingPanel()?.show();
            }
        });
        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            // TODO： 之后lag_end_load与seek_end_load区分清楚后，需要开启
            this.bufferLoad.lagTimes = []; // 防止频繁 seek 触发卡顿提示
        });
        if (!this.canResolveDeferred()) {
            player.one(STATE.EVENT.VIDEO_MEDIA_PLAY, () => {
                this.deferred && this.deferred.resolve();
            });
        }
    }

    private canResolveDeferred() {
        if (this.player.config.autoplay) {
            return true;
        }
        if (this.player.video && !this.player.video.paused) {
            return true;
        }
        return false;
    }

    private init() {
        this.bind();
        SessionController.removeSession();
        this.isPugv = this.player.config.type === ContentType.Pugv;
        this.lastWidth = 0;
        this.lastHeight = 0;
        this.startButton = new StartButton(this);
        this.progressBar = new ProgressBar(this);
        this.timeLabel = new TimeLabel(this);
        this.volumeBar = new VolumeBar(this);
        this.createDolbyButton();
        this.createHiResButton();
        this.quality = new Quality(this);

        this.subtitleButton = new SubtitleButton(this);
        this.danmakuLite = new DanmakuSettingLite(this);
        this.repeat = new RepeatButton(this);

        this.screenButton = new ScreenButton(this);
        this.createNextBtn();
        // this.dragMask = new DragMask(this);

        this.setActionHandler();

        this.player.userLoadedCallback((userStatus: IUserStatusInterface) => {
            if (userStatus.view_points && userStatus.view_points.length !== 0) {
                if (!this.viewPointList) {
                    this.viewPointList = new ViewPointList(this.player, userStatus.view_points);
                }
            }
        });
    }
    setActionHandler() {
        navigator.mediaSession.setActionHandler('play', () => this.player.play());
        navigator.mediaSession.setActionHandler('pause', () => this.player.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => this.player.seek(this.player.currentTime()! - 10));
        navigator.mediaSession.setActionHandler('seekforward', () => this.player.seek(this.player.currentTime()! + 10));
        navigator.mediaSession.setActionHandler('previoustrack', () => this.player.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.player.next());
    }
    // playurl有下发杜比音效字段（且设备能支持）时，创建杜比音效开关
    createDolbyButton() {
        if (this.player.dolbyEffectType && !this.dolbyButton) {
            this.dolbyButton = new DolbyButton(this);
        }
    }
    // playurl有下发无损音效字段（且设备能支持）时，创建杜比音效开关
    createHiResButton() {
        if (this.player.audioHiRes && !this.hiresButton) {
            this.hiresButton = new HiResButton(this);
        }
    }
    showFollowerNum(num: number) {
        if (this.followerNum) return;
        this.followerNum = new FollowerNum(this, num);
    }

    createNextBtn() {
        if (this.nextButton) {
            if (this.nextButton.disabled) {
                this.nextButton.enable();
            }
        }
        if (!this.nextButton) {
            if (this.player.playlistNoView) {
                this.nextButton = new NextButton(this);
            } else if (this.player.playlist) {
                this.nextButton = new NextButton(this);
            } else if (this.player.config.seasonType > 0) {
                // PGC
                if (!this.nextButton && this.player.config.hasNext) {
                    this.nextButton = new NextButton(this);
                }
            } else {
                // UGC
                this.player.userLoadedCallback(status => {
                    if (!this.nextButton) {
                        if (this.isPugv) {
                            this.player.partmanager!.findNextP((data: IPartsInfo) => {
                                if (data.aid || data.bvid) {
                                    this.nextButton = new NextButton(this);
                                }
                            });
                        } else {
                            if (this.player.config.hasNext && !this.player.interactive) {
                                this.nextButton = new NextButton(this);
                            }
                        }
                    }
                });
            }
        }
    }

    private _isLightOn() {
        const id = `#heimu`;
        try {
            if (this.player.$body.find(id).length < 1 || this.player.$body.find(id).is(':hidden')) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return true;
        }
    }

    private _turnLight(state: string) {
        const sourcePlayer = this.player.config.sourcePlayer || this.player;
        const template = sourcePlayer.template;
        const player = this.player;
        const that = this;
        switch (state) {
            // 'off' -> 关灯(添加黑幕) 'on' -> 开灯(移除黑幕)
            case 'off':
                template.container.addClass('mode-light-off');
                player.bVideo.heimu(9, 1);
                // page style
                if (player.iframe) {
                    $(player.iframe).parent().addClass('heimu');
                }
                break;
            case 'on':
                template.container.removeClass('mode-light-off');
                player.bVideo.heimu(9, 0);
                // page style
                if (player.iframe) {
                    $(player.iframe).parent().removeClass('heimu');
                }
                break;
        }
    }

    private _setVideoSize() {
        const template = this.player.template;
        const tvW = template.videoWrp.width()!;
        const tvH = template.videoWrp.height()!;
        let width = '';
        let height = '';
        let padding = '';
        if (template.videoWrp.hasClass('video-size-4-3')) {
            if (tvW / 4 > tvH / 3) {
                width = (((tvH / 3) * 4) / tvW) * 100 + '%';
                height = '100%';
                padding = '0 ' + (tvW / 2 - (2 * tvH) / 3) + 'px';
            } else {
                width = '100%';
                height = (((tvW / 4) * 3) / tvH) * 100 + '%';
                padding = ((1 - ((tvW / 4) * 3) / tvH) / 2) * template.videoWrp.height()! + 'px 0';
            }
        } else if (template.videoWrp.hasClass('video-size-16-9')) {
            if (tvW / 16 > tvH / 9) {
                width = (((tvH / 9) * 16) / tvW) * 100 + '%';
                height = '100%';
                padding = '0 ' + (tvW / 2 - (8 * tvH) / 9) + 'px';
            } else {
                width = '100%';
                height = (((tvW / 16) * 9) / tvH) * 100 + '%';
                padding = ((1 - ((tvW / 16) * 9) / tvH) / 2) * template.videoWrp.height()! + 'px 0';
            }
        }
        template.videoWrp.find('video').css({ width: width, height: height, padding: padding });
        template.videoWrp.find(`.${this.prefix}-video-poster`)?.css({ width: width, height: height, padding: padding });
    }

    private bind() {
        const that = this;
        const player = this.player;
        const prefix = player.prefix;
        const template = this.player.template;
        let timer = -1;
        let timers = -1;
        let width = 0;
        let height = 0;
        let hasMini = false;
        let outerW = 0;
        let outerH = 0;
        player.bind(STATE.EVENT.VIDEO_RESIZE, (event: Event, mode: number, scroll: boolean) => {
            this._resize(mode);
            this._setVideoSize();

            if (template.container.width()! >= 1160) {
                player.template.playerWrap.addClass(`${prefix}-video-wrap-plus`);
            } else {
                player.template.playerWrap.removeClass(`${prefix}-video-wrap-plus`);
            }
        });
        $(window)
            .unbind(`resize${player.config.namespace}`)
            .bind(`resize${player.config.namespace}`, () => {
                setTimeout(() => {
                    player.trigger(STATE.EVENT.VIDEO_RESIZE, player.state.mode);
                });
                clearTimeout(timer);
                timer = window.setTimeout(() => {
                    width = player.template && player.template.playerWrap.width()!;
                    height = player.template && player.template.playerWrap.height()!;
                    if (that.lastWidth !== width || that.lastHeight !== height) {
                        that.lastWidth = width;
                        that.lastHeight = height;
                        player.trigger(STATE.EVENT.VIDEO_PLAYER_RESIZE);
                    }
                }, 50);
            });
        // float compatible
        $(window)
            .unbind(`scroll${player.config.namespace}`)
            .bind(`scroll${player.config.namespace}`, () => {
                clearTimeout(timers);
                player.trigger(STATE.EVENT.VIDEO_SCROLL);
                timers = window.setTimeout(() => {
                    hasMini = template.container.hasClass('mode-miniscreen');
                    outerW = template.container.outerWidth()!;
                    outerH = template.container.outerHeight()!;
                    if (((outerW < 480 || outerH < 360) && !hasMini) || (outerW > 480 && outerH > 360 && hasMini)) {
                        player.trigger(STATE.EVENT.VIDEO_RESIZE, hasMini ? this.relayMode : STATE.UI_MINI, true);
                        player.trigger(STATE.EVENT.VIDEO_PLAYER_RESIZE, hasMini ? this.relayMode : STATE.UI_MINI, true);
                        player.danmaku && player.danmaku.resize(true);
                    }
                }, 0);
            });

        player.bind(STATE.EVENT.VIDEO_SCROLL, () => {
            $('.player-tooltips[data-tooltip-name="controll-tooltip"]').remove();
        });

        player.$window
            .off(`mousemove${player.config.namespace}move`)
            .on(<any>`mousemove${player.config.namespace}move`, (e: JQuery.MouseEventBase) => {
                player.trigger(STATE.EVENT.VIDEO_MOUSEMOVE, e);
            });

        this.container.off(`mousemove${player.config.namespace}move`)
            .on(<any>`mousemove${player.config.namespace}move`, (e: JQuery.MouseEventBase) => {
                player.template.csIn(true);
            });

        this.container.off(`mouseleave${player.config.namespace}move`)
            .on(<any>`mouseleave${player.config.namespace}move`, (e: JQuery.MouseEventBase) => {
                player.trigger(STATE.EVENT.VIDEO_MOUSEMOVE, e);
                player.template.csIn(false);
            });

        player.$window
            .off(`click${player.config.namespace}`)
            .on(<any>`click${player.config.namespace}`, (e: JQuery.ClickEvent) => {
                if (
                    $(e.target).is(template.playerWrap) ||
                    $(e.target).is(template.controller) ||
                    template.container.find(e.target).length === 1 ||
                    template.playerWrap.find(e.target).length === 1 ||
                    template.sendbar.find(e.target).length === 1 ||
                    template.controller.find(e.target).length === 1
                ) {
                    this.containerFocus = true;
                } else {
                    this.containerFocus = false;
                }
                if (
                    $(e.target).is($(`.${prefix}-sphere-control`)) ||
                    $(e.target).parents(`.${player.prefix}-sphere-control`).length === 1
                ) {
                    this.panoramicFocus = true;
                    $(`.${prefix}-sphere-control`).addClass('webgl-dragging');
                } else {
                    this.panoramicFocus = false;
                    $(`.${prefix}-sphere-control`).removeClass('webgl-dragging');
                }
            });

        let coolTime = +new Date();
        const hasKeydown = player.config.type !== ContentType.PugvCenter;
        hasKeydown &&
            player.$window.off(`keydown${player.config.namespace}`).on(`keydown${player.config.namespace}`, (e) => {
                if (focusInput() || this.noKeyDowm) return;

                if (e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) {
                    return;
                }

                if (e && e.keyCode) {
                    const code = e.keyCode;
                    if (code === 27) {
                        this.screenToLast();
                        return true;
                    }

                    if (player.danmaku && player.danmaku.contextmenu && !player.danmaku.contextmenu.isHidden()) {
                        if (code === 37 || code === 100) {
                            player.danmaku.contextmenu.shiftHover('left');
                            return false;
                        } else if (code === 39 || code === 102) {
                            player.danmaku.contextmenu.shiftHover('right');
                            return false;
                        } else if (code === 38 || code === 104) {
                            player.danmaku.contextmenu.shiftHover('up');
                            return false;
                        } else if (code === 40 || code === 98) {
                            player.danmaku.contextmenu.shiftHover('down');
                            return false;
                        } else if (code === 13 || code === 108) {
                            player.danmaku.contextmenu.triggerHover();
                            return false;
                        } else if (code === 32) {
                            return false;
                        }
                    } else if (this.containerFocus && player.initialized && player.video) {
                        if (+new Date() - coolTime < 10) {
                            return true;
                        } else {
                            coolTime = +new Date();
                        }
                        if (code === 38 || code === 104) {
                            if (!this.panoramicFocus) {
                                this.volumeBar.volume(
                                    Math.min(Math.round(player.video.volume * 100 + 10) / 100, 1),
                                    true,
                                );
                            }
                            // that.volume(player.video.volume + 0.1);
                            return false;
                        } else if (code === 40 || code === 98) {
                            if (!this.panoramicFocus) {
                                this.volumeBar.volume(
                                    Math.max(Math.round(player.video.volume * 100 - 10) / 100, 0),
                                    true,
                                );
                            }
                            // that.volume(player.video.volume - 0.1);
                            return false;
                        } else if (code === 13) {
                            // enter: focus danmaku text
                            if (player.send.template.input.is(':focus')) {
                                player.send.template.input.blur();
                            } else {
                                player.send.template.input.focus();
                            }
                        }
                    }

                    //全局监听空格/→/←/F/]/[/D/M键

                    if (code === 32) {
                        // 空格键 play/pause
                        if (!this.keydownStatus[code]) {
                            this.keydownStatus[code] = true;
                            if (document.activeElement!.className === `${prefix}-video-danmaku-input`) {
                                return;
                            }
                            if (player.config.isPremiere && player.checkPlayEnded()) {
                                if (Number(player.checkPremiereStatus()) === 1) {
                                    return false;
                                }
                                this.premiereToNormalStyle();
                            }
                            if (this.lastState === STATE.V_PLAY) {
                                player.pause();
                            } else {
                                player.play();
                            }
                        }
                        return false;
                    } else if (code === 37 || code === 100) {
                        // 【←】键 seek backward
                        this.seekFromArrowLeft(true);
                        return false;
                    } else if ((code === 39 || code === 102) && player.currentTime() !== player.duration()) {
                        /**
                         * 【→】键 seek forward
                         */
                        this.seekFromArrowRight(true);
                        // player.seek(player.currentTime()! + 5);
                        return false;
                    } else if (code === 70) {
                        // F: full screen
                        this.screenButton.fullscreenClickHandle();
                    } else if (code === 219) {
                        // [: prev
                        player.prev();
                    } else if (code === 221) {
                        // ]: next
                        player.reloadMedia.callNextPart(
                            {
                                forceToNext: true,
                            },
                            null,
                            true,
                        );
                    } else if (code === 68) {
                        //【D】- 开启/关闭弹幕，功能同点击弹幕开关设置按钮
                        if (!this.panoramicFocus && !this.panoramicShortcut && !this.keydownStatus[code]) {
                            this.keydownStatus[code] = true;
                            player.state.danmaku = !player.state.danmaku;
                            this.danmakuLite.change(!player.state.danmaku);
                        }
                        return false;
                    } else if (code === 77) {
                        //【M】- 开启/关闭静音模式，功能同点击音量按钮
                        if (!this.panoramicFocus && !this.keydownStatus[code]) {
                            this.keydownStatus[code] = true;
                            const toMuted = player.video.volume === 0 ? false : true;
                            this.volumeBar.toggleMutedMode(toMuted);
                        }
                        return false;
                    }

                    return true;
                }
            });

        hasKeydown &&
            player.$window.off(`keyup${player.config.namespace}`).on(`keyup${player.config.namespace}`, (e) => {
                const code = e.keyCode;
                if (this.keydownStatus[<keyof IKeydownStatus>code]) {
                    this.keydownStatus[<keyof IKeydownStatus>code] = false;
                }
            });

        if (player.config.touchMode) {
            template.videoWrp[0].addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });

            const mc = new Hammer.Manager(template.videoWrp[0]);

            // tap
            mc.add(
                new Hammer.Tap({
                    event: 'doubletap',
                    taps: 2,
                    interval: 500,
                    posThreshold: 20,
                    threshold: 5,
                }),
            );
            mc.add(
                new Hammer.Tap({
                    event: 'singletap',
                }),
            );
            mc.add(
                new Hammer.Tap({
                    event: '2psingletap',
                    pointers: 2,
                }),
            );
            mc.get('doubletap').recognizeWith('singletap');
            // mc.get('singletap').requireFailure('doubletap');

            mc.on('singletap', (e) => {
                if (template.playerArea.hasClass('video-control-show')) {
                    template.csIn(false);
                } else {
                    setTimeout(() => {
                        template.csIn(true);
                    }, 0);
                }
                this.player.danmaku?.contextmenu?.hide();
                const param = [e.pointers[0].pageX + 1, e.pointers[0].pageY + 1, e.pointers[0]];
                setTimeout(() => {
                    this.player.danmaku?.contextmenu?.show(param[0], param[1], param[2], 1);
                }, 0);
            });
            mc.on('doubletap', () => {
                this.startButton.toggle();
            });
            mc.on('2psingletap', (e) => {
                const customE: any = {};
                ['pageX', 'pageY', 'offsetX', 'offsetY', 'clientX', 'clientY'].forEach((key) => {
                    customE[key] = (e.pointers[0][key] + e.pointers[1][key]) / 2;
                });
                this.player.danmaku.contextmenu.hide();
                this.player.danmaku.contextmenu.show(customE.pageX, customE.pageY, customE, 2);
            });

            // pan
            let area = 0;
            let startProgress = 0;
            const areaMap = [180, 360, 540];
            let type = '';
            let volume = 0;
            let controllerSet = false;
            mc.add(
                new Hammer.Pan({
                    direction: Hammer.DIRECTION_ALL,
                    threshold: 20,
                }),
            );
            mc.on('panstart', (e) => {
                const height = template.videoWrp.height()!;
                if (e.pointers[0].pageY < height / 3) {
                    area = 0;
                } else if (e.pointers[0].pageY < (height / 3) * 2) {
                    area = 1;
                } else {
                    area = 2;
                }
                startProgress = this.progressBar.getProgressRate();
                volume = player.video.volume;
                // this.progressBar.enableOnTime = false;
            });
            mc.on('panright panleft', (e) => {
                if (!type) {
                    type = e.type;
                    // this.progressBar.bindMove();
                } else if (type !== 'panright' && type !== 'panleft') {
                    return;
                }
                if (!template.playerArea.hasClass('video-control-show')) {
                    controllerSet = true;
                    template.csIn(true);
                }
                const length = Math.min(areaMap[area], player.duration()!);
                const distance = (e.deltaX / template.videoWrp.width()!) * length;
                this.progressBar.moveProgress(startProgress + distance / player.duration()!);
            });
            mc.on('panup pandown', (e) => {
                if (!type) {
                    type = e.type;
                } else if (type !== 'panup' && type !== 'pandown') {
                    return;
                }
                let value = Math.round(volume * 100 - (e.deltaY / template.videoWrp.height()!) * 100) / 100;
                value = Math.min(value, 1);
                value = Math.max(value, 0);
                this.volumeBar.volume(value, true);
            });
            mc.on('panend pancancel', (e) => {
                if (type === 'panright' || type === 'panleft') {
                    this.progressBar.setProgressRate(this.progressBar.getProgressRate());
                    // this.progressBar.enableOnTime = true;
                    // this.progressBar.unbindMove();
                    if (controllerSet) {
                        controllerSet = false;
                        template.csIn(false);
                    }
                }
                type = '';
            });

            // 2 pointers pan
            mc.add(
                new Hammer.Pan({
                    event: '2ppan',
                    direction: Hammer.DIRECTION_HORIZONTAL,
                    pointers: 2,
                }),
            );
            let twoppanEnabled = true;
            const speedMap = [0.5, 0.75, 1, 1.25, 1.5, 2];
            mc.on('2ppanright 2ppanleft', (e) => {
                if (twoppanEnabled) {
                    twoppanEnabled = false;
                    if (player.controller.speedList) {
                        const nowIndex = speedMap.indexOf(player.controller.speedList.value());
                        const nextIndex = nowIndex + (e.type === '2ppanright' ? 1 : -1);
                        if (nextIndex >= 0 && nextIndex < speedMap.length) {
                            player.controller.speedList.value(speedMap[nextIndex]);
                        }
                    }
                }
            });
            mc.on('2ppanend 2ppancancel', (e) => {
                twoppanEnabled = true;
            });
            mc.get('pan').recognizeWith('2ppan');
            mc.get('pan').requireFailure('2ppan');

            // press
            mc.add(new Hammer.Press({}));
            mc.on('press', (e) => {
                const list: any[] = [];
                const list1 = player.danmaku.danmaku.searchAreaDanmaku(
                    e.pointers[0].pageX - player.container.offset()!.left,
                    e.pointers[0].pageY - player.container.offset()!.top,
                );
                list.push.apply(list, list1);
                if (player.advDanmaku) {
                    const list2 = player.advDanmaku.searchAreaDanmaku(e.pointers[0]);
                    list.push.apply(list, list2);
                }
                if (list.length) {
                    player.danmaku && player.danmaku.list && player.danmaku.list.search(list[0].textData.dmid);
                }
            });

            // pinch
            mc.add(
                new Hammer.Pinch({
                    threshold: 0.1,
                }),
            );

            let disablePanTimer = 0;
            mc.on('pinchin', () => {
                // 短时间禁用 pan 防止多余触发
                disablePanTimer && clearTimeout(disablePanTimer);
                mc.get('pan').set({
                    enable: false,
                });
                disablePanTimer = window.setTimeout(() => {
                    mc.get('pan').set({
                        enable: true,
                    });
                    disablePanTimer = 0;
                }, 500);

                if (player.state.mode === STATE.UI_FULL) {
                    this.screenButton.fullscreen.click();
                } else if (player.state.mode === STATE.UI_WEB_FULL) {
                    this.screenButton.webFullscreen.click();
                }
            });
            mc.get('pan').requireFailure('pinch');
        }
    }
    // 视频回到上个状态
    screenToLast() {
        if (this.player.state.mode !== STATE.UI_NORMAL) {
            this.screenButton.onVideoMode(
                this.screenButton.lastMode === STATE.UI_WIDE ? STATE.UI_WIDE : STATE.UI_NORMAL,
            );
        }
    }
    seekFromArrowLeft(fromSlidekey: boolean) {
        if (!this.panoramicFocus) {
            const player = this.player;
            if (typeof this.lastSeekTime === 'undefined') {
                this.lastSeekTime = player.currentTime()!;
                this.seekTime = player.currentTime()! - 5;
                player.seek(this.seekTime, STATE.SEEK_TYPE.SLIDEKEY);
            } else if (this.lastSeekTime === player.currentTime()) {
                this.seekTime -= 5;
                player.seek(this.seekTime, STATE.SEEK_TYPE.SLIDEKEY);
            } else {
                player.seek(player.currentTime()! - 5, STATE.SEEK_TYPE.SLIDEKEY);
                this.lastSeekTime = undefined;
            }
        }
    }

    seekFromArrowRight(fromSlidekey: boolean) {
        if (!this.panoramicFocus) {
            const player = this.player;
            if (typeof this.lastSeekTime === 'undefined') {
                this.lastSeekTime = player.currentTime();
                this.seekTime = player.currentTime()! + 5;
                player.seek(this.seekTime, STATE.SEEK_TYPE.SLIDEKEY);
            } else if (this.lastSeekTime === player.currentTime()) {
                this.seekTime = Math.min(player.duration()!, this.seekTime + 5);
                player.seek(this.seekTime, STATE.SEEK_TYPE.SLIDEKEY);
            } else {
                player.seek(player.currentTime()! + 5, STATE.SEEK_TYPE.SLIDEKEY);
                this.lastSeekTime = undefined;
            }
        }
    }

    private _setState(state: number, fromTrigger?: number | null, fakeState?: boolean) {
        const player = this.player;
        player.state.video_state = state;
        // lastState只存play, pause, complete方便比较
        if (state === STATE.V_IDEL) {
            //
            if (!player.initialized) {
                this.lastState = STATE.V_PAUSE;
            }
        }
        if (state === STATE.V_READY) {
            if (this.lastState === STATE.V_PLAY) {
                player.danmaku && player.danmaku.play();
                player.subtitle && player.subtitle.play();
            }
        }
        if (state === STATE.V_BUFF) {
            this._onVideoBuff();
        } else {
            clearTimeout(this.loadlagTimer5s);
            this.loadlagTimer5s = 0;
            this.clearLagSpeed();
            clearTimeout(this.loadlagTimer);
            delete (<any>this).loadlagTimer;
            delete (<any>this).loadBuffTimer;
            clearTimeout(this.playLagTimer5s);
            this.playLagTimer5s = 0;
        }
        if (state === STATE.V_PLAY) {
            if (this.lastState === STATE.V_COMPLETE) {
                this.lastState = state;
                // player.video.currentTime = 0;
                // this._onVideoPlay(false, fromTrigger);
                if (player.currentTime()!.toFixed(2) === player.duration()!.toFixed(2)) {
                    // setTimeout fix
                    player.pause(fromTrigger);
                    if (!player.bangumipaypanel) {
                        this.payHinter?.hide();
                        this.getEndingPanel()?.show();
                    }
                } else {
                    this._onVideoPlay(false, fromTrigger!, fakeState);
                }
            } else if (this.lastState === STATE.V_PAUSE) {
                this.lastState = state;
                this._onVideoPlay(false, fromTrigger!, fakeState);
            } else {
                this._onVideoPlay(true, fromTrigger!, fakeState);
            }
        }
        if (state === STATE.V_PAUSE) {
            this._onVideoPause(fromTrigger, fakeState);
            this.lastState = state;
        }
        if (state === STATE.V_COMPLETE) {
            this.lastState = state;
            this._onVideoEnded();
        }
        player.trigger(STATE.EVENT.VIDEO_STATE_CHANGE, state);
    }

    private _onVideoPlay(fromCanplay: boolean, fromTrigger: number, fakeState?: boolean) {
        const player = this.player;
        if (player.video) {
            this.startButton.setState('play', fromTrigger);
            this.containerFocus = true;
            if (!fromCanplay) {
                this.getEndingPanel()?.hide();
                this.payHinter?.show();
                if (this.getElectricpanel()) {
                    this.getElectricpanel()!.close();
                }
                // this.getRecommendToBePlayPanel()?.close();
            }
            if (!fakeState) {
                const playedPromise = player.video.play();
                if (playedPromise) {
                    playedPromise
                        .then(() => {
                            player.allPlugins?.startEffect();
                            // this.progressBar.setVideoPlay();
                        })
                        .catch((err: any) => {
                            if (err && err.name === 'NotAllowedError') {
                                if (!this.notAllowAutoplayShowed) {
                                    this.notAllowAutoplayShowed = true;
                                    player.toast.addTopHinter(
                                        '当前浏览器已限制自动播放',
                                        3500,
                                        () => {
                                            this.notAllowAutoplayShowed = false;
                                        },
                                        false,
                                        false,
                                        true,
                                    );
                                }
                            }
                            if (player.video && player.video.readyState <= STATE.V_READY) {
                                this.lastState = player.video.readyState;
                                player.state.video_state = player.video.readyState;
                                return true;
                            }

                            if (player.state.video_state === STATE.V_PLAY) {
                                player.pause();
                            }
                        });
                }
            } else {
                player.allPlugins?.startEffect();
                // this.progressBar.setVideoPlay();
            }
        }
        player.danmaku && player.danmaku.play();
        player.subtitle && player.subtitle.play();
        player.realTimeDanmaku && player.realTimeDanmaku.join();
    }

    private autoPlay(fromTrigger: any, fakeState?: boolean) {
        this.volumeBar.volume(0);
    }
    private _onVideoPause(fromTrigger: any, fakeState?: boolean) {
        const player = this.player;
        if (player.video) {
            this.startButton.setState('pause', fromTrigger);
            if (!fakeState && !player.video.paused) {
                player.video.pause();
            }
        }

        player.danmaku && player.danmaku.pause();
    }

    private _onVideoBuff() {
        const player = this.player;
        if (player.video) {
            this.startButton.setState('buff');
            this.showLagSpeed();
            // loadlag checker
            if (!this.loadlagTimer) {
                // this.player.mock.setMock('loadlag', () => {
                //     this.lowerQualityToast(1);
                // });
                this.loadlagTimer = window.setTimeout(() => {
                    if (this.lagLastSeekTime !== player.currentTime() || this.lagLastSeekTime === 0) {
                        // flvjs seek bug hack
                        let seekTarget = player.currentTime()! + 0.5;
                        if (browser.version.safari && player.currentTime()! < 1) {
                            // safari may stuck at beginning
                            // that.lagLastSeekTime = 1;
                            seekTarget = 1;
                        } else if (
                            player.video &&
                            player.video.buffered &&
                            player.video.buffered.length > 0 &&
                            player.currentTime()! < player.video.buffered.start(0)
                        ) {
                            seekTarget = player.video.buffered.start(0) - player.getTimeOffset();
                        }
                        player.seek(seekTarget, STATE.SEEK_TYPE.DEFAULT, true);
                        this.lagLastSeekTime = player.currentTime()!;
                    } else {
                        if (player.errorHandler.errorMessage) {
                            player.errorHandler.retryOnVideoBuff();
                        } else {
                            player.trigger(STATE.EVENT.VIDEO_MEDIA_LOADLAG, player.getPlayurl());
                            player.loadlagSymbol = +new Date();
                            if (player.dashPlayer && typeof player.dashPlayer.isLoadingFragment === 'function') {
                                let vbl = player.dashPlayer['getBufferLength']('video'),
                                    abl = player.dashPlayer['getBufferLength']('audio');
                                let msg = 'web_videoload_lag';
                                if (player.video.buffered && player.video.buffered.length > 1) {
                                    msg = `${msg},${player.video.buffered.end(0)},${player.video.buffered.start(1)}`;
                                }
                                if (
                                    ((isNaN(vbl) || vbl < 0.01) && !player.dashPlayer.isLoadingFragment('video')) ||
                                    ((isNaN(abl) || abl < 0.01) && !player.dashPlayer.isLoadingFragment('audio'))
                                ) {
                                    player.errorHandler.videoErrorHandler(4100, msg);
                                } else {
                                    this.lowerQualityToast(1);
                                }
                            } else {
                                this.lowerQualityToast(1);
                            }
                        }
                    }
                }, 5000);
            }
        }

        player.danmaku && player.danmaku.pause();
    }

    lowerQualityToast(type: number) {
        if (this.toastShowBetween || this.hintClickRemoved) return;
        if (--this.toastShowTimes < 0) return;
        const that = this;
        const player = this.player;
        if (player.videoData && player.videoData.videoQuality && player.videoData.videoQuality > qualityMap(16)) {
            let lowerQuality = '';
            let lowerQualityCode: number;
            if (Array.isArray(player.videoData.acceptQuality)) {
                player.videoData.acceptQuality
                    .sort((a: number, b: number) => {
                        return b - a;
                    })
                    .forEach((value: number, index: number, array: number[]) => {
                        if (Number(value) === Number(player.videoData.videoQuality) && array[index + 1]) {
                            lowerQualityCode = array[index + 1];
                            lowerQuality = STATE.QUALITY_NAME[<0>lowerQualityCode];
                        }
                    });
            }
            if (!lowerQuality || !lowerQualityCode!) {
                return false;
            }
            player.toast.addTopHinter(
                `<span class="${that.player.prefix}-video-toast-top-wrap">${type === 1 ? '网络' : '播放'
                }卡顿，试试切换到<span class="${that.player.prefix
                }-video-toast-top-lower-quality">${lowerQuality}</span>?</span>`,
                8000,
                () => {
                    that.hintClickRemoved = true;
                },
                true,
                false,
                false,
                () => {
                    that.lowerQualitySelfRemoved = true;
                },
            );
            player.toast.domNodes.wrapper
                .find('.' + that.player.prefix + '-video-toast-top-lower-quality')
                .on('click', function () {
                    // that.quality.updateQuality(that.player.videoData.videoQuality.acceptQuality, that.player.videoData.videoQuality.videoQuality, that.player.videoData.videoQuality.bp, that.player.videoData.videoQuality.hasPaid);
                    that.quality.qualitymenu.value(lowerQualityCode);
                });
            // 2分钟内不会弹第二次
            this.toastShowBetween = true;
            setTimeout(() => {
                this.toastShowBetween = false;
            }, 120000);
        }
    }
    // 有缓冲卡顿
    bufferHas() {
        const now = +new Date();
        this.bufferLoad.lagTimes.push(now);
        if (this.bufferLoad.lagTimes.length >= 3) {
            if (now - this.bufferLoad.netTimes[0] <= 30000) {
                this.bufferLoad.lagTimes.length = 0;
                this.showLagToast(3); // 30s卡顿大于3次，弹提示
            } else {
                this.bufferLoad.lagTimes.shift();
            }
        }
        this.loadlagTimer5s && clearTimeout(this.loadlagTimer5s);
        this.loadlagTimer5s = window.setTimeout(() => {
            this.loadlagTimer5s && this.showLagToast(2); // 卡顿5s，弹提示
        }, 5000);
    }
    private showLagToast(time: number) {
        this.lowerQualityToast(time);
        this.loadlagTimer5s = 0;
    }
    // 无缓冲卡顿
    bufferNoHas() {
        const now = +new Date();
        this.bufferLoad.netTimes.push(now);
        if (this.bufferLoad.netTimes.length >= 5) {
            if (now - this.bufferLoad.netTimes[0] <= 30000) {
                this.bufferLoad.netTimes.length = 0;
                this.lowerQualityToast(1); // 30s卡顿大于5次，弹提示
            } else {
                this.bufferLoad.netTimes.shift();
            }
        }
    }

    boceGuideToast() {
        // 用户点击【切换清晰度toast】切换清晰度成功后再次遇到卡顿时弹播测提示toast
        if (this.quality.changeSuccessFromToast) {
            this.playLagTestGuildToast();
        }
        // 用户关闭【切换清晰度toast】后，当前播放卡顿5s或60s内缓冲次数达到10次时弹播测提示toast
        if (this.hintClickRemoved || this.lowerQualitySelfRemoved) {
            this.removeTriggerBoceToast();
        }
    }

    private removeTriggerBoceToast() {
        const now = +new Date();
        this.bufferLoad.playLagTimes.push(now);
        if (this.bufferLoad.playLagTimes.length >= 10) {
            if (now - this.bufferLoad.playLagTimes[0] <= 60000) {
                this.bufferLoad.playLagTimes.length = 0;
                this.showGuildToast(); // 60s缓冲大于10次，弹播测提示
            } else {
                this.bufferLoad.playLagTimes.shift();
            }
        }
        this.playLagTimer5s && clearTimeout(this.playLagTimer5s);
        this.playLagTimer5s = window.setTimeout(() => {
            this.playLagTimer5s && this.showGuildToast(); // 卡顿5s，弹播测提示
        }, 5000);
    }

    private showGuildToast() {
        this.playLagTestGuildToast();
        this.playLagTimer5s = 0;
    }

    private playLagTestGuildToast() {
        if (!this.hintClickRemoved && !this.lowerQualitySelfRemoved && !this.quality.changeSuccessFromToast) return;
        if (this.boceGuideToastShow) return;
        const player = this.player;
        const that = this;
        const date = new Date();
        const nowDayTimeStamp = +new Date(date.getFullYear(), date.getMonth(), date.getDate());
        let boceToastTimes = getLocalSettings('boceToastTimes')
            ? JSON.parse(getLocalSettings('boceToastTimes')!)
            : [];
        boceToastTimes = boceToastTimes.filter((item: number) => item >= nowDayTimeStamp);
        if (boceToastTimes.length >= 2) {
            return;
        } else {
            boceToastTimes.push(+date);
            setLocalSettings('boceToastTimes', JSON.stringify(boceToastTimes));
        }
        this.boceGuideToastShow = true;
        const toast = player.toast.addTopHinter(
            `<span class="${player.prefix}-video-toast-top-wrap">发现您遇到播放卡顿的情况<span class="${player.prefix}-video-toast-top-playlag-detection">点击检测原因</span></span>`,
            5000,
            () => { },
            true,
        );
        player.toast.domNodes.wrapper
            .find('.' + player.prefix + '-video-toast-top-playlag-detection')
            .on('click', function () {
                toast.item.remove();
                // 播放测速面板展开并测速
                that.playLagDetection.init();
            });
    }

    private showLagSpeed() {
        if (!this.lagSpeedShowTimer) {
            this.lagSpeedShowTimer = window.setTimeout(() => {
                this.lagSpeedShowTimer && this.updateLagSpeed();
            }, 1000);
        }
    }
    private updateLagSpeed() {
        let lastSpeed = this.calcAverageThroughput();
        this.player.template.stateBuffSpeed.html(this.adjustSpeedUnit(lastSpeed));
        if (!this.lagSpeedUpdateTimer) {
            this.lagSpeedUpdateTimer = window.setInterval(() => {
                if (this.lagSpeedUpdateTimer) {
                    const nowSpeed = this.calcAverageThroughput();
                    this.abnormalSpeedReportFeedback(lastSpeed, nowSpeed);
                    if (nowSpeed !== lastSpeed) {
                        this.player.template.stateBuffSpeed.html(this.adjustSpeedUnit(nowSpeed));
                        lastSpeed = nowSpeed;
                    }
                }
            }, 1000);
        }
    }

    calcAverageThroughput() {
        let averageThroughput = 0; // Unit: KB/s
        if (this.player.flvPlayer) {
            try {
                averageThroughput =
                    this.player.flvPlayer['_transmuxer']['_controller']['_ioctl']['_speedSampler']['lastSecondKBps'] /
                    8;
            } catch (e) {
                averageThroughput = 0;
            }
        }
        if (this.player.dashPlayer) {
            // dashPlayer mediaInfo
            const infoData = this.player.dashPlayer && this.player.dashPlayer['getVideoInfo']();
            averageThroughput = infoData['statisticsInfo']['networkActivity']! / 1024;
        }
        return averageThroughput;
    }

    private adjustSpeedUnit(buffSpeed: number) {
        if (isNaN(buffSpeed)) {
            return '';
        } else {
            if (buffSpeed >= 1024) {
                return (buffSpeed / 1024).toFixed(2) + 'MB/s';
            } else {
                return buffSpeed.toFixed(2) + 'KB/s';
            }
        }
    }

    private abnormalSpeedReportFeedback(lastSpeed: number, nowSpeed: number) {
        // 抽样上报，抽样万分之一
        if (this.speedReported || Math.random() > 0.0001) return;
        if (lastSpeed >= this.abnormalSpeedLimit && nowSpeed >= this.abnormalSpeedLimit) {
            const player = this.player;
            let data = {
                content: 'abnormalSpeedReport',
                aid: player.config.aid,
                bvid: player.config.bvid,
                tag_id: 300,
                browser: window.navigator.userAgent,
                version: 'abnormalSpeedReport',
                jsonp: 'jsonp',
                other: JSON.stringify({
                    progress: player.currentTime(),
                    cid: player.config.cid,
                    playurl: player.getPlayurl(),
                    video_info: player.getVideoMessage().videoInfo,
                    test_log: player.getVideoMessage().testLog,
                    event_log: window.eventLogText || [],
                    speed: this.adjustSpeedUnit(nowSpeed),
                    speedDetails: '',
                    dashDetails: player.dashPlayer?.getLogHistory()?.log
                        ? player.dashPlayer?.getLogHistory()?.log.split('\n')
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
            this.speedReported = true;
        }
    }

    private clearLagSpeed() {
        clearTimeout(this.lagSpeedShowTimer);
        delete (<any>this).lagSpeedShowTimer;
        clearInterval(this.lagSpeedUpdateTimer);
        delete (<any>this).lagSpeedUpdateTimer;
        this.player.template.stateBuffSpeed.html('');
    }

    private _onVideoEnded() {
        const player = this.player;
        const that = this;
        if (player.danmaku) {
            player.danmaku.pause();
        }

        if (player.video) {
            player.trigger(STATE.EVENT.VIDEO_MEDIA_ENDED);
            if (!player.firstEnded) {
                player.firstEnded = true;
            }
            player.track?.heartBeat(4);

            // 课堂5分钟试看
            if (this.isPugv) {
                const status = this.player.user.status();
                if (status.pugv_watch_status === 3 && status.pugv_pay_status === 2) {
                    player.pause();
                    this.screenToLast();
                    this.noKeyDowm = true;
                    return;
                }
            }

            if (player.config.listLoop) {
                this.findNext();
                return;
            }
            if (
                (player.extraParams && player.extraParams.isPreview) ||
                player.videoData.isPreview ||
                player.config.type === ContentType.PugvCenter
            ) {
                player.pause();
                return;
            }
            if (player.state.repeat === STATE.V_REPEAT_ON) {
                this.repeatPlay();
            } else {
                this.updateDurationMark = true; // can't change duration when video_ended
                this.startButton.setState('ended');

                if (player.config.isPremiere) {
                    const premiereStatus = Number(player.checkPremiereStatus());
                    if (premiereStatus === 1) {
                        typeof this.player.window['stopPremiere'] === 'function' &&
                            this.player.window['stopPremiere']();
                        return;
                    } else {
                        player.pause();
                        if (this.getElectricpanel()) {
                            this.getElectricpanel()!.load(() => {
                                that._defaultCallback();
                            });
                        } else {
                            that._defaultCallback();
                        }
                    }
                    return;
                }
                if (player.interactive && !player.interactiveVideoConfig!.interactiveLastPart) {
                    // for interactive
                    const editor_mode = this.player.config.editorEdges;
                    if (!editor_mode) {
                        player.interactiveVideo && player.interactiveVideo.setChooseStatus(true);
                    }
                } else {
                    if (player.get('video_status', 'autopart') > 0 && !player.config.lightWeight) {
                        player.pause();
                        if (this.player.interactive && this.player.config.seasonType) {
                            if (this.getElectricpanel()) {
                                this.getElectricpanel()!.load(() => {
                                    that._defaultCallback();
                                });
                            } else {
                                that._defaultCallback();
                            }
                        } else {
                            if (this.getElectricpanel()) {
                                this.getElectricpanel()!.load(() => {
                                    player.reloadMedia.callNextPart(undefined, () => {
                                        this._defaultCallback();
                                    });
                                });
                            } else {
                                player.reloadMedia.callNextPart(undefined, () => {
                                    this._defaultCallback();
                                });
                            }
                        }
                    } else {
                        player.pause();
                        if (this.getElectricpanel()) {
                            this.getElectricpanel()!.load(() => {
                                that._defaultCallback();
                            });
                        } else {
                            that._defaultCallback();
                        }
                    }
                }
            }
        }
    }

    // ogv预览无限列表循环播放
    private findNext() {
        this.player.initPartmanager().findNextP((data: IPartsInfo) => {
            if (data?.cid) {
                this.player.reloadMedia.cidLoader(data);
            } else {
                this.repeatPlay();
            }
        });
    }
    private repeatPlay() {
        if (browser.version.trident || browser.version.edge) {
            this.player.pause();
        }
        setTimeout(() => {
            this.player.seek(0);
            this.player.play();
        });
    }
    private _defaultCallback() {
        const player = this.player;
        if (!player.bangumipaypanel && !(player.interactiveVideo && player.interactiveVideo.getDisableEndingPanel())) {
            this.payHinter?.hide();
            this.getEndingPanel()?.show();
        }
        if (typeof player.config.afterplay === 'function') {
            player.config.afterplay();
        }
        if (player.videoDisableTime > 0 && player.state.mode > STATE.UI_WIDE) {
            player.mode(STATE.UI_WIDE);
        }
    }

    private _add_buffer_range(range: any, duration: number, currentTime: number): any {
        for (let i = this.bufferRanges.length - 1; i >= 0; i--) {
            const bufferRange = this.bufferRanges[i];
            // expand range and move ranges[i] when two ranges coincide
            if (bufferRange.start >= range.start && bufferRange.end <= range.end) {
                // include
                this.bufferRanges.splice(i, 1);
                return this._add_buffer_range(range, duration, currentTime);
            }
            if (bufferRange.start <= range.start && bufferRange.end <= range.end && bufferRange.end >= range.start) {
                // left coincide
                range.start = bufferRange.start;
                this.bufferRanges.splice(i, 1);
                return this._add_buffer_range(range, duration, currentTime);
            }
            if (bufferRange.start >= range.start && bufferRange.end >= range.end && bufferRange.end <= range.start) {
                // right coincide
                range.end = bufferRange.end;
                this.bufferRanges.splice(i, 1);
                return this._add_buffer_range(range, duration, currentTime);
            }
            if (bufferRange.start > currentTime) {
                this.bufferRanges.splice(i, 1);
            }
        }
        if (Number(range.start) <= currentTime) {
            this.bufferRanges.push(range);
        }
    }

    private setBufferRanges(duration: number) {
        // this.controller.ranges.empty();
        let max = 0;
        let end: number;
        let rate = 0;
        const prefix = this.prefix;
        for (let i = this.bufferRanges.length - 1; i >= 0; i--) {
            end = this.bufferRanges[i].end;
            if (end > max) {
                max = end;
            }
        }
        if (max) {
            rate = max;
        }
        this.progressBar.setRange(rate / duration);

        if (rate / duration === 1) {
            this.player.trigger(STATE.EVENT.VIDEO_MEDIA_BUFFER_FULL);
        }
    }

    private _getBufferRate() {
        if (this.progressBar) {
            return this.progressBar.getRange();
        }
    }

    private _buffer(ranges: any, duration: number, currentTime: number) {
        let start: number;
        let end: number;
        this.bufferRanges = [];
        const offset = this.player.getTimeOffset();
        for (let i = 0; i < ranges.length; i++) {
            start = Number(ranges.start(i)) - offset;
            // fix start keyframe
            if (start >= 0 && start < 0.5) {
                start = 0;
            }
            end = Number(ranges.end(i)) - offset;
            this._add_buffer_range(
                {
                    start: start,
                    end: end,
                },
                duration,
                currentTime,
            );
        }
        if (this.player.videoContinueTime) {
            this._add_buffer_range(
                {
                    start: this.player.duration(this.player.video, true),
                    end: this.player.duration(this.player.video),
                },
                duration,
                currentTime,
            );
        }
        this.setBufferRanges(duration);
    }

    private _destroy() {
        const player = this.player;
        clearTimeout(this.loadlagTimer);
        clearTimeout(this.loadlagTimer5s);
        clearTimeout(this.mouseTimeout);
        clearTimeout(this.controllerTimeout);
        clearTimeout(this.playLagTimer5s);
        clearTimeout(this.lagSpeedShowTimer);
        clearInterval(this.lagSpeedUpdateTimer);
        $(document).unbind(`mousemove${player.config.namespace}`);
        player.$window.off(`mousemove${player.config.namespace}move`);
        player.$window.off(`click${player.config.namespace}`);
        player.$window.off(`mouseup${player.config.namespace}volume`);
        player.$window.off(`click${player.config.namespace}-settingmenu`);
        player.$window.off(`keydown${player.config.namespace}`);
        player.$window.off(`beforeunload${player.config.namespace}`);
        $(window).unbind(`resize${player.config.namespace} scroll${player.config.namespace}`);
        if (this.deferred) {
            this.deferred.reject();
            this.deferred = <any>null;
        }
        this.notAllowAutoplayShowed = false;
        this.preloadAjax?.abort();
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
    }

    private _resize(mode = this.player.state.mode) {
        const template = this.player.template;
        const player = this.player;
        if (template.container.hasClass('mode-miniscreen')) {
            template.container.removeClass('mode-miniscreen');
            player.state.mode = this.relayMode;
            player.feedbackTooltip.options.supportShow = true;
        }
        if (
            template.container.is(':visible') &&
            (template.container.outerWidth()! < 480 || template.container.outerHeight()! < 360) &&
            player.config.type !== ContentType.OgvPre
        ) {
            template.container.addClass('mode-miniscreen');
            this.relayMode = player.state.mode;
            player.state.mode = STATE.UI_MINI;
            player.template.playerArea.find('.bilibili-player-feedback')?.is(':visible') &&
                player.template.playerArea.find('.bilibili-player-feedback').remove();
            player.feedbackTooltip.options.supportShow = false;
        } else if (mode === STATE.UI_NORMAL) {
            // fix width 0
            if (template.playerArea.width() === 0) {
                setTimeout(() => {
                    this._resize(mode);
                }, 100);
            }
        }
        player.subtitle && player.subtitle.resize();
    }

    addVideoHint(result?: any) {
        //轻量播放器移除播放器预览
        if (this.player.config.lightWeight) return;
        let msg: IToastMsg | null = null;
        const player = this.player;
        const info = this.player.user.status();
        const tip = this.player.outerInfo.hasCoupon ? '领券购买' : '立即购买';
        // 预售购买
        if (player.extraParams && player.extraParams.preSaleToast) {
            msg = {
                text: '影片即将上映',
                class: 'hint-light',
                tip: '预售购票',
            };
        }
        // hint付费
        else if (player.extraParams && player.extraParams.epStat === 13) {
            // 大会员专享
            msg = {
                text: '正在观看预览，大会员免费看全片',
                class: 'hint-red',
                tip: '成为大会员',
            };
        } else if (player.extraParams && player.extraParams.allowTicket) {
            // 用券观看
            msg = {
                text: '正在观看预览，大会员用券免费看',
                class: 'hint-red',
                tip: '用券观看',
            };
        } else if (info.pugv_watch_status === 1) {
            msg = {
                text: '试看中，购买即可观看完整内容',
                class: 'hint-green',
                tip,
            };
        } else if (info.pugv_watch_status === 3) {
            msg = {
                text: '试看5分钟，购买即可观看完整内容',
                class: 'hint-green',
                tip,
            };
        } else if (info.is_pay_preview) {
            const [textContent, buttonContent] = info.preview_toast!.split('|');
            msg = {
                text: textContent,
                class: '',
                tip: buttonContent,
            };
        } else {
            msg = {
                text: '正在观看预览，付费观看完整版',
                class: '',
                tip: '付费观看',
            };
        }
        this.payHinter = player.toast.addPayHinter(
            `<span class="video-float-hint-text">${msg.text}</span><span class="video-float-hint-btn ${msg.class}">${msg.tip}</span>`,
            false,
            false,
            true,
        ).item;
        this.payHinter.find('.video-float-hint-btn').click(() => {
            player.pause();
            if (player.state.mode > STATE.UI_WIDE) {
                player.mode(STATE.UI_WIDE);
            }
            if (player.config.type === ContentType.Pugv) {
                this.showPay();
                return;
            }
            const status = player.user.status();
            if (!status.login) {
                player.quicklogin.load(function () {
                    player.window.location.href = player.window.location.href;
                });
            } else {
                if (player.extraParams && player.extraParams.epStat === 13) {
                    typeof player.window['showVipPay'] === 'function' && player.window['showVipPay']();
                } else {
                    this.showPay();
                }
            }
        });
    }

    showPay() {
        if (typeof this.player.globalFunction.WINDOW_AGENT.showPay === 'function') {
            // this.settingButton.lightoff.value(false);
            this.player.globalFunction.WINDOW_AGENT.showPay();
        }
    }
    private _addVideoMessage(message: string, time?: number) {
        this.quality && this.quality.addVideoMessage(message, time);
    }
    timeLimitWatch() {
        if (this.player.extraParams && this.player.extraParams.deadLineToast) {
            const text = `<span>${this.player.extraParams.deadLineToast}</span>`;
            this.player.toast.addBottomHinter({
                closeButton: true,
                text: text,
            });
        }
    }
    private _lastIntercative(title: string, lastcid?: any, node_id?: any) {
        if (this.player.extraParams && this.player.extraParams.deadLineToast) {
            return;
        }
        if (!lastcid) {
            return false;
        }
        if (!this.player.config.interactiveNode || this.player.config.interactiveNode === '1') {
            const player = this.player;
            const cid = this.player.config.cid;
            const epNo = `<span>您有最近观看进度</span>`;
            const text = epNo;
            if (String(lastcid) === String(cid)) {
                return false;
            }
            this.player.toast.addBottomHinter({
                timeout: 8000,
                closeButton: true,
                text: text,
                jump: '点击跳转',
                defaultCallback: () => {
                    const nostart =
                        this.player.extraParams &&
                        typeof this.player.extraParams.isStart === 'boolean' &&
                        !this.player.extraParams.isStart &&
                        this.player.extraParams.canWatch;
                    if (!this.player.config.isPremiere && nostart) {
                        this.addPVHint();
                    }
                },
                jumpFunc: () => {
                    player.config.t = 0 + 's';
                    player.interactiveVideoConfig!.portal = 1;
                    player.reloadMedia.cidLoader({
                        aid: player.config.aid,
                        cid: lastcid,
                        bvid: player.config.bvid,
                        p: 1,
                        interactiveNode: node_id,
                    });
                },
            });
        }
    }

    lastplay(time: number, lastcid?: any, lastepid?: any) {
        if (this.player.extraParams && this.player.extraParams.deadLineToast) {
            return;
        }
        time = Math.floor(time) || 0;
        if (time < 0 || !lastcid || (time === 0 && !lastepid) || this.pugvPlayOver(time / 1000, lastepid)) {
            return false;
        }
        const player = this.player;
        const isBangumi = this.player.config.seasonType;
        const cid = this.player.config.cid;
        let partInfo: any = null;
        let p: number;
        if (String(lastcid) === String(cid)) {
            time = Math.min(time, player.duration()! * 1000);
            if (!time) {
                return false;
            }
        } else {
            partInfo = this.player.initPartmanager().getPartsInfo(lastcid, lastepid);
            if (!partInfo || !partInfo.p) {
                return false;
            }
        }
        if (partInfo && partInfo.p) {
            p = partInfo.p;
        }
        let indexMessage = '';
        let epNo = ``;
        if (partInfo && partInfo.total > 1) {
            if (isBangumi) {
                if (partInfo.title) {
                    indexMessage = ' ' + this.formatTitle(partInfo.title) + ' ';
                }
            } else {
                let text = this.isPugv ? '集' : '个';
                indexMessage = ` 第${partInfo.p + text} `;
            }
        }
        epNo = `<span>上次看到${indexMessage}</span>`;
        let text = epNo + `<span> ${fmSeconds(time / 1000)}</span>`;
        if (time === 0 && indexMessage) {
            text = epNo;
        }
        if (partInfo && partInfo.total > 1) {
            if (!this.player.config.isPremiere || (this.player.config.isPremiere && indexMessage)) {
                this.player.toast.addBottomHinter({
                    timeout: 8000,
                    closeButton: true,
                    text: text,
                    jump: '跳转播放',
                    defaultCallback: () => {
                        const nostart =
                            this.player.extraParams &&
                            typeof this.player.extraParams.isStart === 'boolean' &&
                            !this.player.extraParams.isStart &&
                            this.player.extraParams.canWatch;
                        if (!this.player.config.isPremiere && nostart) {
                            this.addPVHint();
                        }
                    },
                    jumpFunc: () => {
                        if (String(lastcid) !== String(cid)) {
                            player.config.t = time / 1000 + 's';
                            if (player.partmanager && player.partmanager.parts) {
                                if (p === player.partmanager.parts.length) {
                                    this.player.config.hasNext = false;
                                } else {
                                    this.player.config.hasNext = true;
                                }
                            }
                            player.reloadMedia.cidLoader({
                                aid: partInfo.aid,
                                cid: partInfo.cid,
                                bvid: partInfo.bvid,
                                p: p,
                                episodeId: partInfo.episodeId,
                                lastplaytime: partInfo.lastplaytime,
                                lastepid: partInfo.episodeId,
                                isPremiere: partInfo.isPremiere,
                            });
                        } else {
                            player.seek(time / 1000, STATE.SEEK_TYPE.TOAST);
                        }
                    },
                });
            }
        } else {
            if (!this.player.config.isPremiere || (this.player.config.isPremiere && indexMessage)) {
                this.player.toast.addBottomHinter({
                    timeout: 8000,
                    closeButton: true,
                    text: text,
                    jump: '跳转播放',
                    defaultCallback: () => {
                        const nostart =
                            this.player.extraParams &&
                            typeof this.player.extraParams.isStart === 'boolean' &&
                            !this.player.extraParams.isStart &&
                            this.player.extraParams.canWatch;
                        if (!this.player.config.isPremiere && nostart) {
                            this.addPVHint();
                        }
                    },
                    jumpFunc: () => {
                        player.seek(time / 1000, STATE.SEEK_TYPE.TOAST);
                    },
                });
            }
        }
    }

    private formatTitle(title: string) {
        let index = Number(title);
        let epIndex = isNaN(index) ? title : `第${index}话`;
        return epIndex;
    }
    updateQuality(result: any, nowQuality: number) {
        this.quality && this.quality.updateQuality(result, nowQuality);
    }

    setState(state: number, fromTrigger?: number | null, fakeState?: boolean) {
        this._setState(state, fromTrigger, fakeState);
    }

    setMode(mode: number) {
        this.screenButton.onVideoMode(mode);
    }

    volume(volume: number) {
        this.volumeBar.volume(volume);
        this.volumeBar.setVolume(volume);
    }

    getLastState(): number {
        return this.lastState;
    }

    getLastVolume(): number {
        return this.volumeBar.lastVideoVolume;
    }

    buffer(duration: TimeRanges, ranges: any, currentTime: number) {
        this._buffer(duration, ranges, currentTime);
    }

    resize() {
        this._resize();
    }

    getDuration(): number {
        return this.progressBar.getDuration();
    }

    clearTimeMark() {
        // this.progressBar.clearTimeMark();
    }

    turnLight(state: string) {
        this._turnLight(state);
    }
    addPVHint() {
        let hint;
        const player = this.player;
        player.flushExtraParams();
        const epIndex = player.extraParams && player.extraParams.epIndex;
        const epNeedPay = player.extraParams && player.extraParams.epNeedPay;
        const pubTime = player.extraParams && player.extraParams.pubTime;
        // hint付费
        hint = player.toast.addPayHinter(
            `<span class="video-float-hint-text">正在播放${epIndex}，${pubTime} 即将开播</span>`,
            true,
            false,
        ).item;
        hint.find('.video-float-hint-btn').click(function () {
            player.pause();
            if (player.state.mode > STATE.UI_WIDE) {
                player.mode(STATE.UI_WIDE);
            }
            const status = player.user.status();
            if (!status.login) {
                player.quicklogin.load(function () {
                    player.window.location.href = player.window.location.href;
                });
            } else {
                typeof player.window['showPay'] === 'function' && player.window['showPay']();
            }
        });
    }
    addVideoMessage(message: string, time?: number) {
        this._addVideoMessage(message, time);
    }
    lastIntercative(title: string, lastcid?: any, node_id?: any) {
        this._lastIntercative(title, lastcid, node_id);
    }
    getBufferRate() {
        return this._getBufferRate();
    }
    getVideoSliderRate() {
        return this.progressBar.getProgressRate();
    }
    setVideoSize() {
        return this._setVideoSize();
    }
    cacheRatioClass(val?: string) {
        if (val) {
            this.currentRatioClass = val;
        } else {
            return this.currentRatioClass;
        }
    }
    isLightOn(): boolean {
        return this._isLightOn();
    }
    getContainerFocus(): boolean {
        return this.containerFocus;
    }

    setContainerFocus(val: boolean) {
        this.containerFocus = val;
    }

    getPanoramicFocus(): boolean {
        return this.panoramicFocus;
    }

    setPanoramicFocus(val: boolean) {
        this.panoramicFocus = val;
    }

    getEndingPanel() {
        if (this.player.config.noEndPanel) return;
        if (this.player.config.type === ContentType.OgvPre) return;
        if (!this.player.endingpanel && !this.config.isAudio) {
            if (this.player.config.lightWeight && !this.player.interactive) {
                return this.player.endingpanel;
            } else {
                this.player.endingpanel = new EndingPanel(this.player, {
                    callback: (callback: Function) => {
                        this.player.userLoadedCallback(status => {
                            typeof callback === 'function' && callback(status.login);
                        });
                    },
                });
            }
        }
        return this.player.endingpanel;
    }

    getDocumentScrollElementRect(): { scrollTop: number; scrollLeft: number } {
        return {
            scrollTop: Math.max($(this.player.documentElement).scrollTop()!, this.player.$body.scrollTop()!),
            scrollLeft: Math.max($(this.player.documentElement).scrollLeft()!, this.player.$body.scrollLeft()!),
        };
    }

    setDocumentScrollElementRect(scrollTop: number, scrollLeft?: number) {
        if (typeof scrollTop === 'number') {
            $(this.player.documentElement).scrollTop(scrollTop);
            this.player.$body.scrollTop(scrollTop);
        }
        if (typeof scrollLeft === 'number') {
            $(this.player.documentElement).scrollLeft(scrollLeft);
            this.player.$body.scrollLeft(scrollLeft);
        }
    }

    fixControllerState() {
        this.setState(STATE.V_IDEL);
        // this.setState(STATE.V_READY);
        if (this.player.video.ended) {
            this.setState(STATE.V_COMPLETE);
            return;
        }
        if (this.player.video.paused) {
            this.setState(STATE.V_PAUSE);
        } else {
            this.setState(STATE.V_PLAY);
        }
    }

    getElectricpanel(): ElectricPanel | null {
        if (!this.player.electricpanel && !this.config.isAudio && !this.player.config.lightWeight) {
            this.player.electricpanel = new ElectricPanel(this.player);
        }
        return this.player.electricpanel;
    }

    /**
     * @desc should be invoked after `User` module
     */
    lastInteractive() {
        let tp;
        if (this.player.rangePlay.isEnable) {
            tp = <number>timeParser(<any>this.player.rangePlay.s_from);
        } else {
            tp = <number>timeParser(this.player.config.t!);
        }
        const info = this.player.user.status();
        if (!this.player.adPlayer) {
            if (this.player.rangePlay.isEnable || tp) {
                this.seekFromConfig(tp);
                this.player.rangePlay.isEnable &&
                    this.player.toast.addTopHinter('您正在使用剪影功能', 4000, undefined, false, false, true);
            }
        }
        if (!this.player.config.interactivePreview) {
            if (info.interaction && info.interaction.history_node) {
                let interaction = info.interaction.history_node;
                this.lastIntercative(interaction.title, interaction.cid, interaction.node_id);
            }
        }
    }
    private seekFromConfig(tp: number, needToast?: boolean) {
        if (tp === -1) {
            this.player.seek(this.player.duration()!, STATE.SEEK_TYPE.PARAMS);
        } else {
            this.player.seek(tp, STATE.SEEK_TYPE.PARAMS);
        }
        this.player.config.t = null;
        this.player.config.start_progress = undefined;
        if (needToast) {
            this.player.toast.addTopHinter(`已为你定位至 ${fmSeconds(tp)}`, 3000);
        }
    }
    lastWatchProgressHandler() {
        const that = this;
        let tp;
        let needToast = false;
        if (that.player.rangePlay.isEnable) {
            tp = timeParser(<any>that.player.rangePlay.s_from);
        } else if (!isNaN(Number(that.player.config.start_progress))) {
            tp = Math.min(Number(that.player.config.start_progress) / 1000 || 0, this.player.duration() || 0);
            needToast = true;
        } else {
            tp = timeParser(that.player.config.t!);
        }
        const info = that.player.user.status();
        // 付费视频上次观看传epid
        if (this.isPugv) {
            if (tp) {
                if (tp < this.player.duration()! - this.player.videoDisableTime) {
                    this.seekFromConfig(tp, needToast);
                }
            } else if (info.login) {
                this.pugvLastPlay(that.player.config.lastepid!);
            }
            return;
        }
        if (!that.player.adPlayer) {
            if (that.player.rangePlay.isEnable || tp) {
                this.seekFromConfig(<number>tp, needToast);
                that.player.rangePlay.isEnable &&
                    that.player.toast.addTopHinter('您正在使用剪影功能', 4000, undefined, false, false, true);
            } else if (info.login && !that.player.config.autoShift) {
                if (that.player.config.seasonType >= 1) {
                    if (that.player.config.lastepid && that.player.config.lastepid !== that.player.config.episodeId) {
                        that.player
                            .initPartmanager()
                            .requestParts()
                            .done(function () {
                                that.lastplay(that.player.config.lastplaytime!, Infinity, that.player.config.lastepid);
                                that.player.config.lastplaytime = null;
                                that.player.config.lastepid = null;
                            });
                    } else if (
                        that.player.config.lastepid &&
                        that.player.config.lastplaytime! / 1000 >= 5 &&
                        that.player.duration()! - that.player.config.lastplaytime! / 1000 > 5
                    ) {
                        this.deferred = new Deferred<void>();
                        this.deferred
                            .then(() => {
                                // that.player.seek(that.player.config.lastplaytime! / 1000);
                                that.lastplay(
                                    that.player.config.lastplaytime!,
                                    that.player.config.cid,
                                    that.player.config.lastepid,
                                );
                                that.player.config.lastplaytime = null;
                                that.player.config.lastepid = null;
                            })
                            .catch(() => {
                                that.player.config.lastplaytime = null;
                                that.player.config.lastepid = null;
                            });
                        this.canResolveDeferred() && this.deferred.resolve();
                    }
                } else {
                    if (info.lastcid && info.lastcid !== that.player.config.cid) {
                        that.player
                            .initPartmanager()
                            .requestParts()
                            .done(function () {
                                that.lastplay(info.lastplaytime!, info.lastcid);
                                info.lastplaytime = <any>null;
                            });
                    } else if (
                        info.lastplaytime! / 1000 >= 5 &&
                        that.player.duration()! - info.lastplaytime! / 1000 > 5 &&
                        (info.lastcid === that.player.config.cid || that.player.config.type === ContentType.Pugv)
                    ) {
                        this.deferred = new Deferred<void>();
                        this.deferred
                            .then(() => {
                                // that.player.seek(info.lastplaytime! / 1000);
                                that.lastplay(info.lastplaytime!, info.lastcid);
                                info.lastplaytime = <any>null;
                            })
                            .catch(() => {
                                info.lastplaytime = <any>null;
                            });
                        this.canResolveDeferred() && this.deferred.resolve();
                    }
                }
            }
        }
    }

    // 即历史记录=视频前10s后5s时不显示该集历史记录toast
    private pugvPlayOver(time: number, lastepid: number) {
        if (this.isPugv) {
            const duration = this.player.duration();
            let disableTime = 0;
            if (lastepid === this.player.config.episodeId) {
                disableTime = this.player.videoDisableTime;
            }
            if (time < 10 || (duration && time >= +duration.toFixed(1) - 5 - disableTime)) {
                return true;
            }
        }
        return false;
    }
    private pugvLastPlay(lastepid: number) {
        this.player.initPartmanager().loadParts(
            (partsInfo: IPartsInfo[]) => {
                if (partsInfo?.length) {
                    for (let i = 0; i < partsInfo.length; i++) {
                        const info = partsInfo[i];
                        if (info.episodeId === lastepid) {
                            if (
                                this.player.duration()! - this.player.config.lastplaytime! / 1000 > 5 ||
                                this.player.config.lastplaytime! / 1000 < 5
                            ) {
                                this.player.seek(info.lastplaytime!);
                                this.lastplay(info.lastplaytime!, info.cid, lastepid);
                            }
                            break;
                        } else {
                            this.lastplay(info.lastplaytime!, info.cid, lastepid);
                            break;
                        }
                    }
                }
            },
            () => { },
        );
    }
    // 首播转点播后样式更新
    premiereToNormalStyle() {
        if (this.syncButton) {
            this.syncButton.container.remove();
            this.syncButton = null;
        }
        // this.pageList.updatePremiereBadge();
        this.player.container.removeClass(`${this.prefix}-ogv-premiere`);
        this.player.config.isPremiere = 0;
        this.player.directiveManager.sender(VI_DATA_INIT, {
            aid: this.player.config.aid,
            cid: this.player.config.cid,
            bvid: this.player.config.bvid,
            isPremiere: this.player.config.isPremiere,
        });
    }

    // 白名单用户观看点映EP时展示toast
    whitelistToast() {
        if (this.player.extraParams && this.player.extraParams.whitelistToast) {
            this.player.toast.addTopHinter(this.player.extraParams.whitelistToast, 5000, undefined, false, false, true);
        }
    }
}

export default Controller;
