import Danmaku from './danmaku';
import Player, { IReceivedInterface } from '../player';
import ApiSaDMFilterAdd, { ApiSaDMFilterAddOutData } from '../io/api-sa-dm-filter-add';
import ApiSaDMState, { ApiSaDMStateInData, ApiSaDMStateOutData } from '../io/api-sa-dm-state';
import ApiSaDMPool, { ApiSaDMPoolInData, ApiSaDMPoolOutData } from '../io/api-sa-dm-pool';
import ApiDmProtectApplyModify, {
    ApiDmProtectApplyModifyInData,
    ApiDmProtectApplyModifyOutData,
} from '../io/api-dm-protect-apply';
import ApiReportModify, { ApiReportModifyInData, ApiReportModifyOutData } from '../io/api-dm-report';
import ApiRecall, { ApiRecallInData, ApiRecallOutData } from '../io/api-recall';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

interface IDanmakuData {
    stime: number;
    mode: number;
    size: number;
    color: number;
    date: number;
    class: number;
    uid: string | number;
    dmid: string;
    text: string;
    mid?: number;
    uname?: string;
}
class List {
    private danmaku: Danmaku;
    private player: Player;
    private prefix!: string;
    private isRealName!: boolean;
    danmakuArray: any[];
    dmidApplied: any;
    dmidMoved: any;
    dmidDelted: any;
    loadfailed!: boolean;

    constructor(dw: any) {
        this.player = dw.player;
        this.danmaku = dw;
        this.danmakuArray = dw.danmaku.danmakuArray;
        this.dmidApplied = {};
        this.dmidDelted = {};
        this.dmidMoved = {};
        this.registerListener();
        this._updateInputbar();
    }
    registerListener() {
        // 申请保护弹幕 221007
        this.player.directiveManager.on(WD.DL_REQUEST_PROTECT.toString(), (e, received: IReceivedInterface) => {
            this._applyProtect(received);
        });
        // 删除弹幕
        this.player.directiveManager.on(WD.DL_DELETE_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this._danmakuDelete(received);
        });
        // 保护弹幕
        this.player.directiveManager.on(WD.DL_PROTECT_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this._danmakuProtect(received);
        });
        // 禁言
        this.player.directiveManager.on(WD.DL_FORBID_USER_SEND.toString(), (e, received: IReceivedInterface) => {
            this._danmakuBanned(received);
        });
        // 移动弹幕
        this.player.directiveManager.on(WD.DL_MOVE_DANMAKU.toString(), (e, received: IReceivedInterface) => {
            this._danmakuMove(received);
        });
        // 举报
        this.player.directiveManager.on(WD.DR_SEND_REPORT.toString(), (e, received: IReceivedInterface) => {
            this.postReport(received);
        });
        // 弹幕撤回
        this.player.directiveManager.on(WD.DL_RECALL_DANMAKU.toString(), (e: any, received: IReceivedInterface) => {
            this._danmakuRecall(received);
        });
    }
    _danmakuRecall(received: IReceivedInterface) {
        const data = {
            cid: this.player.config.cid,
            dmid: received['data']['dmid'],
            jsonp: 'jsonp',
        };
        new ApiRecall(<ApiRecallInData>data).getData({
            success: (res: ApiRecallOutData) => {
                if (res && Number(res.code) === 0) {
                    this.danmaku && this.danmaku.remove(data['dmid']);
                }
                this.player.directiveManager.responder(received, res.result);
            },
            error: (xhr: JQuery.jqXHR<any>) => {
                this.player.directiveManager.responder(received, xhr);
            },
        });
    }
    postReport(received: IReceivedInterface) {
        const data = {
            cid: this.player.config.cid,
            dmid: received['data']['dmid'],
            reason: received['data']['reason'],
            content: received['data']['content'],
            jsonp: 'jsonp',
        };
        new ApiReportModify(<ApiReportModifyInData>data).getData({
            success: (data: ApiReportModifyOutData) => {
                this.player.directiveManager.responder(received, data.result);
            },
            error: (error: JQuery.jqXHR<any>) => {
                this.player.directiveManager.responder(received, null);
            },
        });
    }
    private _applyProtect(received: IReceivedInterface) {
        const that = this;
        const datas = received['data'];
        const dmids = datas.map((d: IDanmakuData) => d['dmid']);
        new ApiDmProtectApplyModify(<ApiDmProtectApplyModifyInData>{
            cid: this.player.config.cid,
            dmids: dmids.join(','),
            jsonp: 'jsonp',
        }).getData({
            success: (data: ApiDmProtectApplyModifyOutData) => {
                this.player.directiveManager.responder(received, data.result);
                if (data) {
                    switch (data.code) {
                        case 0:
                        case 36104:
                            dmids.forEach((dmid: string) => {
                                that.dmidApplied[dmid] = true;
                            });
                            break;
                    }
                }
            },
            error: () => {
                this.player.directiveManager.responder(received, null);
            },
            complete: () => { },
        });
    }
    private _danmakuDelete(received: IReceivedInterface) {
        const data = received['data'];
        new ApiSaDMState(<ApiSaDMStateInData>{
            type: 1,
            state: 1,
            oid: this.player.config.cid,
            dmids: this.getdmids(data),
        }).getData({
            success: (json: ApiSaDMStateOutData) => {
                if (json && json.code === 0) {
                    this.player.directiveManager.responder(received, json.result);
                }
            },
            error: () => {
                this.player.directiveManager.responder(received, null);
            },
            complete: () => { },
        });
    }
    private _danmakuProtect(received: IReceivedInterface) {
        const data = received['data'];
        new ApiSaDMState(<ApiSaDMStateInData>{
            type: 1,
            state: 2,
            oid: this.player.config.cid,
            dmids: this.getdmids(data),
        }).getData({
            success: (json: ApiSaDMStateOutData) => {
                this.player.directiveManager.responder(received, json.result);
            },
            error: () => {
                this.player.directiveManager.responder(received, null);
            },
            complete: () => { },
        });
    }
    private _danmakuBanned(received: IReceivedInterface) {
        const data = received['data'];
        new ApiSaDMFilterAdd({
            oid: this.player.config.cid,
            dmid: data['dmid'],
        }).getData({
            success: (json: ApiSaDMFilterAddOutData) => {
                this.player.directiveManager.responder(received, json);
            },
            error: () => {
                this.player.directiveManager.responder(received, null);
            },
        });
    }
    private _danmakuMove(received: IReceivedInterface) {
        const data = received['data'];
        new ApiSaDMPool(<ApiSaDMPoolInData>{
            type: 1,
            pool: 1,
            oid: this.player.config.cid,
            dmids: this.getdmids(data),
        }).getData({
            success: (json: ApiSaDMPoolOutData) => {
                this.player.directiveManager.responder(received, json.result);
            },
            error: () => {
                this.player.directiveManager.responder(received, null);
            },
        });
    }
    private _updateInputbar() {
        const that = this;
        if (!this.isRealName) {
            return;
        }
        const sendbar = this.player.template.sendbar;
        const inputbar = sendbar.find('.' + this.prefix + '-video-inputbar');
        const input = sendbar.find('.' + this.prefix + '-video-danmaku-input');
        const wrap = sendbar.find('.' + this.prefix + '-video-danmaku-wrap');
        this.player.userLoadedCallback(status => {
            const nameInfo = status.name;
            if (typeof nameInfo !== 'string') {
                input.find('.' + that.prefix + '-video-danmaku-uname').remove();
                return true;
            } else {
                if (!input.find('.' + that.prefix + '-video-danmaku-uname').length) {
                    $('<div>')
                        .addClass(that.prefix + '-video-danmaku-uname')
                        .text(nameInfo.split(' ')[0] + '：')
                        .insertBefore(input);
                }
                return true;
            }
        });
    }
    private getdmids(selectedList: IDanmakuData[]) {
        const dmidList = selectedList.map((d) => d['dmid']);
        const dmids = dmidList.join(',');
        return dmids;
    }
    applyProtect(danmakuArray: IDanmakuData[], options: any, callback?: Function) {
        const that = this;
        const dmids: string[] = [];
        let text = '提交申请失败，请稍后重试';
        const sTop = document.documentElement.scrollTop || document.body.scrollTop;
        const sLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
        (Array.isArray(danmakuArray) ? danmakuArray : [danmakuArray]).forEach(function (item) {
            dmids.push(item.dmid);
        });
        return new ApiDmProtectApplyModify(<ApiDmProtectApplyModifyInData>{
            cid: that.player.config.cid,
            dmids: dmids.join(','),
            jsonp: 'jsonp',
        }).getData({
            success: (data: ApiDmProtectApplyModifyOutData) => {
                if (data) {
                    if (!data.code) {
                        text = '申请已提交，请耐心等待UP主审核！';
                        typeof callback === 'function' && callback();
                    } else if (data.message) {
                        text = data.message;
                    }
                    switch (data.code) {
                        case 0:
                        case 36104:
                            dmids.forEach(function (dmid) {
                                that.dmidApplied[dmid] = true;
                            });
                            break;
                    }
                }
            },
            error: () => {
                text = '网络错误，请稍后重试';
            },
            complete: () => {
                new Tooltip({
                    top: options.top + sTop,
                    left: options.left + sLeft - text.length * 12,
                    position: 'top-left',
                    text: text,
                });
            },
        });
    }
    search(dmid: string) {
        this.player.directiveManager.sender(PD.DL_SCROLL_TO_VIEW, {
            dmid: dmid,
        });
    }

    destroy() { }
}

export default List;
