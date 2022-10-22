import Auxiliary from '../auxiliary';

interface ISponsorItem {
    face?: string;
    hidden?: string;
    message?: string;
    rank?: string;
    uid?: string;
    uname?: string;
    vip?: { vipStatus?: number; vipType?: number };
}

interface ISponsorData {
    ep_bp?: number;
    list?: ISponsorItem[];
    users?: number;
}

interface IRecommendItem {
    cover: string;
    title: string;
    link: string;
}

export interface IPreRolls {
    bvid?: string;
    aid?: number;
    cid?: number;
    duration?: number;
    type?: number;
    allow_jump?: number;
    url?: string;
}

// [*] 表示此字段数据有延迟，使用此字段前需要重新获取数据
// 重新获取数据的方法：Player.flushExtraParams();
export interface IPlayerExtraParams {
    danmakuListOffset: number; // 上下偏移距离
    epCover: string; // 剧集封面
    epTitle: string; // 剧集标题
    epIndex: string;
    mediaTitle: string; // 剧集标题
    squarePic: string; // 方图
    record: string; // 贴片文案
    shareText: string; // 分享文案（包括#哔哩哔哩#）
    sharePic: string; // 分享图
    shareUrl: string; // 分享链接
    isStart: boolean; // 是否开播
    multiMode: boolean; // 是否多集
    epNeedPay: boolean; // [*]付费抢先标识（未开播根据season判断，已开播根据ep判断）
    isFollow: boolean; // [*]是否追番（收藏）
    isPreview: boolean; // 预告片
    allowSponsor: boolean; // 是否允许承包
    canPlay1080: boolean; // 是否可看1080P+
    sponsorCount: number; // [*]总承包人数
    pubTime: string; // 开播时间
    epStat: number; // 付费类型
    sponsorWeekList: ISponsorItem[]; // [*]
    sponsorTotalList: ISponsorItem[]; // [*]
    paster: IPreRolls; // 贴片广告（未转换）
    allowTicket: Boolean;
}

function rebuildSponsorList(data: ISponsorData): ISponsorItem[] {
    const l = data && Array.isArray(data.list) ? data.list : [];
    return l.map((item) => {
        const sponsorItem: ISponsorItem = {
            face: item['face'],
            hidden: item['hidden'],
            message: item['message'],
            rank: item['rank'],
            uid: item['uid'],
            uname: item['uname'],
        };
        if (item['vip']) {
            sponsorItem.vip = {
                vipStatus: item['vip']['vipStatus'],
                vipType: item['vip']['vipType'],
            };
        }
        return sponsorItem;
    });
}

function rebuildPlayerExtraParams(auxiliary: Auxiliary): IPlayerExtraParams | null {
    if (typeof auxiliary.window['getPlayerExtraParams'] === 'function') {
        const params = auxiliary.window['getPlayerExtraParams']();
        if (params) {
            /**
             * todo: remove this and change player.config.ad judgement
             * workaround
             */
            if (params['paster']) {
                params['paster']['url'] = params['paster']['url'] || ' ';
            }

            return {
                danmakuListOffset: +params['danmakuListOffset'] || 0,
                epCover: params['epCover'],
                epTitle: params['epTitle'],
                epIndex: params['epIndex'],
                mediaTitle: params['mediaTitle'],
                squarePic: params['squarePic'],
                record: params['record'],
                shareText: params['shareText'],
                sharePic: params['sharePic'],
                shareUrl: params['shareUrl'],
                isStart: params['isStart'],
                multiMode: params['multiMode'],
                epNeedPay: params['epNeedPay'],
                isFollow: params['isFollow'],
                isPreview: params['isPreview'],
                allowSponsor: params['allowSponsor'],
                sponsorCount: params['sponsorCount'],
                canPlay1080: params['canPlay1080'],
                pubTime: params['pubTime'],
                sponsorWeekList: rebuildSponsorList(params['sponsorWeekList']),
                sponsorTotalList: rebuildSponsorList(params['sponsorTotalList']),
                paster: params['paster'],
                epStat: params['epStat'],
                allowTicket: params['allowTicket'],
            };
        } else {
            return null;
        }
    } else {
        return null;
    }
}

export default rebuildPlayerExtraParams;
