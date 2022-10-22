/**
 * User relation opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-弹幕接口文档（新）-用户弹幕举报
 * @class ApiFeedbackModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    cid: number;
    sid: number; // 字幕 id
    tid: number;
    from: number;
    to: number;
    content: string;
    metadata: string;
}

// api-in -> server-request
interface IRequestData {
    oid: number;
    subtitle_id: number; // 字幕 id
    tid: number;
    from: number;
    to: number;
    content: string;
    metadata: string;
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
}

class ApiFeedbackModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: Interface.SM_FEEDBACK,
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
            oid: data.cid,
            subtitle_id: data.sid,
            tid: data.tid,
            content: data.content,
            from: data.from,
            to: data.to,
            metadata: data.metadata,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            ttl: result['ttl'],
        };
    }
}

export { IInData as ApiFeedbackModifyInData, IOutData as ApiFeedbackModifyOutData };
export default ApiFeedbackModify;
