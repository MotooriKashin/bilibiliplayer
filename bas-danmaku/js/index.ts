import '../css/index.less';

import Utils from './utils';
import Renderer from './renderer';
import Parser, { IDef } from './parser';
import ParserWorker from './parser/parser.worker';

interface IOption {
    container?: HTMLElement;
    easing?: string;
    visible?: boolean;
    fontFamily?: string;
    timeSyncFunc?: Function | null;
    blockJudge?: Function;
}

export interface IDm {
    defs?: IDef[];
    sets?: [ISet | ISetItems];
    class?: number;
    color?: number;
    date?: number;
    dmid?: string;
    mode?: number;
    size?: number;
    stime: number;
    text: string;
    easing?: string;
    duration?: number;
    def2set?: IDef2set;
    test?: boolean;
    setsIntervals?: any;
}

interface IDef2set {
    [key: string]: ID2S[];
}

interface ID2S {
    name: string;
    valueStart?: any;
    valueEnd: any;
    easing?: string;
    duration?: number;
    delay?: number;
    group?: number;
    [key: string]: any;
}

export interface IPercentNum {
    numType: string;
    value: number;
}

export interface ISet {
    attrs?: any;
    defaultEasing?: string;
    duration?: number;
    targetName?: string;
    type: string;
    items?: ISet[];
}

interface ISetItems {
    items: ISet[];
    type: string;
}

export interface IPlayer {
    pause(): any;
    seek(time: number | string, type?: number, autoSeek?: any): any;
    [key: string]: any;
}

interface IBasParseOptions {
    danmaku: IDm;
    success?: (parsed: IDm) => void;
    error?: (message: string) => void;
}

interface IAddOptions {
    dm: IDm | IDm[];
    parsed?: boolean;
    test?: boolean;
    noRefresh?: boolean;
    success?: (dm: IDm) => void;
    error?: () => void;
}

type DocumentHideType = 'hidden' | 'webkitHidden' | 'mozHidden' | 'msHidden' | 'oHidden';

class BasDanmaku {
    private options: IOption;
    private paused = true;
    private sTime = 0;
    private dmList: IDm[] = [];
    private cdmList: IDm[] = [];
    private dmIndex = 0;
    private cTime = 0;
    private pTime = 0;
    private time0 = 0; // 在startTime时间下的视频时间,单位毫秒
    private pauseTime = 0; // 记录暂停时的时间
    private startTime: number;
    private testId = 0;
    private visibleStatus: boolean;
    private wrap: any;
    private player: IPlayer;
    private resolutionWidth!: number;
    private resolutionHeight!: number;
    private testDanmakus: IDm[] = [];
    private worker: Worker[] = [];
    private workerIndex = 0;
    private workerCount = 2;
    private workerDisabled: boolean;

    inited = false;
    container: HTMLElement;

    constructor(options: IOption = {}, player?: IPlayer) {
        const defaultOptions: IOption = {
            container: <HTMLElement>document.getElementById('player'),
            easing: 'linear',
            visible: true,
            fontFamily: '',
            timeSyncFunc: null,
        };
        this.options = Utils.extend(defaultOptions, options);
        this.player = player!;

        this.container = this.options.container!;
        this.paused = true;
        this.sTime = 0;
        this.inited = false;
        this.dmList = [];
        this.cdmList = [];
        this.dmIndex = 0;
        this.visibleStatus = this.options.visible!;
        this.cTime = 0;
        this.pTime = 0;
        this.time0 = 0; // 在startTime时间下的视频时间,单位毫秒
        this.pauseTime = 0; // 记录暂停时的时间
        this.startTime = new Date().getTime();
        this.testId = 0;

        const version = Utils.browser.version;
        this.workerDisabled =
            (version.safari && !version.safariSupportMSE) ||
            !Worker ||
            version.trident ||
            version.edge ||
            (version.browser === 'chrome' && version.version < 45);
    }

    init() {
        if (!this.inited) {
            this.wrap = Utils.string2DOM(`<div class="bas-danmaku ${this.paused ? 'bas-danmaku-pause' : ''}"></div>`);

            this.container && this.container.appendChild(this.wrap);
            this.inited = true;

            if (this.resolutionWidth && this.resolutionHeight) {
                this.resize();
            }

            window['requestAnimationFrame'](() => {
                this.render();
            });

            let hidden: DocumentHideType;
            let visibilityChange: string;
            const prefixes = ['webkit', 'moz', 'ms', 'o'];

            if ('hidden' in document) {
                hidden = 'hidden';
                visibilityChange = 'visibilitychange';
            } else {
                for (let i = 0; i < prefixes.length; i++) {
                    if (prefixes[i] + 'Hidden' in document) {
                        hidden = <DocumentHideType>(prefixes[i] + 'Hidden');
                        visibilityChange = prefixes[i] + 'visibilitychange';
                    }
                }
            }

            document.addEventListener(visibilityChange!, () => {
                if (!(<any>document)[hidden]) {
                    if (typeof this.options.timeSyncFunc === 'function') {
                        this.seek(this.options.timeSyncFunc() / 1000);
                    }
                }
            });
        }
    }

    add(options: IAddOptions) {
        if (options.dm instanceof Array) {
            let successCound = 0;
            options.dm.forEach((dan) => {
                this.add({
                    dm: dan,
                    parsed: options.parsed,
                    test: options.test,
                    noRefresh: true,
                    success: (parsed) => {
                        successCound++;
                        if (successCound === (<IDm[]>options.dm).length) {
                            // 全部解析完再 refresh
                            if (!options.noRefresh) {
                                this.refresh();
                            }
                        }
                    },
                    error: () => {
                        successCound++;
                        if (successCound === (<IDm[]>options.dm).length) {
                            if (!options.noRefresh) {
                                this.refresh();
                            }
                        }
                    },
                });
            });
        } else {
            options.dm = $.extend({}, options.dm);

            const callback = (dan: IDm) => {
                if (!this.inited) {
                    this.init();
                }
                if (options.test) {
                    this.pretreatDanmaku(dan, true);
                    this.testDanmakus.push(dan);
                    this.drawDanmaku(dan);
                } else {
                    this.pretreatDanmaku(dan);
                    if (dan.stime === -1) {
                        if (this.cTime) {
                            dan.stime = this.cTime / 1000 + 0.1;
                        } else {
                            dan.stime = this.options.timeSyncFunc!() / 1000 + 0.1;
                        }
                    }
                    this.dmList.push(dan);

                    if (this.dmList.length === 1 && !this.paused) {
                        this.play();
                    }
                    if (!options.noRefresh) {
                        this.refresh();
                    }
                }
            };
            if (options.parsed) {
                callback(<IDm>options.dm);
                options.success && options.success(<IDm>options.dm);
            } else {
                this.parse({
                    danmaku: <IDm>options.dm,
                    success: (parsed) => {
                        callback(parsed);
                        options.success && options.success(parsed);
                    },
                    error: () => {
                        options.error && options.error();
                    },
                });
            }
        }
    }

    remove(dmid: string) {
        this.dmList = this.dmList.filter((item) => item.dmid !== dmid);
        this.refresh();
    }

    private pretreatDanmaku(dm: IDm, isTest = false) {
        if (isTest) {
            dm.dmid = `test${this.testId++}`;
            dm.test = true;
            dm.stime = this.options.timeSyncFunc!() / 1000;
        }

        /*
         * tidy up animations
         * def2set = { defname: [animations] }
         */
        dm.def2set = {};
        for (let i = 0; i < dm.defs!.length; i++) {
            const name = dm.defs![i]['name'];
            let index = 0;
            dm.def2set[name] = [];

            for (let j = 0; j < dm.sets!.length; j++) {
                switch (dm.sets![j]['type']) {
                    case 'Serial': // 串联
                        let delay = 0;
                        for (let k = 0; k < dm.sets![j]['items']!.length; k++) {
                            if (dm.sets![j]['items']![k]['targetName'] === name) {
                                dm.def2set[name].push({
                                    name: `bas-${dm.dmid}-${name}-${index}`,
                                    valueStart: this.getValueStart(k, index, dm.def2set[name]),
                                    valueEnd: Utils.extend(
                                        this.getValueStart(k, index, dm.def2set[name]),
                                        dm.sets![j]['items']![k]['attrs'],
                                    ),
                                    easing:
                                        dm.sets![j]['items']![k]['defaultEasing'] || this.options.easing || 'linear',
                                    duration: dm.sets![j]['items']![k]['duration']! / 1000,
                                    delay: delay / 1000,
                                    group: j,
                                });
                                index++;
                            }
                            delay += dm.sets![j]['items']![k]['duration']!;
                        }
                        break;
                    case 'Parallel': // 语句组
                        for (let k = 0; k < dm.sets![j]['items']!.length; k++) {
                            if (dm.sets![j]['items']![k]['targetName'] === name) {
                                dm.def2set[name].push({
                                    name: `bas-${dm.dmid}-${name}-${index}`,
                                    valueEnd: Utils.extend(
                                        this.getValueStart(k, index, dm.def2set[name]),
                                        dm.sets![j]['items']![k]['attrs'],
                                    ),
                                    easing:
                                        dm.sets![j]['items']![k]['defaultEasing'] || this.options.easing || 'linear',
                                    duration: dm.sets![j]['items']![k]['duration']! / 1000,
                                    delay: 0,
                                    group: j,
                                });
                                index++;
                            }
                        }
                        break;
                    case 'Unit': // 并联
                        if ((<ISet>dm.sets![j])['targetName'] === name) {
                            dm.def2set[name].push({
                                name: `bas-${dm.dmid}-${name}-${index}`,
                                valueEnd: (<ISet>dm.sets![j])['attrs'],
                                easing: (<ISet>dm.sets![j])['defaultEasing'] || this.options.easing || 'linear',
                                duration: (<ISet>dm.sets![j])['duration']! / 1000,
                                delay: 0,
                                group: j,
                            });
                            index++;
                        }
                }
            }
        }

        // 空动画，用来计算存活时间
        for (const name in dm.def2set) {
            if ({}.hasOwnProperty.call(dm.def2set, name)) {
                const defs = dm.defs!.filter((item) => item['name'] === name)[0];
                if (defs['attrs']!['duration']) {
                    dm.def2set[name].push({
                        name: `bas-${dm.dmid}-${name}-duration`,
                        valueEnd: {},
                        easing: 'linear',
                        duration: defs['attrs']!['duration'] / 1000,
                        delay: 0,
                        group: -1,
                    });
                } else if (dm.def2set[name].length === 0) {
                    dm.def2set[name].push({
                        name: `bas-${dm.dmid}-${name}-0`,
                        valueEnd: {},
                        easing: 'linear',
                        duration: 4,
                        delay: 0,
                        group: -1,
                    });
                }
            }
        }

        dm.duration = 0;
        for (const name in dm.def2set) {
            if ({}.hasOwnProperty.call(dm.def2set, name)) {
                // 解决属性冲突
                dm.setsIntervals = {}; // 保存每个属性动画的时间段
                let d2sLength = dm.def2set[name].length;
                for (let i = 0; i < d2sLength; i++) {
                    if (dm.def2set[name][i]) {
                        // 动画运行时间区间
                        const time = [
                            parseFloat(dm.def2set[name][i].delay!.toFixed(10)),
                            parseFloat((dm.def2set[name][i].delay! + dm.def2set[name][i].duration!).toFixed(10)),
                            dm.def2set[name][i].group,
                        ];
                        // 遍历元素所有变化属性
                        for (let attr in dm.def2set[name][i]['valueEnd']) {
                            if (dm.def2set[name][i]['valueEnd'].hasOwnProperty(attr)) {
                                if (['x', 'y', 'rotateX', 'rotateY', 'rotateZ', 'scale'].indexOf(attr) !== -1) {
                                    attr = 'transform';
                                }
                                if (dm.setsIntervals[attr]) {
                                    // 遍历该属性变化时间段
                                    let length = dm.setsIntervals[attr].length;
                                    for (let j = 0; j < length; j++) {
                                        if (dm.setsIntervals[attr][j]) {
                                            const currentGroup = dm.setsIntervals[attr][j][2];
                                            // 出现冲突
                                            if (
                                                dm.def2set[name][i].group !== currentGroup &&
                                                ((dm.setsIntervals[attr][j][0] > time[0]! &&
                                                    dm.setsIntervals[attr][j][0] < time[1]!) ||
                                                    (dm.setsIntervals[attr][j][1] > time[0]! &&
                                                        dm.setsIntervals[attr][j][1] < time[1]!) ||
                                                    (dm.setsIntervals[attr][j][0] <= time[0]! &&
                                                        dm.setsIntervals[attr][j][1] >= time[1]! &&
                                                        !(
                                                            dm.setsIntervals[attr][j][0] ===
                                                            dm.setsIntervals[attr][j][1]
                                                        ))) &&
                                                !(time[0] === time[1])
                                            ) {
                                                console.warn(
                                                    `BAS: attribute conflict, name: ${name} attr: ${attr} time: ${time} ${dm.setsIntervals[attr][j]}`,
                                                );
                                                dm.setsIntervals[attr] = dm.setsIntervals[attr].filter(
                                                    (item: (number | string)[]) => item[2] !== currentGroup,
                                                );
                                                dm.def2set[name] = dm.def2set[name].filter(
                                                    (item) => item.group !== currentGroup,
                                                ); // 清除同组动画

                                                j -= length - dm.setsIntervals[attr].length; // length 已改变，更新循环
                                                length = dm.setsIntervals[attr].length;

                                                i -= d2sLength - dm.def2set[name].length;
                                                d2sLength = dm.def2set[name].length;
                                            }
                                        }
                                    }
                                    dm.setsIntervals[attr].push(time);
                                } else {
                                    dm.setsIntervals[attr] = [time];
                                }
                            }
                        }
                    }
                }

                // 计算 duration
                for (let i = 0; i < dm.def2set[name].length; i++) {
                    const dura = dm.def2set[name][i].delay! + dm.def2set[name][i].duration!;
                    if (dura > dm.duration) {
                        dm.duration = dura;
                    }
                }
            }
        }
    }

    private getValueStart(groupIndex: number, setIndex: number, d2f: ID2S[]): any {
        if (groupIndex >= 1 && setIndex >= 1) {
            if (d2f[setIndex - 1]['valueEnd'] && Object.keys(d2f[setIndex - 1]['valueEnd']).length) {
                return d2f[setIndex - 1]['valueEnd'];
            } else {
                return this.getValueStart(groupIndex - 1, setIndex - 1, d2f);
            }
        } else {
            return null;
        }
    }

    parse(options: IBasParseOptions) {
        const dm = options.danmaku;
        const text = [];
        const opacityArr = [];
        if (this.workerDisabled) {
            try {
                const parsed = Parser(dm.text);
                dm.defs = parsed.defs;
                dm.sets = parsed.sets;
                options.success && options.success(dm);
            } catch (e: any) {
                console.warn('Error in BAS parser: ', e);
                options.error && options.error(e.message);
            }
        } else {
            if (!this.workerIndex) {
                for (let i = 0; i < this.workerCount; i++) {
                    this.worker[i] = new ParserWorker();
                }
            }
            const workerCurrent = this.worker[this.workerIndex % this.workerCount];
            // 需要保证同一批进行解析的弹幕的解析回调相同
            workerCurrent.onmessage = (e) => {
                if (e.data.error) {
                    options.error && options.error(e.data.error);
                } else {
                    e.data.defs = e.data['defs'];
                    e.data.sets = e.data['sets'];
                    options.success && options.success(e.data);
                }
            };
            workerCurrent.postMessage(dm);
            this.workerIndex++;
        }
    }

    private render() {
        if (!this.paused) {
            window['requestAnimationFrame'](() => {
                this.render();
            });
            this.renderDanmaku();
        }
    }

    private renderDanmaku() {
        this.updateTime();
        this.refreshCdmList();
        this.drawDanmaku();
    }

    private updateTime() {
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
                this.refresh();
            }
        }
    }

    refreshCdmList(force?: boolean) {
        if (!this.visibleStatus) {
            this.clear();
            return;
        }
        if (force) {
            this.refresh();
            return;
        }
        this.cdmList = [];
        if (Math.abs(this.cTime - this.pTime) < 500) {
            for (let i = 0; i < this.dmList.length; i++) {
                if (this.dmList[i].stime >= this.pTime / 1000 && this.dmList[i].stime < this.cTime / 1000) {
                    this.cdmList.push(this.dmList[i]);
                }
            }
        }
    }

    private drawDanmaku(dm: IDm | IDm[] = this.cdmList, startTime = 0) {
        if (this.visibleStatus) {
            if (!this.inited) {
                this.init();
            }

            if (dm instanceof Array) {
                dm.forEach((dan) => {
                    this.drawDanmaku(dan);
                });
            } else {
                const extenddm = $.extend(true, {}, dm);

                const dan = new Renderer({
                    container: this.wrap,
                    dm: extenddm,
                    startTime: startTime,
                    animationEndCallback: (item) => {
                        if (item.dm.test) {
                            this.testDanmakus = this.testDanmakus.filter((d) => d.dmid !== item.dm.dmid);
                        }
                    },
                    player: this.player,
                });

                if (this.options.blockJudge && this.options.blockJudge(dan.dm)) {
                    dan.ele.style.visibility = 'hidden';
                } else {
                    dan.ele.style.visibility = '';
                }
                if (dan.ele) {
                    this.wrap.appendChild(dan.ele);
                }
            }
        }
    }

    play() {
        // 恢复时间
        this.time0 = this.pauseTime;
        this.startTime = new Date().getTime();
        this.pauseTime = 0;
        this.paused = false;
        this.wrap && this.wrap.classList.remove('bas-danmaku-pause');
        if (this.dmList.length) {
            if (!this.inited) {
                this.init();
            }
            this.render();
        }
    }

    pause() {
        this.paused = true;
        if (!this.inited) {
            this.init();
        }
        this.wrap.classList.add('bas-danmaku-pause');
        // 记录时间
        const currentTime = new Date().getTime();
        this.pauseTime = this.time0 + currentTime - this.startTime;
    }

    toggle() {
        if (this.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    seek(time: number, inPosition = true) {
        this.testDanmakus = [];
        this.time0 = time * 1000;
        this.startTime = new Date().getTime();
        if (!this.inited) {
            this.init();
        }
        if (this.dmList.length && this.visibleStatus && this.wrap) {
            this.pTime = time * 1000;
            this.cTime = time * 1000;

            this.clear();

            if (inPosition) {
                this.refresh();
            }
        }
    }

    refresh() {
        this.clear();
        const time = this.pTime / 1000;
        for (let i = 0; i < this.dmList.length; i++) {
            if (this.dmList[i].stime < time && this.dmList[i].stime + this.dmList[i].duration! > time) {
                this.drawDanmaku(this.dmList[i], time - this.dmList[i].stime);
            }
        }
        for (let i = 0; i < this.testDanmakus.length; i++) {
            if (
                this.testDanmakus[i].stime < time &&
                this.testDanmakus[i].stime + this.testDanmakus[i].duration! > time
            ) {
                this.drawDanmaku(this.testDanmakus[i], time - this.testDanmakus[i].stime);
            }
        }
    }

    visible(value: boolean) {
        if (value !== this.visibleStatus) {
            if (value) {
                this.visibleStatus = true;
                this.refresh();
                this.render();
            } else {
                this.visibleStatus = false;
                this.clear();
            }
        }
    }

    clear() {
        if (!this.inited) {
            return;
        }
        this.cdmList = [];
        if (this.wrap) {
            this.wrap.innerHTML = '';
        }
    }

    clearList() {
        this.dmList = [];
    }

    resize(width = this.resolutionWidth, height = this.resolutionHeight) {
        this.resolutionWidth = width;
        this.resolutionHeight = height;
        if (this.inited) {
            const containerWidth = this.container.offsetWidth;
            const containerHeight = this.container.offsetHeight;
            if (containerWidth / width > containerHeight / height) {
                this.wrap.style.width = (((containerHeight / height) * width) / containerWidth) * 100 + '%';
                this.wrap.style.height = '100%';
            } else {
                this.wrap.style.width = '100%';
                this.wrap.style.height = (((containerWidth / width) * height) / containerHeight) * 100 + '%';
            }
        }
        this.refresh();
    }
}

export default BasDanmaku;
