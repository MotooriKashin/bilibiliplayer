import svg from '../player/svg';
import type { AnimationItem } from 'lottie-web';
import smoke from '../const/smoke.json';
import { IActionStateInterface } from '../player/global-function';
import { browserPrefix, ibrowserPrefix } from '@shared/utils';

import '../../css/foolsday.less';

interface IRange {
    speed: number;
    width: number;
}
interface IFoolsConfig {
    container: HTMLElement;
    /**
     * 三连容器
     */
    like: HTMLElement;
    ppx: string;
    visible: boolean;
    ctime: () => number;
    getRange: (width: number) => IRange;
    getFontsize: () => number;
    track: () => void;
    getUserState: () => IActionStateInterface;
}
interface IShow {
    duration: number;
    text: string;
    icon: string;
    middle: string;
    result: string;
    userState: IActionStateInterface;
}

export default class Foolsday {
    private inited!: boolean;
    private paused!: boolean;
    private wrap!: HTMLElement;
    private barStop!: boolean;
    private dmshow!: boolean;
    private ppx: string;
    /**
     * 组件显示开始时间
     */
    private stime!: number;
    private distance!: IRange;
    private animate!: number;
    private offsetWidth!: number;
    private info!: IShow;
    private loadAnimation!: AnimationItem;
    private animationOnce!: boolean;
    private trackShow!: boolean;
    private template!: {
        icon: HTMLImageElement;
        [key: string]: HTMLElement;
    };

    constructor(private config: IFoolsConfig) {
        this.ppx = config.ppx;
    }

    show(info: IShow) {
        this.info = info;
        this.dispose();

        this.barStop = false;
        this.animationOnce = false;
        this.dmshow = false;
        this.trackShow = false;

        if (!this.inited) {
            this.inited = true;
            const ctr = this.config.container;
            ctr.insertAdjacentHTML('beforeend', this.tpl());
            this.template = {
                dm: ctr.querySelector(`.${this.ppx}-fools-dm`)!,
                dmAnimate: ctr.querySelector(`.${this.ppx}-fools-dm-animate`)!,
                dmstyle: ctr.querySelector(`.${this.ppx}-fools-dm-style`)!,
                dmText: ctr.querySelector(`.${this.ppx}-fools-dm-text`)!,
                scale: ctr.querySelector(`.${this.ppx}-fools-scale`)!,
                fools: ctr.querySelector(`.${this.ppx}-fools`)!,
                icon: ctr.querySelector(`.${this.ppx}-fools-icon`)!,
                text: ctr.querySelector(`.${this.ppx}-fools-text`)!,
                like: ctr.querySelector(`.${this.ppx}-fools-like`)!,
                bar: ctr.querySelector(`.${this.ppx}-fools-bar-bg`)!,
            };
            this.wrap = ctr.querySelector(`.${this.ppx}-fools-wrap`)!;
            this.template.like.appendChild(this.config.like);
        }

        this.stime = this.config.ctime();

        this.wrap.classList.remove(`${this.ppx}-hide`);
        this.template.dm.style.cssText = `font-size:${this.config.getFontsize() * 25}px`;

        this.template.dmText.textContent = info.text;
        this.template.icon.src = info.icon;
        this.template.text.textContent = info.middle;

        this.resize();
        this.animate = window.requestAnimationFrame(() => {
            this.timeUpdate(this.config.ctime());
        });
    }

    /**
     * 容器尺寸变化
     */
    resize() {
        let width = this.wrap.offsetWidth;

        let scale = width / 624;
        scale = Math.max(scale, 1);
        scale = Math.min(scale, 2);

        this.template.scale.style.cssText += browserPrefix('transform', `scale(${scale})`);

        const height = this.wrap.offsetHeight;
        const dmH = this.template.dm.offsetHeight;
        let bottom = height * 0.5;
        if (dmH / 2 + 20 + 50 * scale > bottom / 2) {
            bottom = bottom / 2 + dmH / 2 + 20 + 50 * scale;
        }
        this.template.dm.style.bottom = bottom + 'px';
    }
    /**
     * 外部调用 动画是否暂停
     */
    pause(paused: boolean) {
        this.paused = paused;
        if (!paused) {
            this.timeUpdate(this.config.ctime());
            this.template.dm.classList.remove(`${this.ppx}-paused`);
        } else {
            this.template.dm.classList.add(`${this.ppx}-paused`);
        }
    }

    /**
     * 三个按钮  操作了任何一个，置为成功状态
     */
    complete(over?: boolean) {
        if (over) {
            this.barStop = true;
            this.paused = false;
            this.stime = this.config.ctime() - 4;
            this.timeUpdate(this.config.ctime());
            this.template.dm.classList.remove(`${this.ppx}-paused`);
        }
    }

    /**
     * 渲染结果
     */
    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.config.visible = value;
                if (!value) {
                    this.hide();
                } else {
                    this.timeUpdate(this.config.ctime());
                }
                break;
            default:
                break;
        }
    }
    timeUpdate(time: number) {
        if (!this.config.visible || !this.info || this.paused) {
            return;
        }

        window.cancelAnimationFrame(this.animate);
        this.animate = window.requestAnimationFrame(() => {
            this.timeUpdate(this.config.ctime());
        });

        if (time < this.stime) {
            this.hide();
            return;
        }
        let rest = time - this.stime;

        if (rest < 1) {
            return;
        }
        rest -= 1;
        if (rest < 5) {
            if (this.barStop) {
                return;
            }
            this.template.fools.classList.add(`${this.ppx}-animate`);
            this.template.bar.style.cssText = browserPrefix('transform', `scaleX(${1 - rest / 5})`);
            if (!this.trackShow) {
                this.trackShow = true;
                this.config.track();
            }
            return;
        }
        rest -= 5;
        this.template.fools.classList.remove(`${this.ppx}-animate`);
        if (rest < 0.4) {
            if (this.animationOnce) {
                return;
            }
            const userState = this.info?.userState;
            let completed = false;
            if (userState) {
                const cUserState = this.config.getUserState();
                if (!userState.isLike && cUserState.isLike) {
                    completed = true;
                } else if (!userState.isCoin && cUserState.isCoin) {
                    completed = true;
                } else if (!userState.isCollect && cUserState.isCollect) {
                    completed = true;
                }
            }
            this.template.dmText.innerHTML = `${completed ? svg.iconed : svg.dove}${this.info.result}`;
            this.loadAnimate();
            return;
        }
        rest -= 0.4;
        if (rest < 2) {
            return;
        }
        rest -= 2;

        this.offsetWidth = this.offsetWidth || this.template.dm.offsetWidth;
        this.distance = this.distance || this.config.getRange(this.offsetWidth);
        const { width, speed } = this.distance;
        let duration = (width + this.offsetWidth) / speed;

        if (rest < duration) {
            if (this.dmshow) {
                return;
            }
            this.dmshow = true;

            const rand = Math.random().toString(36).slice(3);

            let style = '';
            ibrowserPrefix.forEach((str) => {
                style += `@${str}keyframes dm-fool-${rand} {
                    0% {
                        ${str}transform: translate(-50%, 50%);
                    }
                    100% {
                        ${str}transform: translate(${-width - this.offsetWidth}px, 50%);
                    }
                }
                .${this.ppx}-fools-dm {
                    ${str}animation: dm-fool-${rand} ${duration}s linear forwards;
                }`;
            });
            this.template.dmstyle.innerHTML = `<style>${style}</style>`;
            return;
        }
        this.hide();
    }

    hide() {
        if (this.inited) {
            this.template.fools.className = `${this.ppx}-fools`;
            this.template.dm.className = `${this.ppx}-fools-dm`;
            this.template.bar.style.cssText = '';
            this.template.dm.style.cssText = '';
            this.distance = <any>null;
            this.offsetWidth = 0;
            this.template.fools.classList.remove(`${this.ppx}-animate`);
            this.wrap.classList.add(`${this.ppx}-hide`);
            this.template.dmstyle.innerHTML = '';
        }
        this.info = <any>null;
    }
    private loadAnimate() {
        this.animationOnce = true;
        // @ts-ignore
        if (!this.loadAnimation) {
            this.loadAnimation = window['lottie'].loadAnimation({
                container: this.template.dmAnimate,
                renderer: 'svg',
                name: 'dove',
                loop: false,
                autoplay: false,
                animationData: smoke,
            });
        }
        this.loadAnimation.goToAndPlay(0, true);
        return this.loadAnimation;
    }

    private tpl() {
        return `<div class="${this.ppx}-fools-wrap">
            <div class="${this.ppx}-fools-dm-style"></div>
            <div class="${this.ppx}-fools-dm">
                <div class="${this.ppx}-fools-dm-animate"></div>
                <div class="${this.ppx}-fools-dm-text"></div>
            </div>
            <div class="${this.ppx}-fools-scale">
            <div class="${this.ppx}-fools">
                <div class="${this.ppx}-fools-icon">${svg.dove}</div>
                <div class="${this.ppx}-fools-text"></div>
                <div class="${this.ppx}-fools-like"></div>
                <div class="${this.ppx}-fools-bar"><span class="${this.ppx}-fools-bar-bg"></span></div>
            </div>
            </div>
        </div>`;
    }
    dispose() {
        window.cancelAnimationFrame(this.animate);
    }
}
