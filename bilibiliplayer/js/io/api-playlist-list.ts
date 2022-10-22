// 播单接口文档 http://info.bilibili.co/pages/viewpage.action?pageId=12865059

import Api, { IApiConfig } from './api';
import URLS from './urls';
import rebuildPlaylistData, { PlaylistDataConverted } from './rebuild-playlist-data';

// module -> api-in
interface IInData {
    playlistType: number;
    playlistId: number;
    bvid?: string;
    direction?: boolean;
    otype?: number;
}

// api-in -> server-request
interface IRequestData {
    type: number;
    biz_id: number;
    desc?: boolean;
    mobi_app?: string;
    ps?: number;
    bvid?: string;
    direction?: boolean;
    otype?: number;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: {
        media_list: PlaylistDataConverted;
        total_count: number;
        preOffset: number;
        nextOffset: number;
    };
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: {
        mediaList: PlaylistDataConverted;
        total_count: number;
        preOffset: number;
        nextOffset: number;
    };
}

class ApiPlaylistList extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);
        $.ajax({
            url: URLS.PLAYLIST_LIST,
            dataType: 'json',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (result && result['code'] === 0 && result['data']) {
                    if (typeof config.success === 'function') {
                        config.success(this.convertResult(result));
                    }
                } else {
                    if (typeof config.error === 'function') {
                        config.error();
                    }
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                if (typeof config.error === 'function') {
                    config.error(err);
                }
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        const result: IRequestData = {
            type: data.playlistType,
            otype: data.otype,
            biz_id: data.playlistId,
            bvid: data.bvid,
            mobi_app: 'web',
            ps: 20,
            direction: data.direction,
        };
        if (result.type === 2) {
            result.desc = false;
        }
        return result;
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            data: {
                mediaList: rebuildPlaylistData(result.data.media_list),
                total_count: result.data.total_count,
                preOffset: result.data.preOffset,
                nextOffset: result.data.nextOffset,
            },
        };
    }
}

export { IInData as ApiPlaylistListInData, IOutData as ApiPlaylistListOutData };
export default ApiPlaylistList;
