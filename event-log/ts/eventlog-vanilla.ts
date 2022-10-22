import { IConfig } from '../index';
function _$(selector: string) {
    return document.querySelectorAll(selector);
}
function hasClass(obj: HTMLElement, cls: string) {
    return obj.className.match(new RegExp(`(\\s|^)${cls}(\\s|$)`));
}
function addClass(obj: HTMLElement, cls: string) {
    if (!hasClass(obj, cls)) {
        obj.className += ` ${cls}`;
    }
}

function removeClass(obj: HTMLElement, cls: string) {
    let objClass = ` ${obj.className} `;
    objClass = objClass.replace(/(\s+)/gi, ' ');
    let removed = objClass.replace(` ${cls} `, ' ');
    removed = removed.replace(/(^\s+)|(\s+$)/g, '');
    obj.className = removed;
}
export default class VanillaEventLog {
    private selector: Element;
    private config: IConfig;
    private template: any;
    private logCache: Array<string>;
    private prefix: string;
    private events: any;
    private count: number;

    constructor(selector: string, config: IConfig) {
        this.prefix = 'bilibili-player-event-log';
        this.selector = _$(selector)[0];
        this.config = config;
        this.template = null;
        this.logCache = [];
        this.events = {};
        this.count = 0;
    }
    private init() {
        this.selector.appendChild(this.tpl());
        this.template = {
            container: this.selector.querySelector(`.${this.prefix}-container`),
            close: this.selector.querySelector(`.${this.prefix}-close`),
            panel: this.selector.querySelector(`.${this.prefix}-panel`),
        };
        this.template.container.style.overflowX = 'hidden';
        this.template.container.style.overflowY = 'scroll';
        this.template.close.addEventListener('click', () => {
            this.hide();
        });
        return this.template;
    }
    private tpl() {
        const wrap = document.createElement('div');
        wrap.innerHTML = `<div class="${this.prefix}-container">
                    <div class="${this.prefix}-panel"></div>
                    <div class="${this.prefix}-close">[x]</div>
                </div>`;

        return wrap.childNodes[0];
    }
    private _log(log: string, type: number, start?: number) {
        const time = new Date();
        const now = time.getTime();
        const types = ['Info', 'Warning', 'Error', 'Hide'];
        const ctype = types[type];
        const typeClass = `bilibili-player-event-log-${ctype.toLowerCase()}`;
        if (log) {
            this.count++;
            if (!window.eventLogText) {
                window.eventLogText = [];
            }
            let cache = '';
            if (this.config.limitCount && this.count > this.config.limitCount) {
                this.logCache.splice(0, this.count - this.config.limitCount);
                this.count -= this.count - this.config.limitCount;
            }
            if (log.indexOf('\n') > -1 && type !== 3) {
                cache = `<p>&nbsp;</p>`;
            }
            if (type !== 3) {
                cache = `<p class="${typeClass}"><span class="bilibili-player-event-log-content">[${ctype[0]
                    }] > ${log} </span> ${start ? `<span class="bilibili-player-event-log-duration">${now - start} ms</span>` : ''
                    }</p>`;
            }
            if (hasClass(this.template.container, 'active')) {
                this._refreshTpl();
            }
            window.eventLogText.push(
                `[${ctype === 'Hide' ? 'Info' : ctype
                }] > ${time.getHours()} : ${time.getMinutes()} : ${time.getSeconds()}: ${time.getMilliseconds()}  ${log} ${start ? `  ${now - start} ms` : ''
                }\n`,
            );
        }
    }
    private _refreshTpl() {
        if (this.selector) {
            this.template.panel.innerHTML = this.logCache.join('');
        }
    }
    show() {
        if (!this.template) {
            this.init();
        }
        this._refreshTpl();
        addClass(this.template.container, 'active');
    }
    hide() {
        removeClass(this.template.container, 'active');
        if (this.config && this.config.hideCallback && typeof this.config.hideCallback === 'function') {
            this.config.hideCallback();
        }
        this.trigger('close');
    }
    log(log: string, type: number, start: number) {
        if (window.EVENT_LOG_QUEUE && window.EVENT_LOG_QUEUE.length) {
            this._log('BILIBILI HTML5 PLAYER LOG', 0);
            window.EVENT_LOG_QUEUE.length &&
                window.EVENT_LOG_QUEUE.forEach((v: any) => {
                    this._log(v.log, v.type, v.start);
                });
            window.EVENT_LOG_QUEUE = undefined;
        }
        this._log(log, type, start);
        return Date.now();
    }

    download() {
        const logs = (window.eventLogText || []).join('\n') + '\n' + (window['dashPlayer']?.getLogHistory()?.log || '');
        const downFile = (blob: any, fileName: string) => {
            if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
                // for IE
                navigator.msSaveBlob!(blob, fileName);
            } else {
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = fileName;
                link.style.display = 'none';
                link.target = '_blank';
                _$('body')[0].appendChild(link);
                link.click();
                setTimeout(() => {
                    link.remove();
                    window.URL.revokeObjectURL(link.href);
                }, 3000);
            }
        };
        const blob = new Blob([logs!], {
            type: 'text/plain',
        });
        const fileName = 'eventlog.txt';
        downFile(blob, fileName);
    }

    bind(type: string, callback: Function) {
        if (typeof type === 'string' && typeof callback === 'function') {
            if (!this.events[type]) {
                this.events[type] = [];
            }
            this.events[type].push(callback);
        }
        return this;
    }

    trigger(type: string) {
        if (this.events[type] && this.events[type].length) {
            this.events[type].forEach((item: Function) => {
                item();
            });
        }
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        eventLogText?: string[];
    }
}