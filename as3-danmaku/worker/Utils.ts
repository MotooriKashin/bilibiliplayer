import { Runtime } from "./Runtime/Runtime";

function HSV2RGB(hue: number, saturation: number, brightness: number) {
    let r = 1, g = 1, b = 1;
    if (saturation) {
        const h = (hue % 360) / 60;
        const i = h | 0;
        const f = h - i;
        const p = 1 - saturation;
        const q = 1 - saturation * f;
        const t = 1 - saturation * (1 - f);
        switch (i) {
            case 0: r = 1; g = t; b = p; break;
            case 1: r = q; g = 1; b = p; break;
            case 2: r = p; g = 1; b = t; break;
            case 3: r = p; g = q; b = 1; break;
            case 4: r = t; g = p; b = 1; break;
            case 5: r = 1; g = p; b = q; break;
        }
    }
    r *= 255 * brightness;
    g *= 255 * brightness;
    b *= 255 * brightness;
    return r << 16 | g << 8 | b;
}
export function extend<T extends object, U extends object>(target: T, source: U) {
    for (const key in source) {
        if (!(key in target)) {
            Reflect.set(target, key, (<any>source)[key]);
        }
    }
    return target;
}
export function numberColor(color: number | string = 0): string {
    if (typeof color === 'string') {
        color = parseInt(color.toString());
        if (Number.isNaN(color)) {
            color = 0;
        }
    }
    let code: string = color.toString(16);
    while (code.length < 6) {
        code = '0' + code;
    }
    return '#' + code;
}
export function modernize<T extends object>(styles: T): T {
    const modernizeLibrary = {
        "transform": ["webkitTransform"],
        "transformOrigin": ["webkitTransformOrigin"],
        "transformStyle": ["webkitTransformStyle"],
        "perspective": ["webkitPerspective"],
        "perspectiveOrigin": ["webkitPerspectiveOrigin"]
    };
    for (const key in modernizeLibrary) {
        if (styles.hasOwnProperty(key)) {
            for (let i = 0; i < modernizeLibrary[<'transform'>key].length; i++) {
                (<any>styles)[modernizeLibrary[<'transform'>key][i]] = (<any>styles)[key];
            }
        }
    }
    return styles;
}
export function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K | 'svg', props: Record<string, any>, children: HTMLElement[] = [], callback?: Function) {
    const elem = tagName === 'svg' ? document.createElementNS("http://www.w3.org/2000/svg", "svg") : document.createElement(tagName);
    for (const key in props) {
        if (props.hasOwnProperty(key)) {
            if (key === "style") {
                props[key] = modernize(props[key]);
                for (const style in props[key]) {
                    (<any>elem)["style"][style] = props[key][style];
                }
            } else if (key === "className") {
                elem.classList.add(...props[key].split(' '));
            } else {
                elem.setAttribute(key, props[key]);
            }
        }
    }
    elem.append(...children);
    if (typeof callback === "function") {
        callback(elem);
    }
    return <HTMLElementTagNameMap[K]>elem;
}
export const Utils = new (class {
    /** 启动时间 */
    startTime: number = Date.now();
    /**
     * RGB 转数字
     * @param r 红 (0-255)
     * @param g 绿 (0-255)
     * @param b 蓝 (0-255)
     */
    rgb(r: number, g: number, b: number) {
        return r << 16 | g << 8 | b;
    }
    /**
     * HSV 转数字
     * @param h 色调 (0-360)
     * @param s 饱和度 (default 1, 0-1)
     * @param v 明度 (default 1, 0-1)
     */
    hue(h: number, s: number = 1, v: number = 1): number {
        return HSV2RGB(h, s, v);
    }
    /**
     * 格式化秒数
     * @param time 秒数
     */
    formatTimes(time: number) {
        return Math.floor(time / 60) + ":" + (time % 60 > 9 ? "" : "0") + time % 60;
    }
    /**
     * 计算两点之间的距离
     * @param x1 点 1 横坐标
     * @param y1 点 1 纵坐标
     * @param x2 点 2 横坐标
     * @param y2 点 2 横坐标
     */
    distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
    }
    /**
     * 获取一段区域内的随机数
     * @param min 下限
     * @param max 上限
     */
    rand(min: number, max: number) {
        return min + Math.floor(Math.random() * (max - min));
    }
    /** 已运行时间（毫秒） */
    getTimer = () => {
        return Date.now() - this.startTime;
    }
    /**
     * 延时回调
     * @param callback 回调
     * @param delay 延时 (默认 1000 毫秒)
     * @returns 用于取消回调的id（`clearTimeout`）
     */
    timer = (callback: Function, delay: number = 1000) => {
        return Runtime.getTimer().setTimeout(callback, delay);
    }
    /**
     * 周期回调
     * @param callback 回调
     * @param interval 间隔 (默认 1000 毫秒)
     * @param repeatCount 周期 (默认 1)
     * @returns 用于取消回调的id（`clearInterval`）
     */
    interval = (
        callback: Function,
        interval: number = 1000,
        repeatCount: number = 1) => {

        if (repeatCount === 0) {
            return Runtime.getTimer().setInterval(callback, interval);
        }
        const ivl = Runtime.getTimer().setInterval(function () {
            repeatCount--;
            if (repeatCount < 0) {
                Runtime.getTimer().clearInterval(ivl);
            } else {
                callback();
            }
        }, interval);
        return ivl;
    }
    /**
     * 取消延时回调
     * @param tid id
     */
    clearTimeout = (tid: number) => {
        Runtime.getTimer().clearTimeout(tid);
    }
    /**
     * 取消周期回调
     * @param iid id
     */
    clearInterval = (iid: number) => {
        Runtime.getTimer().clearInterval(iid);
    }
})();