/**
 * Created by Hellcom on 2016/9/13.
 */

import './less/index.less';
import Utils, { shot } from './common/utils';
import BinaryArray from './component/binary_array';
import OrderList from './component/order_list';
import DivManager from './component/manager/css3-manager';
import CanvasManager from './component/manager/canvas-manager';
import CanvasRender from './component/render/canvas-render';

import AnyObject from './interface/any_object';
import IDanmakuConfigInterface from './interface/danmaku_config';
import IDanmakuConfigExtInterface, { IDmTrack } from './interface/danmaku_config_ext';
import ITextDataInterface from './interface/text_data';
import ITypeMapInterface from './interface/type_map';
import IRenderExtInterface from './interface/render_ext';
import Workers from './insert.worker';

class Danmaku {
    config: IDanmakuConfigExtInterface;
    danmakuArray: ITextDataInterface[];
    container: HTMLElement;
    time: number; // 弹幕时间轴
    paused: boolean;
    manager!: DivManager | CanvasManager;
    visualArray: BinaryArray<IRenderExtInterface>;
    timeLine: OrderList;

    private timeZero: number; // 在 startTime 时间下的视频时间，单位毫秒
    private pauseTime: number; // 记录暂停时的时间
    private startTime: number;
    private animate!: number;
    private worker!: Worker | null;
    private renderTime!: number; // 开始渲染时间点
    private renderCount!: number; // 渲染帧数
    private animateTime!: number;
    private animateRange!: number;
    private lastTime!: number; // 上一帧时间
    fpsCount = 0;
    reportDmid?: string;
    dmTrack: {
        dmexposure: number;
        imgexposure: number;
        actor: number;
        actorClick: number;
        fps: number;
        div?: IDmTrack;
        canvas?: IDmTrack;
        clickNum?: number;
        hoverNum?: number;
        info: { [key: string]: number };
    };
    /** 从外部（非播放器）传入的有dmid 的弹幕列表*/
    outDmidList: string[] = [];

    constructor(config?: IDanmakuConfigInterface) {
        this.config = <IDanmakuConfigExtInterface>Utils.assign(
            {
                container: document.getElementById('player'),
                bold: true,
                duration: 4.5,
                danmakuNumber: -1,
                danmakuArea: 0, // 0-100(0为无限，50为半屏，100为满屏)
                fontBorder: 0,
                fontFamily: 'SimHei, "Microsoft JhengHei"',
                fontSize: 1,
                fullScreenSync: false,
                offsetTop: 0,
                offsetBottom: 0,
                opacity: 1,
                preventShade: false,
                speedPlus: 1,
                speedSync: false,
                type: 'div',
                videoSpeed: 1,
                visible: true,
                isRecycling: false,
                verticalDanmaku: false,
                preTime: 1,

                danmakuFilter: (danmaku: ITextDataInterface) => {
                    // console.log('danmaku advance filter');
                    return true;
                },

                danmakuInserting: (danmaku: ITextDataInterface) => {
                    // console.log('danmaku insert to timeline: ' + danmaku);
                },

                containerUpdating: (container: HTMLElement) => {
                    // console.log('danmaku container updated: ' + container.tagName.toLowerCase());
                },

                listUpdating: (danmakuList: ITextDataInterface[]) => {
                    // console.log('danmaku list updated');
                },

                countUpdating: (count: number) => {
                    // console.log('danmaku count updated: ' + count);
                },

                timeSyncFunc: () => {
                    // console.log('now timeline in ' + (+new Date() - startTime) + ' ms');
                    return window.performance.now();
                },
            },
            config ?? {},
        );

        this.container = this.config.container;
        this.paused = true;
        this.danmakuArray = [];
        this.time = 0;
        this.timeZero = 0;
        this.pauseTime = 0;
        this.dmTrack = {
            dmexposure: 0,
            imgexposure: 0,
            actor: 0,
            actorClick: 0,
            fps: 0,
            info: {
                all: 0,
            },
        };
        this.startTime = Date.now();
        this.visualArray = new BinaryArray();
        this.timeLine = new OrderList();
        this.config.videoSpeed = this.config.videoSpeed || 1;

        this.setType();

        /**
         * How to schedule the next animation frame.
         */
        window['requestAnimationFrame'] = (() =>
            (<AnyObject>window)['requestAnimationFrame'] ||
            (<AnyObject>window)['webkitRequestAnimationFrame'] ||
            (<AnyObject>window)['mozRequestAnimationFrame'] ||
            (<AnyObject>window)['oRequestAnimationFrame'] ||
            (<AnyObject>window)['msRequestAnimationFrame'] ||
            function (callback: any) {
                return window.setTimeout(callback, 1000 / 60);
            })();
        window['cancelAnimationFrame'] = (() =>
            (<AnyObject>window)['cancelAnimationFrame'] ||
            (<AnyObject>window)['webkitCancelAnimationFrame'] ||
            (<AnyObject>window)['mozCancelAnimationFrame'] ||
            (<AnyObject>window)['oCancelAnimationFrame'] ||
            (<AnyObject>window)['msCancelAnimationFrame'] ||
            function (id: any) {
                window.clearTimeout(id);
            })();
    }

    writingMode(verticalDanmaku: boolean) {
        if (this.config.verticalDanmaku !== verticalDanmaku) {
            this.config.verticalDanmaku = verticalDanmaku;
            this.seek(this.time / 1000, true);
        }
    }

    addTimely(danmaku: ITextDataInterface) {
        const renderDanmaku = this.renderDanmaku(danmaku);
        const mustShow = renderDanmaku.border && this.config.visible;
        if (danmaku.stime === -1) {
            if (this.manager && this.config.visible) {
                renderDanmaku.stime = this.config.timeSyncFunc() / 1000 + 0.1;
                this.manager.insert([renderDanmaku], this.time / 1000);
            }
        } else {
            this.timeLine.insert(renderDanmaku);

            if (mustShow) {
                this.manager?.insert([renderDanmaku], this.time / 1000);
                // this._nextFrame();
            }
        }
    }
    addAll(danmakuArray: ITextDataInterface[]) {
        for (let i = 0, len = danmakuArray.length; i < len; i++) {
            danmakuArray[i] = this.renderDanmaku(danmakuArray[i]);
        }
        this.worker = new Workers();
        this.worker.postMessage(danmakuArray);
        this.worker.onmessage = (message) => {
            if (this.timeLine.length > 0) {
                for (let i = 0, len = danmakuArray.length; i < len; i++) {
                    this.timeLine.insert(danmakuArray[i]);
                }
            } else {
                this.timeLine.push.apply(this.timeLine, message.data);
            }
            this.worker?.terminate();
            this.worker = null;
        };
    }

    private renderDanmaku(danmaku: ITextDataInterface): ITextDataInterface {
        return <ITextDataInterface>Utils.assign({}, danmaku, {
            border: danmaku['border'] || false,
            borderColor: danmaku['borderColor'] || 0x66ffff,
            on: false,
        });
    }

    private setType(type?: keyof ITypeMapInterface, element?: HTMLElement) {
        type = type || this.config.type;
        if (type === 'canvas') {
            this.config.devicePR = 2;
        } else {
            this.config.devicePR = 1;
        }
        this.config.type = type;
        const container = this.config.container;
        const typeMap: ITypeMapInterface = {
            div: 'div',
            canvas: 'canvas',
        };
        if (container.tagName.toLowerCase() !== typeMap[type]) {
            const c = container.getAttribute('class');
            const i = container.getAttribute('id');
            const p = container.parentNode;
            const w = container.offsetWidth;
            const h = container.offsetHeight;
            p?.removeChild(container);
            if (this.manager) {
                this.manager.destroy();
            }
            const newContainer = element || document.createElement(typeMap[type]);
            p?.appendChild(newContainer);
            c && newContainer.setAttribute('class', c);
            (<any>newContainer).width = w * this.config.devicePR;
            (<any>newContainer).height = h * this.config.devicePR;
            i && newContainer.setAttribute('id', i);
            this.config.container = newContainer;
            this.manager = this.createManager(type);
            this.config.containerUpdating(container);
        } else if (!this.manager) {
            this.manager = this.createManager(type);
        }
    }

    count(): number {
        return this.danmakuArray ? this.danmakuArray.length : 0;
    }

    private createManager(type: string) {
        let manager: DivManager | CanvasManager;
        switch (type) {
            case 'div':
                manager = new DivManager(this);
                break;
            case 'canvas':
                manager = new CanvasManager(this);
                break;
            default:
                manager = new DivManager(this);
        }
        return manager;
    }

    danmakuType(type?: string): string {
        if (!type) {
            return this.config.type;
        }
        if (type === this.config.type) {
            return type;
        }
        switch (type) {
            case 'div':
                this.option('type', 'div');
                break;
            case 'canvas':
                this.option('type', 'canvas');
                break;
            default:
                this.option('type', 'div');
        }
        return type;
    }

    exportDanmaku(precise?: number): HTMLElement {
        const gifContainer = document.createElement('canvas');
        const giftext = gifContainer.getContext('2d') as CanvasRenderingContext2D;
        this.config.devicePR = 2;
        (<any>gifContainer).width = this.config.width * this.config.devicePR;
        (<any>gifContainer).height = this.config.height * this.config.devicePR;
        (<any>gifContainer).style.width = this.config.width;
        (<any>gifContainer).style.height = this.config.height;
        let reverse = false;
        for (let i = 0; i < this.visualArray.length; i++) {
            let element = this.visualArray[i];
            let newRender = new CanvasRender(element.textData!, this.config, 0);
            let smallCanvas = newRender.textRender(element.textData!, this.config);
            if (element.textData?.mode === 6) {
                reverse = true;
            }
            let x = element._x * this.config.devicePR;
            let y = element._y * this.config.devicePR;
            giftext.drawImage(
                smallCanvas.bitmap,
                reverse ? this.config.width - x - smallCanvas.width || 0 : x,
                y,
                smallCanvas.width,
                smallCanvas.height,
            );
        }
        return gifContainer;
    }

    play(precise?: number): void {
        this.paused = false;

        // 恢复时间
        this.timeZero = this.pauseTime;
        this.pauseTime = 0;

        this.animate && window['cancelAnimationFrame'](this.animate);
        this.animate = window['requestAnimationFrame'](() => {
            this.resetFps();
            this.startTime = Date.now();
            this.animateTime = this.startTime - this.animateRange;
            this.nextFrame(precise);
        });
    }

    pause(): void {
        if (!this.paused) {
            this.realFps();
        }
        this.paused = true; // flag设置后，将自动退出递归帧的渲染

        // 记录时间
        let currentTime: number = Date.now();
        this.pauseTime = this.timeZero + currentTime - this.startTime;
    }

    toggle(): void {
        this.paused ? this.play() : this.pause();
    }

    seek(pos: number, inPosition?: boolean): void {
        this.timeZero = pos * 1000;
        if (!inPosition && (this.timeZero - this.time > 1000 || this.timeZero - this.time < -500)) {
            this.clear();
        }
        this.startTime = Date.now();
        // 下面两行为了在seek后立即取弹幕
        this.manager.lastTime = pos;
        this.animateRange = this.startTime + 1000;
        if (this.paused) {
            this.play(inPosition ? pos : 0);
            this.pause();
        } else {
            this.play(inPosition ? pos : 0);
        }
    }
    outClear() {
        if (this.outDmidList.length < 1) {
            return;
        }
        const del: ITextDataInterface[] = [];
        this.timeLine.forEach((dm) => {
            if (this.outDmidList.indexOf(dm.dmid) > -1) {
                del.push(dm);
            }
        });
        if (del.length) {
            del.forEach((dm) => {
                this.timeLine.remove(dm);
                this.remove(dm.dmid);
            });
        }
        this.outDmidList.length = 0;
    }
    outAdd(danmaku: ITextDataInterface): any {
        this.outDmidList.push(danmaku.dmid);
        this.add(danmaku);
    }

    add(danmaku: ITextDataInterface, liveDm?: boolean): any {
        if (danmaku.canvas && danmaku.canvas.length < 1) {
            return;
        }
        if (!liveDm) {
            if (danmaku.stime === -1) {
                danmaku.stime = this.config.timeSyncFunc() / 1000 + 0.1;
            }
        }
        this.danmakuArray.push(danmaku);
        this.addTimely(danmaku);

        if (typeof this.config.listUpdating === 'function') {
            this.config.listUpdating(this.danmakuArray);
        }
        if (typeof this.config.countUpdating === 'function') {
            this.config.countUpdating(this.danmakuArray.length);
        }
    }

    remove(dmid: string) {
        if (this.manager) {
            for (let i = 0; i < this.danmakuArray.length; i++) {
                if (dmid === this.danmakuArray[i].dmid) {
                    this.danmakuArray.splice(i, 1);
                }
            }
            this.manager.remove(dmid);
        }
    }

    multipleAdd(danmakuList: ITextDataInterface[]) {
        if (danmakuList && danmakuList.length) {
            this.danmakuArray = this.danmakuArray.concat(danmakuList);
            this.sortDmById(this.danmakuArray);
            this.timeLine.insertMulti(danmakuList);
            if (typeof this.config.listUpdating === 'function') {
                this.config.listUpdating(this.danmakuArray);
            }
            if (typeof this.config.countUpdating === 'function') {
                this.config.countUpdating(this.danmakuArray.length);
            }
        }
    }

    // 从小到大排序弹幕
    sortDmById(dms: ITextDataInterface[]) {
        dms.sort((a, b) => this.bigInt(a.dmid, b.dmid) ? 1 : -1);
    }

    // 比较两个弹幕字符串的大小
    private bigInt(num1: string, num2: string) {
        String(num1).replace(/\d+/, d => num1 = d.replace(/^0+/, ""));
        String(num2).replace(/\d+/, d => num2 = d.replace(/^0+/, ""));
        // 数位不同，前者大为真，否则为假
        if (num1.length > num2.length) return true;
        else if (num1.length < num2.length) return false;
        else {
            // 数位相同，逐位比较
            for (let i = 0; i < num1.length; i++) {
                // 任意一位前者大为真
                if (num1[i] > num2[i]) return true;
                // 任意一位前者小为假
                if (num1[i] < num2[i]) return false;
                // 仅当位相等时继续比较下一位
            }
            // 包括相等情况返回假
            return false;
        }
    }

    searchAreaDanmaku(x: number, y: number) {
        x = (x || 0) * this.config.devicePR;
        y = (y || 0) * this.config.devicePR;
        let searchedList: IRenderExtInterface[] = [];
        const searchPrecision = 5;
        for (let i = this.visualArray.length - 1; i >= 0; i--) {
            const v = this.visualArray[i];
            if (!this.config.danmakuFilter(v.textData!)) {
                continue;
            }
            if (this.config.verticalDanmaku && v.textData && v.textData.mode !== 4 && v.textData.mode !== 5) {
                if (v.textData && v.textData.mode === 6) {
                    if (
                        y >= v.wdistance - v._x - v.dWidth - searchPrecision &&
                        y <= v.wdistance - v._x + searchPrecision &&
                        v.vDistance - x >= v._y - searchPrecision &&
                        v.vDistance - x - v.dHength <= v._y + searchPrecision
                    ) {
                        searchedList.push(v);
                    }
                } else {
                    if (
                        y >= v._x - searchPrecision &&
                        y <= v._x + v.dWidth + searchPrecision &&
                        v.vDistance - x >= v._y - searchPrecision &&
                        v.vDistance - x - v.dHength <= v._y + searchPrecision
                    ) {
                        searchedList.push(v);
                    }
                }
            } else {
                if (v.textData && v.textData.mode === 6) {
                    if (
                        x >= v.wdistance - v._x - v.width - searchPrecision &&
                        x <= v.wdistance - v._x + searchPrecision &&
                        y >= v._y - searchPrecision &&
                        y - v.height <= v._y + searchPrecision
                    ) {
                        searchedList.push(v);
                    }
                } else {
                    if (
                        x >= v._x - searchPrecision &&
                        x <= v._x + v.width + searchPrecision &&
                        y >= v._y - searchPrecision &&
                        y - v.height <= v._y + searchPrecision
                    ) {
                        searchedList.push(v);
                    }
                }
            }
        }
        return searchedList;
    }

    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        if (typeof value !== 'undefined') {
            switch (key) {
                case 'container':
                    if (arguments.length === 1) {
                        return this.config.container;
                    } else {
                        if (
                            value &&
                            typeof value === 'object' &&
                            value.nodeType === 1 &&
                            typeof value.nodeName === 'string'
                        ) {
                            this.setType(this.config.type, value);
                        } else {
                            return;
                        }
                    }
                    return;
                case 'type':
                    if (arguments.length === 1) {
                        return this.config.type;
                    } else {
                        this.setType(value);
                        this.seek(this.time / 1000, true);
                    }
                    break;
                case 'fontfamily':
                    if (arguments.length === 1) {
                        return this.config.fontFamily;
                    } else {
                        if (this.manager) {
                            this.manager.config.fontFamily = value;
                        }
                    }
                    break;
                case 'bold':
                    if (arguments.length === 1) {
                        return this.config.bold;
                    } else {
                        if (this.manager) {
                            this.manager.config.bold = value;
                        }
                    }
                    break;
                case 'preventshade':
                    if (arguments.length === 1) {
                        return this.config.preventShade;
                    } else {
                        if (this.manager) {
                            this.manager.config.preventShade = value;
                        }
                    }
                    break;
                case 'speedplus':
                    if (arguments.length === 1) {
                        return this.config.speedPlus;
                    } else {
                        if (this.manager) {
                            this.manager.config.speedPlus = value;
                        }
                    }
                    break;
                case 'speedsync':
                    if (arguments.length === 1) {
                        return this.config.speedSync;
                    } else {
                        if (this.manager) {
                            this.manager.config.speedSync = value;
                        }
                    }
                    break;
                case 'fontsize':
                    if (arguments.length === 1) {
                        return this.config.fontSize;
                    } else {
                        if (this.manager) {
                            this.manager.config.fontSize = value;
                        }
                    }
                    break;
                case 'fullscreensync':
                    if (arguments.length === 1) {
                        return this.config.fullScreenSync;
                    } else {
                        if (this.manager) {
                            this.manager.config.fullScreenSync = value;
                        }
                    }
                    break;
                case 'danmakunumber':
                    if (arguments.length === 1) {
                        return this.config.danmakuNumber;
                    } else {
                        if (this.manager) {
                            this.manager.config.danmakuNumber = value;
                        }
                    }
                    break;
                case 'danmakuArea':
                    if (arguments.length === 1) {
                        return this.config.danmakuArea;
                    } else {
                        if (this.manager) {
                            let val = +value;
                            if (val || val === 0) {
                                val = val < 0 ? 0 : val > 100 ? 100 : val;
                                this.manager.config.danmakuArea = val;
                            }
                        }
                    }
                    break;
                case 'duration':
                    if (arguments.length === 1) {
                        return this.config.duration;
                    } else {
                        if (this.manager) {
                            this.manager.config.duration = value;
                        }
                    }
                    break;
                case 'fontborder':
                    if (arguments.length === 1) {
                        return this.config.fontBorder;
                    } else {
                        if (this.manager) {
                            this.manager.config.fontBorder = value;
                        }
                    }
                    break;
                case 'visible':
                    if (arguments.length === 1) {
                        return this.config.visible;
                    } else {
                        if (this.manager) {
                            this.manager.config.visible = value;
                        }
                    }
                    break;
                case 'speedSync':
                    if (arguments.length === 1) {
                        return this.config.speedSync;
                    } else {
                        if (this.manager) {
                            this.manager.config.speedSync = value;
                            this.manager.update(this.time / 1000, this.config.videoSpeed);
                            this.animateTime = 0;
                        }
                    }
                    break;
                case 'videospeed':
                    if (arguments.length === 1) {
                        return this.config.videoSpeed;
                    } else {
                        if (this.manager) {
                            const rate = this.manager.config.videoSpeed / value;
                            this.manager.config.videoSpeed = value;
                            this.manager.update(this.time / 1000, rate);
                            this.animateTime = 0;
                        }
                    }
                    break;
                case 'opacity':
                    if (arguments.length === 1) {
                        return this.config.opacity;
                    } else {
                        if (this.manager) {
                            this.manager.config.opacity = value;
                        }
                    }
                    break;
                default:
                    this.manager && this.manager.option(key, value);
                    break;
            }
        }
    }

    /**
     * 帧的渲染:递归进行
     */
    private nextFrame(precise?: number, t?: number): void {
        // 时间计算这里的计算都在毫秒单位下
        let currentTime: number = Date.now();
        this.time = this.timeZero + (currentTime - this.startTime) * this.config.videoSpeed;

        // 如果有视频时间函数，则对一下时间
        if (typeof this.config.timeSyncFunc === 'function') {
            let videoTime: number = this.config.timeSyncFunc();

            // 相差太大，进行时间校正
            if (Math.abs(videoTime - this.time) > 1000 || isNaN(this.time)) {
                this.time = videoTime;
                this.timeZero = videoTime;
                this.startTime = currentTime;
            }
        }

        // 绘制
        if (!isNaN(this.time) && this.manager && this.visible()) {
            if (!this.animateTime || precise || currentTime - this.animateTime > this.config.preTime * 1000) {
                this.manager.onTime(this.time / 1000, precise);
                this.animateTime = currentTime;
            }
            this.manager.render(this.time / 1000, this.paused, precise);
        }

        // 下一帧
        if (this.paused) {
            this.animateRange = currentTime - this.animateTime;
            return;
        } else {
            this.animateRange = 0;
            this.animate = window['requestAnimationFrame']((timestamp: number) => {
                this.nextFrame(undefined, timestamp);
            });
        }
        if (this.visible()) {
            if (this.lastTime && t) {
                const key = Math.floor((t - this.lastTime) / 5);
                if (this.dmTrack.info[key]) {
                    this.dmTrack.info[key]++;
                } else {
                    this.dmTrack.info[key] = 1;
                }
                this.dmTrack.info.all++;
                this.lastTime = t;
            }
            if (!this.lastTime && t) {
                this.lastTime = t;
            }
            this.renderCount++;
        }
    }

    /**
     * 设置或者读取当前的可视性
     */
    visible(value?: boolean): boolean {
        if (typeof value === 'undefined') {
            return this.config.visible;
        } else {
            if (value) {
                this.resetFps();
                const videoTime: number = this.config.timeSyncFunc();
                // 下面两行为了在seek后立即取弹幕
                this.manager.lastTime = videoTime / 1000;
                this.animateRange = Date.now() + 1000;
            } else {
                this.realFps();
            }
            if (this.config.visible !== value) {
                this.config.visible = value;

                if (!this.config.visible && this.manager) {
                    this.manager.clearVisualList();
                }
            }
            return value;
        }
    }

    /** 设置弹幕层的大小 */
    resize(show?: boolean): void {
        if (this.manager) {
            this.manager.resize(show);
            this.time && show && this.seek(this.time / 1000, true);
        }
    }

    /** 清屏 */
    clear(): void {
        this.manager.clearVisualList();
        this.animateTime = 0;
    }

    destroy(): void {
        this.worker && this.worker.terminate();
        this.pause();
        this.clear();
        this.outDmidList = [];
    }

    reload(reserved?: boolean, lastDuration?: number) {
        if (reserved) {
            let currentTime: number = Date.now();
            let videoTime: number = this.config.timeSyncFunc();
            this.outDmidList = [];
            this.time = videoTime;
            this.timeZero = videoTime;
            this.startTime = currentTime;
            this.pauseTime = videoTime;
            this.manager.lastTime = videoTime;
            if (lastDuration) {
                this.visualArray.forEach((item) => {
                    item.start -= lastDuration;
                    item.end -= lastDuration;
                    item.middle -= lastDuration;
                });
            }
        } else {
            this.timeLine = new OrderList();
            this.visualArray = new BinaryArray();
        }
    }

    imgExposure(flag: number) {
        switch (flag) {
            case -2:
                this.dmTrack.imgexposure++;
                break;
            case 0:
            case 1:
                this.dmTrack.actor++;
                break;

            default:
                break;
        }
    }
    updateTrackInfo(obj: any, exposure = 0) {
        const type = this.config.type;
        this.dmTrack.dmexposure += exposure;
        this.dmTrack[type] = this.dmTrack[type] || <any>{
            delNum: 0,
            highNum: 0,
            render: 0,
            num: 0,
        };
        for (const key in obj) {
            (<any>this).dmTrack[type][key] += obj[key] || 0;
        }
    }
    shot(canvas?: HTMLCanvasElement, width?: number, height?: number) {
        if (!width) {
            width = this.container.offsetWidth;
            height = this.container.offsetHeight;
        }
        return shot(canvas!, this.visualArray, this.config, width, height!);
    }
    // 监测 实时fps
    private resetFps() {
        this.lastTime = 0;
        this.renderCount = 0;
        this.renderTime = performance.now();
    }
    private realFps() {
        if (this.config.visible) {
            const fps = (this.renderCount * 1000) / (performance.now() - this.renderTime);
            if (fps) {
                this.dmTrack.fps += fps;
                this.fpsCount++;
            }
        }
    }
}

export default Danmaku;
