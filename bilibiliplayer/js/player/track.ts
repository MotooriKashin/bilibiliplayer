import { ContentType } from "@jsc/namespace";
import { getCookie, getLocalSettings, setLocalSettings } from "@shared/utils";
import ApiReportHeartBeat, { ApiReportHeartBeatInData } from "../io/api-x-report-heartbeat";
import Player from "../player";
import STATE from "./state";

interface IPointParamsInterface extends Object {
    aid: number | undefined;
    cid: number;
    bvid: string;
    part: number;
    mid: string | number;
    lv: number | false;
    ftime: number;
    stime: number;
    jsonp: 'jsonp';
    [key: string]: any;
}
export class Track {
    private stime?: number;
    private heartbeatId?: number;
    private inited = false;
    private destroyed: boolean = false;
    private enableHeartBeat = true;
    private firstClick: boolean = false;
    private nextRestart: boolean = false;
    private prevPlayerType?: number;
    private seek: { start: number | null; total: number } = { start: null, total: 0 };
    private atomicClockRecord: { start: number | null; total: number } = { start: null, total: 0 };
    constructor(protected player: Player) { }
    init() {
        if (this.inited) {
            return;
        }
        this.inited = true;
        const player = this.player;
        const that = this;

        player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, () => {
            if (this.firstClick) {
                if (!this.nextRestart) {
                    this.heartBeat(3);
                }
                this.enableHeartBeat = true;
            }
        });
        player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            if (this.firstClick) {
                if (!that.isPlayerComplete()) {
                    this.heartBeat(2);
                }
                this.enableHeartBeat = false;
            }
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            if (that.seek.start === null) {
                that.seek.start = player.currentTime()!;
            }
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => {
            if (that.seek.start !== null) {
                that.seek.total += player.currentTime()! - that.seek.start;
                that.seek.start = null;
            }
            if (this.nextRestart) {
                this.heartBeat(1);
                this.nextRestart = false;
            }
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, (e: JQuery.Event) => {
            if (this.atomicClockRecord.start != null) {
                this.atomicClockRecord.total += (e.timeStamp - this.atomicClockRecord.start) / 1000;
            }
            this.atomicClockRecord.start = null;
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, (e: JQuery.Event) => {
            if (this.atomicClockRecord.start != null) {
                this.atomicClockRecord.total += (e.timeStamp - this.atomicClockRecord.start) / 1000;
            }
            this.atomicClockRecord.start = null;
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_FRAME, (e: JQuery.Event) => {
            if (player.video) {
                if (player.video.paused || player.video.seeking) return;
                if (player.videoSeeking) return;
            }
            if (this.atomicClockRecord.start != null) {
                this.atomicClockRecord.total += (e.timeStamp - this.atomicClockRecord.start) / 1000;
            }
            this.atomicClockRecord.start = e.timeStamp;
        });

        player.bind(STATE.EVENT.VIDEO_MEDIA_BUFFER, (e: JQuery.Event) => {
            if (this.atomicClockRecord.start != null) {
                this.atomicClockRecord.total += (e.timeStamp - this.atomicClockRecord.start) / 1000;
            }
            this.atomicClockRecord.start = null;
        });

        player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            if (!that.isPlayerComplete()) {
                that.heartBeat(4);
            }
        });

        player.bind(STATE.EVENT.PLAYER_RELOAD, () => {
            this.reset();
        });

        player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            that.destroy();
        });

        player.$window
            .off(`beforeunload${player.config.namespace}track`)
            .on(`beforeunload${player.config.namespace}track`, () => {
                if (!that.isPlayerComplete()) {
                    this.heartBeat(4);
                }
            });
    }
    view() {
        if (!this.player.config.isAudio) {
            this.player.userLoadedCallback(() => {
                if (!this.firstClick && !this.destroyed) {
                    this.firstClick = true;
                    this.getPointParams((params: IPointParamsInterface | false) => {
                        if (params && !this.destroyed) {
                            this.sendRealtime(params);
                        }
                    });
                }
            });
        }
    }
    getRealTime() {
        const realtime = Math.floor((this.player.currentTime() || 0) - this.seek.total);
        return Math.max(realtime, 0);
    }
    heartBeat(playType = 0) {
        if (!this.stime || this.seek.start) {
            return false;
        }
        if (this.shouldHeartbeatBeDisabled(playType)) {
            return;
        }
        let playedTime: number;
        const that = this;
        const player = this.player;
        try {
            playedTime = this.isPlayerComplete() ? -1 : Math.floor(player.currentTime()!);
        } catch (e) {
            playedTime = Math.floor(player.currentTime()!);
        }
        let realtime = Math.floor(player.currentTime()! - that.seek.total);
        realtime = Math.max(realtime, 0);
        if (realtime === 0 && playedTime === 0 && playType === 4) {
            return false;
        }
        const data: ApiReportHeartBeatInData = {
            aid: player.config.aid || undefined,
            cid: player.config.cid,
            mid: player.user.status().uid || '',
            csrf: getCookie('bili_jct') || '',
            playedTime: playedTime,
            realPlayedTime: Math.floor(this.atomicClockRecord.total),
            realtime: realtime,
            startTs: that.stime!,
            type: player.config.seasonType > 0 ? 4 : 3,
            subType: player.config.seasonType,
            dt: 2,
            playType: playType,
            autoContinuedPlay: 0,
            referUrl: player.window.document.referrer,
            bsource: '',
        };


        if (this.player.config.type === ContentType.OgvPre) {
            delete (<any>data).playedTime;
        }

        if (player.config.playlistId) {
            data.playlistId = player.config.playlistId;
        }

        if (player.config.playlistType) {
            data.playlistType = player.config.playlistType;
        }

        if (player.config.seasonId) {
            data.sid = player.config.seasonId;
            data.epid = player.config.episodeId;
        }
        if (playType === 4) {
            this.nextRestart = true;
        }
        if (this.player.config.isPremiere || this.player.config.fjw) {
            // 首播EP上报后不保存历史记录
            data.noHistory = 1;
        }
        switch (this.player.config.type) {
            case ContentType.Pugv:
            case ContentType.PugvCenter:
                data.type = 10;
                break;
            default:
                break;
        }
        player.trigger(STATE.EVENT.VIDEO_HEARTBEAT, { data, progress: playedTime });
        new ApiReportHeartBeat(<ApiReportHeartBeatInData>data).getData({
            success: () => { },
        });
        this.prevPlayerType = playType;
    }
    private shouldHeartbeatBeDisabled(playType: number): boolean {
        if (playType === 3) {
            return this.prevPlayerType !== 2;
        }
        if (this.prevPlayerType === 1 || this.prevPlayerType === 3) {
            return playType === 1 || playType === 3;
        } else {
            return false;
        }
    }
    private isPlayerComplete() {
        if (this.player.videoDisableTime) {
            return false;
        } else {
            return (
                this.player.state.video_state === STATE.V_COMPLETE ||
                (this.player.duration() && this.player.currentTime()!.toFixed(1) === this.player.duration()!.toFixed(1))
            );
        }
    }
    private getPointParams(callback: (params: IPointParamsInterface | false) => void) {
        const player = this.player;
        try {
            const status = player.user.status();
            const time = Math.floor(Date.now() / 1000);
            let params: IPointParamsInterface = {
                aid: player.config.aid,
                cid: player.config.cid,
                bvid: player.config.bvid,
                part: player.config.p,
                mid: status.uid || '',
                lv: status.error ? 0 : status.level || 0,
                ftime: +getLocalSettings('html5PlayerServerTime')! || time,
                stime: time,
                jsonp: 'jsonp',
                type: player.config.seasonType > 0 ? 4 : 3,
                sub_type: player.config.seasonType,
                auto_continued_play: 0,
                refer_url: player.window.document.referrer,
                bsource: '',
            };
            if (!params.aid) {
                delete params.aid;
            }
            if (player.config.seasonId) {
                params['sid'] = player.config.seasonId;
                params['epid'] = player.config.episodeId;
            }

            if (player.config.playlistId) {
                params['playlist_id'] = player.config.playlistId;
            }

            if (player.config.playlistType) {
                params['playlist_type'] = player.config.playlistType;
            }

            if (this.player.config.type === ContentType.Pugv) {
                params.type = 10;
            }
            callback(params);
        } catch (e) {
            callback(false);
        }
    }
    private sendRealtime(params: IPointParamsInterface) {
        this.stime = params['stime'];
        this.heartBeat(1);
        this.heartbeatId = window.setInterval(
            () => {
                if (this.enableHeartBeat && !this.player.video.paused) {
                    this.heartBeat();
                }
            },
            15000,
        );
    }
    private reset() {
        this.firstClick = false;
        this.seek = { start: null, total: 0 };
        this.nextRestart = false;
        this.heartbeatId && clearInterval(this.heartbeatId);
        this.prevPlayerType = -1;
    }
    destroy() {
        this.inited = false;
        this.destroyed = true; // 防止销毁之后异步回调还会继续执行
        this.heartbeatId && clearInterval(this.heartbeatId);
    }
}