import svg from '../player/svg';

import '../../css/link-dm.less';
import { PopupBase } from '../player/popup/popup-base';
import { fmSeconds } from '@shared/utils';

export interface IVideoSize {
    w: number;
    h: number;
    vw: number;
    vh: number;
}
interface IConfig {
    container: HTMLElement;
    ppx: string;
    aid: number;
    visible?: boolean;
    dragFlag?: boolean;
    ctime: () => number;
    cb: (name: string, info: string, pause?: boolean) => void;
    getOptions: () => any;
    videoSize: () => IVideoSize;
    update: (card: ILinkDM) => void;
}

export interface ILinkDM {
    from: number;
    to: number;
    dmid: string;
    posY: number;
    posX: number;
    aid?: number;
    key?: string;
    bvid?: string;
    epid?: string;
    text: string;
    pic?: string;
    duration?: number;
    showed?: boolean;
    handled?: boolean;
}

const NORMAL_WIDTH = 667;
export default class LinkDM extends PopupBase {
    private container: HTMLElement;
    private ppx: string;
    private list: ILinkDM[] = [];
    private template!: {
        [key: string]: HTMLElement;
    };
    private config: Required<IConfig>;
    private hasLink!: boolean;

    private startY!: number;
    private endY!: number;
    private height!: number;
    private posY!: number;
    private posX!: number;

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.container = opt.container;
        this.ppx = opt.ppx;
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
        this.popupName = PopupBase.LIST.LINK;
        this.init();
    }

    private init() {
        const ppx = this.ppx;
        const ctr = this.config.container;
        ctr.insertAdjacentHTML('beforeend', this.tpl());

        this.template = {
            wrap: ctr.querySelector(`.${ppx}-link-wrap`)!,
            link: ctr.querySelector(`.${ppx}-link`)!,
            msg: ctr.querySelector(`.${ppx}-link-msg`)!,
            pic: ctr.querySelector(`.${ppx}-link-pic`)!,
            time: ctr.querySelector(`.${ppx}-link-time`)!,
        };
        super.addCloseBtn(this.template.link);
        this.resize();
        if (!this.config.dragFlag) {
            this.template.link.addEventListener('click', (e) => {
                this.config.cb(
                    'dm_link',
                    JSON.stringify({
                        target_avid: this.card.aid,
                        avid: this.config.aid,
                        dm_title: this.card.text,
                    }),
                    true,
                );
                let url = '//www.bilibili.com/';
                if (this.card.epid) {
                    url += 'bangumi/play/' + this.card.epid;
                } else if (this.card.bvid) {
                    url += 'video/' + this.card.bvid;
                } else if (this.card.aid) {
                    url += 'video/av' + this.card.aid;
                }
                this.card && window.open(url);
                this.card.handled = true;
                return false;
            });
            return;
        }
        const thumbMove = (e: MouseEvent) => {
            this.endY = e.clientY;
            this.move();
        };

        const thumbUp = (e: MouseEvent) => {
            document.removeEventListener('mouseup', thumbUp);
            this.mouseUp();
            document.removeEventListener('mousemove', thumbMove);
        };

        this.template.link.addEventListener('mousedown', (e: MouseEvent) => {
            this.startY = e.clientY;
            this.endY = e.clientY;
            this.height = this.template.wrap.offsetHeight;

            document.addEventListener('mousemove', thumbMove);
            document.addEventListener('mouseup', thumbUp);
        });
    }
    private mouseUp() {
        if (!this.card) {
            return;
        }
        this.card.posY = Number(this.posY.toFixed(1));
        this.config.update(this.card);
    }

    private move() {
        const delta = this.endY - this.startY;
        if (!this.card || !delta) {
            return;
        }
        let { scaleP, scaleS } = this.getScale();

        let y = this.card.posY + delta / scaleP;
        const range = this.height * 0.25;

        y = Math.max(y, range / scaleP);
        y = Math.min(y, (this.height - range) / scaleP);

        this.posY = y;

        this.template.link.style.top = `${this.posY * scaleP}px`;
    }

    resize() {
        super.resize();
        if (!this.card) return;

        let width = this.template.wrap.offsetWidth;
        this.height = this.template.wrap.offsetHeight;
        this.scale = <any>null;
        let { scaleP, scaleS } = this.getScale();
        width = Math.min(width, 1248);

        this.card.posX = this.card.posX || NORMAL_WIDTH / 2;

        let y = this.card.posY || (this.height * 0.75) / scaleP;

        y = Math.max(y, (this.height * 0.25) / scaleP);
        y = Math.min(y, (this.height * 0.75) / scaleP);

        const d = y - this.card.posY;
        if (d > 1 || d < -1) {
            this.card.posY = y;
            this.config.update(this.card);
        }

        this.template.link.style.cssText = `transform: translate(-50%,-50%) scale(${scaleS}); left:${this.card.posX * scaleP
            }px;top:${this.card.posY * scaleP}px;`;
    }
    getScale() {
        return super.getScale(this.template.wrap.offsetWidth, this.scale);
    }
    add(list: ILinkDM[]) {
        this.list = this.list.concat(list);
        this.list.sort((pre: ILinkDM, next: ILinkDM) => {
            return pre.from - next.from;
        });
    }
    update(list: ILinkDM[]) {
        this.delete();
        this.hasLink = false;
        this.list = list;
        this.list.sort((pre: ILinkDM, next: ILinkDM) => {
            return pre.from - next.from;
        });
        this.render();
    }
    delete() {
        this.list.length = 0;
        this.hide();
    }
    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.config.visible = value;
                if (value) {
                    this.render();
                } else {
                    this.hide();
                }
                break;
            default:
                break;
        }
    }
    private render() {
        this.timeUpdate(this.config.ctime());
    }

    timeUpdate(time: number) {
        if (!this.config.dragFlag && !this.config.visible) {
            return;
        }
        for (let i = 0; i < this.list.length; i++) {
            const link = this.list[i];
            const [sTime, eTime] = [link.from, link.to];
            if (link.from <= time && time <= link.to) {
                if (super.renderShrink(link, time)) {
                    return;
                }
                if (this.hasLink && link === this.card) {
                    this.renderCloseTime(link.from, link.to, time);
                    return;
                }
                this.hasLink = true;
                this.card = link as ILinkDM;
                this.resize();

                this.template.msg.textContent = link.text;
                if (link.pic) {
                    (<any>this).template.pic['src'] = link.pic;
                    this.template.pic.onload = this.preShow.bind(this);
                }
                if (this.config.dragFlag) {
                    this.preShow();
                }
                return;
            }
        }
        this.card = null;
        this.hide();
    }
    preShow() {
        const link = this.card;
        if (link.duration) {
            this.template.time.textContent = fmSeconds(link.duration);
            this.template.time.classList.add(`${this.ppx}-link-time-show`);
        }
        this.show();
        if (!link.showed) {
            link.showed = true;
            this.config.cb('dm_link_show', link.dmid);
        }
    }

    private hide() {
        super.renderCloseShrink();
        if (!this.template.link.classList.contains(`${this.ppx}-show`)) {
            return;
        }
        this.template.link.className = `${this.ppx}-link`;
        this.template.link.classList.add(`${this.ppx}-hide`);
        this.hasLink = false;
    }
    private show() {
        this.hasLink = true;
        this.template.link.classList.add(`${this.ppx}-show`);
        this.template.link.classList.remove(`${this.ppx}-hide`);

        super.showBaseAnimate(this.template.link, this.getScale().scaleS);
    }
    closeHandler(e: MouseEvent) {
        super.track(this.config.cb);
        this.hide();
        // this.list?.splice(this.list.indexOf(this.card), 1);
        e.stopPropagation();
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-link-wrap">
            <div class="${ppx}-link">
                <div class="${ppx}-link-icon">
                    <img class="${ppx}-link-pic" />
                    <span class="${ppx}-link-time"></span>
                </div>
                <div class="${ppx}-link-msg"></div>
                <div class="${ppx}-link-line"></div>
                <div class="${ppx}-link-play">${svg.link}</div>
            </div>
            </div>`;
    }
}
