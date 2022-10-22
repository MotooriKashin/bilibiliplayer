/**
 * http://bpre-api.bilibili.co/project/1941/interface/api/281403
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number; // 主题id
    cid: number; // 主题id
    bvid: string; // 弹幕id
    ts: number; //
}

interface IResponseData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: {
        total: number;
        count: number;
        show_switch: {
            total: boolean;
            count: boolean;
        };
    };
}
// api-out -> module
interface IOutData {
    total: number;
    count: number;
    showSwitch: {
        total: boolean;
        count: boolean;
    };
}

class ApiOnlineNum extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.onlineNum,
            type: 'get',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                if (result.code === 0) {
                    const data = result.data;
                    config.success?.({
                        total: data?.total || 1,
                        count: data?.count || 1,
                        showSwitch: {
                            total: data?.show_switch?.total,
                            count: data?.show_switch?.count,
                        },
                    });
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}

export { IInData as ApiOnlineNumInData, IOutData as ApiOnlineNumOutData };
export default ApiOnlineNum;
