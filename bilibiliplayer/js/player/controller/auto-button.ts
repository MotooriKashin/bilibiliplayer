import Controller from '../controller';
import Player from '../../player';
import svg from '../svg';

class AutoPlay {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private container!: JQuery;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-btn ${prefix}-video-btn-auto">
                <span class="${prefix}-iconfont ${prefix}-iconfont-auto-off" data-tooltip="1" data-text="关闭自动播放" data-position="top-center" data-change-mode="3">${svg.auto}</span>
                <span class="${prefix}-iconfont ${prefix}-iconfont-auto-on" data-tooltip="1" data-text="打开自动播放" data-position="top-center" data-change-mode="3">${svg.autoClose}</span>
            </div>
            `;
    }

    private init() {
        const player = this.player;
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.onVideoAuto(player.get('video_status', 'auto'));

        this.container.click(() => {
            this.onVideoAuto(!player.get('video_status', 'auto'));
        });
    }

    private onVideoAuto(autoplay: any) {
        const player = this.player;
        if (autoplay) {
            this.container.removeClass(`${this.prefix}-closed`);
        } else {
            this.container.addClass(`${this.prefix}-closed`);
        }
        if (player.video && player.get('video_status', 'auto') !== autoplay) {
            player.set('video_status', 'auto', autoplay);
        }
    }
}

export default AutoPlay;
