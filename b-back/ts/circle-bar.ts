const browserPrefix = ['', '-webkit-', '-moz-', '-ms-'];

export interface IBarConfig {
    prefix: string;
    container: HTMLElement;
    timeout: number;
    baseTime?: number; //默认改变半圆进度的时间，单位秒
}
export default class Bar {
    private container: HTMLElement;
    private templete!: { [key: string]: HTMLElement };
    private prefix: string;
    private showClass: string;
    private baseTime: number;
    private lastcent = 0;
    private startTime!: number;
    private animate!: number;
    private ended = false;
    private endVal!: string;
    constructor(private config: IBarConfig) {
        this.container = config.container;
        this.prefix = config.prefix;
        this.showClass = config.prefix + '-show';
        this.baseTime = config.baseTime!;
        this.init();
    }

    private init() {
        this.container.insertAdjacentHTML('beforeend', this.tpl());
        this.templete = {
            left: <HTMLElement>document.querySelector(`.${this.prefix}-left-bar`),
            right: <HTMLElement>document.querySelector(`.${this.prefix}-right-bar`),
            percent: <HTMLElement>document.querySelector(`.${this.prefix}-percent`),
            mask: <HTMLElement>document.querySelector(`.${this.prefix}-mask`),
            end: <HTMLElement>document.querySelector(`.${this.prefix}-end`),
            val: <HTMLElement>document.querySelector(`.${this.prefix}-val`),
        };
    }
    circleRun() {
        this.animate = window.requestAnimationFrame((timestamp: number) => {
            if (!this.startTime) {
                this.startTime = timestamp - 16.7;
            }
            const range = timestamp - this.startTime;
            if (range >= this.config.timeout) {
                this.ended = true;
                this.end(this.endVal);
            } else {
                this.set(Math.round((range / this.config.timeout) * 100));
                this.circleRun();
            }
        });
    }
    start() {
        if (this.config.timeout) {
            this.circleRun();
        }
    }
    reset() {
        this.endVal = '';
        this.lastcent = 0;
        this.startTime = 0;
        this.ended = false;
        this.templete.left.style.cssText = '';
        this.templete.right.style.cssText = '';
        this.templete.percent.textContent = '0%';
        this.show(this.templete.mask);
        this.hide(this.templete.end);
    }
    end(val: string) {
        this.endVal = val;
        if (!this.ended) return;
        this.dispose();
        this.set(100);
        this.templete.val.textContent = val;
        this.hide(this.templete.mask);
        this.show(this.templete.end);
    }
    /**
     * pre    进度条改变之前的半分比
     * next    进度条当前要设置的值
     * 设置成功返回 true，否则，返回fasle
     */
    set(next: number) {
        const pre = this.lastcent;
        //检测参数，如果不是number类型或不在0-100，则不执行
        if (next < 0 || next > 100) {
            return false;
        }
        this.templete.percent.textContent = next + '%';

        let time = 0; //进度条改变的时间
        let deg = 0; //进度条改变的角度
        if (pre > 50) {
            //原来进度大于50
            if (next > 50) {
                //设置左边的进度
                time = ((next - pre) / 50) * this.baseTime;
                deg = ((next - 50) / 50) * 180 - 45;
                //确定时间值为正
                if (next < pre) {
                    time = -time;
                }
                this.templete.left.style.cssText = this.setStyle(deg, time);
            } else {
                //设置左边的进度
                time = ((pre - 50) / 50) * this.baseTime;
                this.templete.left.style.cssText = this.setStyle(-45, time);
                //延时设置右边进度条的改变
                setTimeout(() => {
                    time = ((50 - next) / 50) * this.baseTime;
                    deg = ((50 - next) / 50) * 180 - 45;
                    this.templete.right.style.cssText = this.setStyle(deg, time);
                }, Math.floor(time * 1000));
            }
        } else {
            //原来进度小于50时

            if (next > 50) {
                //设置右边的进度
                time = ((50 - pre) / 50) * this.baseTime;
                this.templete.right.style.cssText = this.setStyle(135, time);
                //延时设置左边进度条的改变
                setTimeout(() => {
                    time = ((next - 50) / 50) * this.baseTime;
                    deg = ((next - 50) / 50) * 180 - 45;

                    this.templete.left.style.cssText = this.setStyle(deg, time);
                }, Math.floor(time * 1000));
            } else {
                //设置右边的进度
                time = ((next - pre) / 50) * this.baseTime;
                //确定时间值为正
                if (next < pre) {
                    time = -time;
                }
                deg = (next / 50) * 180 - 45;
                this.templete.right.style.cssText = this.setStyle(deg, time);
            }
        }
        this.lastcent = next;
        return true;
    }
    // 显示
    private show(dom: HTMLElement) {
        dom?.classList.add(this.showClass);
    }
    // 隐藏
    private hide(dom: HTMLElement) {
        dom?.classList.remove(this.showClass);
    }
    private setStyle(deg: number, time: number) {
        let style = '';
        for (let i = 0; i < browserPrefix.length; i++) {
            style += `${browserPrefix[i]}transform:rotate(${deg}deg);${browserPrefix[i]}transition:${browserPrefix[i]}transform 0s linear;`;
        }
        return style;
    }
    private tpl() {
        const bar = `${this.prefix}`;
        return `<div class="${bar}" >
                <div class="${bar}-left"><div class="${bar}-left-bar"></div></div>
                <div class="${bar}-right"><div class="${bar}-right-bar"></div></div>
                <div class="${bar}-mask ${this.showClass}">
                    <div class="${bar}-top">测速中</div>
                    <div class="${bar}-percent">0%</div>
                    <div class="${bar}-bottom">大概需要5s时间</div>
                </div>
                <div class="${bar}-end">
                    <div class="${bar}-top">测速完成</div>
                    <div class="${bar}-val">0</div>
                </div>
                </div>`;
    }

    dispose() {
        this.animate && cancelAnimationFrame(this.animate);
    }
}
