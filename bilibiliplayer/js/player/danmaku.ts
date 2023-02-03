import List from './danmaku-list';
import ContextMenu from '../plugins/context-menu';
import VideoInfoData from './video-info-data';
import Clipboard from 'clipboard';
import Report from '../plugins/report';
import STATE from './state';
import DanmakuIndex from '@jsc/danmaku';
import { IDanmakuData } from './realtime-danmaku';
import ApiRecall, { ApiRecallInData, ApiRecallOutData } from '../io/api-recall';
import ApiDmDel, { ApiDmDelInData, ApiDmDelOutData } from '../io/api-dm-del';
import ApiDateModify, { ApiDateModifyInData, ApiDateModifyOutData } from '../io/api-date-picker';
import * as PD from '../const/player-directive';
import * as WD from '../const/webpage-directive';
import Player, { IReceivedInterface } from '../player';
import { ContentType } from '@jsc/namespace';

import LoadPb, { IDmTrack, defaultTrack } from './proto/load-pb';
import ColorPanel from '../plugins/color-panel';
import { Order } from '@jsc/player-auxiliary/js/plugins/order';
import SessionController from './session-controller';
import CSS3Manager from '@jsc/danmaku/component/manager/css3-manager';
import CanvasManager from '@jsc/danmaku/component/manager/canvas-manager';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import ITextDataInterface from '@jsc/danmaku/interface/text_data';
import { IActionStateInterface } from './global-function';
import { IBlockListItemInterface } from './block';
import { browser, setLocalSettings } from '@shared/utils';

import '../../css/danmaku.less';
import { UHash } from '@shared/utils/utils/uhash';
import { IDmData } from './proto/proto-buffer';

interface IDanmakuMenuInterface {
    type: string;
    icon: string;
    title: string;
    text: string;
    character: string;
    list: List;
    danmaku: any;
    menu: any[];
    afterAppend?: (t: JQuery<HTMLElement>) => void
}

export interface IDanmakuRecallData {
    cid: number;
    dmid: string;
}
export interface IOutDmInfo {
    add?: {
        mode: number; // 弹幕类型  1: 滚动弹幕 4: 底部弹幕 5: 顶部弹幕 6: 逆向弹幕

        text: string; // 弹幕内容

        stime: number; // (单位ms)，弹幕开始时间

        dmid: string; // 弹幕id，
    };
    del?: string[];
    clear?: boolean;
}

class Danmaku {
    private player: Player;
    private manager: CSS3Manager | CanvasManager;
    private report!: Report;
    private loadDate!: string;
    private showSubTitle: boolean = false;
    private resizeTimer!: number;
    private loadDmWorker!: Worker;
    private colorPanel!: ColorPanel;

    private dmPlayerFrame!: number;
    private hotkeyPanelInited = false;
    private allDmLoaded = false;
    private realTimer = 0;
    /** 没有普通弹幕功能 */
    private noDanmaku = false;
    private realList: { danmaku: IDanmakuData; live: boolean }[] = [];
    config: any;
    loadPb!: LoadPb | null;
    dmTrackInfo: IDmTrack;

    contextmenu!: ContextMenu;
    rawDanmaku!: string;
    danmaku: DanmakuIndex;
    list!: List;
    private sendDmidList: String[] = [];
    dmidList!: String[];
    clipboard!: Clipboard;

    constructor(config: any, player: Player) {
        const that = this;
        const typeFromEdgeWorkaround =
            browser.version.edgeBuild16299 || browser.version.trident ? { type: 'canvas' } : null;
        this.player = player;
        this.config = config;
        if (this.player.config.type === ContentType.OgvPre) {
            config['danmaku_config']['fontsize'] = 0.7;
        }
        this.dmTrackInfo = {
            ...defaultTrack,
        };

        this.danmaku = new DanmakuIndex(
            $.extend(
                {
                    listUpdating: function () { },
                    danmakuFilter: function (danmaku: ITextDataInterface) {
                        return !that.player.block.judge(danmaku);
                    },
                    danmakuInserting: function (danmaku: ITextDataInterface) {
                        if (Number(danmaku.mode) === 8) {
                            that._easyMode8(danmaku);
                        }
                    },
                    countUpdating: (total: number) => {
                        // this.player.trigger(STATE.EVENT.PLAYER_SEND, { dm: total });
                    },
                    containerUpdating: function (container: JQuery) {
                        that._setType(container);
                    },
                    timeSyncFunc: function () {
                        if (that.player.video) {
                            return that.player.currentTime()! * 1000;
                        } else {
                            return 0;
                        }
                    },
                },
                config['danmaku_config'],
                {
                    container: config['danmaku_config']['container'],
                    visible: config['danmaku_config']['visible'],
                    type: config['danmaku_config']['type'],
                    opacity: config['danmaku_config']['opacity'],
                    fontFamily: config['danmaku_config']['fontfamily'],
                    fontfamilycustom: config['danmaku_config']['fontfamilycustom'],
                    bold: config['danmaku_config']['bold'],
                    preventShade: config['danmaku_config']['preventshade'],
                    fontBorder: config['danmaku_config']['fontborder'],
                    speedPlus: config['danmaku_config']['speedplus'],
                    speedSync: config['danmaku_config']['speedsync'],
                    fontSize: config['danmaku_config']['fontsize'],
                    fullScreenSync: config['danmaku_config']['fullscreensync'],
                    danmakuNumber: config['danmaku_config']['danmakunumber'] || -1,
                    danmakuArea: config['danmaku_config']['danmakuArea'],
                    fullscreensend: config['danmaku_config']['fullscreensend'],
                    defquality: config['danmaku_config']['defquality'],
                    sameaspanel: config['danmaku_config']['sameaspanel'],
                    videoSpeed: config['danmaku_config']['videospeed'] || 1,
                    isRecycling: true,
                    verticalDanmaku: config['danmaku_config']['verticalDanmaku'],
                },
                typeFromEdgeWorkaround,
            ),
        );

        this.manager = this.danmaku.manager;
        if (player.config.type === ContentType.PugvCenter) {
            return this;
        }
        if (!player.config.hasDanmaku) {
            this.initContextmenu();
            return this;
        }
        if (!player.config.isPremiere) {
            this.loadPb = new LoadPb(this, this.player);
            this.dmTrackInfo = this.loadPb.dmTrack;
            this.initContextmenu();
        } else {
            this.initContextmenu();
        }
        this._globalEvents();
        this.list = new List(this);
    }
    get dmTrack(): IDmTrack {
        if (this.player.advDanmaku) {
            this.danmaku.dmTrack.dmexposure += this.player.advDanmaku.dmexposure;
        }
        if (!this.danmaku.dmTrack.info) {
            this.danmaku.dmTrack.fps = 0;
        }
        let dmHover = {};
        let boom = this.player.allPlugins?.dmBoom?.trackInfo;
        if (boom?.type! >= 0) {
            boom = { boom } as any;
        } else {
            boom = {} as any;
        }
        return {
            dmarea: this.danmaku.config.danmakuArea,
            dmSetIO: this.player.send?.dmSetIO,
            ...this.dmTrackInfo,
            ...this.danmaku.dmTrack,
            ...dmHover,
            ...boom,
        };
    }
    dmInfo(data: IOutDmInfo) {
        const { add, del, clear } = data;
        if (clear) {
            this.danmaku.outClear();
        }
        if (add) {
            if (Array.isArray(add)) {
                add.forEach((item) => {
                    this.dmInfo({ add: item });
                });
                return;
            }
            if (add.dmid) {
                this.danmaku.outAdd({
                    stime: add.stime / 1000 || 0,
                    text: add.text,
                    dmid: add.dmid,
                    mode: 1,
                    size: 25,
                    color: 16777215,
                    date: 0,
                    class: 0,
                    pool: 0,
                    uhash: '',
                    uid: '',
                    weight: 10,
                    flag: -3,
                });
            }
            return;
        }
        if (del) {
        }
    }
    /**
     * 关闭普通弹幕功能
     */
    closeCommon() {
        this.noDanmaku = true;
        this.danmaku.destroy();
    }

    private _globalEvents() {
        const player = this.player;
        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, (e: JQuery.Event, obj: any) => {
            this.danmaku.seek(obj.time, true);
            this.player.basDanmaku?.seek(obj.time, true);
            this.player.as3Danmaku?.seek(obj.time);
        });
        player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, () => {
            this.resize();
        });
        player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
        player.bind(STATE.EVENT.PLAYER_RELOAD, () => {
            if (this.loadPb) {
                this.loadPb.destroy();
            }
            this.clear();
            this.danmaku.danmakuArray.length = 0;
            this.danmaku.timeLine.length = 0;
            this.danmaku.visualArray.length = 0;
            this.player.directiveManager.sender(PD.VI_DATA_INIT, {
                bvid: this.player.config.bvid,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
            });
        });
        this.player.directiveManager.on(WD.DL_RETRIEVE_DATA.toString(), (e: any, received: IReceivedInterface) => {
            if (this.loadPb) {
                this.loadPb.loadPbview.then(() => {
                    this.loadPb!
                        .loadDmPbAll(received.data.retry)
                        .then(() => {
                            this.allDmLoaded = true;
                            this.player.directiveManager.responder(received, {
                                danmaku: this.loadPb!.allDM,
                            });
                        })
                        .catch(() => {
                            this.allDmLoaded = true;
                            this.player.directiveManager.responder(received, {
                                danmaku: this.loadPb!.allDM.length ? this.loadPb!.allDM : 'error',
                            });
                        });
                });
            }
        });
        // 222001
        this.player.directiveManager.on(WD.HD_MONTH_CHANGE.toString(), (e: any, received: IReceivedInterface) => {
            this.changeMonth(received, (data: any) => {
                this.player.directiveManager.responder(received, data);
            });
        });
        // 222002
        this.player.directiveManager.on(WD.HD_DATE_CHANGE.toString(), (e: any, received: IReceivedInterface) => {
            this.loadDate = received['data']['date'];
            if (this.loadDate && this.loadPb) {
                this.clear();
                this.danmaku.timeLine.length = 0;
                this.loadPb
                    .historyPb(this.loadDate)
                    .then(() => {
                        // this.player.send.hideDm();
                        this.player.directiveManager.responder(received, {
                            danmaku: this.loadPb!.allDM,
                        });
                    })
                    .catch(() => {
                        this.player.directiveManager.responder(received, {
                            danmaku: this.loadPb!.allDM.length ? this.loadPb!.allDM : 'error',
                        });
                    });
            }
        });
        // 222003
        this.player.directiveManager.on(WD.HD_REPORT_CHECKED.toString(), (e: any, received: IReceivedInterface) => {
            this.dmReportLocal(received['data']['check']);
        });
    }

    dmReportLocal(val: boolean) {
        this.player.videoSettings.block.dmChecked = val;
        setLocalSettings(this.player.config.storageName, JSON.stringify(this.player.videoSettings));
    }

    play() {
        this.dmPlayerFrame = window['requestAnimationFrame'](() => {
            this.danmaku.play();
        });
        this.player.advDanmaku?.play();
        this.player.basDanmaku?.play();
        this.player.as3Danmaku?.play();
        this.player.controller.danmakuLite?.maskStart();
        this.player.allPlugins?.play();
    }

    pause() {
        window['cancelAnimationFrame'](this.dmPlayerFrame);
        this.danmaku.pause();
        this.player.advDanmaku?.pause();
        this.player.basDanmaku?.pause();
        this.player.as3Danmaku?.pause();
        this.player.controller.danmakuLite?.maskStop();
        this.player.allPlugins?.pause();
    }

    resize(show?: boolean) {
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
            this.danmaku.resize(show);
            this.player.advDanmaku?.resize();
            this.player.basDanmaku?.resize();
            this.player.as3Danmaku?.resize();
        });
    }

    visible(value: boolean) {
        this.danmaku.visible(value);
        this.player.advDanmaku?.visible(value);
        this.player.basDanmaku?.visible(value);
        this.player.as3Danmaku?.visible(value);
        this.player.controller.danmakuLite?.danmakuVisible(value);
        this.player.allPlugins?.option('visible', value);
    }

    /**
     * 举报弹幕  添加屏蔽
     */
    dmReport(data: { block: string; dmid: string; uhash: string }) {
        if (!data.block) {
            return;
        }
        this.danmaku.reportDmid = data.dmid;
        if (this.player.block.reportFilter) {
            this.player.block.reportFilter.push(data.block);
        } else {
            this.player.block.reportFilter = [data.block];
        }
        this.fresh();
        this.addBlock({
            id: -1,
            s: true,
            t: 2,
            v: data.uhash,
        });
    }

    /**
     * 互动弹幕添加弹幕
     */
    addPopupDm(text: string, dmid: string) {
        const userStatus = this.player.user.status();
        const danmaku = {
            dmid,
            text,
            stime: this.player.currentTime()! + 0.01,
            mode: 1,
            size: 25,
            color: 16777215,
            class: 0,
            pool: 0,
            border: true,
            rnd: this.player.pid,
            uid: userStatus.hash_id,
            mid: userStatus.uid,
            uname: userStatus.name ? userStatus.name.split(' ')[0] : '',
            date: Date.parse(String(new Date())) / 1000,
        };
        this.add(danmaku);
    }

    /**
     * 添加实时弹幕
     */
    addReal(danmaku: IDanmakuData, liveDm: boolean = false) {
        if (this.noDanmaku) {
            return;
        }
        const dmid = danmaku.dmid;
        if ((this.dmidList && this.dmidList.indexOf(dmid) > -1) || this.sendDmidList.indexOf(dmid) > -1) {
            return;
        }

        this.dmidList?.push(dmid);

        this.realList.push({
            danmaku,
            live: liveDm,
        });
        if (!this.realTimer) {
            this.realTimer = window.setTimeout(() => {
                let len = 0;
                let list: any[] = [];
                this.realList.forEach(({ danmaku, live }) => {
                    const dm = this.parseDm(danmaku);
                    if (!dm) return;
                    // 当分段弹幕没有实时弹幕分段时，不添加进弹幕列表
                    if (this.loadPb?.add(dm)) return;
                    len++;
                    this.danmaku.add(danmaku as any, live);
                    list.push(dm);
                });
                this.player.trigger(STATE.EVENT.PLAYER_SEND, { dm: len });
                // 121002
                if (this.allDmLoaded && list.length) {
                    this.player.directiveManager.sender(PD.DL_PUT_DANMAKU, list);
                }
                this.realList.length = 0;
                this.realTimer = 0;
            }, 1000);
        }
    }

    private parseDm(danmaku: IDanmakuData) {
        if (this.loadPb?.dmClosed) {
            return;
        }
        if (!danmaku.weight) {
            // 未打分弹幕给个随机的负分
            danmaku.weight = -Math.round(Math.random() * 10);
        }
        const dm = {
            dmid: danmaku.dmid,
            text: danmaku.text, // 弹幕内容
            uhash: danmaku.uid, // user hash
            pool: danmaku.class, // 弹幕类型：普通/字幕弹幕
            date: danmaku.date, // 发送时间
            color: danmaku.color, // 弹幕颜色
            mode: danmaku.mode, // 弹幕模式
            stime: danmaku.stime, // 开始时间
            uid: danmaku.mid, // user id
            uname: danmaku.uname,
            weight: danmaku.weight,
            flag: danmaku.flag,
            headImg: danmaku.headImg,
        };
        this.dmTrackInfo.dmnum++;
        return dm;
    }

    resetSendDmid() {
        this.dmidList = [...this.sendDmidList];
    }

    add(danmaku: any, hide?: string) {
        const dmid = danmaku.dmid;
        if (this.dmidList && this.dmidList.indexOf(dmid) > -1 && !hide) {
            return;
        }

        this.sendDmidList.push(dmid);

        const dm = this.parseDm(danmaku);

        if (!dm) {
            return;
        }

        if (Number(dm.dmid) > 0) {
            // 当分段弹幕没有实时弹幕分段时，不添加进弹幕列表
            if (this.loadPb?.add(dm)) return;

            if (hide && !this.player.config.episodeId && !browser.version.msie) {
                const getActionState = this.player.globalFunction.WINDOW_AGENT.getActionState;
                const data: IActionStateInterface = typeof getActionState === 'function' ? getActionState() : null;
                if (data && !data?.isLike) {
                    this.player.allPlugins?.showDm41(danmaku, hide, data);
                } else {
                    this.append2Dm(danmaku);
                }
            } else {
                this.append2Dm(danmaku);
            }

            if (danmaku.headImg || danmaku.flag === -2) return;
            this.player.trigger(STATE.EVENT.PLAYER_SEND, { dm: 1 });
            // 121002
            this.allDmLoaded && this.player.directiveManager.sender(PD.DL_PUT_DANMAKU, [dm]);
        } else {
            this.append2Dm(danmaku);
        }

        this.player.as3Danmaku.sendDanmaku(danmaku);
    }

    append2Dm(danmaku: ITextDataInterface) {
        if (this.noDanmaku) {
            return;
        }
        this.danmaku.add(danmaku);
    }
    remove(dmid: string) {
        this.danmaku.remove(dmid);
        this.player.advDanmaku?.remove(dmid);
    }

    fresh() {
        this.manager.fresh();
        this.player.advDanmaku?.refreshCdmList(true);
        this.player.basDanmaku?.refreshCdmList(true);
        this.player.as3Danmaku?.refreshCdmList();
    }

    clear() {
        this.danmaku.clear();
        this.player.advDanmaku?.clear();
        this.player.basDanmaku?.clear();
        this.player.as3Danmaku?.clear();
        this.player.allPlugins?.clear();
    }

    option(key: any, value: any) {
        this.danmaku.option(key, value);
    }

    canProtect(d: ITextDataInterface) {
        return (
            d &&
            d.uid === this.player.user.status().hash_id &&
            this.player.user.status().level! >= 4 &&
            this.player.config.playerType === 1
        );
    }
    getReport(): Report {
        if (!this.report) {
            this.report = new Report(this.player, {
                container: this.player.template.playerWrap,
            });
        }
        return this.report;
    }

    sendDanmakuState(state = 0, text = '', outChange = false) {
        // 121006
        this.player.directiveManager.sender(PD.DL_DANMAKU_STATUS, { state, text, outChange });
    }

    setSendStatus(state: number, text: string, isUp?: boolean) {
        this.player.send.updateStatus(state, text);
        if (isUp) {
            this.player.send.danmakuModeSelection?.update(isUp);
        } else {
            this.player.send.setConfig({ updm: false });
        }
    }

    private _setType(container: JQuery) {
        this.player.template.danmaku = $(container);
        if (this.danmaku) {
            this.manager = this.danmaku.manager;
        }
    }

    private _easyMode8(danmaku: any) {
        const text = danmaku.text.replace(/\/\*(.*?)\*\//g, '').replace(/\r/g, '');
        if (text) {
            const time: any = text.match(/^Player\.seek\((\d+)\);$/);
            if (time && !this.player.block.judge(danmaku)) {
                this.player.seek(Math.floor(time[1]) / 1000);
            }
        }
    }

    hideAnything(hidePnel?: boolean) {
        this.showSubTitle = true;
        this.contextmenu && this.contextmenu.hide();
        hidePnel && this.report && this.report.report.hide!();
    }

    showAnything() {
        this.showSubTitle = false;
    }
    // 弹幕显示区域点击（目前只为明星弹幕做点击统计
    dmClick(e: JQuery.Event) {
        // searchAreaDanmaku  必须返回数组
        const list = this.danmaku.searchAreaDanmaku(
            e.offsetX!,// e.pageX - this.player.container.offset()!.left,
            e.offsetY!// e.pageY - this.player.container.offset()!.top,
        );
        if (
            list?.some((dm: any) => {
                return dm.textData?.flag >= 0;
            })
        ) {
            this.danmaku.dmTrack.actorClick++;
        }
    }

    initContextmenu() {
        const that = this;
        const player = this.player;
        let container: JQuery;
        if (player.config.gamePlayer) {
            container = player.template.playerArea;
        } else {
            container = player.template.playerWrap;
        }
        this.contextmenu = new ContextMenu(this.player, container, {
            menu: [],
            // menu: [],
            appendTo: this.player.template.container,
            targetClass: 'bilibili-video-comment',
            changedMode: true,
            changedType: 2, // 0, 1, 2
            showOrigin: true,
            // autoRemove: false,
            theme: 'black',
            showDefMenu: false,
            touchMode: player.config.touchMode,
            // @ts-ignore
            onChange: function ($target: JQuery, e: JQuery.Event, pointers?: number) {
                if (that.showSubTitle) {
                    return;
                }
                const list: any[] = [];
                const originMenuClass = `${that.player.prefix}-context-menu-origin`;
                that.contextmenu.$container.removeClass(originMenuClass);
                if (that.player.config.hasDanmaku) {
                    if (e && e.pageX) {
                        const list1 = that.danmaku.searchAreaDanmaku(
                            e.offsetX!,// e.pageX - that.player.container.offset()!.left,
                            e.offsetY! //e.pageY! - that.player.container.offset()!.top,
                        );
                        list.push.apply(list, list1);
                        if (player.advDanmaku) {
                            const list2 = player.advDanmaku.searchAreaDanmaku(e);
                            list.push.apply(list, list2);
                        }
                    } else {
                        return true;
                    }
                }
                let menu: any[] = [];
                if (list.length && (!pointers || pointers === 1)) {
                    that.player.subtitle && that.player.subtitle.hideAnything();
                    list.forEach((item: any) => {
                        const danmaku = $.extend(true, {}, item);
                        if (
                            (danmaku.textData.headImg || danmaku.textData.flag === -2) &&
                            !that.isMineDanmaku(danmaku.textData)
                        ) {
                            return;
                        }
                        const dm: IDanmakuMenuInterface = {
                            type: 'danmaku',
                            icon: '',
                            title: danmaku.textData.text,
                            text: danmaku.textData.text,
                            character: that.isMineDanmaku(danmaku.textData) ? 'that' : 'others',
                            list: that.list,
                            danmaku: danmaku,
                            menu: [],
                            afterAppend: (t: JQuery<HTMLElement>) => {
                                const mid = new UHash().decode(danmaku.textData.uhash);
                                if (mid) {
                                    t.attr('data-usercard-mid', mid);
                                }
                            }
                        };
                        let that2 = [];
                        const copy = {
                            type: 'function',
                            tag: 'copy',
                            text: '复制',
                            afterAppend: function (e: any) {
                                const clipboard = new Clipboard(e[0], {
                                    text: function () {
                                        return danmaku.textData.mode > 7 ? '<? 高级弹幕 />' : danmaku.textData.text;
                                    },
                                    container: that.player.container[0],
                                });
                                clipboard.on('success', function (eve: JQuery.Event) {
                                    that._createClipBoard({
                                        top: e.offset().top,
                                        left: e.offset().left,
                                        text: '已复制',
                                    });
                                });
                                clipboard.on('error', function (eve: JQuery.Event) {
                                    that._createClipBoard({
                                        top: e.offset().top,
                                        left: e.offset().left,
                                        text: '复制失败',
                                    });
                                });
                            },
                        };
                        if (!that.canProtect(danmaku.textData)) {
                            that2 = [
                                copy,
                                {
                                    type: 'function',
                                    tag: 'recall',
                                    text: '撤回',
                                    click: function () {
                                        that.danmakuRecall({
                                            cid: that.player.config.cid,
                                            dmid: danmaku.textData.dmid,
                                        });
                                    },
                                },
                            ];
                        } else {
                            that2 = [
                                copy,
                                {
                                    type: 'function',
                                    tag: 'protect',
                                    text: that._isProtected(danmaku) ? '已申请' : '申请保护',
                                    disabled: that._isProtectedDisabled(danmaku),
                                    click: function ($target: JQuery, e: JQuery.ClickEvent) {
                                        if (that._isProtectedDisabled(danmaku)) {
                                        } else {
                                            that.list ? (that.list.dmidApplied[danmaku.textData.dmid] = true) : '';
                                            that.list &&
                                                that.list.applyProtect(
                                                    danmaku.textData,
                                                    {
                                                        top: $(e.target).offset()!.top,
                                                        left: $(e.target).offset()!.left,
                                                    },
                                                    () => {
                                                        // 124005
                                                        that.player.directiveManager.sender(PD.DL_PUT_PROTECT_DANMAKU, [
                                                            danmaku.textData.dmid,
                                                        ]);
                                                    },
                                                );
                                        }
                                    },
                                },
                                {
                                    type: 'function',
                                    text: '撤回',
                                    click: function () {
                                        that.danmakuRecall({
                                            cid: that.player.config.cid,
                                            dmid: danmaku.textData.dmid,
                                        });
                                    },
                                },
                            ];
                        }

                        const others = [
                            copy,
                            {
                                type: 'function',
                                tag: 'block',
                                text: '屏蔽',
                                click: function () {
                                    const data = {
                                        id: -1,
                                        s: true,
                                        t: 2,
                                        v: danmaku.textData.uid,
                                    };
                                    that.addBlock(data);
                                },
                            },
                            {
                                type: 'function',
                                tag: 'report',
                                disabled: !that.isNotRepeatReport(danmaku.textData.dmid, that.getReport().reported),
                                text: that.isNotRepeatReport(danmaku.textData.dmid, that.getReport().reported)
                                    ? '举报'
                                    : '已举报',
                                click: function () {
                                    const info: any = { dmid: danmaku.textData.dmid };
                                    if (danmaku.textData.weight > 0) {
                                        info.weight = danmaku.textData.weight;
                                    }
                                    if (that.isNotRepeatReport(danmaku.textData.dmid, that.getReport().reported)) {
                                        that.player.subtitle && that.player.subtitle.hideAnything(true);
                                        that.getReport().report.show!(danmaku.textData, container);
                                    }
                                },
                            },
                        ];
                        if (danmaku.textData.headImg || danmaku.textData.flag === -2) {
                            dm.menu = [
                                {
                                    type: 'function',
                                    tag: 'del',
                                    text: '删除',
                                    click: function () {
                                        that.danmakuDel({
                                            oid: that.player.config.cid,
                                            dmid: danmaku.textData.dmid,
                                        });
                                    },
                                },
                            ];
                        } else if (dm.character === 'others') {
                            dm.menu = others;
                        } else if (dm.character === 'that') {
                            dm.menu = that2;
                        }
                        menu.unshift(dm);
                    });
                } else if (!pointers || pointers === 2) {
                    that.contextmenu.$container.addClass(originMenuClass);
                    menu.unshift({
                        type: "tabs",
                        text: "播放速度",

                        tabs: () => {
                            const subwrapp = $(`<div class="${that.player.prefix}-contextmenu-subwrapp">`);
                            const tabs = [
                                {
                                    name: "0.5",
                                    value: 0.5,
                                },
                                {
                                    name: "0.75",
                                    value: 0.75,
                                },
                                {
                                    name: "正常",
                                    value: 1,
                                },
                                {
                                    name: "1.25",
                                    value: 1.25,
                                },
                                {
                                    name: "1.5",
                                    value: 1.5,
                                },
                                {
                                    name: "2.0",
                                    value: 2,
                                }
                            ];
                            let playbackRate = 1;
                            tabs.forEach(d => {
                                if (player.video.playbackRate === d.value) {
                                    playbackRate = player.video.playbackRate;
                                }
                                subwrapp.append(`<span data-rate="${d.value}">${d.name}</span>`);
                            });

                            const span = subwrapp.find("span");
                            span.hover(function () {
                                const that = $(this);
                                span.not(that).removeClass("hover");
                                that.addClass("hover");
                            }, function () {
                                $(this).removeClass("hover");
                            });

                            new Order(subwrapp, {
                                type: "click.tab",
                                value: `[data-rate="${playbackRate}"]`,
                                selector: "span",

                                change: (d) => {
                                    const playbackRate = Number(d.attr("data-rate"));
                                    player.video.playbackRate = playbackRate;
                                    SessionController.setSession("video_status", "videospeed", playbackRate);
                                    that.contextmenu.hide();
                                    player.setting.getItem?.('videospeed')?.value(playbackRate);
                                }
                            });

                            return subwrapp;
                        }
                    }, {
                        type: "tabs",
                        text: "画面比例",

                        tabs: () => {
                            const subwrapp = $(`<div class="${that.player.prefix}-contextmenu-subwrapp">`);
                            const tabs = [
                                {
                                    name: "默认",
                                    value: "video-size-default",
                                },
                                {
                                    name: "4:3",
                                    value: "video-size-4-3",
                                },
                                {
                                    name: "16:9 ",
                                    value: "video-size-16-9",
                                }
                            ];

                            let size = "video-size-default";
                            const sizeCur = player.controller.cacheRatioClass();
                            const sizeList = ["video-size-default", "video-size-4-3", "video-size-16-9"];

                            tabs.forEach(d => {
                                if (d.value === sizeCur) {
                                    size = d.value;
                                }
                                subwrapp.append(`<span data-ratio-class="${d.value}">${d.name}</span>`);
                            });

                            const span = subwrapp.find("span");
                            span.hover(function () {
                                const that = $(this);
                                span.not(that).removeClass("hover");
                                that.addClass("hover");
                            }, function () {
                                $(this).removeClass("hover");
                            });

                            new Order(subwrapp, {
                                type: "click.tab",
                                value: `[data-ratio-class="${size}"]`,
                                selector: "span",

                                change: (d) => {
                                    const size = d.attr("data-ratio-class")!;
                                    player.template.videoWrp.removeClass(sizeList.join(" ")).addClass(size);
                                    player.controller.setVideoSize();
                                    player.controller.cacheRatioClass(size);
                                    that.contextmenu.hide();
                                }
                            });

                            return subwrapp;
                        }
                    });

                    menu.push({
                        type: 'list',
                        menu: [
                            {
                                text: player.controller.isLightOn() ? '关灯' : '开灯',
                                click: () => {
                                    if (player.controller.isLightOn()) {
                                        player.controller.turnLight('off');
                                    } else {
                                        player.controller.turnLight('on');
                                    }
                                },
                            },
                            {
                                text: player.template.videoWrp.hasClass('video-mirror') ? '<span class="active">镜像</span>' : '镜像',
                                click: () => {
                                    if (player.template.videoWrp.hasClass('video-mirror')) {
                                        player.setting.getItem?.('videomirror')?.value(false);
                                    } else {
                                        player.setting.getItem?.('videomirror')?.value(true);
                                    }
                                },
                            },
                            {
                                text: that.isHotKeyPanelOpened() ? '<span class="active">快捷键说明</span>' : '快捷键说明',
                                click: () => {
                                    if (that.isHotKeyPanelOpened()) {
                                        that.hideHotKeyPanel();
                                    } else {
                                        that.showHotKeyPanel();
                                    }
                                }
                            }
                        ]
                    });
                    const arr: any[] = [];
                    if (!player.user.status().no_share) {
                        arr.push({
                            text: '复制空降地址',
                            click: () => {
                                that.contextmenu.copyLink();
                            },
                        });
                    }
                    if (
                        browser.supportAudioContext &&
                        (!player.flvPlayer || player.flvPlayer.type === 'FlvPlayer')
                    ) {
                        arr.push({
                            // type: 'function',
                            text: '视频音效调节',
                            click: () => {
                                that.player.allPlugins?.startEffect(true);
                            },
                        });
                    }
                    if (!browser.version.trident) {
                        arr.push({
                            // type: 'function',
                            text: '视频色彩调整',
                            click: () => {
                                that.openColor();
                            },
                        });
                    }
                    if (arr.length) {
                        menu.push({
                            type: 'list',
                            menu: arr
                        })
                    }
                    menu = menu.concat(this.defMenu).reverse();
                    menu.unshift({
                        type: 'function',
                        text: that._isVideoInfoPanelOpened()
                            ? '<span class="active">视频统计信息</span>'
                            : '视频统计信息',
                        click: function () {
                            if (that._isVideoInfoPanelOpened()) {
                                that._hideVideoInfoPanel();
                            } else {
                                that._showVideoInfoPanel();
                            }
                        },
                    });
                }
                return menu;
            },
        });
    }
    danmakuCopy(e: any, danmaku: any) {
        if (this.clipboard) {
            this.clipboard.destroy();
            this.clipboard = <any>null;
        }
        const player = this.player;
        this.clipboard = new Clipboard(e[0] || e.currentTarget, {
            text: () => {
                return danmaku.textData.mode > 7 ? '<? 高级弹幕 />' : danmaku.textData.text;
            },
            container: this.player.container[0],
        });
        const that = this;
        this.clipboard.on('success', function (eve: JQuery.Event) {
            const left =
                e.currentTarget?.getBoundingClientRect().x ||
                e.offset().left - that.player.template.playerWrap[0].getBoundingClientRect().x,
                top =
                    e.currentTarget?.getBoundingClientRect().y ||
                    e.offset().top - that.player.template.playerWrap[0].getBoundingClientRect().y;
            that._createClipBoard({
                target: $(that.player.template.playerWrap),
                top,
                left,
                text: '已复制',
            });
        });
        this.clipboard.on('error', function (eve: JQuery.Event) {
            const left =
                e.currentTarget?.getBoundingClientRect().x ||
                e.offset().left - that.player.template.playerWrap[0].getBoundingClientRect().x,
                top =
                    e.currentTarget?.getBoundingClientRect().y ||
                    e.offset().top - that.player.template.playerWrap[0].getBoundingClientRect().y;
            that._createClipBoard({
                target: $(that.player.template.playerWrap),
                top,
                left,
                text: '复制失败',
            });
        });
    }
    hideAllPopupPanel() {
        this.hideHotKeyPanel();
        this.openColor(false);
        this.openAudio(false);
        this._hideVideoInfoPanel();
        // window.GrayManager?.feedback?.hide();
    }
    private openColor(show: boolean = true) {
        if (!this.colorPanel) {
            this.colorPanel = new ColorPanel({
                player: this.player,
                container: this.player.template.playerWrap,
                prefix: this.player.prefix,
            });
        }
        this.colorPanel?.[show ? 'show' : 'hide']();
    }
    openAudio(show: boolean = true) {
        if (show) {
            this.player.allPlugins?.startEffect(true);
        } else {
            this.player.allPlugins?.hideEffect();
        }
    }

    addBlock(data: IBlockListItemInterface) {
        // 124003
        this.player.directiveManager.sender(PD.DB_PUT_BLOCK_ITEM, {
            uhash: data.v, // user hash
        });
        this.player.block.requestBlockAdd(data, false, (raw: any) => {
            if (raw && raw['data'] && raw['data']['id']) {
                // 124004
                this.player.directiveManager.sender(PD.DB_PUT_SYNC_BLOCK_ITEM, {
                    id: raw['data']['id'],
                    s: true,
                    t: 2,
                    v: data.v,
                });
            }
        });
    }
    isHotKeyPanelOpened() {
        return this.player.template.playerWrap.find(`.${this.player.prefix}-hotkey-panel-container`).hasClass('active');
    }

    private hideHotKeyPanel() {
        this.player.template.playerWrap.find(`.${this.player.prefix}-hotkey-panel-container`).removeClass('active');
    }

    private showHotKeyPanel() {
        if (!this.hotkeyPanelInited) {
            this.hotkeyPanelInited = true;
            let itemsHTML = '';
            [
                ['space', '播放/暂停'],
                ['→', '步进5s'],
                ['←', '步退5s'],
                ['↑', '音量增加10%'],
                ['↓', '音量降低10%'],
                ['esc', '退出全屏'],
                ['媒体键 play/pause', '播放/暂停'],
                ['f', '全屏/退出全屏'],
                ['[', '多P 上一个'],
                [']', '多P 下一个'],
                ['enter', '发弹幕'],
                ['D', '开启/关闭弹幕'],
                ['M', '开启/关闭静音']
            ].forEach((item) => {
                itemsHTML += `<div class="${this.player.prefix}-hotkey-panel-item"><span class="${this.player.prefix}-hotkey-panel-key">${item[0]}</span><span class="${this.player.prefix}-hotkey-panel-value">${item[1]}</span></div>`;
            });

            this.player.template.playerWrap.append(`
                <div class="${this.player.prefix}-hotkey-panel-container active">
                    <div class="${this.player.prefix}-hotkey-panel-close">[x]</div>
                        <div class="${this.player.prefix}-hotkey-panel">${itemsHTML}</div>
                </div>
            `);
            this.player.template.playerWrap.find(`.${this.player.prefix}-hotkey-panel-close`).click(() => {
                this.hideHotKeyPanel();
            });
        } else {
            this.player.template.playerWrap.find(`.${this.player.prefix}-hotkey-panel-container`).addClass('active');
        }
    }

    isMineDanmaku(d: any) {
        if (d) {
            const status = this.player.user.status();
            if (d.mid && d.mid === +status.uid!) {
                return true;
            }
            if (d.uid && d.uid === status.hash_id) {
                return true;
            }
        }
        return false;
    }

    danmakuDel(data: ApiDmDelInData) {
        new ApiDmDel(<ApiDmDelInData>data).getData({
            success: (res: ApiDmDelOutData) => {
                if (res?.code === 0) {
                    this.danmaku.remove(data.dmid);
                } else {
                    this._showRecall(res?.message || '删除失败');
                }
            },
            error: (xhr: JQuery.jqXHR<any>) => {
                let text = '';
                if (xhr.status >= 500 && xhr.status < 600) {
                    text = '删除失败，服务器出错';
                } else {
                    text = '删除失败，请检查你的网络';
                }
                this._showRecall(text);
            },
        });
    }
    danmakuRecall(obj: IDanmakuRecallData, type?: string) {
        const data = $.extend(true, {}, obj, {
            jsonp: 'jsonp',
        });
        new ApiRecall(<ApiRecallInData>data).getData({
            success: (res: ApiRecallOutData) => {
                this.player.directiveManager.sender(
                    PD.DL_PUT_RECALL_DANMAKU,
                    {
                        res: res,
                        data: data,
                    },
                    () => { },
                );
                if (res && Number(res.code) === 0) {
                    this.danmaku.remove(data.dmid);
                }
                if (res && (res.code !== undefined || res.message)) {
                    this._showRecall(res.message, type);
                } else {
                    const text = '撤回失败，服务器出错';
                    this._showRecall(text, type);
                }
            },
            error: (xhr: JQuery.jqXHR<any>) => {
                let text = '';
                if (xhr.status >= 500 && xhr.status < 600) {
                    text = '撤回失败，服务器出错';
                } else {
                    text = '撤回失败，请检查你的网络';
                }
                this._showRecall(text, type);
            },
        });
    }

    getVideoDetails() {
        if (this.player.flvPlayer) {
            return VideoInfoData.updateVideoInfoData(
                <any>this.player.flvPlayer['type'],
                <any>this.player.flvPlayer['mediaInfo'],
                <any>this.player.flvPlayer['statisticsInfo'],
            );
        }
        if (this.player.dashPlayer) {
            // dashPlayer mediaInfo
            const infoData = this.player.dashPlayer && this.player.dashPlayer['getVideoInfo']();
            return VideoInfoData.updateVideoInfoData('DashPlayer', infoData['mediaInfo'], infoData['statisticsInfo']);
        }
    }

    private _showVideoInfoPanel() {
        if (this.player.getVideoInfo()) {
            const details = this.getVideoDetails();
            if (details) this.player.getVideoInfo().refresh(details);
            this.player.getVideoInfo().show();
        }
    }
    private _isVideoInfoPanelOpened() {
        if (this.player.getVideoInfo()) {
            return this.player.getVideoInfo().updateStatus;
        } else {
            return false;
        }
    }
    private _hideVideoInfoPanel() {
        if (this.player.getVideoInfo()) {
            this.player.getVideoInfo().hide();
        }
    }
    private _showRecall(text: string, type?: string) {
        if (type && type === 'list') {
            new Tooltip({
                name: 'recall',
                target: this.player.template.auxiliaryArea,
                position: 'center-center',
                text: text,
                padding: [15, 20, 15, 20],
            });
        } else {
            new Tooltip({
                name: 'recall',
                target: this.player.template.playerWrap,
                position: 'center-center',
                text: text,
                padding: [15, 20, 15, 20],
            });
        }
    }

    isNotRepeatReport(dmid: string, list: any[]) {
        if (list && list instanceof Array) {
            if (list.indexOf(dmid) > -1) {
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    private _isProtected(danmaku: any) {
        if (this.list && this.list.dmidApplied[danmaku.textData.dmid]) {
            return true;
        } else {
            return false;
        }
    }

    private _isProtectedDisabled(danmaku: any) {
        if (this.player.user.status().level! < 4) {
            return true;
        } else if (this._isProtected(danmaku)) {
            return true;
        } else {
            return false;
        }
    }

    private _createClipBoard(options: any) {
        new Tooltip({
            target: options.target,
            top: options.top,
            left: options.left,
            position: 'top-left',
            text: options.text,
        });
    }

    private changeMonth(received: IReceivedInterface, callback: Function) {
        const date = received['data']['month'];
        new ApiDateModify(<ApiDateModifyInData>{
            url: `//api.bilibili.com/x/v2/dm/history/index?type=1&oid=${this.player.config.cid}&month=${date}`,
        }).getData({
            success: (data: ApiDateModifyOutData) => {
                callback(data);
            },
            error: (error: any) => {
                callback(error);
            },
        });
    }

    destroy() {
        this.loadDmWorker && this.loadDmWorker.terminate();
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.danmaku.destroy();
        this.loadPb?.destroy();
        this.player.as3Danmaku?.destroy();
    }

    exportColorEffect() {
        if (this.colorPanel) {
            return this.colorPanel.exportEffect();
        }
        return;
    }
    getScreenshot() {
        const devicePR = 2;
        const container = this.config['danmaku_config']['container'];
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        const canvas = document.createElement('canvas');
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.setAttribute('width', width * devicePR + 'px');
        canvas.setAttribute('height', height * devicePR + 'px');
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#00';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const dataUrl = <string>this.player.getPlayerState({ screen: true });
        const img = new Image();
        img.src = dataUrl;

        let w = this.player.video.offsetWidth;
        let h = this.player.video.offsetHeight;

        const vw = this.player.video.videoWidth;
        const vh = this.player.video.videoHeight;

        let x = width - w;
        let y = height - h;
        if (vh / vw > h / w) {
            x += w - (h * vw) / vh;
            w = (h * vw) / vh;
        } else {
            y += h - (w * vh) / vw;
            h = (w * vh) / vw;
        }

        return new Promise((res, rej) => {
            img.onload = () => {
                ctx.drawImage(img, x, y, w * devicePR, h * devicePR);
                const dm = this.danmaku.shot(canvas, width, height);
                res(dm.toDataURL());
                // document.querySelector('#playerWrap').appendChild(dm)
            };
        });
    }
    /**
     * 刷新弹幕列表
     * @param danmaku 新弹幕
     * @param clear 清空已有弹幕
     */
    appendDm(danmaku: IDmData[], clear = true) {
        if (clear) {
            this.clear();
            this.danmaku.danmakuArray.length = 0;
            this.danmaku.timeLine.length = 0;
            this.danmaku.visualArray.length = 0;
            this.loadPb!.allDM = [];
            this.loadPb!.allRawDM = [];
        }
        this.loadPb?.appendDm(danmaku);
        this.player.directiveManager.sender(PD.DL_DANMAKU_UPDATE, {
            danmaku: this.loadPb!.allDM,
            clear
        });
        this.player.trigger(STATE.EVENT.PLAYER_SEND, { dmAllNum: this.loadPb!.allDM.length });
    }
}

export default Danmaku;
