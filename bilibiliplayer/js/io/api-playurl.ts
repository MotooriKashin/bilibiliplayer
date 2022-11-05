import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    avid: number;
    cid: number;
    bvid: string;
    qn: number;
    type: string;
    fnver: number;
    fnval: number;
    episodeId?: number;
    session?: string;
    fourk?: number;
    pugv?: boolean;
}

// api-in -> server-request
interface IRequestData {
    avid: number;
    cid: number;
    bvid: string;
    qn: number;
    type: string;
    otype: string;
    fnver?: number;
    fnval?: number;
    episodeId?: number;
    session?: string;
    fourk?: number;

    ep_id?: number;

    from_client: 'BROWSER' | 'PC_APP';
    drm_tech_type: 2 | 3;
}

// server-response -> api-out
interface IOutData {
    code: number;
    message: string;
    ttl?: number;
    data?: {
        from: string;
        result: string;
        message: string;
        quality: number;
        format: string;
        timelength: number;
        accept_format: string;
        accept_description: string[];
        accept_quality: number[];
        video_codecid: number;
        seek_param: string;
        seek_type: string;
        durl: IDurlInterface[];
        has_paid?: boolean;
        status?: number;
        vip_type?: number;
        vip_status?: number;
        bp?: number;
        support_formats?: ISupportInterface[];
    };
}
interface ISupportInterface {
    quality: number;
    format: string;
    description: string;
    display_desc: string;
    superscript: string;
}
interface IDurlInterface {
    order: number;
    length: number;
    size: number;
    ahead: string;
    vhead: string;
    url: string;
    backup_url?: string[];
}

class ApiPlayurl extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);
        if (window['__playurlMap__'] && window['__playurlMap__'][data.cid]) {
            setTimeout(() => {
                if (typeof config.success === 'function') {
                    config.success(window['__playurlMap__']![data.cid]);
                    delete window['__playurlMap__'];
                }
            });
            return;
        }
        $.ajax({
            url: config.url || URLS.PLAYURL,
            dataType: 'json',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (typeof config.success === 'function') {
                    config.success(this.convertResult(result, config.url!), config.url || URLS.PLAYURL);
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                if (typeof config.error === 'function') {
                    config.error(err, config.url || URLS.PLAYURL);
                }
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        const uploadData: IRequestData = {
            avid: data.avid,
            cid: data.cid,
            bvid: data.bvid,
            qn: data.qn,
            type: data.type,
            otype: 'json',
            // DRM fields
            from_client: 'BROWSER',
            drm_tech_type: 2
        };
        if (data.episodeId) {
            uploadData['ep_id'] = data.episodeId;
        }
        if (data.fourk) {
            uploadData['fourk'] = data.fourk;
        }
        if (typeof data.fnver === 'number') {
            uploadData['fnver'] = data.fnver;
            uploadData['fnval'] = data.fnval;
            uploadData['session'] = data.session;
        }
        return uploadData;
    }

    private convertResult(r: any, requestUrl: string): IOutData | null {
        // 内部接口返回的数据结构依然和 interface 一样，这里的判断就是用于兼容旧的数据结构
        const isInnerPlayurl = requestUrl === URLS.PLAYURL_INNER;
        if (isInnerPlayurl) {
            const result: IOutData = { code: -1, ttl: 0, message: 'Unknow error' };
            if (r) {
                result.code = 0;
                result.message = '';
                result.data = r;
            }
            return result;
        }

        const isPGC = requestUrl === URLS.PLAYURL_PGC;
        const bodyKey = isPGC ? 'result' : 'data';
        if (r) {
            if (r[bodyKey]) {
                return {
                    code: r['code'],
                    message: r['message'],
                    ttl: r['ttl'],
                    data: r[bodyKey],
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

export { IInData as ApiPlayurlInData, IOutData as ApiPlayurlOutData };
export default ApiPlayurl;
