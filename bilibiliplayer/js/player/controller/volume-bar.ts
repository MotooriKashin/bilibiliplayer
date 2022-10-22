import STATE from '../state';
import Controller from '../controller';
import Player from '../../player';
import { ContentType } from '@jsc/namespace';
import { Slider } from '@jsc/player-auxiliary/js/ui/slider';
import { IEvent } from '@jsc/player-auxiliary/js/ui/base';
import { bindAll } from '@shared/utils';

class VolumeBar {
    lastVideoVolume!: number;
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private volumeLock!: boolean;
    private showHintTimer!: number;
    private container!: JQuery;
    volumeWrp!: JQuery;
    private currentVolume!: JQuery;
    private volumebar!: Slider;
    private panelHideTimer!: number | null;
    private panelShowTimer!: number | null;
    // private volumeAnimation!: AnimationItem;
    // private volumeMaxAnimation!: AnimationItem;
    // private volumeMinAnimation!: AnimationItem;
    constructor(controller: Controller) {
        bindAll(['play', 'volumeAnimationStop', 'volumeMinAnimationStop', 'volumeMaxAnimationStop'], this);
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
        // this.initAnimation();
    }
    private TPL() {
        const prefix = this.prefix;
        return `<div class="${prefix}-video-btn ${prefix}-video-btn-volume" name="vol">
        <i class="${prefix}-iconfont ${prefix}-iconfont-volume icon-24soundsmall" name="vol"></i>
        <i class="${prefix}-iconfont ${prefix}-iconfont-volume-max icon-24soundlarge" name="vol"></i>
        <i class="${prefix}-iconfont ${prefix}-iconfont-volume-min icon-24soundoff" name="vol"></i>
        <div class="${prefix}-video-volumebar-wrp">
            <div class="${prefix}-video-volume-num"></div>
            <div class="${prefix}-video-volumebar"></div>
        </div>
    </div>`;
    }
    private init() {
        const player = this.player;
        const that = this;
        const prefix = this.prefix;
        // 声音
        const type = this.player.config.type;
        if ((type === ContentType.OgvPre || type === ContentType.PugvCenter) && !window.userSetVol) {
            this.player.videoSettings['video_status']['volume'] = 0;
        }
        this.lastVideoVolume = player.config.ad ? 0.67 : this.controller.config['video_status']['volume'];
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.volumeWrp = this.container.find(`.${prefix}-video-volumebar-wrp`);
        this.currentVolume = this.container
            .find(`.${prefix}-video-volume-num`)
            .html(String(Math.round(this.lastVideoVolume * 100)));
        const volumebarContainer = this.container.find(`.${prefix}-video-volumebar`);
        this.volumebar = new Slider(volumebarContainer, {
            name: "vol",
            aclinic: false,
            width: 30,
            height: 60,
            value: this.lastVideoVolume,

            move: (e: IEvent) => {
                if (player.video) {
                    that.setVolume(e.value, true);
                }
            },
            change: (e: IEvent) => {
                if (player.video) {
                    that.setVolume(e.value, true);
                    if (e.manual) {
                        // 用来区分当前窗口用户是否设置过音量
                        window.userSetVol = true;
                    }
                }
                if (!player.config.ad) {
                    player.set('video_status', 'volume', e.value);
                }
                const v = e.value * 100;
            }
        });
        volumebarContainer[0].addEventListener('mousedown', () => {
            this.container.addClass('mouse-hold');

            $(document).one('mouseup', () => {
                this.container.removeClass('mouse-hold');
            });
        });
        this.setVolume(this.lastVideoVolume);
        this.globalEvents();
    }

    private globalEvents() {
        const prefix = this.prefix;
        const player = this.player;
        this.container.hover(
            () => {
                this.clearPanelTimer(true);
                this.player.trigger(STATE.EVENT.VIDEO_PANEL_HOVER);
                this.panelShowTimer = window.setTimeout(
                    () => {
                        this.volumeWrp.show();
                    },
                    this.player.config.touchMode ? 0 : 300,
                );
            },
            () => {
                this.panelHideTimer = window.setTimeout(
                    () => {
                        this.clearPanelTimer();
                    },
                    this.player.config.touchMode ? 0 : 200,
                );
            },
        );
        this.player.bind(STATE.EVENT.VIDEO_PANEL_HOVER, () => {
            this.clearPanelTimer();
        });
        this.volumeWrp.click((event) => {
            if (this.player.config.type === ContentType.PugvCenter) {
                event.cancelable && event.stopPropagation();
                event.preventDefault();
            }
        });
        // 静音
        if (!this.player.config.touchMode) {
            this.container.find(`>.${prefix}-iconfont`).click((event) => {
                if (this.player.config.type === ContentType.PugvCenter) {
                    event.cancelable && event.stopPropagation();
                    event.preventDefault();
                }
                if ($(event.target).is(this.volumeWrp) || this.volumeWrp.find(event.target).length) {
                    return false;
                } else if (player.video) {
                    if (player.video.volume === 0) {
                        this.setVolume(this.lastVideoVolume || 1);
                        this.volume(player.video.volume);
                        window.userSetVol = true;
                    } else {
                        this.setVolume(0);
                        this.volume(player.video.volume);
                    }
                    if (!player.config.ad) {
                        player.set('video_status', 'volume', player.video.volume);
                    }
                }
            });
        }

        $(document)
            .off(`mousewheel${player.config.namespace} DOMMouseScroll${player.config.namespace}`)
            .on(`mousewheel${player.config.namespace} DOMMouseScroll${player.config.namespace}`, (e: any) => {
                if (
                    !this.controller.getPanoramicFocus() &&
                    (Number(player.state.mode) === Number(STATE.UI_FULL) ||
                        Number(player.state.mode) === Number(STATE.UI_WEB_FULL))
                ) {
                    const delta =
                        e['originalEvent']['wheelDelta'] || // chrome & ie
                        (e['originalEvent']['detail'] && -e['originalEvent']['detail']); // firefox
                    let volChange = delta > 0 ? 0.03 : -0.03;
                    if (e['originalEvent']['deltaMode'] === 0) {
                        volChange = delta / 8000;
                    }
                    if (volChange > 0) {
                        this.volume(Math.min(player.video.volume + volChange, 1), true);
                    } else if (volChange < 0) {
                        this.volume(Math.max(player.video.volume + volChange, 0), true);
                    }
                }
            });
        player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
    }
    private clearPanelTimer(hover?: boolean) {
        this.panelShowTimer && clearTimeout(this.panelShowTimer);
        if (this.panelHideTimer) {
            clearTimeout(this.panelHideTimer);
            this.panelHideTimer = null;
            if (!hover) {
                this.volumeWrp.css('display', '');
            }
        }
    }

    setVolume(volume: number, record?: boolean) {
        const player = this.player;
        const lastVolume = player.video.volume;
        if (player.video) {
            if (volume > 1) {
                volume = 1;
            } else if (volume < 0) {
                volume = 0;
            }
            player.video.volume = volume;
            this.container.removeClass('video-state-volume-max').removeClass('video-state-volume-min');
            if (volume === 0) {
                player.video.muted = true;
                this.container.addClass('video-state-volume-min');

            } else {
                player.video.muted = false;
            }
            if (volume >= 0.5) {
                this.container.addClass('video-state-volume-max');
            }
            if (record && !player.config.ad && volume !== 0) {
                this.lastVideoVolume = volume;
            }
            this.currentVolume.html(String(Math.round(volume * 100)));
        }
    }
    private showHint(volume: number) {
        const prefix = this.prefix;
        const that = this;
        clearTimeout(this.showHintTimer);
        if (!this.player.template.volumeHint) {
            this.player.template.volumeHint = $(`
            <div class="${prefix}-volumeHint">
                <span class="${prefix}-volumeHint-icon">
                    <i class="${prefix}-iconfont ${prefix}-iconfont-volume icon-24soundsmall"></i>
                    <i class="${prefix}-iconfont ${prefix}-iconfont-volume-max icon-24soundlarge"></i>
                    <i class="${prefix}-iconfont ${prefix}-iconfont-volume-min icon-24soundoff"></i>
                </span>
                <span class="${prefix}-volumeHint-text"></span>
            </div>`).appendTo(this.player.template.playerWrap);
            this.player.template.volumeHintIcon = this.player.template.volumeHint.find(`.${prefix}-volumeHint-icon`);
            this.player.template.volumeHintText = this.player.template.volumeHint.find(`.${prefix}-volumeHint-text`);
        }
        this.player.template.volumeHint.stop().css('opacity', 1).show();
        this.player.template.volumeHintText.html(`${volume}%`);
        this.player.template.volumeHintIcon.removeClass('video-state-volume-min').removeClass('video-state-volume-max');
        if (volume === 0) {
            this.player.template.volumeHintIcon.addClass('video-state-volume-min');
            this.player.template.volumeHintText.html('静音');
        } else if (volume >= 50) {
            this.player.template.volumeHintIcon.addClass('video-state-volume-max');
        }
        this.showHintTimer = window.setTimeout(() => {
            that.player.template.volumeHint.animate({ opacity: 0 }, 300, function () {
                $(this).hide();
            });
        }, 1000);
    }
    volume(vol: number, showHint?: boolean) {
        this.volumebar.value(vol);
        if (showHint) {
            const volume = vol * 100;
            this.showHint(Math.round(volume));
        }
    }

    // 静音/非静音模式切换
    toggleMutedMode(muted: boolean) {
        if (!this.player.video) return;
        if (muted) {
            this.setVolume(0);
            this.volume(this.player.video.volume, true);
        } else {
            this.setVolume(this.lastVideoVolume || 0.66);
            this.volume(this.player.video.volume, true);
            window.userSetVol = true;
        }
        if (!this.player.config.ad) {
            this.player.set('video_status', 'volume', this.player.video.volume);
        }
    }

    destroy() {
        $(document).off(`mousewheel${this.player.config.namespace} DOMMouseScroll${this.player.config.namespace}`);
        this.player.$window.unbind('mouseup' + this.player.config.namespace + 'volume');
    }
}

export default VolumeBar;
