import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    type: number;
    oid: number;
    state: number;
    dmids: string;
}

// api-in -> server-request
interface IRequestData extends IInData {
    jsonp: 'jsonp';
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    result: any;
}

class ApiSaDMState extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.SA_DM_STATE,
            type: 'POST',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            dataType: 'json',
            success: (result: any) => {
                config.success?.(this.convertResult(result));
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    /**
     * Convert module-use data to server-request data
     */
    private convertUpload(data: IInData): IRequestData {
        return {
            type: data.type,
            oid: data.oid,
            state: data.state,
            dmids: data.dmids,
            jsonp: 'jsonp',
        };
    }

    /**
     * Convert server-response data to module-use data
     */
    private convertResult(result: any): IOutData | null {
        return result
            ? {
                code: result['code'],
                message: result['message'],
                result: result,
            }
            : null;
    }
}

export { IInData as ApiSaDMStateInData, IOutData as ApiSaDMStateOutData };
export default ApiSaDMState;
