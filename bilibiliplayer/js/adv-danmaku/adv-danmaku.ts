import AdvDanmaku from '@jsc/adv-danmaku';
import Player, { IReceivedInterface } from '../player';
import PathPicker, { IPathPickerOptionsInterface } from './path-picker';
import STATE from '../player/state';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';

import ApiSendModify, { ApiSendModifyInData, ApiSendModifyOutData } from '../io/api-dm-post';
import ApiVerifyModify, {
    ApiVerifyModifyInData,
    ApiVerifyModifyOutData,
    ApiDataInterface,
} from '../io/api-adv-manager';
import ApiAdvBuy, { ApiAdvBuyInData, ApiAdvBuyOutData } from '../io/api-adv-buy';
import { IDmAnimation } from '../plugins/dm-boom';
interface IManagerOptionsInterface {
    [key: string]: any;
}
interface IPathInterface {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface ITextDataInterface extends Object {
    on?: boolean;
    showed?: boolean;
    border?: number;
    animation?: IDmAnimation;
    dmid: string;
    mode: number;
    size: number;
    date: number;
    class: number;
    stime: number;
    color: number;
    uid: string;
    text: string;
    mid?: string;
    uname?: string;
}
interface IRepackTextDataInterface {
    textData: ITextDataInterface;
}

class AdvDanmakuManager {
    private player: Player;
    private config: IManagerOptionsInterface;
    advDanmaku!: AdvDanmaku;
    pathPicker!: PathPicker;
    advSetting: any = {
        aWay: 1, // 运动方式 1: 起始位置, 2:路径跟随
        isPercent: false, // 是否按百分比选取(舍弃)
        path: [], // 路径
        target: '',
    };
    container: JQuery;

    constructor(player: Player, container: JQuery, config: IManagerOptionsInterface) {
        this.player = player;
        this.config = config;
        this.container = container;
        this.config.container = container[0];
        this.init();
        this.globalEvents();
    }

    private init() {
        const that = this;
        this.advDanmaku = new AdvDanmaku(
            $.extend(
                {
                    getType() {
                        return that.player.setting['config']['type']['toLowerCase']();
                    },
                    setType(type: string) {
                        that.player.setting['config']['type'] = type;
                    },
                    blockJudge(options: any) {
                        return that.player.block.judge(options);
                    },
                    timeSyncFunc() {
                        if (that.player.video) {
                            return that.player.currentTime()! * 1000;
                        } else {
                            return 0;
                        }
                    },
                },
                this.config,
            ),
        );

        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAY, () => this.advDanmaku.play());
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => this.advDanmaku.pause());
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, function (e: JQueryEventObject, obj: { time: number }) {
            that.advDanmaku.seek(obj.time);
        });
    }
    get dmexposure() {
        return this.advDanmaku?.dmexposure || 0;
    }
    private globalEvents() {
        // 217001
        this.player.directiveManager.on(WD.ADM_START_POS_PICKUP.toString(), (e, received: IReceivedInterface) => {
            this.showPathPicker(received['data']);
        });
        // 217002
        this.player.directiveManager.on(WD.ADM_ABORT_POS_PICKUP.toString(), (e, received: IReceivedInterface) => {
            this.hidePathPicker();
        });
        // 217003
        this.player.directiveManager.on(WD.ADM_MOTION_MODE_CHANGE.toString(), (e, received: IReceivedInterface) => {
            this.movementModeChange(received['data']);
        });
        // 217005
        this.player.directiveManager.on(WD.ADM_PREVIEW_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this.testDanmaku(received['data']);
        });
        // 217006
        this.player.directiveManager.on(WD.ADM_SEND_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this.onSend(received['data'], (data: any) => {
                this.player.directiveManager.responder(received, data);
            });
        });
        // 217007
        this.player.directiveManager.on(WD.ADM_VERIFY_PERMISSION.toString(), (e, received: IReceivedInterface) => {
            this.verifyAjax((data: any) => {
                this.player.directiveManager.responder(received, data);
            });
        });
        // 217008
        this.player.directiveManager.on(WD.ADM_REQUEST_PERMISSION.toString(), (e, received: IReceivedInterface) => {
            this.buyVerification((data: any) => {
                this.player.directiveManager.responder(received, data);
            });
        });
    }
    showPathPicker(data: any) {
        this.advSetting.aWay = data['movementMode'] || this.advSetting.aWay;
        this.advSetting.target = data['target'];
        if (this.advSetting.aWay === 2 && this.pathPicker && this.pathPicker.status) {
            this.hidePathPicker();
            return;
        }
        this.advSetting.isPercent = data['activePercent'];
        if (!this.pathPicker) {
            this.pathPicker = new PathPicker(this.container.parent()[0], this.getPathPickerOptions());
        }
        this.pathPicker.update(this.getPathPickerOptions(), true);
    }

    hidePathPicker() {
        this.pathPicker && this.pathPicker.hide();
    }

    movementModeChange(data: any) {
        this.advSetting.aWay = data['movementMode'] || this.advSetting.aWay;
        if (this.pathPicker && this.pathPicker.status) {
            this.pathPicker.update(this.getPathPickerOptions());
        }
        return this;
    }
    percentChange(data: any) {
        this.advSetting.isPercent = data['activePercent'];
        if (this.pathPicker && this.pathPicker.status) {
            this.pathPicker.update(this.getPathPickerOptions());
        }
        return this;
    }
    private getPathPickerOptions(): IPathPickerOptionsInterface {
        const that = this;
        const isPercent = !!that.advSetting.isPercent;
        const isPath = that.advSetting.aWay === 2;
        let onChange;
        if (!isPath) {
            // 起始位置
            onChange = function (val: IPathInterface) {
                that.player.directiveManager.sender(PD.ADM_MOUSE_POS_CHANGE, {
                    x: val.x,
                    y: val.y,
                    w: val.w,
                    h: val.h,
                    target: that.advSetting.target,
                });
            };
        } else {
            // 路径跟随
            onChange = function (val: IPathInterface) {
                that.advSetting.path = val;
            };
        }
        const onHide = () => {
            let val: Record<string, any> = {};
            val['target'] = that.advSetting.target;
            if (isPath) {
                // 路径跟随
                val['path'] = that.advSetting.path;
            }
            that.player.directiveManager.sender(PD.ADM_CLOSE_POS_PICKUP, val);
        };
        return {
            isPercent: isPercent,
            isPath: isPath,
            onChange: onChange,
            onHide: onHide,
        };
    }

    onSend(data: any, callback: Function) {
        const that = this;
        const ctime = this.player.currentTime();
        const progress = data['progress'] * 1000;
        data['progress'] = Math.ceil(progress);
        const info: Partial<ApiSendModifyInData> = {
            type: 1, // 主题类型，1：视频
            oid: that.player.config.cid, // 主题id
            msg: data['msg'], // 弹幕内容
            // aid: that.player.config.aid, // 稿件id
            // bvid: that.player.config.bvid,
            progress: data['progress'], // 弹幕位于视频中的时间点（单位秒）
            color: data['color'], // 弹幕颜色
            fontsize: data['fontsize'], // 字体大小
            pool: 0, // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
            mode: 7, // 弹幕模式：1,4,5,6,7,8,9
            rnd: that.player.pid, // 发送时带的随机数
            plat: 1, // 来源平台
        };
        if (that.player.config.bvid) {
            info.bvid = that.player.config.bvid;
        } else {
            info.aid = that.player.config.aid;
        }
        new ApiSendModify(<ApiSendModifyInData>info).getData({
            success: (result: ApiSendModifyOutData) => {
                if (result && result['code'] === 0 && result['data']['dmid_str']) {
                    const textData = this.getData(data);
                    textData.dmid = result['data']['dmid_str'];
                    that.addDanmaku(textData, progress / 1000 === ctime);
                    that.player.trigger(STATE.EVENT.PLAYER_SEND, { dm: 1 });
                }
                typeof callback === 'function' && callback(result);
            },
            error: (error: JQuery.jqXHR<any>) => {
                typeof callback === 'function' && callback(null);
            },
        });
    }
    testDanmaku(data: any) {
        this.advDanmaku.testDanmaku(this.getData(data));
    }
    remove(dmid: string) {
        this.advDanmaku.remove(dmid);
    }

    private getData(data: any) {
        const textData: ITextDataInterface = {
            stime: data['progress'],
            mode: 7,
            size: data['fontsize'],
            color: data['color'],
            date: 0,
            class: 0,
            uid: '',
            dmid: '',
            text: JSON.parse(data['msg']),
        };
        return textData;
    }
    verifyAjax(callback: Function) {
        const data: Partial<ApiVerifyModifyInData> = {
            cid: this.player.config.cid,
            mode: 'sp',
        };
        if (this.player.config.bvid) {
            data.bvid = this.player.config.bvid;
        } else {
            data.aid = this.player.config.aid;
        }
        new ApiVerifyModify(<ApiVerifyModifyInData>data).getData({
            success: (data: ApiVerifyModifyOutData) => {
                try {
                    typeof callback === 'function' && callback(data);
                } catch (e) {
                    typeof callback === 'function' && callback(data);
                }
            },
        });
    }

    buyVerification(callback: Function) {
        const data: Partial<ApiAdvBuyInData> = {
            cid: this.player.config.cid,
            mode: 'sp',
        };
        if (this.player.config.bvid) {
            data.bvid = this.player.config.bvid;
        } else {
            data.aid = this.player.config.aid;
        }
        new ApiAdvBuy(<ApiAdvBuyInData>data).getData({
            success: (data: ApiAdvBuyOutData) => {
                typeof callback === 'function' && callback(data.result);
            },
            error: (data?: ApiAdvBuyOutData) => {
                typeof callback === 'function' && callback(data?.result || null);
            },
        });
    }

    getsTime() {
        return this.advDanmaku.sTime;
    }

    addDanmaku(textData: ITextDataInterface, render?: boolean) {
        this.advDanmaku.addDanmaku(textData, render);
    }

    danmakuType(type: string) {
        return this.advDanmaku.danmakuType(type);
    }

    exportDanmaku(): HTMLElement {
        return this.advDanmaku.exportDanmaku()!;
    }

    refreshCdmList(value: boolean) {
        this.advDanmaku.refreshCdmList(value);
    }

    play() {
        this.advDanmaku.play();
    }

    pause() {
        this.advDanmaku.pause();
    }

    option(key: any, value: any) {
        this.advDanmaku.option(key, value);
    }

    stop() {
        this.advDanmaku.stop();
    }

    seek(t: number) {
        this.advDanmaku.seek(t);
    }

    resize() {
        this.advDanmaku.resize();
        this.pathPicker && this.pathPicker.reset();
    }

    visible(value: boolean) {
        this.advDanmaku.visible(value);
    }

    clear() {
        this.advDanmaku.clear();
    }

    searchAreaDanmaku(e: any): IRepackTextDataInterface[] {
        return this.advDanmaku.searchAreaDanmaku(e);
    }
}

export default AdvDanmakuManager;
