import Player from '../player';
import STATE from './state';

// https://info.bilibili.co/pages/viewpage.action?pageId=116249493
interface IPauseConfig {
    id: number;
    img: string;
    gif: string;
    mark?: number;
    delay?: number;
    cb: (isClose?: boolean) => {};
}
// -------之后考虑吧这个方法提到全局----------
interface IimgData {
    img: HTMLImageElement;
    width: number;
    height: number;
}
const imgObj: { [key: string]: IimgData } = {};
const preloadList: Promise<unknown>[] = [];

function load(picture: string) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = picture;
        img.onload = () => {
            imgObj[picture] = {
                img,
                width: img.width,
                height: img.height,
            };
            resolve(imgObj[picture]);
        };
        img.onerror = () => {
            reject();
        };
    });
}
function loadImg(picture: string): Promise<IimgData> {
    return <any>preloadList[<keyof typeof preloadList>picture] || ((<any>preloadList)[picture] = load(picture));
}
// -----------------

export default class PausePanel {
    private config!: IPauseConfig;
    private prefix: string;
    private hasPanel = false;
    private paused = false;
    private ctime = 0;
    private template!: { [key: string]: JQuery; };
    private duration: { [key: string]: number } = {};
    private trackImg: { [key: string]: boolean } = {};
    private mark: string[];
    private canShow = true;
    private delayTimer!: number;
    constructor(private player: Player, private container: JQuery) {
        this.prefix = player.prefix;
        this.mark = [`${this.prefix}-ad`, `${this.prefix}-pop`];
        this.events();
    }

    private render(img: string) {
        return new Promise((resolve, reject) => {
            loadImg(img)
                .then((data: IimgData) => {
                    this.setTime(data.img);
                })
                .catch(() => {
                    if (this.trackImg[img]) return;
                    this.trackImg[img] = true;
                    reject();
                });
        });
    }

    private setTime(img: HTMLImageElement) {
        if (!this.paused) return;
        img.className = `${this.prefix}-pause-panel-img`;

        if (!this.template) {
            this.tpl();
        }
        if (this.mark[this.config.mark!]) {
            this.template.panel.addClass(this.mark[this.config.mark!]);
        }

        this.template.img?.remove();
        this.template.img = $(img);
        this.template.panel.prepend(img);

        this.template.wrap.show();
        this.ctime = Date.now();
    }

    private play() {
        if (!this.paused) return;
        this.paused = false;
        if (!this.hasPanel || !this.template) return;
        this.duration[this.config.id] += Date.now() - this.ctime;

        this.template.wrap.hide();
    }
    // 用来判断是否为第一次显示
    private beforePause() {
        if (this.canShow) {
            this.config = this.player.window['pausePanel']!() || {};
            this.pause();

            if (!this.config.delay) return;

            this.canShow = false;
            this.delayTimer = window.setTimeout(() => {
                this.canShow = true;
            }, this.config.delay);
        }
    }
    private pause() {
        if (this.paused) return;
        this.paused = true;
        if (!this.hasPanel) return;

        this.duration[this.config.id] = this.duration[this.config.id] || 0;

        const img = this.config.gif || this.config.img;
        if (!img) return;

        this.render(img).catch(() => {
            if (this.config.img && img !== this.config.img) {
                this.render(this.config.img);
            }
        });
    }

    private events() {
        this.player.bind(STATE.EVENT.VIDEO_STATE_CHANGE, (e: any, state: number) => {
            if (state !== STATE.V_PAUSE) {
                this.play();
            }
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            this.beforePause();
        });
        this.player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            this.destroy();
        });
        this.player.userLoadedCallback(() => {
            if (!this.player.interactive) {
                this.hasPanel = true;
                if (this.paused) {
                    this.paused = false;
                    this.beforePause();
                }
            }
        });
        this.player.$window
            .off(`beforeunload${this.player.config.namespace}`)
            .on(`beforeunload${this.player.config.namespace}`, () => {
                this.track();
            });
    }

    private tpl() {
        const dom = `<div class="${this.prefix}-pause-panel-wrap">
        <div class="${this.prefix}-pause-panel">
            <span class="${this.prefix}-pause-panel-close"><i class="${this.prefix}-iconfont icon-close"></i></span>
        </div>
        </div>`;
        this.container.append($(dom));

        this.template = {
            wrap: this.container.find(`.${this.prefix}-pause-panel-wrap`),
            panel: this.container.find(`.${this.prefix}-pause-panel`),
            close: this.container.find(`.${this.prefix}-pause-panel-close`),
        };
        this.template.wrap.on('click', () => {
            typeof this.config.cb === 'function' && this.config.cb();
        });
        this.template.close.on('click', () => {
            typeof this.config.cb === 'function' && this.config.cb(true);
            this.play();
            return false;
        });
    }

    private track() {
        if (this.duration) {
            let params = '';
            for (const id in this.duration) {
                if (this.duration.hasOwnProperty(id) && this.duration[id]) {
                    params += `${id}:${this.duration[id]},`;
                }
            }
        }
    }
    private clear() {
        this.delayTimer && clearTimeout(this.delayTimer);
    }
    private destroy() {
        this.canShow = true;
        this.play();
        this.track();
        this.clear();
    }
}
