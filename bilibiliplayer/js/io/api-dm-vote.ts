/**
 * User relation opt api
 *
 * @class ApiRecall
 * @extends {Api}
 * http://bpre-api.bilibili.co/project/1461/interface/api/208125
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

interface IInData {
    /**
     *当前投票视频进度
     */
    progress: number;
    aid: number;
    cid: number;
    /**
     *投票弹幕选项
     */
    vote: number;
    /**
     * 投票id
     */
    vote_id: number;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    data: {
        dm: {
            dm_id_str: string;
        };
    };
    message?: string;
    ttl?: number;
}

export default class ApiDmVote extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_VOTE,
            type: 'post',
            data: this.data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                if (result.code === 0) {
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
}

export { IInData as ApiDmVoteData, IResponseData as ApiDmVoteOutData };
