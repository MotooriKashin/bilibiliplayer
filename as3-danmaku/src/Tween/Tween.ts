import { TimeKeeper, Timer } from "../Runtime/Timer";
import { circular, cubic, exponential, extendWithEasingFunctions, getEasingFuncByName, linear, quadratic, quartic, quintic, sine } from "./Easing";

// Property shorthand
type ValueMap = Record<string, number>;
type ValueListMap = Record<string, number[]>;

export class ITween {
    protected isPlaying = false;
    position = 0;
    repeats = 0;
    protected timeKeeper = new TimeKeeper();
    protected timer = new Timer(40);
    easing: Function = Tween.linear;
    step: Function = () => { };
    lastSeek?: number;

    constructor(public target: any, public duration = 0) {
        this.timer.addEventListener("timer", () => {
            this._onTimerEvent();
        });
    }

    protected _onTimerEvent() {
        // 忽略非播放时的计时
        if (this.isPlaying) {
            this.position += this.timeKeeper.elapsed;
            this.timeKeeper.reset();
            this.step(this.target, this.position, this.duration);
            if (this.position >= this.duration) {
                this.repeats--;
                if (this.repeats < 0) {
                    this.stop();
                    this.position = this.duration;
                } else {
                    this.position = 0;
                }
                this.step(this.target, this.position, this.duration);
            }
        }
    }

    clone() {
        const clone = new ITween(this.target, this.duration);
        clone.easing = this.easing;
        clone.step = this.step;
        return clone;
    }

    scale(factor: number) {
        this.position *= factor;
        this.duration *= factor;
    }

    play() {
        if (this.isPlaying) {
            return;
        }
        this.gotoAndPlay(this.position);
    }

    stop() {
        if (!this.isPlaying) {
            return;
        }
        this.gotoAndStop(this.position);
    }

    gotoAndStop(position: number) {
        this.position = position;
        if (this.isPlaying) {
            this.isPlaying = false;
            this.timer.stop();
        }
        this.step(this.target, this.position, this.duration);
    }

    gotoAndPlay(position: number) {
        this.position = position;
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.timer.start();
        }
        this.step(this.target, this.position, this.duration);
    }

    togglePause() {
        if (this.isPlaying) {
            this.stop();
        } else {
            this.play();
        }
    }

    // 以下未猜想补充
    addEventListener(type: string, listener: Function) {
        if (type === 'complete') {
            this.timer.addEventListener('timerComplete', listener);
            return true;
        }
    }
    dispatchEvent(e: any) {
        this.timer.dispatchEvent(e);
        return true;
    }
    hasEventListener(type: string) {

        return true;
    }
    removeEventListener(type: string, listener: Function) {

        return true
    }
}

function createStepFunction(object: any, dest: ValueMap, src: ValueMap, tween: ITween) {
    for (const property in dest) {
        if (!src.hasOwnProperty(property)) {
            src[property] = object[property];
        }
    }
    for (const property in src) {
        if (!dest.hasOwnProperty(property)) {
            dest[property] = src[property];
        }
    }
    return function (object: any, currentTime: number, totalTime: number) {
        for (const property in src) {
            if (!src.hasOwnProperty(property)) {
                continue;
            }
            object[property] = tween.easing(currentTime,
                src[property],
                dest[property] - src[property],
                totalTime);
        }
    };
}

export class Tween {
    static linear = linear;
    static quadratic = quadratic;
    static cubic = cubic;
    static quartic = quartic;
    static quintic = quintic;
    static circular = circular;
    static sine = sine;
    static exponential = exponential;
    static extendWithEasingFunctions = extendWithEasingFunctions;
    static getEasingFuncByName = getEasingFuncByName;
    static ITween = ITween;

    static tween(object: any,
        dest: ValueMap = {},
        src: ValueMap = {},
        duration = 0,
        easing?: Function) {

        const t = new ITween(object, duration * 1000);
        t.step = createStepFunction(object, dest ?? {}, src ?? {}, t);
        if (easing) {
            t.easing = easing;
        }
        return t;
    }
    static to(object: any,
        dest: ValueMap = {},
        duration = 0,
        easing?: Function) {

        const src: ValueMap = {};
        for (const x in dest) {
            if (dest.hasOwnProperty(x)) {
                if (typeof object[x] !== "undefined") {
                    src[x] = object[x];
                } else {
                    src[x] = 0;
                }
            }
        }
        return Tween.tween(object, dest, src, duration, easing);
    }
    static bezier(object: any,
        dest: ValueMap,
        src: ValueMap,
        control: ValueListMap,
        duration = 1.0,
        easing?: Function) {

        const tween = new ITween(object, duration * 1000);
        if (easing && typeof easing === 'function') {
            tween.easing = easing;
        }
        // Create real control arrays
        const finalControlPoints: ValueListMap = {};
        for (const prop in control) {
            if (Array.isArray(control[prop]) && control[prop].length > 0) {
                finalControlPoints[prop] = control[prop];
            }
        }
        // Sanity
        if (typeof src === 'undefined' || src === null) {
            src = {};
        }
        if (typeof dest === 'undefined' || dest === null) {
            dest = {};
        }
        // Prepopulate the control points
        for (const prop in finalControlPoints) {
            if (!(prop in src)) {
                src[prop] = tween.target[prop];
            }
            if (!(prop in dest)) {
                dest[prop] = finalControlPoints[prop][finalControlPoints[prop].length - 1];
            }
        }
        /**
         * Code from https://github.com/minodisk/minodisk-as/blob/master/thirdparty/org/libspark/betweenas3/core/updaters/BezierUpdater.as
         * Used under permission of MIT License for betweenaas3.
         * See linked file for full license text.
         **/
        tween.step = function (target: any, currentTime: number, totalTime: number) {
            const t = Math.min(tween.easing(currentTime, 0, 1, totalTime), 1);
            for (const prop in finalControlPoints) {
                const controlPoints: number[] = finalControlPoints[prop];
                const numControl = controlPoints.length;
                // Figure out which three control points to use
                const firstIndex = Math.floor(t * numControl);
                // Figure out how far along that segment
                const segmentT = (t - firstIndex / numControl) * numControl;
                if (numControl === 1) {
                    // 3 control points
                    target[prop] = src[prop] +
                        2 * t * (1 - t) * (controlPoints[0] - src[prop]) +
                        t * t * (dest[prop] - src[prop]);
                } else {
                    let p1: number = 0;
                    let p2: number = 0;
                    if (firstIndex === 0) {
                        p1 = src[prop];
                        p2 = (controlPoints[0] + controlPoints[1]) / 2;
                    } else if (firstIndex === numControl - 1) {
                        p1 = (controlPoints[firstIndex - 1] + controlPoints[firstIndex]) / 2
                        p2 = dest[prop];
                    } else {
                        p1 = (controlPoints[firstIndex - 1] + controlPoints[firstIndex]) / 2;
                        p2 = (controlPoints[firstIndex] + controlPoints[firstIndex + 1]) / 2;
                    }
                    target[prop] = p1 +
                        2 * segmentT * (1 - segmentT) * (controlPoints[firstIndex] - p1) +
                        segmentT * segmentT * (p2 - p1);
                }
            }
        }
        return tween;
    }
    static scale(src: ITween, scale: number) {
        const clone = src.clone();
        clone.scale(scale);
        return clone;
    }
    static delay(src: ITween, delay: number) {
        const newTween = new ITween(src.target, src.duration + delay * 1000);
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            if (currentTime <= delay * 1000) {
                return;
            }
            src.step(target, currentTime - delay * 1000, totalTime - delay * 1000);
        }
        return newTween;
    }
    static reverse(src: ITween) {
        const newTween = new ITween(src.target, src.duration);
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            src.step(target, totalTime - currentTime, totalTime);
        }
        return newTween;
    }
    static repeat(src: ITween, times: number) {
        const newTween = new ITween(src.target, src.duration * times);
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            src.step(target, currentTime % src.duration, src.duration);
        };
        return newTween;
    }
    static slice(src: ITween, from: number, to: number) {
        if (to === null) {
            to = src.duration;
        }
        if (to < from) {
            to = from;
        }
        from *= 1000;
        to *= 1000;
        const newTween = new ITween(src.target, to - from);
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            src.step(target, from + currentTime, src.duration);
        }
        return newTween;
    }
    static serial(...args: ITween[]) {
        // Check if there are any tweens
        if (args.length === 0) {
            return new ITween({}, 0);
        }
        let totalTime = 0;
        const end: number[] = [];
        const start: number[] = [];
        for (let i = 0; i < args.length; i++) {
            start.push(totalTime);
            totalTime += args[i].duration;
            end.push(totalTime);
        }
        const newTween = new ITween({}, totalTime);
        newTween["lastSeek"] = 0;
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            if (currentTime <= end[newTween["lastSeek"]!]) {
                const currentTween = args[newTween["lastSeek"]!];
                currentTween.step(currentTween.target, currentTime - start[newTween["lastSeek"]!], currentTween.duration);
                return;
            } else {
                const oldTween = args[newTween["lastSeek"]!];
                oldTween.step(oldTween.target, oldTween.duration, oldTween.duration);
            }
            for (let seek = 0; seek < end.length; seek++) {
                if (currentTime < end[seek]) {
                    newTween["lastSeek"] = seek;
                    const currentTween = args[newTween["lastSeek"]];
                    currentTween.step(currentTween.target, currentTime - start[newTween["lastSeek"]], currentTween.duration);
                    return;
                }
            }
        }
        return newTween;
    }
    static parallel(...args: ITween[]) {
        let totalTime: number = 0;
        for (let i = 0; i < args.length; i++) {
            totalTime = Math.max(args[i].duration, totalTime);
        }
        const tweens = args;
        const newTween = new ITween({}, totalTime);
        newTween.step = function (target: any, currentTime: number, totalTime: number) {
            for (let i = 0; i < tweens.length; i++) {
                tweens[i].step(tweens[i].target, Math.min(currentTime, tweens[i].duration), tweens[i].duration);
            }
        }
        return newTween;
    }
}