/**
 * User relation opt api
 *
 * @class ApiAdVideo
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';
// module -> api-in
interface IInData {
    ts?: number; //	发生修改时间(发接口必传)
    dm_switch?: boolean; //	是否开启弹幕
    ai_switch?: boolean; //	AI 智能推荐弹幕，是否开启
    ai_level?: number; // 智能推荐弹幕，屏蔽等级
    blocktop?: boolean; //	是否屏蔽顶端弹幕
    blockscroll?: boolean; //是否屏蔽滚动弹幕
    blockbottom?: boolean; //是否屏蔽底端弹幕
    blockcolor?: boolean; //是否屏蔽彩色弹幕
    blockspecial?: boolean; //是否屏蔽高级弹幕
    preventshade?: boolean; //是否开启防挡字幕
    dmask?: boolean; //	是否开启弹幕蒙版
    opacity?: number; //弹幕不透明度百分比
    dm_area?: number; //弹幕显示区域
    speedplus?: number; //弹幕速度
    fontsize?: number; //弹幕大小
    screensync?: boolean; //弹幕是否根据屏幕变化
    speedsync?: boolean; //	弹幕是否同步视频速度
    fontfamily?: string; //弹幕字体
    bold?: boolean; //弹幕是否加粗
    fontborder?: number; //弹幕描边
    draw_type?: string; //弹幕渲染类型
}

interface IResponseData {
    code: number;
    message: string;
    ttl: number;
}

// api-out -> module
interface IOutData {
    code: number;
    message: string;
    ttl: number;
}

class ApiDmSetting extends Api {
    constructor(data: IInData) {
        super(data);
    }
    getData(config: IApiConfig): void {
        $.ajax({
            url: URLS.DM_SETTING,
            type: 'post',
            data: this.data,
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IResponseData) => {
                config.success?.(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}
export { IInData as ApiDmSettingInData, IOutData as ApiDmSettingOutData };
export default ApiDmSetting;
