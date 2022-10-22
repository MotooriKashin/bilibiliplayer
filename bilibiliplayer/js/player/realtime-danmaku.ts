import Broadcast from '@jsc/websocket-broadcast';
import protobuf from 'protobufjs';
import STATE from './state';
import Player from '../player';
import { logger } from '../plugins/internal-logger';
import RealDmPB from '../const/real-dm.json';
import ApiBroadcastModify, { ApiBroadcastModifyInData, ApiBroadcastModifyOutData } from '../io/api-broadcast';
import BSocket from './bsocket/light';
import ApiOnlineNum, { ApiOnlineNumOutData } from '../io/api-online-num';

export interface IDanmakuData {
    stime: number;
    mode: number;
    size: number;
    color: number;
    date: number;
    class: number;
    uid: string | number;
    dmid: string;
    text: string;
    mid?: number;
    weight?: number;
    rnd?: string;
    uname?: string;
    headImg?: string;
    flag?: number;
}
export interface IRealDanmakuData {
    progress: number;
    mode: number;
    fontsize: number;
    color: number;
    ctime: number;
    class: number;
    midHash: string | number;
    idStr: string;
    content: string;
    pool: number;
}
class RealTimeDanmaku {
    private player: Player;
    broadcast!: Broadcast;
    bsocket!: BSocket;
    socketKey!: string;
    realdmPath: string = 'bilibili.broadcast.message.main.DanmukuEvent';
    livePath: string = 'bilibili.broadcast.message.ogv.CMDBody';
    getOnlineTimer: any;
    getOnlineTime: number = 1000 * 30;
    mode: number; // 1全量切换新实时弹幕,人数和实时弹幕都用新实时弹幕服务.2新地址仅用于展示在线人数.
    defaultPort: number = 7826;
    delayAddRealTimer: any;
    first: boolean = false;

    constructor(player: Player, mode?: number) {
        this.player = player;
        this.mode = mode || 1;
        this.getSevers();
        this.globalEvents();
    }
    globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.broadcast && this.broadcast.destroy();
            this.bsocket?.dispose();
            clearTimeout(this.getOnlineTimer);
            clearTimeout(this.delayAddRealTimer);
        });
        this.player.bind(STATE.EVENT.PLAYER_RELOAD, () => {
            this.broadcast && this.broadcast.destroy();
            this.bsocket?.dispose();
            clearTimeout(this.getOnlineTimer);
            clearTimeout(this.delayAddRealTimer);
        });
    }
    //获取url
    getSevers() {
        new ApiBroadcastModify(<ApiBroadcastModifyInData>{
            platform: 'web',
        }).getData({
            success: (data: ApiBroadcastModifyOutData) => {
                this.sendBroadcast(data);
            },
            error: () => { },
        });
    }
    // 开启websoket
    sendBroadcast(data: ApiBroadcastModifyOutData) {
        const player = this.player;
        const protocol = player.window.location.protocol === 'https:' ? 'wss' : 'ws';
        const url = `${protocol}://${data.data.domain}:${data.data.wss_port_v2 || this.defaultPort}/sub?platform=web`;

        // pb
        this.socketKey = `video://${player.config.aid}/${player.config.cid}`;
        if (player.config.seasonId) {
            this.socketKey += `?sid=${player.config.seasonId}&epid=${player.config.episodeId}`;
        }
        const subscribe = [
            {
                json: JSON.stringify(RealDmPB),
                path: [
                    {
                        typeUrl: this.realdmPath,
                        targetPath: this.realdmPath,
                    },
                ],
            },
        ];
        const room: any = [];
        if (this.player.getState() === 'PLAYING') {
            room.push({
                id: this.socketKey,
                event: 'join',
            });
            this.first = true;
        }
        this.bsocket = new BSocket({
            url,
            protobuf,
            subscribe,
            room,
        });
        this.bsocket.on(BSocket.EVENTS.B_MSG, (data: any) => {
            switch (data.id) {
                case this.socketKey:
                    this.addDanmaku(data.data.elems);
                    break;
                case this.livePath:
                    // 首播停播
                    if (data.emergency) {
                        typeof player.window['stopPremiere'] === 'function' && player.window['stopPremiere']();
                    }
                    break;
                default:
                    break;
            }
        });
        this.bsocket.on(BSocket.EVENTS.B_ROOM, (data: any) => {
            switch (data.id) {
                case this.socketKey:
                    if (data.online) {
                        this.updateNumber(data);
                    }
                    break;
                default:
                    break;
            }
        });
        this.getOnline();
        this.bsocket.on(BSocket.EVENTS.B_CLOSE, (data: any) => {
            clearTimeout(this.getOnlineTimer);
        });
    }
    join() {
        if (this.first || !this.bsocket) {
            return;
        }
        this.first = true;
        this.bsocket.room({
            id: this.socketKey,
            event: 'join',
        });
    }
    getOnline() {
        new ApiOnlineNum({
            aid: this.player.config.aid,
            cid: this.player.config.cid,
            bvid: this.player.config.bvid,
            ts: Math.ceil(+new Date() / 30 / 1000),
        }).getData({
            success: (data: ApiOnlineNumOutData) => {
                this.updateNumber(data);

                if (data.showSwitch?.total || data.showSwitch?.count) {
                    this.getOnlineTimer = setTimeout(() => {
                        this.getOnline();
                    }, this.getOnlineTime);
                }
            },
        });
    }
    // 实时人数
    updateNumber(data: ApiOnlineNumOutData) {
        this.player.trigger(STATE.EVENT.PLAYER_SEND, {
            person: data.count,
            all: data.total,
            total: data.showSwitch.total,
            count: data.showSwitch.count,
        });
        const setOnline = this.player.globalFunction.WINDOW_AGENT.PlayerSetOnline;
        if (typeof setOnline === 'function') {
            setOnline(data.count);
        }
    }
    // pb 实时弹幕
    addDanmaku(data: any[]) {
        try {
            if (Array.isArray(data)) {
                const player = this.player;
                let danmakuData: IRealDanmakuData = data[0];
                const danmaku: IDanmakuData = {
                    stime: player.config.isPremiere ? -1 : danmakuData.progress / 1000 || 0,
                    mode: danmakuData.mode || 1,
                    size: danmakuData.fontsize || 25,
                    color: danmakuData.color || 16777215,
                    date: danmakuData.ctime || 0,
                    class: danmakuData.pool || 0,
                    uid: danmakuData.midHash || '',
                    dmid: danmakuData.idStr || '',
                    text: danmakuData.content,
                };
                // 首播实时弹幕不进行随机屏蔽
                if (player.config.isPremiere) {
                    danmaku.weight = 9;
                }
                // 首播弹幕采用直播弹幕的渲染逻辑
                const liveDm = player.config.isPremiere ? true : false;
                this.delayAddRealTimer = setTimeout(() => {
                    player.danmaku?.addReal(danmaku, liveDm);
                }, 300);
            }
        } catch (err) {
            console.error(err);
            logger.w(<any>err);
        }
    }
}

export default RealTimeDanmaku;
