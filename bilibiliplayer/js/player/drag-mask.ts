import Controller from './controller';
import svg from './svg';
import STATE from './state';

export default class DragMask {
    private controller: Controller;
    private prefix: string;
    private container!: JQuery;
    private stateElement!: JQuery;
    private stateToken = 'video-state-pause';
    constructor(controller: Controller) {
        this.controller = controller;
        this.prefix = controller.prefix + '-drag-mask';
        this.init();
    }

    private init() {
        if (this.container && this.container[0]) return;
        const player = this.controller.player;
        const playerWrap = player.template.playerWrap;
        const that = this;
        this.container = $(this.TPL()).appendTo(playerWrap);
        this.stateElement = playerWrap.find(`.${this.prefix}-state`);
        if (player.state.video_state === STATE.V_PLAY) {
            this.stateElement.removeClass(this.stateToken);
        }
        this.stateElement.on('click', function (e) {
            e.stopPropagation();
            if ($(this).hasClass(that.stateToken)) {
                player.play();
            } else {
                player.pause();
            }
        });
        playerWrap.find(`.${this.prefix}-close`).on('click', function (e) {
            e.stopPropagation();
            const toggleMiniPlayer = player.globalFunction.WINDOW_AGENT.toggleMiniPlayer;
            if (typeof toggleMiniPlayer === 'function') {
                toggleMiniPlayer(false);
            }
        });
        player.bind(STATE.EVENT.VIDEO_STATE_CHANGE, (e: any, state: number) => {
            if (state === STATE.V_PLAY || state === STATE.V_BUFF) {
                this.stateElement.removeClass(this.stateToken);
            } else {
                this.stateElement.addClass(this.stateToken);
            }
        });
    }

    private TPL() {
        return `
            <div class="${this.prefix}-close"><i class="${this.prefix}-iconfont icon-close"></i></div>
            <div class="${this.prefix}-state ${this.stateToken}">
                <span class="${this.prefix}-icon ${this.prefix}-icon-play">${svg.newPlayState}</span>
                <span class="${this.prefix}-icon ${this.prefix}-icon-pause">${svg.newPauseState}</span>
            </div>
        `;
    }
}
