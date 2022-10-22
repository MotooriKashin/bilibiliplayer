import { IConfig } from '..';
import utils from './utils';
class Main {
    config: IConfig;
    container: HTMLElement;
    tips!: HTMLElement;
    destroyStatus: boolean;
    REMOVE_INTERVAL: number;
    onMini: boolean;
    callbackMap: any;
    prefix: string;

    constructor(container: HTMLElement, config: IConfig) {
        if (!container || !(container instanceof Element)) {
            throw new Error('Container Error');
        }
        const DEFAULT_OPTIONS = {
            backgroundColor: '#141414',
            msg: '主人，未安装Flash插件，暂时无法观看视频，您可以…',
            msgColor: '#999',
            msgSize: 18,
            btnList: [
                {
                    title: '下载Flash插件',
                    width: 120,
                    height: 32,
                    type: 'flash',
                    theme: 'red',
                },
                {
                    title: '使用HTML5播放器',
                    width: 150,
                    height: 32,
                    type: 'html5',
                    theme: 'orange',
                    onClick: () => {
                        console.log('rua!');
                    },
                },
            ],
            hasOrText: true,
            miniType: 0, // 0: 缩小版提示 , 1: 默认文字提示
            miniMsg: 'Flash未安装或者被禁用',
            miniColor: '#fff',
        };

        this.container = container;
        this.config = utils.extend({}, DEFAULT_OPTIONS, config);
        this.destroyStatus = false;
        this.REMOVE_INTERVAL = 0;

        this.onMini = false;

        this.callbackMap = {};
        this.prefix = 'bp-no-flash-tips';

        try {
            this.init();
        } catch (err) {
            console.warn(err);
        }
    }

    init() {
        const config = this.config;

        this.addContainerPosition();

        this.tips = document.createElement('div');
        this.tips.className = `${this.prefix}`;
        this.tips.style.backgroundColor = config.backgroundColor;

        this.tips.innerHTML = `
            <div class="${this.prefix}-content">
                 <div class="${this.prefix}-missing-image">
                    <img src="//s1.hdslb.com/bfs/static/player/img/missing.png">
                 </div>
                 <div class="${this.prefix}-info" style="color:${config.msgColor};font-size:${config.msgSize}px;">
                    ${config.msg}
                </div>
                 <div class="${this.prefix}-btn-content">
                    ${this.createBtns()}
                </div>
            </div>    
            <div class="${this.prefix}-mini-info" style="color:${config.miniColor}">${config.miniMsg}</div>`;

        this.container.appendChild(this.tips);

        this.bindEvents();
    }

    bindEvents() {
        const tips = this.tips,
            callbackMap = this.callbackMap;

        if (tips.addEventListener) {
            tips.addEventListener('click', (e) => {
                const event = e || window.event,
                    target = event.target,
                    id = (<any>target).id;

                if (id && callbackMap[id]) {
                    utils.callFunction(callbackMap[id], this.destroy.bind(this));
                }
            });
        }

        const resize = utils.bindElemResize(tips, (width: number, height?: number) => {
            if (width <= 400 && !this.onMini) {
                this.onMini = true;
                const miniClass =
                    this.config.miniType === 0
                        ? `${this.prefix}-mini`
                        : `${this.prefix}-mini ${this.prefix}-mini-info-only`;
                this.tips.className = `${this.prefix} ${miniClass}`;
            } else if (width > 400 && this.onMini) {
                this.onMini = false;
                this.tips.className = `${this.prefix}`;
            }
        });
        typeof resize === 'function' && resize();
    }

    addContainerPosition() {
        const container = this.container;

        if (window.getComputedStyle) {
            const position = window.getComputedStyle(container).position;

            if (!position || position === 'static') {
                container.style.position = 'relative';
            }
        }
    }

    createBtns() {
        const config = this.config,
            btnList = config.btnList;

        let btnHTML = '';

        if (btnList instanceof Array && btnList.length) {
            btnList.forEach((btn, index) => {
                const style = `width:${btn.width}px;height:${btn.height - 2}px;line-height:${btn.height - 2}px;`;

                if (btn.type === 'flash') {
                    btnHTML += `<a href="https://www.adobe.com/go/getflashplayer" target="_blank" class="${this.prefix}-btn ${this.prefix}-flash-btn ${this.prefix}-btn-${btn.theme}" style="${style}">${btn.title}</a>`;
                } else {
                    const id = utils.getRandomID(12);
                    btnHTML += `<a id="${id}" href="javascript:;" class="${this.prefix}-btn ${this.prefix}-btn-${btn.theme}" style="${style}">${btn.title}</a>`;
                    btn.onClick && this.addCallback(id, btn.onClick);
                }

                if (index < btnList.length - 1 && config.hasOrText) {
                    btnHTML += `<span class="${this.prefix}-or" style="height:${btn.height - 2}px;line-height:${btn.height - 2
                        }px;">或</span>`;
                }
            });
        }

        return btnHTML;
    }

    addCallback(id: any, callback: Function) {
        if (id && typeof callback === 'function') {
            if (!this.callbackMap[id]) {
                this.callbackMap[id] = [];
            }
            this.callbackMap[id].push(callback);
        }
    }

    destroy() {
        if (this.destroyStatus) {
            return;
        }
        this.destroyStatus = true;

        const container = this.container,
            tips = this.tips,
            prefix = this.prefix,
            miniClass = this.onMini ? `${prefix}-mini` : '';

        tips.className = `${prefix} ${miniClass} ${prefix}-destroying`;
        this.callbackMap = {};

        clearTimeout(this.REMOVE_INTERVAL);
        this.REMOVE_INTERVAL = window.setTimeout(() => {
            if (container && tips && tips.parentNode) {
                container.removeChild && container.removeChild(tips);
            }
        }, 300);
    }
}

export default Main;
