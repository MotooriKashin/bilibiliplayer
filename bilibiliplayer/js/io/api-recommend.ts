/**
 *
 * @class ApiRecommend
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number;
    bvid: string;
}

// api-in -> server-request
interface IRequestData {
    aid: number;
    bvid: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: IOutData[];
    ttl: number;
}
// api-out -> module
interface IOutData {
    aid: number;
    cid: number;
    bvid: string;
    attribute: number;
    copyright: number;
    ctime: number;
    desc: string;
    duration: number;
    dynamic: string;
    owner: any;
    pic: string;
    pubdate: number;
    rights: any;
    stat: any;
    state: number;
    tid: number;
    title: string;
    tname: string;
    videos: number;
}

class ApiRecommend extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.RECOMMEND,
            type: 'get',
            data: data,
            dataType: 'json',
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
            },
            success: (result: IResponseData) => {
                config.success?.(this.convertResult(result));
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
            bvid: data.bvid,
        };
    }

    private convertResult(result: IResponseData): IOutData[] {
        const outArray: IOutData[] = [];
        const data = result['data'] || [];
        for (let i = 0, len = data.length; i < len; i++) {
            const outList: IOutData = {
                aid: data[i]['aid'],
                cid: data[i]['cid'],
                bvid: data[i]['bvid'],
                attribute: data[i]['attribute'],
                copyright: data[i]['copyright'],
                ctime: data[i]['ctime'],
                desc: data[i]['desc'],
                duration: data[i]['duration'],
                dynamic: data[i]['dynamic'],
                owner: data[i]['owner'],
                pic: data[i]['pic'],
                pubdate: data[i]['pubdate'],
                rights: data[i]['rights'],
                stat: data[i]['stat'],
                state: data[i]['state'],
                tid: data[i]['tid'],
                title: data[i]['title'],
                tname: data[i]['tname'],
                videos: data[i]['videos'],
            };
            outArray.push(outList);
        }
        return outArray;
    }
}

export { IInData as ApiRecommendInData, IOutData as ApiRecommendOutData };
export default ApiRecommend;
