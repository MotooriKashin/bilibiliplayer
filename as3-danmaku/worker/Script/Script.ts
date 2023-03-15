import { IDanmaku } from "../..";
import { debug } from "../../debug";
import { Display } from "../Display/Display";
import { DisplayObject } from "../Display/DisplayObject";
import { Rectangle } from "../Display/Rectangle";
import { Global } from "../Global";
import { Player, IComment } from "../Player/player";
import { ScriptManager } from "../Runtime/ScriptManager";
import { TweenEasing, sine } from "../Tween/Easing";
import { Tween } from "../Tween/Tween";
import { Utils } from "../Utils";
import { Parser } from "./Parser";
import { Scanner } from "./Scanner";
import { VirtualMachine } from "./VirtualMachine";

/** 顶层对象 */
const GLOBAL = {
    trace: (...arg: any[]) => debug.log(...arg),
    clear: () => console.clear(),
    clone: (target: any) => {
        if (null === target || 'object' !== typeof target) {
            return target;
        }

        if (typeof target['clone'] === 'function') {
            return target.clone();
        }

        if (Array.isArray(target)) {
            return target.slice(0);
        }

        const copy = <Record<string, any>>{};
        copy.constructor = copy.constructor;
        copy.prototype = copy.prototype;
        for (const x in target) {
            copy[x] = target[x];
        }
        return copy;
    },
    foreach: (enumerable: ArrayLike<any>, callback: Function) => {
        if (null === enumerable || "object" !== typeof enumerable) {
            return;
        }
        // DisplayObjects 不可例举
        if (enumerable instanceof DisplayObject) {
            return;
        }

        for (const x in enumerable) {
            if (enumerable.hasOwnProperty(x)) {
                callback(x, enumerable[x]);
            }
        }
    },
    getTimer: Utils.getTimer,
    clearTimeout: Utils.clearTimeout,
    clearInterval: Utils.clearInterval,
    interval: Utils.interval,
    timer: Utils.timer,
    parseInt,
    parseFloat,
    Math,
    String,
    Utils,
    Player,
    Display,
    $: Display,
    Global,
    $G: Global,
    ScriptManager,
    Tween,
    TweenEasing,
    Circ: TweenEasing.Circular,
    Expo: TweenEasing.Exponential,
    Quad: TweenEasing.Quadratic,
    Quart: TweenEasing.Quartic,
    Quint: TweenEasing.Quintic,
    SIne: sine,
    stopExecution: () => { throw new Error('stopExecution') },
    load: (library: string, onComplete: Function) => {
        // 所有模块已内置，直接返回
        if (typeof onComplete === 'function') {
            onComplete();
        }
    },
    Bitmap: {
        createBitmap: (style: IComment) => Display.createBitmap(style),
        createParticle: (style: any) => Display.createParticle(style),
        createBitmapData: (width: number, height: number, transparent?: boolean, fillColor?: number) => {
            if (transparent === void 0) { transparent = true; }
            if (fillColor === void 0) { fillColor = 0xffffffff; }
            return Display.createBitmapData(width, height, transparent, fillColor);
        },
        createRectangle: (x?: number, y?: number, width?: number, height?: number) => {
            return new Rectangle(x, y, width, height);
        }
    },
    // 以下是兼容数据
    // 似乎很多作品将true拼错了？
    ture: true,
    // [[弹幕大赛]Q&A リサイタル! ~TV ver~](av399127)
    Arial: 'Arial',
    // [拜年祭2012](av203614)
    get ph() { return Player.height },
    get pw() { return Player.width }
};
Object.entries(TweenEasing).forEach(d => {
    Reflect.set(GLOBAL, ...d);
});
export function Execute(dm: IDanmaku) {
    const vm = new VirtualMachine(GLOBAL);
    const s = new Scanner(dm.text
        .replace(/(\/n|\\n|\n|\r\n)/g, "\n")
        .replace(/(&amp;)|(&lt;)|(&gt;)|(&apos;)|(&quot;)/g, (a: string) => {
            // 处理误当成xml非法字符的转义字符
            return <string>{
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&apos;': '\'',
                '&quot;': '"'
            }[a]
        }));
    const p = new Parser(s);
    vm.rewind();
    vm.setByteCode(p.parse(vm));
    return vm;
}