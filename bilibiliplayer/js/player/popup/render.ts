import Popup, { IPoputBodyInterface } from '.';
import Player, { IReceivedInterface } from '../../player';
import { IActionStaffInterface, IActionStateInterface } from '../global-function';
import STATE from '../state';
import svg from '../svg';
import { ApiRelationModifyOutData } from '../../io/api-relation-modify';
import * as WD from '../../const/webpage-directive';

import { voteBg } from '../../const/vote';
import { threeCyc } from '../../const/three-cyc';
import { threeLike } from '../../const/three-like';
import { threeCoin } from '../../const/three-coin';
import { threeCollect } from '../../const/three-collect';
import { threeLikeed } from '../../const/three-liked';
import { threeCoined } from '../../const/three-coined';
import { threeCollected } from '../../const/three-collected';
import { PopupBase } from './popup-base';
import ApiUserRelation, { ApiUserRelationOutData } from '../../io/api-user-relation';
import ApiDmVote, { ApiDmVoteOutData } from '../../io/api-dm-vote';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { htmlEncode } from '@shared/utils';

interface IRenderOptionsInterface {
    container: JQuery;
    player: Player;
    time: () => number;
}

interface IPositionInterface {
    x: number;
    y: number;
}

const popupWidth = 667;
const popupHeight = 375;
const popupPadding = 64;
const popupAreaWidth = popupWidth - popupPadding * 2;

class Render extends PopupBase {
    private container: JQuery;
    private options: IRenderOptionsInterface;
    private positionStart!: IPositionInterface;
    private positionEnd!: IPositionInterface;
    private catchedElement!: JQuery;
    private prefix: string;
    private currentItem!: IPoputBodyInterface;
    private popup: Popup;
    private pos_x!: number;
    private pos_y!: number;
    private areaWidth!: number;
    private areaHeight!: number;
    private left!: number;
    private top!: number;
    private player: Player;
    private dragFlag = false;
    /**
     * 四个按钮状态
     */
    private userState!: IActionStateInterface;
    /**
     *当前按钮宽
     */
    private width!: number;
    /**
     *当前按钮高
     */
    private height!: number;
    /**
     * 存储动画对象
     */
    private threeAnimate: any = {};
    private name2Svg: any = {};
    private template!: { [key: string]: JQuery; };
    /**
     *150ms后触发三连
     */
    private threeTimer!: number;
    /**
     * 只有在当前视频点击了关注，才能取消关注
     */
    private canCancelFollow: any = {};
    /**
     *  0:只有关注按钮， 1： 只有三连， 2 既有关注，又有三连
     */
    private type!: number;
    /**
     * 鼠标按下的时候，不消失，松开 延迟1s消失
     */
    private isMouseDown!: boolean;
    /**
     * 松开 延迟1s消失
     */
    private mouseUpTimer!: number;
    /**
     *1.5s长按成功
     */
    private hitTimer!: number;
    /**
     * 标识已经开始长按（用来标识不触发点击事件)只有动画完成，或下一周期开始才会重置
     */
    private hitting!: boolean;
    private midIo: any = {};
    private isVoting!: boolean;

    constructor(options: IRenderOptionsInterface, popup: Popup) {
        super(options.player.prefix);
        this.options = options;
        this.container = this.options.container;
        this.player = this.options.player;
        this.prefix = this.player.prefix + '-video-popup';
        this.popup = popup;
        this.popupName = PopupBase.LIST.VOTE;
        this.init();
    }
    closeHandler() {
        const data = this.popup.data;
        // data?.splice(data.indexOf(this.currentItem), 1);
        this.clear();
    }

    init() {
        this.bindEvents();
    }

    draw(item: IPoputBodyInterface, disableFade?: boolean) {
        this.isMouseDown = false;
        this.hitting = false;
        this.hitTimer = 0;
        this.isVoting = false;
        this.scale = <any>null;
        this.mouseUpTimer && clearTimeout(this.mouseUpTimer);
        if (this.currentItem?.ele) {
            // 每次渲染按钮 先把上一个按钮隐藏
            this.wipe(this.currentItem);
        }
        this.currentItem = item;
        this.card = item;

        this.userState = this.getActionState();

        if (!this.userState || this.currentItem.type === 7) {
            setTimeout(() => {
                this.getRelation(this.currentItem);
            }, 10);
        }

        item.ele = $(this.tpl(item));

        this.container.append(item.ele);

        this.threeAnimate = {};
        this.template = {
            item: this.container.find(`.${this.prefix}-item`),
            three: this.container.find(`.${this.prefix}-three`),
            animate: this.container.find(`.${this.prefix}-three-animate`),
            cyc: this.container.find(`.${this.prefix}-three-cyc`),
            threeBg: this.container.find(`.${this.prefix}-animate-bg`),
            threeLike: this.container.find(`.${this.prefix}-animate-like`),
            threeCoin: this.container.find(`.${this.prefix}-animate-coin`),
            threeCollect: this.container.find(`.${this.prefix}-animate-collect`),
            likeCyc: this.container.find(`.${this.prefix}-cyc-like`),
            coinCyc: this.container.find(`.${this.prefix}-cyc-coin`),
            collectCyc: this.container.find(`.${this.prefix}-cyc-collect`),
            vote: this.container.find(`.${this.prefix}-vote`),
        };
        this.template.vote[0] && super.addCloseBtn(this.template.vote[0]);
        this.name2Svg = {
            threeCyc,
            threeLike,
            threeLikeed,
            threeCoin,
            threeCollect,
            threeCoined,
            threeCollected,
            likeCyc: threeCyc,
            coinCyc: threeCyc,
            collectCyc: threeCyc,
        };
        this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
            from: this.currentItem.from,
            to: this.currentItem.to,
            pos_x: this.pos_x,
            pos_y: this.pos_y,
        });

        const myVote = this.currentItem?.myVote;
        if (myVote) {
            let dom = this.template.vote.find(`.${this.prefix}-flag-${myVote}`);
            this.triggerVote(myVote, dom);
        }

        if (!this.popup.dragable) {
            setTimeout(() => {
                this.template.item.addClass(`${this.prefix}-animate`);
            }, 20);
            super.showBaseAnimate(this.currentItem.ele![0], this.getScale()?.scaleS);
        } else {
            this.template.item.css('opacity', 1);
        }
        this.userStateUpdate(this.userState);
        this.changeInitThreeState(true);
    }

    /**
     * @private 根据mid 获取 是否已关注
     */
    private getRelation(card: IPoputBodyInterface) {
        const mid = card?.mid;
        if (!mid || card.isFollow) {
            this.userStateUpdate({
                isFollow: card.isFollow!,
            });
            return;
        }
        if (this.midIo[mid]) return;

        this.midIo[mid] = new ApiUserRelation({ mid: card?.mid });
        this.midIo[mid].getData({
            success: (res: ApiUserRelationOutData) => {
                if (card === this.currentItem) {
                    this.currentItem.isFollow = Boolean(res.mid);
                    this.userStateUpdate({
                        isFollow: Boolean(res.mid),
                    });
                }
            },
        });
    }

    clear() {
        this.container.html('');
        if (this.popup.dragable) {
            return;
        }

        this.popup.data?.forEach((item) => {
            item.ele = null;
            // 投票 时间重置
            if (item.type === 9) {
                item.to = Math.min(item.to, item.from + item.duration!);
            }
        });
        this.renderCloseShrink();
    }

    wipe(sub: IPoputBodyInterface) {
        if (this.isMouseDown) {
            return false;
        }
        sub.ele?.fadeOut(350, () => {
            sub.ele?.remove();
            sub.ele = null;
        });
        // 投票 时间重置
        if (sub.type === 9 && sub.duration) {
            if (!this.popup.dragable) {
                sub.to = Math.min(sub.to, sub.from + sub.duration);
            } else {
                sub.to = sub.from + 5;
            }
        }
        return true;
    }

    resize() {
        this.scale = <any>null;
        if (this.currentItem?.ele) {
            let { scaleP, scaleS } = this.getScale();

            this.left = this.pos_x * scaleP;
            this.top = this.pos_y * scaleP;

            this.left = Math.max(this.left, (scaleS * this.width) / 2 + popupPadding * scaleP);
            this.top = Math.max(this.top, (scaleS * this.height) / 2 + popupPadding * scaleP);

            this.left = Math.min(this.left, this.popup.innerWidth - (scaleS * this.width) / 2 - popupPadding * scaleP);
            this.top = Math.min(this.top, this.popup.innerHeight - (scaleS * this.height) / 2 - popupPadding * scaleP);

            this.currentItem.ele.css({
                transform: `translateX(-50%) translateY(-50%) scale(${scaleS})`,
                left: `${this.left}px`,
                top: `${this.top}px`,
            });
        }
        super.resize();
    }

    private bindEvents() {
        const thumbMove = (e: MouseEvent) => {
            this.positionEnd = {
                x: e.clientX,
                y: e.clientY,
            };
            this.dragFlag = true;
            this.move();
        };

        const thumbUp = (e: MouseEvent) => {
            document.removeEventListener('mouseup', thumbUp);
            if (!this.popup.dragable) {
                // 三连动画开始才会取消三连
                this.hitTimer && this.threeHitCel();
                return false;
            }
            this.mouseUp();
            document.removeEventListener('mousemove', thumbMove);
        };

        this.container[0].addEventListener('mousedown', (e: MouseEvent) => {
            if (!this.popup.dragable) {
                this.hitting = false;
                if (
                    this.userState &&
                    (!this.userState.isLike || !this.userState.isCollect || !this.userState.isCoin) &&
                    $(e.target!).hasClass(this.prefix + '-three-like')
                ) {
                    this.isMouseDown = true;
                    // 150ms后触发三连
                    this.threeTimer = window.setTimeout(() => {
                        this.checkLogin(() => {
                            this.hitting = true;
                            document.addEventListener('mouseup', thumbUp);
                            this.threeHit();
                            this.template.item.addClass(this.prefix + '-hide');
                        });
                    }, 150);
                }
                return;
            }
            if ($(e.target!).hasClass(`${this.prefix}-item`)) {
                this.catchedElement = $(<HTMLElement>e.target!);
            } else {
                this.catchedElement = $(<HTMLElement>e.target!).parents(`.${this.prefix}-item`);
            }
            this.positionStart = {
                x: e.clientX,
                y: e.clientY,
            };
            this.positionEnd = {
                x: e.clientX,
                y: e.clientY,
            };
            this.areaWidth = this.popup.ele.area.width()!;
            this.areaHeight = this.popup.ele.area.height()!;
            document.addEventListener('mousemove', thumbMove);
            document.addEventListener('mouseup', thumbUp);
        });

        this.container[0].addEventListener('click', (e: MouseEvent) => {
            // e.stopPropagation();
            if (!this.popup.dragable) {
                if (this.hitting) {
                    // 长按不触发点击事件
                    return;
                }
                this.threeTimer && clearTimeout(this.threeTimer);
            }
            this.isMouseDown = false;
            if (this.dragFlag) {
                this.dragFlag = false;
                return true;
            } else {
                if (this.popup.dragable) {
                    return true;
                }
                const target = $(e.target!);
                if (target.hasClass(`${this.prefix}-follow`)) {
                    this.checkLogin(this.follow.bind(this));
                } else if (target.hasClass(`${this.prefix}-three-like`)) {
                    this.checkLogin(this.pageEvents.bind(this, 'playerCallSendLike'));
                } else if (target.hasClass(`${this.prefix}-three-coin`)) {
                    if (this.userState?.isCoin) {
                        return;
                    }
                    this.checkLogin(this.pageEvents.bind(this, 'playerCallSendCoin', false));
                } else if (target.hasClass(`${this.prefix}-three-collect`)) {
                    if (!this.userState?.isCollect) {
                        this.checkLogin(() => {
                            const action = this.player.globalFunction.WINDOW_AGENT.playerCallSendCollect;
                            if (typeof action === 'function') {
                                action({ isNeedPanel: false, isCollect: true });
                            }
                        });
                    }
                } else if (target.hasClass(`${this.prefix}-vote-an`)) {
                    if (!this.currentItem.myVote && !this.isVoting) {
                        this.checkLogin(() => {
                            this.inVote(target);
                        });
                    }
                }
            }
        });

        // 用户行为状态更新 228001
        this.player.directiveManager.on(WD.WP_USER_STATE_UPDATE.toString(), (e, received: IReceivedInterface) => {
            this.userStateUpdate(received.data);
        });
    }
    private pageEvents(event: string, showPanel: boolean) {
        const action = this.player.globalFunction.WINDOW_AGENT[event];
        if (typeof action === 'function') {
            action(showPanel);
        }
    }

    /**
     * @desc 快捷键（Digital1、Digital2）投票
     */
    shortcutVote(idx: number, cb?: Function) {
        let dom = this.container?.find(`.${this.prefix}-flag-${idx}`);
        if (dom?.length && !this.currentItem.myVote && !this.isVoting) {
            this.checkLogin(() => {
                if (typeof cb === 'function') {
                    cb();
                }
                this.inVote(dom);
            });
        }
    }

    /**
     * 外部触发投票 （发送一条弹幕
     */
    outVote(idx: number) {
        let dom = this.template?.vote.find(`.${this.prefix}-flag-${idx}`);
        if (dom?.length) {
            this.vote(dom, idx);
        }
    }
    /**
     * @private 内部触发投票
     */
    private inVote(target: JQuery<EventTarget>) {
        const card = this.currentItem;
        const ctime = this.options.time();
        if (ctime >= card.to) {
            return;
        }
        const idx = Number(target.data('idx'));

        this.isVoting = true;

        const { aid, cid } = this.popup.player.config;
        new ApiDmVote({
            aid,
            cid,
            progress: Math.max(Math.round(ctime * 1000), 1),
            vote_id: card.voteId!,
            vote: idx,
        }).getData({
            success: ({ data }: ApiDmVoteOutData) => {
                if (card === this.currentItem) {
                    this.vote(target, idx);
                }
                const dmid = data?.dm?.dm_id_str;
                const dm = card?.options![idx - 1]?.desc;
                dmid && this.popup.player.danmaku?.addPopupDm(dm, dmid);
            },
            error: () => {
                this.isVoting = false;
                this.ioError('投票失败，请重新选择');
            },
        });
    }
    private vote(target: JQuery<EventTarget>, idx: number) {
        if (this.currentItem.myVote) return;

        if (this.currentItem?.options) {
            const list = this.currentItem.options;
            list.forEach((card) => {
                if (card.idx === idx) {
                    card.cnt += 1;
                }
            });
        }
        this.triggerVote(idx, target);
    }

    private triggerVote(idx: number, target: JQuery<EventTarget>) {
        const ctime = this.options.time();
        if (this.currentItem.duration) {
            this.currentItem.to = ctime + 4;
        }

        this.currentItem.myVote = Number(idx);
        target.addClass(`${this.prefix}-select`);
        this.template.vote.addClass(`${this.prefix}-selected`);
        this.voteAnimate(target.find(`.${this.prefix}-vote-lottie`)[0]);

        setTimeout(() => {
            this.template.vote.addClass(`${this.prefix}-show-num`);
            this.numRun();
        }, 200);
        this.currentItem.handled = true;
    }

    private voteAnimate(dom: HTMLElement) {
        return window['lottie']['loadAnimation']({
            container: dom,
            renderer: 'svg',
            name: 'voteLottie',
            loop: false,
            // loop: true,
            autoplay: true,
            animationData: voteBg,
        });
    }

    private numRun() {
        this.parseVote();
        if (this.currentItem?.options) {
            const list = this.currentItem.options;
            list.forEach((card) => {
                const dom = this.container.find(`.${this.prefix}-flag-${card.idx}`);
                const domNum = dom.find(`.${this.prefix}-vote-an-num-1`);
                const domPer = dom.find(`.${this.prefix}-vote-an-num-2`);

                domPer.html(card.percent + '%');

                const buff = dom.find(`.${this.prefix}-vote-an-bg-buffer`);
                buff.css({
                    width: card.percent + '%',
                    borderRadius: card.percent === 100 ? '4px' : '4px 0 0 4px',
                });
                this.renderNum(domNum, card.cnt, performance.now());
            });
        }
    }
    private renderNum(dom: JQuery, num: number, time: number) {
        requestAnimationFrame((timeStamp) => {
            let cnum = Math.round((num * (timeStamp - time)) / 1000);
            cnum = Math.min(cnum, num);
            if (cnum >= 10e7) {
                dom.html((cnum / 10e7).toFixed(1) + '亿');
            } else if (cnum >= 10e3) {
                dom.html((cnum / 10e3).toFixed(1) + '万');
            } else {
                dom.html(String(cnum));
            }

            if (cnum < num) {
                this.renderNum(dom, num, time);
            } else {
                setTimeout(() => {
                    this.container.find(`.${this.prefix}-vote`)?.addClass(`${this.prefix}-vote-end`);
                }, 1500);
            }
        });
    }
    private parseVote() {
        if (this.currentItem?.options) {
            let all = 0;
            let percent = 0;
            const list = this.currentItem.options;
            list.forEach((card) => {
                all += card.cnt;
            });
            list.forEach((card, index) => {
                if (index === list.length - 1) {
                    percent = 100 - percent;
                } else {
                    percent = Math.round((card.cnt / all) * 100);
                }
                card.percent = percent;
            });
        }
    }
    private ioError(message: string) {
        new Tooltip({
            name: 'send',
            target: this.player.template.playerWrap,
            position: 'center-center',
            text: message,
            padding: [15, 20, 15, 20],
        });
    }
    /**
     * 长按三连
     */
    private threeHit() {
        // 1.5长按成功
        this.hitTimer = window.setTimeout(() => {
            this.pageEvents('playerCallSendTriple', false);
            this.hitTimer = 0;
        }, 1500);

        // 加载并执行动画
        this.loadAnimate('threeLike', this.userState?.isLike);
        this.loadAnimate('threeCoin', Boolean(this.userState?.isCoin));
        this.loadAnimate('threeCollect', this.userState?.isCollect, true);

        switch (this.type) {
            case 1:
            case 2:
                this.loadAnimate('likeCyc');
                this.loadAnimate('coinCyc');
                this.loadAnimate('collectCyc');
                break;
            default:
                break;
        }
    }
    /**
     * 取消三连
     */
    private threeHitCel() {
        this.secondLater();
        this.threeTimer && clearTimeout(this.threeTimer);
        this.hitTimer && clearTimeout(this.hitTimer);
        if (this.threeAnimate) {
            for (const key in this.threeAnimate) {
                this.threeAnimate[key]?.goToAndStop(0, true);
            }
        }
    }
    /**
     * 三连成功或取消，延迟1s  消失
     */
    private secondLater() {
        this.template.item.removeClass(this.prefix + '-hide');
        this.mouseUpTimer && clearTimeout(this.mouseUpTimer);
        this.mouseUpTimer = window.setTimeout(() => {
            this.isMouseDown = false;
            this.mouseUpTimer = 0;
        }, 1000);
    }
    private loadAnimate(name: string, ed?: boolean, complete?: boolean) {
        let key = name;
        if (ed) {
            key += 'ed';
        }
        // @ts-ignore
        if (!this.threeAnimate[key]) {
            if (ed && this.threeAnimate[name]) {
                // 已激活态  做动画，要移除未激活态的动画
                this.threeAnimate[name].destroy();
                this.threeAnimate[name] = null;
                this.template[name].html('');
            }
            if (!ed && this.threeAnimate[name + 'ed']) {
                // 未激活态  做动画，要移除已激活态的动画
                this.threeAnimate[name + 'ed'].destroy();
                this.threeAnimate[name + 'ed'] = null;
                this.template[name].html('');
            }
            this.threeAnimate[key] = window['lottie']['loadAnimation']({
                container: this.template[name][0],
                renderer: 'svg',
                name: key,
                loop: false,
                autoplay: false,
                animationData: this.name2Svg[key],
            });
            if (complete) {
                this.threeAnimate[key].addEventListener('complete', () => {
                    this.secondLater();
                });
            }
        }
        setTimeout(() => {
            this.threeAnimate[key].goToAndPlay(0, true);
        }, 0);
        return this.threeAnimate[key];
    }
    /**
     * 更新按钮状态
     */
    private userStateUpdate(data: IActionStateInterface) {
        if (typeof window.PlayerAgent?.playerCallSendTriple === 'function') {
            this.template?.item.removeClass(`${this.prefix}-no-three`);
        }
        if (this.currentItem?.ele && data) {
            this.userState = data;
            const follow = this.currentItem.ele.find(`.${this.prefix}-follow`);

            if (this.popup.mid === this.currentItem.mid) {
                this.currentItem.isFollow = data.isFollow;
            }
            try {
                const staff = JSON.parse(data.staffs!);
                if (staff?.length) {
                    staff.some((user: IActionStaffInterface) => {
                        if (user.mid === this.currentItem.mid) {
                            this.currentItem.isFollow = user.follow;
                            return true;
                        }
                    });
                }
            } catch (error) { }

            if (this.canCancelFollow[this.currentItem.mid]) {
                follow.addClass(`${this.prefix}-canCancel`);
            }

            this.currentItem.isFollow
                ? follow.addClass(`${this.prefix}-followed`)
                : follow.removeClass(`${this.prefix}-followed`);

            if (this.type === 0) {
                return;
            }

            const like = this.currentItem.ele.find(`.${this.prefix}-three-like`);
            const coin = this.currentItem.ele.find(`.${this.prefix}-three-coin`);
            const collect = this.currentItem.ele.find(`.${this.prefix}-three-collect`);
            data.isLike ? like.addClass(`${this.prefix}-active`) : like.removeClass(`${this.prefix}-active`);

            data.isCoin ? coin.addClass(`${this.prefix}-active`) : coin.removeClass(`${this.prefix}-active`);

            data.isCollect ? collect.addClass(`${this.prefix}-active`) : collect.removeClass(`${this.prefix}-active`);

            this.changeInitThreeState(false);
        }
    }
    changeInitThreeState(bol: boolean = true) {
        const data = this.userState;
        const state = data?.isLike && data?.isCoin && data?.isCollect;
        if (!state) {
            this.template.three.removeClass(`${this.prefix}-init-three`);
            return;
        }
        if (bol && state) {
            this.template.three.addClass(`${this.prefix}-init-three`);
        }
    }

    private mouseUp() {
        const { scaleP } = this.getScale();

        this.currentItem.pos_x = this.left / scaleP;
        this.currentItem.pos_y = this.top / scaleP;

        this.pos_x = this.currentItem.pos_x;
        this.pos_y = this.currentItem.pos_y;

        this.catchedElement.css({
            left: this.left + 'px',
            top: this.top + 'px',
        });
        this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
            manual: true, //用来表示 是鼠标松开触发
            key: this.currentItem.key,
            idStr: this.currentItem.dmid,
            from: this.currentItem.from,
            to: this.currentItem.to,
            pos_x: this.pos_x,
            pos_y: this.pos_y,
        });
    }

    private move() {
        const { scaleP, scaleS } = this.getScale();

        this.left = this.pos_x * scaleP + this.positionEnd.x - this.positionStart.x;
        this.top = this.pos_y * scaleP + this.positionEnd.y - this.positionStart.y;

        this.left = Math.max(this.left, popupPadding * scaleP + (this.width / 2) * scaleS);
        this.top = Math.max(this.top, popupPadding * scaleP + (this.height / 2) * scaleS);

        this.left = Math.min(this.left, this.areaWidth + popupPadding * scaleP - (this.width / 2) * scaleS);
        this.top = Math.min(this.top, this.areaHeight + popupPadding * scaleP - (this.height / 2) * scaleS);

        this.catchedElement.css({
            left: this.left + 'px',
            top: this.top + 'px',
        });
    }
    getScale() {
        return super.getScale(this.popup.ele.inner.width()!, this.scale);
    }

    private follow() {
        if (this.player.user.status().uid === this.currentItem.mid + '') {
            this.player.toast.addTopHinter('不能关注自己', 3000);
        } else {
            const isFollowed = $(`.${this.prefix}-follow`).hasClass(`${this.prefix}-followed`);
            if (!isFollowed || this.canCancelFollow[this.currentItem.mid]) {
                this.canCancelFollow[this.currentItem.mid] = true;
                this.player.globalFunction.follow(
                    {
                        act: isFollowed ? 2 : 1,
                        fid: this.currentItem.mid,
                        reSrc: 245,
                        jsonp: 'json',
                    },
                    (data: ApiRelationModifyOutData) => {
                        if (data && data.code === 0) {
                            const follow = this.currentItem.ele!.find(`.${this.prefix}-follow`);
                            this.currentItem.isFollow = !isFollowed;
                            if (isFollowed) {
                                follow.removeClass(`${this.prefix}-followed`);
                            } else {
                                follow.addClass(`${this.prefix}-followed`);
                            }
                        } else {
                            const err = (data && data.message) || '网络失败';
                            if (err === '账号未登录') {
                                this.player.pause();
                                this.player.quicklogin.load(() => {
                                    this.follow();
                                });
                            } else {
                                this.player.toast.addTopHinter(err, 3000);
                            }
                        }
                    },
                    this.currentItem.mid !== this.popup.mid && this.currentItem.type === 7,
                );
            }
        }
    }

    private getActionState() {
        const action = this.player.globalFunction.WINDOW_AGENT.getActionState;
        if (typeof action === 'function') {
            return action();
        }
    }

    private checkLogin(callback: Function) {
        if (this.player.user.status().login) {
            callback();
        } else {
            this.player.pause();
            this.player.quicklogin.load();
        }
    }
    private tpl(item: IPoputBodyInterface) {
        let img = '';
        let imgClass = '';
        let hook = '';
        const isFollow = this.userState?.isFollow;
        if (item.face) {
            img = `<span class="${this.prefix}-follow-img"><img src="${item.face}"></span>`;
            imgClass = `${this.prefix}-has-img`;
        } else {
            // hook = svg.hook;
        }
        let isOgvFollow = '',
            followName = '关注';
        if (this.card.arcType === 1) {
            followName = '追番';
            isOgvFollow = `${this.prefix}-follow-ogv`;
        }
        const follow = `<div class="${this.prefix}-follow ${imgClass} ${isFollow ? `${this.prefix}-followed` : ''
            } ${isOgvFollow}">
            ${img}
            <span class="${this.prefix}-follow-0 " >${isOgvFollow ? svg.heart : svg.add
            }<span>${followName}</span></span>
            <span class="${this.prefix}-follow-1">
                ${img ? '' : svg.popupTick}<span>已${followName}</span>
            </span>
        </div>`;
        const three = `<div class="${this.prefix}-three">
            <span class="${this.prefix}-three-like">${svg.like}</span>
            <span class="${this.prefix}-three-coin">${svg.coin}</span>
            <span class="${this.prefix}-three-collect">${svg.collection}</span>
        </div>
        <div class="${this.prefix}-three-animate">
            <span class="${this.prefix}-animate-like"></span>
            <span class="${this.prefix}-animate-coin"></span>
            <span class="${this.prefix}-animate-collect"></span>
            <span class="${this.prefix}-animate-bg"></span>
        </div>`;
        const all = `<div class="${this.prefix}-three-cyc">
            <span class="${this.prefix}-cyc-like"></span>
            <span class="${this.prefix}-cyc-coin"></span>
            <span class="${this.prefix}-cyc-collect"></span>
        </div>`;

        let btn = '';
        let className = '';
        this.height = 42;
        if (this.popup.dragable) {
            className = `${this.prefix}-guide-dragable`;
        }
        this.type = item.type;
        switch (item.type) {
            case 1:
                btn = three + all;
                this.width = 140;
                break;
            case 2:
                if (isFollow) {
                    this.type = 1;
                    btn = three + all;
                    this.width = 140;
                    break;
                }

                btn = three + follow + all;
                className += ` ${this.prefix}-guide-all`;
                this.width = 230;
                break;
            case 9:
                let an = '';
                item.options?.forEach((card, index) => {
                    an += `<div class="${this.prefix}-vote-an ${this.prefix}-flag-${card.idx}" data-idx="${card.idx}">
                        <div class="${this.prefix}-vote-lottie"></div>
                        <div class="${this.prefix}-vote-an-bg">
                            <div class="${this.prefix}-vote-an-bg-buffer" style="width:${card.percent}%;"></div>
                        </div>
                        <div class="${this.prefix}-vote-an-text">
                            <div class="${this.prefix}-vote-an-text-index">${index + 1}</div>
                            <div class="${this.prefix}-vote-an-text-doc">${htmlEncode(card.desc)}</div>
                        </div>
                        <div class="${this.prefix}-vote-an-num">
                            <span class="${this.prefix}-vote-an-num-1">${card.cnt}</span>
                            <span class="${this.prefix}-vote-an-num-2">${card.percent}%</span>
                        </div>
                    </div>`;
                });

                btn = `<div class="${this.prefix}-vote">
                    <div class="${this.prefix}-vote-question">${htmlEncode(item.question!)}</div>
                    ${an}
                </div>`;
                this.width = 192;
                this.height = 110;

                break;
            default:
                btn = follow;
                this.width = 120;
                if (isFollow) {
                    className += ` ${this.prefix}-gray`;
                }
                break;
        }

        if (this.type === 1 || this.type === 2) {
            if (this.userState?.isCoin || this.userState?.isCollect || this.userState?.isLike) {
                className += ` ${this.prefix}-gray`;
            }
        }

        if (!this.popup.dragable) {
            if (typeof window.PlayerAgent?.playerCallSendTriple !== 'function') {
                className += ` ${this.prefix}-no-three`;
            }
        }

        let { scaleP, scaleS } = this.getScale();
        item.pos_x = item.pos_x || popupPadding + this.width / 2;
        item.pos_y = item.pos_y || popupPadding + this.height / 2;

        this.pos_x = item.pos_x;
        this.pos_y = item.pos_y;

        this.left = this.pos_x * scaleP;
        this.top = this.pos_y * scaleP;

        this.left = Math.max(this.left, (scaleS * this.width) / 2);
        this.top = Math.max(this.top, (scaleS * this.height) / 2);

        this.left = Math.min(this.left, this.popup.innerWidth - (scaleS * this.width) / 2);
        this.top = Math.min(this.top, this.popup.innerHeight - (scaleS * this.height) / 2);

        return `<div class="${this.prefix}-item ${this.prefix}-guide-attention ${className}" style="left:${this.left}px;top:${this.top}px;transform:translateX(-50%) translateY(-50%) scale(${scaleS});">${btn}</div>`;
    }
}

export default Render;
