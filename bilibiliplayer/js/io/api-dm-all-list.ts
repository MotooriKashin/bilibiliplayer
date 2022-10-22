/**
 * User relation opt api
 *
 * @description
 * @class ApiDmAllListModify
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import DanmakuLoader from '../player/danmaku-loader';
// module -> api-in
interface IInData {
    url: string; // 请求url字段
}

// api-out -> module
interface IOutData {
    code: number; // 返回码 0 成功 非0 失败
    message: string; // 返回信息 0 不用处理
    danmakuArray: IDanmakuData[]; // 所有弹幕
    total: number; // 最大限制
    loadTime: number; // xhr时间
    parseTime: number; // parse时间
    state: number; // 1:系统关闭了这个视频的弹幕功能, 0:正常, 2: 弹幕关闭
    raw?: string; // 弹幕的原始XML
    sendTip?: string; // state为2时，send文案
    textSide?: string; // state为2时，右侧文案
}

// api-out -> danmakuData
interface IDanmakuData {
    stime: number;
    mode: number;
    size: number;
    color: number;
    date: number;
    class: number;
    uid: string;
    dmid: string;
    text: string;
    uname?: string;
    mid?: number;
}

class ApiDmAllListModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        DanmakuLoader.load(this.data.url, {
            successCallback: (
                danmakuArray: IDanmakuData[],
                total: number,
                loadTime: number,
                parseTime: number,
                state: number,
                raw: string,
                sendTip: string,
                textSide: string,
            ) => {
                config.success?.(
                    this.convertResult(danmakuArray, total, loadTime, parseTime, state, raw, sendTip, textSide),
                );
            },
            failedCallback: (error?: any, data?: any) => {
                config.error?.(error, data);
            },
            withCredentials: this.data.withCredentials,
        });
    }

    private convertResult(
        danmakuArray: IDanmakuData[],
        total: number,
        loadTime: number,
        parseTime: number,
        state: number,
        raw?: string,
        sendTip?: string,
        textSide?: string,
    ): IOutData {
        return {
            code: 0,
            message: '1',
            danmakuArray: danmakuArray,
            total: total,
            loadTime: loadTime,
            parseTime: parseTime,
            state: state,
            raw: raw,
            sendTip: sendTip,
            textSide: textSide,
        };
    }
}

export { IInData as ApiDmAllListModifyInData, IOutData as ApiDmAllListModifyOutData };
export default ApiDmAllListModify;
