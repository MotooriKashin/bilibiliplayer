import { __trace, __pchannel, __schannel, __achannel } from "../OOAPI";
import { NotCrypto } from "./NotCrypto";
import { MetaObject } from "./Object";
import { hasPermission, injectStyle, openWindow, privilegedCode, requestPermission } from "./Permissions";
import { ScriptManager } from "./ScriptManager";
import { requestLibrary, supports } from "./Supports";
import { TimeKeeper, Timer, TimerRuntime } from "./Timer";

/** 运行时支持的事件 */
interface RegisterableObject {
    getId(): string;
    dispatchEvent(event: string, data?: any): void;
    serialize(): Object;
    unload(): void;
}
export const Runtime = new (class {
    NotCrypto = NotCrypto;
    Timer = Timer;
    TimeKeeper = TimeKeeper;
    ScriptManager = ScriptManager;
    requestPermission = requestPermission;
    hasPermission = hasPermission;
    openWindow = openWindow;
    injectStyle = injectStyle;
    privilegedCode = privilegedCode;
    supports = supports;
    requestLibrary = requestLibrary;
    /** 对象计数，使对象名互斥 */
    protected objCount = 0;
    protected registeredObjects = {
        '__self': new MetaObject('__self'),
        '__player': new MetaObject('__player'),
        '__root': new MetaObject('__root')
    };
    /** 主机时间 */
    masterTimer = new TimerRuntime();
    /** 刷新时间 */
    internalTimer = new Timer(40);
    constructor() {
        this.masterTimer.start();
        this.internalTimer.start();
        this.internalTimer.addEventListener('timer', this.enterFrameDispatcher);
    }
    enterFrameDispatcher = () => {
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
    getTimer() {
        return this.masterTimer;
    }
    /**
    * 帧率同步
    * @param frameRate 帧率
    */
    updateFrameRate(frameRate: number) {
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
    /**
     * 分发对象事件
     * @param objectId 对象
     * @param event 事件名
     * @param payload 内容
     */
    protected dispatchEvent(objectId: string, event: string, payload: any) {
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
    hasObject(objectId: string): boolean {
        return this.registeredObjects.hasOwnProperty(objectId) &&
            this.registeredObjects[<'__self'>objectId] !== null;
    }
    getObject<T extends RegisterableObject>(objectId: string): T {
        return <T><unknown>this.registeredObjects[<'__self'>objectId];
    }
    registerObject(object: RegisterableObject) {
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
    eregisterObject(object: RegisterableObject) {
        const objectId: string = object.getId();
        this.deregisterObjectById(objectId);
    }
    protected deregisterObjectById(objectId: string) {
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
    protected _makeId(type: string = "obj") {
        return type + ":" + Date.now() + "|" +
            NotCrypto.random(16) + ":" + this.objCount;
    }
    generateId(type: string = "obj") {
        let id: string = this._makeId(type);
        while (this.hasObject(id)) {
            id = this._makeId(type);
        }
        return id;
    };
    /** 注销所有对象（不再接收新事件） */
    reset() {
        for (const i in this.registeredObjects) {
            if (i.substr(0, 2) !== "__") {
                this.deregisterObjectById(i);
            }
        }
    }
    /** 清空对象 */
    clear() {
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
    crash() {
        __trace("Runtime.crash() : Manual crash", "fatal");
    }
    /** 正常退出引擎 */
    exit() {
        __achannel("::worker:state", "worker", "terminated");
        self.close();
    }
    /**
     * 发送通知（主机有权拒绝）
     * @param msg 通知
     */
    alert(msg: string) {
        __achannel("Runtime::alert", "::Runtime", msg);
    }
})();