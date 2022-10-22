import Player, { IReceivedInterface } from '../player';
import { IPageItem, IListItem } from '../io/rebuild-playlist-data';
import * as PD from '../const/player-directive';
import * as WD from '../const/webpage-directive';
import ApiPlaylistList, { ApiPlaylistListOutData } from '../io/api-playlist-list';
import ApiPlaylistInfo, { ApiPlaylistInfoOutData } from '../io/api-playlist-info';
import DeleteWatchlaterItem, { IOutData as DataFromWatchlaterDelete } from '../io/api-watchlater-delete';
import { getBit, shuffle } from '@shared/utils';

interface INextPartInfoInterface {
    p: number | null;
    aid: number | null;
    cid: number | null;
    bvid: string | null;
    modal: boolean;
    ended: boolean;
    title: string;
    videoTitle: string;
}
interface INextLogicListInterface {
    aid: number | null;
    cid: number | null;
    bvid: string | null;
    ended: boolean;
}
interface ICachePoolInterface {
    continuous: boolean;
    listInfo: ListInfoInterface;
}
interface ILogicListEndedInterface {
    aid: null | number;
    cid: null | number;
    bvid: null | string;
    ended: boolean;
}
interface ListInfoInterface {
    mid: number;
    count: number;
    order: string;
    index: number; // originList[0].index - 1，从 0 开始
    hasPrev: boolean;
    hasNext: boolean;
    originList: IListItem[];
    sortedList: IPageItem[];
    firstList: IListItem[];
}

interface IConfigInterface {
    playlistBvid?: string;
    playlistOtype?: number;
    playlistFirstRid: number;
    playlistFirstType: number;
    playlistPn: number;
    playlistId: number;
    onLoad?: () => void;
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
        continuous: false,
        listInfo: {
            mid: <any>null,
            count: <any>null,
            order: Playlist.playOrderEnum.positive,
            index: 0,
            hasPrev: true,
            hasNext: true,
            originList: [],
            sortedList: [],
            firstList: [],
        },
    };

    private player: Player;
    private retrycount = 3;
    private bottomLoading = false;
    private topLoading = false;
    private config: IConfigInterface;
    private index = 0; // 当前视频在 originList 中的位置
    private infoLoaded = false;
    private listCountPromise?: Promise<void>;
    listInfo: ListInfoInterface = Playlist.cachePool.listInfo;
    continuous = false;

    constructor(config: IConfigInterface, player: Player) {
        this.config = config;
        this.player = player;

        const callback = () => {
            let item = this.listInfo.originList[0];
            if (!item) {
                window['showError']!(this.player.config.playlistType);
                return;
            }
            if (this.player.config.show_bv) {
                this.player.config.bvid = item.bvid;
            }
            this.player.config.aid = item.aid;
            if (item.pages && item.pages.length) {
                this.player.config.cid = item.pages[0].cid!;
            } else {
                this.player.config.cid = <any>null;
            }
            this.player.playlistLimit = !!+item.attr.toString(2)[item.attr.toString(2).length - 2];
            this.player.config.isAudio = !this.player.config.cid;

            // 初始化时也通知页面更新
            const config = this.rejudgePlayerConfig(
                this.player.config.aid,
                this.player.config.cid,
                this.player.config.bvid
            );
            config && this.player.reloadMedia.tellPage(
                config.p,
                config.aid,
                config.cid,
                config.bvid,
                config.recommendAutoPlay
            );

            this.config.onLoad && this.config.onLoad();

            this.loadFirst();
        };

        this.loadMore(true, () => {
            if (this.listInfo.originList && this.listInfo.originList.length) {
                callback();
            } else {
                this.listInfo.originList = [];
                this.listInfo.sortedList = [];
                this.listInfo.hasPrev = false;
                this.listInfo.hasNext = true;
                this.index = 0;
                this.loadMore(true, () => {
                    callback();
                });
            }
        });
    }

    private static isNeedModal(part: IPageItem): boolean {
        return Playlist.isCooperation(part);
    }

    private static isCooperation(part: IPageItem): boolean {
        return part && part.from != null && part.from !== 'vupload';
    }

    private static isNeedPay(item: IListItem): boolean {
        // return item && item.rightsPay === 1;
        return false;
    }

    private static cidExpand(list: IListItem[]): IPageItem[] {
        const result: IPageItem[] = [];
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const pages = item.pages!;
            if (pages.length) {
                for (let j = 0; j < pages.length; j++) {
                    pages[j].attr = item.attr;
                    pages[j].videoTitle = item.title || pages[j].title;
                    result.push(pages[j]);
                }
            } else {
                result.push({
                    title: item.title,
                    duration: item.duration,
                    from: 'vupload',
                    aid: item.aid,
                    bvid: item.bvid,
                    page: item.page,
                    attr: item.attr,
                });
            }
        }
        return result;
    }

    private uniqueList(list: IListItem[]) {
        const result: IListItem[] = [];
        const flag: Record<string, any> = {};
        this.listInfo.originList.forEach((item) => {
            const id = item.bvid || item.aid;
            if (item.pages) {
                if (!flag[`v${id}`]) {
                    flag[`v${id}`] = 1;
                }
            } else {
                if (!flag[`a${id}`]) {
                    flag[`a${id}`] = 1;
                }
            }
        });
        list.forEach((item) => {
            const id = item.bvid || item.aid;
            if (item.pages) {
                if (!flag[`v${id}`]) {
                    flag[`v${id}`] = 1;
                    result.push(item);
                }
            } else {
                if (!flag[`a${id}`]) {
                    flag[`a${id}`] = 1;
                    result.push(item);
                }
            }
        });
        return result;
    }

    private loadMore(direction: boolean, callback?: () => void) {
        if (direction) {
            if (this.bottomLoading || !this.listInfo.hasNext) {
                return;
            }
            this.bottomLoading = true;
        } else {
            if (this.topLoading || !this.listInfo.hasPrev) {
                return;
            }
            this.topLoading = true;
        }
        this.loadDetails((result) => {
            try {
                if (result?.data?.mediaList?.length) {
                    result.data.mediaList = this.uniqueList(result.data.mediaList);
                    this.appendToList(result.data.mediaList, direction);
                    this.listInfo.hasPrev = this.listInfo.originList[0].index! > 0;
                    if (result.data.mediaList.length < 19 && direction) {
                        this.listInfo.hasNext = false;
                    }
                    this.index = this.findListIndex()!;
                } else if (direction) {
                    this.listInfo.hasNext = false;
                }
                if (direction) {
                    this.bottomLoading = false;
                } else {
                    this.topLoading = false;
                }
                callback?.();
            } catch (error) {
                console.log(error);
            }
        }, direction);
    }

    private loadFirst() {
        if (this.config.playlistBvid && !this.listInfo.firstList.length) {
            this.loadDetails(
                (result) => {
                    if (result?.data?.mediaList?.length) {
                        this.listInfo.firstList = result.data.mediaList;
                    }
                },
                true,
                true,
            );
        }
    }

    private loadDetails(callback?: (result: ApiPlaylistListOutData) => void, direction = true, getFirst = false) {
        const { originList } = this.listInfo;
        const { playlistBvid, playlistOtype } = this.config;
        let bvid;
        let otype;
        // 下一页
        if (direction) {
            bvid = originList.length > 0 ? originList[originList.length - 1].bvid : playlistBvid || '';
            otype = originList.length > 0 ? originList[originList.length - 1].type : playlistOtype;
        } else {
            bvid = originList.length > 0 ? originList[0].bvid : playlistBvid || '';
            otype = originList.length > 0 ? originList[0].type : playlistOtype;
        }
        new ApiPlaylistList({
            playlistType: this.player.config.playlistType,
            playlistId: this.player.config.playlistId,
            bvid: getFirst ? '' : bvid,
            direction: !direction,
            otype,
        }).getData({
            success: (result: ApiPlaylistListOutData) => {
                this.retrycount = 3;
                this.listInfo.count = result.data.total_count;
                this.listCountPromise = Promise.resolve();
                callback?.(result);
            },
            error: () => {
                if (this.retrycount) {
                    this.retrycount--;
                    this.loadDetails(callback);
                } else {
                    this.retrycount = 3;
                    callback?.({
                        code: 0,
                        message: '',
                        data: {
                            mediaList: [],
                            total_count: 0,
                            preOffset: <any>null,
                            nextOffset: <any>null,
                        },
                    });
                }
            },
        });
    }

    init() {
        this.getCache();

        Playlist.cachePool.continuous = false;
        Playlist.cachePool.listInfo = Playlist.cachePool.listInfo || this.listInfo;

        const config = this.rejudgePlayerConfig(
            this.player.config.aid,
            this.player.config.cid,
            this.player.config.bvid,
        );
        $.extend(this.player.config, config);

        this.showExternalModal(this.player.config.aid, this.player.config.cid, this.player.config.bvid);

        this.index = this.findListIndex()!;
        const current = this.listInfo.originList[this.index];

        window['PlayerAgent'] = window['PlayerAgent'] || {};
        window['PlayerAgent']['getActionState'] = () => {
            return {
                isFollow: current.ownerFollowed,
            };
        };

        this.player.window['getAuthorInfo'] = () => {
            return {
                attention: current.ownerFollowed!,
                face: current.ownerFace!,
                mid: current.ownerMid!,
                uname: current.ownerName!,
            };
        };

        this.listCountPromise?.then(() => {
            this.player.directiveManager.sender(PD.PL_SET_COUNT, {
                count: this.listInfo.count,
            });
        });

        if (!this.infoLoaded) {
            this.infoLoaded = true;
            new ApiPlaylistInfo({
                playlistType: this.player.config.playlistType,
                playlistId: this.player.config.playlistId,
            }).getData({
                success: (result: ApiPlaylistInfoOutData) => {
                    this.listInfo.mid = result.data.ownerMid;
                },
            });
        }

        this.player.directiveManager.on(WD.PL_RETRIEVE_DATA.toString(), (e: any, received: IReceivedInterface) => {
            this.player.directiveManager.responder(received, {
                listInfo: this.listInfo,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                bvid: this.player.config.bvid,
            });
        });

        this.player.directiveManager.on(WD.PL_LOAD_MORE.toString(), (e: any, received: IReceivedInterface) => {
            this.loadMore(received['data']['direction'], () => {
                this.player.directiveManager.responder(received, {
                    listInfo: this.listInfo,
                });
            });
        });

        this.player.directiveManager.on(WD.PL_SET_ORDER.toString(), (e: any, received: IReceivedInterface) => {
            this.setPlayOrder(received['data']['order']);
        });

        this.player.directiveManager.on(WD.PL_CLICK_ITEM.toString(), (e: any, received: IReceivedInterface) => {
        });

        this.player.directiveManager.on(WD.PL_SET_VIDEO.toString(), (e: any, received: IReceivedInterface) => {
            this.cidLoader(received['data']['aid'], received['data']['cid'], received['data']['bvid']);
        });

        this.player.directiveManager.on(WD.PL_DEL_VIDEO.toString(), (e: any, received: IReceivedInterface) => {
            const aid = received.data.aid;
            const bvid = received.data.bvid;
            if (this.player.config.playlistType === 2) {
                new DeleteWatchlaterItem(aid, bvid).getData({
                    success: (json: DataFromWatchlaterDelete) => {
                        if (json) {
                            if (json.code === 0) {
                                this.removeFromList(aid, bvid);
                            }
                            this.player.directiveManager.responder(received, {
                                ...json,
                                listInfo: this.listInfo,
                            });
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

    // 切换右侧播放列表
    switchAuxiliary() {
        this.player.directiveManager.sender(PD.PL_VIDEO_SWITCH, {
            aid: this.player.config.aid,
            cid: this.player.config.cid,
            bvid: this.player.config.bvid,
        });
    }

    private getCache() {
        this.listInfo = this.listInfo || Playlist.cachePool.listInfo;
        this.continuous = Playlist.cachePool.continuous;
    }

    private setCache() {
        Playlist.cachePool.listInfo = this.listInfo;
        Playlist.cachePool.continuous = this.continuous;
    }

    // 调用外部页面的弹窗
    private showExternalModal(aidX: number | string, cidX: number | string, bvidX: string): boolean {
        const aid = +aidX;
        const cid = +cidX;
        const bvid = bvidX;
        const cIndex = this.findIndex(this.listInfo.sortedList, (item, i, array) => item.cid === cid);
        if (cIndex !== -1) {
            if (
                Playlist.isCooperation(this.listInfo.sortedList[cIndex]) &&
                typeof this.player.window['showCoopModal'] === 'function'
            ) {
                this.player.window['showCoopModal']({ aid: aid, cid: cid, bvid: bvid });
                return true;
            }
        }
        const aIndex = this.findIndex(
            this.listInfo.originList,
            (item, i, array) => (bvid && item.bvid === bvid) || !!(aid && item.aid === aid),
        );
        if (aIndex !== -1) {
            if (
                Playlist.isNeedPay(this.listInfo.originList[aIndex]) &&
                typeof this.player.window['showPay'] === 'function'
            ) {
                this.player.window['showPay']({ aid: aid, cid: cid, bvid: bvid });
                return true;
            }
        }
        return false;
    }

    // 查询当前或指定 cid 在列表中的 p 数
    findPartNumber(cid = this.player.config.cid): number {
        if (!cid) {
            return 1;
        }
        const cIndex = this.findIndex(this.listInfo.sortedList, (item, i, array) => item.cid === cid);
        if (cIndex === -1) {
            return 1;
        } else {
            const aid = this.listInfo.sortedList[cIndex].aid;
            const bvid = this.listInfo.sortedList[cIndex].bvid;
            const aIndex = this.findIndex(
                this.listInfo.sortedList,
                (item, i, array) => (bvid && item.bvid === bvid) || !!(aid && item.aid === aid),
            );
            return cIndex - aIndex + 1 || 1;
        }
    }

    findListIndex(aid = this.player.config.aid, bvid = this.player.config.bvid) {
        if (aid || bvid) {
            return this.findIndex(
                this.listInfo.originList,
                (item) => (bvid && item.bvid === bvid) || !!(aid && item.aid === aid),
            );
        }
    }

    // 获取下一个要播放的视频
    getNextPartInfo(forceToNext?: boolean, noResetToTop?: boolean): INextPartInfoInterface {
        let index = this.findIndex(this.listInfo.sortedList);
        if (this.listInfo.order === Playlist.playOrderEnum.circle && !forceToNext) {
            return {
                p: index,
                aid: this.listInfo.sortedList[index].aid,
                cid: this.listInfo.sortedList[index].cid!,
                bvid: this.listInfo.sortedList[index].bvid,
                modal: Playlist.isNeedModal(this.listInfo.sortedList[index]),
                ended: false,
                title: this.listInfo.sortedList[index].title,
                videoTitle: this.listInfo.sortedList[index].videoTitle!,
            };
        }
        const ended: INextPartInfoInterface = {
            p: null,
            aid: null,
            cid: null,
            modal: false,
            ended: true,
            title: '',
            bvid: null,
            videoTitle: '',
        };
        if (index === this.listInfo.sortedList.length - 1) {
            if (noResetToTop) {
                return ended;
            }
            index = -1;
            this.resetToTop();
        }
        if (!this.listInfo.sortedList.length) {
            return ended;
        }
        if (index === -1) {
            if (this.listInfo.firstList) {
                return {
                    p: 1,
                    aid: this.listInfo.sortedList[0].aid,
                    cid: this.listInfo.sortedList[0].cid!,
                    bvid: this.listInfo.sortedList[0].bvid,
                    modal: Playlist.isNeedModal(this.listInfo.sortedList[0]),
                    ended: false,
                    title: this.listInfo.sortedList[0].title,
                    videoTitle: this.listInfo.sortedList[0].videoTitle!,
                };
            }
            return {
                p: 1,
                aid: this.listInfo.sortedList[0].aid,
                cid: this.listInfo.sortedList[0].cid!,
                bvid: this.listInfo.sortedList[0].bvid,
                modal: Playlist.isNeedModal(this.listInfo.sortedList[0]),
                ended: false,
                title: this.listInfo.sortedList[0].title,
                videoTitle: this.listInfo.sortedList[0].videoTitle!,
            };
        } else {
            const next = this.listInfo.sortedList[index + 1];
            if (next) {
                return {
                    p: this.listInfo.order === Playlist.playOrderEnum.circle ? index : index + 2,
                    aid: next.aid,
                    cid: next.cid!,
                    bvid: next.bvid,
                    modal: Playlist.isNeedModal(next),
                    ended: false,
                    title: next.title,
                    videoTitle: next.videoTitle!,
                };
            } else {
                if (this.listInfo.order === Playlist.playOrderEnum.random) {
                    this.fillSortlist();
                    return {
                        p: 1,
                        aid: this.listInfo.sortedList[0].aid,
                        cid: this.listInfo.sortedList[0].cid!,
                        bvid: this.listInfo.sortedList[0].bvid,
                        modal: Playlist.isNeedModal(this.listInfo.sortedList[0]),
                        ended: false,
                        title: this.listInfo.sortedList[0].title,
                        videoTitle: this.listInfo.sortedList[0].videoTitle!,
                    };
                } else if (this.listInfo.order === Playlist.playOrderEnum.circle) {
                    this.fillSortlist();
                    return {
                        p: 1,
                        aid: this.listInfo.sortedList[0].aid,
                        cid: this.listInfo.sortedList[0].cid!,
                        bvid: this.listInfo.sortedList[0].bvid,
                        modal: Playlist.isNeedModal(this.listInfo.sortedList[0]),
                        ended: false,
                        title: this.listInfo.sortedList[0].title,
                        videoTitle: this.listInfo.sortedList[0].videoTitle!,
                    };
                } else {
                    return ended;
                }
            }
        }
    }

    // 获取下一个 aid
    private getNextLogicList(): INextLogicListInterface {
        const ended: ILogicListEndedInterface = { aid: null, cid: null, ended: true, bvid: null };
        const aidPlaying = this.player.config.aid;
        const bvidPlaying = this.player.config.bvid;
        let sIndex = this.findIndex(
            this.listInfo.sortedList,
            (item, i, array) => (item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying),
        );
        if (sIndex === this.listInfo.sortedList.length - 1) {
            sIndex = 0;
        }
        let next: IPageItem | void;
        for (let i = sIndex; i < this.listInfo.sortedList.length; i++) {
            if (bvidPlaying && this.listInfo.sortedList[i].bvid !== bvidPlaying) {
                next = this.listInfo.sortedList[i];
                break;
            }
            if (aidPlaying && this.listInfo.sortedList[i].aid !== aidPlaying) {
                next = this.listInfo.sortedList[i];
                break;
            }
        }
        if (next) {
            return {
                aid: next.aid,
                cid: next.cid!,
                bvid: next.bvid,
                ended: false,
            };
        } else {
            if (this.listInfo.order === Playlist.playOrderEnum.random) {
                this.fillSortlist();
                for (let i = 0; i < this.listInfo.sortedList.length; i++) {
                    if (bvidPlaying && this.listInfo.sortedList[i].bvid !== bvidPlaying) {
                        next = this.listInfo.sortedList[i];
                        break;
                    }
                    if (aidPlaying && this.listInfo.sortedList[i].aid !== aidPlaying) {
                        next = this.listInfo.sortedList[i];
                        break;
                    }
                }
                if (next) {
                    return {
                        aid: next.aid,
                        cid: next.cid!,
                        bvid: next.bvid,
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
            this.listInfo.sortedList,
            (item, i, array) =>
                ((item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying)) &&
                (!cidPlaying || item.cid === cidPlaying),
        );
        if (sIndex === 0) {
            return ended;
        }
        let prev: IPageItem;
        prev = this.listInfo.sortedList[sIndex - 1];
        if (prev) {
            return {
                aid: prev.aid,
                cid: prev.cid!,
                bvid: prev.bvid,
                ended: false,
            };
        } else {
            if (this.listInfo.order === Playlist.playOrderEnum.random) {
                this.fillSortlist();
                for (let i = sIndex; i >= 0; i--) {
                    if (bvidPlaying && this.listInfo.sortedList[i].bvid !== bvidPlaying) {
                        prev = this.listInfo.sortedList[i];
                        break;
                    }
                    if (aidPlaying && this.listInfo.sortedList[i].aid !== aidPlaying) {
                        prev = this.listInfo.sortedList[i];
                        break;
                    }
                }
                if (prev) {
                    return {
                        aid: prev.aid,
                        cid: prev.cid!,
                        bvid: prev.bvid,
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

    private findIndex<T extends any>(list: T[], fn?: (item: T, i: number, array: T[]) => boolean): number {
        let index = -1;
        if (!this.player.config.isAudio) {
            const handler = fn || ((item: any, i, array) => item.cid === this.player.config.cid);
            for (let i = 0; i < list.length; i++) {
                if (handler(list[i], i, list)) {
                    index = i;
                    break;
                }
            }
            if (index === -1) {
                const handler = fn || ((item: any, i, array) => item.aid === this.player.config.aid);
                for (let i = 0; i < list.length; i++) {
                    if (handler(list[i], i, list)) {
                        index = i;
                        break;
                    }
                }
            }
        } else {
            const aid = this.player.config.aid;
            const bvid = this.player.config.bvid;
            const handler = fn || ((item: any, i, array) => (bvid && item.bvid === bvid) || (aid && item.aid === aid));
            for (let i = 0; i < list.length; i++) {
                if (handler(list[i], i, list)) {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }

    private fillSortlist() {
        const aidPlaying = this.player.config.aid;
        const bvidPlaying = this.player.config.bvid;
        const list = this.listInfo.originList.filter((item) => {
            return !getBit(item.attr, 1);
        });
        if (this.listInfo.order === Playlist.playOrderEnum.random) {
            const shuf = shuffle(list, true);
            const index = this.findIndex(
                shuf,
                (item, i, array) => (item.bvid && item.bvid === bvidPlaying) || !!(item.aid && item.aid === aidPlaying),
            );
            if (index !== -1) {
                const playing = shuf.splice(index, 1);
                Array.prototype.unshift.apply(shuf, playing);
            }
            this.listInfo.sortedList = Playlist.cidExpand(shuf);
        } else if (this.listInfo.order === Playlist.playOrderEnum.reverse) {
            this.listInfo.sortedList = Playlist.cidExpand(list.slice().reverse());
        } else if (this.listInfo.order === Playlist.playOrderEnum.circle) {
            this.listInfo.sortedList = Playlist.cidExpand(list);
        } else {
            this.listInfo.sortedList = Playlist.cidExpand(list);
        }
        this.setCache();
    }

    cidLoader(aid: number, cid: number, bvid: string) {
        const config = this.rejudgePlayerConfig(aid, cid, bvid);
        if (config) {
            this.player.reloadMedia.cidLoader(config);
        }
    }

    private rejudgePlayerConfig(aid: number, cid: number, bvid: string): { [key: string]: any } | null {
        let p: number;
        const index = this.findIndex(this.listInfo.sortedList, (item, i, array) => {
            if (item.cid) {
                return item.cid === cid;
            } else {
                return (bvid && item.bvid === bvid) || !!(aid && item.aid === aid);
            }
        });
        let playlistLimit;
        if (index !== -1) {
            const item = this.listInfo.sortedList[index];
            // const seasonId = item.seasonId;
            // const episodeId = item.episodeId;
            if (item && item.page) {
                p = this.findPartNumber(cid);
            }
            if (getBit(item.attr, 2)) {
                playlistLimit = true;
            }
            return $.extend(
                {
                    aid: aid,
                    cid: cid,
                    bvid: bvid,
                    p: p!,
                    playerType: 0,
                    seasonId: null,
                    episodeId: null,
                    extraParams: null,
                    playlistLimit: playlistLimit,
                },
                {
                    // playerType: seasonId ? 1 : 0,
                    // seasonId: seasonId || null,
                    // episodeId: episodeId || null,
                    // extraParams: seasonId ? 'module=bangumi' : null,
                    playerType: 0,
                    seasonId: null,
                    episodeId: null,
                    extraParams: null,
                },
            );
        } else {
            return null;
        }
    }

    /**
     * about sortlist (cid)
     * 播放下一个视频
     */
    playNextLogicList() {
        const info = this.getNextLogicList();
        if (!info.ended) {
            this.cidLoader(info.aid!, info.cid!, info.bvid!);
        }
    }

    playPrevLogicList() {
        const info = this.getPrevLogicList();
        if (!info.ended) {
            this.cidLoader(info.aid!, info.cid!, info.bvid!);
        }
    }

    private removeFromList(aid?: number, bvid?: string) {
        const { aid: cf_aid, bvid: cf_bvid } = this.player.config;
        const index = this.listInfo.originList.findIndex((item) => {
            return item.bvid === bvid || item.aid === aid;
        });
        if (cf_aid === aid || cf_bvid === bvid) {
            this.playNextLogicList();
        }
        this.listInfo.sortedList = this.listInfo.sortedList.filter((item) => {
            if (cf_aid) {
                return item.aid !== aid;
            }
            if (cf_bvid) {
                return item.bvid !== bvid;
            }
        });
        if (index !== -1) {
            if (index < this.index) {
                this.index--;
            }
            for (let i = 0; i < this.listInfo.originList.length; i++) {
                if (i > index) {
                    this.listInfo.originList[i].index!--;
                }
            }
            this.listInfo.originList.splice(index, 1);
            this.listInfo.count && this.listInfo.count--;
        }
        this.setCache();
    }

    // 添加列表
    private appendToList(items: IListItem[], direction: boolean): boolean | void {
        if (!items || !items.length) {
            return false;
        }
        this.listInfo.originList = direction
            ? this.listInfo.originList.concat(items)
            : items.concat(this.listInfo.originList);

        items = items.filter((item) => {
            return !getBit(item.attr, 1);
        });
        if (this.listInfo.order === Playlist.playOrderEnum.random) {
            const shuf = shuffle(items, true);
            this.listInfo.sortedList = this.listInfo.sortedList.concat(Playlist.cidExpand(shuf));
        } else if (this.listInfo.order === Playlist.playOrderEnum.circle) {
            this.listInfo.sortedList = direction
                ? this.listInfo.sortedList.concat(Playlist.cidExpand(items))
                : Playlist.cidExpand(items).concat(this.listInfo.sortedList);
        } else {
            this.listInfo.sortedList = direction
                ? this.listInfo.sortedList.concat(Playlist.cidExpand(items))
                : Playlist.cidExpand(items).concat(this.listInfo.sortedList);
        }

        this.setCache();
    }

    /**
     * 构建 cachePool 的数据
     */
    buildPlayerConfig(isContinuous?: boolean) {
        if (isContinuous) {
            Playlist.cachePool.continuous = true;
        }
    }

    currentItem() {
        return this.listInfo.originList[this.index];
    }

    private setPlayOrder(order: string) {
        this.listInfo.order = order;
        this.fillSortlist();
        this.player.controller.createNextBtn();
    }

    private resetToTop() {
        if (this.listInfo.originList[0].index === 0) {
            this.listInfo.hasPrev = false;
            this.listInfo.hasNext = false;

            this.player.directiveManager.sender(PD.PL_LIST_TOP, {
                listInfo: this.listInfo,
            });
        } else if (this.listInfo.firstList) {
            this.listInfo.originList = this.listInfo.firstList;
            this.listInfo.hasPrev = false;
            this.listInfo.hasNext = true;

            const items = this.listInfo.firstList.filter((item) => {
                return !getBit(item.attr, 1);
            });
            this.listInfo.sortedList = Playlist.cidExpand(items);

            this.setCache();

            this.player.directiveManager.sender(PD.PL_LIST_TOP, {
                listInfo: this.listInfo,
            });
        }
    }
}

export default Playlist;
