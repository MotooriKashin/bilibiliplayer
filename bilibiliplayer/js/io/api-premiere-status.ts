/**
 * PremiereStatus opt api
 *
 * @description
 * @class ApiPremiereStatus
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    episodeId: number;
}

// api-in -> server-request
interface IRequestData {
    ep_id: number;
}

interface IOutData {
    code: number;
    message: string;
    data: {
        progress: number; // 服务器播放进度，豪秒
        start_time: number; // 起播时间，毫秒
        delay_time: number; // 延迟播放时间，毫秒
        status: number; // 首播状态：1-预热；2-首播中；3-紧急停播；4-已结束
        online_count: number; // 在线人数
        after_premiere_type: number; //首播结束后跳转类型：1-下架；2-转点播
    };
}

class ApiPremiereStatus extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.PREMIERE_STATUS,
            type: 'get',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IOutData) => {
                if (result && result['code'] === 0) {
                    config.success?.(result);
                } else {
                    config.error?.(result);
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            ep_id: data.episodeId,
        };
    }
}

export { IInData as ApiPremiereStatusInData, IOutData as ApiPremiereStatusOutData };
export default ApiPremiereStatus;
