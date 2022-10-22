/**
 * User relation opt api
 *
 * @description
 * @class ApiVerifyModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    cid: number; // 弹幕的cid
    aid: number;
    bvid: string;
    mode: string; // 'sp'
}

// api-in -> server-request
interface IRequestData {
    cid: number;
    aid: number;
    bvid: string;
    mode: string;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: IDataInterface;
}

interface IDataInterface {
    hasBuy: boolean;
    confirm: string;
    accept: boolean;
    coins?: number;
}

class ApiVerifyModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: Interface.ADM_COMMENT,
            type: 'get',
            data: data,
            dataType: 'html',
            xhrFields: {
                withCredentials: true,
            },
            success: (res: string) => {
                config.success?.(this.convertResult(JSON.parse(res)));
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

    private convertResult(result: IOutData): IOutData {
        const data: any = result['data'] ? result['data'] : {};
        return {
            code: result['code'],
            message: result['message'],
            data: {
                hasBuy: data['hasBuy'],
                confirm: data['confirm'],
                accept: data['accept'],
                coins: data['coins'],
            },
        };
    }
}

export { IInData as ApiVerifyModifyInData, IOutData as ApiVerifyModifyOutData, IDataInterface as ApiDataInterface };
export default ApiVerifyModify;
