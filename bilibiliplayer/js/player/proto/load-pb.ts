import { IComboCard } from "@jsc/combo";
import { ContentType } from "@jsc/namespace";
import { browser, formatDate } from "@shared/utils";
import { DL_DANMAKU_UPDATE } from "../../const/player-directive";
import ApiDmLikeDetail, { ApiDmLikeDetailOutData } from "../../io/api-dm-like-detail";
import { ApiViewOutData } from "../../io/api-view";
import URLS from "../../io/urls";
import Player from "../../player";
import { IClockIn } from "../../plugins/clock-in";
import { ILinkDM } from "../../plugins/link-dm";
import { IReserve } from "../../plugins/reserve";
import { IScoreDM } from "../../plugins/score-dm";
import { IScoreSummary } from "../../plugins/score-summary";
import Danmaku from "../danmaku";
import { IPoputBodyInterface } from "../popup";
import { PopupBase } from "../popup/popup-base";
import STATE from "../state";
import ProtoBuffer, { ICommandDm, IDmData, IDmReject, IDmResponse, IDMSetting, IDmView } from "./proto-buffer";

export interface IDmLoad {
    [key: string]: {
        load: Promise<any>;
        retry: number;
    };
}

export interface IDmTrack {
    all: number;
    allbas: number;
    view: number;
    dm: number;
    bas: number;
    one: number;
    two: number;
    three: number;
    dmcmd: number;
    dmadv: number;
    dmbas: number;
    loadstart: number;
    loadtime: number;
    dmnum: number;
    dmexposure: number;
    appendtime: number;
    dmdetail: number;
    dmdetailfail: number;
    dmfail: number;
    combofail: number;
    dmviewnull: number;
    fail: string;
    dmarea?: number;
    up?: number;
    down?: number;
    dmSetIO?: any;
}
export interface IDmWebViewReply {
    state?: number; //  弹幕区是否关闭
    text?: string; // sendTip
    textSide?: string; // textSide
    dmSge?: {
        //  分段弹幕配置
        pageSize: number;
        total: number;
    };
    specialDms?: string[]; // 高级弹幕链接地址 （上传到bfs）
    upCheckBox?: boolean;
    count?: number;
    reportFilter?: string[];
}

// 文档：https://info.bilibili.co/pages/viewpage.action?pageId=95154953
// 优先级
// https://www.tapd.bilibili.co/20062561/prong/stories/view/1120062561001659710
export function parseAction(action?: string) {
    const target: any = {};
    if (typeof action === 'string') {
        let list = action.split(';');
        let ele;
        list?.forEach((item: string) => {
            ele = item.split(':');
            if (ele) {
                target[ele[0]] = ele[1];
            }
        });
    }
    return target;
}
const trackArr = ['', 'three', 'two', 'one'];
export const defaultTrack = {
    all: 0,
    allbas: 0,
    view: 0,
    dm: 0,
    bas: 0,
    one: 0,
    two: 0,
    three: 0,
    dmcmd: 0,
    dmadv: 0,
    dmbas: 0,
    loadstart: 0,
    loadtime: 0,
    appendtime: 0,
    dmnum: 0,
    dmexposure: 0,
    dmdetail: 0,
    dmdetailfail: 0,
    dmfail: 0,
    combofail: 0,
    dmviewnull: 0,
    fail: '',
};
const block = {
    // dmSwitch: 'dmSwitch',
    drawType: 'type',
    opacity: 'opacity',
    fontfamily: 'fontfamily',
    bold: 'bold',
    preventshade: 'preventshade',

    fontborder: 'fontborder',
    speedplus: 'speedplus',
    dmask: 'dmask',
    speedsync: 'speedsync',
    fontsize: 'fontsize',

    screensync: 'fullscreensync',
    dmarea: 'danmakuArea',
    blockscroll: 'type_scroll',
    blocktop: 'type_top',
    blockbottom: 'type_bottom',

    blockcolor: 'type_color',
    blockspecial: 'function_special',
    aiSwitch: 'aiblock',
    aiLevel: 'ailevel',
};
const defaultDm = {
    stime: 0,
    mode: 1,
    size: 25,
    color: 16777215,
    date: 0,
    class: 0,
    pool: 0,
    uhash: '',
    uid: '',
    dmid: '',
    text: '',
    weight: 10,
    border: false,
};
export default class LoadPb {
    private protoBuffer: ProtoBuffer;

    private pageSize!: number; // 分段弹幕时间长
    private duration: number;
    private allSegment: IDmLoad = {};
    private allHistory: IDmLoad = {};
    private basSegment: { [key: string]: Promise<any> } = {};
    private dmPbView!: IDmView;
    private userChange!: boolean;
    private fromDmid!: ApiDmLikeDetailOutData;
    private eventsOnce!: boolean; // 因为view接口会多次请求，此标识用来  只绑定一次事件
    private timestamp!: string;
    private basList: any[] = [];
    dmClosed!: boolean; // 是否关闭弹幕功能
    dmTrack: IDmTrack = {
        ...defaultTrack,
    };
    loadPbview: any;
    viewUrl!: string;
    /** 所有弹幕 */
    allDM: IDmData[] = [];
    /** 所有弹幕（原始） */
    allRawDM: IDmData[] = [];

    constructor(private danmaku: Danmaku, private player: Player) {
        this.protoBuffer = new ProtoBuffer();
        this.duration = this.player.video?.duration;
        if (danmaku.config.timestamp) {
            const date = new Date(danmaku.config.timestamp * 1000);
            this.timestamp = formatDate(date, 'yyyy-MM-dd');
        }
        const config = player.config;
        if (config.cid) {
            this.viewUrl = URLS.DM_PB_VIEW + '?type=1&oid=' + config.cid + '&pid=' + (config.aid || 0);
            this.loadDmPbView();
            this.loadByDmid(config.dmid!, config.replyDmid!);
        }
    }
    // 获取弹幕view
    private events() {
        this.player.bind(STATE.EVENT.VIDEO_PROGRESS_UPDATE, (e: JQuery.Event, obj: any) => {
            if (this.timestamp) return;

            this.getDmFromTime(obj.currentTime);
        });
    }
    // 根据dmid获取弹幕
    private loadByDmid(dmid?: string, replyDmid?: string) {
        if (dmid) {
            new ApiDmLikeDetail({ oid: this.player.config.cid, dmid }).getData({
                success: (res: ApiDmLikeDetailOutData) => {
                    this.dmTrack.dmdetail++;
                    if (res.dmid) {
                        this.fromDmid = res;
                        this.danmaku.remove(res.dmid);
                        const data = {
                            ...defaultDm,
                            ...res,
                        };
                        data.attr = (res.attr! > 0 ? res.attr! : 0) & 4 ? 2 : -1;
                        if (data.attr === 2 && browser.version.msie) {
                            data.attr = -1;
                        }
                        if (replyDmid) {
                            data.likes = <any>null;
                        }
                        if (this.player.config.fjw) {
                            data.border = true;
                            data.likes = <any>null;
                        }
                        // this.danmaku.add(data);
                        if (this.player.currentTime()! > res.stime + 1) {
                            this.danmaku.danmaku?.addTimely({
                                ...data,
                                stime: -1,
                            });
                        } else {
                            this.danmaku.danmaku?.add(data);
                            if (!this.player.config.fjw) {
                                this.player.seek(data.stime - 0.2);
                            }
                        }
                    } else {
                        this.player.trigger(STATE.EVENT.DMID_LOAD_ERR, {
                            dmid,
                        });
                    }
                },
                error: (err: any) => {
                    this.dmTrack.dmdetailfail++;
                    // new Tooltip({
                    //     text: err?.message || '获取弹幕信息失败',
                    //     name: 'send',
                    //     target: this.player.template.playerWrap,
                    //     position: 'center-center',
                    //     padding: [15, 20, 15, 20],
                    // });
                    this.player.trigger(STATE.EVENT.DMID_LOAD_ERR, {
                        dmid,
                    });
                },
            });
        }
    }
    // 获取弹幕view
    private loadDmPbView() {
        // https://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3%EF%BC%88%E6%96%B0%EF%BC%89-web%E5%BC%B9%E5%B9%95%E7%BD%91%E5%85%B3%E6%8E%A5%E5%8F%A3
        this.loadPbview = new Promise((resolve) => {
            this.player.userLoadedCallback(({ login }) => {
                this.protoBuffer
                    .loadDmPb(this.viewUrl, true, 'DmWebViewReply')
                    .then(({ data }) => {
                        data = data || {};

                        this.danmaku.setSendStatus(data.state || 0, data.text || '', data.checkBox && login);
                        this.danmaku.sendDanmakuState(data.state, data.textSide);
                        this.appendPopup(data.commandDms);
                        if (this.userChange) {
                            return;
                        }
                        this.dmTrack.loadstart = performance.now() - this.player.initStart;
                        this.viewLoaded(data);
                        resolve('');
                    })
                    .catch(() => {
                        if (this.userChange) {
                            return;
                        }
                        // 失败直接拉取弹幕
                        this.viewLoaded();
                        this.dmTrack.view += 1;
                        this.player.trigger(STATE.EVENT.VIDEO_DANMAKU_LOADED, false, this.viewUrl);
                        resolve('');
                    });
            });
        });
    }
    // view接口成功后执行的相关操作
    private viewLoaded(data: IDmView = {} as any) {
        this.userChange = true;
        this.dmPbView = data;
        // this.player.block.reportFilter = data.reportFilter;
        this.pageSize = data.dmSge ? data.dmSge.pageSize / 1000 : 360;
        if (data.state === 1) {
            // 服务端设置最高级，覆盖所有传参
            this.dmClosed = true;
            data.count = 0;
        }
        // 此处弹幕数是错误的
        // this.player.trigger(STATE.EVENT.PLAYER_SEND, { dmAllNum: data.count || 0 });
        // 更新弹幕设置信息
        const login = this.player.user.status().login;
        this.setLocal(data.dmSetting, login!);

        this.appendDmImg(data.commandDms);
        // 弹幕关闭 不去加载弹幕
        if (this.dmClosed || this.eventsOnce) {
            return;
        }
        if (this.timestamp) {
            this.historyPb(this.timestamp);
        } else {
            this.firstPb(1);
        }
        if (Array.isArray(data.specialDms)) {
            this.loadBasPb(data.specialDms);
        }
        this.events();
        this.eventsOnce = true;
    }
    // 外部设置弹幕开启关闭，播放器更新数据
    loadViewSend() {
        this.protoBuffer
            .loadDmPb(this.viewUrl, true, 'DmWebViewReply')
            .then(({ data }) => {
                if (!data) {
                    this.dmTrack.dmviewnull++;
                    return;
                }

                this.player.send.updateStatus(data.state || 0, data.text || '');
                this.danmaku.sendDanmakuState(data.state, data.textSide, true);

                this.viewLoaded(data);
            })
            .catch(() => {
                this.dmTrack.dmfail++;
            });
    }
    // 获取历史弹幕
    historyPb(date: string) {
        this.timestamp = date;
        // this.allDM = [];
        this.allDM = [...this.basList];
        const url = `${URLS.DM_PB_HISTORY}?type=1&oid=${this.player.config.cid}&date=${date}`;
        this.allHistory[date] = this.allHistory[date] || {
            load: this.protoBuffer.loadDmPb(url),
            retry: 1,
        };
        this.allHistory[date].load.then(({ data }) => {
            this.appendDm(data?.elems);
            this.player.trigger(STATE.EVENT.PLAYER_SEND, { dmAllNum: this.allDM.length });
        });
        return this.allHistory[date].load;
    }
    // 获取弹幕
    private firstPb(index: number) {
        this.retryLoad(index)
            .then(() => {
                if (this.player.getState() === 'PLAYING') {
                    this.danmaku.play();
                }
            })
            .catch((err: any) => {
                console.log(err);
            });
    }
    // 获取bas弹幕
    private loadBasPb(list: string[]) {
        let url = '';
        for (let i = 0; i < list.length; i++) {
            if (!list[i]) {
                continue;
            }
            url = list[i].replace('http://', '//');

            if (!this.basSegment[url]) {
                this.dmTrack.allbas++;
                this.basSegment[url] = this.protoBuffer
                    .loadDmPb(url, false)
                    .then((res: IDmResponse) => {
                        this.appendDm(res.data?.elems);
                    })
                    .catch(() => {
                        this.dmTrack.bas++;
                    });
            }
        }
    }
    // 获取弹幕
    private loadDmPb(segment = 1) {
        // @ts-ignore
        this.allSegment[segment] = this.allSegment[segment] || {
            load: null,
            retry: 4,
        };
        if ((<any>this).allSegment[segment].load) {
            return this.allSegment[segment];
        }
        const player = this.player;
        const config = player.config;
        player.trigger(STATE.EVENT.VIDEO_DANMAKU_LOAD);

        const url = `${URLS.DM_PB}?type=1&oid=${config.cid}&pid=${config.aid}&segment_index=${segment}`;
        this.dmTrack.all++;
        // https://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3%EF%BC%88%E6%96%B0%EF%BC%89-%E5%88%86%E6%AE%B5%E5%BC%B9%E5%B9%95%E5%88%97%E8%A1%A8(%E6%96%B0)
        this.allSegment[segment].load = this.protoBuffer
            .loadDmPb(url)
            .then(({ data, loadTime }) => {
                if (this.timestamp) return;

                const addTime = performance.now();

                this.appendDm(data?.elems);

                this.dmTrack.appendtime += performance.now() - addTime;
                this.dmTrack.loadtime += loadTime;
                this.dmTrack.dmnum += data?.elems?.length || 0;

                const times = <keyof IDmTrack>trackArr[this.allSegment[segment].retry];
                if (times) {
                    this.dmTrack[times]++;
                }
                player.trigger(STATE.EVENT.VIDEO_DANMAKU_LOADED, true, url);

                return data.elems || [];
            })
            .catch((error: IDmReject) => {
                this.dmTrack.fail += `${segment},`;
                this.player.trigger(STATE.EVENT.VIDEO_DANMAKU_LOADED, false, url);
                if (error?.msg) {
                    return Promise.reject();
                }
            });
        return this.allSegment[segment];
    }
    private parseCmd(dm: IDmData) {
        return {
            stime: dm.progress / 1000 || 0,
            // mode: 6,
            mode: +dm.mode || 1,
            size: dm.fontsize || 25,
            color: dm.color || 0,
            date: dm.ctime || 0,
            class: dm.pool || 0,
            pool: dm.pool || 0,
            uhash: dm.midHash || '',
            uid: dm.midHash || '',
            dmid: dm.idStr || '',
            text: (dm.content && dm.mode != 8 && dm.mode != 9) ? dm.content.replace(/(\/n|\\n|\n|\r\n)/g, '\n') : dm.content, // 正确处理弹幕换行
            weight: dm.weight,
            attr: dm.attr,
        };
    }
    // 把弹幕添加进弹幕模块
    appendDm(danmakuArray: IDmData[]) {
        if (!Array.isArray(danmakuArray)) return;

        this.allRawDM = this.allRawDM.concat(danmakuArray);

        let target: any;
        let action: any;
        let basList: any[] = [];
        let dmList: any[] = [];
        let dmPk: any[] = [];
        let dmBoom: any[] = [];
        let item: IDmData;

        for (let i = 0; i < danmakuArray.length; i++) {
            item = danmakuArray[i];

            item.attr = (item.attr! > 0 ? item.attr! : 0) & 4 ? 2 : -1;
            if (item.attr === 2 && (browser.version.msie || !this.player.videoSettings.setting_config.danmakuplugins)) {
                item.attr = -1;
            }
            // if (Math.random() > 0.7) {
            //     item.attr = 2;
            // }
            // item.action =
            //         'animation:2?zip0=pre-s1.hdslb.com/bfs/static/player/tools/animate.zip&png1=uat-i0.hdslb.com/bfs/dm/ce3da107beb627d91923bc8348c4376ec7baeae3.png&png0=uat-i0.hdslb.com/bfs/dm/fb55981fea659aaeb826ca7e3ba34633c8604092.png&png2=pre-s1.hdslb.com/bfs/static/player/tools/tail.png&font_color=#fff5d0&font_effect=1&msg_order=1';
            // item.action =
            //         'animation:4?zip0=uat-i0.hdslb.com/bfs/dm/a40bb193db835381f18aca74608475be30a392a3.zip&font_color=#fffde9&font_stroke_color=#bc7f08';
            action = parseAction(item.action);
            target = this.parseCmd(item);
            // if (Math.random() > 0.9) {
            //     action.picture = `pre-i2.hdslb.com/bfs/face/d43a7b27c14418d27334a996080d569c550a9b02.jpg@72w_72h_1c.webp?`;
            //     // action.picture = `pre-i2.hdslb.com/bfs/face/d43a7b27c14418d27334a996080d569c550a9b02.jpg@72w_72h_1c.webp?scale=${Math.random() * 5}`;
            // }
            // if (Math.random() > 0.9) {
            //     action.headicon = 'pre-i2.hdslb.com/bfs/face/d43a7b27c14418d27334a996080d569c550a9b02.jpg@72w_72h_1c.webp?';
            // }
            // if (Math.random() > 0.9) {
            //     action.tailicon = 'pre-i2.hdslb.com/bfs/face/d43a7b27c14418d27334a996080d569c550a9b02.jpg@72w_72h_1c.webp?';
            // }
            // if (Math.random() > 0.9) {
            //     action.upEgg =
            //         'upEgg:1?animation=0&delay=60&resource=http%3A%2F%2Fuat-i0.hdslb.com%2Fbfs%2Fdm%2Fgif_frames%2Fgif_frames_1621924144.zip&resource_type=2&text_img=';
            // }

            const actions = this.player.send.dmActions(action);
            for (const key in actions) {
                target[key] = actions[key];
            }
            if (target.animation) {
                const type = target.animation.type;
                switch (type) {
                    case 1:
                    case 2:
                    case 4:
                        dmBoom.push(target);
                        break;
                    case 3:
                        dmPk.push(target);
                        break;
                    default:
                        break;
                }
                this.allDM.push(target);
                continue;
            }

            if (target.text?.replace(/\r/g, '')) {
                switch (target.mode) {
                    case 7:
                        target.weight = 11;
                        this.player.advDanmaku?.addDanmaku({
                            ...target,
                            stime: item.progress || 0,
                        });
                        this.dmTrack.dmadv++;
                        break;
                    case 9:
                        target.weight = 11;
                        basList.push(target);
                        // 给选择历史弹幕的时候使用
                        this.basList.push(target);
                        break;
                    default:
                        if (this.fromDmid?.dmid && this.fromDmid.dmid === target.dmid) {
                            continue;
                        }
                        // 未打分弹幕给个随机的负分
                        if (!target.weight) {
                            target.weight = -Math.round(Math.random() * 10);
                        }
                        dmList.push(target);
                        // dmList.push({...target});
                        break;
                }
                this.allDM.push(target);
            }
        }
        this.danmaku.danmaku?.multipleAdd(dmList);
        if (basList.length) {
            this.appendDmBas(basList);
            this.dmTrack.dmbas += basList.length;
        }
        if (dmBoom.length) {
            this.player.allPlugins?.startBoom(dmBoom);
        }

        // 当view接口取不到总弹幕数，还是根据分段弹幕显示
        if (typeof this.dmPbView?.count !== 'number') {
            this.player.trigger(STATE.EVENT.PLAYER_SEND, { dmAllNum: this.allDM.length });
        }
        // test upEgg
        // for (let i = 0; i < 7; i++) {
        //     this.player.send.dmActions({
        //         // upEgg: `upEgg:2?animation=${i}&delay=60&resource=http://uat-i0.hdslb.com/bfs/dm/17355c45de9fc329343e6205913d6a0440f385d1.png&resource_type=&text_img=http://uat-i0.hdslb.com/bfs/dm/3a4f7b4841a871cde0801e27af7243814519a298.png`
        //         upEgg: `upEgg:1?animation=${i}&delay=80&resource=http://uat-i0.hdslb.com/bfs/dm/gif_frames/gif_frames_1623408921.zip&resource_type=2&text_img=http://uat-i0.hdslb.com/bfs/dm/3a4f7b4841a871cde0801e27af7243814519a298.png&delays=[5,50,5,5,5,5,5,5,50,5,5,5,5,5,5,5,5]`
        //     }, i * 7);
        // }

        this.danmaku.danmaku.sortDmById(<any>this.allDM);
    }
    private appendDmBas(danmakuArray: any[]) {
        this.player.basDanmaku?.add({
            dm: danmakuArray,
        });
    }
    // 添加引导关注相关按钮
    appendPopup(danmakuArray: ICommandDm[]) {
        if (this.player.config.type === ContentType.Editor) {
            return;
        }
        if (!Array.isArray(danmakuArray)) return;

        if (!this.player.get('setting_config', 'danmakuplugins')) return;

        let attentions: IPoputBodyInterface[] = [];
        let dm: ICommandDm;
        let extra;
        this.player.globalFunction.getVideoinfo((data: ApiViewOutData) => {
            const owner = data?.owner;
            let scoreList: IScoreDM[] = [];
            let scoreSummaryList: IScoreSummary[] = [];
            let clockInList: IClockIn[] = [];
            for (let i = 0; i < danmakuArray.length; i++) {
                dm = danmakuArray[i];
                try {
                    extra = JSON.parse(dm.extra);
                } catch (error) {
                    continue;
                }
                const stime = dm.progress / 1000 || 0;
                switch (dm.command) {
                    case '#ATTENTION#':
                        if (extra || owner?.mid) {
                            attentions.push({
                                type: extra.type || 0,
                                mid: owner.mid,
                                dmid: dm.idStr,
                                from: stime || 0,
                                to: stime + (extra.duration / 1000 || 5),
                                pos_x: extra.posX || 0,
                                pos_y: extra.posY || 0,
                            });
                        }
                        break;
                    case '#ACTORFOLLOW#':
                    case '#MANAGERFOLLOW#':
                        if (extra) {
                            const card = {
                                type: 7,
                                face: extra.face,
                                mid: extra.mid,
                                from: stime || 0,
                                dmid: dm.idStr,
                                to: stime + (extra.duration / 1000 || 5),
                                pos_x: extra.posX || 0,
                                pos_y: extra.posY || 0,
                            };
                            if (dm.command === '#ACTORFOLLOW#') {
                                card.type = 6;
                            }
                            attentions.push(card);
                        }
                        break;
                    case '#VOTE#':
                        if (extra.options?.length) {
                            attentions.push({
                                dmid: dm.idStr,
                                voteId: extra.vote_id,
                                options: extra.options,
                                type: 9,
                                question: extra.question,
                                myVote: extra.my_vote,
                                duration: extra.duration / 1000 || 5,
                                mid: extra.mid,
                                from: stime || 0,
                                to: stime + (extra.duration / 1000 || 5),
                                pos_x: extra.posX || 0,
                                pos_y: extra.posY || 0,
                            });
                        }
                        break;
                    case '#GRADE#':
                        try {
                            extra = JSON.parse(dm.extra);
                            const from = dm.progress / 1000 || 0;
                            scoreList.push({
                                from,
                                to: from + (extra.duration / 1000 || 5),
                                dmid: dm.idStr || '',
                                posY: extra.posY || 0,
                                posX: extra.posX || 0,
                                msg: extra.msg,
                                skin: extra.skin || 0,
                                skinUnselected: extra.skin_unselected,
                                skinSelected: extra.skin_selected,
                                skinFontColor: extra.skin_font_color,
                                gradeId: extra.grade_id || 0,
                                midScore: extra.mid_score,
                                count: extra.count || 0,
                                avgScore: extra.avg_score || 0,
                            });
                        } catch (error) {
                            console.warn(error);
                        }
                        break;
                    case '#GRADESUMMARY#':
                        try {
                            extra = JSON.parse(dm.extra);
                            const from = dm.progress / 1000 || 0;
                            scoreSummaryList.push({
                                from,
                                to: from + (extra.duration / 1000 || 5),
                                dmid: dm.idStr || '',
                                posY: extra.posY || 0,
                                posX: extra.posX || 0,
                                msg: extra.msg,
                                summaryList: extra.grades,
                            });
                        } catch (error) {
                            console.warn(error);
                        }
                        break;
                    case '#CHECKIN#':
                        try {
                            extra = JSON.parse(dm.extra);
                            const from = dm.progress / 1000 || 0;
                            let startCard: IClockIn = {
                                from,
                                to: from + (extra.duration / 1000 || 5),
                                dmid: dm.idStr || '',
                                posY: extra.posY || 0,
                                posX: extra.posX || 0,
                                msg: extra.msg,
                                seriesId: extra.checkin_series_id,
                                checkInId: extra.checkin_id,
                                total: extra.total,
                                userOverNumber: extra.user_over_number,
                                userCompleted: extra.user_completed,
                                joinPeople: extra.join_people,
                                type: extra.type,
                                jumpUrl: extra.jump_url,
                                userChecked: extra.user_checked,
                                userCheckInDate: extra.user_checkin_date,
                            };
                            extra.end_progress /= 1000;
                            // 接口只给了一份数据包含打卡开始和结束，需要根据end_progress、end_posX、penPosY补一份结束卡片
                            const endCard = Object.assign({}, startCard, {
                                from: extra.end_progress,
                                to: extra.end_progress + (extra.duration / 1000 || 5),
                                posX: extra.end_posX,
                                posY: extra.end_posY,
                                endClock: true,
                            });
                            clockInList.push(startCard, endCard);
                        } catch (error) {
                            console.warn(error);
                        }
                        break;
                    default:
                        break;
                }
                // 更新互动弹幕缩小态初识化状态
                PopupBase.initShrinkState(dm.command, extra);
            }
            // 更新引导关注数据
            if (
                attentions.length &&
                !this.player.interactive &&
                this.player.duration(this.player.video, true)! >= 30 &&
                this.player.popup
            ) {
                this.player.popup?.updateMid(owner?.mid);
                this.player.popup?.update(attentions);
            }
            // 更新评分弹幕
            if (scoreList.length) {
                this.player.allPlugins?.startScoreDM(scoreList);
            }

            // 更新评分弹幕
            if (scoreSummaryList.length) {
                this.player.allPlugins?.startScoreSummary(scoreSummaryList);
            }
            // 更新打卡数据弹幕
            if (clockInList.length) {
                this.player.allPlugins?.startClockIn(clockInList);
            }
        });
    }
    // 添加弹幕头像
    appendDmImg(danmakuArray: ICommandDm[]) {
        if (this.player.config.type === ContentType.Editor) {
            return;
        }

        if (!Array.isArray(danmakuArray)) return;

        if (!this.player.get('setting_config', 'danmakuplugins')) return;

        this.dmTrack.dmnum += danmakuArray.length;
        this.dmTrack.dmcmd = danmakuArray.length;
        let i = 0;
        let dm: ICommandDm;
        let extra;
        let dmList: any[] = [];
        let linkList: ILinkDM[] = [];
        let reserveList: IReserve[] = [];
        let comboNew: IComboCard[] = [];

        if (this.dmClosed) {
            return;
        }

        try {
            for (i = 0; i < danmakuArray.length; i++) {
                dm = danmakuArray[i];
                extra = JSON.parse(dm.extra);
                switch (dm.command) {
                    case '#ACTOR#':
                        if (extra?.user?.face) {
                            dmList.push(
                                this.parseDm(dm, {
                                    flag: extra.user.officialType,
                                    headImg: extra.user.face.replace('http://', '//'),
                                }),
                            );
                        }
                        break;
                    case '#ACTIVITYCOMBO#':
                        try {
                            const combo = parseComboNew(dm, JSON.parse(dm.extra));
                            if (combo) {
                                if (combo.type === 100) {
                                    combo.stime = 0;
                                    combo.duration = this.player.duration()! * 1000;
                                    this.danmaku.closeCommon();
                                }
                                comboNew.push(combo);
                            }
                        } catch (error) {
                            console.warn(error);
                        }
                        break;
                    case '#LINK#':
                        try {
                            extra = JSON.parse(dm.extra);
                            const from = dm.progress / 1000 || 0;
                            linkList.push({
                                from,
                                to: from + 5,
                                dmid: dm.idStr || '',
                                aid: extra.aid,
                                bvid: extra.bvid,
                                epid: extra.epid,
                                text: dm.content,
                                pic: extra.arc_pic + '@180w_100h_1c.jpg',
                                duration: extra.arc_duration,
                                posY: extra.posY || 0,
                                posX: extra.posX || 0,
                            });
                        } catch (error) {
                            console.warn(error);
                        }

                        break;
                    case '#RESERVE#':
                        try {
                            extra = JSON.parse(dm.extra);
                            const from = dm.progress / 1000 || 0;
                            reserveList.push({
                                from,
                                to: from + (extra.duration / 1000 || 5),
                                duration: extra.duration / 1000 || 5,
                                dmid: dm.idStr || '',
                                text: dm.content,
                                reserveId: extra.reserve_id,
                                jump: extra.jump_url,
                                posY: extra.posY,
                                posX: extra.posX,
                                count: extra.reserve_count || 0,
                                userState: extra.user_state,
                                state: extra.reserve_state,
                                mid: extra.mid || 0,

                                live: extra.reserve_type === 2,
                                liveTime: extra.live_stime * 1000 || 0,
                                liveTimeFormat: extra.live_stime_format || 0,
                                popularity: extra.live_popularity_count || 0,
                                liveState: extra.live_state || 0,
                                liveLottery: extra.live_lottery,
                                arcTime: extra.arc_stime * 1000 || 0,
                                arcTimeFormat: extra.arc_stime_format || 0,
                                desc: extra.desc,
                                cooperationTime: extra.cooperation_stime * 1000,
                                cooperationTimeFormat: extra.cooperation_stime_format,
                            });
                        } catch (error) {
                            console.warn(error);
                        }
                        break;
                    default:
                        break;
                }
                // 更新互动弹幕缩小态初识化状态
                PopupBase.initShrinkState(dm.command, extra);
            }
            if (dmList?.length) {
                this.danmaku.danmaku?.multipleAdd(dmList);
                dmList = [];
            }
            if (linkList.length) {
                this.player.allPlugins?.startLink(linkList);
            }
            if (reserveList.length) {
                this.player.allPlugins?.startReserve(reserveList);
            }
            if (comboNew?.length) {
                this.player.allPlugins?.startCombo(comboNew);
                comboNew = [];
            }
        } catch (error) { }

        this.player.globalFunction.getUpImg().then((url: string) => {
            for (i = 0; i < danmakuArray.length; i++) {
                dm = danmakuArray[i];
                switch (dm.command) {
                    case '#UP#':
                        dmList.push(
                            this.parseDm(dm, {
                                mid: dm.mid,
                                flag: -2,
                            }),
                        );
                        break;
                    default:
                        break;
                }
            }
            this.danmaku.danmaku?.multipleAdd(dmList);
            dmList = [];
        });
    }
    //
    /**
     *添加实时弹幕
     */
    private parseDm(dm: any, opt: any) {
        return {
            stime: dm.progress / 1000 || 0,
            mode: 1,
            size: 25,
            color: 16777215,
            date: 0,
            class: 0,
            pool: 0,
            uhash: '',
            uid: '',
            mid: dm.mid,
            dmid: dm.idStr || '',
            text: (dm.content && dm.mode != 8 && dm.mode != 9) ? dm.content.replace(/(\/n|\\n|\n|\r\n)/g, '\n') : dm.content, // 正确处理弹幕换行
            weight: 10,
            ...opt,
        };
    }
    // 添加实时弹幕
    add(dm: any) {
        let segment = Math.floor((dm.stime || 0) / this.pageSize) + 1;
        if (dm.stime === -1) {
            segment = segment || 1;
        }
        if (this.allSegment[segment]) {
            if (!(dm.headImg || dm.flag === -2)) {
                this.allDM.push(dm);
            }
            return false;
        }
        return true;
    }

    // 提前5s加载弹幕、seek时根据时间取弹幕
    private getDmFromTime(time: number) {
        if (!this.duration) {
            this.duration = this.player.video.duration;
        }
        if (time < 0) {
            time = 0;
        }
        if (time - this.duration > -1 || !this.pageSize || time < 1) {
            return;
        }
        if (time < 0) {
            time = 0;
        }

        let segment = Math.floor(time / this.pageSize) + 1;
        if (!segment) {
            return;
        }
        if (this.allSegment[segment]) {
            if (time % this.pageSize > this.pageSize - 5) {
                this.getDmFromTime(time + 10);
            }
        } else {
            this.retryLoad(segment);
        }
    }
    // 右侧获取所有弹幕
    loadDmPbAll(retry = false) {
        if (this.dmClosed) {
            return new Promise((resolve) => {
                resolve('');
            });
        }
        if (this.timestamp) {
            if (this.allSegment[this.timestamp]) {
                return this.allSegment[this.timestamp].load;
            }
            return this.historyPb(this.timestamp);
        }
        if (retry) {
            // 失败重试使用
            this.allSegment = {};
        }
        let segment = this.duration / this.pageSize + 1;
        if (!segment) {
            return Promise.reject();
        }
        const promiseList: any = [];
        let succeedSegment = 0;
        return new Promise((resolve, reject) => {
            for (let i = 1; i < segment; i++) {
                promiseList.push(this.load(i).then(d => {
                    this.player.template.danmakuMask.html(`载入弹幕数据(${++succeedSegment}/${Math.floor(segment)})`);
                    return d;
                }));
            }
            for (const bas in this.basSegment) {
                promiseList.push(this.basSegment[bas]);
            }
            Promise.all(promiseList)
                .then((r) => {
                    let allDM: any[] = [];
                    r.forEach((function (e) {
                        9 != e[0]?.mode && (allDM = allDM.concat(e));
                    }));
                    this.allHistory[0] = {
                        load: Promise.resolve({ data: { elems: allDM } }),
                        retry: 4
                    };
                    resolve('');
                    this.player.trigger(STATE.EVENT.PLAYER_SEND, { dmAllNum: this.allDM.length });
                })
                .catch(() => {
                    reject();
                });
        });
    }
    private load(i: number) {
        return new Promise((resolve) => {
            let load;
            if (this.allSegment[i]?.retry < 1) {
                load = this.allSegment[i].load;
            } else {
                load = this.retryLoad(i);
            }
            load.then(resolve);
        });
    }
    private retryLoad(i: number): any {
        return this.loadDmPb(i).load.catch(() => {
            this.allSegment[i].retry--;

            if (this.allSegment[i].retry < 1) {
                this.dmTrack.dm++;
                this.allSegment[i].load = Promise.resolve();
                return this.allSegment[i].load;
            }

            delete (<any>this).allSegment[i].load;
            return this.retryLoad(i);
        });
    }
    // 弹幕设置 存本地
    private setLocal(dmSetting: IDMSetting, login: boolean) {
        const firstDensity = this.player.get('setting_config', 'firstDensity');
        let dmOpened = dmSetting ? Boolean(dmSetting.dmSwitch) : this.player.state.danmaku;
        let set;
        if (this.player.config.fjw) {
            dmOpened = true;
            set = this.fjwSet();
        }
        if ((dmSetting && login) || set) {
            const setting = {
                dmSwitch: false,
                aiSwitch: false,
                aiLevel: 3,
                blocktop: false,
                blockscroll: false,

                blockbottom: false,
                blockcolor: false,
                blockspecial: false,
                preventshade: false,
                dmask: false,

                opacity: 0,
                dmarea: 0,
                speedplus: 1,
                fontsize: 1,
                screensync: false,

                speedsync: false,
                fontfamily: '',
                bold: false,
                fontborder: '0',
                drawType: '',
                ...<any>dmSetting,
                ...set,
            };
            delete setting.fontfamily;
            delete setting.bold;
            delete setting.drawType;
            setting.fontborder += '';
            const obj: Record<string, any> = {};

            for (const key in setting) {
                if (block[<'bold'>key]) {
                    obj[block[<'bold'>key]] = setting[key];
                }
            }
            if (!firstDensity) {
                obj['density'] = false;
            }
            if (this.dmClosed || !this.player.config.danmaku) {
                dmOpened = false;
            } else {
                if (this.player.config.dmid) {
                    dmOpened = true;
                }
            }

            this.player.set('setting_config', 'danmakuArea', setting.dmarea);
            this.player.settingPanel?.set(obj);
        } else {
            if (!firstDensity) {
                this.player.settingPanel?.set({
                    density: false,
                });
            }
        }
        this.player.set('setting_config', 'firstDensity', true);
        // this.player.send.dmSwitchState(dmOpened);
        // this.player.send.dmSwitchEnable(!this.dmClosed);
    }

    /**
     * 风纪委 定制弹幕 设置
     */
    private fjwSet() {
        return {
            dmSwitch: true,
            aiSwitch: true,
            aiLevel: 3,
            blocktop: true,
            blockscroll: true,

            blockbottom: true,
            blockcolor: true,
            blockspecial: true,
            preventshade: false,
            dmask: false,

            opacity: 1,
            dmarea: 50,
            speedplus: 1,
            fontsize: 1,
            screensync: false,

            speedsync: false,
            bold: false,
            fontborder: '0',
        };
    }

    destroy() {
        this.timestamp = <any>null;
        this.basSegment = {};
        this.allSegment = {};
        this.allDM = [];
        this.allRawDM = [];
        this.protoBuffer?.destroy();
    }
}
export function parseComboNew(dm: ICommandDm, extra: any): IComboCard {
    return {
        id: dm.idStr || '',
        text: dm.content || '',
        stime: dm.progress || 0,
        count: extra.comboCount || 1,
        step: [
            Number(extra.animationCountOne) || 50,
            Number(extra.animationCountTwo) || 500,
            Number(extra.animationCountThree) || 2000,
        ],
        type: +extra.activityType,
        duration: extra.duration || 10000,
        url: extra.resource,
        data: <any>null,
    };
}
