import Tooltip from "@jsc/player-auxiliary/js/plugins/tooltip";
import URLS from "../io/urls";
import { PopupBase } from "../player/popup/popup-base";
import svg from "../player/svg";

import '../../css/clock-in.less';

export interface IVideoSize {
    w: number;
    h: number;
    vw: number;
    vh: number;
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
    update: (card: IClockIn) => void;
    player: any;
}

export interface IClockIn {
    from: number;
    to: number;
    dmid: string;
    posY: number;
    posX: number;
    showed?: boolean;

    msg?: string;
    endClock?: boolean;
    total?: number;
    seriesId?: number;
    checkInId?: number;
    userOverNumber?: number;
    userCompleted?: number;
    firstComplete?: boolean; // 是否是第一次全部打卡完成
    joinPeople?: number;
    type?: number; // 0 重复打卡   1 系列打卡
    jumpUrl?: string;
    userChecked?: boolean;
    userCheckInDate?: string;
    key?: string;
    handled?: boolean;
}

const NORMAL_WIDTH = 667;
export default class ClockIn extends PopupBase {
    private container: HTMLElement;
    private ppx: string;
    private list: IClockIn[] = [];
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
    /**打卡文字状态描述 1打卡 2已打卡 3查看记录 4去分享 5重新打卡 */
    btnState?: number;

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.container = opt.container;
        this.ppx = opt.ppx + '-clock-in';
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
        this.player = opt.player;
        this.popupName = PopupBase.LIST.CLOCK_IN;
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
            checkIn: ctr.querySelector(`.${ppx}`)!,
            title: ctr.querySelector(`.${ppx}-title`)!,
            descLeft: ctr.querySelector(`.${ppx}-desc-left`)!,
            descRight: ctr.querySelector(`.${ppx}-desc-right`)!,
            btn: ctr.querySelector(`.${ppx}-btn`)!,
            btnTxt: ctr.querySelector(`.${ppx}-btn-text`)!,
            completeIcon: ctr.querySelector(`.${ppx}-complete-img`)!,
        };
        this.btn = this.template.checkIn;

        super.addCloseBtn(this.btn);

        this.resize();
        if (this.config.dragFlag) {
            this.bindEvents();
            return;
        }

        this.addClickEvnet();
    }
    addClickEvnet() {
        this.template.btn.addEventListener('click', (e) => {
            if (!this.player.user.status().login) {
                return this.player.quicklogin.load();
            }
            this.card.endClock ? this.jumpUrl() : this.clickClock();
            this.config.cb(
                'dm_clock_in_click',
                JSON.stringify({
                    dmid: this.card.dmid,
                }),
            );
        });
    }
    jumpUrl() {
        window.open(this.card.jumpUrl);
    }
    clickClock() {
        const { aid, cid } = this.config;
        const progress = parseInt(this.config.ctime() * 1000 + '', 10);
        $.ajax({
            url: URLS.DM_CHECKIN,
            type: 'post',
            data: {
                aid,
                cid,
                progress,
                reset: this.card.userCompleted === this.card.total ? 1 : 0,
                checkin_id: this.card.checkInId,
                checkin_series_id: this.card.seriesId || 0,
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (res) => {
                let tipTxt = '已完成本期打卡';
                if (res.code === 0) {
                    this.list.forEach((d) => {
                        d.userOverNumber = res.data.user_over_number;
                        d.userCompleted = res.data.user_completed;
                        d.firstComplete = true;
                        d.userCheckInDate = res.data.user_checkin_date;
                        d.userChecked = true;
                    });
                    this.updateUI(this.card);
                    const { dmid_str: dmid, user_completed: day } = res.data;
                    // 发弹幕
                    dmid && this.player.danmaku?.addPopupDm(`第${day}天`, dmid);
                    // 1s后消失
                    this.card.to = progress / 1000 + 1;
                    //  单系列视频修改提示文案
                    if (!this.card.type) {
                        tipTxt = `已完成${day}次打卡`;
                    }
                } else {
                    tipTxt = res.message;
                }

                new Tooltip({
                    name: 'response',
                    target: $(this.template.wrap),
                    position: 'center-center',
                    padding: [15, 20, 15, 20],
                    text: tipTxt,
                });
            },
            error: (err) => {
                new Tooltip({
                    name: 'response',
                    target: $(this.template.wrap),
                    position: 'center-center',
                    padding: [15, 20, 15, 20],
                    text: (<any>err)['message'],
                });
            },
        });
    }
    parseNumber(count: number, toFixed = 1) {
        return Number(count).toFixed(toFixed);
    }
    resize() {
        super.resize();
        if (!this.card) return;
        this.btnSize.width = this.template.checkIn.offsetWidth;
        this.btnSize.height = this.template.checkIn.offsetHeight;
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
    add(list: IClockIn[]) {
        this.list = this.list.concat(list);
        this.list.sort((pre: IClockIn, next: IClockIn) => {
            return pre.from - next.from;
        });
    }
    update(list: IClockIn[]) {
        this.delete();
        this.hasData = false;
        this.list = list;
        this.list.sort((pre: IClockIn, next: IClockIn) => {
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
            if (sTime <= time && time < eTime) {
                // 没打过卡则不展示结尾卡片
                if (data.endClock && !data.userChecked && !this.config.dragFlag) {
                    this.hide();
                    return;
                }

                if (super.renderShrink(data, time)) {
                    return;
                }
                if (this.hasData && data === this.card) {
                    this.renderCloseTime(sTime, eTime, time);
                    return;
                }
                this.card = null;
                this.hide();
                this.card = data as IClockIn;
                this.btn.className = this.ppx;
                this.updateUI(data);
                this.resize();
                this.show();
                if (!data.showed) {
                    data.showed = true;
                    this.config.cb(
                        'dm_clock_in_show',
                        JSON.stringify({
                            dmid: this.card.dmid,
                            type: this.card.type,
                            button_status: this.btnState,
                            card_type: this.card.endClock ? 2 : 1,
                        }),
                    );
                }
                return;
            }
        }
        this.hide();
        this.card = null;
    }
    updateUI(data: IClockIn) {
        const template = this.template;
        template.btn.className = `${this.ppx}-btn`;
        const unit = data.type ? '期' : '天';
        let complete = data.total && data.userCompleted === data.total;
        template.title.textContent = data.msg!;

        if (data.endClock) {
            template.title.textContent = data.type ? '已完成本期打卡' : '已完成第1天打卡';
            if (complete) {
                template.title.textContent = `恭喜你完成${data.type ? '全系列' : data.total + '天'}打卡`;
                (<HTMLImageElement>template.completeIcon)['src'] = '//s1.hdslb.com/bfs/static/player/img/clock_in.png';
                this.btn.classList.add(`${this.ppx}-complete`);
            }
            template.descLeft.textContent = this.getUserCheckData();
            template.descRight.textContent = `超越了${this.showCount(data.userOverNumber!)}`;
            template.btnTxt.textContent = complete ? '去分享' : '查看记录';
            this.btnState = complete ? 4 : 3;
        } else {
            if (!data.userCompleted) {
                template.descLeft.textContent = `打卡目标 ${data.total}${unit}`;
                template.descRight.textContent = this.showCount(data.joinPeople!) + '参与';
                template.btnTxt.textContent = '打卡';
                this.btnState = 1;
                template.btn.classList.add(`${this.ppx}-btn-state-tick`);
            } else {
                if (complete) {
                    template.title.textContent = data.msg + ' 已完成';
                    template.descLeft.textContent = `${this.getUserCheckData()}完成`;
                } else {
                    template.descLeft.textContent = `完成度 ${data.userCompleted}/${data.total}${unit}`;
                }
                template.descRight.textContent = `超越了${this.showCount(data.userOverNumber!)}`;
                let text = '';
                if (complete && !data.firstComplete) {
                    text = '重新打卡';
                    this.btnState = 5;
                } else {
                    text = data.userChecked ? '已打卡' : '打卡';
                    this.btnState = data.userChecked ? 2 : 1;
                    template.btn.classList.add(`${this.ppx}-btn-state-tick${data.userChecked ? '-done' : ''}`);
                }
                data.firstComplete = false;
                template.btnTxt.textContent = text;
            }
        }
        data.userChecked && this.btn.classList.add(`${this.ppx}-tick`);
    }
    getUserCheckData(): string {
        if (this.card.userCheckInDate) {
            return this.card.userCheckInDate;
        }
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
    showCount(num: number) {
        let count: number | string = num / 10000;
        if (count >= 1) {
            count = this.parseNumber(count) + '万';
        } else {
            count = num;
        }
        return (count || 0) + '人';
    }

    private hide() {
        super.renderCloseShrink();
        if (!this.template.checkIn.classList.contains(`${this.ppx}-show`)) {
            return;
        }
        this.template.checkIn.classList.add(`${this.ppx}-hide`);
        this.hasData = false;
    }
    private show() {
        this.hasData = true;
        this.template.checkIn.classList.add(`${this.ppx}-show`);
        this.template.checkIn.classList.remove(`${this.ppx}-hide`);
        this.showAnimate && this.template.checkIn.classList.add(`${this.ppx}-show-animate`);
        super.showBaseAnimate(this.template.checkIn, this.getScale().scaleS);
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-wrap">
                    <div class="${ppx}">
                        <img class="${ppx}-complete-img"></img>
                        <div class="${ppx}-title"></div>
                        <div class="${ppx}-desc">
                            <span class="${ppx}-desc-left"></span> · <span class="${ppx}-desc-right"></span>
                        </div>
                        <div class="${ppx}-btn">
                            <div class="${ppx}-btn-icon-tick">${svg.clockIn}</div>
                            <div class="${ppx}-btn-icon-tick-done">${svg.popupTick}</div>
                            <div class="${ppx}-btn-text">打卡</div>
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
