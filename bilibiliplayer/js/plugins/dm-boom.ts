import BinaryArray from '@jsc/danmaku/component/binary_array';
import { htmlEncode, random } from '@shared/utils';
import { ITextDataInterface } from '../adv-danmaku/adv-danmaku';
import { loadZipBuffer, unzip } from '../unzip';
import { sortFn } from './binary-array';
const browserPrefix = ['', '-webkit-', '-moz-', '-ms-'];

export interface IDmAnimation {
    tail: string;
    center: string;
    head: string;
    zip: string;
    type: number;
    isFire: boolean;
    fire: keyof Omit<IFold, 'animate'>;
}
export interface IBoomConfig {
    container: HTMLElement;
    ppx: string;
    duration: number;
    speedplus: number;
    fontsize: number;
    opacity: number;
    fontfamily: string;
    visible: boolean;
    ctime: () => number;
    getState: () => boolean;
    block: (dm: ITextDataInterface) => any;
}
interface IBoomDmDom {
    wrap: HTMLElement;
    text: HTMLElement;
    body: HTMLElement;
    head: HTMLImageElement;
    fire: HTMLImageElement;
    fire2: HTMLImageElement;
    center: HTMLImageElement;
    tail: HTMLImageElement;
}

export interface IFold {
    animate: {
        head?: string;
        body?: string;
        tail?: string;
        master_head?: string;
        master_body?: string;
        master_tail?: string;
    };
    impact?: {
        length: any;
        [key: string]: string;
    };
    impact_0?: {
        length: any;
        [key: string]: string;
    };
    impact_1?: {
        length: any;
        [key: string]: string;
    };
    impact_2?: {
        length: any;
        [key: string]: string;
    };
    impact_3?: {
        length: any;
        [key: string]: string;
    };
    impact_4?: {
        length: any;
        [key: string]: string;
    };
    carcker?: {
        length: any;
        [key: string]: string;
    };
}
export interface IRenderDm {
    dm: ITextDataInterface;
    x: number;
    y: number;
    speed: number;
    width: number;
    height: number;
    stime: number;
    enter: number;
    middle: number;
    duration: number;
    rest: number;
    fire: number;
    fire2: number;
    distance: number;
    end: number;
    scale: number;
    style: string;
    dom: IBoomDmDom;
    first: boolean;
    stop: boolean;
    acc: boolean;
    boom?: boolean;
}

export class DmBoom {
    private inited!: boolean;
    private paused: boolean = true;
    private width!: number;
    private height!: number;
    private template!: { [key: string]: HTMLElement; };
    private list = new BinaryArray<any>();
    private cList: IRenderDm[] = [];
    private recyclingDiv: IBoomDmDom[] = [];
    private animate!: number;
    private visible: boolean;
    private ppx: string;
    trackInfo = {
        type: -1,
        send: 0,
        show: 0,
    };
    /* ????????????animation ???????????? */
    loadPromise: { [key: string]: Promise<any> } = {};
    fold: {
        [key: string]: IFold;
    } = {};

    constructor(private config: IBoomConfig) {
        this.ppx = config.ppx;
        this.visible = config.visible;
    }

    get cTime() {
        return this.config.ctime() || 0;
    }

    add(list: ITextDataInterface[]) {
        const len = list?.length;
        if (len) {
            let i = 0;
            let dm: ITextDataInterface;
            while (i < len) {
                dm = list[i];
                this.loadDm(dm.animation!);
                if (dm.border) {
                    this.loadPromise[dm.animation!.zip].then(() => {
                        dm.stime = this.cTime + 0.1;
                        this.list.binsert(dm, sortFn);
                    });
                    this.trackInfo.send++;
                } else {
                    this.list.binsert(dm, sortFn);
                }
                if (this.trackInfo.type < 0) {
                    this.trackInfo.type = dm.animation?.type!;
                }
                i++;
            }
            if (len) {
                this.init();
            }
        } else {
            this.list.length = 0;
            this.clear();
        }
    }
    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.visible = value;
                if (value) {
                    if (this.config.getState()) {
                        this.play();
                    }
                } else {
                    this.hide();
                }
                break;
            default:
                break;
        }
    }
    /**
     * ?????? animation zip??????
     */
    private loadDm(animation: IDmAnimation) {
        if (!animation.zip || (<any>this).loadPromise[animation.zip]) return;
        this.loadPromise[animation.zip] = this.load(animation.zip).then((data: any) => {
            this.fold[animation.zip] = data;
        });
    }

    /**
     * ??????zip  buffer????????????
     */
    private load(src: string) {
        return loadZipBuffer(src).then((data) => {
            return unzip(data);
        });
    }

    private init() {
        if (this.inited) {
            return;
        }
        this.inited = true;
        this.tpl();
        this.resize();
    }

    seek() {
        this.clear();
    }
    pause() {
        this.paused = true;
    }
    play() {
        if (!this.paused) {
            return;
        }
        this.paused = false;
        this.animate && window['cancelAnimationFrame'](this.animate);
        this.runNext();
    }

    hide() {
        this.clear();
    }

    private runNext() {
        this.animate = window['requestAnimationFrame'](() => {
            this.nextFrame();
        });
    }
    /**
     * ?????????????????????????????????
     */
    private nextFrame() {
        const time = this.cTime;

        if (!this.list?.length || !this.visible) {
            this.pause();
            return;
        }

        this.renders(this.cList, this.paused, time);
        if (this.paused) {
            return;
        }
        // ??????
        for (let i = 0; i < this.list.length; i++) {
            const dm = this.list[i];
            const delta = dm.stime - time;
            if (dm.on || delta < 0) {
                continue;
            }
            if (delta > 0.05 && !dm.border) {
                break;
            }
            if (this.config.block(dm)) {
                continue;
            }
            const render = this.renderDm(dm, time);
            if (!render) {
                continue;
            }

            let ran = random(0, 1);
            let x = this.width * ran;
            x = Math.min(x, this.width - render.width);

            let direction = ran > 0.5 ? -1 : 1;
            if (
                this.space(render, x, direction * render.width) ||
                this.space(render, x, -1 * direction * render.width)
            ) {
                this.cList.push(render);
                // continue;
                break;
            }

            this.end(render);
        }

        this.runNext();
    }

    /**
     * ????????????
     */
    private setX(render: IRenderDm, x: number) {
        render.x = x;
        render.style += `left:${x}px;`;
        render.dom.wrap.style.cssText = render.style;
    }
    /**
     * ?????????
     */
    private space(render: IRenderDm, x: number, direction: number): boolean {
        // ????????????????????????
        if (render.dm.border) {
            this.setX(render, x);
            return true;
        }
        const check = this.checkX(render, x);

        if (!check) {
            this.setX(render, x);
            return true;
        }
        x = check.x + direction;
        if (direction > 0) {
            x += check.width;
        }

        if (x < 0 || x > this.width - render.width) {
            return false;
        }

        return this.space(render, x, direction);
    }
    /**
     * ????????????
     */
    private checkX(render: IRenderDm, x: number) {
        for (let i = 0; i < this.cList.length; i++) {
            const showDm = this.cList[i];
            // ????????????
            if (x > showDm.x - render.width && x < showDm.x + showDm.width) {
                // ????????????
                if (showDm.end > render.stime) {
                    return showDm;
                }
            }
        }
    }
    /**
     * ???????????????????????????????????????????????????
     */
    private renders(list: IRenderDm[], paused: boolean, time: number) {
        const dead = [];
        for (let i = 0; i < list.length; i++) {
            const render = list[i];
            if (render.end < time) {
                dead.push(render);
                list.splice(i, 1);
                i--;
                continue;
            }
            if (paused) {
                this.stopDm(render, Math.min(render.middle, time));
                continue;
            }
            if (render.first || render.stop) {
                render.first = false;
                this.runDm(render);
                if (!render.dm.showed) {
                    render.dm.showed = true;
                    this.trackInfo.show++;
                }
                continue;
            }
            const type = render.dm.animation?.type;
            if (type === 4 && render.fire2 < time) {
                // ??????????????????????????????
                // ??????????????????
                this.fire2(render, time);
            }
            if (render.middle < time) {
                this.fire(render, time);
            }
        }
        dead.forEach((render) => {
            this.end(render);
        });
    }
    /**
     * ????????????
     */
    private fire(render: IRenderDm, time: number) {
        const isFire = render.dm.animation?.isFire;
        if (isFire && !render.boom) {
            render.dom.wrap.classList.add(`${this.ppx}-scale`);
        }
        render.boom = true;
        // ??????????????????
        const zipUrl = render.dm.animation?.zip!;
        const fire = render.dm.animation?.fire!;
        const list = this.fold[zipUrl]?.[fire];
        if (zipUrl && list) {
            const dur = time - render.middle;
            let fire = Math.ceil((list.length * dur) / render.fire) - 1;
            if (fire > list.length - 1) {
                fire = list.length - 1;
                if (!isFire) {
                    render.dom.wrap.classList.add(`${this.ppx}-opacity`);
                }
            }
            render.dom.wrap.classList.add(`${this.ppx}-middle`);

            render.dom.fire.setAttribute('src', list[fire]);
        }
    }
    /**
     * ??????????????????????????????
     */
    private fire2(render: IRenderDm, time: number) {
        // ??????????????????????????????
        // ??????????????????
        const zipUrl = render.dm.animation?.zip!;
        const list = this.fold[zipUrl]?.carcker;
        if (zipUrl && list) {
            const dur = time - render.fire2;
            let fire = Math.ceil((list.length * dur) / 0.6) - 1;

            if (list[fire]) {
                render.dom.wrap.classList.add(`${this.ppx}-show-fire`);
                render.dom.fire2.setAttribute('src', list[fire]);
            } else {
                render.dom.wrap.classList.remove(`${this.ppx}-show-fire`);
            }
        }
    }
    /**
     * ????????????
     */
    private end(render: IRenderDm) {
        render.dm.on = false;
        render.dom.wrap.classList.add(`${this.ppx}-hide`);
        this.recyclingDiv.push(render.dom);
    }

    /**
     * ??????
     */
    clear() {
        this.cList.forEach((render) => {
            this.end(render);
        });
        this.cList.length = 0;
    }

    /**
     * ??????????????????
     */
    private renderDm(dm: ITextDataInterface, time: number): IRenderDm {
        let dom: IBoomDmDom;

        const animation = dm.animation || ({} as any);
        const zip = this.fold[animation.zip]?.animate;
        if (!zip?.head) {
            return <any>null;
        }
        if (animation.type === 4 && dm.border) {
            // ???????????????????????????
            animation.head = zip.master_head;
            animation.center = zip.master_body;
            animation.tail = zip.master_tail;
        } else {
            animation.head = zip.head;
            animation.center = zip.body;
            animation.tail = zip.tail;
        }

        if (this.recyclingDiv.length) {
            dom = this.recyclingDiv.shift()!;
            dom.head.setAttribute('src', animation.head);
            dom.center.setAttribute('src', animation.center);
            dom.tail.setAttribute('src', animation.tail);
            dom.text.textContent = dm.text;
        } else {
            const div = document.createElement('div');
            div.innerHTML = this.dmTpl(dm);

            dom = {
                wrap: div,
                body: div.querySelector(`.${this.ppx}-boom-dm-body`)!,
                text: div.querySelector(`.${this.ppx}-boom-dm-text`)!,
                fire: div.querySelector(`.${this.ppx}-boom-dm-fire`)!,
                fire2: div.querySelector(`.${this.ppx}-boom-dm-fire2`)!,
                head: div.querySelector(`.${this.ppx}-boom-dm-head`)!,
                center: div.querySelector(`.${this.ppx}-boom-dm-bg-img`)!,
                tail: div.querySelector(`.${this.ppx}-boom-dm-tail`)!,
            };
            this.template.wrap.appendChild(div);
        }
        const ran = dm.border ? 5 : random(0, 9);
        let distance = 0;
        let className = `${this.ppx}-boom-dm`;
        let scale = 1;
        if (ran < 1.6) {
            className += ` ${this.ppx}-boom-small`;
            distance = this.height * random(0.6, 0.8);
            scale = 0.7;
        } else if (ran > 7.4) {
            scale = 0.4;
            className += ` ${this.ppx}-boom-smaller`;
            distance = this.height * random(0.5, 0.7);
        } else {
            distance = this.height * random(0.7, 0.98);
        }
        let style = `top:${this.height}px;`;
        let fireTime = 0;
        let boomTime = 0;
        if (animation.isFire) {
            className += ` ${this.ppx}-boom-fire`;
            fireTime = 1.5;
            boomTime = 0.5;
        }
        if (animation.color) {
            style += `color:${animation.color};`;
        }
        if (animation.isFire) {
            style += `font-family:KaiTi,STKaiti;`;
        }
        const shadow = animation.shadow;
        if (shadow) {
            style += `text-shadow:1px 0 5px ${shadow};`;
        }
        dom.wrap.className = className;
        dom.wrap.style.cssText = style;

        let { width, height } = dom.wrap.getBoundingClientRect();
        width *= scale;
        height *= scale;

        const duration = random(3, 4) - fireTime;
        let speed = distance / duration;

        // let speed = ((512 + height) / this.config.duration) * this.config!.speedplus;
        // const duration = distance / speed;
        dm.on = true;
        const render: IRenderDm = {
            dm,
            dom,
            width,
            height,
            speed,
            style,
            scale,
            duration,
            distance,
            x: 0,
            y: 0,
            fire: 1.5,
            stop: true,
            first: true,
            rest: duration,
            stime: time,
            acc: true,
            end: time + duration + fireTime,
            enter: time + height / speed,
            middle: time + duration - 2 + fireTime + boomTime,
            fire2: time + duration - 2.6 + fireTime + boomTime,
        };
        return render;
    }

    resize() {
        if (!this.inited) {
            return;
        }

        const { width, height } = this.config.container.getBoundingClientRect();
        this.width = width;
        this.height = height;
    }
    /**
     * ??????????????????
     */
    private renderStyle(render: IRenderDm, position: number, rest: number) {
        let css = '';
        let timingFn = rest ? 'cubic-bezier(0.1,1,0.2,0.9)' : 'linear';
        for (let i = 0; i < browserPrefix.length; i++) {
            css += `${browserPrefix[i]}transform: translateX(0px) translateY(${-position}px) translateZ(0px) scale(${render.scale
                });
            ${browserPrefix[i]}transition: ${browserPrefix[i]}transform ${rest}s ${timingFn};`;
        }
        render.dom.wrap.style.cssText = render.style + css;
    }
    /**
     * ??????dm??????
     */
    private dmTpl(dm: ITextDataInterface) {
        const ppx = this.ppx;
        const text = htmlEncode(dm.text.replace(/\r/g, '\r\n') || '');
        const animation: IDmAnimation = dm.animation || ({} as IDmAnimation);
        return `<img class="${ppx}-boom-dm-fire" src="">
        <img class="${ppx}-boom-dm-fire2" src="">
        <div class="${ppx}-boom-dm-body">
        <img class="${ppx}-boom-dm-head" src="${animation.head}">
        <div class="${ppx}-boom-dm-center">
            <div class="${ppx}-boom-dm-text">${text}</div>
            <div class="${ppx}-boom-dm-bg">
            <img class="${ppx}-boom-dm-bg-img" src="${animation.center}">
            </div>
        </div>
            <img class="${ppx}-boom-dm-tail" src="${animation.tail}"></div>`;
    }
    /**
     * ????????????
     */
    private tpl() {
        const isFire = this.list?.[0].animation?.isFire;
        const ppx = this.ppx;
        const className = isFire ? `${ppx}-boom-fire` : '';
        const html = `<div class="${ppx}-boom ${className}"></div>`;
        const container = this.config.container;
        container.insertAdjacentHTML('beforeend', html);
        this.template = {
            wrap: container.querySelector(`.${ppx}-boom`)!,
        };
    }
    /**
     * ????????????????????????
     */
    private stopDm(render: IRenderDm, time: number) {
        if (!render) {
            return;
        }
        render.stop = true;
        const runTime = time - render.stime;
        let position;
        if (render.acc) {
            let y = this.threeBezier(runTime / render.duration, [0, 0], [1, 1], [0, 1.7], [0, 0.58]);
            // y = Math.min(1,y)
            position = y * render.distance;
        } else {
            position = runTime * render.speed;
        }
        render.rest = render.duration - runTime;
        this.renderStyle(render, position, 0);
    }
    /**
     * ????????????????????????
     */
    private runDm(render: IRenderDm) {
        if (!render) {
            return;
        }
        render.stop = false;
        this.renderStyle(render, render.distance, render.rest);
    }

    /**
     * @desc ???????????????
     * @param {number} t ???????????????
     * @param {Array} p1 ????????????
     * @param {Array} p2 ????????????
     * @param {Array} cp1 ?????????1
     * @param {Array} cp2 ?????????2
     */
    private threeBezier(t: number, p1: number[], p2: number[], cp1: number[], cp2: number[]) {
        const [x1, y1] = p1;
        const [x2, y2] = p2;
        const [cx1, cy1] = cp1;
        const [cx2, cy2] = cp2;
        let y =
            y1 * (1 - t) * (1 - t) * (1 - t) +
            3 * cy1 * t * (1 - t) * (1 - t) +
            3 * cy2 * t * t * (1 - t) +
            y2 * t * t * t;
        return y;
    }
    dispose() {
        this.clear();
        this.inited = false;
    }
}
