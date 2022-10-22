/**
 * Special and advance danmaku buy
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-弹幕接口文档（新）-购买高级弹幕
 * @class ApiAdvBuy
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    cid: number; // 视频cid
    aid: number; // 视频aid
    bvid: string;
    mode: string; // 'sp' 特殊弹幕 mode7, 'advance' 高级弹幕 mode9
}

// api-in -> server-request
interface IRequestData {
    cid: number;
    aid: number;
    bvid: string;
    mode: string;
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
    result: any;
}

class ApiAdvBuy extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: Interface.ADM_COMMENT_BUY,
            type: 'post',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                if (res && res['code'] === 0) {
                    config.success?.(this.convertResult(res));
                } else {
                    config.error?.(this.convertResult(res));
                }
            },
            error: () => {
                config.error?.();
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            cid: data.cid,
            aid: data.aid,
            bvid: data.bvid,
            mode: data.mode,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            result: result,
        };
    }
}

export { IInData as ApiAdvBuyInData, IOutData as ApiAdvBuyOutData };
export default ApiAdvBuy;
