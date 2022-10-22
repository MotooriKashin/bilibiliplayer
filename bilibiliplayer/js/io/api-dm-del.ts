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
    oid: number;
    dmid: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message?: string;
    ttl?: number;
}

class ApiDmDel extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_DEL,
            type: 'post',
            data: this.data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                config.success!(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}

export { IInData as ApiDmDelInData, IResponseData as ApiDmDelOutData };
export default ApiDmDel;
