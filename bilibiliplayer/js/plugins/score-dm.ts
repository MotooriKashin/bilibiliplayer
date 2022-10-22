import Tooltip from "@jsc/player-auxiliary/js/plugins/tooltip";
import URLS from "../io/urls";
import { PopupBase } from "../player/popup/popup-base";

import '../../css/score.less';

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
    update: (card: IScoreDM) => void;
    player: any;
}

export interface IScoreDM {
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
    handled?: boolean;
    extraTime?: number; // 如果快结束的时候点击了评分，则加时展示
    mouseHoverTime?: number; // 鼠标选中评分态的时间
}

const NORMAL_WIDTH = 667;
export default class ScoreDM extends PopupBase {
    static LIST: any;
    private container: HTMLElement;
    private ppx: string;
    private list: IScoreDM[] = [];
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
    mouseHoverIng: number = 0; // 鼠标选中评分态

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.container = opt.container;
        this.ppx = opt.ppx + '-score';
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
        this.player = opt.player;
        this.popupName = PopupBase.LIST.SCORE;
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
            area: ctr.querySelector(`.${ppx}-area`)!,
            result: ctr.querySelector(`.${ppx}-result`)!,
            count: ctr.querySelector(`.${ppx}-count`)!,
        };
        this.btn = this.template.score;

        super.addCloseBtn(this.btn);

        this.resize();
        if (this.config.dragFlag) {
            this.bindEvents();
            return;
        }

        this.addClickEvnet();
    }
    addClickEvnet() {
        this.template.area.addEventListener('click', (e) => {
            const score = Number((<any>e).target['dataset'].val);
            if (!isNaN(score)) {
                this.addHoverTime();
                if (!this.player.user.status().login) {
                    return this.player.quicklogin.load();
                }
                this.config.cb(
                    'dm_score_click',
                    JSON.stringify({
                        dmid: this.card.dmid,
                    }),
                );
                this.getScoreResult(score, true);
            }
        });
        this.template.area.addEventListener('mouseover', (e) => {
            const score = (<any>e).target['name'] || (<any>e).target['dataset'].val;
            if (!isNaN(score)) {
                this.changeImgSrc(score);
            }
            if (!this.mouseHoverIng) {
                this.mouseHoverIng = new Date().getTime();
            }
        });
        this.template.area.addEventListener('mouseleave', (e) => {
            this.changeImgSrc(this.card.midScore / 2 || 0);
            this.addHoverTime();
        });
    }
    addHoverTime() {
        // 非暂停状态就把hover时长加一下
        if (this.mouseHoverIng && this.player.getState() !== 'PAUSED') {
            this.card.mouseHoverTime += (new Date().getTime() - this.mouseHoverIng) / 1000;
        }
        this.mouseHoverIng = 0;
    }
    getScoreResult(score: number, needRequset: boolean = false) {
        this.card.extraTime = Math.max(this.config.ctime() + 3 - (this.card.to + this.card.mouseHoverTime), 0);
        if (!needRequset) {
            this.showResult(score);
            return;
        }
        const { aid, cid } = this.config;
        let progress = Math.max(Math.round(this.config.ctime()), 1) * 1000;
        // 因为hover状态组件不消失，所以progress值可能会超过后端限制的展示时间，progress值后端是前闭后开的，所以需要再减100毫秒
        progress = Math.min(progress, Math.round(this.card.to * 1000) - 100);
        $.ajax({
            url: URLS.DM_SCORE,
            type: 'post',
            data: {
                aid,
                cid,
                progress,
                grade_id: this.card.gradeId,
                grade_score: score * 2,
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (res) => {
                if (res.code === 0) {
                    this.showResult(score);
                    const dmid = res?.data?.dmidStr;
                    dmid && this.player.danmaku?.addPopupDm(String(score), dmid);
                } else {
                    new Tooltip({
                        name: 'response',
                        target: $(this.template.wrap),
                        position: 'center-center',
                        padding: [15, 20, 15, 20],
                        text: res.message,
                    });
                }
            },
            error: (err) => {
                console.log('error: ', err);
            },
        });
    }
    showResult(score: number) {
        this.card.midScore = score * 2;
        this.card.handled = !!this.card.midScore;
        this.changeImgSrc(score);
        const avgScore = (this.card.avgScore * this.card.count + this.card.midScore) / (this.card.count + 1);
        this.card.avgScore = avgScore;
        this.template.result.querySelector('span')!.innerText = this.parseNumber(avgScore);
        this.card.count += 1;
        this.template.count.innerHTML = this.showCount();

        this.template.result.style.transform = '';
        this.template.score.classList.add(`${this.ppx}-result-animate`);
        this.template.area.style.pointerEvents = 'none';
    }
    parseNumber(count: number, toFixed = 1) {
        return Number(count).toFixed(toFixed);
    }
    changeImgSrc(pos: any) {
        pos = Number(pos);
        const array = this.template.area.querySelectorAll('img');
        for (let i = 0; i < array.length; i++) {
            const element = array[i];
            if (pos >= i + 1) {
                element.src = this.card.skinSelected;
                element.className = 'on';
            } else {
                element.src = this.card.skinUnselected;
                element.className = 'off';
            }
        }
    }

    resize() {
        super.resize();
        if (!this.card) return;
        this.btnSize.width = this.template.score.offsetWidth;
        this.btnSize.height = this.template.score.offsetHeight;
        this.btnSize.areaW = this.template.wrap.offsetWidth;
        this.btnSize.areaH = this.template.wrap.offsetHeight;

        this.scale = <any>null;
        let { scaleP, scaleS } = this.getScale();
        const { width, height, areaW, areaH, padding } = this.btnSize;

        let left = this.btnSize.left * scaleP;
        let top = this.btnSize.top * scaleP;

        left = Math.max(left, (padding + (width * scaleS) / 2) * scaleP);
        top = Math.max(top, (padding + (height * scaleS) / 2) * scaleP);

        left = Math.min(left, areaW - (padding + (width * scaleS) / 2) * scaleP);
        top = Math.min(top, areaH - (padding + (height * scaleS) / 2) * scaleP);

        left = Math.round(left);
        top = Math.round(top);

        this.btnSize.left = left;
        this.btnSize.top = top;

        this.btn.style.cssText += `transform: translate(-50%, -50%) scale(${scaleS});left:${this.card.posX * scaleP
            }px;top:${this.card.posY * scaleP}px`;
    }
    add(list: IScoreDM[]) {
        this.list = this.list.concat(list);
        this.list.sort((pre: IScoreDM, next: IScoreDM) => {
            return pre.from - next.from;
        });
    }
    update(list: IScoreDM[]) {
        this.delete();
        this.hasData = false;
        this.list = list;
        this.list.sort((pre: IScoreDM, next: IScoreDM) => {
            return pre.from - next.from;
        });
        this.render();
        ScoreDM.LIST = list;
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
            const [sTime, eTime] = [data.from, data.to + (data.extraTime! + data.mouseHoverTime! || 0)];
            if ((sTime <= time && time < eTime) || this.mouseHoverIng) {
                if (super.renderShrink(data, time)) {
                    return;
                }
                if ((this.hasData && data === this.card) || this.mouseHoverIng) {
                    // 准备评分时倒计时暂停
                    if (!this.mouseHoverIng) {
                        this.renderCloseTime(sTime, eTime, time);
                    }
                    return;
                }
                this.card = null;
                this.hide();
                this.template.score.className = `${this.ppx}`;
                this.template.score.style.transition = 'none';
                this.template.result.style.transform = 'scale(0)';
                this.card = data as IScoreDM;
                this.card.extraTime = 0;
                this.card.mouseHoverTime = 0;
                this.updateUI(data);
                this.resize();
                this.show();
                if (!data.showed) {
                    data.showed = true;
                    // this.config.cb('dm_link_show', data.dmid);
                    this.config.cb(
                        'dm_score_show',
                        JSON.stringify({
                            dmid: this.card.dmid,
                            vote_status: this.card.midScore ? 1 : 2,
                        }),
                    );
                }
                return;
            }
        }
        this.hide();
        this.card = null;
    }
    updateUI(data: IScoreDM) {
        this.template.title.textContent = data.msg!;
        this.template.area.innerHTML = this.areaTpl(data);
        this.template.result.innerHTML = `平均 <span>${this.parseNumber(data.avgScore!)}</span>`;
        this.template.count.innerHTML = this.showCount();

        this.template.area.style.color = data.skinFontColor!;
        this.template.result.querySelector('span')!.style.color = data.skinFontColor!;
        this.template.area.style.pointerEvents = this.config.dragFlag || this.card.midScore ? 'none' : 'auto';
        this.template.score.classList[!this.config.dragFlag && this.card.midScore ? 'add' : 'remove'](
            `${this.ppx}-result-animate`,
        );
        this.template.result.style.transform = `${!this.config.dragFlag && this.card.midScore ? '' : 'scale(0)'}`;
        this.template.result.style.transitionDelay = this.card.midScore ? '0s' : '';
        this.changeImgSrc(this.card.midScore / 2);
        this.card.handled = !!this.card.midScore;
    }
    showCount() {
        let count: any = this.card.count / 10000;
        if (count >= 1) {
            count = this.parseNumber(count) + '万';
        } else {
            count = this.card.count;
        }
        return count + '人参与';
    }
    areaTpl(data: IScoreDM): string {
        let str = '';
        for (let i = 0; i < 5; i++) {
            str += `<div class=${this.ppx}-area-item data-val=${i + 1}>
                        <img src=${data.midScore! / 2 >= i + 1 ? data.skinSelected : data.skinUnselected} />
                        <span>${i + 1}</span>
                    </div>`;
        }
        return str;
    }

    private hide() {
        super.renderCloseShrink();
        if (!this.template.score.classList.contains(`${this.ppx}-show`)) {
            return;
        }
        this.template.score.classList.add(`${this.ppx}-hide`);
        // this.template.score.style.cssText = '';
        if (this.card) {
            this.card.extraTime = 0;
            this.card.mouseHoverTime = 0;
        }
        this.hasData = false;
    }
    private show() {
        this.hasData = true;
        this.template.score.classList.add(`${this.ppx}-show`);
        this.template.score.classList.remove(`${this.ppx}-hide`);
        this.showAnimate && this.template.score.classList.add(`${this.ppx}-show-animate`);
        super.showBaseAnimate(this.template.score, this.getScale().scaleS);
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-wrap">
            <div class="${ppx}">
                <div class="${ppx}-title"></div>
                <div class="${ppx}-area"></div>
                <div class="${ppx}-result"></div>
                <div class="${ppx}-count"></div>
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
    outAction(score: number) {
        if (!this.card || this.card.midScore) {
            return;
        }

        this.config.cb(
            'dm_score_dmid',
            JSON.stringify({
                dmid: this.card.dmid,
            }),
        );
        this.getScoreResult(score);
    }
}
