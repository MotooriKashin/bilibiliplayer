import { ScriptingContext } from "./host/ScriptingContext";
import ParserWorker from "./host/worker";

import './css/index.less';
import { debug } from "./debug";

/** 配置数据 */
interface IOption {
    /** 弹幕面板 */
    container?: HTMLElement;
    easing?: string;
    /** 是否关闭弹幕 */
    visible?: boolean;
    /** 时间轴校对 */
    timeSyncFunc?: Function;
    /** 弹幕屏蔽检查 */
    blockJudge?: Function;
}
/** 播放器实例 */
interface IPlayer {
    pause(): any;
    seek(time: number | string, type?: number, autoSeek?: any): any;
    [key: string]: any;
}
/** 弹幕 */
interface IDanmaku {
    stime: number;
    mode: number;
    size: number;
    color: number;
    date: number;
    class: number;
    pool: number;
    uhash: string;
    uid: string;
    dmid: string;
    text: string;
}
/** 主机与沙箱通信格式 */
interface IWorkerMessage {
    channel: string;
    payload: unknown;
    callback: boolean;
    auth?: string;
    obj?: unknown;
    mode?: 'log' | 'warn' | 'err' | 'fatal';
}
export class As3Danmaku {
    /** 配置 */
    protected options: IOption;
    /** 弹幕容器 */
    protected container: HTMLElement;
    /** 播放暂停 */
    protected paused = true;
    protected sTime = 0;
    /** 初始化标记 */
    protected inited = false;
    /** 弹幕列表 */
    protected dmList: IDanmaku[] = [];
    /** 当前显示弹幕列表 */
    protected cdmList: IDanmaku[] = [];
    /** 是否启用弹幕 */
    protected visibleStatus: boolean;
    protected cTime = 0;
    protected pTime = 0;
    protected time0 = 0;
    protected pauseTime = 0;
    protected startTime: number;
    protected testId = 0;
    /** 弹幕节点 */
    protected wrap?: HTMLDivElement;
    protected resolutionWidth!: number;
    protected resolutionHeight!: number;
    /** 沙箱 */
    protected worker?: Worker;
    /** 主机与沙箱通信频道列表 */
    protected channels: Record<string, Function[]> = {};
    /** 主机 */
    protected scriptContext?: ScriptingContext;
    constructor(options: IOption = {}, public player?: IPlayer) {
        const defaultOptions: IOption = {
            container: <HTMLElement>document.getElementById('player'),
            easing: 'linear',
            visible: true
        };
        this.options = Object.assign(defaultOptions, options);

        this.container = this.options.container!;
        this.visibleStatus = this.options.visible!;
        this.startTime = new Date().getTime();
    }
    /** 初始化 */
    init() {
        if (!this.inited) {
            this.inited = true;
            this.wrap = document.createElement('div');
            this.wrap.classList.add('as3-danmaku');
            this.container.appendChild(this.wrap);
            this.scriptContext = new ScriptingContext(this.wrap);

            if (this.resolutionWidth && this.resolutionHeight) {
                this.resize();
            }

            window['requestAnimationFrame'](() => {
                this.render();
            });

            document.addEventListener('visibilitychange', e => {
                if (!document.hidden) {
                    if (typeof this.options.timeSyncFunc === 'function') {
                        this.seek(this.options.timeSyncFunc() / 1000);
                    }
                }
            });
        }
    }
    /** 添加弹幕 */
    add(dms: IDanmaku[] | IDanmaku) {
        this.dmList = this.dmList.concat(dms);
    }
    /** 移除弹幕 */
    remove(dmid: string) {
        this.dmList = this.dmList.filter((item) => item.dmid !== dmid);
    }
    /** 解析弹幕 */
    protected parse(dm: IDanmaku) {
        this.worker || this.InitWorker();
        this.sendWorkerMessage('::eval', dm.text);
    }
    /** 初始化沙箱 */
    protected InitWorker() {
        try {
            this.worker && this.worker.terminate();
        } catch { }
        this.worker = new ParserWorker();
        this.worker.addEventListener("message", this.WorkerMessage);
    }
    /** 解析沙箱信息 */
    protected WorkerMessage = (msg: MessageEvent) => {
        try {
            const data = <IWorkerMessage>JSON.parse(msg.data);
            if (!data.channel) {
                return;
            }
            if (data.channel === 'fatal') {
                return this.InitWorker();
            }
            if (data.channel.substring(0, 8) === "::worker") {
                const type = data.channel.substring(8);
                switch (type) {
                    case ":state":
                        if (data.payload === "running" && data.auth === "worker") {
                            this.bindEvent();
                        }
                        break;
                    case ':debug':
                        debug(JSON.stringify(data.payload));
                        break;
                    default:
                        debug(JSON.stringify(data));
                        break;
                }
            } else {
                this.dispatchMessage(data);
            }
        } catch (e) { }
    }
    /** 初始化主机 */
    protected bindEvent() {
        this.updateDimension();
        this.addWorkerListener('Runtime::clear', () => {
            this.scriptContext?.clear();
        });
        this.addWorkerListener('Player::action', (msg: any) => {
            switch (msg.action) {
                case "play": this.player?.play(); break;
                case "pause": this.player?.pause(); break;
                case "seek": this.player?.seek(msg.params); break;
                // TODO: 打开新视频
                // case "jump": this.player?.jump(msg.params); break;
                default: break;
            }
        });
        this.addWorkerListener('Runtime:RegisterObject', (pl: any) => {
            this.scriptContext?.registerObject(pl.id, pl.data);
        });
        this.addWorkerListener('Runtime:DeregisterObject', (pl: any) => {
            this.scriptContext?.deregisterObject(pl.id);
        });
        this.addWorkerListener('Runtime:CallMethod', (pl: any) => {
            this.scriptContext?.callMethod(pl.id, pl.method, pl.params);
        });
        this.addWorkerListener('Runtime:UpdateProperty', (pl: any) => {
            this.scriptContext?.updateProperty(pl.id, pl.name, pl.value);
        });
        this.scriptContext?.registerObject('__root', { 'class': 'SpriteRoot' });
    }
    /** 添加频道监听 */
    protected addWorkerListener(channel: string, listener: Function) {
        this.channels[channel] || (this.channels[channel] = []);
        this.channels[channel].push(listener);
    }
    /** 发送消息到沙箱 */
    protected sendWorkerMessage(channel: string, payload: any) {
        this.worker?.postMessage(JSON.stringify({ channel, payload }));
    }
    /** 分发沙箱信息 */
    protected dispatchMessage(data: IWorkerMessage) {
        if (this.channels[data.channel]) {
            this.channels[data.channel].forEach(d => { d(data.payload) });
        } else {
            debug.warn('未捕获沙箱信息', data);
        }
    }
    /** 更新分辨率信息 */
    protected updateDimension() {
        this.sendWorkerMessage('Update:DimensionUpdate', {
            stageWidth: this.wrap?.offsetWidth,
            stageHeight: this.wrap?.offsetHeight,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
        });
    }
    /** 渲染流程 */
    protected render() {
        if (!this.paused && this.dmList.length) {
            window['requestAnimationFrame'](() => {
                this.render();
            });
            this.renderDanmaku();
        }
    }
    /** 渲染弹幕 */
    protected renderDanmaku() {
        this.updateTime();
        this.refreshCdmList();
        this.drawDanmaku();
    }
    /** 时间校准 */
    protected updateTime() {
        this.pTime = this.cTime;

        // 时间计算这里的计算都在毫秒单位下
        const currentTime = new Date().getTime();
        this.cTime = this.time0 + currentTime - this.startTime;

        // 如果有视频,则对一下时间
        if (typeof this.options.timeSyncFunc === 'function') {
            const vtime = this.options.timeSyncFunc();
            if (Math.abs(vtime - this.cTime) > 1000 || isNaN(this.cTime)) {
                this.cTime = vtime;
                this.pTime = vtime;
                this.time0 = vtime;
                this.startTime = currentTime;
            }
        }
    }
    /** 提取需要显示的弹幕列表 */
    refreshCdmList() {
        if (!this.visibleStatus) {
            this.clear();
            return;
        }
        this.cdmList = [];
        if (Math.abs(this.cTime - this.pTime) < 500) {
            this.dmList.forEach(d => {
                if (d.stime >= this.pTime / 1000 && d.stime < this.cTime / 1000) {
                    this.cdmList.push(d);
                }
            });
        }
    }
    /** 绘制弹幕 */
    protected drawDanmaku() {
        this.cdmList.forEach(d => {
            this.options.blockJudge?.(d) || this.parse(d);
        })
    }
    /** 播放 */
    play() {
        // 恢复时间
        this.time0 = this.pauseTime;
        this.startTime = new Date().getTime();
        this.pauseTime = 0;
        this.paused = false;
        this.wrap && this.wrap.classList.remove('as3-danmaku-pause');
        if (this.dmList.length) {
            if (!this.inited) {
                this.init();
            }
            this.render();
        }
    }
    /** 暂停 */
    pause() {
        this.paused = true;
        if (!this.inited) {
            this.init();
        }
        this.wrap?.classList.add('as3-danmaku-pause');
        // 记录时间
        const currentTime = new Date().getTime();
        this.pauseTime = this.time0 + currentTime - this.startTime;
    }
    /** 播放/暂停 */
    toggle() {
        if (this.paused) {
            this.play();
        } else {
            this.pause();
        }
    }
    /** 跳转 */
    seek(time: number) {
        this.time0 = time * 1000;
        this.startTime = new Date().getTime();
        if (!this.inited) {
            this.init();
        }
        if (this.dmList.length && this.visibleStatus && this.wrap) {
            this.pTime = time * 1000;
            this.cTime = time * 1000;

            this.clear();
        }
    }
    /** 开关弹幕 */
    visible(value: boolean) {
        if (value !== this.visibleStatus) {
            if (value) {
                this.visibleStatus = true;
                this.render();
            } else {
                this.visibleStatus = false;
                this.clear();
            }
        }
    }
    /** 更新画布大小 */
    resize(width = this.resolutionWidth, height = this.resolutionHeight) {
        this.resolutionWidth = width;
        this.resolutionHeight = height;
        if (this.inited && this.wrap) {
            const containerWidth = this.container.offsetWidth;
            const containerHeight = this.container.offsetHeight;
            if (containerWidth / width > containerHeight / height) {
                this.wrap.style.width = (((containerHeight / height) * width) / containerWidth) * 100 + '%';
                this.wrap.style.height = '100%';
            } else {
                this.wrap.style.width = '100%';
                this.wrap.style.height = (((containerWidth / width) * height) / containerHeight) * 100 + '%';
            }
            this.updateDimension();
        }
    }
    /** 清屏 */
    clear() {
        if (!this.inited) {
            return;
        }
        this.cdmList = [];
        if (this.wrap) {
            this.wrap.innerHTML = '';
        }
    }
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            delete this.worker;
        }
    }
}