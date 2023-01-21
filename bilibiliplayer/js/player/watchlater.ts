import STATE from './state';
import Player, { IReceivedInterface } from '../player';
import { IPageItem, IListItem } from '../io/rebuild-watchlater-data';
import * as PD from '../const/player-directive';
import * as WD from '../const/webpage-directive';
import DeleteWatchlaterItem, { IOutData as DataFromWatchlaterDelete } from '../io/api-watchlater-delete';
import { shuffle } from '@shared/utils';

interface INextPartInfoInterface {
    p: number | null;
    aid: number | null;
    cid: number | null;
    bvid: string | null;
    modal: boolean;
    ended: boolean;
}
interface INextLogicListInterface {
    aid: number | null;
    cid: number | null;
    bvid: string | null;
    ended: boolean;
}
interface ICachePoolInterface {
    raw: any;
    continuous: boolean;
    playOrder: string;
    sortlist: IPageItem[];
}
interface ILogicListEndedInterface {
    aid: null | number;
    cid: null | number;
    bvid: null | string;
    ended: boolean;
}
interface IPartInfoEndedInterface extends ILogicListEndedInterface {
    p: null | number;
    modal: boolean;
}

interface IOwnerInterface {
    mid: number;
    name: string;
    face: string;
}

class Playlist {
    private static readonly playOrderEnum = {
        positive: 'sequential', // 这里的值是上报的字段
        reverse: 'reverse',
        circle: 'circle',
        random: 'shuffle',
    };
    // 数据缓存
    private static readonly cachePool: ICachePoolInterface = {
        raw: null,
        continuous: false,
        playOrder: Playlist.playOrderEnum.positive,
        sortlist: [],
    };

    private player: Player;
    private prefix: string;
    private subfix: string;
    private isWatched = false;
    private aidLastPlayingRemove = false;
    private sortlist: IPageItem[] = []; // 排序并展开后的有效数据，cid
    private playlistTitle!: string;
    private playlistOwner!: IOwnerInterface;
    private isFavored!: boolean;
    playlist: IListItem[] = []; // 原始数据，aid
    pid!: number;
    continuous = false;
    playOrder = Playlist.playOrderEnum.positive;

    constructor(player: Player) {
        this.player = player;
        this.prefix = this.player.prefix;
        this.subfix = this.prefix + '-playlist';
        this.init();
    }

    private static isNeedModal(part: IPageItem): boolean {
        return Playlist.isCooperation(part);
    }

    private static isCooperation(part: IPageItem): boolean {
        return part && part.from != null && part.from !== 'vupload';
    }

    private static aidBroken(item: IListItem): boolean {
        return !(item.state === 0 || item.state === 1 || item.state === -6) || item.pages.length < 1;
    }

    private static isNeedPay(item: IListItem): boolean {
        return item && item.rightsPay === 1;
    }

    private static cidExpand(list: IListItem[]): IPageItem[] {
        const result: IPageItem[] = [];
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const pages = item.pages;
            if (Playlist.aidBroken(item)) {
                continue;
            }
            for (let j = 0; j < pages.length; j++) {
                result.push(pages[j]);
            }
        }
        return result;
    }

    init() {
        this.reCachePool();
        this.startParser();
        this.addListener();
        this.externalJudge();
    }

    private externalJudge() {
        const aid = this.player.config.aid;
        const cid = this.player.config.cid;
        const bvid = this.player.config.bvid;
        const config = this.rejudgePlayerConfig(aid, cid, bvid);
        $.extend(this.player.config, config);
        this.showExternalModal(aid, cid, bvid);
    }

    private addListener() {
        this.player.bind(STATE.EVENT.VIDEO_HEARTBEAT, (e: JQuery.Event, param?: { progress: number }) => {
            if (!param) {
                return;
            }
            if ((this.player.config.watchlater || this.player.config.playlist) && !this.isWatched && (param.progress >= 30 || param.progress === -1)) {
                this.isWatched = true;
                this.player.directiveManager.sender(PD.PL_VIDEO_WATCHED, {
                    aid: this.player.config.aid,
                    bvid: this.player.config.bvid,
                });
            }
        });

        this.player.directiveManager.on(WD.PL_RETRIEVE_DATA.toString(), (e: any, received: IReceivedInterface) => {
            this.player.directiveManager.responder(received, {
                order: this.playOrder,
                list: this.playlist,
                playlist: this.player.config.playlist,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                bvid: this.player.config.bvid,
            });
        });

        this.player.directiveManager.on(WD.PL_SET_ORDER.toString(), (e: any, received: IReceivedInterface) => {
            this.setPlayOrder(received['data']['order']);
        });

        this.player.directiveManager.on(WD.PL_SET_VIDEO.toString(), (e: any, received: IReceivedInterface) => {
            if (!this.showExternalModal(received['data']['aid'], received['data']['cid'], received['data']['bvid'])) {
                if (
                    (this.player.config.bvid && received['data']['bvid'] !== this.player.config.bvid) ||
                    (this.player.config.aid && received['data']['aid'] !== this.player.config.aid)
                ) {
                } else if (received['data']['cid'] !== this.player.config.cid) {
                }
                this.cidLoader(received['data']['aid'], received['data']['cid'], received['data']['bvid']);
            }
        });

        this.player.directiveManager.on(WD.PL_DEL_VIDEO.toString(), (e: any, received: IReceivedInterface) => {
            const aid = received.data.aid;
            const bvid = received.data.bvid;
            if (this.player.config.watchlater) {
                new DeleteWatchlaterItem(aid, bvid).getData({
                    success: (json: DataFromWatchlaterDelete) => {
                        if (json) {
                            this.player.directiveManager.responder(received, json);
                            if (json.code === 0) {
                                this.removeFromList(aid, bvid);
                            }
                        } else {
                            this.player.directiveManager.responder(received, {
                                code: 1,
                            });
                        }
                    },
                    error: () => {
                        this.player.directiveManager.responder(received, {
                            code: 1,
                        });
                    },
                });
            } else {
                this.removeFromList(aid, bvid);
            }
        });
    }

    switchAuxiliary() {
        if ((this.player.config.watchlater || this.player.config.playlist)) {
            this.player.directiveManager.sender(PD.PL_VIDEO_SWITCH, {
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                bvid: this.player.config.bvid,
            });

            const index = this.findIndex(
                this.playlist,
                (item, i, array) =>
                    (this.player.config.bvid && item.bvid === this.player.config.bvid) ||
                    !!(this.player.config.aid && item.aid === this.player.config.aid),
            );
            const item = this.playlist[index];
            this.isWatched = item && (item.progress! >= 30 || item.progress === -1);
        }
    }

    private reCachePool() {
        this.playOrder = Playlist.cachePool.playOrder;
        this.continuous = Playlist.cachePool.continuous;
        Playlist.cachePool.continuous = false;
    }

    private startParser() {
        const raw = Playlist.cachePool.raw || this.player.config.playlist;
        if (raw && raw.code === 0) {
            Playlist.cachePool.raw = raw;
            if (raw.list.length) {
                if (this.player.config.plMax) {
                    this.playlist = raw.list.splice(0, this.player.config.plMax);
                } else {
                    this.playlist = raw.list;
                }
                this.playlistTitle = raw.name;
                this.playlistOwner = raw.owner;
                this.isFavored = raw.isFavorite;
                this.pid = raw.pid;
                this.firstSortlist();
            }
        }
    }

    /**
     * 调用外部页面的弹窗
     */
    showExternalModal(aidX: number | string, cidX: number | string, bvidX: string): boolean {
        const aid = +aidX;
        const cid = +cidX;
        const bvid = bvidX;
        const cIndex = this.findIndex(this.sortlist, (item, i, array) => item.cid === cid);
        if (cIndex !== -1) {
            if (Playlist.isCooperation(this.sortlist[cIndex])) {

                typeof this.player.window['showCoopModal'] === 'function' &&
                    this.player.window['showCoopModal']({ aid: aid, cid: cid, bvid: bvid });
                return true;
            }
        }
        const aIndex = this.findIndex(
            this.playlist,
            (item, i, array) => (bvid && item.bvid === bvid) || !!(aid && item.aid === aid),
        );
        if (aIndex !== -1) {
            if (Playlist.isNeedPay(this.playlist[aIndex])) {

                typeof this.player.window['showPay'] === 'function' &&
                    this.player.window['showPay']({ aid: aid, cid: cid, bvid: bvid });
                return true;
            }
        }
        return false;
    }

    /**
     * 查询当前或指定 cid 在列表中的 p 数
     */
    findPartNumber(cid?: number): number | false {
        const cidPrimary = cid || this.player.config.cid;
        const index = this.findIndex(this.sortlist, (item, i, array) => item.cid === cidPrimary);
        if (index === -1) {
            return false;
        } else {
            return this.sortlist[index].page || false;
        }
    }

    /**
     * about sortlist (cid)
     * 获取下一个要播放的视频
     */
    getNextPartInfo(forceToNext: boolean, noResetToTop?: boolean): INextPartInfoInterface {
        let index = this.findIndex(this.sortlist);
        if (this.playOrder === Playlist.playOrderEnum.circle && !forceToNext) {
            return {
                p: index,
                aid: this.sortlist[index].aid!,
                bvid: this.sortlist[index].bvid!,
                cid: this.sortlist[index].cid!,
                modal: Playlist.isNeedModal(this.sortlist[index]),
                ended: false,
            };
        }
        const ended: IPartInfoEndedInterface = { p: null, aid: null, cid: null, modal: false, ended: true, bvid: null };
        if (index === this.sortlist.length - 1) {
            if (this.playOrder === Playlist.playOrderEnum.positive || this.playOrder === Playlist.playOrderEnum.reverse || noResetToTop) {
                return ended; // 稍后再看及播单不返回顶部
            }
            index = -1;
        }
        if (!this.sortlist.length) {
            return ended;
        }
        if (index === -1) {
            if (this.aidLastPlayingRemove) {
                return ended;
            } else {
                return {
                    p: 1,
                    aid: this.sortlist[0].aid!,
                    cid: this.sortlist[0].cid!,
                    bvid: this.sortlist[0].bvid!,
                    modal: Playlist.isNeedModal(this.sortlist[0]),
                    ended: false,
                };
            }
        } else {
            const next = this.sortlist[index + 1];
            if (next) {
                return {
                    p: this.playOrder === Playlist.playOrderEnum.circle ? index : index + 2,
                    aid: next.aid!,
                    cid: next.cid!,
                    bvid: next.bvid!,
                    modal: Playlist.isNeedModal(next),
                    ended: false,
                };
            } else {
                if (this.playOrder === Playlist.playOrderEnum.random) {
                    this.fillSortlist();
                    return {
                        p: 1,
                        aid: this.sortlist[0].aid!,
                        cid: this.sortlist[0].cid!,
                        bvid: this.sortlist[0].bvid!,
                        modal: Playlist.isNeedModal(this.sortlist[0]),
                        ended: false,
                    };
                } else if (this.playOrder === Playlist.playOrderEnum.circle) {
                    this.fillSortlist();
                    return {
                        p: 1,
                        aid: this.sortlist[0].aid!,
                        cid: this.sortlist[0].cid!,
                        bvid: this.sortlist[0].bvid!,
                        modal: Playlist.isNeedModal(this.sortlist[0]),
                        ended: false,
                    };
                } else {
                    return ended;
                }
            }
        }
    }

    // about sortlist (aid)
    // 获取下一个 aid
    private getNextLogicList(): INextLogicListInterface {
        const ended: ILogicListEndedInterface = { aid: null, cid: null, ended: true, bvid: null };
        const aidPlaying = this.player.config.aid;
        const bvidPlaying = this.player.config.bvid;
        let sIndex = this.findIndex(
            this.sortlist,
            (item, i, array) => (item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying),
        );
        if (this.player.config.watchlater && sIndex === this.sortlist.length - 1) {
            sIndex = 0;
        }
        let next: IPageItem | void;
        for (let i = sIndex; i < this.sortlist.length; i++) {
            if (bvidPlaying && this.sortlist[i].bvid !== bvidPlaying) {
                next = this.sortlist[i];
                break;
            }
            if (aidPlaying && this.sortlist[i].aid !== aidPlaying) {
                next = this.sortlist[i];
                break;
            }
        }
        if (next) {
            return {
                aid: next.aid!,
                cid: next.cid!,
                bvid: next.bvid!,
                ended: false,
            };
        } else {
            if (this.playOrder === Playlist.playOrderEnum.random) {
                this.fillSortlist();
                for (let i = 0; i < this.sortlist.length; i++) {
                    if (bvidPlaying && this.sortlist[i].bvid !== bvidPlaying) {
                        next = this.sortlist[i];
                        break;
                    }
                    if (aidPlaying && this.sortlist[i].aid !== aidPlaying) {
                        next = this.sortlist[i];
                        break;
                    }
                }
                if (next) {
                    return {
                        aid: next.aid!,
                        cid: next.cid!,
                        bvid: next.bvid!,
                        ended: false,
                    };
                } else {
                    return ended;
                }
            } else {
                return ended;
            }
        }
    }

    private getPrevLogicList(): INextLogicListInterface {
        const ended: ILogicListEndedInterface = { aid: null, cid: null, ended: true, bvid: null };
        const aidPlaying = this.player.config.aid;
        const cidPlaying = this.player.config.cid;
        const bvidPlaying = this.player.config.bvid;
        let sIndex = this.findIndex(
            this.sortlist,
            (item, i, array) =>
                ((item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying)) &&
                (!cidPlaying || item.cid === cidPlaying),
        );
        if (sIndex === 0) {
            return ended;
        }
        let prev: IPageItem;
        prev = this.sortlist[sIndex - 1];
        if (prev) {
            return {
                aid: prev.aid!,
                cid: prev.cid!,
                bvid: prev.bvid!,
                ended: false,
            };
        } else {
            if (this.playOrder === Playlist.playOrderEnum.random) {
                this.fillSortlist();
                for (let i = sIndex; i >= 0; i--) {
                    if (bvidPlaying && this.sortlist[i].bvid !== bvidPlaying) {
                        prev = this.sortlist[i];
                        break;
                    }
                    if (aidPlaying && this.sortlist[i].aid !== aidPlaying) {
                        prev = this.sortlist[i];
                        break;
                    }
                }
                if (prev) {
                    return {
                        aid: prev.aid!,
                        cid: prev.cid!,
                        bvid: prev.bvid!,
                        ended: false,
                    };
                } else {
                    return ended;
                }
            } else {
                return ended;
            }
        }
    }

    private findIndex<T extends { cid?: number; bvid?: string; aid?: number }>(
        list: T[],
        fn?: (item: T, i: number, array: T[]) => boolean,
    ): number {
        let index = -1;
        const cidPlaying = this.player.config.cid;
        const handler = fn || ((item, i, array) => item.cid === cidPlaying);
        for (let i = 0; i < list.length; i++) {
            if (handler(list[i], i, list)) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            const handler =
                fn ||
                ((item, i, array) =>
                    (this.player.config.bvid && item.bvid === this.player.config.bvid) ||
                    (this.player.config.aid && item.aid === this.player.config.aid));
            for (let i = 0; i < list.length; i++) {
                if (handler(list[i], i, list)) {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }

    private firstSortlist() {
        if (this.playOrder === Playlist.playOrderEnum.random) {
            this.sortlist = Playlist.cachePool.sortlist;
        } else {
            this.fillSortlist();
        }
    }

    private fillSortlist() {
        const aidPlaying = this.player.config.aid;
        const bvidPlaying = this.player.config.bvid;
        if (this.playOrder === Playlist.playOrderEnum.random) {
            const shuf = shuffle(this.playlist, true);
            const index = this.findIndex(
                shuf,
                (item, i, array) => (item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying),
            );
            if (index !== -1) {
                const playing = shuf.splice(index, 1);
                Array.prototype.unshift.apply(shuf, playing);
            }
            this.sortlist = Playlist.cidExpand(shuf);
        } else if (this.playOrder === Playlist.playOrderEnum.reverse) {
            this.sortlist = Playlist.cidExpand(this.playlist.slice().reverse());
        } else if (this.playOrder === Playlist.playOrderEnum.circle) {
            this.sortlist = Playlist.cidExpand(this.playlist);
        } else {
            this.sortlist = Playlist.cidExpand(this.playlist);
        }
        this.buildCache();
    }

    cidLoader(aid: number, cid: number, bvid: string) {
        const config = this.rejudgePlayerConfig(aid, cid, bvid);
        if (config) {
            this.player.reloadMedia.cidLoader(config);
        }
    }

    private rejudgePlayerConfig(aid: number, cid: number, bvid: string): { [key: string]: any } | null {
        let p: number;
        const index = this.findIndex(this.sortlist, (item, i, array) => item.cid === cid);
        if (index !== -1) {
            const item = this.sortlist[index];
            const seasonId = item.seasonId;
            const episodeId = item.episodeId;
            const seasonType = item.seasonType;
            if (item && item.page) {
                p = item.page;
            }
            return $.extend(
                {
                    aid: aid,
                    cid: cid,
                    bvid: bvid,
                    p: p!,
                    seasonType: null,
                    seasonId: null,
                    episodeId: null,
                },
                {
                    seasonType: seasonType || null,
                    seasonId: seasonId || null,
                    episodeId: episodeId || null,
                },
            );
        } else {
            return null;
        }
    }

    private buildCache() {
        if (Playlist.cachePool.raw) {
            Playlist.cachePool.raw.list = this.playlist;
            Playlist.cachePool.raw.count = this.playlist.length;
            Playlist.cachePool.raw.name = this.playlistTitle;
            Playlist.cachePool.raw.owner = this.playlistOwner;
            Playlist.cachePool.raw.isFavorite = this.isFavored;
            Playlist.cachePool.raw.pid = this.pid;
        }
        Playlist.cachePool.playOrder = this.playOrder;
        Playlist.cachePool.sortlist = this.sortlist;
    }

    /**
     * about sortlist (cid)
     * 播放下一个视频
     */
    playNextLogicList() {
        const info = this.getNextLogicList();
        if (info.ended) {
            this.player.pause();
        } else {
            this.cidLoader(info.aid!, info.cid!, info.bvid!);
        }
    }

    playPrevLogicList() {
        const info = this.getPrevLogicList();
        if (!info.ended) {
            this.cidLoader(info.aid!, info.cid!, info.bvid!);
        }
    }

    /**
     * 构建 cachePool 的数据
     */
    buildPlayerConfig(isContinuous?: boolean) {
        if (isContinuous) {
            Playlist.cachePool.continuous = true;
        }
    }

    private setPlayOrder(order: string) {
        this.playOrder = order;
        this.fillSortlist();
        this.player.controller.createNextBtn();
    }

    removeFromList(aid?: number, bvid?: string) {
        if (this.player.config.bvid) {
            if (this.player.config.bvid === bvid) {
                this.playNextLogicList();
            }
            this.playlist = this.playlist.filter((item) => {
                return item.bvid !== bvid;
            });
            this.sortlist = this.sortlist.filter((item) => {
                return item.bvid !== bvid;
            });
        } else if (this.player.config.aid) {
            if (this.player.config.aid === aid) {
                this.playNextLogicList();
            }
            this.playlist = this.playlist.filter((item) => {
                return item.aid !== aid;
            });
            this.sortlist = this.sortlist.filter((item) => {
                return item.aid !== aid;
            });
        }
        this.buildCache();
    }

    appendToList(item: IListItem) {
        this.playlist.push(item);
        this.fillSortlist();
        this.buildCache();
    }

    setIndex(index: number, specPart?: number) {
        const item = this.playlist[index]?.pages[specPart ? specPart - 1 : 0];
        if (item) {
            this.player.reloadMedia.clearConfigByDiffAid(); // it's different from inner cidLoader, force clear inner config;
            this.cidLoader(item.aid!, item.cid!, item.bvid!);
        }
    }

    getIndex() {
        return this.findIndex(this.playlist, (item, i, array) => item.aid === this.player.config.aid);
    }
}

export default Playlist;
