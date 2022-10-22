/**
 * User relation opt api
 *
 * @description http://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-弹幕接口文档（新）-批量删除屏蔽
 * @class ApiDmUnblockModify
 * @extends {Api}
 */

import Api from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    ids: string; // 要删除的规则id,多个id之间用,分割
    jsonp: string; // 跨域头支持约定固定值 jsonp
}

// api-in -> server-request
interface IRequestData {
    ids: string;
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
}

class ApiDmUnblockModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData() {
        const data: IRequestData = this.convertUpload(this.data);

        return $.ajax({
            url: Interface.DM_UNBLOCK,
            type: 'POST',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            ids: data.ids,
            jsonp: data.jsonp,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
        };
    }
}

export { IInData as ApiDmUnblockModifyInData, IOutData as ApiDmUnblockModifyOutData };
export default ApiDmUnblockModify;
