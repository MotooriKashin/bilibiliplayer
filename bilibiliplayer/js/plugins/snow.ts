import { ibrowserPrefix } from "@shared/utils";

import '../../css/snow.less';

const ACC = 0.0035,
    SNOWFLAKE_PER_PIXEL = 10000;

function rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
}
class Perlin {
    perm: number[];

    constructor() {
        this.perm = (() => {
            let arr: number[] = [];
            for (let i = 0; i < 256; i++) {
                arr.push(Math.floor(Math.random() * 256));
            }
            return arr.concat(arr);
        })();
    }

    grad(i: number, x: number) {
        const h = i & 0xf;
        const grad = 1 + (h & 7);
        if ((h & 8) !== 0) {
            return -grad * x;
        }
        return grad * x;
    }

    getValue(x: number) {
        const i0 = Math.floor(x);
        const i1 = i0 + 1;
        const x0 = x - i0;
        const x1 = x0 - 1;
        let t0 = 1 - x0 * x0;
        t0 *= t0;
        let t1 = 1 - x1 * x1;
        t1 *= t1;
        const n0 = t0 * t0 * this.grad(this.perm[i0 & 0xff], x0);
        const n1 = t1 * t1 * this.grad(this.perm[i1 & 0xff], x1);
        return 0.395 * (n0 + n1);
    }
}
const noise = new Perlin();

class Dot {
    posX: number;
    posY: number;
    speed: number;
    off: number;
    scale: number;
    img: HTMLImageElement;

    constructor(w: number, h: number, src: string) {
        this.posX = rand(0, w);
        this.posY = rand(0, h);
        this.speed = rand(1, 2);
        this.scale = rand(0.8, 1.5);
        this.off = rand(0, 1000);

        this.img = new Image();
        this.img.src = src;
    }
    update() {
        this.speed += ACC;
        this.posY += this.speed;
        this.posX += noise.getValue(this.off);
        this.off += 0.01;
    }

    render() {
        const scale = `scale(${this.scale})`;
        let css = '';
        for (let i = 0; i < ibrowserPrefix.length; i++) {
            css += `${ibrowserPrefix[i]}transform: translateX(${this.posX}px) translateY(${this.posY}px) translateZ(0px) ${scale};`;
        }
        this.img.style.cssText = css;
    }
}

interface ISnowConfig {
    container: HTMLElement;
    img: string;
}
export class Snow {
    private container: HTMLElement;
    w: number;
    h: number;
    snowList: Dot[] = [];

    constructor(config: ISnowConfig) {
        this.container = config.container;
        this.w = this.container.offsetWidth;
        this.h = this.container.offsetHeight;
        const h = Math.min(600, this.h);
        this.h += h;
        this.container.style.cssText = `margin-top:-${h}px;padding-top:${h}px;`;

        for (let i = 0; i < Math.floor((this.w * h) / SNOWFLAKE_PER_PIXEL); i++) {
            const dot = new Dot(this.w, h, config.img);
            this.container.appendChild(dot.img);
            this.snowList.push(dot);
        }
    }
    draw() {
        for (let i = 0; i < this.snowList.length; i++) {
            const dot = this.snowList[i];
            dot.update();
            if (dot.posY > this.h) {
                this.container.removeChild(dot.img);
                this.snowList.splice(i, 1);
                i--;
                continue;
            }
            dot.render();
        }

        if (!this.snowList.length) {
            return;
        }
        window.requestAnimationFrame(() => {
            this.draw();
        });
    }
    clear() {
        this.snowList.length = 0;
        this.container.innerHTML = '';
    }
}
