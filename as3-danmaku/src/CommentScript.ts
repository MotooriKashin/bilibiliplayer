import { debug } from "../debug";
import { ICommentBitmapStyle, IParticleStyle } from "./Display/CommentBitmap";
import { DisplayObject } from "./Display/DisplayObject";
import { Rectangle } from "./Display/Rectangle";
import { ScriptDisplay } from "./Display/ScriptDisplay";
import { RootSprite } from "./Display/Sprite";
import { GlobalVariables } from "./GlobalVariables";
import { Player } from "./player";
import { ScriptPlayer } from "./Player/ScriptPlayer";
import { TimerRuntime } from "./Runtime/Timer";
import { Parser } from "./script/Parser";
import { Scanner } from "./script/Scanner";
import { VirtualMachine } from "./script/VirtualMachine";
import { ScriptManager } from "./ScriptManager";
import { ScriptUtils } from "./ScriptUtils";
import { sine, TweenEasing } from "./Tween/Easing";
import { Tween } from "./Tween/Tween";

export class CommentScript {
    private _scriptManager: ScriptManager;
    private _player: ScriptPlayer;
    private _display: ScriptDisplay;
    private _utils: ScriptUtils;
    private _global: GlobalVariables;
    private globals: any;
    _timer = new TimerRuntime();
    // internalTimer = new Timer(40);
    constructor(public _jwplayer: Player, protected clip: RootSprite) {
        const that = this;
        this._scriptManager = new ScriptManager(_jwplayer, this);
        this._player = new ScriptPlayer(_jwplayer);
        this._utils = new ScriptUtils(this._timer, this._scriptManager);
        this._display = new ScriptDisplay(_jwplayer, clip, this._scriptManager, this._utils);
        this._global = new GlobalVariables();
        this.globals = {
            trace: this.tracex,
            clear: this.clear,
            getTimer: this._utils.getTimer,
            clearTimeout: this._utils.clearTimeout,
            clearInterval: this._utils.clearInterval,
            parseInt: parseInt,
            parseFloat: parseFloat,
            Math: Math,
            String: String,
            interval: this._utils.interval,
            timer: this._utils.timer,
            clone: this.clone,
            foreach: this.foreach,
            Utils: this._utils,
            Player: this._player,
            Display: this._display,
            $: this._display,
            Global: this._global,
            $G: this._global,
            ScriptManager: this._scriptManager,
            Tween: Tween,
            TweenEasing: TweenEasing,
            Circ: TweenEasing.Circular,
            Expo: TweenEasing.Exponential,
            Quad: TweenEasing.Quadratic,
            Quart: TweenEasing.Quartic,
            Quint: TweenEasing.Quintic,
            SIne: sine,
            stopExecution: this.stopExecution,
            load: this.load,
            Bitmap: {
                createBitmap: (style: ICommentBitmapStyle) => this._display.createBitmap(style),
                createParticle: (style: IParticleStyle) => this._display.createParticle(style),
                createBitmapData: (width: number, height: number, transparent?: boolean, fillColor?: number) => {
                    if (transparent === void 0) { transparent = true; }
                    if (fillColor === void 0) { fillColor = 0xffffffff; }
                    return this._display.createBitmapData(width, height, transparent, fillColor);
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
            get ph() { return that._player.height },
            get pw() { return that._player.width },
        };
        Object.entries(TweenEasing).forEach(d => {
            Reflect.set(this.globals, ...d);
        });
        this._timer.start();
        // this.internalTimer.start();
        // this.internalTimer.addEventListener('timer', Runtime.enterFrameDispatcher);
    }
    tracex = (...arg: any[]) => debug.log(...arg);
    clear = () => console.clear();
    clone = (target: any) => {
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
    }
    foreach = (enumerable: ArrayLike<any>, callback: Function) => {
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
    }
    stopExecution = () => { throw new Error('stopExecution') }
    load = (library: string, onComplete: Function) => {
        // 所有模块已内置，直接返回
        if (typeof onComplete === 'function') {
            onComplete();
        }
    }
    /**
     * 执行弹幕代码
     * @param script 弹幕代码
     * @param debugInfo 是否调试
     */
    exec(script: string, debugInfo = true) {
        if (!this._jwplayer.scriptEnabled) {
            return;
        }
        const vm = new VirtualMachine();
        let startTime = 0;
        this.installGlobals(vm);
        if (debugInfo) {
            startTime = this._utils.getTimer();
            this.tracex("=====================================");
        }
        const s = new Scanner(script);
        const p = new Parser(s);
        vm.rewind();
        vm.setByteCode(p.parse(vm));
        vm.execute();
        if (debugInfo) {
            const costTime = this._utils.getTimer() - startTime;
            this.tracex("Execute in " + costTime + "ms");
        }
    }
    private installGlobals(vm: VirtualMachine) {
        const global = vm.getGlobalObject();
        for (const key in this.globals) {
            global[key] = this.globals[key];
        }
    }
}