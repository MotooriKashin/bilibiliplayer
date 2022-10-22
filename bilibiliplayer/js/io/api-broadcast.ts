/**
 * Broadcast opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=9640211
 * @class ApiBroadcastModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    platform: string; // 标注平台 android\ios\web
}

// api-in -> server-request
interface IRequestData {
    platform: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    data: {
        domain: string;
        tcp_port: number;
        ws_port: number;
        wss_port: number;
        heartbeat: number; // 秒
        heartbeat_max: number; // 最大心跳周期数
        nodes: string[];
        // delay = base_delay * math.Pow(factor + jitter * (random.Float()*2-1); retries)
        backoff: {
            max_delay: number; // 最大重试间隔，秒
            base_delay: number; // 初始重试间隔，秒
            factor: number; // 间隔递增
            jitter: number; // 间隔抖动
        };
    };
}

// api-out -> module
interface IOutData {
    code: number;
    data: {
        domain: string;
        tcp_port: number;
        ws_port: number;
        wss_port: number;
        wss_port_v2?: number; // pb port
        heartbeat: number; // 秒
        heartbeat_max: number; // 最大心跳周期数
        nodes: string[];
        // delay = base_delay * math.Pow(factor + jitter * (random.Float()*2-1); retries)
        backoff: {
            max_delay: number; // 最大重试间隔，秒
            base_delay: number; // 初始重试间隔，秒
            factor: number; // 间隔递增
            jitter: number; // 间隔抖动
        };
    };
}

class ApiBroadcastModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.BROADCAST_GET,
            type: 'get',
            data: data,
            // xhrFields: {
            //     withCredentials: true,
            // },
            success: (result: IResponseData) => {
                if (result && result['code'] === 0) {
                    config.success?.(this.convertResult(result));
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
            platform: data.platform,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        const data = result['data'] || {};
        const backoff = data['backoff'] || {};
        return {
            code: result['code'],
            data: {
                domain: data['domain'],
                tcp_port: data['tcp_port'],
                ws_port: data['ws_port'],
                wss_port: data['wss_port'],
                heartbeat: data['heartbeat'],
                heartbeat_max: data['heartbeat_max'],
                nodes: data['nodes'],
                backoff: {
                    max_delay: backoff['max_delay'],
                    base_delay: backoff['base_delay'],
                    factor: backoff['factor'],
                    jitter: backoff['jitter'],
                },
            },
        };
    }
}

export { IInData as ApiBroadcastModifyInData, IOutData as ApiBroadcastModifyOutData };
export default ApiBroadcastModify;
