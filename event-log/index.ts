import './static/index.less';

import Main from './ts/main';
import VanillaEventLog from './ts/eventlog-vanilla';

window.EVENT_LOG_QUEUE =
    Object.prototype.toString.call(window.EVENT_LOG_QUEUE) === '[object Array]' ? window.EVENT_LOG_QUEUE : [];

export interface IConfig {
    hideCallback?: Function;
    limitCount?: number;
}

export default class EventLog {
    constructor(selector: string, config: IConfig) {
        if (
            window.$ &&
            window.$.fn.jquery &&
            Object.prototype.toString.call(window.$) === '[object Function]' &&
            Object.prototype.toString.call(window.$.fn) === '[object Object]'
        ) {
            // jquery
            return new Main(selector, config);
        } else {
            return new VanillaEventLog(selector, config);
        }
    }
    static text() {
        return window.eventLogText;
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        EVENT_LOG_QUEUE?: Record<string, any>[];
        $?: JQueryStatic;
    }
}