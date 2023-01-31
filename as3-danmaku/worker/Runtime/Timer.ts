import { __trace } from "../OOAPI";
import { registeredObjects } from "./Object";

/** 主机时间记录 */
class RuntimeTimer {
    get ttl() {
        return this.dur;
    }
    set ttl(v) {
        this.ttl = v;
    }
    constructor(public type: string, public dur: number, public key: number, public callback: Function) { }
}
/** 延时/循环管理 */
class TimerRuntime {
    protected timer = -1;
    protected timers: RuntimeTimer[] = [];
    protected lastToken = 0;
    protected key = 0;

    constructor(protected precision = 10) { }

    set isRunning(state: boolean) {
        if (state == false) {
            this.stop();
        } else {
            this.start();
        }
    }

    get isRunning() {
        return this.timer > -1;
    }

    start() {
        if (this.timer < 0) {
            this.lastToken = Date.now();
            this.timer = <any>setInterval(() => {
                const elapsed: number = Date.now() - this.lastToken;
                for (let i = 0; i < this.timers.length; i++) {
                    const timer: RuntimeTimer = this.timers[i];
                    if (timer.type === "timeout") {
                        timer.ttl -= elapsed;
                        if (timer.ttl <= 0) {
                            try {
                                timer.callback();
                            } catch (e) {
                                __trace((<Error>e).stack?.toString(), 'err');
                            }
                            this.timers.splice(i, 1);
                            i--;
                        }
                    } else if (timer.type === 'interval') {
                        timer.ttl -= elapsed;
                        if (timer.ttl <= 0) {
                            try {
                                timer.callback();
                            } catch (e) {
                                __trace((<Error>e).stack?.toString(), 'err');
                            }
                            timer.ttl += timer.dur;
                        }
                    } else {
                        // Do nothing
                    }
                }
                this.lastToken = Date.now();
            }, this.precision);
        }
    }

    stop() {
        if (this.timer > -1) {
            clearInterval(this.timer);
            this.timer = -1;
        }
    }

    setInterval(f: Function, interval: number) {
        const myKey = this.key++;
        this.timers.push(new RuntimeTimer('interval', interval, myKey, f));
        return myKey;
    }

    setTimeout(f: Function, timeout: number) {
        const myKey = this.key++;
        this.timers.push(new RuntimeTimer('timeout', timeout, myKey, f));
        return myKey;
    }

    clearInterval(id: number) {
        for (let i = 0; i < this.timers.length; i++) {
            if (this.timers[i].type === 'interval' &&
                this.timers[i].key === id) {
                this.timers.splice(i, 1);
                return;
            }
        }
    }

    clearTimeout(id: number) {
        for (let i = 0; i < this.timers.length; i++) {
            if (this.timers[i].type === 'timeout' &&
                this.timers[i].key === id) {
                this.timers.splice(i, 1);
                return;
            }
        }
    }

    clearAll(type = 'all') {
        if (type === 'timer') {
            this.timers = this.timers.filter(t => t.type !== 'timer');
        } else if (type === 'interval') {
            this.timers = this.timers.filter(t => t.type !== 'interval');
        } else {
            this.timers = [];
        }
    }
}

export class Timer {
    protected microtime = 0;
    protected timer = -1;
    protected listeners: Function[] = [];
    protected complete: Function[] = [];
    currentCount: number = 0;

    constructor(protected delay: number, protected repeatCount = 0) { }

    set isRunning(_b: boolean) {
        __trace('Timer.isRunning is read-only', 'warn');
    }

    get isRunning() {
        return this.timer >= 0;
    }

    start() {
        if (!this.isRunning) {
            let lastTime = Date.now();
            const self = this;
            this.timer = <any>setInterval(() => {
                const elapsed = Date.now() - lastTime;
                self.microtime += elapsed;
                if (self.microtime > self.delay) {
                    self.microtime -= self.delay;
                    self.currentCount++;
                    self.dispatchEvent('timer');
                }
                lastTime = Date.now();
                if (self.repeatCount > 0 &&
                    self.repeatCount <= self.currentCount) {
                    self.stop();
                    self.dispatchEvent('timerComplete');
                }
            }, 20);
        }
    }

    stop() {
        if (this.isRunning) {
            clearInterval(this.timer);
            this.timer = -1;
        }
    }

    reset() {
        this.stop();
        this.currentCount = 0;
        this.microtime = 0;
    }

    addEventListener(type: string, listener: Function) {
        if (type === 'timer') {
            this.listeners.push(listener);
        } else if (type === 'timerComplete') {
            this.complete.push(listener);
        }
    }

    dispatchEvent(event: string) {
        if (event === 'timer') {
            for (let i = 0; i < this.listeners.length; i++) {
                this.listeners[i]();
            }
        } else if (event === 'timerComplete') {
            for (let i = 0; i < this.complete.length; i++) {
                this.complete[i]();
            }
        }
    }
}
/** 时间同步 */
export class TimeKeeper {
    protected lastTime: number = 0;

    constructor(protected clock = () => Date.now()) {
        this.reset();
    }

    get elapsed() {
        return this.clock() - this.lastTime;
    }

    reset() {
        this.lastTime = this.clock();
    }
}

/** 主机时间 */
const masterTimer = new TimerRuntime();

/** 刷新时间 */
let internalTimer = new Timer(40);
const enterFrameDispatcher = function () {
    for (const object in registeredObjects) {
        if (object.substring(0, 2) === '__' && object !== '__root') {
            continue;
        }
        try {
            registeredObjects[object].dispatchEvent('enterFrame');
        } catch (e) { }
    }
};
masterTimer.start();
internalTimer.start();
internalTimer.addEventListener('timer', enterFrameDispatcher);

/** 获取主机时间 */
export function getTimer() {
    return masterTimer;
}

/**
 * 帧率同步
 * @param frameRate 帧率
 */
export function updateFrameRate(frameRate: number) {
    if (frameRate > 60 || frameRate < 0) {
        __trace('Frame rate should be in the range (0, 60]', 'warn');
        return;
    }
    if (frameRate === 0) {
        // Stop broadcasting of enterFrame
        internalTimer.stop();
        return;
    }
    internalTimer.stop();
    internalTimer = new Timer(Math.floor(1000 / frameRate));
    internalTimer.addEventListener('timer', enterFrameDispatcher);
    internalTimer.start();
}