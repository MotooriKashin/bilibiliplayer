import Player from '../player';
import { ContentType } from '@jsc/namespace';

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
    aid?: number;
    cid?: number;
    bvid?: string;
    duration?: number;
    type?: number;
    allow_jump?: number;
    url?: string;
}
export interface IHeadTail {
    hasSkip: boolean; // 是否在设置面板中显示
    hasData: boolean; // 是否有首尾数据
    first: boolean;
    head: number[] | null;
    tail: number[] | null;
}

// [*] 表示此字段数据有延迟，使用此字段前需要重新获取数据
// 重新获取数据的方法：Player.flushExtraParams();
export interface IPlayerExtraParams {
    title: string; // 拼接标题内容：ep短标题拼接+全角空格+ep长标题（无season标题）
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
    isCoin: number; // 是否投币
    isLike: boolean; // 是否点赞
    isPreview: boolean; // 预告片
    allowSponsor: boolean; // 是否允许承包
    canPlay1080: boolean; // 是否可看1080P+
    sponsorCount: number; // [*]总承包人数
    pubTime: string; // 开播时间
    epStat: number; // 付费类型
    recommend: IRecommendItem[]; // [*]
    sponsorWeekList: ISponsorItem[]; // [*]
    sponsorTotalList: ISponsorItem[]; // [*]
    paster: IPreRolls; // 贴片广告（未转换）
    allowTicket: Boolean;
    deadLineToast: string;
    canWatch: boolean; // true，那么仍旧是追番、追剧，如果是false，那么都是想看、已想看
    epList?: any;
    nextEp?: any;
    headTail?: any;
    whitelistToast?: string; // 点映EP观看资格toast标识
    preSaleToast?: Boolean; // 预售购买toast标识
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

function rebuildPlayerExtraParams(player: Player): IPlayerExtraParams | null | any {
    if (typeof player.window['getPlayerExtraParams'] === 'function' && player.config.type !== ContentType.Pugv) {
        const params = player.window['getPlayerExtraParams']();
        if (params) {
            player.config.record = params['record'];
            const recommandList: IRecommendItem[] = [];
            Array.isArray(params['recommend']) &&
                params['recommend'].forEach((item: IRecommendItem) => {
                    recommandList.push({
                        cover: item['cover'],
                        title: item['title'],
                        link: item['link'],
                    });
                });

            /**
             * todo: remove this and change player.config.ad judgement
             * workaround
             */
            if (params['paster']) {
                params['paster']['url'] = params['paster']['url'] || ' ';
            }
            if (typeof params['canWatch'] === 'undefined') {
                params['canWatch'] = true;
            }
            let headTail: IHeadTail | null = null;
            if (params.headTail) {
                headTail = {
                    hasData: false,
                    hasSkip: params.headTail.hasSkip,
                    first: false,
                    head: null,
                    tail: null,
                };
                const op = params.headTail.op;
                const ed = params.headTail.ed;

                if (Array.isArray(op) && (op[0] || op[1])) {
                    headTail.head = op;
                }
                if (Array.isArray(ed) && (ed[0] || ed[1])) {
                    headTail.tail = ed;
                }
                if (headTail.head || headTail.tail) {
                    headTail.first = params.headTail.first;
                    headTail.hasData = true;
                    headTail.hasSkip = true;
                }
            }

            return {
                headTail,
                title: params['title'],
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
                isLike: params['isLike'],
                isCoin: params['isCoin'],
                isPreview: params['isPreview'],
                allowSponsor: params['allowSponsor'],
                sponsorCount: params['sponsorCount'],
                canPlay1080: params['canPlay1080'],
                pubTime: params['pubTime'],
                recommend: recommandList,
                sponsorWeekList: rebuildSponsorList(params['sponsorWeekList']),
                sponsorTotalList: rebuildSponsorList(params['sponsorTotalList']),
                paster: params['paster'],
                epStat: params['epStat'],
                allowTicket: params['allowTicket'],
                deadLineToast: params['deadLineToast'],
                canWatch: params['canWatch'],
                epList: params['epList'],
                nextEp: params['nextEp'],
                whitelistToast: params['whitelistToast'],
                preSaleToast: params['preSaleToast'],
            };
        } else {
            return null;
        }
    } else {
        return null;
    }
}

export default rebuildPlayerExtraParams;
