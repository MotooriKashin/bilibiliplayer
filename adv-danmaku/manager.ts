import Utils from './common/utils';
import Danmaku, { IDanmakuOptions } from './component/danmaku';
import TestCSS3 from './component/test-css3';
import TestCanvas2D from './component/test-canvas2d';

interface IManagerOptions {
    [key: string]: any;
}

export interface ITextData extends Object {
    dmid: string;
    mode: number;
    size: number;
    date: number;
    class: number;
    stime: number;
    color: number;
    uid: string;
    text: string;
    mid?: string;
    uname?: string;
}
interface IRepackTextData {
    textData: ITextData;
}

type GuidInterface = () => number;

class Manager {
    config: IManagerOptions;
    private paused: boolean;
    private sDate!: number;
    private createStatus: boolean;
    private dmList: Danmaku[];
    private cdmList: Danmaku[];
    private visableStatus: boolean;
    private initialType: string;
    private getId: GuidInterface;
    private canvas!: HTMLCanvasElement | HTMLElement;
    private ctx!: CanvasRenderingContext2D;
    private testManager!: TestCanvas2D | TestCSS3;
    container: HTMLElement;
    status!: boolean;
    sTime: number;
    dmexposure = 0;

    constructor(config: IManagerOptions) {
        this.container = config.container;
        this.config = Utils.assign(
            {
                container: document.getElementById('player'),
                danmakuNumber: -1, // -1 为无上限
                videoSpeed: 1,
                visible: true,
                type: 'div',
                setType: (type: string) => { },
                blockJudge: (options: any) => { },
                getType: () => this.config.type,
                getDanmakuNumber: () => this.config.danmakuNumber,
            },
            config,
        );
        this.paused = true;
        this.sTime = 0;
        this.getId = this.guid();
        this.createStatus = false;
        this.dmList = []; // 总高级弹幕列表
        this.cdmList = []; // 当前高级弹幕列表
        this.visableStatus = this.config.visible;
        this.initialType = this.getType();
    }

    count(): number {
        return this.cdmList ? this.cdmList.length : 0;
    }

    getType(): string {
        return this.config.getType();
    }

    addDanmaku(textData: ITextData, render?: boolean) {
        const danmaku = this.buildTextData(textData);
        if (!this.dmList) {
            this.dmList = [];
        }
        if (danmaku) {
            this.dmList.push(danmaku);
        }
        if (render) {
            danmaku!.renderStatus = true;
            this.drawDanmaku(danmaku!);
            this.cdmList.push(danmaku!);
        }
    }

    danmakuType(type: string) {
        if (!type || this.initialType === type) {
            return this.initialType;
        }
        if (this.dmList.length && this.visableStatus && this.canvas) {
            this.config.setType(type);
            this.typeChangeCheck();
            this.getType() === 'div'
                ? (this.canvas.innerHTML = '')
                : this.ctx.clearRect(
                    0,
                    0,
                    (<HTMLCanvasElement>this.canvas).width,
                    (<HTMLCanvasElement>this.canvas).height,
                );
            this.refreshCdmList();
            this.drawDanmaku();
            return type;
        }
        return null;
    }

    exportDanmaku(): HTMLElement | null {
        const len = this.cdmList.length;
        if (len < 1) {
            return null;
        }
        const gifContainer = document.createElement('canvas');
        const giftext = <CanvasRenderingContext2D>gifContainer.getContext('2d');
        gifContainer.width = this.container.offsetWidth;
        gifContainer.height = this.container.offsetHeight;
        for (let i = 0; i < len; i++) {
            const danmaku = this.cdmList[i];
            danmaku.refresh(this.sTime, true);
            const x = danmaku.options.x - danmaku.options.offsetX;
            const y = danmaku.options.y - danmaku.options.offsetY - 5;
            danmaku.drawStatus && giftext.drawImage(<HTMLCanvasElement>danmaku.img, x, y);
        }
        return gifContainer;
    }

    remove(dmid: string) {
        let danmaku: Danmaku;
        this.dmList = this.dmList.filter((item) => item.options.dmid !== dmid);
        this.cdmList = this.cdmList.filter((item) => {
            if (item.options.dmid === dmid) {
                danmaku = item;
                return false;
            } else {
                return true;
            }
        });
        // @ts-ignore
        if (danmaku) {
            if (this.getType() === 'div') {
                danmaku.img && danmaku.img.remove && danmaku.img.remove();
            } else {
                this.refreshCdmList(true);
            }
        }
    }

    play() {
        if (this.dmList.length) {
            if (!this.createStatus) {
                this.create();
            }
            this.sDate = Date.now();
            this.paused = false;
            this.render();
        }
    }

    pause() {
        if (this.dmList.length) {
            this.paused = true;
        }
    }

    stop() {
        if (this.dmList.length) {
            this.sTime = 0;
            this.paused = true;
        }
    }

    seek(t: number) {
        if (!this.createStatus) {
            this.play();
            this.pause();
        }
        if (this.dmList.length && this.visableStatus && this.canvas) {
            this.sTime = t * 1000;
            this.sDate = Date.now();
            this.renderDanmaku();
        }
    }

    resize() {
        if (this.createStatus) {
            if (this.getType() !== 'div') {
                (<HTMLCanvasElement>this.canvas).width = this.container.offsetWidth;
                (<HTMLCanvasElement>this.canvas).height = this.container.offsetHeight;
            }
            this.drawDanmaku();
        }
        this.testManager && this.testManager.resize();
    }

    visible(value: boolean) {
        if (value !== this.visableStatus) {
            if (value) {
                // show
                this.visableStatus = true;
                this.render();
            } else {
                // hide
                this.visableStatus = false;
                this.clearCurrent();
            }
        }
    }

    clearCurrent() {
        if (this.getType() === 'div') {
            if (this.canvas) {
                this.canvas.innerHTML = '';
            }
        } else {
            this.ctx &&
                this.ctx.clearRect(
                    0,
                    0,
                    (<HTMLCanvasElement>this.canvas).width,
                    (<HTMLCanvasElement>this.canvas).height,
                );
        }
        this.cdmList.forEach(function (d: Danmaku) {
            d.renderStatus = false;
            d.img && d.img.remove && d.img.remove();
            d.img = null;
        });
        this.cdmList = [];
    }

    searchAreaDanmaku(e: MouseEvent): IRepackTextData[] {
        if (this.getType() === 'div') {
            return this.searchCSSArea(e.clientX || 0, e.clientY || 0);
        } else {
            return this.searchCanvasArea(e.offsetX || 0, e.offsetY || 0);
        }
    }

    testDanmaku(textData: ITextData) {
        const danmaku = this.buildTextData(textData);
        danmaku!.options.stime = Date.now();
        if (this.getType() === 'div') {
            this.testManager = new TestCSS3(this.container);
        } else {
            this.testManager = new TestCanvas2D(this.container);
        }
        this.testManager.test(danmaku!);
    }

    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        if (typeof value !== 'undefined') {
            switch (key) {
                case 'videospeed':
                    if (arguments.length === 1) {
                        return this.config.videoSpeed;
                    } else {
                        this.config.videoSpeed = value;
                    }
                    break;
                default:
                    this.config[key] = value;
                    break;
            }
        }
    }

    private guid(): GuidInterface {
        let id = 0;
        return function () {
            return id++;
        };
    }

    private create() {
        this.getType() === 'div' ? this.createDiv() : this.createCanvas();
        this.container && this.container.appendChild(this.canvas);
        this.createStatus = true;
        this.render();
    }

    private createDiv() {
        const canvas = document.createElement('div');
        canvas.style.position = 'absolute';
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.background = 'transparent';
        canvas.style.zIndex = '10';
        this.canvas = canvas;
    }

    private createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.width = this.container.offsetWidth;
        canvas.height = this.container.offsetHeight;
        canvas.style.background = 'transparent';
        canvas.style.zIndex = '10';
        this.ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        this.canvas = canvas;
    }

    private buildTextData(textData: ITextData): Danmaku | null {
        try {
            let text;
            let msg;
            if (Array.isArray(textData.text)) {
                text = textData.text;
                msg = this.escapeXssChars(text[4]);
            } else {
                text = JSON.parse(this.escapeSpecialChars(textData.text));
                msg = text[4];
            }

            const opacityArr = text[2].toString().split('-');
            const config: IDanmakuOptions = {
                id: this.getId(),
                stime: textData.stime,
                mode: textData.mode,
                size: textData.size,
                color: textData.color,
                date: textData.date,
                class: textData.class,
                uid: textData.uid,
                dmid: textData.dmid,
                text: msg,
                sOpacity: parseFloat(opacityArr[0]),
                eOpacity: parseFloat(opacityArr[1]),
                duration: text[3] * 1000,
                startX: parseFloat(text[0]),
                startY: parseFloat(text[1]),
                endX: typeof text[7] === 'undefined' ? parseFloat(text[0]) : parseFloat(text[7]),
                endY: typeof text[8] === 'undefined' ? parseFloat(text[1]) : parseFloat(text[8]),
                canvasW: this.container.offsetWidth,
                canvasH: this.container.offsetHeight,
                container: this.container,
            };
            if (text.length >= 7) {
                config.zRotate = text[5];
                config.yRotate = text[6];
            }
            if (text.length >= 11) {
                config.aTime = text[9];
                config.aDelay = text[10];
            }
            if (text.length >= 12) {
                config.stroked = text[11]; // 描边, h5：0|1， flash：false|true
            }
            if (text.length >= 13) {
                config.family = text[12]; // 字体，默认都为 黑体
            }
            if (text.length >= 14) {
                config.linearSpeedUp = text[13]; // 是否有线性加速，h5改默认值为0
            }
            if (text.length >= 15) {
                config.path = text[14]; // 路径数据，默认都为''
            }
            return new Danmaku(this, config);
        } catch (e) {
            return null;
        }
    }

    private drawDanmaku(danmaku?: Danmaku[] | Danmaku) {
        danmaku = danmaku || this.cdmList;
        if (Array.isArray(danmaku)) {
            danmaku.forEach((d) => {
                this.drawDanmaku(d);
            });
        } else {
            danmaku.refresh(this.sTime);
            if (danmaku.drawStatus && danmaku.img) {
                if (this.getType() === 'div') {
                    danmaku.img.style.opacity = danmaku.options.cOpacity.toString();
                    danmaku.innerCell.style.transform = danmaku.innerCell.style.webkitTransform = danmaku.createTransform(
                        danmaku.options.x,
                        danmaku.options.y,
                        danmaku.options.yRotate,
                        danmaku.options.zRotate,
                    );
                    if (danmaku.blocked || this.config.blockJudge(danmaku.options)) {
                        danmaku.img.style.visibility = 'hidden';
                    } else {
                        danmaku.img.style.visibility = '';
                    }
                    if (!this.canvas) {
                        this.create();
                    }
                    this.canvas.appendChild(danmaku.img);
                } else {
                    if (!danmaku.blocked) {
                        this.ctx.globalAlpha = danmaku.options.cOpacity;
                        this.ctx.drawImage(
                            <HTMLCanvasElement>danmaku.img,
                            danmaku.options.x - danmaku.options.offsetX,
                            danmaku.options.y - danmaku.options.offsetY - 2,
                        );
                    }
                }
            }
        }
    }

    private render() {
        if (this.paused) {
            return false;
        } else {
            if (this.visableStatus) {
                window['requestAnimationFrame'](() => {
                    this.render();
                });
                this.renderDanmaku();
            }
        }
    }

    private renderDanmaku() {
        this.config.danmakuNumber =
            typeof this.config.getDanmakuNumber === 'function'
                ? this.config.getDanmakuNumber()
                : this.config.danmakuNumber;
        this.updateSTime();
        this.typeChangeCheck();
        this.getType() === 'div'
            ? (this.canvas.innerHTML = '')
            : this.ctx.clearRect(0, 0, (<HTMLCanvasElement>this.canvas).width, (<HTMLCanvasElement>this.canvas).height);
        this.refreshCdmList();
        this.drawDanmaku();
    }

    private updateSTime() {
        const timestamp = Date.now();
        this.sTime += (timestamp - this.sDate) * this.config.videoSpeed;
        this.sDate = timestamp;
        // 如果有视频时间函数，则对一下时间
        if (typeof this.config.timeSyncFunc === 'function') {
            const videoTime: number = this.config.timeSyncFunc();
            // 相差太大，进行时间校正
            if (Math.abs(videoTime - this.sTime) > 1000 || isNaN(this.sTime)) {
                this.sTime = videoTime;
            }
        }
    }

    refreshCdmList(force?: boolean) {
        if (!this.visableStatus) {
            this.clearCurrent();
            return;
        }
        for (let i = 0, len = this.dmList.length; i < len; i++) {
            const danmaku: Danmaku = this.dmList[i];
            if (
                danmaku.options.stime <= this.sTime &&
                danmaku.options.stime + danmaku.options.duration >= this.sTime &&
                !danmaku.renderStatus
            ) {
                if (!this.config.blockJudge(danmaku.options) && this.validate()) {
                    danmaku.renderStatus = true;
                    if (!danmaku.showed) {
                        this.dmexposure++;
                    }
                    danmaku.showed = true;
                    this.cdmList.push(danmaku);
                }
            }
        }
        for (let i = this.cdmList.length - 1; i >= 0; i--) {
            const danmaku: Danmaku = this.cdmList[i];
            if (
                danmaku.options.stime > this.sTime ||
                danmaku.options.stime + danmaku.options.duration / this.config.videoSpeed <= this.sTime + 40
            ) {
                danmaku.renderStatus = false;
                danmaku.img && danmaku.img.remove && danmaku.img.remove();
                danmaku.img = null;
                this.cdmList.splice(i, 1);
                continue;
            }
            if (this.config.blockJudge(danmaku.options)) {
                danmaku.blocked = true;
            } else {
                delete (<any>danmaku).blocked;
            }
        }
        if (force) {
            if (this.getType() !== 'div') {
                this.ctx &&
                    this.ctx.clearRect &&
                    this.ctx.clearRect(
                        0,
                        0,
                        (<HTMLCanvasElement>this.canvas).width,
                        (<HTMLCanvasElement>this.canvas).height,
                    );
            }
            this.drawDanmaku();
        }
    }

    private validate() {
        if (this.cdmList.length >= this.config.danmakuNumber && this.config.danmakuNumber !== -1) {
            return false;
        }
        return true;
    }

    private escapeXssChars(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/(\/n|\\n|\n|\r\n)/g, '\n');
    }

    private escapeSpecialChars(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/>/g, '&gt;')
            .replace(/</g, '&lt;')
            .replace(/\/n|\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\f/g, '\\f');
    }

    private typeChangeCheck() {
        if (this.initialType !== this.getType()) {
            this.initialType = this.getType();
            for (let i = this.cdmList.length - 1; i >= 0; i--) {
                const danmaku: Danmaku = this.cdmList[i];
                danmaku.renderStatus = false;
                danmaku.img = null;
                delete (<any>danmaku).blocked;
            }
            this.cdmList.length = 0;
            this.container.innerHTML = '';
            this.initialType === 'div' ? this.createDiv() : this.createCanvas();
            this.container && this.container.appendChild(this.canvas);
        }
    }

    private searchCSSArea(clientX: number, clientY: number): IRepackTextData[] {
        const result = [];
        const precision = 5;
        for (let i = this.cdmList.length - 1; i >= 0; i--) {
            const danmaku: Danmaku = this.cdmList[i];
            if (!danmaku.img || !danmaku.img.children || !danmaku.img.children[0]) {
                continue;
            }
            if (!danmaku.img.children[0].getBoundingClientRect) {
                return result;
            }
            const rect = danmaku.img.children[0].getBoundingClientRect();
            const minW = rect.width;
            const minH = rect.height;
            const x = rect.left;
            const y = rect.top;
            if (
                clientX >= x - precision &&
                clientX <= x + minW + precision &&
                clientY >= y - precision &&
                clientY - minH <= y + precision
            ) {
                result.push(this.repackDanmakuData(danmaku));
            }
        }
        return result;
    }

    private searchCanvasArea(offsetX: number, offsetY: number): IRepackTextData[] {
        const result = [];
        const precision = 5;
        for (let i = this.cdmList.length - 1; i >= 0; i--) {
            const danmaku: Danmaku = this.cdmList[i];
            const minW = danmaku.options.minW;
            const minH = danmaku.options.minH;
            const x = danmaku.options.x - danmaku.options.offsetX;
            const y = danmaku.options.y - danmaku.options.offsetY;
            if (
                offsetX >= x - precision &&
                offsetX <= x + minW + precision &&
                offsetY >= y - precision &&
                offsetY - minH <= y + precision
            ) {
                result.push(this.repackDanmakuData(danmaku));
            }
        }
        return result;
    }

    private repackDanmakuData(danmaku: Danmaku): IRepackTextData {
        return {
            textData: {
                uid: danmaku.options.uid,
                text: danmaku.options.text,
                mode: danmaku.options.mode,
                dmid: danmaku.options.dmid,
                stime: danmaku.options.stime,
                size: danmaku.options.size,
                date: danmaku.options.date,
                color: danmaku.options.color,
                class: danmaku.options.class,
            },
        };
    }

    clear() {
        this.dmList = [];
        this.cdmList = [];
        if (this.getType() === 'div') {
            if (this.canvas) {
                this.canvas.innerHTML = '';
            }
        } else {
            this.ctx &&
                this.ctx.clearRect(
                    0,
                    0,
                    (<HTMLCanvasElement>this.canvas).width,
                    (<HTMLCanvasElement>this.canvas).height,
                );
        }
    }

    destroy() { }
}

export default Manager;
