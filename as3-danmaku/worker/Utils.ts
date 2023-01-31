import { getTimer } from "./Runtime/Timer";

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

export class Utils {
    /** 启动时间 */
    static startTime: number = Date.now();

    /**
     * RGB 转数字
     * @param r 红 (0-255)
     * @param g 绿 (0-255)
     * @param b 蓝 (0-255)
     */
    static rgb(r: number, g: number, b: number) {
        return r << 16 | g << 8 | b;
    }
    /**
     * HSV 转数字
     * @param h 色调 (0-360)
     * @param s 饱和度 (default 1, 0-1)
     * @param v 明度 (default 1, 0-1)
     */
    static hue(h: number, s: number = 1, v: number = 1): number {
        return HSV2RGB(h, s, v);
    }
    /**
     * 格式化秒数
     * @param time 秒数
     */
    static formatTimes(time: number) {
        return Math.floor(time / 60) + ":" + (time % 60 > 9 ? "" : "0") + time % 60;
    }
    /**
     * 计算两点之间的距离
     * @param x1 点 1 横坐标
     * @param y1 点 1 纵坐标
     * @param x2 点 2 横坐标
     * @param y2 点 2 横坐标
     */
    static distance(x1: number, y1: number, x2: number, y2: number) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
    }
    /**
     * 获取一段区域内的随机数
     * @param min 下限
     * @param max 上限
     */
    static rand(min: number, max: number) {
        return min + Math.floor(Math.random() * (max - min));
    }
    /** 已运行时间（毫秒） */
    static getTimer() {
        return Date.now() - this.startTime;
    }
    /**
     * 延时回调
     * @param callback 回调
     * @param delay 延时 (默认 1000 毫秒)
     * @returns 用于取消回调的id（`clearTimeout`）
     */
    static timer(callback: Function, delay: number = 1000): number {
        return getTimer().setTimeout(callback, delay);
    }
    /**
     * 周期回调
     * @param callback 回调
     * @param interval 间隔 (默认 1000 毫秒)
     * @param repeatCount 周期 (默认 1)
     * @returns 用于取消回调的id（`clearInterval`）
     */
    static interval(
        callback: Function,
        interval: number = 1000,
        repeatCount: number = 1): number {

        if (repeatCount === 0) {
            return getTimer().setInterval(callback, interval);
        }
        const ivl = getTimer().setInterval(function () {
            repeatCount--;
            if (repeatCount < 0) {
                getTimer().clearInterval(ivl);
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
    static clearTimeout(tid: number) {
        getTimer().clearTimeout(tid);
    }
    /**
     * 取消周期回调
     * @param iid id
     */
    static clearInterval(iid: number) {
        getTimer().clearInterval(iid);
    }
}