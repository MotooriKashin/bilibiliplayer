import screenfull from '../../plugins/screenfull';
import STATE from '../state';
import Controller from '../controller';
import Player from '../../player';
import { logger } from '../../plugins/internal-logger';
import { browser } from '@shared/utils';

class ScreenButton {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private widescreen!: JQuery;
    private lastScrolltop!: number;
    private timer!: number;
    lastMode!: number; // 只存在默认屏和宽屏
    webFullscreen!: JQuery;
    fullscreen!: JQuery;
    private sendbarShow?: boolean;
    private isNoCursor!: number;
    private sendbarFadeOuting!: number;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
        this.onVideoMode(this.player.state.mode);
    }

    private WIDEBTN_TPL() {
        const prefix = this.prefix;
        return `
        <div class="${prefix}-video-btn ${prefix}-video-btn-widescreen" name="widescreen">
    <i class="${prefix}-iconfont ${prefix}-iconfont-widescreen icon-24wideoff" name="widescreen" data-tooltip="1" data-text="宽屏模式" data-position="top-center" data-change-mode="2"></i>
</div>`;
    }

    private FULLBTN_TPL() {
        const prefix = this.prefix;
        return `
        <div class="${this.prefix}-video-btn ${this.prefix}-video-btn-fullscreen" name="browser_fullscreen">
	<i class="${this.prefix}-iconfont ${this.prefix}-iconfont-fullscreen icon-24fullscreen" name="browser_fullscreen" data-tooltip="1" data-text="进入全屏" data-position="top-right" data-change-mode="2"></i>
</div>`;
    }

    private WEBFULLBTN_TPL() {
        const prefix = this.prefix;
        return `
        <div class="${this.prefix}-video-web-fullscreen" name="web_fullscreen">
	<i class="${this.prefix}-iconfont ${this.prefix}-iconfont-web-fullscreen icon-24webfull" name="web_fullscreen" data-tooltip="1" data-text="网页全屏" data-position="top-right" data-change-mode="2"></i>
</div>`;
    }

    private init() {
        const that = this;
        const player = this.player;
        const template = player.template;
        this.widescreen = $(this.WIDEBTN_TPL()).appendTo(this.controller.container);
        this.fullscreen = $(this.FULLBTN_TPL()).appendTo(this.controller.container);
        this.webFullscreen = $(this.WEBFULLBTN_TPL()).appendTo(this.fullscreen);

        this.widescreen.click(() => {
            if (player.state.mode === STATE.UI_FULL) {
                return false;
            }
            if (player.state.mode === STATE.UI_WIDE) {
                this.onVideoMode(STATE.UI_NORMAL);
            } else {
                this.onVideoMode(STATE.UI_WIDE);
            }
        });
        this.fullscreen.click((event) => {
            if ($(event.target).is(this.webFullscreen) || this.webFullscreen.find(event.target).length) {
                const tempClass = 'temp-page-full';
                if (player.state.mode === STATE.UI_WEB_FULL) {
                    try {
                        (() => {
                            if (window.frameElement) {
                                $(window.frameElement).removeClass(tempClass);
                            }
                        })();
                    } catch (e) {
                        logger.w(<any>e);
                    }
                    that.onVideoMode(this.lastMode === STATE.UI_WIDE ? STATE.UI_WIDE : STATE.UI_NORMAL);
                } else {
                    try {
                        (function () {
                            if (window.frameElement) {
                                const rootHead = $(window.frameElement.parentElement!.ownerDocument!).find('head');
                                $(window.frameElement).addClass(tempClass);
                                if (rootHead.find('.bilibiliHtml5PlayerClass').length > 0) {
                                    rootHead.find('.bilibiliHtml5PlayerClass').remove();
                                }
                                const style = `<style class="bilibiliHtml5PlayerClass">.player-fullscreen-fix {position: fixed;top: 0;left: 0;margin: 0;padding: 0;width: 100%;height: 100%;}.player-fullscreen-fix iframe.${tempClass}{position: fixed!important;border-radius: 0;z-index: 100000!important;left: 0;top: 0;width: 100%!important;height: 100%!important;}</style>`;
                                $(rootHead[0]).append($(style)[0]);
                            }
                        })();
                    } catch (e) {
                        logger.w(<any>e);
                    }
                    that.onVideoMode(STATE.UI_WEB_FULL);
                }
            }
            else {
                this.fullscreenClickHandle();
            }
        });

        if (screenfull) {
            $(player.window.document)
                .off(screenfull.raw['fullscreenchange'] + player.config.namespace)
                .on(screenfull.raw['fullscreenchange'] + player.config.namespace, () => {
                    if (!screenfull.judgeFullscreen(player.window.document)) {
                        that.onVideoMode(this.lastMode === STATE.UI_WIDE ? STATE.UI_WIDE : STATE.UI_NORMAL);
                    }
                    const brow = browser.version;
                    if (
                        that.player.danmaku &&
                        !that.player.danmaku.danmaku.paused &&
                        brow.browser === 'chrome' &&
                        brow.version > 67
                    ) {
                        that.player.danmaku.pause();
                        setTimeout(() => {
                            that.player.danmaku.play();
                        }, 0);
                    }
                    player.trigger(STATE.EVENT.VIDEO_REFULLSCREEN);
                });
        }

        player.bind(STATE.EVENT.VIDEO_MOUSEMOVE, (c: any, e: JQuery.MouseEventBase) => {
            if (e && (player.state.mode === STATE.UI_FULL)) {
                if (
                    e.clientY > template.container.height()! / 3 * 2
                    && (
                        (e.type === "mouseleave") || (
                            e.clientY < template.container.height()! - 31
                            && !template.sendbar.is(e.target)
                            && !template.sendbar.find(e.target).length
                        )
                    )
                ) {
                    if (that.sendbarShow) {
                        return false;
                    }

                    that.sendbarShow = false;
                    that.onCursor();
                    that.onOpacity(true);
                    that.noCursor();
                    that.noOpacity();
                } else if (e.clientY < template.container.height()! / 3 * 2) {
                    if (that.sendbarShow) {
                        return false;
                    }

                    that.sendbarShow = false;
                    that.onCursor();
                    clearTimeout(that.sendbarFadeOuting);
                    that.noCursor(2000);
                    that.noOpacity(500);
                } else {
                    that.sendbarShow = false;
                    that.onCursor();
                    that.onOpacity(true, true);
                }
            }
        })

        player.bind(STATE.EVENT.VIDEO_DESTROY, function () {
            that.destroy();
            that.sendbarShow = false;
            that.onOpacity(false);
        });
    }
    private noCursor(time = 5000) {
        this.isNoCursor = window.setTimeout(() => {
            this.player.template.container.addClass(this.prefix + "-no-cursor");
        }, time);
    }
    private noOpacity(time = 5000) {
        this.sendbarFadeOuting = window.setTimeout(() => {
            this.player.template.controller
                .add(this.player.template.sendbar)
                .stop()
                .animate({
                    opacity: 0,
                }, 200);
        }, time);
    }
    private onOpacity(on?: boolean, std?: boolean) {
        clearTimeout(this.sendbarFadeOuting);

        if (on) {
            if (!this.sendbarShow) {
                if (std) {
                    this.player.template.controller.add(this.player.template.sendbar).css({
                        opacity: 1,
                    })
                } else {
                    this.sendbarShow = true;
                    this.player.template.controller
                        .add(this.player.template.sendbar)
                        .stop()
                        .animate({
                            opacity: 1,
                        }, 200, () => {
                            this.sendbarShow = false;
                        })
                }
            }
        } else {
            this.player.template.controller
                .add(this.player.template.sendbar)
                .stop()
                .css({
                    opacity: 1,
                });
        }
    }

    private onCursor() {
        this.player.template.container.removeClass(this.prefix + "-no-cursor");
        clearTimeout(this.isNoCursor);
    }

    fullscreenClickHandle() {
        const player = this.player;
        if (screenfull.enabled) {
            if (player.state.mode === STATE.UI_FULL) {
                screenfull.exit(player.window.document);
            } else {
                if (player.iframe) {
                    screenfull.request(player.iframe);
                } else {
                    screenfull.request(
                        player.config.sourcePlayer
                            ? player.config.sourcePlayer.template.container[0]
                            : player.template.container[0],
                    );
                }
                this.onVideoMode(STATE.UI_FULL);
            }
        } else {
            if (player.state.mode === STATE.UI_WEB_FULL) {
                this.onVideoMode(STATE.UI_NORMAL);
            } else {
                this.onVideoMode(STATE.UI_WEB_FULL);
            }
        }
    }

    destroy() {
        if (screenfull) {
            $(this.player.window.document).off(screenfull.raw['fullscreenchange'] + this.player.config.namespace);
        }
    }

    onVideoMode(mode: number) {
        const player = this.player;
        const prefix = this.prefix;
        const controller = this.controller;
        const template = player.template;
        const that = this;
        // const mode_change_timer;
        // const current_scrolltop;

        // 首次进来不是默认屏的情况（没有  this.lastMode
        const lastMode = player.state.mode;
        if (lastMode !== mode) {
            switch (lastMode) {
                case STATE.UI_WIDE:
                case STATE.UI_NORMAL:
                    this.lastMode = lastMode;
                    break;
                default:
                    break;
            }
        }
        player.state.mode = mode;
        this.player.bVideo.setupWebContainerState(mode);
        if (player.config.ad) {
            player.config.sourcePlayer!['mode'](mode);
        }

        this.sendbarShow = false;
        this.onCursor();
        this.onOpacity(false, true);

        // controller.widescreen.addClass('video-state-widescreen-off');
        // this.widescreen.find(`>.${prefix}-iconfont`).attr('data-text', '宽屏模式').html(svg.widescreen);
        // this.fullscreen.addClass('video-state-fullscreen-off').find(`.${prefix}-iconfont-fullscreen`).attr('data-text', '进入全屏');
        // this.fullscreen.find(`>.${prefix}-iconfont`).html(svg.fullscreen);
        // controller.webFullscreen.addClass('video-state-web-fullscreen-off');
        // this.webFullscreen.find(`>.${prefix}-iconfont`).attr('data-text', '网页全屏').html(svg.fullpage);
        this.widescreen
            .find(">." + prefix + "-iconfont")
            .removeClass("icon-24wideon")
            .addClass("icon-24wideoff")
            .attr("data-text", "宽屏模式");
        this.fullscreen
            .addClass("video-state-fullscreen-off")
            .find("." + prefix + "-iconfont-fullscreen")
            .attr("data-text", "进入全屏");
        this.webFullscreen
            .find(">." + prefix + "-iconfont")
            .removeClass("icon-24exitwebfull")
            .addClass("icon-24webfull")
            .attr("data-text", "网页全屏");
        template.controller.css("display", "");
        template.sendbar.css("display", "");

        player.$parent.removeClass('wide');

        template.container
            .removeClass('mode-widescreen')
            .removeClass('mode-webfullscreen')
            .removeClass('mode-fullscreen');
        player.$body.removeClass('player-fullscreen-fix');

        if (screenfull && mode !== STATE.UI_FULL && screenfull.judgeFullscreen(player.window.document)) {
            screenfull.toggle(player.window.document);
        }

        if (lastMode === STATE.UI_WEB_FULL || lastMode === STATE.UI_FULL) {
            setTimeout(() => {
                player.controller.setDocumentScrollElementRect(this.lastScrolltop || 0);
            }, 100);
            // 之所以会有这么个检测，还是因为视频初始在太下面了，希望今年的改版可以把视频弄上去一点
            if (browser.version.safari) {
                setTimeout(() => {
                    if (player.controller.getDocumentScrollElementRect().scrollTop !== this.lastScrolltop) {
                        player.controller.setDocumentScrollElementRect(this.lastScrolltop || 0);
                    }
                    $(window).resize();
                }, 1000);
            }
        }

        if (controller.config['setting_config']['fullscreensend']) {
            template.sendbar[mode === STATE.UI_FULL ? 'addClass' : 'removeClass']('active');
        } else {
            template.sendbar.removeClass('active');
        }

        if (mode === STATE.UI_NORMAL) {
            // this.controller.resetSendBar();
            player.set('video_status', 'iswidescreen', false);
        } else if (mode === STATE.UI_WIDE) {
            // controller.widescreen.removeClass('video-state-widescreen-off');
            // this.widescreen.addClass('closed');
            // this.controller.resetSendBar();
            this.widescreen.find(">." + prefix + "-iconfont")
                .addClass("icon-24wideon")
                .removeClass("icon-24wideoff")
                .attr("data-text", "退出宽屏");

            player.$parent.addClass('wide');
            template.container.addClass('mode-widescreen');
            player.set('video_status', 'iswidescreen', true);
        } else if (mode === STATE.UI_WEB_FULL) {
            // controller.webFullscreen.removeClass('video-state-web-fullscreen-off');
            // this.controller.appendSendBar();
            // this.webFullscreen.addClass('closed');
            this.webFullscreen.find(">." + prefix + "-iconfont")
                .addClass("icon-24exitwebfull")
                .removeClass("icon-24webfull")
                .attr("data-text", "退出网页全屏");
            template.container.addClass('mode-webfullscreen');
            this.lastScrolltop = player.controller ? player.controller.getDocumentScrollElementRect().scrollTop : 0;
            player.$body.addClass('player-fullscreen-fix');
        } else if (mode === STATE.UI_FULL) {
            // this.controller.appendSendBar();
            this.controller.pipButton && this.controller.pipButton.enterFullScreen();
            // this.fullscreen.removeClass('video-state-fullscreen-off');
            // this.fullscreen.addClass('closed');
            this.fullscreen
                .removeClass("video-state-fullscreen-off")
                .find("." + prefix + "-iconfont-fullscreen")
                .attr("data-text", "退出全屏");
            const currentScrolltop = player.controller ? player.controller.getDocumentScrollElementRect().scrollTop : 0;
            currentScrolltop && (this.lastScrolltop = currentScrolltop);
            template.container.addClass('mode-fullscreen');
            player.$body.addClass('player-fullscreen-fix');
            this.noCursor();
            this.noOpacity();
            player.trigger(STATE.EVENT.VIDEO_MOUSEMOVE);
        }
        clearTimeout(this.timer);
        player.trigger(STATE.EVENT.VIDEO_RESIZE, mode);
        player.trigger(STATE.EVENT.VIDEO_FULLSCREEN_MODE_CHANGED);
        this.timer = window.setTimeout(() => {
            const width = player.template && player.template.playerWrap.width();
            const height = player.template && player.template.playerWrap.height();
            if (that.controller.lastWidth !== width || that.controller.lastHeight !== height) {
                that.controller.lastWidth = width!;
                that.controller.lastHeight = height!;
                player.trigger(STATE.EVENT.VIDEO_PLAYER_RESIZE);
            }
        }, 50);
        // noly for ie 11
        // clearTimeout(mode_change_timer);
        // mode_change_timer = setTimeout(function() {
        //     player.trigger(STATE.EVENT.VIDEO_RESIZE, mode);
        // }, 500);
        if (player.template.videoWrp.hasClass('video-size-4-3')) {
            player.template.videoWrp
                .find('video')
                .css(
                    'width',
                    (((player.template.videoWrp.height()! / 3) * 4) / player.template.videoWrp.width()!) * 100 + '%',
                );
        } else {
            player.template.videoWrp.find('video').css('width', '');
        }
    }
}

export default ScreenButton;
