/**
 * User relation opt api
 *
 * @description
 * @class ApiDateModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';

// module -> api-in
interface IInData {
    url: string; // 请求url
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    data: string[]; // 返回数据
}

interface IResData {
    code: number;
    message: string;
    data: string[];
}

class ApiDateModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): JQueryXHR {
        return $.ajax({
            url: this.data.url,
            type: 'get',
            xhrFields: {
                withCredentials: true,
            },
            dataType: 'json',
            success: (res: IResData) => {
                config.success?.(this.convertResult(res));
            },
            error: (error) => {
                config.error?.(error);
            },
        });
    }

    private convertResult(result: IResData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
            data: result['data'],
        };
    }
}

export { IInData as ApiDateModifyInData, IOutData as ApiDateModifyOutData };
export default ApiDateModify;
