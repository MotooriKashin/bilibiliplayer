// 播单接口文档 http://info.bilibili.co/pages/viewpage.action?pageId=12865059

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    playlistType: number;
    playlistId: number;
}

// api-in -> server-request
interface IRequestData {
    type: number;
    biz_id: number;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: {
        media_count: number;
        upper: {
            mid: number;
        };
    };
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: {
        count: number;
        ownerMid: number;
    };
}

class ApiPlaylistInfo extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.PLAYLIST_INFO,
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
            biz_id: data.playlistId,
        };
        return result;
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            data: {
                count: result.data.media_count,
                ownerMid: result.data.upper.mid,
            },
        };
    }
}

export { IInData as ApiPlaylistInfoInData, IOutData as ApiPlaylistInfoOutData };
export default ApiPlaylistInfo;
