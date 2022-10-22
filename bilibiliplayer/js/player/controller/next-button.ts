import STATE from '../state';
import Controller from '../controller';
import Player from '../../player';
import { ContentType } from '@jsc/namespace';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

class NextButton {
    private player: Player;
    private prefix: string;
    private controller: Controller;
    private container!: JQuery;
    disabled: boolean = true;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
        this.bind();
    }
    private init() {
        this.container = $(this.TPL());
        this.getTooltip();
        this.controller.startButton.container.after(this.container);
        this.disable();
    }
    private TPL() {
        const prefix = this.prefix;
        const text =
            Number(this.player.config.playerType) === 1 && this.player.config.type !== ContentType.OgvPre
                ? '下一话'
                : '下一个';
        return `
                <div class="${this.prefix}-video-btn  ${this.prefix}-video-btn-next">
            <i class="${this.prefix}-iconfont ${this.prefix}-iconfont-next icon-24nextepisode" data-tooltip="1" data-text="${text}" data-position="top-center" data-change-mode="2"></i>
        </div>`;
    }
    private getTooltip() {
        this.container.find('[data-tooltip="1"]').each(function (i, e) {
            new Tooltip({
                name: 'controll-tooltip',
                target: $(e),
                type: 'tip',
                // arrow: true,
                top: -30,
            });
        });
    }
    private bind() {
        const player = this.player;
        player.bind(STATE.EVENT.VIDEO_INITIALIZED, () => {
            this.enable();
        });
        this.container.on('click', (e) => {
            if (this.container.hasClass('disabled') || this.disabled) {
                return;
            }
            if (this.player.interactive) {
                this.player.interactiveVideoConfig!.portal = 0;
            }
            this.disable();
            this.callNext();
        });
    }

    private callNext() {
        this.player.reloadMedia.callNextPart(
            {
                forceToNext: true,
            },
            () => {
                this.createDisableTip();
            },
            true,
        );
    }

    private createDisableTip() {
        this.disable();
        new Tooltip({
            target: this.container,
            position: 'top-center',
            text: '暂时没有更多啦~',
        });
    }
    disable() {
        this.container.addClass('disabled');
        this.disabled = true;
    }
    enable() {
        if (this.disabled) {
            this.disabled = false;
        }
        this.container.removeClass('disabled');
    }
}

export default NextButton;
