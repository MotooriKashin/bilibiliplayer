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
    op: number; // 1： 点赞，  2： 取消点赞
    platform?: string; //  web_player
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    ttl: number;
}

class ApiDmLike extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        this.data.platform = 'web_player';
        $.ajax({
            url: URLS.DM_LIKE,
            type: 'post',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IOutData) => {
                config.success?.(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}

export { IInData as ApiDmLikeInData, IOutData as ApiDmLikeOutData };
export default ApiDmLike;
