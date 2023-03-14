import { IDanmaku } from "..";
import { debug } from "../debug";
import { Display } from "./Display/Display";
import { DisplayObject } from "./Display/DisplayObject";
import { Rectangle } from "./Display/Rectangle";
import { Global } from "./Global";
import { __achannel, __OOAPI, __schannel } from "./OOAPI";
import { IComment, Player } from "./Player/player";
import { ScriptManager } from "./Runtime/ScriptManager";
import { Parser } from "./Script/Parser";
import { Scanner } from "./Script/Scanner";
import { VirtualMachine } from "./Script/VirtualMachine";
import { sine, TweenEasing } from "./Tween/Easing";
import { Tween } from "./Tween/Tween";
import { Utils } from "./Utils";

// 建立频道
__OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
__OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

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
// 弹幕解析栈
const Parse: Record<string, VirtualMachine> = {};
// 清空弹幕
__schannel('::clear', function () {
    Object.keys(Parse).forEach(async d => delete Parse[d]);
});
// 解析弹幕
__schannel('::parse', function (dms: IDanmaku[]) {
    dms.forEach(async dm => {
        try {
            const vm = new VirtualMachine(GLOBAL);
            const s = new Scanner(dm.text.replace(/(\/n|\\n|\n|\r\n)/g, "\n").replace(/(&amp;)|(&lt;)|(&gt;)|(&apos;)|(&quot;)/g, (a: string) => {
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
            Parse[dm.dmid] = vm;
        } catch (e) {
            debug.error(e);
        }
    });
});
// 运行弹幕
__schannel("::eval", function (dmid: string) {
    const vm = Parse[dmid];
    if (vm) {
        vm.execute();
        vm.rewind();
    }
});
// 调试频道
__schannel("::debug", function (msg: any) {
    if (typeof msg === 'undefined' || msg === null ||
        !msg.hasOwnProperty('action')) {
        __achannel('::worker:debug', 'worker', 'Malformed request');
        return;
    }
    if (msg.action === 'list-channels') {
        __achannel('::worker:debug', 'worker', __OOAPI.listChannels());
    } else if (msg.action === 'raw-eval') {
        try {
            __achannel('::worker:debug', 'worker', (0, eval)(msg.code));
        } catch (e) {
            __achannel('::worker:debug', 'worker', 'Error: ' + e);
        }
    } else {
        __achannel('::worker:debug', 'worker', 'Unrecognized action');
    }
});
// 成功运行反馈
__achannel("::worker:state", "worker", "running");