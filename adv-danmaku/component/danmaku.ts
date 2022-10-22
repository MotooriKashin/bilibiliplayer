import Utils from '../common/utils';
import Manager from '../manager';

interface IPathArr {
    x: number;
    y: number;
    i?: number;
    xDistance?: number;
    yDistance?: number;
    pathDistance?: number;
    lastDistance?: number;
}

export interface IDanmakuOptions {
    // textData
    uid: string;
    dmid: string;
    date: number;
    mode: number;
    size: number;
    text: string;
    stime: number;
    class: number;
    color: number;

    id: number;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    end?: number;

    // Advanced
    family?: string;
    stroked?: boolean;
    duration?: number;
    sOpacity?: number;
    eOpacity?: number;
    cOpacity?: number;
    changeOpacity?: boolean;
    zRotate?: number;
    yRotate?: number;
    offsetX?: number; // zRotate 左上定点X偏移量
    offsetY?: number; // zRotate 左上定点Y偏移量

    // Animation
    xDistance?: number;
    yDistance?: number;
    xSpeed?: number;
    ySpeed?: number;
    aTime?: number;
    aDelay?: number;
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    path?: string;
    linearSpeedUp?: number;
    pathArr?: IPathArr[];
    pathDistance?: number; // 两点之间对角线距离

    // Others
    canvasW?: number;
    canvasH?: number;
    isTest?: boolean;
    container?: HTMLElement;
    minW?: number;
    minH?: number;
    spOpacity?: number;
}
interface IMeasureText {
    minW: number;
    minH: number;
    width: number;
    height: number;
}

interface IPath {
    x: number[];
    y: number[];
}

class Danmaku {
    private manager: Manager;
    private mode: number;
    private defaultOptions: IDanmakuOptions = {
        id: 0,

        // Danmaku
        uid: '',
        dmid: '0',
        stime: 0,
        date: 0,
        mode: 0,
        class: 0,
        text: '',
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        end: 0,

        // Advanced
        color: 16777215,
        size: 36,
        family: '黑体',
        stroked: true,
        duration: 4.5,
        sOpacity: 1,
        eOpacity: 1,
        cOpacity: 1,
        changeOpacity: false,
        zRotate: 0,
        yRotate: 0,
        offsetX: 0, // zRotate 左上定点X偏移量
        offsetY: 0, // zRotate 左上定点Y偏移量

        // Animation
        xDistance: 0,
        yDistance: 0,
        xSpeed: 0,
        ySpeed: 0,
        aTime: 500,
        aDelay: 0,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        path: '',
        linearSpeedUp: 0,
        pathArr: [],
        pathDistance: 0, // 两点之间对角线距离

        // Others
        canvasW: 0,
        canvasH: 0,
        isTest: false,
        container: document.getElementsByTagName('body')[0],
    };
    private percent: { startX?: number; endX?: number; startY?: number; endY?: number } = {};
    innerCell!: HTMLPreElement;
    img!: HTMLCanvasElement | HTMLElement | null;
    options: Required<IDanmakuOptions>;
    drawStatus!: boolean;
    blocked!: boolean;
    renderStatus!: boolean;
    showed!: boolean; // 是否显示过

    constructor(manager: Manager, options: IDanmakuOptions) {
        this.manager = manager;
        this.options = Utils.assign(this.defaultOptions, options);
        this.mode = 7;
        this.init();
    }

    private init() {
        const options = this.options;
        const isPercent = (value: number): boolean => value > 0 && value < 1;

        options.cOpacity = options.sOpacity;

        if (options.sOpacity !== options.eOpacity) {
            options.changeOpacity = true;
            options.spOpacity = (options.sOpacity - options.eOpacity) / options.duration;
        }
        if (isPercent(options.startX) && isPercent(options.startY) && !options.path) {
            this.percent = {};
            this.percent.startX = options.startX;
            this.percent.startY = options.startY;
        }
        if (isPercent(options.endX) && isPercent(options.endY) && !options.path) {
            this.percent = !this.percent ? {} : this.percent;
            this.percent.endX = options.endX;
            this.percent.endY = options.endY;
        }

        options.startX = isPercent(options.startX) ? options.startX * options.canvasW : options.startX;
        options.startY = isPercent(options.startY) ? options.startY * options.canvasH : options.startY;
        options.endX = isPercent(options.endX) ? options.endX * options.canvasW : options.endX;
        options.endY = isPercent(options.endY) ? options.endY * options.canvasH : options.endY;

        if (!options.path) {
            options.xDistance = options.endX - options.startX;
            options.yDistance = options.endY - options.startY;
        } else {
            const pathArr = options.path.substr(1).split('L');
            const len = pathArr.length;
            for (let i = 0; i < len; i++) {
                let startX: number;
                let startY: number;
                const path = pathArr[i].split(',');
                if (options.pathArr[i - 1]) {
                    startX = options.pathArr[i - 1]['x'];
                    startY = options.pathArr[i - 1]['y'];
                } else {
                    startX = Number(path[0]);
                    startY = Number(path[1]);
                }
                const xDistance = Math.abs(+path[0] - startX);
                const yDistance = Math.abs(+path[1] - startY);
                options.xDistance += xDistance;
                options.yDistance += yDistance;
                options.pathDistance += Math.sqrt(xDistance * xDistance + yDistance + yDistance);
                options.pathArr.push({
                    i: i,
                    x: ~~path[0],
                    y: ~~path[1],
                    xDistance: xDistance,
                    yDistance: yDistance,
                    pathDistance: Math.sqrt(xDistance * xDistance + yDistance * yDistance), // 对角线距离
                    lastDistance: options.pathDistance,
                });
            }
            options.startX = ~~pathArr[0].split(',')[0];
            options.startY = ~~pathArr[0].split(',')[1];
            options.endX = ~~pathArr[len - 1].split(',')[0];
            options.endY = ~~pathArr[len - 1].split(',')[1];
        }
        options.x = options.startX;
        options.y = options.startY;
    }

    refresh(stime: number, isShot?: boolean) {
        const options = this.options;
        const time = (stime - options.stime) / this.manager.config.videoSpeed;
        const aDelay = options.aDelay / this.manager.config.videoSpeed;
        const aTime = options.aTime / this.manager.config.videoSpeed;
        const duration = options.duration / this.manager.config.videoSpeed;
        if (time <= duration && time >= 0) {
            if (!this.img || isShot) {
                this.img = this.getCanvasImg(isShot);
            }
            const w = options.container.offsetWidth;
            const h = options.container.offsetHeight;
            options.canvasW = w;
            options.canvasH = h;
            if (this.percent.startX || this.percent.startY) {
                options.startX = this.percent.startX! * w;
                options.startY = this.percent.startY! * h;
            }
            if (this.percent.endX || this.percent.endY) {
                options.endX = this.percent.endX! * w;
                options.endY = this.percent.endY! * h;
            }
            if (Object.keys(this.percent).length) {
                if (options.startX + options.width > w && this.percent.startX! > 0.8 && this.percent.startX! < 1) {
                    options.startX -= options.width;
                }
                if (options.startY + options.height > h && this.percent.startY! > 0.8 && this.percent.startY! < 1) {
                    options.startY -= options.height;
                }
                if (options.endX + options.width > w && this.percent.endX! > 0.8 && this.percent.endX! < 1) {
                    options.endX -= options.width;
                }
                if (options.endY + options.height > h && this.percent.endY! > 0.8 && this.percent.endY! < 1) {
                    options.endY -= options.height;
                }
                options.xDistance = options.endX - options.startX;
                options.yDistance = options.endY - options.startY;
            }
            this.drawStatus = true;
            if (options.changeOpacity) {
                options.cOpacity = options.sOpacity - time * options.spOpacity * this.manager.config.videoSpeed;
            }

            // Animate
            if (time >= aDelay && time <= aDelay + aTime) {
                this.updatePosition(time - aDelay);
            } else if (time >= aDelay + aTime) {
                options.x = options.endX;
                options.y = options.endY;
            } else {
                options.x = options.startX;
                options.y = options.startY;
            }
        } else {
            this.img && this.img.remove && this.img.remove();
            this.img = null;
            this.drawStatus = false;
            this.options.x = this.options.startX;
            this.options.y = this.options.startY;
        }
    }

    private getCanvasImg(isShot?: boolean): HTMLElement | HTMLCanvasElement {
        if (!isShot && this.manager.getType() === 'div') {
            return this.getDivImg();
        }

        const options = this.options;
        const canvas = document.createElement('canvas');
        const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        const w = options.container.offsetWidth;
        const h = options.container.offsetHeight;
        let measure;

        ctx.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
        options.width = ctx.measureText(options.text).width;
        measure = this.measureText(
            options.text,
            options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif',
        );
        options.height = measure.height;
        options.minW = measure.minW;
        options.minH = measure.minH;
        options.width = options.width > w ? w : options.width;
        options.height = options.height > h ? h : options.height;
        canvas.width = options.width;
        canvas.height = options.height;
        ctx.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';

        if (options.stroked) {
            if (options.color !== 0) {
                ctx.shadowColor = '#000'; // string
            } else {
                ctx.shadowColor = '#FFF'; // string
            }
            ctx.strokeStyle = ctx.shadowColor;
            ctx.lineWidth = 1; // integer
            ctx.shadowBlur = 3; // integer
            ctx.strokeText(options.text, 0, canvas.height);
        }

        // 在canvas模式中，替换\n换行符为XML的“换行符”
        options.text = options.text.replace(/\n/g, '\r');
        ctx.fillStyle = '#' + ('000000' + options.color.toString(16)).substr(-6);
        if (options.text.indexOf('\r') === -1) {
            ctx.fillText(options.text, 0, canvas.height);
        } else {
            this.wrapText(ctx, options.text, 0, 0, 0, options.height);
        }
        if (options.zRotate) {
            const canvasZ = document.createElement('canvas');
            const ctxZ = <CanvasRenderingContext2D>canvasZ.getContext('2d');
            this.updateByRotate();
            canvasZ.width = options.width;
            canvasZ.height = options.height;
            ctxZ.translate(options.offsetX, options.offsetY);
            ctxZ.rotate((options.zRotate / 360) * 2 * Math.PI);
            ctxZ.drawImage(canvas, 0, 0);
            this.generateMinContentBox();
            return canvasZ;
        } else {
            return canvas;
        }
    }

    private getDivImg(): HTMLElement {
        const options = this.options;
        const wrap = document.createElement('div');
        const cell = document.createElement('pre');
        this.innerCell = cell;
        wrap.appendChild(cell);
        wrap.style.display = 'inline-block';
        wrap.style.position = 'absolute';
        wrap.style.top = '0px';
        wrap.style.left = '0px';
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.perspective = wrap.style.webkitPerspective = '288.1473083496094px';
        cell.style.display = 'inline-block';
        cell.style.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
        cell.style.textAlign = 'left';
        cell.style.lineHeight = '1';
        cell.style.color = '#' + ('000000' + options.color.toString(16)).substr(-6);
        cell.innerHTML = options.text;
        if (options.stroked) {
            const color = options.color !== 0 ? '#000' : '#fff';
            cell.style.textShadow =
                '1px 0 1px ' + color + ',0 1px 1px ' + color + ',0 -1px 1px ' + color + ',-1px 0 1px ' + color;
        }
        cell.style.transformOrigin = cell.style.webkitTransformOrigin = '0% 0% 0px';
        return wrap;
    }

    createTransform(x: number, y: number, yRotate: number = 0, zRotate: number = 0): string {
        const getRadian = (deg: number): number => (deg * Math.PI) / 180;
        const wrapAngle = (deg: number): number => 180 - ((((-deg - 180) % 360) + 360) % 360);
        const yRadian = getRadian(wrapAngle(yRotate));
        const zRadian = getRadian(wrapAngle(zRotate));
        const cosY = Math.cos(yRadian);
        const cosZ = Math.cos(zRadian);
        const sinY = Math.sin(yRadian);
        const sinZ = Math.sin(zRadian);
        return `matrix3d(${cosY * cosZ},${cosY * sinZ},${sinY},0,${-sinZ},${cosZ},0,0,${-sinY * cosZ},${-sinY * sinZ
            },${cosY},0,${x},${y},0,1)`;
    }

    private wrapText(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number,
    ) {
        const lines = text.split('\r');
        const options = this.options;
        const len = lines.length;
        const w = options.container.offsetWidth;
        const h = options.container.offsetHeight;
        maxWidth = maxWidth || 0;

        // Reset canvas
        ctx.canvas.height = lineHeight * len;
        ctx.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
        options.width = ctx.measureText(options.text).width;
        options.height = this.measureText(
            options.text,
            options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif',
        ).height;
        options.width = options.width > w ? w : options.width;
        options.height = options.height > h ? h : options.height;

        for (let i = 0; i < len; i++) {
            const line = lines[i];
            let lineWidth = ctx.measureText(line).width;
            if (lineWidth > maxWidth) {
                if (lineWidth) {
                    lineWidth = w;
                }
                maxWidth = lineWidth;
                ctx.canvas.width = lineWidth;
                ctx.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
            }
        }

        // loop to draw text
        ctx.font = 'bold ' + options.size + 'px ' + options.family + ', Arial, Helvetica, sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#' + ('000000' + options.color.toString(16)).substr(-6);
        for (let i = 0; i < len; i++) {
            const line = lines[i];
            y += lineHeight;
            if (options.stroked) {
                if (options.color !== 0) {
                    ctx.shadowColor = '#000'; // string
                } else {
                    ctx.shadowColor = '#FFF'; // string
                }
                ctx.strokeStyle = ctx.shadowColor;
                ctx.lineWidth = 1; // integer
                ctx.shadowBlur = 3; // integer
                ctx.strokeText(line, x, y);
            }
            ctx.fillText(line, x, y);
        }
    }

    private updateByRotate() {
        const options = this.options;
        const deg = Math.abs(options.zRotate % 360);
        const pi = (Math.PI * 2) / 360;
        const w = options.width;
        const h = options.height;
        options.width = Math.sqrt(w * w + h * h);
        options.height = Math.sqrt(w * w + h * h);
        if (deg <= 90) {
            options.offsetX = h * Math.sin(deg * pi);
            options.offsetY = 0;
        } else if (deg <= 180) {
            options.offsetX = options.width;
            options.offsetY = h * Math.sin((deg - 90) * pi);
        } else if (deg <= 270) {
            options.offsetX = options.width - h * Math.sin((deg - 180) * pi);
            options.offsetY = options.height;
        } else if (deg < 360) {
            options.offsetX = 0;
            options.offsetY = options.height + h * Math.sin((deg - 90) * pi);
        }
    }

    private generateMinContentBox() {
        const o = { x: 0, y: 0 };
        const c = { x: this.options.minW, y: this.options.minH };
        const p = [
            { x: o.x, y: o.y },
            { x: c.x, y: o.y },
            { x: o.x, y: c.y },
            { x: c.x, y: c.y },
        ];
        const r: IPath = { x: [], y: [] };
        const anticlockwiseDegree = 360 - (this.options.zRotate % 360);
        const anticlockwiseRadian = (anticlockwiseDegree / 180) * Math.PI;
        const cos = Math.cos(anticlockwiseRadian);
        const sin = Math.sin(anticlockwiseRadian);
        p.forEach(function (v, i, a) {
            const x = (v.x - o.x) * cos - (v.y - o.y) * sin + o.x;
            const y = (v.x - o.x) * sin + (v.y - o.y) * cos + o.y;
            a[i] = { x: x, y: y };
        });
        p.forEach(function (v0) {
            p.forEach(function (v1) {
                r.x.push(Math.abs(v0.x - v1.x));
                r.y.push(Math.abs(v0.y - v1.y));
            });
        });
        this.options.minW = Math.max(...r.x);
        this.options.minH = Math.max(...r.y);
    }

    private updatePosition(t: number) {
        let x: number;
        let y: number;
        let cur;
        let prev;
        let runDistance;
        const options = this.options;
        if (options.linearSpeedUp) {
            // 线性加速
            if (!options.path) {
                // 非路径跟随
                x = this.easeInQuad(t, options.startX, options.xDistance, options.aTime);
                y = this.easeInQuad(t, options.startY, options.yDistance, options.aTime);
            } else {
                // 路径跟随
                runDistance = this.easeInQuad(t, 0, options.pathDistance, options.aTime);
                for (let i = 0, len = options.pathArr.length; i < len; i++) {
                    cur = options.pathArr[i];
                    prev = options.pathArr[i - 1] || cur;
                    if (runDistance <= cur.lastDistance! && runDistance >= prev.lastDistance!) {
                        const per = cur.pathDistance ? (runDistance - prev.lastDistance!) / cur.pathDistance : 0;
                        x = prev.x + (cur.x - prev.x) * per;
                        y = prev.y + (cur.y - prev.y) * per;
                        break;
                    }
                }
            }
        } else {
            // 非线性加速
            if (!options.path) {
                // 非路径跟随
                x = this.easeOutQuad(t, options.startX, options.xDistance, options.aTime);
                y = this.easeOutQuad(t, options.startY, options.yDistance, options.aTime);
            } else {
                // 路径跟随
                runDistance = this.easeOutQuad(t, 0, options.pathDistance, options.aTime);
                for (let i = 0, len = options.pathArr.length; i < len; i++) {
                    cur = options.pathArr[i];
                    prev = options.pathArr[i - 1] || cur;
                    if (runDistance <= cur.lastDistance! && runDistance >= prev.lastDistance!) {
                        const per = cur.pathDistance ? (runDistance - prev.lastDistance!) / cur.pathDistance : 0;
                        x = prev.x + (cur.x - prev.x) * per;
                        y = prev.y + (cur.y - prev.y) * per;
                        break;
                    }
                }
            }
        }
        options.x = x!;
        options.y = y!;
    }

    private easeInQuad(sTime: number, start: number, distance: number, fTime: number): number {
        const k = (sTime / fTime) * this.manager.config.videoSpeed;
        return start + distance * k * k;
    }

    private easeOutQuad(sTime: number, start: number, distance: number, fTime: number): number {
        const k = (sTime / fTime) * this.manager.config.videoSpeed;
        return start + distance * (k * (2 - k));
    }

    private measureText(text: string, font: string): IMeasureText {
        const span = document.createElement('span');
        span.innerHTML = text;
        span.style.cssText = 'font: ' + font + '; line-height: 1; white-space: nowrap';
        const pre = document.createElement('pre');
        pre.innerHTML = text;
        pre.style.cssText = 'font: ' + font + '; line-height: 1; white-space: pre; display: inline-block';
        const div = document.createElement('div');
        div.style.cssText = 'height: 0; width: 1; overflow: hidden';
        div.appendChild(span);
        div.appendChild(pre);
        this.options.container.appendChild(div);
        const w = span.offsetWidth;
        const h = span.offsetHeight;
        const rw = pre.offsetWidth;
        const rh = pre.offsetHeight;
        this.options.container.removeChild(div);
        return {
            minW: rw,
            minH: rh,
            width: w,
            height: h,
        };
    }

    destroy() { }
}

export default Danmaku;
