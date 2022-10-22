/**
 * User relation opt api
 *
 * @description http://bpre-api.bilibili.co/project/1531/interface/api/349989
 *
 * 透传调用： https://info.bilibili.co/pages/viewpage.action?pageId=305620330
 * @extends {Api}
 */

import Interface from './urls';

// module -> api-in
interface IInData {
    /**  寻宝球id */
    item_id: number;
    mid: number; //
    /**  答案，寻宝球为答题领取时必填 */
    answer?: string;
}

export interface IOutDmAdGet {
    code: number; // 返回码 0 成功 非0 失败
    message: string;
    /**领取结果，1：成功，2：答案错误，3：活动未开始，4：活动已结束，5：寻宝球不存在 */
    result: number;
}

export function dmAdGet(params: IInData): Promise<IOutDmAdGet> {
    const data = {
        /** 业务场景 1商业答题卡 */
        business: 1,
        params: JSON.stringify(params),
    };

    return new Promise((resolve) => {
        $.ajax({
            url: Interface.DM_AD_GET,
            type: 'post',
            data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (res: any) => {
                resolve(convertResult(res || {}));
            },
            error: (err: JQuery.jqXHR<any>) => {
                resolve(err);
            },
        });
    });
}

function convertResult(res: any): IOutDmAdGet {
    return {
        code: res.code,
        message: res.message,
        result: res.data?.receive_result,
    };
}
