import { ContentType } from "@jsc/namespace";
import Tooltip from "@jsc/player-auxiliary/js/plugins/tooltip";
import URLS from "../../io/urls";
import Player from "../../player";
import svg from "../svg";

const popupWidth = 667; // 组件默认宽度
const popupHeight = 375; // 组件默认高度
const initScale = 0.98; // 缩放初始值

/**
 * 互动弹幕基类，实现一些公用方法，通用组件等
 */
export class PopupBase {
    static PLAYERAREA: JQuery<HTMLElement>;
    static SHRINKAREA: HTMLElement;
    static TRACK: Function;
    static CURRENTPOPUP: string;
    static PLAYERCONFIG: any;
    static LIST = {
        LINK: 'link',
        VOTE: 'vote',
        RESERVE: 'reserve',
        SCORE: 'grade',
        SCORE_SUMMARY: 'score-summary',
        CLOCK_IN: 'clock-in',
    };
    /**
     * 从view接口传过来的是字符串，需要再转一次
     */
    static COMMANDNAME = {
        '#LINK#': 'link',
        '#VOTE#': 'vote',
        '#RESERVE#': 'reserve',
        '#GRADE#': 'grade',
        '#GRADESUMMARY#': 'score-summary',
        '#CHECKIN#': 'clock-in',
    };
    /**
     * 组件缩小态数据
     *
     * shrink  0 不缩小  1 缩小但不展示  2 缩小态展示
     * name 组件名
     * type 类型
     * icon 图片url
     */
    static shrinkList = {
        link: {
            shrink: 0,
            name: '视频',
            type: 2,
            icon: '',
        },
        vote: {
            shrink: 0,
            name: '投票',
            type: 9,
            icon: '',
        },
        reserve: {
            shrink: 0,
            name: '预约',
            type: 10,
            icon: '',
        },
        grade: {
            shrink: 0,
            name: '评分',
            type: 11,
            icon: '',
        },
        'score-summary': {
            shrink: 0,
            name: '评分',
            type: 12,
            icon: '',
        },
        'clock-in': {
            shrink: 0,
            name: '打卡',
            type: 14,
            icon: '',
        },
    };
    scale!: {
        scaleS: number; // 组件的缩放比例
        scaleP: number;
    };
    baseppx: string = '';
    closeID: string = '-popup-dm-close';
    shrinkID = `-popup-dm-shrink`;
    element!: HTMLElement;
    shrinkBtn!: HTMLElement;
    shrinkTxtBtn!: HTMLElement;
    shrinkIcon!: HTMLImageElement;
    popupName: string = 'popup'; // 卡片名
    card: any; // 卡片内容

    constructor(ppx: string = 'bilibili-player') {
        this.baseppx = ppx;
        this.closeID = ppx + this.closeID;
        this.shrinkID = ppx + this.shrinkID;
    }

    static setInitParams(player: Player) {
        PopupBase.PLAYERAREA = player.template.playerArea;
        // 互动弹幕缩小态父容器
        PopupBase.SHRINKAREA = player.template.videoInner.parentElement!;
        // 播放配置传给互动弹幕
        PopupBase.PLAYERCONFIG = player.config;
    }

    static initShrinkState(command: string, extra: any) {
        const type = PopupBase.COMMANDNAME[<'#LINK#'>command];
        if (type) {
            const [shrink, icon, name] = [extra.show_status, extra.shrink_icon, extra.shrink_title];
            PopupBase.shrinkList[<'link'>type].shrink = Number(shrink) ? 2 : 0;
            PopupBase.shrinkList[<'link'>type].icon = icon;
            name && (PopupBase.shrinkList[<'link'>type].name = name);
        }
    }
    getScale(innerWidth: number = 0, scale: any = undefined) {
        if (!scale) {
            let scaleS = 1,
                diagonal = PopupBase.PLAYERAREA.width()! ** 2 + PopupBase.PLAYERAREA.height()! ** 2;
            switch (true) {
                case diagonal < 700 ** 2:
                    scaleS = 0.7;
                    break;
                case diagonal < 1500 ** 2:
                    scaleS = 1;
                    break;
                default:
                    scaleS = 1.5;
                    break;
            }
            scale = scale || {
                scaleS,
                scaleP: innerWidth / popupWidth,
            };
        }
        this.scale = scale;
        this.updateShrinkScale(scale.scaleS);
        return scale;
    }
    updateShrinkScale(scale: number) {
        if (this.shrinkBtn) {
            this.shrinkBtn.style.transform = `scale(${scale})`;
        }
    }
    addCloseBtn(element: HTMLElement) {
        this.element = element;
        element.insertAdjacentHTML('afterbegin', this.renderCloseBtn());
        if (PopupBase.PLAYERCONFIG.type !== ContentType.Editor) {
            const close: HTMLElement = element.querySelector(`.${this.closeID}`)!;
            close.onclick = this.closeHandler.bind(this);
        }
    }
    renderCloseTime(s: number, e: number, c: number, id: string = this.closeID) {
        this.renderPercent(Math.floor(((c - s) / (e - s)) * 100), id);
    }
    closeHandler(e: MouseEvent = <any>null) {
        console.log('base close');
    }
    track(track: any) {
        const type = this.popupName,
            data = this.card;
        if (!data) return;
        track(
            'close_popup_dm',
            JSON.stringify({
                type,
                dmid: data.dmid,
                status: Number(!!data.handled),
            }),
        );
        // 点击关闭按钮后添加缩小态属性
        this.setShrinkState(1);
        // 通知接口改变缩小态
        this.postShrinkState(1);
    }
    setShrinkState(val: number) {
        const list = PopupBase.shrinkList;
        list[<'link'>this.popupName].shrink = val;

        // 因为现在服务端不保存单个组件状态了，但是又怕上线以后反馈太大所以暂时保留代码，目前设置值了要把列表中所有值同步下
        for (let d in list) {
            list[<'link'>d].shrink = val;
        }
    }
    /**
     * 通知服务器缩小态状态
     * @param on 是否开启缩小态 1 开启 0 关闭  默认0
     */
    postShrinkState(on: number = 0) {
        $.ajax({
            url: URLS.DM_SHRINK_CONF,
            type: 'post',
            data: {
                pid: PopupBase.PLAYERCONFIG.aid,
                oid: PopupBase.PLAYERCONFIG.cid,
                type: 1, //PopupBase.shrinkList[this.popupName].type, // 目前后端写死为1，考虑后期可能会再按类型屏蔽，所以按类型传参代码暂时保留
                show_status: on,
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (res) => {
                if (res.code === 0) {
                    // console.log('res: ', res);
                    //     this.showResult(score);
                    //     const dmid = res?.data?.dmidStr;
                    //     dmid && this.player.danmaku?.addPopupDm(String(score), dmid);
                } else {
                    new Tooltip({
                        name: 'response',
                        target: $(PopupBase.SHRINKAREA),
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
    showBaseAnimate(wrap: HTMLElement, scale: number = 1, translate: boolean = true) {
        const translateStr = translate ? 'translate(-50%,-50%)' : '';
        wrap.style.transition = 'none';
        wrap.style.transform = `${translateStr}scale(${scale * initScale}`;
        setTimeout(() => {
            wrap.style.transition = '';
            wrap.style.transform = `${translateStr} scale(${scale}`;
        }, 20);
    }
    renderShrink(item: any, time: number) {
        const [data, type] = [this.card, this.popupName];
        const state = PopupBase.shrinkList[<'link'>type].shrink;
        PopupBase.CURRENTPOPUP = this.popupName;
        switch (state) {
            case 0:
                return false;
                break;
            case 1:
                if (!data || data?.from > time || data?.to < time) {
                    this.setShrinkState(2);
                }
                break;
            case 2:
                // vote类型 type不为9（非投票) 都返回 false
                if (type === PopupBase.LIST.VOTE && item.type !== 9) {
                    return true;
                }
                if (!this.shrinkBtn) {
                    PopupBase.SHRINKAREA.insertAdjacentHTML('afterbegin', this.renderShrinkBtn(this.shrinkID));
                    this.shrinkBtn = PopupBase.SHRINKAREA.querySelector(`.${this.shrinkID}`)!;
                    this.shrinkTxtBtn = PopupBase.SHRINKAREA.querySelector(`.${this.shrinkID}-type`)!;
                    this.shrinkIcon = PopupBase.SHRINKAREA.querySelector(`.${this.shrinkID}-icon-img`)!;
                    this.shrinkBtn.onclick = () => {
                        this.setShrinkState(0);
                        this.postShrinkState();
                        this.renderCloseShrink();
                        PopupBase.TRACK('popup_dm_fold_click', {
                            dmid: item.dmid,
                            type: this.popupName,
                        });
                        // 调用组件render方法重新绘制ui
                        (<any>this)['render']();
                    };
                }
                if (this.shrinkBtn.classList.contains(`${this.shrinkID}-hide`)) {
                    this.resize();
                    this.shrinkBtn.classList.remove(`${this.shrinkID}-hide`);
                    this.shrinkBtn.classList.add(`${this.shrinkID}-show`);
                    this.showBaseAnimate(this.shrinkBtn, this.scale?.scaleS || 1, false);
                    this.shrinkTxtBtn.innerText = PopupBase.shrinkList[<'link'>type].name;
                    this.shrinkIcon.src = PopupBase.shrinkList[<'link'>type].icon;
                    PopupBase.TRACK('popup_dm_fold_show', {
                        dmid: item.dmid,
                        type: this.popupName,
                    });
                }
                this.renderCloseTime(item.from, item.to, time, this.shrinkID);
                break;
            default:
                break;
        }
        return true;
    }
    renderCloseShrink() {
        if (this.shrinkBtn) {
            this.shrinkBtn.classList.add(`${this.shrinkID}-hide`);
            // 等隐藏动画完成，移除元素
            setTimeout(() => {
                this.shrinkBtn?.remove();
                this.shrinkBtn = <any>null;
            }, 300);
        }
    }

    resize() {
        // 缩小态按钮存在时，重新计算scale值
        if (this.shrinkBtn) {
            this.scale = <any>null;
            this.getScale();
        }
    }
    private renderPercent(rotate: number, id: string) {
        // shrink绑定在video-inner里需要从document获取，其他都在组件内部
        const doc = id === this.shrinkID ? document : this.element;
        const [left, right]: [HTMLElement, HTMLElement] = [
            doc?.querySelector(`.${id}-left-bar`)!,
            doc?.querySelector(`.${id}-right-bar`)!,
        ];
        if (!left || !right) {
            return;
        }
        this.setPercent(left, Math.min(50, rotate));
        this.setPercent(right, rotate - 50);
    }
    private setPercent(ele: HTMLElement, rotate: number) {
        const point = -45;
        ele.style.transform = `rotate(${rotate < 0 ? point : point - 3.6 * rotate}deg)`;
    }
    private renderCloseBtn() {
        const closeID = this.closeID;
        return `<div class=${closeID}>
                    <div class="${closeID}-left"><div class="${closeID}-left-bar"></div></div>
                    <div class="${closeID}-right"><div class="${closeID}-right-bar"></div></div>
                    ${svg.popupClose}
            </div>`;
    }
    private renderShrinkBtn(id: string) {
        return `<div class="${id} ${id}-hide">
                    <span class="${id}-type"></span>
                    <div class="${id}-icon">
                        <img class="${id}-icon-img" />
                    </div>
                    <div class="${id}-left"><div class="${id}-left-bar"></div></div>
                    <div class="${id}-right"><div class="${id}-right-bar"></div></div>
            </div>`;
    }
}
