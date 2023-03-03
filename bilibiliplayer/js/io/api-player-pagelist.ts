/**
 * User relation opt api
 *
 * @description
 * @class ApiPlayerPagelistModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    url: string; // 请求url后缀
    seasonType: number; // 0：UGC  其他PGC
    async?: boolean; // 是否异步
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    result?: IPGCData[];
    data?: IUGCData[];
    ttl?: number;
}

// api-out -> module
interface IOutData {
    code?: number; // 返回码 0 成功 非0 失败
    message?: string; // 返回信息 0 不用处理
    result?: IPGCData[]; // 视频列表
    data?: IUGCData[]; // 视频列表
    ttl?: number;
}

interface IPGCData {
    title: string;
    avid: number;
    cid: number;
    bvid: string;
    episode_id: number;
    index: string;
    badge: string;
    badge_type: number;
    long_title: string;
    first_formal_ep_link: string;
    is_premiere: number;
    premiere_badge: string;
}

interface IUGCData {
    cid: number;
    page: number;
    from: string;
    part: string;
    duration: number;
    vid: string;
    weblink: string;
}

class ApiPlayerPagelistModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    static parseResult(data: IResponseData): IOutData {
        const result: IPGCData[] = [];
        if (data['result']) {
            const minixs = [];
            if ((<any>data)['result']['main_section'] && Array.isArray((<any>data)['result']['main_section']['episodes'])) {
                minixs.push(...(<any>data)['result']['main_section']['episodes']);
            }
            if (Array.isArray((<any>data)['result']['section'])) {
                (<any>data)['result']['section'].forEach((item: any) => {
                    if (item && Array.isArray(item['episodes'])) {
                        minixs.push(...item['episodes']);
                    }
                });
            }
            minixs.forEach((item: any, i: number) => {
                result.push({
                    title: item['title'],
                    long_title: item['long_title'],
                    badge: item['badge'],
                    badge_type: item['badge_type'],
                    avid: item['aid'],
                    cid: item['cid'],
                    bvid: item['bvid'],
                    episode_id: item['id'],
                    first_formal_ep_link: item['first_formal_ep_link'],
                    is_premiere: item['is_premiere'],
                    premiere_badge: item['premiere_badge'],
                    index: String(i + 1),
                });
            });
        }
        return {
            code: data['code'],
            message: data['message'],
            result: result,
        };
    }

    getData(config: IApiConfig) {
        let url = '';
        if (this.data.seasonType > 0) {
            // 使用bangumi接口，不获取sp列表信息
            url = Interface.BANGUMI_GETEPLIST + this.data.url;
            // url = Interface.WEBAPI_GETEPLIST + this.data.url;
        } else {
            url = Interface.X_PLAYER_PAGELIST + this.data.url;
        }

        return $.ajax({
            url: url,
            type: 'get',
            cache: true,
            async: this.data.async ? this.data.async : true,
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                config.success?.(this.convertResult(res));
            },
            error: () => {
                config.error?.();
            },
        });
    }

    private convertResult(data: IResponseData): IOutData {
        if (this.data.seasonType > 0) {
            return ApiPlayerPagelistModify.parseResult(data);
        }
        return {
            code: data['code'],
            message: data['message'],
            result: data['result'],
            data: data['data'],
            ttl: data['ttl'],
        };
    }
}

export { IInData as ApiPlayerPagelistModifyInData, IOutData as ApiPlayerPagelistModifyOutData };
export default ApiPlayerPagelistModify;
