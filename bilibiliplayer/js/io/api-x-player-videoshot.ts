/**
 * User relation opt api
 *
 * @class ApiPlayerVideoShot
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number;
    cid: number;
    bvid: string;
    index: number;
    jsonp: string;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    cid: number;
    bvid: string;
    index: number;
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    data?: {
        pvdata: string;
        img_x_len: number;
        img_y_len: number;
        img_x_size: number;
        img_y_size: number;
        image: string[];
        index: number[];
    };
    message: string;
    ttl: number;
}

// api-out -> module
interface IOutData {
    code: number;
    data?: {
        pvdata: string;
        imgXlen: number;
        imgYlen: number;
        imgXsize: number;
        imgYsize: number;
        image: string[];
    };
    message: string;
    ttl: number;
}

class ApiPlayerVideoShot extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.X_PLAYER_VIDEOSHOT,
            type: 'get',
            data: data,
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
            aid: data.aid,
            cid: data.cid,
            bvid: data.bvid,
            index: data.index,
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        const responseData: IOutData = {
            code: result['code'],
            message: result['message'],
            ttl: result['ttl'],
        };
        if (result['data']) {
            responseData.data = {
                pvdata: result['data']['pvdata'],
                imgXlen: result['data']['img_x_len'],
                imgYlen: result['data']['img_y_len'],
                imgXsize: result['data']['img_x_size'],
                imgYsize: result['data']['img_y_size'],
                image: result['data']['image'],
            };
        }
        return responseData;
    }
}

export { IInData as ApiPlayerVideoShotInData, IOutData as ApiPlayerVideoShotOutData };
export default ApiPlayerVideoShot;
