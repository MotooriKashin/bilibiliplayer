/**
 * User relation opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-弹幕接口文档（新）-用户弹幕举报
 * @class ApiReportModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    cid: number; // 举报弹幕的cid
    dmid: string; // 弹幕id
    reason: number; //  举报理由
    content: number | string | string[]; // 自定义理由
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    cid: number;
    dmid: string;
    reason: number;
    content: number | string | string[];
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    ttl: number;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string;
    ttl: number;
    result: any;
}

class ApiReportModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: Interface.DM_REPORT,
            type: 'post',
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
            cid: data.cid,
            dmid: data.dmid,
            reason: data.reason,
            content: data.content,
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            ttl: result['ttl'],
            result: result,
        };
    }
}

export { IInData as ApiReportModifyInData, IOutData as ApiReportModifyOutData };
export default ApiReportModify;
