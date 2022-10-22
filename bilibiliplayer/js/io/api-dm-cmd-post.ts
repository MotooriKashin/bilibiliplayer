/**
 * User relation opt api
 *
 * @class ApiRecall
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
// api-in -> server-request

interface IInData {
    type: number; // 1: up弹幕   4： combo弹幕
    aid: number;
    cid: number;
    progress: number;
    plat: number; // 设备信息 0:Unknow,1:Web,2:Android,3:IPhone,4:WPM,5:IPAD,6:PadHD,7:WpPC
    data: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message?: string;
    ttl?: number;
    data: {
        id: number;
        oid: number;
        mid: number;
        type: number;
        command: string;
        content: string;
        progress: number;
        state: number;
        extra: string;
        idStr: string;
        // 下面两个是dm pb接口数据
        ctime: string;
        mtime: string;
    };
}
// combo:"{\"comboCount\":12345, \"duration\":12345, \"animationCountOne\":50, \"animationCountTwo\":100, \"animationCountThree\":200}",
// up: "{\"icon\":\"http://i0.hdslb.com/bfs/face/84c97ba73b32f91e7623ed029b830d5e31eeff49.jpg\"}",

class ApiCMDPost extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_COMMAND_POST,
            type: 'post',
            data: this.data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                config.success!(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}

export { IInData as ApiCMDInData, IResponseData as ApiCMDOutData };
export default ApiCMDPost;
