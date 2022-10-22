/**
 * Rebuild playlist json string.
 *
 */
import { logger } from '../plugins/internal-logger';

export interface IPageItem {
    cid?: number;
    page?: number;
    from?: string;
    part?: string;
    duration?: number;

    aid?: number;
    bvid?: string;
    seasonId?: number;
    episodeId?: number;
    seasonType?: number;
}
export interface IListItem {
    aid: number;
    bvid: string;
    pages: IPageItem[];

    pic?: string;
    title?: string;
    state?: number;
    duration?: number;
    progress?: number;
    ownerMid?: number;
    ownerName?: string;
    ownerFace?: string;
    rightsPay?: number;

    _isWatched?: boolean;
}
export interface IPlaylistData {
    code: number;
    list: IListItem[];
}
export type PlaylistDataConverted = IPlaylistData | null;

export default function (text: string): any {
    try {
        const json = JSON.parse(decodeURIComponent(text));
        if (json) {
            if (
                json['code'] === 0 &&
                json['data'] &&
                Array.isArray(json['data']['list']) &&
                json['data']['stat'] &&
                json['data']['owner']
            ) {
                const list: IListItem[] = [];
                json['data']['list'].forEach((item: any) => {
                    if (!item) {
                        return;
                    }
                    const revPages: IPageItem[] = [];
                    const bangumiInfo: { seasonId?: number; episodeId?: number; seasonType?: number } = {};
                    if (item['bangumi'] && item['bangumi']['ep_id']) {
                        if (item['bangumi']['season'] && item['bangumi']['season']['season_id']) {
                            bangumiInfo.seasonId = item['bangumi']['season']['season_id'];
                            bangumiInfo.episodeId = item['bangumi']['ep_id'];
                            bangumiInfo.seasonType = item['bangumi']['season']['season_type'];
                            if (revPages.length !== 1) {
                                logger.w('番剧数量和 `pages` 长度不匹配');
                            }
                        }
                    }
                    (item['pages'] || []).forEach((p: any) => {
                        if (!p) {
                            return;
                        }
                        revPages.push({
                            cid: p['cid'],
                            page: p['page'],
                            from: p['from'],
                            part: p['part'],
                            duration: p['duration'],

                            aid: item['aid'],
                            bvid: item['bvid'],
                            seasonId: bangumiInfo.seasonId,
                            episodeId: bangumiInfo.episodeId,
                            seasonType: bangumiInfo.seasonType,
                        });
                    });
                    list.push({
                        aid: item['aid'],
                        bvid: item['bvid'],
                        pic: item['pic'],
                        title: item['title'],
                        state: item['state'],
                        duration: item['duration'],
                        progress: item['progress'],
                        pages: revPages,

                        ownerMid: item['owner'] && (item['mid'] || item['owner']['mid']),
                        ownerName: item['owner'] && item['owner']['name'],
                        ownerFace: item['owner'] && (item['face'] || item['owner']['face']),
                        rightsPay: item['rights'] && item['rights']['pay'],
                    });
                });
                return {
                    code: 0,
                    list: list,
                    pid: json['data']['pid'],
                    id: json['data']['id'],
                    mid: json['data']['mid'],
                    count: json['data']['count'],
                    name: json['data']['name'],
                    cover: json['data']['cover'],
                    description: json['data']['description'],
                    type: json['data']['type'],
                    attr: json['data']['attr'],
                    state: json['data']['state'],
                    favored: json['data']['favored'],
                    isFavorite: json['data']['is_favorite'],
                    ctime: json['data']['ctime'],
                    mtime: json['data']['mtime'],
                    stat: {
                        pid: json['data']['stat']['pid'],
                        view: json['data']['stat']['view'],
                        favorite: json['data']['stat']['favorite'],
                        reply: json['data']['stat']['reply'],
                    },
                    owner: {
                        mid: json['data']['owner']['mid'],
                        name: json['data']['owner']['name'],
                        face: json['data']['owner']['face'],
                    },
                    favorite: json['data']['favorite'],
                };
            } else if (json['code'] === 0 && json['data'] && Array.isArray(json['data']['list'])) {
                const list: IListItem[] = [];
                json['data']['list'].forEach((item: any) => {
                    if (!item) {
                        return;
                    }
                    const revPages: IPageItem[] = [];
                    const bangumiInfo: { seasonId?: number; episodeId?: number; seasonType?: number } = {};
                    if (item['bangumi'] && item['bangumi']['ep_id']) {
                        if (item['bangumi']['season'] && item['bangumi']['season']['season_id']) {
                            bangumiInfo.seasonId = item['bangumi']['season']['season_id'];
                            bangumiInfo.episodeId = item['bangumi']['ep_id'];
                            bangumiInfo.seasonType = item['bangumi']['season']['season_type'];
                            if (revPages.length !== 1) {
                                logger.w('番剧数量和 `pages` 长度不匹配');
                            }
                        }
                    }
                    (item['pages'] || []).forEach((p: any) => {
                        if (!p) {
                            return;
                        }
                        revPages.push({
                            cid: p['cid'],
                            page: p['page'],
                            from: p['from'],
                            part: p['part'],
                            duration: p['duration'],

                            aid: item['aid'],
                            bvid: item['bvid'],
                            seasonId: bangumiInfo.seasonId,
                            episodeId: bangumiInfo.episodeId,
                            seasonType: bangumiInfo.seasonType,
                        });
                    });
                    list.push({
                        aid: item['aid'],
                        bvid: item['bvid'],
                        pic: item['pic'],
                        title: item['title'],
                        state: item['state'],
                        duration: item['duration'],
                        progress: item['progress'],
                        pages: revPages,

                        ownerMid: item['owner'] && item['mid'],
                        ownerName: item['owner'] && item['owner']['name'],
                        ownerFace: item['owner'] && item['face'],
                        rightsPay: item['rights'] && item['rights']['pay'],
                    });
                });
                return {
                    code: 0,
                    list: list,
                };
            } else {
                return {
                    code: json['code'],
                    list: [],
                };
            }
        } else {
            return null;
        }
    } catch (e) {
        return null;
    }
}
