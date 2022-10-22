import { IConfig } from '../index';

export default class Main {
    private selector!: Element | null;
    private prefix: string;
    private config: IConfig;
    private template: any;
    private logCache: Array<string>;
    private selectorClass: string;
    private scrollBar: any;
    private timer: number = 0;
    private count: number;

    constructor(selector: string, config: IConfig) {
        this.prefix = 'bilibili-player-event-log';
        this.selectorClass = selector;
        this.config = config || {};
        this.template = null;
        this.logCache = [];
        this.count = 0;
    }
    private init() {
        if (this.template) {
            return this.template;
        }
        this.selector = document.querySelector(this.selectorClass);
        if (!this.selector) {
            return;
        }
        this.selector.appendChild(this.tpl());
        this.template = {
            container: this.selector.querySelector(`.${this.prefix}-container`),
            close: this.selector.querySelector(`.${this.prefix}-close`),
            panel: this.selector.querySelector(`.${this.prefix}-panel`),
        };
        this.scrollBar = $(this.template.container).mCustomScrollbar({
            axis: "y",
            scrollInertia: 200,
            autoHideScrollbar: true
        })
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
    show() {
        if (!this.template) {
            this.init();
        }
        this.template.container.classList.add('active');
        this._refreshTpl();
        this.toBottom();
    }

    toBottom() {
        this.timer && clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
            $(this.template.container).mCustomScrollbar("scrollTo", "bottom");
        }, 50);
    }
    hide() {
        this.template.container.classList.remove('active');
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
    private _log(log: string, type: number, param?: number) {
        if (typeof log !== 'undefined') {
            log = String(log);
        }
        const time = new Date();
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
                cache += '<p>&nbsp;</p>';
            }
            if (type !== 3) {
                cache += `<p class="${typeClass}"><span class="bilibili-player-event-log-content">[${ctype[0]
                    }] > ${log} </span> ${param ? `<span class="bilibili-player-event-log-duration">${param} ms</span>` : ''
                    }</p>`;
            }
            this.logCache.push(cache);
            if (this.selector && this.template && $!(this.template.container).hasClass('active')) {
                this._refreshTpl();
            }
            window.eventLogText.push(
                `[${ctype === 'Hide' ? 'Info' : ctype
                }] > ${time.getHours()} : ${time.getMinutes()} : ${time.getSeconds()}: ${time.getMilliseconds()}  ${log} ${param ? `  ${param} ms` : ''
                }\n`,
            );
            if (this.selector && this.scrollBar && $!(this.template.container).is(':visible')) {
                this.toBottom();
            }
        }
    }
    private _refreshTpl() {
        if (this.selector) {
            // @ts-ignore
            $(this.template.panel).html($(this.logCache.join('')));
        }
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
                $!('body').append(link);
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
        // @ts-ignore
        $(this.template.container).bind(`${type}eventlog`, callback);
    }
    trigger(type: string) {
        $!(this.template.container).trigger.apply($!(this.template.container), [`${type}eventlog`]);
    }
}
