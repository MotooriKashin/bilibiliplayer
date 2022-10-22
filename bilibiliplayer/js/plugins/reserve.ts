import svg from '../player/svg';
import { PopupBase } from '../player/popup/popup-base';

import '../../css/reserve.less';

interface IConfig {
    container: HTMLElement;
    ppx: string;
    aid: number;
    visible?: boolean;
    dragFlag?: boolean;
    ctime: () => number;
    cb: (name: string | IReserve, info?: string) => void;
    update: (card: IReserve) => void;
}
const NORMAL_WIDTH = 667;

export interface IReserve {
    from: number;
    to: number;
    duration: number;
    dmid: string;
    reserveId?: string;
    posY: number;
    posX: number;
    text: string;
    /**
     * 预约人数
     */
    count: number;
    /**
     * 稿件预约状态  0： 可以预约， 1：预约结束
     */
    state: number;
    /**
     * 用户是否预约
     */
    userState: boolean;
    /**
     * 是否为直播
     */
    live: boolean;
    /**
     * 直播状态  0： 未开播， 1：正在直播， 2： 直播结束 转点播
     */
    liveState?: number;
    /**
     *开始时间 timestamp (s)
     */
    liveTime?: number;
    liveTimeFormat?: string;
    /**
     * 人气值
     */
    popularity?: number;
    /**
     * 配置预约的用户id
     */
    mid?: number;
    /**
     *跳转链接
     */
    jump?: string;

    /**
     * 创作中心使用
     */
    key?: string;
    /**
     * 是否显示过
     */
    showed?: boolean;
    handled?: boolean;
    liveLottery?: boolean;
    /**
     *稿件开始时间 timestamp (s)
     */
    arcTime?: number;
    arcTimeFormat?: string;
    desc?: string;
    cooperationTime?: number;
    cooperationTimeFormat?: string;
}
export default class Reserve extends PopupBase {
    private ppx: string;
    private list: IReserve[] = [];
    private template!: {
        [key: string]: HTMLElement;
    };
    private config: Required<IConfig>;
    private hasCard!: boolean;

    private startY!: number;
    private endY!: number;
    private posY!: number;
    private posX!: number;
    private timer!: number;
    private height!: number;

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.ppx = opt.ppx;
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
        this.popupName = PopupBase.LIST.RESERVE;
        this.init();
    }

    private init() {
        const ppx = this.ppx;
        const ctr = this.config.container;
        ctr.insertAdjacentHTML('beforeend', this.tpl());

        this.template = {
            wrap: ctr.querySelector(`.${ppx}-reserve-wrap`)!,
            reserve: ctr.querySelector(`.${ppx}-reserve`)!,
            title: ctr.querySelector(`.${ppx}-reserve-title`)!,
            num: ctr.querySelector(`.${ppx}-reserve-num`)!,
            numLeft: ctr.querySelector(`.${ppx}-reserve-num-left`)!,
            numRight: ctr.querySelector(`.${ppx}-reserve-num-right`)!,
            btn: ctr.querySelector(`.${ppx}-reserve-btn`)!,
            btnText: ctr.querySelector(`.${ppx}-reserve-btn-text`)!,
            icon: ctr.querySelector(`.${ppx}-reserve-icon`)!,
        };
        super.addCloseBtn(this.template.reserve);

        if (!this.config.dragFlag) {
            this.template.btn.addEventListener('click', (e) => {
                const card = this.card;
                if (card.reserveId && !card.userState) {
                }
                this.config.cb(card);
            });
            return;
        }
        const thumbMove = (e: MouseEvent) => {
            this.endY = e.clientY;
            this.move();
        };

        const thumbUp = (e: MouseEvent) => {
            document.removeEventListener('mouseup', thumbUp);
            this.mouseUp();
            document.removeEventListener('mousemove', thumbMove);
        };

        this.template.reserve.addEventListener('mousedown', (e: MouseEvent) => {
            this.startY = e.clientY;
            this.endY = e.clientY;

            document.addEventListener('mousemove', thumbMove);
            document.addEventListener('mouseup', thumbUp);
        });
        this.template.wrap.classList.add(`${this.ppx}-editor`);
    }
    private mouseUp() {
        if (!this.card) {
            return;
        }
        this.card.posY = Number(this.posY.toFixed(1));
        this.config.update(this.card);
    }

    private move() {
        const delta = this.endY - this.startY;
        if (!this.card || !delta) {
            return;
        }

        let { scaleP, scaleS } = this.getScale();
        let y = this.card.posY + delta / scaleP;
        const range = this.height * 0.25;

        y = Math.max(y, range / scaleP);
        y = Math.min(y, (this.height - range) / scaleP);

        this.posY = y;

        this.template.reserve.style.top = `${this.posY * scaleP}px`;
    }

    resize() {
        super.resize();
        if (!this.card) return;

        let width = this.template.wrap.offsetWidth;
        this.height = this.template.wrap.offsetHeight;
        this.scale = <any>null;
        let { scaleP, scaleS } = this.getScale();
        width = Math.min(width, 1248);

        this.card.posX = this.card.posX || NORMAL_WIDTH / 2;
        this.card.posY = this.card.posY || (this.height * 0.75) / scaleP;

        const range = this.height * 0.25;
        this.card.posY = Math.max(this.card.posY, range / scaleP);
        this.card.posY = Math.min(this.card.posY, (this.height - range) / scaleP);

        this.template.reserve.style.cssText = `transform: translate(-50%,-50%) scale(${scaleS}); left:${this.card.posX * scaleP
            };top:${this.card.posY * scaleP}px;`;
    }
    getScale() {
        return super.getScale(this.template.wrap.offsetWidth, this.scale);
    }
    update(list: IReserve[]) {
        this.delete();
        this.hasCard = false;
        this.list = list;
        this.list.sort((pre: IReserve, next: IReserve) => {
            return pre.from - next.from;
        });
        this.render();
    }
    /**
     * 清除卡片列表
     */
    delete() {
        this.list.length = 0;
        this.hide();
    }
    /**
     * 设置参数
     */
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

    /**
     * 更新 卡片（时间变化
     */
    timeUpdate(time: number) {
        if (!this.config.dragFlag && !this.config.visible) {
            return;
        }
        for (let i = 0; i < this.list.length; i++) {
            const card = this.list[i];
            if (card.from <= time && time <= card.to) {
                if (super.renderShrink(card, time)) {
                    return;
                }
                this.renderCloseTime(card.from, card.to, time);
                if (this.hasCard && card === this.card) {
                    return;
                }
                this.card = card as IReserve;
                this.resize();
                this.renderInfo();

                this.show();
                if (!card.showed) {
                    card.showed = true;
                    this.config.cb(
                        'reserve_show',
                        JSON.stringify({
                            dmid: card.dmid,
                            biz_type: card.live ? 2 : 1,
                            reserve_id: card.reserveId,
                            state: card.state,
                            liveState: card.liveState,
                        }),
                    );
                }
                return;
            }
        }
        this.hide();
        this.card = null;
    }

    /**
     * 更新卡片显示数据
     */
    renderInfo() {
        const card = this.card;
        if (!card) {
            return;
        }

        let timeInfo = '';
        if (card.live) {
            if (card.liveState === 1) {
                timeInfo = `<img class=${this.ppx}-img src="//pre-s1.hdslb.com/bfs/static/player/img/playing.gif">直播中`;
                this.template.numRight.textContent = this.formatNum(card.popularity) + '人气';
            } else {
                let msg = '开播';
                if (card.liveState === 2) {
                    msg = '直播';
                }
                if (card.liveTimeFormat) {
                    timeInfo = card.liveTimeFormat + msg;
                } else {
                    timeInfo = (card.liveTime ? this.format(new Date(card.liveTime)) : '') + msg;
                }
                this.template.numRight.textContent = this.formatNum(card.count) + '人预约';
            }
        } else if (card.desc) {
            timeInfo = card.desc;
        } else {
            const timeFormat = card.arcTimeFormat || card.cooperationTimeFormat,
                time = card.arcTime || card.cooperationTime;
            if (timeFormat) {
                timeInfo = `预计${timeFormat}发布`;
            } else {
                timeInfo = time ? `预计${this.format(new Date(time))}发布` : '';
            }
        }
        this.template.numRight.textContent = this.formatNum(card.count) + '人预约';
        this.template.title.textContent = card.text;

        this.template.numLeft.innerHTML = timeInfo;

        if (!timeInfo) {
            this.template.numLeft.classList.remove(`${this.ppx}-show`);
        } else {
            this.template.numLeft.classList.add(`${this.ppx}-show`);
        }

        if ((card.live && card.liveState) || card.state) {
            this.template.btn.classList.add(`${this.ppx}-noIcon`);
            let btn = '去观看';
            if (card.live && card.liveState === 2) {
                btn = '看回放';
            }
            this.template.btnText.textContent = btn;
            return;
        }

        if (card.userState) {
            this.template.btn.classList.add(`${this.ppx}-reserved`);
            this.template.btnText.textContent = '已预约';
        } else {
            this.template.btn.classList.remove(`${this.ppx}-reserved`);
            this.template.btnText.textContent = '预约' + (card.liveLottery ? '有礼' : '');
        }
        card.handled = card.userState;
    }
    animate(plus: boolean) {
        if (this.card && !this.config.dragFlag) {
            const ctime = this.config.ctime();
            this.card.to = ctime + 0.5;
        }
        // const name = plus ? `${this.ppx}-plus` : `${this.ppx}-less`;
        this.template.numRight.className = `${this.ppx}-reserve-num-right`;
    }
    closeHandler() {
        super.track(this.config.cb);
        this.hide();
        // this.list?.splice(this.list.indexOf(this.card), 1);
    }
    private hide() {
        super.renderCloseShrink();
        if (!this.template.reserve.classList.contains(`${this.ppx}-show`)) {
            return;
        }
        this.template.reserve.classList.add(`${this.ppx}-hide`);
        this.hasCard = false;
        if (this.card && !this.config.dragFlag) {
            this.card.to = Math.min(this.card.from + this.card.duration, this.card.to);
        }
    }
    private show() {
        this.hasCard = true;
        this.template.reserve.classList.add(`${this.ppx}-show`);
        this.template.reserve.classList.remove(`${this.ppx}-hide`);
        super.showBaseAnimate(this.template.reserve, this.getScale().scaleS);
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-reserve-wrap">
            <div class="${ppx}-reserve">
                <div class="${ppx}-reserve-msg">
                    <div class="${ppx}-reserve-title"></div>
                    <div class="${ppx}-reserve-num">
                        <span class="${ppx}-reserve-num-left"></span>
                        <span class="${ppx}-reserve-num-right"></span>
                    </div>
                </div>
                <div class="${ppx}-reserve-btn">
                    <div class="${ppx}-reserve-icon">${svg.reserve}</div>
                    <div class="${ppx}-reserve-icon-tick">${svg.popupTick}</div>
                    <div class="${ppx}-reserve-btn-text">预约</div>
                </div>
            </div>
            </div>`;
    }
    private formatNum(count: number) {
        let str = String(count);
        if (count > 10000) {
            str = (count / 10000).toFixed(1) + '万';
        }
        return str;
    }
    /**
     * 格式化直播时间 格式
     */
    private format(date: Date) {
        let fmt = 'MM-dd hh:mm';
        const time = date.getTime();
        const year = date.getFullYear();

        const now = new Date();
        const day = date.getDate();
        const cDay = now.getDate();

        if (year !== now.getFullYear()) {
            fmt = `YYYY-${fmt}`;
        }

        let pre = '';

        if (day === cDay) {
            fmt = 'hh:mm';
            pre = '今天';
        } else {
            const preDay = new Date(time - 24 * 60 * 60 * 1000);
            if (preDay.getDate() === cDay) {
                fmt = 'hh:mm';
                pre = '明天';
            }
        }

        const o = {
            'Y+': year,
            'M+': date.getMonth() + 1, //月份
            'd+': date.getDate(), //日
            'h+': date.getHours(), //小时
            'm+': date.getMinutes(), //分
        };
        for (const k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, ('00' + o[<'Y+'>k]).slice(-String(RegExp.$1).length));
            }
        }
        return pre + fmt;
    }
    dispose() {
        this.timer && clearTimeout(this.timer);
    }
}
