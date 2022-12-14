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
            ? `<div class="${prefix}-filter-btn ${prefix}-filter-btn-watchlater" for="watchlater" name="tab_watchlater"><span>????????????</span></div>`
            : (this.player.config.playlist || this.player.config.playlistId)
                ? `<div class="${prefix}-filter-btn ${prefix}-filter-btn-playlist" for="playlist" name="tab_playlist"><span>??????</span></div>`
                : `<div class="${prefix}-filter-btn ${prefix}-filter-btn-recommend" for="recommend" name="tab_recommend recommend_show"><span>????????????</span></div>`;

        return `
            <div class="${prefix}-area video-state-pause" aria-label="?????????????????????">
                <div class="${prefix}-video-message"></div>
                <div class="${prefix}-video-wrap">
                    <div class="${prefix}-video-state">
                        ${svg.playState}
                        <img class="${prefix}-video-state-buff" src="//static.hdslb.com/images/loading.gif" />
                        <div class="${prefix}-video-state-buff-text">
                            <span class="${prefix}-video-state-buff-title">????????????...</span>
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
			            <span class="${prefix}-watching-number">-</span>???????????????
	            	</div>
	            	<div class="${prefix}-danmaku-number">
	            		<span class="${prefix}-danmaku-now">-</span>
	            		<span class="${prefix}-danmaku-split">/</span>
	            		<span class="${prefix}-danmaku-max">-</span>?????????
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
	            	<div class="${prefix}-filter-btn ${prefix}-filter-btn-list active" for="list" name="tab_danmulist"><span>????????????</span></div>
	            	<div class="${prefix}-filter-btn ${prefix}-filter-btn-block" for="block" name="tab_danmupreventset"><span>????????????</span></div>
	            </div>
	            <div class="${prefix}-wraplist">
	            	<div class="${prefix}-filter-wrap ${prefix}-playlist" role="playlist"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-watchlater" role="watchlater"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-recommend" role="recommend"></div>
	            	<div class="${prefix}-filter-wrap ${prefix}-danmaku" role="list">
		            	<div class="${prefix}-danmaku-management clearfix"></div>
	            		<div class="${prefix}-danmaku-function"></div>
	            		<div class="${prefix}-danmaku-wrap">
		            		<div class="${prefix}-danmaku-load-status">?????????????????????...</div>
		            	</div>
		            	<div class="${prefix}-danmaku-btn-footer">
		            		<div class="${prefix}-danmaku-btn-history" name="history_danmuku">??????????????????</div>
	            		</div>
	            	</div>
	            	<div class="${prefix}-filter-wrap ${prefix}-block" role="block"></div>
            	</div>
	            <div class="${prefix}-setting">
	            	<div class="${prefix}-panel-title">???????????????<i class="${prefix}-iconfont ${prefix}-panel-back icon-close"></i></div>
	            </div>
	            <div class="${prefix}-adv-danmaku">
            		<div class="${prefix}-panel-title">
	            		<div class="${prefix}-panel-tab ${prefix}-panel-tab-adv-danmaku">????????????</div>
	            		<div class="${prefix}-panel-tab ${prefix}-panel-tab-bas-danmaku" style="display:none;">BAS??????</div>
                        <div class="${prefix}-panel-tab ${prefix}-panel-tab-code-danmaku" style="display:none;">????????????</div>
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

        this.container = container; // ???????????????
        this.playerArea = this.container.find('.' + prefix + '-area'); // ??????????????? ??????
        this.auxiliaryArea = this.container.find("." + prefix + "-auxiliary-area"); // ???????????? ??????
        this.playerWrap = this.playerArea.find('.' + prefix + '-video-wrap'); // ?????????????????????
        this.message = this.playerArea.find("." + prefix + "-video-message"); // ???????????? ??????
        // this.videoTop = this.playerArea.find('.' + prefix + '-video-top'); // ??????title
        this.videoWrp = this.playerArea.find('.' + prefix + '-video'); // ?????????
        this.videoPoster = this.playerArea.find('.' + prefix + '-video-poster'); // ????????????????????????????????????????????????
        this.videoPanel = this.playerArea.find('.' + prefix + '-video-panel'); // ??????????????????
        this.videoPanelBackground = this.playerArea.find('.' + prefix + '-video-panel-image');
        // this.endingpanel = this.playerArea.find('.' + prefix + '-ending-panel'); // ???????????????????????????
        this.videoState = this.playerArea.find('.' + prefix + '-video-state'); // ???????????????
        this.stateBuffIcon = this.playerArea.find('.' + prefix + '-video-state-buff-icon'); // ??????????????????
        this.stateBuffSpeed = this.playerArea.find('.' + prefix + '-video-state-buff-speed'); // ????????????
        this.popup = this.playerArea.find('.' + prefix + '-video-popup'); // ???????????????(????????????)???
        this.subtitle = this.playerArea.find('.' + prefix + '-video-subtitle'); // ??????????????????
        this.basDanmaku = this.playerArea.find('.' + prefix + '-video-bas-danmaku'); // ?????????bas?????????
        this.advDanmaku = this.playerArea.find('.' + prefix + '-video-adv-danmaku'); // ????????????????????????
        this.danmaku = this.playerArea.find('.' + prefix + '-video-danmaku'); // ??????????????????
        this.videoInner = this.playerArea.find('.' + prefix + '-video-inner-center')[0]; // ????????????
        this.videoInnerWrap = this.playerArea.find('.' + prefix + '-video-inner-wrap')[0]; // ????????????
        this.record = this.playerArea.find('.' + prefix + '-video-record'); // ????????????????????????
        // this.bottomArea = this.playerArea.find('.' + prefix + '-video-bottom-area'); // ?????????????????????
        // this.controllerWrap = this.playerArea.find('.' + prefix + '-video-control-wrap'); // ???????????????????????????
        this.controller = this.playerArea.find('.' + prefix + '-video-control'); // ??????????????????
        // this.controllerTop = this.controller.find(`.${prefix}-video-control-top`); // ??????????????????????????????(?????????)
        // this.controllerBottomLeft = this.controller.find(`.${prefix}-video-control-bottom-left`); // ????????????????????????????????????
        // this.controllerBottomCenter = this.controller.find(`.${prefix}-video-control-bottom-center`); // ????????????????????????????????????
        // this.controllerBottomRight = this.controller.find(`.${prefix}-video-control-bottom-right`); // ????????????????????????????????????
        this.sendbar = this.playerArea.find('.' + prefix + '-video-sendbar'); // ?????????????????????

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
        this.blockPanel = this.auxiliaryArea.find("." + prefix + "-block"); // ????????????
        this.basDanmakuPanel = this.auxiliaryArea.find("." + prefix + "-bas-danmaku"); // bas????????????
        this.advDanmakuPanel = this.auxiliaryArea.find("." + prefix + "-adv-danmaku"); // ??????????????????
        this.danmakuList = this.auxiliaryArea.find("." + prefix + "-danmaku"); // ????????????????????????
        this.danmakuWrap = this.danmakuList.find("." + prefix + "-danmaku-wrap"); // ????????????
        this.danmakuMask = this.danmakuList.find("." + prefix + "-danmaku-load-status"); // ??????????????????
        this.filters = this.auxiliaryArea.find("." + prefix + "-filter"); // ????????????
        this.filterWatchlaterBtn = this.filters.find("." + prefix + "-filter-btn-watchlater");  // ????????????
        this.filterPlaylistBtn = this.filters.find("." + prefix + "-filter-btn-playlist"); // ??????
        this.filterRecommendBtn = this.filters.find("." + prefix + "-filter-btn-recommend"); // ????????????
        this.filterListBtn = this.filters.find("." + prefix + "-filter-btn-list"); // ????????????
        this.filterBlockBtn = this.filters.find("." + prefix + "-filter-btn-block"); // ????????????
        this.danmakuBtnFooter = this.danmakuList.find("." + prefix + "-danmaku-btn-footer"); // ???????????????????????????
        this.historyBtn = this.danmakuList.find("." + prefix + "-danmaku-btn-history"); // ????????????
        this.wraplist = this.auxiliaryArea.find("." + prefix + "-wraplist"); // ?????????
        this.danmakuFunction = this.danmakuList.find("." + prefix + "-danmaku-function"); // ????????????
        this.danmakuManagement = this.danmakuList.find("." + prefix + "-danmaku-management"); // ????????????

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
                '-ad-wrap">???????????????<span class="' +
                prefix +
                '-ad-wrap-time">-</span>???</div>',
            ).appendTo(this.playerWrap);
            this.skipTime = this.adTime.find('.' + prefix + '-ad-wrap-time');
            if (this.player.config.skipable) {
                this.skip = $('<div class="' + prefix + '-ad-skip" name="ad_skip">?????????????????????????????????></div>')
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
        let positionHover = 80; // ?????????????????????????????????
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
        // ????????????????????????????????????
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
    // ????????????????????????????????????????????????
    csIn(isIn: boolean) {
        if (!this.firstScreen || this.player.config.touchMode) {
            if (this.getVideoControlCanHide()) {
                if (isIn || this.mouseInController) {
                    if (this.playerArea.hasClass('video-control-show')) return;
                    if (this.ctrlTimer) return;
                    this.ctrlTimer = window.setTimeout(() => {
                        // ??????100ms??????????????????
                        this.playerArea.addClass('video-control-show');
                        this.ctrlShowTimes += 1;
                        this.controllerShow = true;
                        this.player.trigger(STATE.EVENT.VIDEO_CONTROLBAR, { show: true });
                        this.playerArea.removeClass('progress-shadow-show');
                        this.ctrlTimer = 0;
                    }, 100);
                    // ???????????????????????????????????????
                    this.playerArea.removeClass('progress-shadow-show');
                } else if (this.playerArea.hasClass('video-control-show') || this.ctrlTimer) {
                    if (this.ctrlTimer) {
                        // ?????????????????????????????????????????????????????????????????????????????????
                        clearTimeout(this.ctrlTimer);
                        this.ctrlTimer = 0;
                        this.playerArea.addClass('progress-shadow-show');
                    } else {
                        this.player.controller && this.player.controller.timeLabel.hide();
                        this.controllerShow = false;
                        this.player.trigger(STATE.EVENT.VIDEO_CONTROLBAR, { show: false });
                        if (this.progressTimer) return;
                        this.progressTimer = window.setTimeout(() => {
                            // ??????100ms?????????????????????
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
