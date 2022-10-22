/**
 * User relation opt api
 *
 * @class ApiRecall
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
// api-in -> server-request

interface IInData {
    cid: number;
    dmid: string;
    jsonp: string;
}

interface IRequestData {
    cid: number;
    dmid: string;
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
    code: number;
    message: string;
    ttl: number;
    result: any;
}

class ApiRecall extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.DM_RECALL,
            type: 'post',
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
            cid: data.cid,
            dmid: data.dmid,
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

export { IInData as ApiRecallInData, IOutData as ApiRecallOutData };
export default ApiRecall;
