/**
 * User relation opt api
 * // http://bpre-api.bilibili.co/project/1941/interface/api/189893
 * @class ApiJumpCard
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';
// module -> api-in
interface IInData {
    id: number;
    oid_type: number;
    oid: number;
    pid?: any;
    action?: number;
}

interface IRequestData {
    id: number;
    oid_type: number;
    oid: number;
    pid?: any;
    action?: number;
}

// api-in -> server-request

interface IResponseData {
    code: number;
    data: object;
    message: string;
    ttl: number;
}

// api-out -> module
interface IOutData {
    code: number;
    data: object;
    message: string;
    ttl: number;
}

class ApiJumpCard extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);
        $.ajax({
            url: URLS.JUMPCARD,
            type: 'post',
            data: {
                id: data.id,
                oid_type: data.oid_type,
                oid: data.oid,
                pid: data.pid,
                action: data.action,
            },
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
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
            id: data.id,
            oid_type: data.oid_type,
            oid: data.oid,
            pid: data.pid,
            action: data.action,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        // data数组的IO涉及到其他模块所以暂时先不转
        // const listArray: IOutArrayList[] = [];
        // for (let i = 0; i < result['data'].length; i++) {
        //     const curList: IOutArrayList = {
        //         aid: result['data'][i]['aid'],
        //         cid: result['data'][i]['cid'],
        //         name: result['data'][i]['name'],
        //         skipable: result['data'][i]['skipable'],
        //         strategy: result['data'][i]['strategy'],
        //         url: result['data'][i]['url'],
        //     };
        //     listArray.push(curList);
        // }
        return {
            code: result['code'],
            data: result['data'],
            message: result['message'],
            ttl: result['ttl'],
        };
    }
}
export { IInData as ApiJumpCardInData, IOutData as ApiJumpCardOutData };
export default ApiJumpCard;
