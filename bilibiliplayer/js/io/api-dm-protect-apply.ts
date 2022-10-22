/**
 * User relation opt api
 *
 * @description
 * @class ApiDmProtectApplyModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    cid: number; // 弹幕类型：user
    dmids: string; // 弹幕hash后的id,多个用逗号间隔
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    cid: number;
    dmids: string;
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    ttl?: number;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    result: any;
    ttl?: number; //
}

class ApiDmProtectApplyModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig) {
        const data: IRequestData = this.convertUpload(this.data);

        return $.ajax({
            url: Interface.DM_PROTECT_APPLY,
            type: 'POST',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                config.success?.(this.convertResult(res));
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.();
            },
            complete: () => {
                config.complete?.();
            },
        });
        // return $.ajax({
        //     url: Interface.DM_PROTECT_APPLY,
        //     type: 'POST',
        //     data: data,
        //     xhrFields: {
        //        withCredentials: true,
        //     },
        // }).done((res: IResponseData) => {
        //     config.success1(this.convertResult(res));
        // }).fail(() => {
        //     config.error();
        // }).always(() => {
        //     config.always();
        // }).done((res: IResponseData) => {
        //     config.success2(this.convertResult(res));
        // });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            cid: data.cid,
            dmids: data.dmids,
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

export { IInData as ApiDmProtectApplyModifyInData, IOutData as ApiDmProtectApplyModifyOutData };
export default ApiDmProtectApplyModify;
