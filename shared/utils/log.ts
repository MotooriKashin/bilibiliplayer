import { GPU_INFO } from './detect-gpu';
import { EventEmitter } from 'events';

export enum LogType {
    error = 1 << 0,
    warn = 1 << 1,
    info = 1 << 2,
    debug = 1 << 3,
    log = 1 << 4,
}

export interface ILogData {
    tag: string;
    mask: number;
    actor: string;
    message: string;
    creationTime: string;
}

export interface IMiscObject {
    version: string;
    userAgent: string;
    cookieEnabled: boolean;
    hardwareConcurrency: number;
    devicePixelRatio: number;
    screen: string;
    gpu: string;
    frameUrl: string;
    referrer: string;
}

export interface IFormatData {
    data: ILogData[];
    misc: IMiscObject;
}

export interface IFilterOptions {
    version?: string;
    permission?: number;
    data?: ILogData[];
}

export class Log {
    static get ERROR() {
        return LogType.error;
    }

    static get WARN() {
        return LogType.warn;
    }

    static get INFO() {
        return LogType.info;
    }

    static get DEBUG() {
        return LogType.debug;
    }

    static get LOG() {
        return LogType.log;
    }

    static get ALL() {
        return Log.ERROR | Log.WARN | Log.INFO | Log.DEBUG | Log.LOG;
    }

    static get quota() {
        return {
            discard: 10000,
            maximum: 1000000,
        };
    }

    static readonly emitter = new EventEmitter();
    private static permission: number = 0;
    private static readonly data: ILogData[] = [];

    private readonly tag: string;

    constructor(tag: string) {
        this.tag = tag;
    }

    /**
     * @desc 如果需要收集全局错误，请手动执行这个函数
     * @desc 此函数也收集 Promise 抛出的错误（如果浏览器支持的话）
     */
    static onContextErrorEvent() {
        const tag = 'ContextError';

        function contextErrorHandler(e: ErrorEvent) {
            const buffer: string[] = [];
            if (e.message) buffer.push(`message: ${e.message}`);
            if (e.filename) buffer.push(`filename: ${e.filename}`);
            if (e.lineno) buffer.push(`lineno: ${e.lineno}`);
            if (e.colno) buffer.push(`colno: ${e.colno}`);
            if (e.error) buffer.push(`error: ${JSON.stringify(e.error)}`);
            Log.addLogItem(Log.ERROR, tag, buffer.join(' - '), 'Log>contextErrorHandler');
        }

        function promiseErrorHandler(e: PromiseRejectionEvent) {
            const buffer: string[] = [];
            if (e.reason) buffer.push(`reason: ${e.reason}`);
            Log.addLogItem(Log.WARN, tag, buffer.join(' - '), 'Log>promiseErrorHandler');
        }

        self.addEventListener('error', contextErrorHandler, true);
        self.addEventListener('unhandledrejection', promiseErrorHandler, true);

        return {
            tag: tag,
            offContextErrorEvent() {
                self.removeEventListener('error', contextErrorHandler, true);
                self.removeEventListener('unhandledrejection', promiseErrorHandler, true);
            },
        };
    }

    static enable(mask: number) {
        Log.permission |= mask;
    }

    static disable(mask: number) {
        Log.permission &= ~mask;
    }

    static isAllow(mask: number, permission = Log.permission) {
        return (permission & mask) === mask;
    }

    static isOnlyAllow(mask: number, permission = Log.permission) {
        return permission === mask;
    }

    static isNotAllow(mask: number, permission = Log.permission) {
        return (permission & mask) === 0;
    }

    static filter(options: IFilterOptions = {}): IFormatData {
        const data = options.data || Log.data;
        const version = options.version || 'n/a';
        const permission = options.permission || Log.ALL;

        return {
            data: data.filter((item) => Log.isAllow(item.mask, permission)),
            misc: {
                version: version,
                userAgent: navigator.userAgent,
                cookieEnabled: navigator.cookieEnabled,
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                devicePixelRatio: self.devicePixelRatio || 0,
                screen: `width: ${screen.width}, height: ${screen.height}`,
                gpu: `vendor: ${GPU_INFO.vendor}, renderer: ${GPU_INFO.renderer}`,
                frameUrl: document.URL,
                referrer: document.referrer,
            },
        };
    }

    static format(input: IFormatData): string {
        const cache: string[] = [];

        cache.push('------------------- Metadata Starting -------------------');
        Object.keys(input.misc).forEach((key) => {
            cache.push(`${key}: ${input.misc[<keyof IFormatData["misc"]>key]}`);
        });
        cache.push('------------------- Metadata Finished -------------------');

        cache.push('------------------- LogItems Starting -------------------');
        Object.keys(input.data).forEach((key) => {
            input.data.forEach((d) => {
                if (d.actor) {
                    cache.push(`[${d.creationTime}]-[${LogType[d.mask]}]-[${d.tag}]-[${d.message}]-[${d.actor}]`);
                } else {
                    cache.push(`[${d.creationTime}]-[${LogType[d.mask]}]-[${d.tag}]-[${d.message}]`);
                }
            });
        });
        cache.push('------------------- LogItems Finished -------------------');

        return cache.join('\n');
    }

    /**
     * @desc ERROR - 记录错误信息（P0）
     * @desc `tag` 固定为 Global，其他方面和实例方法相同。以下方法类似，不再累述
     */
    static e(message: string, actor?: string) {
        Log.takeRecord(Log.ERROR, 'Global', message, actor);
    }

    /**
     * @desc WARN - 记录警告信息（P1）
     */
    static w(message: string, actor?: string) {
        Log.takeRecord(Log.WARN, 'Global', message, actor);
    }

    /**
     * @desc INFO - 记录有用信息（P2）
     */
    static i(message: string, actor?: string) {
        Log.takeRecord(Log.INFO, 'Global', message, actor);
    }

    /**
     * @desc DEBUG - 记录调试信息（P3）
     */
    static d(message: string, actor?: string) {
        Log.takeRecord(Log.DEBUG, 'Global', message, actor);
    }

    /**
     * @desc LOG - 记录任意信息（P4）
     */
    static l(message: string, actor?: string) {
        Log.takeRecord(Log.LOG, 'Global', message, actor);
    }

    private static addLogItem(mask: number, tag: string, message: string, actor: string = '') {
        const item = {
            tag: tag,
            mask: mask,
            actor: actor,
            message: message,
            creationTime: new Date().toISOString(),
        };

        if (Log.data.length > Log.quota.maximum) {
            Log.data.splice(0, Log.quota.discard);
        }
        Log.data.push(item);

        return item;
    }

    private static takeRecord(mask: number, tag: string, message: string, actor: string = '') {
        const type = LogType[mask];
        const item = Log.addLogItem(mask, tag, message, actor);

        if (mask === Log.ERROR && type) {
            Log.emitter.emit(type, item);
        }

        if (Log.isAllow(mask) && self.console && typeof self.console[<keyof Console>type] === 'function') {
            self.console[<"log">type](`[${tag}]: ${message}`, `${actor}`);
        }
    }

    e(message: string, actor?: string) {
        Log.takeRecord(Log.ERROR, this.tag, message, actor);
    }

    w(message: string, actor?: string) {
        Log.takeRecord(Log.WARN, this.tag, message, actor);
    }

    i(message: string, actor?: string) {
        Log.takeRecord(Log.INFO, this.tag, message, actor);
    }

    d(message: string, actor?: string) {
        Log.takeRecord(Log.DEBUG, this.tag, message, actor);
    }

    l(message: string, actor?: string) {
        Log.takeRecord(Log.LOG, this.tag, message, actor);
    }
}
