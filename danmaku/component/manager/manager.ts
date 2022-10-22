import Mode from '../danmaku_mode';

import Danmaku from '../../danmaku';
import OrderList from '../order_list';
import BinaryArray from '../binary_array';
import IDanmakuConfigExtInterface from '../../interface/danmaku_config_ext';
import { IInstanceSetInterface, IBaseModeInterface } from '../../interface/danmaku_mode';
import ITextDataInterface from '../../interface/text_data';
import IRenderExtInterface from '../../interface/render_ext';
import densityFilter from './../density-filter';
import { loadImg, loadSvg } from '../preload-img';

export interface IHideDm {
    text: IRenderExtInterface;
    mode: IBaseModeInterface;
}
export interface ICycDiv {
    div: HTMLElement;
    index: number;
}
abstract class Manager {
    private core: Danmaku;
    timeLine: OrderList;
    private danmakuModes: IInstanceSetInterface;
    private hasHighDm!: boolean; // 当前屏是否有高赞弹幕

    lastTime: number;
    config: IDanmakuConfigExtInterface;
    visualArray: BinaryArray<IRenderExtInterface>;
    container!: HTMLElement;
    width!: number;
    height!: number;
    imgExposure!: number;
    recyclingDivList: ICycDiv[] = []; // 已回收DIV元素集合
    cDmlist: IHideDm[] = []; //
    hideList: IHideDm[] = []; //

    constructor(danmaku: Danmaku) {
        // 弹幕区域配置
        this.config = danmaku.config;
        this.core = danmaku;
        this.visualArray = danmaku.visualArray;
        this.timeLine = danmaku.timeLine;
        this.danmakuModes = Mode(this.config);

        this.lastTime = 0;

        this.init();
        this.resize(true);
    }

    protected init() {
        this.container = this.config.container;
    }

    protected isPause() {
        return this.core.paused;
    }

    private validate(danmaku: ITextDataInterface) {
        if (danmaku.border || danmaku.likes) {
            return true;
        }
        if (
            !densityFilter.validateLive({
                density: this.config.danmakuNumber,
                pool: danmaku.class,
            })
        ) {
            return false;
        }

        if (!this.config.danmakuFilter(danmaku)) {
            return false;
        }
        return true;
    }

    abstract getText(danmaku: ITextDataInterface, precise: any): IRenderExtInterface;

    start(danmaku: ITextDataInterface, precise?: number) {
        if (!danmaku.on && this.validate(danmaku)) {
            const mode = this.danmakuModes[danmaku.mode];
            if (mode) {
                danmaku.on = true;
                if (danmaku.picture) {
                    // 过滤彩蛋弹幕
                    loadImg(danmaku.picture)
                        .then(() => {
                            this.cDmlist.push({ text: this.getText(danmaku, precise), mode });
                        })
                        .catch(() => {
                            danmaku.picture = '';
                            this.renderHead(danmaku, mode, precise);
                        });
                } else {
                    this.renderHead(danmaku, mode, precise);
                }
                return true;
            }
        }
    }
    // 先判断彩蛋弹幕，再判断canvas下的头像弹幕(实际上是在外部已经判断好，有头像，就没有彩蛋)因为css弹幕不需要先load图片
    renderHead(danmaku: ITextDataInterface, mode: IBaseModeInterface, precise?: number) {
        if (this.core.config.type === 'canvas') {
            if (danmaku.headImg) {
                // 过滤头像弹幕
                loadImg(danmaku.headImg, danmaku.flag)
                    .then(() => {
                        this.cDmlist.push({ text: this.getText(danmaku, precise), mode });
                    })
                    .catch(() => { });
                return;
            }
            if (danmaku.likes) {
                loadSvg('like')
                    .then(() => {
                        this.cDmlist.push({ text: this.getText(danmaku, precise), mode });
                    })
                    .catch(() => { });
                return;
            }
        }
        if (danmaku.attr === 2) {
            this.hasHighDm = true;
            this.cDmlist.unshift({ text: this.getText(danmaku, precise), mode });
        } else {
            this.cDmlist.push({ text: this.getText(danmaku, precise), mode });
        }
    }

    onTime(time: number, precise?: number) {
        let ctime = time - 0.001;
        if (precise) {
            this.clearVisualList();
        }
        if (Math.abs(this.lastTime - ctime) > 3 && !precise) {
            this.clearVisualList();
        } else {
            ctime += this.config.preTime * this.config.videoSpeed;
            const income = this.timeLine.getItemsByRange(
                {
                    stime: precise
                        ? precise -
                        (((this.config.verticalDanmaku ? this.config.height : this.config.width) /
                            (512 * this.config.devicePR)) *
                            this.config.duration) /
                        this.config.speedPlus /
                        this.config.videoSpeed
                        : this.lastTime - 0.001,
                },
                {
                    stime: precise ? precise : ctime,
                },
            );
            this.insert(income as ITextDataInterface[], time, precise || time);
        }
        this.lastTime = ctime;
    }
    insert(income: ITextDataInterface[], time: number, precise?: number) {
        const render = performance.now();
        let exposure = 0;

        const num = income.length;
        let delNum = 0;
        let highNum = 0;
        let i;
        let dm;
        let text;
        let len;

        // 弹幕生成
        for (let i = 0; i < income.length; i++) {
            dm = income[i];
            if (dm.attr === 2 && (this.hasHighDm || this.core.config.type === 'canvas')) {
                dm.attr = -1;
            }
            if (this.start(dm, precise)) {
                delNum++;
            }
        }
        // 计算弹幕宽高，并排位置
        len = this.cDmlist.length;
        for (i = 0; i < len; i++) {
            text = this.cDmlist[i].text;
            text.space(time);
        }
        for (i = 0; i < len; i++) {
            dm = this.cDmlist[i];
            text = dm.text;
            dm.mode.onStart(text);
            if (text.rest < 0) {
                this.endHide(text);
                this.cDmlist.splice(i, 1);
                i--;
                len--;
            }
        }
        while (this.cDmlist.length) {
            dm = this.cDmlist.shift()!;
            text = dm.text;
            if (this.config.type === 'div') {
                if (text.textData!.mode === 4) {
                    dm.mode.onUpdate(text, time);
                    text.firstFrame(text._y);
                } else {
                    text.firstFrame(text.y);
                }
            }
            // 做弹幕曝光统计
            if (!text.textData!.showed) {
                exposure++;
                if (text.textData!.headImg) {
                    this.core.imgExposure(text.textData!.flag!);
                }
                if (text.textData!.attr === 2) {
                    highNum++;
                }
            }
            text.textData!.showed = true;

            this.hideList.push(dm);
        }
        num &&
            this.core.updateTrackInfo(
                {
                    delNum,
                    highNum,
                    num,
                    render: performance.now() - render,
                },
                exposure,
            );
    }

    resize(show?: boolean) {
        const h = show ? 0 : (this.container.offsetHeight || 420) - this.config.height;
        const w = show ? 0 : (this.container.offsetWidth || 680) - this.config.width;
        this.config.width = this.container.offsetWidth || 680;
        this.config.height = this.container.offsetHeight || 420;
        this.config.danmakuNumber !== 0 && densityFilter.resize();
        this.clearRecyclingDivList();
        if (show) {
            return;
        }
        let len = this.visualArray.length;
        let text: IRenderExtInterface;
        for (let i = 0; i < len; i++) {
            text = this.visualArray[i];
            if (text.textData!.mode === 4) {
                text._y! += h;
                text._x! += w / 2;
                text.reset(text._x!, text._y!);
            }
        }
    }

    beforeRender(...arg: any[]) { }

    afterRender(...arg: any[]) { }

    render(time: number, paused?: boolean, precise?: number) {
        this.beforeRender(paused);
        let len = this.visualArray.length;
        const dead: IRenderExtInterface[] = [];
        let text: IRenderExtInterface;
        let hideDm: IHideDm;
        let runTime: number;
        let i: number;
        let mode: IBaseModeInterface;

        for (i = 0; i < len; i++) {
            text = this.visualArray[i];
            if (!text) {
                continue;
            }
            mode = text.manager!;
            if (mode!.onUpdate(text, time)) {
                if (precise) {
                    text.pause(text._x!, text._y!);
                } else if (!paused) {
                    text.render(text._x!, text._y!);
                } else if (text.textData!.border) {
                    text.render(text._x!, text._y!);
                    text.pause(text._x!, text._y!);
                } else {
                    text.pause(text._x!, text._y!);
                }
            } else {
                dead.push(text);
            }
        }
        for (i = 0; i < this.hideList.length; i++) {
            hideDm = this.hideList[i];
            text = hideDm.text;
            runTime = time - text.textData!.stime;
            if (runTime < -this.config.preTime * this.config.videoSpeed) {
                this.endHide(text);
            } else {
                if (hideDm.mode.onUpdate(text, time)) {
                    this.visualArray.push(text);
                    text.pause(text._x, text._y);
                } else {
                    this.endHide(text);
                }
            }
            this.hideList.splice(i, 1);
            i--;
        }

        len = dead.length;
        for (i = 0; i < len; i++) {
            text = dead[i];
            this.end(text);
        }
        this.afterRender(paused);
    }

    endHide(dm: IRenderExtInterface) {
        dm.textData!.on = false;
        if (dm.textData!.attr === 2) {
            this.hasHighDm = false;
        }
        let mode = dm.manager;
        let recyclingDiv: HTMLElement | void = mode!.onEnd(dm);

        // 将回收DIV元素放到集合中缓存
        // @ts-ignore
        if (this.config.isRecycling && recyclingDiv) {
            this.recyclingDivList.push({ div: recyclingDiv, index: dm.index });
        }
    }

    fresh() {
        for (let i = 0; i < this.visualArray.length; i++) {
            if (!this.config.danmakuFilter(this.visualArray[i].textData!) && !this.visualArray[i].textData?.likes) {
                if (this.core.reportDmid === this.visualArray[i].textData?.dmid) {
                    this.core.reportDmid = <any>null;
                    this.visualArray[i].hideAnimate();
                } else {
                    this.visualArray[i].hide();
                }
            } else {
                this.visualArray[i].show();
            }
        }
    }

    // 切换视频速度，更新弹幕的结束时间（弹幕跟随
    update(time: number, rate: number) {
        let dm;
        for (let i = 0; i < this.visualArray.length; i++) {
            dm = this.visualArray[i];
            dm.end = time + (dm.end - time) / rate;
            if (dm.middle) {
                dm.middle = time + (dm.middle - time) / rate;
            }
        }
    }

    remove(dmid: string) {
        // remove danmaku temporary(fake)
        for (let i = 0; i < this.visualArray.length; i++) {
            if (dmid === this.visualArray[i].textData?.dmid) {
                this.visualArray[i].hide();
                this.visualArray.splice(i, 1);
                break;
            }
        }
    }

    end(danmaku: IRenderExtInterface, isRemoveRecycling?: boolean) {
        danmaku.textData!.on = false;
        if (danmaku.textData!.attr === 2) {
            this.hasHighDm = false;
        }
        let mode = danmaku.manager;
        let recyclingDiv: HTMLElement | void = mode!.onEnd(danmaku, isRemoveRecycling);

        // 将回收DIV元素放到集合中缓存
        // @ts-ignore
        if (this.config.isRecycling && recyclingDiv) {
            this.recyclingDivList[this.recyclingDivList.length] = { div: recyclingDiv, index: danmaku.index2hover };
        }

        this.visualArray.bremove(danmaku);
    }

    /**
     * 清空显示列表
     */
    clearVisualList() {
        while (this.visualArray.length) {
            this.end(this.visualArray[0], true);
        }
        while (this.hideList.length) {
            this.endHide(this.hideList.shift()!.text);
        }
        this.lastTime = -3;

        this.clearRecyclingDivList();
    }

    option(key: string, value: any) {
        (<any>this).config[key] = value;
    }

    destroy() {
        this.clearVisualList();
    }

    /**
     * 清除RecyclingDivList中div显示
     */
    clearRecyclingDivList() {
        const len = this.recyclingDivList && this.recyclingDivList.length;

        if (len) {
            for (let i = len - 1; i >= 0; i--) {
                this.recyclingDivList[i]?.div instanceof HTMLElement &&
                    (this.recyclingDivList[i].div.style.display = 'none');
            }
        }
    }
}

export default Manager;
