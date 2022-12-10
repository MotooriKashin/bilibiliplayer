import STATE from './state';
import Player from '../player';
import svg from './svg';
import { ContentType } from '@jsc/namespace';
import PausePanel from './pause-panel';
import { AnimationItem } from 'lottie-web';
import GlobalFunction from './global-function';

import '../../css/video-state.less';
import '../../css/inner.less';
import { browser, setSessionSettings } from '@shared/utils';

class Template {
    private player: Player;
    private prefix: string;
    private videoPoster!: JQuery;
    private globalFunction: GlobalFunction;
    container!: JQuery;
    playerArea!: JQuery;
    auxiliaryArea!: JQuery;
    playerWrap!: JQuery;
    message!: JQuery;
    // videoTop!: JQuery;
    videoWrp!: JQuery;
    videoPanel!: JQuery;
    videoPanelBackground!: JQuery;
    videoState!: JQuery;
    stateBuffIcon!: JQuery;
    stateBuffSpeed!: JQuery;
    popup!: JQuery;
    subtitle!: JQuery;
    basDanmaku!: JQuery;
    advDanmaku!: JQuery;
    danmaku!: JQuery;
    record!: JQuery;
    controller!: JQuery;
    sendbar!: JQuery;
    setting!: JQuery;
    settingPanel!: JQuery;
    watchlaterPanel!: JQuery;
    playlistPanel!: JQuery;
    wraplist!: JQuery;
    adTime!: JQuery;
    skipTime!: JQuery;
    skip!: JQuery;
    volumeHint!: JQuery;
    volumeHintIcon!: JQuery;
    volumeHintText!: JQuery;
    controllerShow!: boolean;
    timeClear!: number;
    mouseTimeout!: number;
    mouseTimeoutForDm!: number;
    mouseTimeoutForDmHover!: number;
    mouseTimeoutForDmSearch!: number;
    firstScreen: boolean = true;
    ctrlShowTimes: number = 0;
    progressTimer!: number;
    ctrlTimer!: number;
    mouseInController: boolean = false;
    buffAnimation!: AnimationItem;
    info!: JQuery<HTMLElement>;
    watchingNumber: any;
    danmakuNumber: any;
    danmakuNow: any;
    split: any;
    danmakuMax: any;
    settingBtn: any;
    settingMenu: any;
    recommend!: JQuery<HTMLElement>;
    watchlater!: JQuery<HTMLElement>;
    playlist!: JQuery<HTMLElement>;
    blockPanel!: JQuery<HTMLElement>;
    basDanmakuPanel!: JQuery<HTMLElement>;
    advDanmakuPanel!: JQuery<HTMLElement>;
    danmakuList!: JQuery<HTMLElement>;
    danmakuWrap: any;
    danmakuMask: any;
    filters!: JQuery<HTMLElement>;
    filterWatchlaterBtn: any;
    filterPlaylistBtn: any;
    filterRecommendBtn: any;
    filterListBtn: any;
    filterBlockBtn: any;
    danmakuBtnFooter: any;
    historyBtn: any;
    danmakuFunction: any;
    danmakuManagement: any;
    videoInner!: HTMLElement;
    videoInnerWrap!: HTMLElement;
    constructor(player: Player) {
        this.player = player;
        this.prefix = this.player.prefix;
        this.globalFunction = this.player.globalFunction;
        this.init();
    }

    private TPL(): string {
        const prefix = this.prefix;
        const filter = this.player.config.watchlater
            ? `<div class="${prefix}-filter-btn ${prefix}-filter-btn-watchlater" for="watchlater" name="tab_watchlater"><span>稍后再看</span></div>`
            : (this.player.config.playlist || this.player.config.playlistId)
                ? `<div class="${prefix}-filter-btn ${prefix}-filter-btn-playlist" for="playlist" name="tab_playlist"><span>播单</span></div>`
                : `<div class="${prefix}-filter-btn ${prefix}-filter-btn-recommend" for="recommend" name="tab_recommend recommend_show"><span>推荐视频</span></div>`;

        return `
            <div class="${prefix}-area video-state-pause" aria-label="哔哩哔哩播放器">
                <div class="${prefix}-video-message"></div>
                <div class="${prefix}-video-wrap">
                    <div class="${prefix}-video-state">
                        ${svg.playState}
                        <img class="${prefix}-video-state-buff" src="//static.hdslb.com/images/loading.gif" />
                        <div class="${prefix}-video-state-buff-text">
                            <span class="${prefix}-video-state-buff-title">正在缓冲...</span>
                            <span class="${prefix}-video-state-buff-speed"></span>
                        </div>
                    </div>
                    <div class="${prefix}-video-panel">
                        <div class="${prefix}-video-panel-image">
                            <div class="bilibili-player-video-panel-image-detail"></div>
                        </div>
                        <div class="${prefix}-video-panel-text"></div>
                    </div>
                    <div class="${prefix}-video-popup"></div>
                    <div class="${prefix}-video-subtitle"></div>
                    <div class="${prefix}-video-bas-danmaku"></div>
                    <div class="${prefix}-video-adv-danmaku"></div>
                    <div class="${prefix}-video-danmaku" aria-live="polite"></div>
                    <div class="${prefix}-video"></div>
                    <div class="${prefix}-video-inner"><div class="${prefix}-video-inner-center"><div class="${prefix}-video-inner-wrap"></div></div></div>
                </div>
                <div class="${prefix}-video-control"></div>
                <div class="${prefix}-video-sendbar"></div>
            </div>
            <div class="${prefix}-auxiliary-area" id="playerAuxiliary">
	            <div class="${prefix}-info">
		            <div class="${prefix}-watching">
			            <span class="${prefix}-watching-number">-</span>人正在看，
	            	</div>
	            	<div class="${prefix}-danmaku-number">
	            		<span class="${prefix}-danmaku-now">-</span>
	            		<span class="${prefix}-danmaku-split">/</span>
	            		<span class="${prefix}-danmaku-max">-</span>条弹幕
	            	</div>
	            	<div class="${prefix}-setting-btn" name="button_setting">
	            		<i class="${prefix}-iconfont icon-24setting" name="button_setting"></i>
	            	</div>
	            	<div class="${prefix}-setting-menu" name="player_more">
	            		<i name="player_more" class="${prefix}-iconfont icon-24more"></i>
	            	</div>
	            </div>
            	<div class="${prefix}-filter">
	            	${filter}
	            	<div class="${prefix}-filter-btn ${prefix}-filter-btn-list active" for="list" name="tab_danmulist"><span>弹幕列表</span></div>
	            	<div class="${prefix}-filter-btn ${prefix}-filter-btn-block" for="block" name="tab_danmupreventset"><span>屏蔽设定</span></div>
	            </div>
	            <div class="${prefix}-wraplist">
	            	<div class="${prefix}-filter-wrap ${prefix}-playlist" role="playlist"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-watchlater" role="watchlater"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-recommend" role="recommend"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-danmaku" role="list">
		            	<div class="${prefix}-danmaku-management clearfix"></div>
	            		<div class="${prefix}-danmaku-function"></div>
	            		<div class="${prefix}-danmaku-wrap">
		            		<div class="${prefix}-danmaku-load-status">弹幕列表装填中...</div>
		            	</div>
		            	<div class="${prefix}-danmaku-btn-footer">
		            		<div class="${prefix}-danmaku-btn-history" name="history_danmuku">查看历史弹幕</div>
	            		</div>
	            	</div>
	            	<div class="${prefix}-filter-wrap ${prefix}-block" role="block"></div>
            	</div>
	            <div class="${prefix}-setting">
	            	<div class="${prefix}-panel-title">播放器设置<i class="${prefix}-iconfont ${prefix}-panel-back icon-close"></i></div>
	            </div>
	            <div class="${prefix}-adv-danmaku">
            		<div class="${prefix}-panel-title">
	            		<div class="${prefix}-panel-tab ${prefix}-panel-tab-adv-danmaku">高级弹幕</div>
	            		<div class="${prefix}-panel-tab ${prefix}-panel-tab-bas-danmaku" style="display:none;">BAS弹幕</div>
                        <div class="${prefix}-panel-tab ${prefix}-panel-tab-code-danmaku" style="display:none;">代码弹幕</div>
	            		<i class="${prefix}-iconfont ${prefix}-panel-back icon-close"></i>
	            	</div>
                    <div class="${prefix}-bas-danmaku-visual"></div>
	            </div>
	            <div class="${prefix}-bas-danmaku"></div>
                <div class="${prefix}-code-danmaku"></div>
            </div>`;
    }

    private attachTemplate() {
        const prefix = this.player.prefix;
        const container = this.player.container;
        const corePlayerArea = container.find(`.${prefix}-area`);
        if (corePlayerArea.length) {
            corePlayerArea.find(`.${prefix}-video-top-core`).remove();
            // corePlayerArea.find(`.${prefix}-video-wrap`).prepend(this.templateTop());
            // corePlayerArea
            //     .find(`.${prefix}-video-state`)
            //     .prepend(`<span class="${prefix}-video-state-play ${prefix}-iconfont">${svg.newPlayState}</span>`);
        } else {
            container.html(this.TPL());
        }
        if (this.player.config.lightWeight) {
            container.addClass(`${prefix}-light-weight`);
        }
        if (this.player.config.gamePlayer) {
            container.addClass(`${prefix}-game-player`);
        }
        if (!this.player.config.hasDanmaku) {
            container.addClass(`${prefix}-no-danmaku`);
        }
        switch (this.player.config.theme) {
            case STATE.THEME.GREEN:
                container.addClass(`${prefix}-theme-${STATE.THEME.GREEN}`);
                break;
            case STATE.THEME.RED:
                container.addClass(`${prefix}-theme-${STATE.THEME.RED}`);
                break;
            default:
                break;
        }
        if (this.player.config.touchMode) {
            container.addClass(`${prefix}-touch`);
        }
        if (browser.version.tesla) {
            container.addClass(`${prefix}-tesla`);
        }
        if (this.player.config.isPremiere) {
            container.addClass(`${prefix}-ogv-premiere`);
        } else {
            container.removeClass(`${prefix}-ogv-premiere`);
        }
        switch (this.player.config.type) {
            case ContentType.OgvPre:
                container.addClass(`${prefix}-ogv-preview`);
                break;
            case ContentType.PugvCenter:
                container.addClass(`${prefix}-pugv-center`);
                break;
            default:
                break;
        }
    }

    init(): this {
        const that = this;
        const prefix = this.prefix;
        const player = this.player;
        const container = player.container;
        this.attachTemplate();

        this.container = container; // 播放器容器
        this.playerArea = this.container.find('.' + prefix + '-area'); // 播放器区域 左侧
        this.auxiliaryArea = this.container.find("." + prefix + "-auxiliary-area"); // 附加区域 右侧
        this.playerWrap = this.playerArea.find('.' + prefix + '-video-wrap'); // 播放器外层容器
        this.message = this.playerArea.find("." + prefix + "-video-message"); // 消息区域 顶部
        // this.videoTop = this.playerArea.find('.' + prefix + '-video-top'); // 视频title
        this.videoWrp = this.playerArea.find('.' + prefix + '-video'); // 播放器
        this.videoPoster = this.playerArea.find('.' + prefix + '-video-poster'); // 活动页配置封面图作为启播前第一帧
        this.videoPanel = this.playerArea.find('.' + prefix + '-video-panel'); // 播放器信息层
        this.videoPanelBackground = this.playerArea.find('.' + prefix + '-video-panel-image');
        // this.endingpanel = this.playerArea.find('.' + prefix + '-ending-panel'); // 结束时弹出的信息层
        this.videoState = this.playerArea.find('.' + prefix + '-video-state'); // 播放器状态
        this.stateBuffIcon = this.playerArea.find('.' + prefix + '-video-state-buff-icon'); // 缓冲状态图标
        this.stateBuffSpeed = this.playerArea.find('.' + prefix + '-video-state-buff-speed'); // 缓冲速度
        this.popup = this.playerArea.find('.' + prefix + '-video-popup'); // 播放器弹出(引导关注)层
        this.subtitle = this.playerArea.find('.' + prefix + '-video-subtitle'); // 播放器字幕层
        this.basDanmaku = this.playerArea.find('.' + prefix + '-video-bas-danmaku'); // 播放器bas弹幕层
        this.advDanmaku = this.playerArea.find('.' + prefix + '-video-adv-danmaku'); // 播放器高级弹幕层
        this.danmaku = this.playerArea.find('.' + prefix + '-video-danmaku'); // 播放器弹幕层
        this.videoInner = this.playerArea.find('.' + prefix + '-video-inner-center')[0]; // 视频区域
        this.videoInnerWrap = this.playerArea.find('.' + prefix + '-video-inner-wrap')[0]; // 视频区域
        this.record = this.playerArea.find('.' + prefix + '-video-record'); // 播放器贴片文案层
        // this.bottomArea = this.playerArea.find('.' + prefix + '-video-bottom-area'); // 播放器底部区域
        // this.controllerWrap = this.playerArea.find('.' + prefix + '-video-control-wrap'); // 播放器控制条包裹层
        this.controller = this.playerArea.find('.' + prefix + '-video-control'); // 播放器控制条
        // this.controllerTop = this.controller.find(`.${prefix}-video-control-top`); // 播放器控制条顶部区域(进度条)
        // this.controllerBottomLeft = this.controller.find(`.${prefix}-video-control-bottom-left`); // 播放器控制条底部左侧区域
        // this.controllerBottomCenter = this.controller.find(`.${prefix}-video-control-bottom-center`); // 播放器控制条底部左侧区域
        // this.controllerBottomRight = this.controller.find(`.${prefix}-video-control-bottom-right`); // 播放器控制条底部右侧区域
        this.sendbar = this.playerArea.find('.' + prefix + '-video-sendbar'); // 弹幕发送控制条

        this.info = this.auxiliaryArea.find("." + prefix + "-info");
        this.watchingNumber = this.info.find("." + prefix + "-watching-number");
        this.danmakuNumber = this.info.find("." + prefix + "-danmaku-number");
        this.danmakuNow = this.info.find("." + prefix + "-danmaku-now");
        this.split = this.info.find("." + prefix + "-danmaku-split");
        this.danmakuMax = this.info.find("." + prefix + "-danmaku-max");
        this.settingBtn = this.info.find("." + prefix + "-setting-btn");
        this.settingMenu = this.info.find("." + prefix + "-setting-menu");
        this.setting = this.auxiliaryArea.find("." + prefix + "-setting");
        this.recommend = this.auxiliaryArea.find("." + prefix + "-recommend");
        this.watchlater = this.auxiliaryArea.find("." + prefix + "-watchlater");
        this.playlist = this.auxiliaryArea.find("." + prefix + "-playlist");
        this.blockPanel = this.auxiliaryArea.find("." + prefix + "-block"); // 屏蔽面板
        this.basDanmakuPanel = this.auxiliaryArea.find("." + prefix + "-bas-danmaku"); // bas弹幕面板
        this.advDanmakuPanel = this.auxiliaryArea.find("." + prefix + "-adv-danmaku"); // 高级弹幕面板
        this.danmakuList = this.auxiliaryArea.find("." + prefix + "-danmaku"); // 弹幕列表及其控制
        this.danmakuWrap = this.danmakuList.find("." + prefix + "-danmaku-wrap"); // 弹幕列表
        this.danmakuMask = this.danmakuList.find("." + prefix + "-danmaku-load-status"); // 弹幕加载状态
        this.filters = this.auxiliaryArea.find("." + prefix + "-filter"); // 控制面板
        this.filterWatchlaterBtn = this.filters.find("." + prefix + "-filter-btn-watchlater");  // 稍后再看
        this.filterPlaylistBtn = this.filters.find("." + prefix + "-filter-btn-playlist"); // 播单
        this.filterRecommendBtn = this.filters.find("." + prefix + "-filter-btn-recommend"); // 推荐视频
        this.filterListBtn = this.filters.find("." + prefix + "-filter-btn-list"); // 弹幕列表
        this.filterBlockBtn = this.filters.find("." + prefix + "-filter-btn-block"); // 屏蔽设定
        this.danmakuBtnFooter = this.danmakuList.find("." + prefix + "-danmaku-btn-footer"); // 弹幕底部的按钮容器
        this.historyBtn = this.danmakuList.find("." + prefix + "-danmaku-btn-history"); // 历史弹幕
        this.wraplist = this.auxiliaryArea.find("." + prefix + "-wraplist"); // 切换层
        this.danmakuFunction = this.danmakuList.find("." + prefix + "-danmaku-function"); // 弹幕排序
        this.danmakuManagement = this.danmakuList.find("." + prefix + "-danmaku-management"); // 弹幕管理

        player.userLoadedCallback(data => {
            // IUserStatusInterface
            this.container.attr('data-login', <any>data.login);
        });

        if (player.config.type === ContentType.PugvCenter) {
            return this;
        }
        if (player.config.interactiveNode && !player.config.stableController) {
            this.playerArea.removeClass('video-state-pause');
            this.controllerShow = false;
        } else {
            this.playerArea.addClass('video-control-show');
            this.controllerShow = true;
        }

        player.userLoadedCallback(data => {
            const setOnline = this.player.globalFunction.WINDOW_AGENT.PlayerSetOnline;
            if (typeof setOnline === 'function') {
                setOnline(data.online_count || 1);
            }
        });

        if (this.player.config.ad) {
            this.adTime = $(
                '<div class="' +
                prefix +
                '-ad-wrap">广告：剩余<span class="' +
                prefix +
                '-ad-wrap-time">-</span>秒</div>',
            ).appendTo(this.playerWrap);
            this.skipTime = this.adTime.find('.' + prefix + '-ad-wrap-time');
            if (this.player.config.skipable) {
                this.skip = $('<div class="' + prefix + '-ad-skip" name="ad_skip">广告不好看，我选择跳过></div>')
                    .appendTo(this.playerWrap)
                    .click(function () {
                        if (typeof that.player.config.afterplay === 'function') {
                            that.player.config.afterplay();
                        }
                    });
            }
        }

        if (player.config.watchlater) {
            this.watchlater.show();
            this.danmakuList.hide();
            this.filterWatchlaterBtn.addClass("active");
        } else if (player.config.playlist || player.config.playlistId) {
            this.playlist.show();
            this.danmakuList.hide();
            this.filterPlaylistBtn.addClass("active");
        } else {
            this.recommend.show();
            this.danmakuList.hide();
            this.filterRecommendBtn.addClass("active");
        }
        this.filterListBtn.removeClass("active");

        this.filterRecommendBtn.click(function () {
            setSessionSettings("player_last_filter_tab_info", <any>STATE.TAB_RECOMMEND);
        });
        this.filterWatchlaterBtn.click(function () {
            setSessionSettings("player_last_filter_tab_info", <any>STATE.TAB_WATCHLATER);
        });
        this.filterPlaylistBtn.click(function () {
            setSessionSettings("player_last_filter_tab_info", <any>STATE.TAB_PLAYLIST);
        });
        this.filterListBtn.click(function () {
            setSessionSettings("player_last_filter_tab_info", <any>STATE.TAB_DANMAKULIST);
        });
        this.filterBlockBtn.click(function () {
            setSessionSettings("player_last_filter_tab_info", <any>STATE.TAB_BLOCKLIST);
        });

        player.bind(STATE.EVENT.VIDEO_DESTROY, function (e: Event, remove?: boolean) {
            that.destroy(remove);
        });
        if (!this.player.video || (this.player.video && this.player.video.paused)) {
            player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, (e: Event, remove?: boolean) => {
                if (this.videoPoster.length && this.videoPoster.is(':visible')) {
                    this.videoPoster.css('display', 'none');
                }
                this.firstScreen = false;
                if (!player.config.touchMode) {
                    this.csIn(false);
                }
            });
        } else {
            this.firstScreen = false;
            this.csIn(false);
        }
        // if (!this.player.config.touchMode) {
        //     this.controllerWrap
        //         .off(`mouseenter${this.player.config.namespace}controller`)
        //         .on(`mouseenter${this.player.config.namespace}controller`, () => {
        //             this.subtitle.addClass(`${prefix}-controller-hover`);
        //             this.mouseInController = true;
        //         });
        //     this.controllerWrap
        //         .off(`mouseleave${this.player.config.namespace}controller`)
        //         .on(`mouseleave${this.player.config.namespace}controller`, () => {
        //             this.subtitle.removeClass(`${prefix}-controller-hover`);
        //             this.mouseInController = false;
        //         });
        // }
        let positionWrap: JQuery;
        let positionHover = 80; // 目前只在游戏播放器里用
        if (player.config.hasDanmaku) {
            positionHover = 44;
        }
        if (player.config.gamePlayer) {
            positionWrap = this.playerArea;
        } else {
            positionWrap = this.playerWrap;
        }
        let moveCenterTime = 500;
        if (player.config.type === ContentType.OgvPre) {
            moveCenterTime = 3000;
        }
        let scrolltop = document.documentElement.scrollTop || document.body.scrollTop;
        let top = positionWrap.offset()!.top - scrolltop;
        let wrapHeight = positionWrap.height()!;
        player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            wrapHeight = positionWrap.height()!;
        });
        player.bind(STATE.EVENT.VIDEO_SCROLL, () => {
            scrolltop = document.documentElement.scrollTop || document.body.scrollTop;
            top = positionWrap.offset()!.top - scrolltop;
        });
        if (!player.config.touchMode) {
            positionWrap
                .off(`mousemove${this.player.config.namespace}top`)
                .on(`mousemove${this.player.config.namespace}top`, (e) => {
                    if (e) {
                        this.clearTime();
                        if ($(e.target).parents(`.${prefix}-video-control`).length > 0) {
                            this.csIn(true);
                            this.mouseInController = true;
                            return;
                        }
                        this.mouseInController = false;
                        const Y = e.clientY! - top;
                        this.onVideoCursorHideTimeoutClear();
                        if (!this.controllerShow) {
                            this.csIn(true);
                        }
                        if (Y < wrapHeight / 3) {
                            this.setTime(3000);
                        } else if (Y < (wrapHeight / 3) * 2) {
                            this.setTime(moveCenterTime);
                        } else {
                            this.setTime(3000);
                        }
                        if (player.config.gamePlayer) {
                            if (wrapHeight - Y <= positionHover) {
                                this.clearTime();
                                this.onVideoCursorHideTimeoutClear();
                            }
                        }
                    }
                });

            positionWrap
                .off(`mouseleave${this.player.config.namespace}top`)
                .on(`mouseleave${this.player.config.namespace}top`, () => {
                    this.csIn(false);
                });
        }
        // 播放器暂停显示面板（广告
        if (typeof this.player.window['pausePanel'] === 'function') {
            new PausePanel(this.player, this.playerWrap);
        }
        return this;
    }

    private onVideoCursorHideTimeoutClear() {
        this.container.removeClass(`${this.prefix}-no-cursor`);
        clearTimeout(this.mouseTimeoutForDmSearch);
        clearTimeout(this.mouseTimeoutForDmHover);
        clearTimeout(this.mouseTimeoutForDm);
        clearTimeout(this.mouseTimeout);
        // this.player.danmaku?.danmakuHover?.setCursor(false);
    }

    private getVideoControlCanHide() {
        return (
            !this.player.config.stableController ||
            this.player.state.mode === STATE.UI_FULL ||
            this.player.state.mode === STATE.UI_WEB_FULL
        );
    }
    // 控制条，两个进度条的显示隐藏逻辑
    csIn(isIn: boolean) {
        if (!this.firstScreen || this.player.config.touchMode) {
            if (this.getVideoControlCanHide()) {
                if (isIn || this.mouseInController) {
                    if (this.playerArea.hasClass('video-control-show')) return;
                    if (this.ctrlTimer) return;
                    this.ctrlTimer = window.setTimeout(() => {
                        // 延时100ms显示控制面板
                        this.playerArea.addClass('video-control-show');
                        this.ctrlShowTimes += 1;
                        this.controllerShow = true;
                        this.player.trigger(STATE.EVENT.VIDEO_CONTROLBAR, { show: true });
                        this.playerArea.removeClass('progress-shadow-show');
                        this.ctrlTimer = 0;
                    }, 100);
                    // 立即开始底部进度条消失动画
                    this.playerArea.removeClass('progress-shadow-show');
                } else if (this.playerArea.hasClass('video-control-show') || this.ctrlTimer) {
                    if (this.ctrlTimer) {
                        // 如果还在控制面板延时过程中，直接开始底部进度条显示动画
                        clearTimeout(this.ctrlTimer);
                        this.ctrlTimer = 0;
                        this.playerArea.addClass('progress-shadow-show');
                    } else {
                        this.player.controller && this.player.controller.timeLabel.hide();
                        this.controllerShow = false;
                        this.player.trigger(STATE.EVENT.VIDEO_CONTROLBAR, { show: false });
                        if (this.progressTimer) return;
                        this.progressTimer = window.setTimeout(() => {
                            // 延时100ms显示底部进度条
                            this.playerArea.addClass('progress-shadow-show');
                            this.playerArea.removeClass('video-control-show');
                            this.progressTimer = 0;
                        }, 100);
                    }
                    this.playerArea.removeClass('video-control-show');
                }
            } else if (this.player.config.stableController && !this.playerArea.hasClass('video-control-show')) {
                this.playerArea.addClass('video-control-show');
                this.playerArea.removeClass('progress-shadow-show');
            }
        }
    }

    clearTime() {
        this.timeClear && clearTimeout(this.timeClear);
    }

    setTime(time: number) {
        if (!this.player.config.touchMode) {
            this.timeClear = window.setTimeout(() => {
                this.csIn(false);
            }, time);
        }
    }

    destroy(remove?: boolean) {
        this.clearTime();
        this.onVideoCursorHideTimeoutClear();
        if (this.container) {
            this.container.unbind().empty();
        }
        if (remove) {
            this.container.remove();
        }
    }
}

export default Template;
