/**
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    oid: number;
    dmid: string;
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    result: any;
}

class ApiSaDMFilterAdd extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.SA_DM_FILTER_ADD,
            type: 'POST',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            dataType: 'json',
        })
            .done((data) => {
                if (typeof config.success === 'function') {
                    config.success(data);
                }
            })
            .fail(() => {
                if (typeof config.error === 'function') {
                    config.error();
                }
            });
    }
}

export { IInData as ApiSaDMFilterAddInData, IOutData as ApiSaDMFilterAddOutData };
export default ApiSaDMFilterAdd;
