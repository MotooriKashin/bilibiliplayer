/**
 * User relation opt api
 *
 * @description
 * @class ApiDmBlockModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    type: string; // 屏蔽规则类型,0:文本，1:正则，2:用户
    filter: string; // 屏蔽规则内容,filter1,filter2,filter3
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    type: string;
    filter: string;
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: IDatas;
    ttl: number;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: IDatas;
    ttl: number;
    result: any;
}

interface IDatas {
    comment: string;
    filter: string;
    id: number;
    mid: number;
    type: number;
}

class ApiDmBlockModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig) {
        const data: IRequestData = this.convertUpload(this.data);

        return $.ajax({
            url: Interface.DM_BLOCK,
            type: 'POST',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                config.success?.(this.convertResult(res));
            },
            error: (error: any) => {
                config.error?.(error);
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            type: data.type,
            filter: data.filter,
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            data: result['data'],
            ttl: result['ttl'],
            result: result,
        };
    }
}

export { IInData as ApiDmBlockModifyInData, IOutData as ApiDmBlockModifyOutData };
export default ApiDmBlockModify;
