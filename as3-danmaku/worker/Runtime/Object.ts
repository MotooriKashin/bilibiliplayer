import { __trace, __pchannel, __schannel, __achannel } from "../OOAPI";

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

/** 事件管理组件 */
export class MetaObject {
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