import Player, { IReceivedInterface } from '../player';
import svg from '../player/svg';
import * as WD from '../const/webpage-directive';
import { IActionStateInterface } from '../player/global-function';

import { threeCyc } from '../const/three-cyc';
import { threeLike } from '../const/three-like';
import { threeCoin } from '../const/three-coin';
import { threeCollect } from '../const/three-collect';
import { threeLikeed } from '../const/three-liked';
import { threeCoined } from '../const/three-coined';
import { threeCollected } from '../const/three-collected';

import '../../css/three-click.less';

interface IThreeConfig {
    /**
     * 1: 愚人节使用
     */
    type: number;
    dmid: string;
    three: (down: boolean) => void;
    complete: (click?: boolean) => void;
}
interface IObject {
    [key: string]: string;
}

export default class ThreeClick {
    private ppx: string;
    private player: Player;
    /**
     * 四个按钮状态
     */
    private userState!: IActionStateInterface;
    /**
     *150ms后触发三连
     */
    private threeTimer!: number;
    /**
     *1.5s长按成功
     */
    private hitTimer!: number;
    /**
     * 标识已经开始长按（用来标识不触发点击事件)只有动画完成，或下一周期开始才会重置
     */
    private hitting!: boolean;
    /**
     * 存储动画对象
     */
    private threeAnimate: any = {};
    private name2Svg: any = {};
    private template!: { [key: string]: HTMLElement; };
    container!: HTMLElement;

    constructor(player: Player, private config: IThreeConfig) {
        this.player = player;
        this.ppx = player.prefix;

        this.init();
        this.events();
    }

    private init() {
        const ctr = document.createElement('div');
        this.container = ctr;
        ctr.className = `${this.ppx}-three-click`;
        ctr.innerHTML = this.tpl();

        this.threeAnimate = {};
        this.template = {
            three: ctr.querySelector(`.${this.ppx}-three`)!,
            animate: ctr.querySelector(`.${this.ppx}-three-animate`)!,
            like: ctr.querySelector(`.${this.ppx}-three-like`)!,
            coin: ctr.querySelector(`.${this.ppx}-three-coin`)!,
            collect: ctr.querySelector(`.${this.ppx}-three-collect`)!,
            cyc: ctr.querySelector(`.${this.ppx}-three-cyc`)!,
            threeBg: ctr.querySelector(`.${this.ppx}-animate-bg`)!,
            threeLike: ctr.querySelector(`.${this.ppx}-animate-like`)!,
            threeCoin: ctr.querySelector(`.${this.ppx}-animate-coin`)!,
            threeCollect: ctr.querySelector(`.${this.ppx}-animate-collect`)!,
            likeCyc: ctr.querySelector(`.${this.ppx}-cyc-like`)!,
            coinCyc: ctr.querySelector(`.${this.ppx}-cyc-coin`)!,
            collectCyc: ctr.querySelector(`.${this.ppx}-cyc-collect`)!,
        };
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
        const getActionState = this.player.globalFunction.WINDOW_AGENT.getActionState;
        const data = typeof getActionState === 'function' ? getActionState() : null;

        this.userStateUpdate(data);
    }
    private events() {
        const thumbUp = (e: MouseEvent) => {
            document.removeEventListener('mouseup', thumbUp);
            // 三连动画开始才会取消三连
            this.hitTimer && this.threeHitCel();
            setTimeout(() => {
                this.hitting = false;
            }, 1);
        };

        this.template.like.addEventListener('mousedown', (e: MouseEvent) => {
            this.hitting = false;
            if (this.userState && (!this.userState.isLike || !this.userState.isCollect || !this.userState.isCoin)) {
                // 150ms后触发三连
                this.threeTimer = window.setTimeout(() => {
                    this.config.three?.(true);
                    this.hitting = true;
                    this.threeHit();
                    this.container.classList.add(this.ppx + '-hide');
                }, 150);
            }
            document.addEventListener('mouseup', thumbUp);
        });

        this.container.addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
            if (this.hitting) {
                // 长按不触发点击事件
                return;
            }
            const action = (e.target as HTMLElement).dataset.action;

            this.threeTimer && clearTimeout(this.threeTimer);

            switch (action) {
                case 'like':
                    this.track('web_three_like', {
                        action: this.userState.isLike ? '1' : '0',
                    });
                    this.pageEvents('playerCallSendLike', false);
                    break;
                case 'coin':
                    if (this.userState?.isCoin) {
                        return;
                    }
                    this.pageEvents('playerCallSendCoin', false);
                    this.track('web_three_coin');
                    break;
                case 'collect':
                    if (!this.userState?.isCollect) {
                        const action = this.player.globalFunction.WINDOW_AGENT.playerCallSendCollect;
                        if (typeof action === 'function') {
                            action({ isNeedPanel: false, isCollect: true });
                            this.track('web_three_collect');
                        }
                    }
                    break;

                default:
                    break;
            }
        });

        // 用户行为状态更新 228001
        this.player.directiveManager.on(WD.WP_USER_STATE_UPDATE.toString(), (e, received: IReceivedInterface) => {
            this.userStateUpdate(received.data);
        });
    }

    private track(name: string, val?: IObject) {
        if (this.config.type === 1) {
            name += '_fool';
        }
    }

    private pageEvents(event: string, showPanel: boolean) {
        const action = this.player.globalFunction.WINDOW_AGENT[event];
        if (typeof action === 'function') {
            action(showPanel);
        }
    }

    /**
     * 长按三连
     */
    private threeHit() {
        // 加载并执行动画
        this.loadAnimate('threeLike', this.userState?.isLike);
        this.loadAnimate('threeCoin', Boolean(this.userState?.isCoin));
        this.loadAnimate('threeCollect', this.userState?.isCollect, true);

        this.loadAnimate('likeCyc');
        this.loadAnimate('coinCyc');
        this.loadAnimate('collectCyc');

        // 1.5长按成功
        this.hitTimer = window.setTimeout(() => {
            this.pageEvents('playerCallSendTriple', false);
            this.track('web_three_hit', { type: '1' });
            this.hitTimer = 0;
            this.config.complete?.(true);
        }, 1500);
    }
    /**
     * 取消三连
     */
    private threeHitCel() {
        this.config.three?.(false);
        this.track('web_three_hit', { type: '2' });
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
     * 隐藏动画
     */
    private secondLater() {
        this.container.classList.remove(this.ppx + '-hide');
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
                this.template[name].innerHTML = '';
            }
            if (!ed && this.threeAnimate[name + 'ed']) {
                // 未激活态  做动画，要移除已激活态的动画
                this.threeAnimate[name + 'ed'].destroy();
                this.threeAnimate[name + 'ed'] = null;
                this.template[name].innerHTML = '';
            }
            this.threeAnimate[key] = window['lottie']['loadAnimation']({
                container: this.template[name],
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
        this.userState = data;

        const { like, coin, collect } = this.template;
        if (data.isLike) {
            like.classList.add(`${this.ppx}-active`);
        } else {
            like.classList.remove(`${this.ppx}-active`);
        }
        if (data.isCoin) {
            coin.classList.add(`${this.ppx}-active`);
        } else {
            coin.classList.remove(`${this.ppx}-active`);
        }
        if (data.isCollect) {
            collect.classList.add(`${this.ppx}-active`);
        } else {
            collect.classList.remove(`${this.ppx}-active`);
        }
    }
    private tpl() {
        const ppx = this.ppx;
        const three = `<div class="${ppx}-three">
            <span class="${ppx}-three-like" data-action="like">${svg.like}</span>
            <span class="${ppx}-three-coin" = data-action="coin">${svg.coin}</span>
            <span class="${ppx}-three-collect" data-action="collect">${svg.collection}</span>
        </div>
        <div class="${ppx}-three-animate">
            <span class="${ppx}-animate-like"></span>
            <span class="${ppx}-animate-coin"></span>
            <span class="${ppx}-animate-collect"></span>
        </div>
        <div class="${ppx}-three-cyc">
            <span class="${ppx}-cyc-like"></span>
            <span class="${ppx}-cyc-coin"></span>
            <span class="${ppx}-cyc-collect"></span>
        </div>`;

        return three;
    }
}
