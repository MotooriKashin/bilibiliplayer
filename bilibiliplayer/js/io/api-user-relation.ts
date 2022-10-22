/**
 * Special and advance danmaku buy
 *
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import Interface from './urls';

// module -> api-in
interface IInData {
    mid: number; // 用户id
}

// api-in -> server-request
interface IRequestData {
    mid: number; // 用户id
    jsonp: string;
}

// server-response -> api-out
interface IResponseData {
    code: number;
    message: string;
    data: any;
}

// api-out -> module
interface IOutData {
    attribute: number;
    mid: number;
    mtime: number;
    special: number;
    tag: any;
}

class ApiUserRelation extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: Interface.USER_RELATION,
            type: 'get',
            data: data,
            xhrFields: {
                withCredentials: true,
            },
            success: (res: IResponseData) => {
                if (res && res['code'] === 0) {
                    config.success?.(this.convertResult(res));
                } else {
                    config.error?.(this.convertResult(res));
                }
            },
            error: () => {
                config.error?.();
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            mid: data.mid,
            jsonp: 'jsonp',
        };
    }

    private convertResult(result: IResponseData): IOutData {
        const relation = result.data?.relation || {};
        return {
            attribute: relation.attribute,
            mid: relation.mid,
            mtime: relation.mtime,
            special: relation.special,
            tag: relation.tag,
        };
    }
}

export { IOutData as ApiUserRelationOutData };
export default ApiUserRelation;
