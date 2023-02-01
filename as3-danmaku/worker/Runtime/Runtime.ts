import { __trace, __pchannel, __schannel, __achannel } from "../OOAPI";
import { NotCrypto } from "./NotCrypto";
import { MetaObject } from "./Object";
import { requestPermission, hasPermission, openWindow, injectStyle, privilegedCode } from "./Permissions";
import { ScriptManager } from "./ScriptManager";
import { supports, requestLibrary } from "./Supports";
import { TimeKeeper, Timer, TimerRuntime } from "./Timer";

/** 运行时支持的事件 */
interface RegisterableObject {
    getId(): string;
    dispatchEvent(event: string, data?: any): void;
    serialize(): Object;
    unload(): void;
}
export class Runtime {
    static NotCrypto = NotCrypto;
    static Timer = Timer;
    static TimeKeeper = TimeKeeper;
    static _defaultScriptManager = new ScriptManager();
    static requestPermission = requestPermission;
    static hasPermission = hasPermission;
    static openWindow = openWindow;
    static injectStyle = injectStyle;
    static privilegedCode = privilegedCode;
    static supports = supports;
    static requestLibrary = requestLibrary;

    /** 对象计数，使对象名互斥 */
    protected static objCount = 0;
    protected static registeredObjects = {
        '__self': new MetaObject('__self'),
        '__player': new MetaObject('__player'),
        '__root': new MetaObject('__root')
    };
    /**
     * 分发对象事件
     * @param objectId 对象
     * @param event 事件名
     * @param payload 内容
     */
    protected static dispatchEvent(objectId: string, event: string, payload: any) {
        const obj = this.registeredObjects[<'__self'>objectId];
        if (typeof obj === "object") {
            if (obj.dispatchEvent) {
                obj.dispatchEvent(event, payload);
            }
        }
    }
    /**
     * 检查对象是否已注册
     * @param objectId 对象id
     */
    static hasObject(objectId: string): boolean {
        return this.registeredObjects.hasOwnProperty(objectId) &&
            this.registeredObjects[<'__self'>objectId] !== null;
    }
    static getObject<T extends RegisterableObject>(objectId: string): T {
        return <T><unknown>this.registeredObjects[<'__self'>objectId];
    }
    static registerObject(object: RegisterableObject) {
        if (!object.getId) {
            __trace('Cannot register object without getId method.', 'warn');
            return;
        }
        if (!Runtime.hasObject(object.getId())) {
            this.registeredObjects[<'__self'>object.getId()] = <any>object;
            __pchannel('Runtime:RegisterObject', {
                'id': object.getId(),
                'data': object.serialize()
            });
            __schannel("object::(" + object.getId() + ")", (payload: any) => {
                if (payload.hasOwnProperty('type') &&
                    payload.type === 'event') {
                    this.dispatchEvent(object.getId(), payload.event, payload.data);
                }
            });
            this.objCount++;
            return;
        } else {
            __trace('Attempted to re-register object or id collision @ ' +
                object.getId(), 'warn');
            return;
        }
    }
    static eregisterObject(object: RegisterableObject) {
        const objectId: string = object.getId();
        this.deregisterObjectById(objectId);
    }
    protected static deregisterObjectById(objectId: string) {
        if (Runtime.hasObject(objectId)) {
            if (objectId.substr(0, 2) === '__') {
                __trace('Runtime.deregisterObject cannot de-register a MetaObject',
                    'warn');
                return;
            }
            __pchannel('Runtime:DeregisterObject', {
                'id': objectId
            });
            if (typeof this.registeredObjects[<'__self'>objectId].unload === "function") {
                // Gracefully unload first
                this.registeredObjects[<'__self'>objectId].unload();
            }
            this.registeredObjects[<'__self'>objectId] = <any>null;
            delete (<any>this).registeredObjects[<'__self'>objectId];
        }
    }
    protected static _makeId(type: string = "obj") {
        return type + ":" + Date.now() + "|" +
            NotCrypto.random(16) + ":" + this.objCount;
    }
    static generateId(type: string = "obj") {
        let id: string = this._makeId(type);
        while (this.hasObject(id)) {
            id = this._makeId(type);
        }
        return id;
    };
    /** 注销所有对象（不再接收新事件） */
    static reset() {
        for (const i in this.registeredObjects) {
            if (i.substr(0, 2) !== "__") {
                this.deregisterObjectById(i);
            }
        }
    }
    /** 清空对象 */
    static clear() {
        for (const i in this.registeredObjects) {
            if (i.substr(0, 2) === "__") {
                continue;
            }
            if (typeof this.registeredObjects[<'__self'>i].unload === 'function') {
                this.registeredObjects[<'__self'>i].unload();
            }
        }
    }
    /** 通知沙箱外停止运行脚本 */
    static crash() {
        __trace("Runtime.crash() : Manual crash", "fatal");
    }

    /** 正常退出引擎 */
    static exit() {
        __achannel("::worker:state", "worker", "terminated");
        self.close();
    }

    /**
     * 发送通知（主机有权拒绝）
     * @param msg 通知
     */
    static alert(msg: string) {
        __achannel("Runtime::alert", "::Runtime", msg);
    }
    /** 主机时间 */
    static masterTimer = new TimerRuntime();
    /** 刷新时间 */
    static internalTimer = new Timer(40);
    static enterFrameDispatcher = () => {
        for (const object in this.registeredObjects) {
            if (object.substring(0, 2) === '__' && object !== '__root') {
                continue;
            }
            try {
                this.registeredObjects[<'__self'>object].dispatchEvent('enterFrame');
            } catch (e) { }
        }
    };
    /** 获取主机时间 */
    static getTimer() {
        return this.masterTimer;
    }
    /**
     * 帧率同步
     * @param frameRate 帧率
     */
    static updateFrameRate(frameRate: number) {
        if (frameRate > 60 || frameRate < 0) {
            __trace('Frame rate should be in the range (0, 60]', 'warn');
            return;
        }
        if (frameRate === 0) {
            // Stop broadcasting of enterFrame
            this.internalTimer.stop();
            return;
        }
        this.internalTimer.stop();
        this.internalTimer = new Timer(Math.floor(1000 / frameRate));
        this.internalTimer.addEventListener('timer', this.enterFrameDispatcher);
        this.internalTimer.start();
    }
}
Runtime.masterTimer.start();
Runtime.internalTimer.start();
Runtime.internalTimer.addEventListener('timer', Runtime.enterFrameDispatcher);