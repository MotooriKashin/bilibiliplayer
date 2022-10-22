/**
 * User relation opt api
 *
 * @description
 * @class ApiPlayurlAudio
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number; // 单曲id
    bvid: string;
    privilege: number; // 1:下载 2:收听
    quality: number; // 0:流畅 1:标准 2:高音质 3:无损
}

// api-in -> server-request
interface IRequestData {
    sid: number | string;
    privilege: number;
    quality: number;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    msg: string;
    data: IAudioUrlDataInterface;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    msg: string; // 返回信息 0 不用处理
    data: IAudioUrlDataInterface;
}

export interface IAudioUrlDataInterface {
    timeout: number;
    cdns: string[];
}

class ApiPlayurlAudio extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.PLAYURL_AUDIO,
            dataType: 'json',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (result['code'] === 0 && result['data']) {
                    if (typeof config.success === 'function') {
                        config.success(this.convertResult(result), URLS.PLAYURL_AUDIO);
                    }
                } else {
                    if (typeof config.error === 'function') {
                        config.error(null, URLS.PLAYURL_AUDIO);
                    }
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                if (typeof config.error === 'function') {
                    config.error(err, URLS.PLAYURL_AUDIO);
                }
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            sid: data.bvid || data.aid,
            privilege: data.privilege,
            quality: data.privilege,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            msg: result['msg'],
            data: {
                cdns: result['data']['cdns'],
                timeout: result['data']['timeout'],
            },
        };
    }
}

export { IInData as ApiPlayurlAudioInData, IOutData as ApiPlayurlAudioOutData };
export default ApiPlayurlAudio;
