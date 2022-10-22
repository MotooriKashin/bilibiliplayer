/**
 * User relation opt api
 *
 * @description
 * @class ApiSendModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    oid: number; // 主题id
    ids: string; //	逗号分隔的dmid（目前只取一条弹幕，不传多个
}

// api-out -> module
interface IOutData {
    num: number;
    liked: boolean; // 用户是否点赞，
}

class ApiDmLikeStats extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_LIKE_STATS,
            type: 'get',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: any) => {
                if (result.code === 0) {
                    config.success?.(this.convertResult(result));
                } else {
                    config.error?.();
                }
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
    private convertResult(result: any): IOutData | null {
        // 目前只取一条弹幕
        const data = result?.data;
        if (data) {
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (data[key].id_str === this.data.ids) {
                        return {
                            num: data[key].likes,
                            liked: Boolean(data[key].user_like), // 0: 用户点赞， 1： 已点赞
                        };
                    }
                }
            }
        }
        return null;
    }
}

export { IInData as ApiDmLikeStatsInData, IOutData as ApiDmLikeStatsOutData };
export default ApiDmLikeStats;
