import Player from '../../player';
import Controller from '../controller';
import STATE from '../state';
import pipJson from '../../../json/pip.json';
import { AnimationItem } from 'lottie-web';
import { bindAll, browser, createLottieAnimation } from '@shared/utils';

class PipButton {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private disabled = false;
    private redDot: JQuery;
    private pipAnimation!: AnimationItem;
    private pipOutAnimation!: AnimationItem;
    container!: JQuery;
    constructor(controller: Controller) {
        bindAll(['play', 'pipAnimationStop', 'pipOutAnimationStop'], this);
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.redDot = $(`<div class="${this.prefix}-video-btn-reddot"></div>`);
        this.init();
        this.bind();
    }

    private init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.initAnimation();
        this.addRedDot();
        this.disable();
    }

    private initAnimation() {
        this.pipAnimation = createLottieAnimation({
            container: this.container.find('.bp-svgicon-on')[0],
            animationData: pipJson,
            name: 'pip',
        });
        this.pipOutAnimation = createLottieAnimation({
            container: this.container.find('.bp-svgicon-off')[0],
            animationData: pipJson,
            name: 'pipOut',
        });

        this.container[0].addEventListener('mouseenter', this.play);
        this.pipAnimation.addEventListener('complete', this.pipAnimationStop);
        this.pipOutAnimation.addEventListener('complete', this.pipOutAnimationStop);
    }

    private pipAnimationStop() {
        this.pipAnimation.stop();
    }

    private pipOutAnimationStop() {
        this.pipOutAnimation.stop();
    }

    private addRedDot() {
        const skipPipRedDot = this.player.get('video_status', 'skip_pip_red_dot');
        if (!skipPipRedDot) this.container.append(this.redDot);
    }

    private removeRedDot() {
        this.redDot.remove();
        this.player.set('video_status', 'skip_pip_red_dot', true);
    }

    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-btn ${prefix}-video-btn-pip closed">
                <button class="${prefix}-iconfont ${prefix}-iconfont-pip-on" data-tooltip="1" data-text="开启画中画" aria-label="开启画中画" data-position="top-center" data-change-mode="2"><span class="bp-svgicon bp-svgicon-on"></span></button>
                <button class="${prefix}-iconfont ${prefix}-iconfont-pip-off" data-tooltip="1" data-text="关闭画中画" aria-label="关闭画中画" data-position="top-center" data-change-mode="2"><span class="bp-svgicon bp-svgicon-off"></span></button>
            </div>
            `;
    }

    private disable() {
        this.container.addClass('disabled');
        this.disabled = true;
    }

    private bind() {
        this.player.bind(STATE.EVENT.VIDEO_INITIALIZED, () => {
            this.enable();
            if (!this.disabled) {
                if (document['pictureInPictureElement'] && document['pictureInPictureElement'] === this.player.video) {
                    this.container.removeClass('closed');
                }
            }
        });
        this.container.on('click', (e) => {
            if (this.player.config.isPremiere) return;
            if (this.container.hasClass('disabled') || this.disabled) {
                return;
            }
            this.clickHandle();
        });
        this.container.hover(() => {
            this.removeRedDot();
        });
    }

    private play() {
        if (this.container.hasClass('closed')) {
            this.pipAnimation.play();
        } else {
            this.pipOutAnimation.play();
        }
    }

    private enable() {
        if (this.disabled) {
            if (
                (browser.version.browser === 'chrome' && !this.player.video['disablePictureInPicture']) ||
                (browser.version.safari &&
                    !!(
                        this.player.video['webkitSupportsPresentationMode'] &&
                        typeof this.player.video['webkitSetPresentationMode'] === 'function'
                    ))
            ) {
                this.disabled = false;
                this.container.removeClass('disabled');
            }
        }
    }

    private clickHandle() {
        if (browser.version.browser === 'chrome') {
            this.chromeHandlePip();
        } else if (browser.version.safari) {
            this.safariHandlePip();
        }
    }

    private chromeHandlePip() {
        if (!document['pictureInPictureElement']) {
            const pipPromise = this.player.video['requestPictureInPicture']();
            if (pipPromise) {
                pipPromise
                    .then(() => {
                        this.container.removeClass('closed');
                    })
                    .catch(() => {
                        this.player.toast.addTopHinter('当前视频不支持画中画功能', 3500);
                    });
            }
        } else {
            document['exitPictureInPicture']().then(() => {
                this.container.addClass('closed');
            });
        }
    }

    private safariHandlePip() {
        if (this.player.video['webkitPresentationMode'] === 'inline') {
            this.player.video['webkitSetPresentationMode']!('picture-in-picture');
            this.container.removeClass('closed');
        } else if (this.player.video['webkitPresentationMode'] === 'picture-in-picture') {
            this.player.video['webkitSetPresentationMode']!('inline');
            this.container.addClass('closed');
        }
    }

    enterFullScreen() {
        if (!this.disabled) {
            document['pictureInPictureElement'] && document['exitPictureInPicture']();
            this.player.video['webkitPresentationMode'] === 'picture-in-picture' &&
                this.player.video['webkitSetPresentationMode']!('inline');
        }
    }
}

export default PipButton;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface HTMLVideoElement {
        webkitSupportsPresentationMode?: Function;
        webkitSetPresentationMode?: Function;
    }
}