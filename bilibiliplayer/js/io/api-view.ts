/**
 * User relation opt api
 *
 * @class ApiView
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';
// module -> api-in

interface IDimension {
    width: number;
    height: number;
    rotate: number;
}
interface IOwnerInterface {
    mid: number;
    name: string;
    face: string;
}
interface IPageInterface {
    cid: number;
    dimension: IDimensionInterface;
    duration: number;
    from: string;
    page: number;
    part: string;
    vid: string;
    weblink: string;
}
interface IRightsInterface {
    autoplay: number;
    bp: number;
    download: number;
    elec: number;
    hd5: number;
    movie: number;
    no_reprint: number;
    pay: number;
}
interface IStatInterface {
    aid: number;
    bvid: string;
    coin: number;
    danmaku: number;
    dislike: number;
    favorite: number;
    his_rank: number;
    like: number;
    now_rank: number;
    reply: number;
    share: number;
    view: number;

    hisRank: number;
    nowRank: number;
}

interface IDimensionInterface {
    width: number;
    height: number;
    rotate: number;
}
interface IOwnerOutData {
    mid: number;
    name: string;
    face: string;
}
interface IPageOutData {
    cid: number;
    dimension: IDimensionInterface;
    duration: number;
    from: string;
    page: number;
    part: string;
    vid: string;
    weblink: string;
}
interface IRightsOutData {
    autoplay: number;
    bp: number;
    download: number;
    elec: number;
    hd5: number;
    movie: number;
    noReprint: number;
    pay: number;
}
interface IStatOutData {
    aid: number;
    bvid: string;
    coin: number;
    danmaku: number;
    dislike: number;
    favorite: number;
    hisRank: number;
    like: number;
    nowRank: number;
    reply: number;
    share: number;
    view: number;
}

interface IInData {
    aid: number;
    bvid: string;
    ep_id?: number;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    bvid: string;
}
interface IResponseData {
    aid: number;
    bvid: string;
    attribute: number;
    cid: number;
    copyright: number;
    ctime: number;
    desc: string;
    dimension: IDimensionInterface;
    duration: number;
    dynamic: string;
    no_cache: boolean;
    owner: IOwnerInterface;
    pages: IPageInterface[];
    pic: string;
    pubdate: number;
    rights: IRightsInterface;
    stat: IStatInterface;
    state: number;
    tid: number;
    title: string;
    tname: string;
    videos: number;

    data: any;
    allow_bp: number;
}
// api-out -> module
interface IOutData {
    aid: number;
    bvid: string;
    attribute: number;
    cid: number;
    copyright: number;
    ctime: number;
    desc: string;
    dimension: IDimensionInterface;
    duration: number;
    dynamic: string;
    noCache: boolean;
    owner: IOwnerOutData;
    pages: IPageOutData[];
    pic: string;
    pubdate: number;
    rights: IRightsOutData;
    stat: IStatOutData;
    state: number;
    tid: number;
    title: string;
    tname: string;
    videos: number;
    allowFeed?: number;
}

export interface IPugvEpList {
    aid: number;
    cid: number;
    duration: number;
    from: string;
    id: number;
    index: number;
    page: number;
    play: number;
    release_date: number;
    status: number;
    title: string;
    watched: boolean;
    watchedHistory: number;
}
export interface IPugvResultData {
    episodes: IPugvEpList[];
    up_info: {
        avatar: string;
        brief: string;
        follower: number;
        is_follow: number;
        link: string;
        mid: number;
        uname: string;
    };
}
export interface IPugvResult {
    code: number;
    data: IPugvResultData;
}
class ApiView extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig) {
        if (this.data.ep_id) {
            return this.getPugv(config);
        }
        const data: IRequestData = this.convertUpload(this.data);
        const videoData = window['__INITIAL_STATE__']?.videoData;
        if (videoData && (videoData.bvid === data.bvid || videoData.aid === data.aid)) {
            config.success?.(this.convertResult(videoData));
            return null;
        } else {
            return $.ajax({
                url: URLS.VIEW,
                data: data,
                type: 'get',
                xhrFields: {
                    withCredentials: true,
                },
                success: (result: IResponseData) => {
                    if (result && result['data']) {
                        config.success?.(this.convertResult(result['data']));
                    } else {
                        config.error?.();
                    }
                },
                error: (err: JQuery.jqXHR<any>) => {
                    config.error?.(err);
                },
            });
        }
    }

    private getPugv(config: IApiConfig) {
        return $.ajax({
            url: URLS.PUGV_VIEW,
            data: { ep_id: this.data.ep_id },
            type: 'get',
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IPugvResult) => {
                if (result && result.data) {
                    config.success?.(this.parasePugv(result.data));
                } else {
                    config.error?.();
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
    private convertUpload(data: IInData): IRequestData {
        return {
            aid: data['aid'],
            bvid: data['bvid'],
        };
    }

    private convertResult(result: IResponseData): IOutData {
        const listArray: IPageOutData[] = [];
        if (result['pages'] && result['pages'].length) {
            for (let i = 0; i < result['pages'].length; i++) {
                const curList: IPageOutData = {
                    cid: result['pages'][i]['cid'],
                    from: result['pages'][i]['from'],
                    duration: result['pages'][i]['duration'],
                    dimension: {
                        width: result['pages'][i]['dimension']['width'],
                        height: result['pages'][i]['dimension']['height'],
                        rotate: result['pages'][i]['dimension']['rotate'],
                    },
                    page: result['pages'][i]['page'],
                    part: result['pages'][i]['part'],
                    vid: result['pages'][i]['vid'],
                    weblink: result['pages'][i]['weblink'],
                };
                listArray.push(curList);
            }
        }
        return {
            aid: result['allow_bp'],
            bvid: result['bvid'],
            attribute: result['attribute'],
            cid: result['cid'],
            copyright: result['copyright'],
            ctime: result['ctime'],
            desc: result['desc'],
            dimension: {
                width: result['dimension']['width'],
                height: result['dimension']['height'],
                rotate: result['dimension']['rotate'],
            },
            duration: result['duration'],
            dynamic: result['dynamic'],
            noCache: result['no_cache'],
            owner: {
                face: result['owner']['face'],
                mid: result['owner']['mid'],
                name: result['owner']['name'],
            },
            pages: listArray,
            pic: result['pic'] ? result['pic'].replace('http://', 'https://') : result['pic'],
            pubdate: result['pubdate'],
            rights: {
                autoplay: result['rights']['autoplay'],
                bp: result['rights']['bp'],
                download: result['rights']['download'],
                elec: result['rights']['elec'],
                hd5: result['rights']['hd5'],
                movie: result['rights']['movie'],
                noReprint: result['rights']['no_reprint'],
                pay: result['rights']['pay'],
            },
            stat: {
                aid: result['stat']['aid'],
                bvid: result['stat']['bvid'],
                coin: result['stat']['coin'],
                danmaku: result['stat']['danmaku'],
                dislike: result['stat']['dislike'],
                favorite: result['stat']['favorite'],
                hisRank: result['stat']['hisRank'],
                like: result['stat']['like'],
                nowRank: result['stat']['nowRank'],
                reply: result['stat']['reply'],
                share: result['stat']['share'],
                view: result['stat']['view'],
            },
            state: result['state'],
            tid: result['tid'],
            title: result['title'],
            tname: result['tname'],
            videos: result['videos'],
        };
    }
    private parasePugv(data: IPugvResultData): any {
        const list = data.episodes;
        for (let i = 0; i < list.length; i++) {
            const ep = list[i];
            if (ep.id === this.data.ep_id) {
                return {
                    aid: ep.aid,
                    cid: ep.cid,
                    duration: ep.duration,
                    owner: {
                        face: data.up_info.avatar,
                        mid: data.up_info.mid,
                        name: data.up_info.uname,
                    },
                    title: ep.title,
                    pages: data.episodes,
                };
            }
        }
    }
}
export { IInData as ApiViewInData, IOutData as ApiViewOutData };
export default ApiView;
