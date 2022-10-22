import Player from '../../player';
import Controller from '../controller';
import { ContentType } from '@jsc/namespace';

class StartButton {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    // private btnAnimation!: AnimationItem;
    private lastState!: string;
    container!: JQuery;
    constructor(controller: Controller) {
        // Utils.bindAll(['btnAnimationStop'], this);
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
    }
    TPL() {
        const prefix = this.prefix;
        return `<div name="play_button" class="${prefix}-video-btn ${prefix}-video-btn-start video-state-pause">
    <i class="${prefix}-iconfont ${prefix}-iconfont-start icon-24play" name="play_button"></i>
    <i class="${prefix}-iconfont ${prefix}-iconfont-pause icon-24pause" name="pause_button"></i>
</div>`;
    }
    init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        // this.initAnimation(toPlayJson);
        this.disable();
        this.bind();
    }

    bind() {
        const player = this.player;
        const template = player.template;
        const that = this;
        let info = 'play_button';
        this.container.bind('click', function (event, fromTrigger) {
            if (player.config.type === ContentType.PugvCenter) {
                return false;
            }
            if (fromTrigger && player.config.ad) {
                const url = player.config.ad.trim();
                if (/^https?:\/\/.+/.test(url)) {
                    window.open(url);
                    player.pause(fromTrigger);
                    return false;
                }
            }
            if ($(this).hasClass('disabled')) {
                return false;
            }
            if (player.config.isPremiere && player.checkPlayEnded()) {
                if (Number(player.checkPremiereStatus()) === 1) {
                    return false;
                }
                that.controller.premiereToNormalStyle();
            }
            if ($(this).hasClass('video-state-pause')) {
                player.play(fromTrigger);
                info = fromTrigger ? 'play_screen' : 'play_button';
            } else {
                player.pause(fromTrigger);
                info = fromTrigger ? 'pause_screen' : 'pause_button';
            }
        });
        template.videoWrp.click((event: JQuery.Event) => {
            this.player.danmaku?.dmClick(event);
            event.stopPropagation();
            if (!player.config.touchMode) {
                this.toggle();
            }
        });
        template.videoState.click((event) => {
            event.stopPropagation();
            this.toggle();
        });
    }
    toggle() {
        if (this.player.state.panoramicGesture) {
            this.player.state.panoramicGesture = false;
            return true;
        }
        this.container.trigger('click', [true]);
    }
    setState(state: string, fromTrigger?: any) {
        const container = this.container;
        const button = this.container.find('button');
        const playerArea = this.player.template.playerArea;
        const template = this.player.template;
        if (state === 'play') {
            container.removeClass('video-state-pause');
            container.removeClass('video-state-buff');
            playerArea.removeClass('video-state-pause');
            playerArea.removeClass('video-state-buff');
            button.attr('aria-label', '暂停');
        } else if (state === 'pause') {
            container.addClass('video-state-pause');
            container.removeClass('video-state-buff');
            playerArea.addClass('video-state-pause');
            playerArea.removeClass('video-state-buff');
            button.attr('aria-label', '播放');
        } else if (state === 'buff') {
            container.removeClass('video-state-pause');
            container.addClass('video-state-buff');
            playerArea.removeClass('video-state-pause');
            playerArea.addClass('video-state-buff');
        } else if (state === 'ended') {
            container.addClass('video-state-pause');
            container.removeClass('video-state-buff');
            playerArea.removeClass('video-state-pause');
            playerArea.removeClass('video-state-buff');
        }
    }
    enable() {
        this.container.removeClass('disabled');
    }
    disable() {
        this.container.addClass('disabled');
    }
}

export default StartButton;
