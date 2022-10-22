/**
 * Created by Hellcom on 2016/9/13.
 */

import { browser } from '@shared/utils';
import BinaryArray from '../component/binary_array';
import AnyObject from '../interface/any_object';
import IDanmakuConfigExtInterface from '../interface/danmaku_config_ext';
import IRenderExtInterface from '../interface/render_ext';

export const browserPrefix = ['', '-webkit-', '-moz-', '-ms-'];
let index = 1;
class Utils {
    static browser = browser;

    static assign(...args: AnyObject[]): AnyObject {
        if (args.length <= 1) return args[0];
        let output = args[0] != null ? Object(args[0]) : {};

        args.forEach((value, index) => {
            if (index === 0) return;
            if (value != null) {
                for (let prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        output[prop] = value[prop];
                    }
                }
            }
        });

        return output;
    }

    static getHexColor(colorValue: number): string {
        return '#' + ('000000' + colorValue.toString(16)).slice(-6);
    }
    static getIndex() {
        return index++;
    }
}
/**
 * Sometimes an animation frame is skipped when your CPU is busy with other tasks
 */
export function reportRefreshRate() {
    const ric: any = window['requestIdleCallback'];
    const startReport = (cb: (fps: number) => void) => {
        requestAnimationFrame((firstTimeStamp) => {
            requestAnimationFrame((nextTimeStamp) => {
                cb(Math.round(1000 / (nextTimeStamp - firstTimeStamp)));
            });
        });
    };
    return new Promise((resolve) => {
        if (typeof ric === 'function') {
            ric(
                (idleDeadline: any) => {
                    if (idleDeadline && !idleDeadline.didTimeout) {
                        startReport((fps) => {
                            resolve(fps);
                        });
                    } else {
                        setTimeout(() => {
                            startReport((fps) => {
                                resolve(fps);
                            });
                        }, 5000);
                    }
                },
                { timeout: 10000 },
            );
        } else {
            setTimeout(() => {
                startReport((fps) => {
                    resolve(fps);
                });
            }, 10000);
        }
    });
}

export function htmlEncode(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2f;')
        .replace(/\n/g, '<br>');
}
export function shot(
    canvas: HTMLCanvasElement,
    list: BinaryArray<IRenderExtInterface>,
    config: IDanmakuConfigExtInterface,
    width: number,
    height: number,
): HTMLCanvasElement {
    const devicePR = 2;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.setAttribute('width', width * devicePR + 'px');
        canvas.setAttribute('height', height * devicePR + 'px');
    }
    const ctx = canvas.getContext('2d')!;
    ctx.globalAlpha = config.opacity;

    list.forEach((item) => {
        let x = item._x * devicePR;
        let y = item._y * devicePR;
        if (item.textData?.mode === 6) {
            y = width * devicePR - y;
        }
        ctx.font = item.font;
        ctx.strokeStyle = Utils.getHexColor(item.textData?.color ? 0 : 0xffffff);
        ctx.lineWidth = 2;
        ctx.shadowBlur = 3;
        ctx.fillStyle = Utils.getHexColor(item.textData?.color!);
        ctx.strokeText(item.text, x, y + item.height * devicePR);
        ctx.fillText(item.text, x, y + item.height * devicePR);
    });

    return canvas;
}

export default Utils;
