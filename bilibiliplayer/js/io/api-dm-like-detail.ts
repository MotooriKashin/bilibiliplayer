/**
 * User relation opt api
 *
 * @description
 * @class ApiSendModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    oid: number; // 主题id
    dmid: string; // 弹幕id
}

// api-out -> module
interface IOutData {
    likes: { num: number; liked: boolean };
    dmid: string;
    mode: number;
    stime: number;
    text: string;
    color: number;
    size: number;
    class: number;
    pool: number;
    cid?: number;
    type?: number;
    attr?: number;
}

class ApiDmLikeDetail extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_LIKE_INFO,
            type: 'get',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (result.code === 0 && result.data) {
                    config.success?.(this.convertResult(result.data));
                } else {
                    config.error?.(result);
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
    private convertResult(data: any): IOutData {
        return {
            likes: { num: data.likes || 1, liked: Boolean(data.user_like) },
            dmid: data.dmid_str,
            // mode: 6,
            mode: data.mode,
            color: data.color,
            class: data.pool,
            pool: data.pool,
            size: data.font_size,
            stime: data.progress / 1000 || 0,
            text: data.msg || '',
        };
    }
}

export { IInData as ApiDmLikeDetailInData, IOutData as ApiDmLikeDetailOutData };
export default ApiDmLikeDetail;
