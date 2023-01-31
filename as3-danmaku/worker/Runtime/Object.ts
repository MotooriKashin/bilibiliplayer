import { __trace, __pchannel, __schannel, __achannel } from "../OOAPI";
import { NotCrypto } from "./NotCrypto";
import { Runtime } from "./Runtime";

type ObjectRegistry = { [objectName: string]: RegisterableObject };
export type IMetaObject = RegisterableObject & Listenable;
/** 事件管理基类 */
interface Listenable {
    addEventListener(
        event: string,
        listener: Function,
        useCapture?: boolean,
        priority?: number): void;
    removeEventListener(
        event: string,
        listener: Function,
        useCapture?: boolean
    ): void;
    hasEventListener(event: string): boolean;
}

/** 运行时支持的事件 */
interface RegisterableObject {
    getId(): string;
    dispatchEvent(event: string, data?: any): void;
    serialize(): Object;
    unload(): void;
}

/** 事件管理组件 */
class MetaObject implements IMetaObject {
    protected name: string;
    protected listeners: { [name: string]: Array<Function> } = {};

    constructor(name: string) {
        if (name.slice(0, 2) !== '__') {
            throw new Error('MetaObject names must start with two underscores.');
        }
        this.name = name;
    }

    addEventListener(event: string,
        listener: Function,
        _useCapture = false,
        _priority = 0) {

        if (!(event in this.listeners)) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    removeEventListener(event: string,
        listener: Function,
        _useCapture = false) {

        if (!(event in this.listeners)) {
            return;
        }
        const index = this.listeners[event].indexOf(listener)
        if (index >= 0) {
            this.listeners[event].splice(index, 1);
        }
    }

    hasEventListener(event: string) {
        return event in this.listeners && this.listeners[event].length > 0;
    }

    dispatchEvent(event: string, data?: any) {
        if (!(event in this.listeners)) {
            return; // Ignore
        }
        for (let i = 0; i < this.listeners[event].length; i++) {
            this.listeners[event][i](data);
        }
    }

    getId() {
        return this.name;
    }

    serialize() {
        return {
            "class": this.name
        };
    }

    unload() {
        throw new Error('Meta objects should not be unloaded!');
    }
}

/** 对象计数，使对象名互斥 */
let objCount = 0;
const _registeredObjects: ObjectRegistry = {
    '__self': new MetaObject('__self'),
    '__player': new MetaObject('__player'),
    '__root': new MetaObject('__root')
};

export let registeredObjects: ObjectRegistry;
Object.defineProperty(Runtime, 'registeredObjects', {
    get: function () {
        return _registeredObjects;
    },
    set: function (_value) {
        __trace('Runtime.registeredObjects is read-only', 'warn');
    }
});

/**
 * 分发对象事件
 * @param objectId 对象
 * @param event 事件名
 * @param payload 内容
 */
function _dispatchEvent(objectId: string, event: string, payload: any) {
    const obj: RegisterableObject = _registeredObjects[objectId];
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
export function hasObject(objectId: string): boolean {
    return _registeredObjects.hasOwnProperty(objectId) &&
        _registeredObjects[objectId] !== null;
}

/**
 * 获取对象
 * @param objectId 对象id
 */
export function getObject<T extends RegisterableObject>(objectId: string): T {
    return <T>_registeredObjects[objectId];
}

/**
 * 注册沟通对象
 */
export function registerObject(object: RegisterableObject) {
    if (!object.getId) {
        __trace('Cannot register object without getId method.', 'warn');
        return;
    }
    if (!Runtime.hasObject(object.getId())) {
        _registeredObjects[object.getId()] = object;
        __pchannel('Runtime:RegisterObject', {
            'id': object.getId(),
            'data': object.serialize()
        });
        __schannel("object::(" + object.getId() + ")", (payload: any) => {
            if (payload.hasOwnProperty('type') &&
                payload.type === 'event') {
                _dispatchEvent(object.getId(), payload.event, payload.data);
            }
        });
        objCount++;
        return;
    } else {
        __trace('Attempted to re-register object or id collision @ ' +
            object.getId(), 'warn');
        return;
    }
}

/**
 * 注销对象（不再接收新事件）
 * @param object 对象名
 */
export function deregisterObject(object: RegisterableObject) {
    const objectId: string = object.getId();
    deregisterObjectById(objectId);
}

function deregisterObjectById(objectId: string) {
    if (Runtime.hasObject(objectId)) {
        if (objectId.substr(0, 2) === '__') {
            __trace('Runtime.deregisterObject cannot de-register a MetaObject',
                'warn');
            return;
        }
        __pchannel('Runtime:DeregisterObject', {
            'id': objectId
        });
        if (typeof _registeredObjects[objectId].unload === "function") {
            // Gracefully unload first
            _registeredObjects[objectId].unload();
        }
        _registeredObjects[objectId] = <any>null;
        delete _registeredObjects[objectId];
    }
}

function _makeId(type: string = "obj") {
    return type + ":" + Date.now() + "|" +
        NotCrypto.random(16) + ":" + objCount;
}

/**
 * 生成新对象
 * @param type 对象类型
 */
export function generateId(type: string = "obj") {
    let id: string = _makeId(type);
    while (Runtime.hasObject(id)) {
        id = _makeId(type);
    }
    return id;
};

/** 注销所有对象（不再接收新事件） */
export function reset() {
    for (const i in _registeredObjects) {
        if (i.substr(0, 2) !== "__") {
            deregisterObjectById(i);
        }
    }
}

/** 清空对象 */
export function clear() {
    for (const i in _registeredObjects) {
        if (i.substr(0, 2) === "__") {
            continue;
        }
        if (typeof _registeredObjects[i].unload === 'function') {
            _registeredObjects[i].unload();
        }
    }
}

/** 通知沙箱外停止运行脚本 */
export function crash() {
    __trace("Runtime.crash() : Manual crash", "fatal");
}

/** 正常退出引擎 */
export function exit() {
    __achannel("::worker:state", "worker", "terminated");
    self.close();
}

/**
 * 发送通知（主机有权拒绝）
 * @param msg 通知
 */
export function alert(msg: string) {
    __achannel("Runtime::alert", "::Runtime", msg);
}