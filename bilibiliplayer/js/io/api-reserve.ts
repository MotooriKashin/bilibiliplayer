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
    sid: string;
    mid: number;
    reserve: boolean;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    ttl: number;
}

class ApiReserve extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        let url = URLS.RESERVE;
        if (!this.data.reserve) {
            url = URLS.UN_RESERVE;
        }
        $.ajax({
            url,
            type: 'post',
            data: {
                sid: this.data.sid,
                mid: this.data.mid,
            },
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

export { IInData as ApiReserveInData, IOutData as ApiReserveOutData };
export default ApiReserve;
