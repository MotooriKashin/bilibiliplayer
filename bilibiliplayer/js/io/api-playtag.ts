/**
 *
 * @class ApiPlaytag
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number;
    cid: number;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    cid: number;
}

// server-response -> api-out
type IResponseData = [
    string, // cover
    number, // aid
    string, // title
    number, // played
    number, // danmu
    number, // reply
    number, // fav
    string, // duration
    Record<string, any>? // ad
]
// api-out -> module
type IOutData = IResponseData[];

class ApiPlaytag extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: `${URLS.PLAYTAG},${data.cid}-${data.aid}?html5=1`,
            type: 'get',
            dataType: 'json',
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
            },
            success: (result: IResponseData) => {
                config.success?.(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                if (typeof config.error === 'function') {
                    config.error(err);
                }
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            aid: data.aid,
            cid: data.cid,
        };
    }

}

export { IInData as ApiPlaytagInData, IOutData as ApiPlaytagOutData };
export default ApiPlaytag;