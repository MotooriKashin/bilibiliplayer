/**
 * User relation opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3677945
 * @class ApiRelationModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    act: number; // 操作行为 1-添加关注 2-取消关注 3-悄悄关注 4- 取消悄悄关注 5-拉黑 6-取消拉黑 7-删除粉丝
    fid: number; // 其它用户mid
    reSrc: number; // 业务来源 WebPlayer:17
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    act: number;
    fid: number;
    re_src: number;
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

class ApiRelationModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.X_RELATION_MODIFY,
            type: 'post',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
            },
            success: (result: IResponseData) => {
                if (result && result['code'] === 0) {
                    config.success?.(this.convertResult(result));
                } else {
                    config.error?.(result);
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            act: data.act,
            fid: data.fid,
            re_src: data.reSrc,
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

export { IInData as ApiRelationModifyInData, IOutData as ApiRelationModifyOutData };
export default ApiRelationModify;
