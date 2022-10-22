import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number;
    cid: number;
    bvid: string;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    cid: number;
    bvid: string;
    jsonp: string;
}

// server-response -> api-out
interface IOutData {
    code: number;
    message: string;
    data?: {
        from: string;
        ts: number;
        aid: number;
        cid: number;
        bvid: string;
        mid: number;
        vip: number;
        svip: number;
        owner: number;
        fcs: string;
        token: string;
    };
}

// api-out -> module

class ApiPlayurlToken extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: `${URLS.PLAYURL_TOKEN}`,
            dataType: 'json',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (typeof config.success === 'function') {
                    config.success(this.convertResult(result));
                }
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
            bvid: data.bvid,
            jsonp: 'jsonp',
        };
    }

    private convertResult(r: any): IOutData | null {
        if (r) {
            if (r['data']) {
                const d = r['data'];
                return {
                    code: r['code'],
                    data: {
                        from: d['from'],
                        ts: d['ts'],
                        aid: d['aid'],
                        cid: d['cid'],
                        bvid: d['bvid'],
                        mid: d['mid'],
                        vip: d['vip'],
                        svip: d['svip'],
                        owner: d['owner'],
                        fcs: d['fcs'],
                        token: d['token'],
                    },
                    message: r['message'],
                };
            } else {
                return {
                    code: r['code'],
                    message: r['message'],
                };
            }
        } else {
            return null;
        }
    }
}

export { IInData as ApiPlayurlTokenInData, IOutData as ApiPlayurlTokenOutData };
export default ApiPlayurlToken;
