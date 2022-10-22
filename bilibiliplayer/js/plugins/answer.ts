// tapd： https://www.tapd.bilibili.co/20062561/prong/stories/view/1120062561002481555

import { PopupBase } from '../player/popup/popup-base';
import { IDmAd } from '../io/api-dm-ad';
import { dmAdGet } from '../io/api-dm-ad-get';
import { strLength } from '@shared/utils';

interface IConfig {
    container: HTMLElement;
    ppx: string;
    aid: number;
    visible?: boolean;
    dragFlag?: boolean;
    ctime: () => number;
    login: () => string;
    pause: () => void;
    iframe: () => void;
    tips: (text: string) => void;
    track: (name: string, params: any) => void;
}

export default class Answer extends PopupBase {
    private ppx: string;
    private list: IDmAd[] = [];
    private template!: {
        img: HTMLImageElement;
        [key: string]: HTMLElement;
    };
    private config: Required<IConfig>;
    private hasCard!: boolean;

    private iframeDom!: HTMLIFrameElement;

    private errTimer!: number;
    private inited!: boolean;

    /** 开始展示的时间戳 */
    private startShow!: number;
    /**
     *1：选择题,2:  答对,3：答错,4:  已获得,5：领取浮层 - 领取,6: 领取浮层-领取成功,7：领取浮层-已获得
     */
    private dmState!: number;
    private resultTip = {
        3: '活动未开始',
        4: '活动已结束',
        5: '寻宝球不存在',
    };

    constructor(opt: IConfig) {
        super(opt.ppx);
        this.ppx = opt.ppx;
        this.config = {
            visible: true,
            dragFlag: false,
            ...opt,
        };
    }

    private init() {
        this.inited = true;
        const ppx = this.ppx;
        const ctr = this.config.container;
        ctr.insertAdjacentHTML('beforeend', this.tpl());

        this.template = {
            answer: ctr.querySelector(`.${ppx}-answer`)!,
            img: ctr.querySelector(`.${ppx}-answer-left-img`)!,
            center: ctr.querySelector(`.${ppx}-answer-center`)!,
            right: ctr.querySelector(`.${ppx}-answer-right`)!,
            num1: ctr.querySelector(`.${ppx}-answer-num1`)!,
            num2: ctr.querySelector(`.${ppx}-answer-num2`)!,
            btn: ctr.querySelector(`.${ppx}-answer-btn`)!,
            tagImg: ctr.querySelector(`.${ppx}-answer-tag-left-img`)!,
            tagText: ctr.querySelector(`.${ppx}-answer-tag-text`)!,
        };
        super.addCloseBtn(this.template.answer);

        this.template.answer.addEventListener('click', (e) => {
            const target = <HTMLElement>e.target;
            const action = target.dataset.action;
            const mid = +this.config.login();
            if (!mid || !this.card) {
                return;
            }
            switch (action) {
                case 'num1':
                case 'num2':
                    this.selsect(action, target, mid);
                    e.stopPropagation();
                    return;
                case 'btn':
                    if (this.card.state === 1 || this.card.selected) {
                        this.appendIframe();
                    } else {
                        this.received(mid);
                    }
                    this.tracks('hunt_ball_click_button');
                    e.stopPropagation();
                    return;
                default:
                    break;
            }
            if (this.card.state !== 1 && this.card.select && !this.card.selected) return;
            if (this.card.state === 1 || this.card.selected) {
                this.appendIframe();
            } else {
                this.received(mid);
            }
            this.tracks('hunt_ball_click_card');
        });
    }

    private async selsect(action: string, target: HTMLElement, mid: number) {
        this.template.answer.classList.add(`${this.ppx}-no-action`);
        // 发送接口 获取状态

        const answer = this.card?.select[action === 'num1' ? 'a' : 'b'];

        const res = await dmAdGet({
            item_id: this.card.ballId,
            mid,
            answer,
        });
        if (res.result === 1) {
            // 答对 已领取
            this.dmState = 2;
            this.card.selected = true;
            // this.card.state = 1;
            this.card.from = this.config.ctime();
            this.card.to = this.card.from + 5;

            this.renderInfo();
            this.template.answer.classList.remove(`${this.ppx}-no-action`);
        } else {
            // 答错
            target.classList.add(`${this.ppx}-wrong`);
            this.dmState = 3;
            this.changeInfo(this.card.imgUrl, this.card.errText);
            this.errTimer = window.setTimeout(() => {
                target.classList.remove(`${this.ppx}-wrong`);
                this.changeInfo(this.card.imgUrl, this.card.title);
                this.template.answer.classList.remove(`${this.ppx}-no-action`);
            }, 2000);
            const tips = this.resultTip[<3>res.result];
            if (tips) {
                this.config.tips(tips);
            }
        }

        this.tracks('hunt_ball_answer', {
            hunt_ball_selection: answer,
        });
    }
    private async received(mid: number) {
        this.template.answer.classList.add(`${this.ppx}-no-action`);
        // 发送接口 获取状态
        const res = await dmAdGet({
            item_id: this.card.ballId,
            mid,
        });
        if (res.result === 1) {
            // 已领取
            this.card.state = 1;
            this.dmState = 6;
            this.card.from = this.config.ctime();
            this.card.to = this.card.from + 5;

            this.renderInfo();
        } else {
            const tips = this.resultTip[<3>res.result];
            if (tips) {
                this.config.tips(tips);
            }
        }

        this.template.answer.classList.remove(`${this.ppx}-no-action`);
    }
    private appendIframe() {
        const card = this.card;
        if (!card) {
            return;
        }
        let src = card.btnSrc;

        if (!src) {
            return;
        }

        this.config.iframe();

        if (!this.iframeDom) {
            const wrap = document.body;
            wrap.insertAdjacentHTML('beforeend', this.iframe(src));
            this.iframeDom = wrap.querySelector(`.${this.ppx}-answer-iframe`)!;
            const close = this.iframeDom.querySelector(`.${this.ppx}-answer-iframe-close`)!;
            close.addEventListener('click', () => {
                this.iframeDom.classList.add(`${this.ppx}-hide`);
                this.tracks('hunt_iframe_close');
            });
        } else {
            this.iframeDom.src = src;
            this.iframeDom.classList.remove(`${this.ppx}-hide`);
        }
        this.config.pause();
    }
    resize() {
        if (!this.card || !this.inited) return;
        let { scaleS } = this.getScale();
        this.template.answer.style.cssText = `transform: translateX(-50%) scale(${scaleS});`;
    }
    getScale() {
        return super.getScale(this.template.answer.offsetWidth, this.scale);
    }
    update(list: IDmAd[]) {
        this.delete();
        this.hasCard = false;
        this.list = list;
        this.list.sort((pre: IDmAd, next: IDmAd) => {
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
        if (!this.inited) {
            this.init();
        }
        for (let i = 0; i < this.list.length; i++) {
            const card = this.list[i];
            if (card.from <= time && time <= card.to) {
                this.renderCloseTime(card.from, card.to, time);
                if (this.hasCard && card === this.card) {
                    return;
                }
                this.card = card as IDmAd;
                this.resize();
                this.renderInfo();

                this.show();
                return;
            }
        }
        this.hide();
        this.card = null;
    }

    /**
     * 更新卡片显示数据
     */
    private renderInfo() {
        const card = this.card;
        if (!card) {
            return;
        }
        this.template.answer.classList.remove(`${this.ppx}-select`);

        if (card.tagImg || card.tagText) {
            this.template.answer.insertAdjacentHTML('beforeend', this.tagTpl(card.tagImg, card.tagText));
            card.tagImg = '';
            card.tagText = '';
        }
        let received = card.received;
        if (card.state) {
            this.dmState = 7;
            const right = received || card.right;
            this.changeInfo(right.img, right.title, right.btn);
            return;
        }

        if (card.select) {
            this.dmState = 1;
            if (!card.selected) {
                this.dmState = 4;
                this.template.answer.classList.add(`${this.ppx}-select`);
                this.changeInfo(card.imgUrl, card.title);
                this.template.num1.textContent = strLength(card.select.a, 4).str;
                this.template.num2.textContent = strLength(card.select.b, 4).str;
                this.template.num1.classList.remove(`${this.ppx}-wrong`);
                this.template.num2.classList.remove(`${this.ppx}-wrong`);
                this.template.answer.classList.remove(`${this.ppx}-no-action`);
                return;
            }
            const right = card.right;
            this.changeInfo(right.img, right.title, right.btn);
            return;
        }
        this.dmState = 5;

        let receive = card.receive;
        this.changeInfo(receive.img, receive.title, receive.btn);
    }
    private changeInfo(img: string, title: string, btn?: string) {
        this.template.img.src = img;
        this.template.center.textContent = title;
        if (btn) {
            this.template.btn.textContent = btn;
        }
    }
    closeHandler() {
        this.hide();
        this.list?.splice(this.list.indexOf(this.card), 1);
        this.tracks('hunt_ball_close');
    }
    private hide() {
        this.errTimer && clearTimeout(this.errTimer);
        if (!this.hasCard || !this.inited) {
            return;
        }
        this.template.answer.classList.remove(`${this.ppx}-show`);
        this.template.answer.classList.add(`${this.ppx}-hide`);
        this.hasCard = false;
        if (this.startShow) {
            this.tracks('hunt_ball_show_time', {
                show_time: Date.now() - this.startShow,
            });
        }
        this.startShow = 0;
    }
    private show() {
        this.hasCard = true;
        this.template.answer.classList.add(`${this.ppx}-show`);
        this.template.answer.classList.remove(`${this.ppx}-hide`);
        this.startShow = Date.now();
        this.tracks('hunt_ball_show');
    }
    private tracks(name: string, opts?: any) {
        this.config.track(name, {
            hunt_ball_dm_state: this.dmState,
            hunt_ball_id: this.card?.ballId,
            ...opts,
        });
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-answer">
                <div class="${ppx}-answer-left">
                    <img class="${ppx}-answer-left-img"/>
                </div>
                <div class="${ppx}-answer-center"></div>
                <div class="${ppx}-answer-right">
                    <div class="${ppx}-answer-num1" data-action='num1'></div>
                    <div class="${ppx}-answer-num2" data-action='num2'></div>
                    <div class="${ppx}-answer-btn" data-action='btn'></div>
                </div>
            </div>`;
    }
    private tagTpl(src: string, text: string) {
        const ppx = this.ppx;
        const img = src
            ? `<div class="${ppx}-answer-tag-left">
        <img class="${ppx}-answer-tag-left-img" src="${src}"/>
    </div>`
            : '';
        return `<div class="${ppx}-answer-tag">
        ${img}
        <div class="${ppx}-answer-tag-text">${text}</div>
    </div>`;
    }
    private iframe(src: string) {
        const ppx = this.ppx;
        return `<div class="${ppx}-answer-iframe">
        <span class="${ppx}-answer-iframe-close"><i class="bilibili-player-iconfont icon-close"></i></span>
        <div class="${ppx}-answer-iframe-wrap">
            <iframe class="${ppx}-answer-iframe-item" src="${src}" crolling="no" border="0" frameborder="no" framespacing="0"></iframe>
        </div></div>`;
    }
    dispose() {
        this.errTimer && clearTimeout(this.errTimer);
        this.inited = false;
        if (this.template?.answer) {
            this.config.container.removeChild(this.template.answer);
        }
        if (this.iframeDom) {
            document.body.removeChild(this.iframeDom);
        }
    }
}
