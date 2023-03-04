import STATE from './state';
import Player from '../player';
import { IItemExtInterface } from './toast';
import ApiPlayerPagelistModify, {
    ApiPlayerPagelistModifyInData,
    ApiPlayerPagelistModifyOutData,
} from '../io/api-player-pagelist';
import rebuildPlayerExtraParams from '../io/rebuild-player-extra-params';
import { ContentType } from '@jsc/namespace';

interface IPartsInfoInterface {
    p: number | false;
    aid: number;
    cid: number;
    bvid: string;
    index: number;
    title: string;
    episodeId: number;
    lastplaytime: number;
    total: number | null;
    isPremiere: number;
}

export interface IPartsInfo {
    p: number | false;
    aid: number;
    cid: number;
    bvid: string;
    title: string;
    badge: string;
    badgeType: number | null;
    forFlag: number; // 用来标识唯一的视频
    lastplaytime?: number; // 当前p观看历史
    episodeId?: number;
    firstFormalEpLink?: string; // 当前p对应的正片链接
    isPremiere?: number;
    status?: number;
    premiereBadge?: string;
}

class PartManager {
    private player: Player;
    private prefix: string;
    private isPugv = false;
    private nextObj?: IItemExtInterface;
    parts: any[] | null = null;
    partsInfo: IPartsInfo[] | null = null;
    loadingParts: any;
    loadPartsCallback: any[] = [];

    constructor(player: Player) {
        this.player = player;
        this.prefix = player.prefix;
        this.init();
    }

    init() {
        const that = this;
        const player = this.player;
        this.loadPartsCallback = [];
        this.loadingParts = null;
        this.isPugv = this.player.config.type === ContentType.Pugv;
        [
            STATE.EVENT.VIDEO_MEDIA_PLAY,
            STATE.EVENT.VIDEO_MEDIA_PAUSE,
            STATE.EVENT.VIDEO_MEDIA_SEEK,
            STATE.EVENT.VIDEO_DESTROY,
        ].forEach(function (item) {
            player.bind(item, () => that.destroy());
        });
        player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.partsInfo = null;
        });
        player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            this.updatePugvList();
        });
    }

    load(options: any, successCallback: Function, defaultCallback: Function, immediately: boolean) {
        const config = $.extend({}, options);
        const player = this.player;
        if (typeof config.doneCallback !== 'function') {
            config.doneCallback = $.noop;
        } else {
            const callback = config.doneCallback;
            config.doneCallback = function () {
                callback(player.config.aid, +player.config.cid, player.config.bvid);
            };
        }
        if (typeof config.failCallback !== 'function') {
            config.failCallback = $.noop;
        } else {
            const callback = config.failCallback;
            config.failCallback = function () {
                callback(player.config.aid, +player.config.cid, player.config.bvid);
            };
        }
        if (typeof defaultCallback !== 'function') {
            defaultCallback = function () { };
        }
        if (!config.p) {
            if (this.player.playlistNoView) {
                return this.jump2(config, successCallback, defaultCallback, immediately, 'playlistNoView');
            } else if (this.player.playlist) {
                return this.jump2(config, successCallback, defaultCallback, immediately, 'playlist');
            }
        }

        if (this.parts) {
            this.jump(config, successCallback, defaultCallback, immediately);
        } else {
            this.loadParts(
                () => {
                    if (this.parts) {
                        this.jump(config, successCallback, defaultCallback, immediately);
                    } else {
                        config.failCallback();
                    }
                },
                () => {
                    defaultCallback();
                    config.failCallback();
                },
            );
        }
    }

    findNextP(success: Function) {
        let flag: number;
        let searchFlag: string;
        if (this.player.config.seasonType > 0) {
            flag = this.player.config.episodeId;
            searchFlag = 'episodeId';
        } else {
            flag = this.player.config.cid;
            searchFlag = 'cid';
        }

        this.loadParts(
            (partsInfo: IPartsInfo[]) => {
                if (typeof flag === 'undefined' || !partsInfo) {
                    return false;
                }
                let data: IPartsInfo;
                for (let i = 0; i < partsInfo.length; i++) {
                    if (partsInfo[i] && +partsInfo[i][<keyof IPartsInfo>searchFlag]! === flag) {
                        if (i + 2 <= partsInfo.length) {
                            data = partsInfo[i + 1];
                            break;
                        }
                    }
                }
                if (this.player.config.listLoop) {
                    data = data! || partsInfo[0];
                }
                success(data! || {});
            },
            () => {
                success({});
            },
        );
    }

    // 从外部获取列表
    updateList() {
        this.player.extraParams = rebuildPlayerExtraParams(this.player);
        this.getFromPage();
    }

    // 加载分p列表
    loadParts(success: Function, error: Function) {
        if (this.partsInfo) {
            success(this.partsInfo);
            return;
        }
        // 付费视频从页面取
        if (this.isPugv) {
            this.parts = this.player.globalFunction.WINDOW_AGENT.getEpisodes?.();
            if (Array.isArray(this.parts) && this.parts.length > 0) {
                this.parts.forEach((item: any) => {
                    item.page = item.index;
                });
            }
            this.player.userLoadedCallback(() => {
                this.parseParts(this.parts);
                success(this.partsInfo);
            });
            return;
        }
        this.loadPartsCallback.push({
            success,
            error,
        });
        if (this.isNewPgc()) {
            this.getFromPage();
            return;
        }
        if (this.loadingParts) {
            return;
        }
        let ajaxUrl: string;
        const seasonType = this.player.config.seasonType;
        if (seasonType > 0) {
            ajaxUrl = '?season_id=' + this.player.config.seasonId + '&season_type=' + this.player.config.seasonType;
        } else {
            if (this.player.config.bvid) {
                ajaxUrl = '?bvid=' + this.player.config.bvid + '&jsonp=jsonp';
            } else {
                ajaxUrl = '?aid=' + this.player.config.aid + '&jsonp=jsonp';
            }
        }
        this.loadingParts = new ApiPlayerPagelistModify(<ApiPlayerPagelistModifyInData>{
            url: ajaxUrl,
            seasonType: seasonType,
        }).getData({
            success: (data: ApiPlayerPagelistModifyOutData) => {
                this.loadingParts = null;
                if (seasonType > 0) {
                    if (data && data.code === 0) {
                        this.parts = data.result!;
                    }
                } else {
                    this.parts = data.data!;
                }
                this.parseParts(this.parts);
                this.loadCallback();
            },
            error: () => {
                this.loadingParts = null;
                this.loadCallback(false);
            },
        });
    }

    // 更新课堂列表的播放历史，为toast做准备
    private updatePugvList() {
        const cid = this.player.config.cid;
        if (this.isPugv && this.parts?.length) {
            this.parts.some((item: any) => {
                if (item.cid === cid) {
                    item.watchedHistory = this.player.currentTime();
                    return true;
                }
            });
        }
    }

    private isNewPgc() {
        return this.player.extraParams && this.player.extraParams.epList;
    }

    getFromPage() {
        const eplist = this.isNewPgc();
        if (typeof eplist.result === 'undefined') {
            // 当pgc还未拉取到数据时，等待。。。
            return;
        }
        const data = ApiPlayerPagelistModify.parseResult(eplist);
        this.parts = data.result!;
        this.parseParts(data.result);
        this.loadCallback();
    }

    private loadCallback(success: boolean = true) {
        if (success) {
            for (let i = 0; i < this.loadPartsCallback.length; i++) {
                this.loadPartsCallback[i].success(this.partsInfo);
            }
        } else {
            for (let i = 0; i < this.loadPartsCallback.length; i++) {
                this.loadPartsCallback[i].error();
            }
        }
    }

    // 格式化分p列表（后期需要其他值再加）
    private parseParts(parts: any) {
        if (Array.isArray(parts) && parts.length > 0) {
            this.partsInfo = [];
            let data: IPartsInfo;
            parts.forEach((item: any) => {
                if (this.player.config.seasonType > 0) {
                    data = {
                        cid: item.cid,
                        aid: item.avid,
                        bvid: item.bvid,
                        badge: item.badge,
                        badgeType: item.badge_type,
                        episodeId: item.episode_id,
                        firstFormalEpLink: item.first_formal_ep_link,
                        forFlag: item.cid,
                        p: item.index,
                        title: isNaN(item.title) ? item.title : `第${item.title}话`,
                        isPremiere: item.is_premiere ? 1 : 0,
                        premiereBadge: item.premiere_badge || '',
                    };
                    if (item.long_title) {
                        data.title = `${data.title} ${item.long_title}`;
                    }
                } else {
                    if (this.isPugv) {
                        data = {
                            p: item.index,
                            badge: '',
                            badgeType: item.status,
                            episodeId: item.id,
                            cid: item.cid,
                            forFlag: item.cid,
                            aid: item.aid,
                            bvid: item.bvid,
                            title: `第${item.index}话 ${item.title}`,
                            lastplaytime: item.watchedHistory * 1000,
                        };
                        if (item.status !== 1 && this.player.user.status().pugv_pay_status === 2) {
                            data.badge = '付费';
                        }
                    } else {
                        data = {
                            p: item.page,
                            badge: item.badge,
                            badgeType: item.badge_type,
                            cid: item.cid,
                            forFlag: item.cid,
                            aid: this.player.config.aid,
                            bvid: this.player.config.bvid,
                            title: `P${item.page} ${item.part}`,
                        };
                    }
                }
                this.partsInfo!.push(data);
            });
        }
    }

    private jump(config: any, successCallback: Function, defaultCallback: Function, immediately: boolean) {
        let p = config.p;
        const player = this.player;
        const data = this.parts;
        let cid: number | false | void;
        let aid: number | false | void;
        let bvid: string | false | void;
        let index: number;
        let episodeId: number | void;
        let isPremiere: number | void;
        let litsItem: any;
        const seasonType = player.config.seasonType;
        if (!data || !data.length || (data.length < 2 && !player.config.listLoop)) {
            defaultCallback();
            config.failCallback();
        } else {
            if (typeof p === 'undefined') {
                p = this.search(
                    seasonType > 0 ? player.config.episodeId : player.config.cid,
                    seasonType > 0 ? 'episode_id' : 'cid',
                    seasonType > 0 ? true : 'page',
                );
                if (p === false || (p++ === data.length && !player.config.listLoop)) {
                    defaultCallback();
                    config.failCallback();
                    return;
                }
            }
            if (player.config.listLoop && p > data.length) {
                p = 1;
            }

            if (seasonType > 0) {
                index = p - 1;
                if (data[index]) {
                    cid = data[index]['cid'];
                    aid = data[index]['avid'];
                    bvid = data[index]['bvid'];
                    episodeId = data[index]['episode_id'];
                    isPremiere = data[index]['is_premiere'] ? 1 : 0;
                }
                if (p === data.length && !player.config.listLoop) {
                    this.player.config.hasNext = false;
                } else {
                    this.player.config.hasNext = true;
                }
            } else {
                cid = this.search(p);
            }
            litsItem = {
                aid,
                cid,
                bvid,
                p,
                episodeId,
                isPremiere,
            };
            if (this.isPugv) {
                litsItem.episodeId = data[p - 1].id;
                litsItem.lastepid = data[p - 1].id;
                litsItem.lastplaytime = data[p - 1].lastplaytime;
                litsItem.aid = data[p - 1].aid;
                litsItem.bvid = data[p - 1].bvid;
                litsItem.badgeType = this.partsInfo![p - 1].badgeType;
            }
            if (!cid) {
                defaultCallback();
                config.failCallback();
            } else if (player.get('video_status', 'autopart') === 1 && !immediately) {
                if (this.player.interactive && this.player.config.seasonType) {
                    successCallback(litsItem);
                    config.doneCallback();
                } else {
                    this.next(
                        function () {
                            successCallback(litsItem);
                            config.doneCallback();
                        },
                        function () {
                            defaultCallback();
                            config.failCallback();
                        },
                    );
                }
            } else {
                successCallback(litsItem);
                config.doneCallback();
            }
        }
    }

    private jump2(
        config: any,
        successCallback: Function,
        defaultCallback: Function,
        immediately: boolean,
        type?: string,
    ) {
        const that = this;
        let programObj: any;
        if (type && type === 'playlistNoView') {
            programObj = this.player.playlistNoView;
        } else if (type && type === 'playlist') {
            programObj = this.player.playlist;
        }
        const info = programObj.getNextPartInfo(config.forceToNext);
        const buildPlayerConfig = function () {
            (info.bvid || info.aid) && programObj.buildPlayerConfig(true);
        };
        const litsItem = {
            aid: info.aid,
            bvid: info.bvid,
            cid: info.cid,
            p: info.p,
        };
        if (!info || info.ended) {
            defaultCallback();
            // config.failCallback();
        } else if (info.modal) {
            programObj.showExternalModal(info.aid, info.cid, info.bvid);
            // config.failCallback();
        } else if (+this.player.get('video_status', 'autopart') === 1 && !immediately) {
            this.next(
                function () {
                    const cInfo = programObj.getNextPartInfo(config.forceToNext);
                    if (cInfo && cInfo.cid === info.cid) {
                        buildPlayerConfig();
                        successCallback(litsItem);
                    } else {
                        that.jump2(config, successCallback, defaultCallback, true, type);
                    }
                },
                function () {
                    defaultCallback();
                    // config.failCallback();
                },
            );
        } else {
            const cInfo = programObj.getNextPartInfo(config.forceToNext);
            if (cInfo && cInfo.cid === info.cid) {
                buildPlayerConfig();
                successCallback(litsItem);
            } else {
                that.jump2(config, successCallback, defaultCallback, true, type);
            }
            // buildPlayerConfig();
            // successCallback(info.aid, info.cid, info.p);
            config.doneCallback();
        }
    }

    private next(successCallback: Function, defaultCallback: Function) {
        let msg;
        switch (Number(this.player.config.playerType)) {
            case 1:
                msg = '话';
                break;
            default:
                msg = '个';
                break;
        }
        if (this.isPugv) {
            msg = '集';
        }
        this.nextObj = this.player.toast.addBottomHinter({
            restTime: 5,
            closeButton: true,
            text: `秒后播放下一${msg}`,
            jump: '立即播放',
            jumpFunc: successCallback,
            successCallback: successCallback,
            defaultCallback: defaultCallback,
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, () => {
            if (this.nextObj) {
                this.nextObj.stop();
                delete this.nextObj;
            }
        });
    }

    requestParts(): JQueryXHR {
        let ajaxUrl: string;
        const that = this;
        const seasonType = this.player.config.seasonType;

        if (seasonType > 0) {
            ajaxUrl = '?season_id=' + this.player.config.seasonId + '&season_type=' + this.player.config.seasonType;
        } else {
            if (this.player.config.bvid) {
                ajaxUrl = '?bvid=' + this.player.config.bvid + '&jsonp=jsonp';
            } else {
                ajaxUrl = '?aid=' + this.player.config.aid + '&jsonp=jsonp';
            }
        }
        return new ApiPlayerPagelistModify(<ApiPlayerPagelistModifyInData>{
            url: ajaxUrl,
            seasonType: seasonType,
        }).getData({
            success: (data: ApiPlayerPagelistModifyOutData) => {
                if (seasonType > 0) {
                    if (data && data.code === 0) {
                        that.parts = data.result!;
                    }
                } else {
                    that.parts = data.data!;
                }
            },
            error: () => { },
        });
    }

    getPartsInfo(lastcid: number, lastepid?: number): IPartsInfoInterface {
        let p: number | false;
        let pInfo: any;
        let aid: number;
        let cid: number;
        let bvid: string;
        let episodeId: number;
        let title: string;
        let index: number;
        let lastplaytime: number;
        let isPremiere: number;
        if (this.player.config.seasonType > 0) {
            p = this.search(lastepid!, 'episode_id', true);
        } else {
            p = this.search(lastcid, 'cid', 'page');
        }
        if (p && p >= 1) {
            let parts = this.parts;
            if (this.isPugv) {
                parts = this.partsInfo;
                pInfo = parts![p - 1];
                if (pInfo) {
                    title = pInfo.title;
                    aid = pInfo.aid;
                    cid = pInfo.cid;
                    bvid = pInfo.bvid;
                    episodeId = pInfo.episodeId;
                    index = pInfo.p;
                    lastplaytime = pInfo.lastplaytime;
                }
            } else {
                pInfo = parts![p - 1];
                if (pInfo) {
                    title = pInfo['title'];
                    aid = pInfo['avid'];
                    cid = pInfo['cid'];
                    bvid = pInfo['bvid'];
                    episodeId = pInfo['episode_id'];
                    index = pInfo['index'];
                    isPremiere = pInfo['is_premiere'] ? 1 : 0;
                }
            }
        }
        return {
            p: p,
            aid: aid!,
            cid: cid!,
            bvid: bvid!,
            index: index!,
            title: title!,
            episodeId: episodeId!,
            lastplaytime: lastplaytime!,
            total: this.parts && this.parts.length,
            isPremiere: isPremiere!,
        };
    }

    search(value: number, type?: string, searchValue?: boolean | string): number | false {
        if (typeof value === 'undefined' || !this.parts) {
            return false;
        }
        for (let i = 0; i < this.parts.length; i++) {
            if (this.parts[i] && +this.parts[i][type || 'page'] === +value) {
                return searchValue === true ? i + 1 : this.parts[i][searchValue || 'cid'];
            }
        }
        return false;
    }

    /**
     * @deprecated reason: `async = false`
     */
    getParts(): any[] {
        let ajaxUrl: string;
        const that = this;
        const seasonType = this.player.config.seasonType;

        if (seasonType > 0) {
            ajaxUrl = '?season_id=' + this.player.config.seasonId + '&season_type=' + this.player.config.seasonType;
        } else {
            if (this.player.config.bvid) {
                ajaxUrl = '?bvid=' + this.player.config.aid + '&jsonp=jsonp';
            } else {
                ajaxUrl = '?aid=' + this.player.config.aid + '&jsonp=jsonp';
            }
        }
        new ApiPlayerPagelistModify(<ApiPlayerPagelistModifyInData>{
            url: ajaxUrl,
            seasonType: seasonType,
            async: false,
        }).getData({
            success: (data: ApiPlayerPagelistModifyOutData) => {
                if (seasonType > 0) {
                    if (data && data.code === 0) {
                        that.parts = data.result!;
                    }
                } else {
                    that.parts = data.data!;
                }
            },
            error: () => { },
        });
        return that.parts!;
    }

    destroy() {
        if (this.nextObj) {
            this.nextObj.stop();
            delete this.nextObj;
        }
    }
}

export default PartManager;
