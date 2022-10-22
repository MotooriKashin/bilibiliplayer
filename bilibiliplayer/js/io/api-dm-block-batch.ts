/**
 * User relation opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3681657#id-主站API文档-批量添加弹幕屏蔽的功能.1
 * @class ApiDmlockBatchModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    type: number; // 弹幕类型：user
    filters: string; // 弹幕hash后的id,多个用逗号间隔
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    type: number;
    filters: string;
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
}

class ApiDmlockBatchModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData() {
        const data: IRequestData = this.convertUpload(this.data);

        return $.ajax({
            url: Interface.DM_BLOCK_BATCH,
            type: 'POST',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            type: data.type,
            filters: data.filters,
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
        };
    }
}

export { IInData as ApiDmlockBatchModifyInData, IOutData as ApiDmlockBatchModifyOutData };
export default ApiDmlockBatchModify;
