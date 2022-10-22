export interface IPageItem {
    cid?: number;
    title: string;
    duration: number;
    from: string;
    aid: number;
    bvid: string;
    page: number;
    attr: number;
    videoTitle?: string;
}

export interface IListItem {
    aid: number;
    bvid: string;
    type: number;
    title: string;
    pic: string;
    page: number;
    pages: IPageItem[] | null;
    duration: number;
    attr: number;
    ownerMid?: number;
    ownerName?: string;
    ownerFace?: string;
    ownerFollowed?: number;
    play: number;
    danmaku: number;
    reply: number;
    index?: number;
    offset?: number;
}

export type PlaylistDataConverted = IListItem[];

export default function (playlist: any): IListItem[] {
    if (playlist && playlist.length) {
        const list = playlist.map((item: any) => {
            let pages = null;
            if (item['pages']) {
                pages = item['pages'].map((page: any) => {
                    return {
                        cid: page['id'],
                        title: page['title'],
                        duration: page['duration'],
                        from: page['from'],
                        aid: item['id'],
                        bvid: item['bvid'] || item['bv_id'],
                        page: item['page'],
                    };
                });
            } else {
                pages = [
                    {
                        title: item['title'],
                        duration: item['duration'],
                        aid: item['id'],
                        bvid: item['bvid'] || item['bv_id'],
                        page: 1,
                    },
                ];
            }
            return {
                aid: item['id'],
                bvid: item['bvid'] || item['bv_id'],
                type: item['type'],
                title: item['title'],
                pic: item['cover'],
                index: item['index'],
                page: item['page'],
                offset: item['offset'],
                pages: pages,
                duration: item['duration'],
                attr: item['attr'],
                ownerMid: item['upper']['mid'],
                ownerName: item['upper']['name'],
                ownerFace: item['upper']['face'],
                ownerFollowed: item['upper']['followed'],
                play: item['cnt_info']['play'],
                danmaku: item['cnt_info']['danmaku'],
                reply: item['cnt_info']['reply'],
            };
        });
        return list;
    } else {
        return [];
    }
}
