import Player from '../../player';
import Controller from '../controller';
import svg from '../svg';
import STATE from '../state';

class SyncButton {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    container!: JQuery;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-btn ${prefix}-video-btn-sync">
                <button class="${prefix}-iconfont" data-tooltip="1" data-text="同步播放进度" aria-label="同步播放进度" data-position="top-center" data-change-mode="2">${svg.sync}</button>
            </div>
            `;
    }
    private init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.bind();
    }
    private bind() {
        const player = this.player;
        this.container.on('click', (e) => {
            if (this.controller.getLastState() === STATE.V_PLAY) {
                player.pause();
            }
            player.premiereSeekSync();
        });
        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK_END, () => {
            player.syncEnable = true;
        });
    }
}

export default SyncButton;
