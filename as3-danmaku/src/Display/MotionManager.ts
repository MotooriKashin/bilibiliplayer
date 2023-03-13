import { TimeKeeper, Timer } from "../Runtime/Timer";
import { ITween, Tween } from "../Tween/Tween";
import { DisplayObject } from "./DisplayObject";

export class MotionManager {
    protected _isRunning: boolean = false;
    protected _ttl: number;
    protected _timer!: Timer;
    protected _timeKeeper: TimeKeeper;
    protected _independentTimer: boolean;
    protected _tween?: ITween;
    oncomplete?: Function;
    constructor(protected _parent: DisplayObject, protected _dur = 1000, independentTimer = false) {

        this._ttl = _dur;
        this._independentTimer = independentTimer;
        this._timeKeeper = new TimeKeeper();

        if (this._independentTimer) {
            this._timer = new Timer(41, 0);
            this._timer.addEventListener('timer', () => {
                this._onTimerEvent();
            });
            this._timer.start();
        } else {
            this._parent.addEventListener('enterFrame', () => {
                this._onTimerEvent();
            });
        }
    }
    set dur(dur) {
        this._timeKeeper.reset();
        this._ttl = dur;
        this._dur = dur;
    }
    get dur() {
        return this._dur;
    }
    get running() {
        return this._isRunning;
    }
    /**
     * protected method invoked every time a timer event is fired
     */
    protected _onTimerEvent() {
        // Ignore timer events if this is not running
        if (!this._isRunning) {
            return;
        }
        // Ignore timer events if this has 0 duration (infinite)
        if (this._dur === 0) {
            return;
        }
        this._ttl -= this._timeKeeper.elapsed;
        this._timeKeeper.reset();
        if (this._ttl <= 0) {
            this.stop();
            if (typeof this.oncomplete === 'function') {
                this.oncomplete();
            }
            this._parent.unload();
        }
    }
    reset() {
        this._ttl = this._dur;
        this._timeKeeper.reset();
    }
    play() {
        if (this._isRunning) {
            return;
        }
        if (this._dur === 0 || this._ttl <= 0) {
            return;
        }
        this._isRunning = true;
        this._timeKeeper.reset();
        if (this._tween) {
            this._tween.play();
        }
    }
    stop() {
        if (!this._isRunning) {
            return;
        }
        this._isRunning = false;
        this._timeKeeper.reset();
        if (this._tween) {
            this._tween.stop();
        }
    }
    forecasting(_time: number) {
        return false;
    }
    setPlayTime(playtime: number) {
        this._ttl = this._dur - playtime;
        if (this._tween) {
            if (this._isRunning) {
                this._tween.gotoAndPlay(playtime);
            } else {
                this._tween.gotoAndStop(playtime);
            }
        }
    }
    protected motionSetToTween(motion: Record<string, any>) {
        const tweens: Array<ITween> = [];
        for (const movingconsts in motion) {
            if (!motion.hasOwnProperty(movingconsts)) {
                continue;
            }
            const mProp = motion[movingconsts];
            if (!mProp.hasOwnProperty("fromValue")) {
                continue;
            }
            if (!mProp.hasOwnProperty("toValue")) {
                mProp["toValue"] = mProp["fromValue"];
            }
            if (!mProp.hasOwnProperty("lifeTime")) {
                mProp["lifeTime"] = this._dur;
            }
            const src: Record<string, any> = {}, dst: Record<string, any> = {};
            src[movingconsts] = mProp["fromValue"];
            dst[movingconsts] = mProp["toValue"];
            if (typeof mProp["easing"] === "string") {
                mProp["easing"] = Tween.getEasingFuncByName(mProp["easing"]);
            }
            if (mProp.hasOwnProperty("startDelay")) {
                tweens.push(Tween.delay(
                    Tween.tween(
                        this._parent,
                        dst,
                        src,
                        mProp["lifeTime"],
                        mProp["easing"]),
                    mProp["startDelay"] / 1000));
            } else {
                tweens.push(
                    Tween.tween(
                        this._parent,
                        dst,
                        src,
                        mProp["lifeTime"],
                        mProp["easing"]));
            }
        }
        return Tween.parallel.apply(Tween, tweens);
    }
    initTween(motion: object, _repeat?: boolean) {
        this._tween = this.motionSetToTween(motion);
    }
    initTweenGroup(motionGroup: Array<object>, _lifeTime: number) {
        const tweens: Array<ITween> = [];
        for (let i = 0; i < motionGroup.length; i++) {
            tweens.push(this.motionSetToTween(motionGroup[i]));
        }
        this._tween = Tween.serial.apply(Tween, tweens);
    }
    setCompleteListener(listener: Function) {
        this.oncomplete = listener;
    }
}