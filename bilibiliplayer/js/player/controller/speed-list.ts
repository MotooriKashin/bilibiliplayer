import Controller from '../controller';
import Player from '../../player';
import SessionController from '../session-controller';
import STATE from '../state';

interface IItem {
    name: string;
    value: number;
}

export default class SpeedList {
    private controller: Controller;
    private prefix: string;
    private player: Player;
    private rates: IItem[] = [
        {
            name: '2.0x',
            value: 2,
        },
        {
            name: '1.5x',
            value: 1.5,
        },
        {
            name: '1.25x',
            value: 1.25,
        },
        {
            name: '1.0x',
            value: 1,
        },
        {
            name: '0.75x',
            value: 0.75,
        },
        {
            name: '0.5x',
            value: 0.5,
        },
    ];
    private speedVal: number;
    private container!: JQuery;
    private speedName!: JQuery;
    private speedList!: JQuery;
    private selectShowTimer!: number | null;
    private selectHideTimer!: number | null;
    constructor(controller: Controller) {
        this.controller = controller;
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.speedVal = Number(SessionController.getSession('video_status', 'videospeed') || 1);
        this.init();
        this.globalEvents();
    }

    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-btn ${prefix}-video-btn-speed">
                <button class="${prefix}-video-btn-speed-name" aria-label="倍速">${this.speedVal === 1 ? '倍速' : this.speedVal === 2 ? '2.0x' : `${this.speedVal}x`
            }</button>
                <div class="${prefix}-video-btn-speed-menu-wrap">
                    <ul class="${prefix}-video-btn-speed-menu">
                        ${this.drawList()}
                    </ul>
                </div>
            </div>
        `;
    }

    private drawList() {
        let speedList = '';
        let active = '';
        const rates = this.rates;
        for (let i = 0; i < rates.length; i++) {
            if (rates[i].value === this.speedVal) {
                active = `${this.prefix}-active`;
            }
            speedList += `<li class="${this.prefix}-video-btn-speed-menu-list ${active}" data-value="${rates[i].value}">${rates[i].name}</li>`;
            active = '';
        }
        return speedList;
    }

    private init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.speedName = this.container.find(`.${this.prefix}-video-btn-speed-name`);
        this.speedList = this.container.find(`.${this.prefix}-video-btn-speed-menu-list`);
        this.container.hover(
            () => {
                this.clearPanelTimer(true);
                this.player.trigger(STATE.EVENT.VIDEO_PANEL_HOVER);
                this.selectShowTimer = window.setTimeout(
                    () => {
                        this.container.addClass(`${this.prefix}-speed-show`);
                    },
                    this.player.config.touchMode ? 0 : 300,
                );
            },
            () => {
                this.selectHideTimer = window.setTimeout(
                    () => {
                        this.clearPanelTimer();
                    },
                    this.player.config.touchMode ? 0 : 200,
                );
            },
        );
        this.speedList.on('click', (e) => {
            const value = Number((<HTMLElement>e.target).dataset && (<HTMLElement>e.target).dataset.value);
            if (value) {
                this.container.removeClass(`${this.prefix}-speed-show`);
                this.value(value, true);
            }
        });
    }

    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_PANEL_HOVER, () => {
            this.clearPanelTimer();
        });
    }

    private clearPanelTimer(hover?: boolean) {
        this.selectShowTimer && clearTimeout(this.selectShowTimer);
        if (this.selectHideTimer) {
            clearTimeout(this.selectHideTimer);
            this.selectHideTimer = null;
            if (!hover) {
                this.container.removeClass(`${this.prefix}-speed-show`);
            }
        }
    }

    private getItem(value = this.speedVal) {
        const result = this.rates.filter((item: IItem) => item.value === value)[0];
        return result ? result : null;
    }

    value(value?: number, manual = false): number {
        if (this.player.config.isPremiere) return <any>undefined;
        const item = this.getItem(value);
        if (value !== undefined && value !== this.speedVal && item) {
            const old = this.rates.indexOf(this.getItem(this.speedVal)!);
            if (old !== -1) {
                this.speedList[old].classList.remove(`${this.prefix}-active`);
            }
            const now = this.rates.indexOf(item);
            if (now !== -1) {
                this.speedList[now].classList.add(`${this.prefix}-active`);
            }
            item.value === 1 ? this.speedName.text('倍速') : this.speedName.text(item.name);
            this.speedVal = value;
            this.player.video.playbackRate = item.value;
            if (manual) {
                this.player.allPlugins?.track();
            }
            if (!this.player.config.ad) {
                SessionController.setSession('video_status', 'videospeed', item.value);
            }
        }
        return this.speedVal;
    }
}
