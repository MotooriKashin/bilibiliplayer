import { Button } from '@jsc/player-auxiliary/js/ui/button';
import Player from '../player';
import svg from './svg';

class TryToSee {
    private player: Player;
    private prefix: string;
    private container: JQuery;
    private initialized = false;
    private template!: { [key: string]: any };
    constructor(player: Player, container: JQuery) {
        this.player = player;
        this.container = container;
        this.prefix = this.player.prefix;
    }
    show() {
        if (this.initialized) {
            this.template.wrap.removeClass('disabled');
        } else {
            this.init();
        }
    }

    hide() {
        if (this.initialized) {
            this.template.wrap.addClass('disabled');
        }
    }
    private globalEvents() {
        this.player.video &&
            $(this.player.video).on('play', () => {
                this.hide();
            });
        this.template.wrap.click((event: any) => {
            // event.stopPropagation();
            if ($(event.target).is(this.template.wrap)) {
                this.player.seek(0);
                this.hide();
            }
        });

        // 重播
        this.template.restart.on('click', () => {
            this.player.track?.heartBeat(1);
            this.player.seek(0);
            this.hide();
        });
        // share
        this.template.share.on('click', () => {
            this.player.endingpanel!.share.show();
            this.hide();
        });
    }

    private init() {
        const prefix = this.prefix;
        this.container.append(this.TPL());
        this.template = {
            gotosee: new Button(this.container.find(`.${prefix}-trytosee-see`), {}),
            wrap: this.container.find(`.${prefix}-trytosee-wrap`),
            restart: this.container.find(`.${prefix}-trytosee-restart`),
            share: this.container.find(`.${prefix}-trytosee-share`),
        };
        this.globalEvents();
        this.container.appendTo(this.player.template.playerWrap);
        this.initialized = true;
    }
    private TPL(): string {
        const prefix = this.prefix;
        return `<div class="${prefix}-trytosee-wrap">
                    <div class="${prefix}-trytosee-panel">
                        <div class="${prefix}-trytosee-title">试看已结束，前往播放页观看完整视频</div>
                        <div class="${prefix}-trytosee-go">
                            <a class="${prefix}-trytosee-see" href="//www.bilibili.com/video/${this.player.config.bvid || `av${this.player.config.aid}`
            }" target="_blank">前往观看</a>
                        </div>
                        <div class="${prefix}-trytosee-btn">
                            <div class="${prefix}-trytosee-restart">${svg.replay}重播</div>
                            <div class="${prefix}-trytosee-share">${svg.share}分享</div>
                        </div>
                    </div>
                </div>
                `;
    }

    private destroy() { }
}

export default TryToSee;
