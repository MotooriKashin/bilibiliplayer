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
    type: number; // 主题类型，1：视频
    oid: number; // 主题id
    msg: string; // 弹幕内容
    aid: number; // 稿件id
    bvid: string;
    progress: number; // 弹幕位于视频中的时间点（单位毫秒）
    color: number; // 弹幕颜色
    fontsize: number; // 字体大小
    pool: number; // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
    mode: number; // 弹幕模式：1,4,5,6,7,8,9
    rnd: number; // 发送时带的随机数
    plat: number; // 0:Unknow,1:Web,2:Android,3:IPhone,4:WPM,5:IPAD,6:PadHD,7:WpPC
}

// api-in -> server-request
interface IRequestData {
    type: number;
    oid: number;
    msg: string;
    aid: number;
    bvid: string;
    progress: number;
    color: number;
    fontsize: number;
    pool: number;
    mode: number;
    rnd: number;
    plat: number;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    ttl: number;
    data: {
        dmid: number;
        dmid_str: string;
        visible: boolean;
        action: string;
    };
}

class ApiSendModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        // const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.DM_POST,
            type: 'post',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IOutData) => {
                config.success?.(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    // private convertUpload(data: IInData): IRequestData {
    //     return {
    //         'type': data.type,
    //         'oid': data.oid,
    //         'msg': data.msg,
    //         'aid': data.aid,
    //         'progress': data.progress,
    //         'color': data.color,
    //         'fontsize': data.fontsize,
    //         'pool': data.pool,
    //         'mode': data.mode,
    //         'rnd': data.rnd,
    //         'plat': data.plat,
    //     };
    // }
}

export { IInData as ApiSendModifyInData, IOutData as ApiSendModifyOutData };
export default ApiSendModify;
