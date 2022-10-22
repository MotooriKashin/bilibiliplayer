/**
 * User relation opt api
 *
 * @description
 * @class ApiDmBlockListModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    ttl: number;
    data: any;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    ttl: number;
    data: any;
    result: any;
}

class ApiDmBlockListModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.DM_BLOCKLIST,
            type: 'get',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                config.success?.(this.convertResult(result));
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            ttl: result['ttl'],
            data: result['data'],
            result: result,
        };
    }
}

export { IInData as ApiDmBlockListModifyInData, IOutData as ApiDmBlockListModifyOutData };
export default ApiDmBlockListModify;
