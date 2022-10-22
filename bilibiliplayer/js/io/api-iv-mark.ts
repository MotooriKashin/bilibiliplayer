import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number; // 视频aid
    bvid: string;
    mark: number; // 评分
}

// api-in -> server-request
interface IRequestData {
    aid: number; // 视频aid
    bvid: string;
    mark: number; // 评分
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

class ApiIvMark extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);

        $.ajax({
            url: URLS.IV_MARK,
            type: 'post',
            data: data,
            dataType: 'json',
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
            aid: data.aid,
            bvid: data.bvid,
            mark: data.mark,
        };
    }

    private convertResult(result: IResponseData): IOutData {
        return {
            code: result['code'],
            message: result['message'],
        };
    }
}

export { IInData as ApiIvMarkInData, IOutData as ApiIvMarkOutData };
export default ApiIvMark;
