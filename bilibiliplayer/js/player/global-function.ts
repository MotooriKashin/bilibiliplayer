import Player from '../player';
import STATE from './state';
import ApiRelationModify, { ApiRelationModifyInData, ApiRelationModifyOutData } from '../io/api-relation-modify';
import ApiView, { ApiViewInData, ApiViewOutData } from '../io/api-view';
import * as PD from '../const/player-directive';
import { ContentType } from '@jsc/namespace';
export interface IActionStateInterface {
    isFollow: boolean; // 是否关注
    isLike?: boolean; // 是否点赞
    isCollect?: boolean; // 是否收藏
    isCoin?: number; // 是否投币
    isElec?: boolean; // 是否充电
    staffs?: string;
}
export interface IActionStaffInterface {
    name: string; // up主名称
    mid: number; // up主mid
    follow: boolean; // 是否关注
}
class GlobalFunction {
    player: Player;
    videoInfo!: ApiViewOutData;
    videoInfoXHR!: JQuery.jqXHR<any> | null;
    videoInfoCallback: Function[] = [];
    WINDOW_AGENT!: { [key: string]: Function; };

    constructor(player: Player) {
        this.player = player;
        this.definePlayerAgent();
    }
    /**
     * 关注
     * @desc data 接口参数
     * @desc callback 回调 （result: 数据， isPage: 是否来自页面）
     * @desc [showDialog] 是否显示Dialog
     * @desc isPageCallback 是否需要对页面返回的接口数据进行操作
     */
    follow(data: ApiRelationModifyInData, callback: Function, showDialog: boolean = true, isPageCallback?: Function) {
        if (
            typeof this.WINDOW_AGENT.attentionTrigger === 'function' &&
            typeof this.WINDOW_AGENT.getAuthorInfo === 'function'
        ) {
            if (
                showDialog &&
                (this.player.state.mode === STATE.UI_FULL || this.player.state.mode === STATE.UI_WEB_FULL)
            ) {
                this.player.mode(STATE.UI_NORMAL);
            }
            this.player.directiveManager.sender(PD.PI_UGC_FOLLOW, {
                showDialog: showDialog,
                reSrc: data.reSrc,
                success: (state: boolean, result: ApiRelationModifyOutData) => {
                    typeof isPageCallback === 'function' && isPageCallback(result);
                },
                err: (error: JQuery.jqXHR<any>) => {
                    typeof isPageCallback === 'function' && isPageCallback(error);
                },
            });
        } else {
            new ApiRelationModify(<ApiRelationModifyInData>data).getData({
                success: (result: ApiRelationModifyOutData) => {
                    typeof callback === 'function' && callback(result, true);
                },
                error: (error: JQuery.jqXHR<any>) => {
                    typeof callback === 'function' && callback(error, true);
                },
            });
        }
    }
    // 获取video up头像
    getUpImg() {
        return new Promise((res: (value: string) => void) => {
            this.getVideoinfo((videoInfo: ApiViewOutData) => {
                const owner = videoInfo?.owner;
                const url = owner?.face ? owner.face.replace('http://', '//') : '';
                res(url);
            });
        });
    }
    // 获取videoinfo
    getVideoinfo(callback: Function) {
        if (this.videoInfo) {
            callback(this.videoInfo);
        } else {
            this.videoInfoCallback.push(callback);
            if (!this.videoInfoXHR) {
                const data: Partial<ApiViewInData> = {};
                if (this.player.config.bvid) {
                    data.bvid = this.player.config.bvid;
                } else {
                    data.aid = this.player.config.aid;
                }
                if (this.player.config.type === ContentType.Pugv) {
                    data.ep_id = this.player.config.episodeId;
                }
                this.videoInfoXHR = new ApiView(<ApiViewInData>data).getData({
                    success: (data: ApiViewOutData) => {
                        this.videoInfo = data;
                        this.videoInfoGetted(data);
                    },
                    error: () => {
                        this.videoInfoGetted(null);
                    },
                });
            }
        }
    }
    // 获取videoinfo后执行回调队列
    private videoInfoGetted(data: ApiViewOutData | null) {
        this.videoInfoXHR = null;
        while (this.videoInfoCallback.length > 0) {
            const cb = this.videoInfoCallback.shift()!;
            cb(data);
        }
    }
    // 定义PlayerAgent
    private definePlayerAgent() {
        const getPlayerAgentProp = (prop: string) => {
            const agent = window['PlayerAgent'];
            return (agent && agent[<keyof typeof agent>prop]) || this.player.window[<keyof Window>prop];
        };
        this.WINDOW_AGENT = {};
        Object.defineProperties(this.WINDOW_AGENT, {
            attentionTrigger: { enumerable: true, get: getPlayerAgentProp.bind(null, 'attentionTrigger') },
            getAuthorInfo: { enumerable: true, get: getPlayerAgentProp.bind(null, 'getAuthorInfo') },
            elecPlugin: { enumerable: true, get: getPlayerAgentProp.bind(null, 'elecPlugin') },
            objBPPlugin: { enumerable: true, get: getPlayerAgentProp.bind(null, 'objBPPlugin') },
            playerCallSendTriple: { enumerable: true, get: getPlayerAgentProp.bind(null, 'playerCallSendTriple') }, // 三连
            playerCallSendCoin: { enumerable: true, get: getPlayerAgentProp.bind(null, 'playerCallSendCoin') },
            playerCallSendLike: { enumerable: true, get: getPlayerAgentProp.bind(null, 'playerCallSendLike') },
            playerCallSendCollect: { enumerable: true, get: getPlayerAgentProp.bind(null, 'playerCallSendCollect') },
            callBangumiFollow: { enumerable: true, get: getPlayerAgentProp.bind(null, 'callBangumiFollow') },
            getActionState: { enumerable: true, get: getPlayerAgentProp.bind(null, 'getActionState') },
            triggerReload: { enumerable: true, get: getPlayerAgentProp.bind(null, 'triggerReload') },
            toggleBlackSide: { enumerable: true, get: getPlayerAgentProp.bind(null, 'toggleBlackSide') },
            showPay: { enumerable: true, get: getPlayerAgentProp.bind(null, 'showPay') },
            getEpisodes: { enumerable: true, get: getPlayerAgentProp.bind(null, 'getEpisodes') },
            PlayerSetOnline: { enumerable: true, get: getPlayerAgentProp.bind(null, 'PlayerSetOnline') },
            getNextAutoPlayVideo: { enumerable: true, get: getPlayerAgentProp.bind(null, 'getNextAutoPlayVideo') },
            toggleMiniPlayer: { enumerable: true, get: getPlayerAgentProp.bind(null, 'toggleMiniPlayer') },
        });
    }
}

export default GlobalFunction;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        attentionTrigger?: Function;
        elecPlugin?: {
            (...args: any[]): any;
            getElecData?: Function;
            showModal?: Function;
        };
        objBPPlugin?: {
            (...args: any[]): any;
            open?: Function;
        };
        playerCallSendTriple?: Function; // 三连
        playerCallSendCoin?: Function;
        playerCallSendLike?: Function;
        playerCallSendCollect?: Function;
        callBangumiFollow?: Function;
        getActionState?: Function;
        triggerReload?: Function;
        toggleBlackSide?: Function;
        showPay?: Function;
        getEpisodes?: Function;
        getNextAutoPlayVideo?: Function;
        toggleMiniPlayer?: Function;
        getPlayerExtraParams?: Function;
    }
}