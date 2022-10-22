import { PopupBase } from '../player/popup/popup-base';
import ScoreDM from './score-dm';

export interface IVideoSize {
    w: number;
    h: number;
    vw: number;
    vh: number;
}

interface IPositionInterface {
    x: number;
    y: number;
}
interface IConfig {
    container: HTMLElement;
    ppx: string;
    aid: number;
    cid: number;
    visible?: boolean;
    dragFlag?: boolean;
    ctime: () => number;
    cb: (name: string, info: string, pause?: boolean) => void;
    getOptions: () => any;
    videoSize: () => IVideoSize;
    update: (card: IScoreSummary) => void;
    player: any;
}

export interface IScoreSummary {
    from: number;
    to: number;
    dmid: string;
    posY: number;
    posX: number;
    showed?: boolean;

    msg?: string;
    key?: string;
    skin?: string;
    skinUnselected?: string;
    skinSelected?: string;
    skinFontColor?: string;
    gradeId?: number;
    midScore?: number;
    count?: number;
    avgScore?: number;
    id?: number;
    summaryList?: any;
    handled?: boolean;
}

const NORMAL_WIDTH = 667;
export default class ScoreSummary extends PopupBase {
    private container: HTMLElement;
    private ppx: string;
    private list: IScoreSummary[] = [];
    private template!: {
        [key: string]: HTMLElement;
    };
    private config: Required<IConfig>;
    private hasData!: boolean;
    showAnimate: boolean = true;
    private btnSize = {
        padding: 64,
        areaW: 0,
        areaH: 0,

        left: 0,
        top: 0,
        width: 0,
        height: 0,

        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
    };
    dragFlag!: boolean;
    btn: any;
    player: any;
    page2Animate: any;

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.container = opt.container;
        this.ppx = opt.ppx + '-score-summary';
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
        this.player = opt.player;
        this.popupName = PopupBase.LIST.SCORE_SUMMARY;
        this.init();
    }

    closeHandler() {
        super.track(this.config.cb);
        this.hide();
        // this.list?.splice(this.list.indexOf(this.card), 1);
    }
    private init() {
        const ppx = this.ppx;
        const ctr = this.config.container;
        ctr.insertAdjacentHTML('beforeend', this.tpl());

        this.template = {
            wrap: ctr.querySelector(`.${ppx}-wrap`)!,
            score: ctr.querySelector(`.${ppx}`)!,
            title: ctr.querySelector(`.${ppx}-title`)!,
            count: ctr.querySelector(`.${ppx}-count`)!,
            area: ctr.querySelector(`.${ppx}-area`)!,
            slider: ctr.querySelector(`.${ppx}-sliders`)!,
        };
        this.btn = this.template.score;

        super.addCloseBtn(this.btn);

        this.resize();
        if (this.config.dragFlag) {
            this.bindEvents();
            return;
        }
    }
    parseNumber(count: number, toFixed = 1) {
        return Number(count).toFixed(toFixed);
    }

    resize() {
        super.resize();
        if (!this.card) return;
        this.scale = <any>null;
        this.btnSize.width = this.template.score.offsetWidth;
        this.btnSize.height = this.template.score.offsetHeight;
        this.btnSize.areaW = this.template.wrap.offsetWidth;
        this.btnSize.areaH = this.template.wrap.offsetHeight;

        let { scaleP, scaleS } = this.getScale();
        const { width, height, areaW, areaH, padding } = this.btnSize;

        let left = this.card.posX * scaleP;
        let top = this.card.posY * scaleP;

        left = Math.max(left, (padding + (width * scaleS) / 2) * scaleP);
        top = Math.max(top, (padding + (height * scaleS) / 2) * scaleP);

        left = Math.min(left, areaW - (padding + (width * scaleS) / 2) * scaleP);
        top = Math.min(top, areaH - (padding + (height * scaleS) / 2) * scaleP);

        left = Math.round(left);
        top = Math.round(top);

        this.btnSize.left = left;
        this.btnSize.top = top;

        this.btn.style.cssText += `transform: translate(-50%, -50%) scale(${scaleS});left:${left}px;top:${top}px`;
    }
    add(list: IScoreSummary[]) {
        this.list = this.list.concat(list);
        this.list.sort((pre: IScoreSummary, next: IScoreSummary) => {
            return pre.from - next.from;
        });
    }
    update(list: IScoreSummary[]) {
        this.delete();
        this.hasData = false;
        this.list = list;
        this.list.sort((pre: IScoreSummary, next: IScoreSummary) => {
            return pre.from - next.from;
        });
        this.render();
    }
    delete() {
        this.list.length = 0;
        this.hide();
    }
    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.config.visible = value;
                if (value) {
                    this.render();
                } else {
                    this.hide();
                }
                break;
            default:
                break;
        }
    }
    private render() {
        this.timeUpdate(this.config.ctime());
    }

    timeUpdate(time: number) {
        if (!this.config.dragFlag && !this.config.visible) {
            return;
        }
        for (let i = 0; i < this.list.length; i++) {
            const data = this.list[i];
            const [sTime, eTime] = [data.from, data.to];
            if (sTime <= time && time <= eTime) {
                if (super.renderShrink(data, time)) {
                    return;
                }
                if (this.hasData && data === this.card) {
                    // 准备评分时倒计时暂停
                    this.renderCloseTime(sTime, eTime, time);
                    return;
                }
                this.card = null;
                this.hide();
                this.template.score.className = `${this.ppx}`;
                this.template.score.style.transition = 'none';
                this.card = data as IScoreSummary;
                this.updateUI(data);
                this.resize();
                this.show();
                if (!data.showed) {
                    data.showed = true;
                    let dmids: any = [];
                    data.summaryList.forEach((d: any) => {
                        dmids.push(d['dmid_str']);
                    });
                    this.config.cb(
                        'dm_score_summary_show',
                        JSON.stringify({
                            dmid: this.card.dmid,
                            include_dmid: dmids.toString(),
                        }),
                    );
                }
                return;
            }
        }
        this.hide();
        this.card = null;
    }
    updateUI(data: IScoreSummary) {
        this.template.title.textContent = data.msg!;
        let list = '';
        this.areaTpl(data.summaryList);
        this.showCount();
    }
    showCount() {
        let html = '',
            count = 0;
        this.card.summaryList.forEach((d: any) => (count += isNaN(d.count) ? 0 : d.count));
        html = (count / 10000 >= 1 ? this.parseNumber(count / 10000) + '万' : count) + '人参与';
        this.template.count.innerHTML = html;
    }
    areaTpl(data: any) {
        // 和评分数据数据同步
        data.forEach((d: any) => {
            ScoreDM.LIST.findIndex((score: any) => {
                if (score.dmid === d.dmid_str) {
                    d.avg_score = score.avgScore;
                    d.count = score.count;
                }
            });
        });
        let html = '';
        if (!this.config.dragFlag) {
            data.sort((a: any, b: any) => b.avg_score - a.avg_score);
        }
        let i = 0;
        data.forEach((d: any) => {
            html += `<div class="${this.ppx}-area-item ${this.ppx}-area-item${parseInt((i++ / 5).toString(), 10)}">
                        <div class=${this.ppx}-area-item-name>${d.content}</div>
                        <div class=${this.ppx}-area-item-count>${d.avg_score || 0}</div>
                    </div>`;
        });
        this.template.area.innerHTML = html;

        // set bg height
        let sliderHeight = data.length > 5 ? 13 : 0;
        this.template.score.style.height = 30 + Math.min(5, data.length) * 30 + sliderHeight + 'px';
    }
    private hide() {
        super.renderCloseShrink();
        if (!this.template.score.classList.contains(`${this.ppx}-show`)) {
            return;
        }
        this.template.score.classList.add(`${this.ppx}-hide`);
        // this.template.score.style.cssText = '';
        this.hasData = false;
    }
    private show() {
        this.hasData = true;
        this.template.score.classList.add(`${this.ppx}-show`);
        this.template.score.classList.remove(`${this.ppx}-hide`);
        super.showBaseAnimate(this.template.score, this.getScale().scaleS);
        this.showAreaAnimate();
    }
    showAreaAnimate() {
        clearTimeout(this.page2Animate);
        let list = this.template.area.querySelectorAll(`.${this.ppx}-area-item`);
        let len = Math.min(5, list.length);
        for (let i = 0; i < len; i++) {
            const element = list[i];
            setTimeout(() => {
                element.classList.add(`${this.ppx}-area-item-show`);
                const dom = element.querySelector(`.${this.ppx}-area-item-count`)!;
                this.renderNum(dom, Number(dom.innerHTML), performance.now());
            }, i * 100);
        }
        if (list.length > 5) {
            this.sliderPos(1);
            this.page2Animate = setTimeout(() => {
                this.showAreaPage2Animate();
            }, 3000);
        }
        this.template.slider.classList[list.length > 5 ? 'add' : 'remove'](`${this.ppx}-sliders-show`);
    }
    showAreaPage2Animate() {
        let list = this.template.area.querySelectorAll(`.${this.ppx}-area-item`);
        // 首先给前五个加隐藏样式
        for (let i = 0; i < 5; i++) {
            const element = list[i];
            element.classList.remove(`${this.ppx}-area-item-show`);
            element.classList.add(`${this.ppx}-area-item-hide`);
            setTimeout(() => {
                element.classList.add(`${this.ppx}-area-item-none`);
            }, 130);
        }
        setTimeout(() => {
            // 后边加显示样式
            for (let i = 5; i < list.length; i++) {
                const element = list[i];
                element.classList.add(`${this.ppx}-area-item-show`);
                const dom = element.querySelector(`.${this.ppx}-area-item-count`)!;
                setTimeout(() => {
                    dom.classList.add(`${this.ppx}-area-item-count-show`);
                    this.renderNum(dom, Number(dom.innerHTML), performance.now());
                }, i * 100);
            }
            // 滑块变化
            this.sliderPos(2);
        }, 135);
    }
    sliderPos(pos: number) {
        let sliders = this.template.slider.querySelectorAll(`.${this.ppx}-sliders-item`);
        sliders[0].classList.remove(`${this.ppx}-sliders-item-on`);
        sliders[1].classList.remove(`${this.ppx}-sliders-item-on`);
        sliders[pos - 1].classList.add(`${this.ppx}-sliders-item-on`);
    }
    private renderNum(dom: Element, num: number, time: number) {
        requestAnimationFrame((timeStamp) => {
            let html = '';
            let cnum = Math.round((num * (timeStamp - time)) / 1000);
            cnum = Math.min(cnum, num);
            if (cnum >= 10e7) {
                html = (cnum / 10e7).toFixed(1) + '亿';
            } else if (cnum >= 10e3) {
                html = (cnum / 10e3).toFixed(1) + '万';
            } else {
                html = cnum.toFixed(1);
            }
            dom.innerHTML = html;

            if (cnum < num) {
                this.renderNum(dom, num, time);
            }
        });
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-wrap">
            <div class="${ppx}">
                <div class="${ppx}-title"></div>
                <div class="${ppx}-count"></div>
                <div class="${ppx}-area"></div>
                <div class="${ppx}-sliders">
                    <div class="${ppx}-sliders-item"></div>
                    <div class="${ppx}-sliders-item"></div>
                </div>
            </div>
            </div>`;
    }
    dispose() {
        this.delete();
    }

    private bindEvents() {
        const thumbMove = (e: MouseEvent) => {
            if (!this.card) {
                remove();
                return;
            }
            this.btnSize.endX = e.clientX;
            this.btnSize.endY = e.clientY;

            this.dragFlag = true;
            this.move();
        };

        const thumbUp = (e: MouseEvent) => {
            remove();
            this.mouseUp();
        };
        const remove = () => {
            document.removeEventListener('mouseup', thumbUp);
            document.removeEventListener('mousemove', thumbMove);
        };
        this.btn.addEventListener('mousedown', (e: MouseEvent) => {
            e.stopPropagation();
            this.btnSize.startX = e.clientX;
            this.btnSize.startY = e.clientY;

            this.btnSize.endX = e.clientX;
            this.btnSize.endY = e.clientY;

            document.addEventListener('mousemove', thumbMove);
            document.addEventListener('mouseup', thumbUp);
        });
    }

    private move() {
        const { posX, posY } = this.card;
        const { width, height, areaW, areaH, startX, startY, endX, endY, padding } = this.btnSize;
        let { scaleP, scaleS } = this.getScale();

        let left = posX * scaleP + endX - startX;
        let top = posY * scaleP + endY - startY;

        left = Math.max(left, (padding + width / 2) * scaleP);
        top = Math.max(top, (padding + height / 2) * scaleP);

        left = Math.min(left, areaW - (padding + width / 2) * scaleP);
        top = Math.min(top, areaH - (padding + height / 2) * scaleP);

        left = Math.round(left);
        top = Math.round(top);

        this.btnSize.left = left;
        this.btnSize.top = top;

        this.btn.style.left = left + 'px';
        this.btn.style.top = top + 'px';
    }
    private mouseUp() {
        if (!this.btnSize.left || !this.btnSize.top) {
            return;
        }

        let { scaleP, scaleS } = this.getScale();

        this.card.posX = Math.round(this.btnSize.left / scaleP);
        this.card.posY = Math.round(this.btnSize.top / scaleP);
        this.config.update(this.card);
    }
    getScale() {
        return super.getScale(this.btnSize.areaW, this.scale);
    }
}
