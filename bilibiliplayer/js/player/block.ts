import STATE from './state';
import Player, { IReceivedInterface } from '../player';
import ApiDmBlockModify, { ApiDmBlockModifyInData, ApiDmBlockModifyOutData } from '../io/api-dm-block';
import ApiDmBlockListModify, {
    ApiDmBlockListModifyInData,
    ApiDmBlockListModifyOutData,
} from '../io/api-dm-block-list';
import ApiDmUnblockModify, { ApiDmUnblockModifyInData } from '../io/api-dm-unblock';
import ApiDmlockBatchModify, { ApiDmlockBatchModifyInData } from '../io/api-dm-block-batch';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import { logger } from '../plugins/internal-logger';
import { colorFromInt } from '@shared/utils';
import { BILIBILI_PLAYER_SETTINGS } from './settings';

export interface IBlockListItemInterface {
    id: number;
    s: boolean; // 是否启用
    t: number | string; // 类型,0:keyword,1:regexp,2:user
    v: string; // 值
}
class Block {
    private player: Player;
    private config: BILIBILI_PLAYER_SETTINGS;
    private block: any = {};
    private typeEnum: { [key: string]: string };
    private blockType: { [key: string]: number };
    private loadBlock!: Promise<unknown>;
    reportFilter!: string[];

    constructor(player: Player) {
        this.player = player;
        this.config = player.videoSettings;
        this.block.setting = this.config['block'];
        this.typeEnum = {
            '0': 'keyword',
            '1': 'regexp',
            '2': 'user',
            keyword: '0',
            regexp: '1',
            user: '2',
        };
        this.blockType = {
            type_top: 1,
            type_bottom: 2,
            type_scroll: 3,
            function_special: 5,
            type_color: 7,
        };
        this.globalEvents();
    }
    globalEvents() {
        // 224001
        this.player.directiveManager.on(WD.DB_RETRIEVE_DATA.toString(), (e, received: IReceivedInterface) => {
            this.requestBlockList(received);
        });
        // 224002
        this.player.directiveManager.on(WD.DB_ON_OFF_BLOCK_TYPE.toString(), (e, received: IReceivedInterface) => {
            this.player.set('block', 'status', received['data']['enabled']);
            this.setLastUid();
            this.player.directiveManager.responder(received, null);
        });
        // 224003
        this.player.directiveManager.on(WD.DB_CREATE_BLOCK_ITEM.toString(), (e, received: IReceivedInterface) => {
            this.requestBlockAdd(received['data'], false, (raw: any) => {
                this.player.directiveManager.responder(received, raw);
            });
        });
        // 224004 删除屏蔽项
        this.player.directiveManager.on(WD.DB_DELETE_BLOCK_ITEM.toString(), (e, received: IReceivedInterface) => {
            this.blockFilterRemove(received);
        });
        // 224005 on-off
        this.player.directiveManager.on(WD.DB_ON_OFF_BLOCK_ITEM.toString(), (e, received: IReceivedInterface) => {
            this.onOffBlock(received);
        });
        // 224006
        this.player.directiveManager.on(WD.DB_SYNC_BLOCK_ITEM.toString(), (e, received: IReceivedInterface) => {
            this.requestBlockAdd(received['data'], true, (raw: any) => {
                this.player.directiveManager.responder(received, raw);
            });
        });
        // 224007 同步屏蔽列表
        this.player.directiveManager.on(WD.DB_SYNC_BLOCK_LIST.toString(), (e, received: IReceivedInterface) => {
            this.syncBlockList().then((data: any) => {
                this.player.directiveManager.responder(received, data);
            });
        });
        // 224008
        this.player.directiveManager.on(WD.DB_IMPORT_BLOCK_LIST.toString(), (e, received: IReceivedInterface) => {
            this.importBlockList(received);
        });
        // 224009
        this.player.directiveManager.on(WD.DB_CREATE_BLOCK_USERS.toString(), (e, received: IReceivedInterface) => {
            this.blockUserList(received);
        });
    }

    /**
     * 获取屏蔽列表
     * 224001
     */
    requestBlockList(received: IReceivedInterface) {
        const t = Object.keys(this.blockType);
        const b = this.config['block'];
        const type: number[] = [];
        t.forEach((item: string) => {
            if (!b[<'status'>item]) {
                type.push(this.blockType[item]);
            }
        });
        const list = $.extend(true, [], b['list']);
        list.forEach((item: IBlockListItemInterface) => {
            item['t'] = +this.typeEnum[item['t']];
        });
        this.player.directiveManager.responder(received, {
            list: list,
            lastUid: b[<'status'>'last_uid'],
            blockType: type,
            enabled: b['status'],
        });
    }
    /**
     * 包括添加文本、正则,发送者
     * 224003
     */
    requestBlockAdd(data: IBlockListItemInterface, sync?: boolean, callback?: Function) {
        const that = this;
        if (!that.player.user.status().login) {
            typeof callback === 'function' && callback(data);
            const list = that.block.setting['list'] || [];
            data['t'] = this.typeEnum[data['t']];
            list.push(data);
            this.player.set('block', 'list', list);
            return;
        }
        new ApiDmBlockModify(<ApiDmBlockModifyInData>{
            type: data['t'],
            filter: data['v'],
            jsonp: 'jsonp',
        }).getData({
            success: (raw: ApiDmBlockModifyOutData) => {
                typeof callback === 'function' && callback(raw.result);
                if (!raw) {
                    return;
                }
                const list = that.block.setting['list'] || [];
                switch (raw.code) {
                    case 0:
                        if (!data['id'] || data['id'] === -1) {
                            data['id'] = raw.data['id'];
                        }
                        break;
                    case 36005:
                        if (!data['id'] || data['id'] === -1) {
                            data['id'] = raw.data['id'];
                        }
                        break;
                }
                data['t'] = this.typeEnum[data['t']];
                if (sync) {
                    list.forEach((item: IBlockListItemInterface) => {
                        if (item['s'] === data['s'] && item['t'] === data['t'] && item['v'] === data['v']) {
                            item['id'] = data['id'];
                        }
                    });
                } else {
                    list.push(data);
                }
                this.player.set('block', 'list', list);
                this.setLastUid();
            },
            error: () => {
                typeof callback === 'function' && callback(null);
            },
        });
    }
    /**
     * 删除屏蔽项
     * 224004
     */
    blockFilterRemove(received: IReceivedInterface) {
        const id = received['data']['id'];
        if (typeof id !== 'undefined' && id !== -1) {
            new ApiDmUnblockModify(<ApiDmUnblockModifyInData>{
                ids: id,
                jsonp: 'jsonp',
            }).getData();
        }
        const list = this.block.setting['list'];
        list.forEach((item: IBlockListItemInterface, i: number) => {
            if ((!item['id'] || item['id'] === id) && item['v'] === received['data']['v']) {
                list.splice(i, 1);
                this.player.set('block', 'list', list);
                this.setLastUid();
                return;
            }
        });
    }
    /**
     * on-off
     * 224005
     */
    onOffBlock(received: IReceivedInterface) {
        const data = received['data'];
        data['t'] = this.typeEnum[data['t']];
        const list = this.block.setting['list'];
        list.forEach((item: IBlockListItemInterface) => {
            if (item['t'] === data['t'] && item['v'] === data['v']) {
                item['s'] = data['s'];
                this.player.set('block', 'list', list);
                this.setLastUid();
                return;
            }
        });
    }

    /**
     * 由播放器同步屏蔽列表
     * 124007
     */
    syncBlockListFromPlayer(cb: Function) {
        new ApiDmBlockListModify(<ApiDmBlockListModifyInData>{
            jsonp: 'jsonp',
        }).getData({
            success: (raw: ApiDmBlockListModifyOutData) => {
                cb(raw);
                this.player.directiveManager.sender(PD.DB_PUT_BLOCK_SYNC, raw.result);
                this.setLocalBlock(raw);
            },
            error: () => {
                cb(null);
            },
        });
    }
    /**
     * 同步屏蔽列表
     * 224007
     */
    syncBlockList() {
        this.loadBlock =
            this.loadBlock ||
            new Promise((res) => {
                new ApiDmBlockListModify(<ApiDmBlockListModifyInData>{
                    jsonp: 'jsonp',
                }).getData({
                    success: (raw: ApiDmBlockListModifyOutData) => {
                        this.setLocalBlock(raw);
                        res(raw.result);
                    },
                    error: () => {
                        res(null);
                    },
                });
            });
        return this.loadBlock;
    }
    private setLocalBlock(raw: ApiDmBlockListModifyOutData) {
        if (!raw || raw.code || !raw.data) {
            return;
        }
        this.noRepeat(raw.data.rule, 'type', 'filter');
        this.player.set('block', 'list', this.block.setting.list);
        this.setLastUid();
    }

    /**
     * 导入XML文件
     * 224008
     */
    importBlockList(received: IReceivedInterface) {
        const data = received['data'];
        if (data.length > 0) {
            this.noRepeat(data, 't', 'v');
            this.player.set('block', 'list', this.block.setting['list']);
        }
    }
    /**
     * 批量屏蔽发送者
     * 224009
     */
    blockUserList(received: IReceivedInterface) {
        const ids: string[] = [];
        received['data'].forEach((ele: IBlockListItemInterface) => {
            ids.push(ele['v']);
            ele['t'] = this.typeEnum[ele['t']];
            this.block.setting['list'].push(ele);
        });
        this.player.set('block', 'list', this.block.setting['list']);
        new ApiDmlockBatchModify(<ApiDmlockBatchModifyInData>{
            type: 2,
            filters: ids.join(','),
            jsonp: 'jsonp',
        })
            .getData()
            .done(() => {
                this.player.directiveManager.responder(received, null);
            });
    }

    private deRepeatBlock(list: IBlockListItemInterface[]) {
        const localList = this.block.setting['list'];
        if (Array.isArray(localList) && localList.length > 0) {
            for (let i = 0; i < localList.length; i++) {
                const item = localList[i];
                item['t'] = this.typeEnum[item['t']] || 'keyword';
                if (item.id) {
                    localList.splice(i, 1);
                    i--;
                }
            }
        } else {
            this.block.setting['list'] = [];
        }
        list.forEach((item: any) => {
            this.block.setting['list'].push({
                t: this.typeEnum[item.type],
                v: item.filter,
                s: true,
                id: item.id,
            });
        });
        this.player.set('block', 'list', this.block.setting['list']);
    }
    private setBlockLocal(list: IBlockListItemInterface[]) {
        list.forEach((ele: IBlockListItemInterface) => {
            ele['t'] = 'user';
            this.block.setting['list'].push(ele);
        });
        this.player.set('block', 'list', this.block.setting['list']);
    }
    private noRepeat(list: IBlockListItemInterface[], ty: string, v: string) {
        const localItem: any = {};
        const localIdMap: any = {};
        this.block.setting['list'].forEach((item: IBlockListItemInterface) => {
            if (typeof item['id'] !== 'undefined' && item['id'] !== -1) {
                localIdMap[item['id']] = item;
            }
            const type = item['t'];
            const value = item['v'];
            const key = type === 'keyword' ? type + value.toLowerCase() : type + value;
            localItem[key] = item;
        });
        if (Array.isArray(list)) {
            list.forEach((item: IBlockListItemInterface) => {
                const t = item[<'v'>ty];
                let type = this.typeEnum[t];
                let value = item[<'v'>v];
                const id = item['id'];
                let key;
                if (id == null || type == null) {
                    return;
                }
                if (!value) {
                    type = 'keyword';
                    value = { '0': 't', '1': 'r', '2': 'u' }[<'0' | '1' | '2'>t] + '=';
                }
                key = type === 'keyword' ? type + value.toLowerCase() : type + value;

                // 如果type和value相同，并且不存在id，直接向本地注入id
                if (
                    localItem[key] &&
                    (!localItem[key]['id'] || (localItem[key]['id'] && localItem[key]['id'] === -1))
                ) {
                    localItem[key]['id'] = id;
                    return;
                }
                // CS相同id的数据合并
                if (localIdMap[id]) {
                    localIdMap[id]['t'] = type;
                    localIdMap[id]['v'] = value;
                    delete localIdMap[id];
                    return;
                }
                this.block.setting['list'].push({ t: type, v: value, s: true, id: id });
            });
        }
        for (const id in localIdMap) {
            if (localIdMap.hasOwnProperty(id)) {
                delete localIdMap[id]['id']; // 对本地显示同步但实际已被删除的屏蔽条目做处理
            }
        }
    }
    // 去重
    private setLastUid() {
        const status = this.player.user.status();
        if (status.login) {
            this.player.set('block', 'last_uid', status.uid);
        }
    }
    // 云屏蔽
    aiJudge(danmaku: any) {
        const setting = this.player.videoSettings.block;
        if (setting.aiblock) {
            if (Math.abs(danmaku.weight) < setting.ailevel) {
                return true;
            }
        }
        return false;
    }
    /**
     * dm view 下发屏蔽
     */
    reportFilterReg(danmaku: any) {
        if (this.reportFilter?.length) {
            return this.reportFilter.some((text) => {
                if (new RegExp(text).test(danmaku.text)) {
                    return true;
                }
            });
        }
        return false;
    }
    judgeWord(danmaku: any) {
        const block = this.config['block'];
        const player = this.player;
        let text;
        try {
            text = danmaku.mode === 7 && danmaku.text[0] === '[' ? JSON.parse(danmaku.text)[4] : danmaku.text;
        } catch (e) {
            text = danmaku.text;
        }
        let l;
        // 优先分析屏蔽列表
        if (danmaku.mode <= 7 && Number(block.status) !== 0) {
            for (let i = 0; i < block['list'].length; i++) {
                l = block['list'][i];
                if (!l['s']) {
                    continue;
                }
                if (l['t'] === 'user' && String(danmaku.uid) && String(danmaku.uid) === String(l['v'])) {
                    // danmaku.block_list = STATE.BLOCK_LIST_USER;
                    return STATE.BLOCK_LIST_USER;
                }
                if (danmaku.mode > 7) {
                    continue;
                }
                if (l['t'] === 'keyword') {
                    try {
                        if (
                            new RegExp(
                                l['v'].replace(/(\^|\$|\\|\.|\*|\+|\?|\(|\)|\[|\]|\{|\}|\||\/)/g, '\\$1'),
                                'i',
                            ).test(text)
                        ) {
                            // danmaku.block_list = STATE.BLOCK_LIST_KEYWORD;
                            return STATE.BLOCK_LIST_KEYWORD;
                        }
                    } catch (e) {
                        logger.w(<any>e);
                    }
                }
                if (l['t'] === 'regexp') {
                    try {
                        if (this.filterRegexp(l['v']).test(text)) {
                            return STATE.BLOCK_LIST_REGEXP;
                        }
                    } catch (e) {
                        logger.w(<any>e);
                    }
                }
                if (
                    l['t'] === 'color' &&
                    colorFromInt(danmaku.color).toUpperCase() === '#' + l['v'].toUpperCase()
                ) {
                    return STATE.BLOCK_LIST_COLOR;
                }
            }
        }
    }
    judge(danmaku: any) {
        if (danmaku.border) {
            return 0;
        }
        if (this.aiJudge(danmaku)) {
            return 1;
        }
        if (this.reportFilterReg(danmaku)) {
            return 1;
        }

        const word = this.judgeWord(danmaku);
        if (word) {
            return word;
        }
        const block = this.config['block'];
        const player = this.player;

        if (!block['type_scroll'] && (danmaku.mode === 1 || danmaku.mode === 6)) {
            return STATE.BLOCK_SCROLL;
        }
        if (!block['type_bottom'] && danmaku.mode === 4) {
            return STATE.BLOCK_BOTTOM;
        }
        if (!block['type_top'] && danmaku.mode === 5) {
            return STATE.BLOCK_TOP;
        }
        if (
            !block['type_color'] &&
            danmaku.mode <= 7 &&
            colorFromInt(danmaku.color).toUpperCase() !== '#FFFFFF'
        ) {
            return STATE.BLOCK_COLOR;
        }
        if (!block['function_special'] && (danmaku.class === 2 || danmaku.mode === 7)) {
            return STATE.BLOCK_SPECIAL;
        }
        // cloud_level: 2,
        // cloud_source_partition: true,
        // cloud_source_all: true,
        // cloud_source_up: true,
        return STATE.BLOCK_DISABLED;
    }

    private filterRegexp(str: string) {
        const matches = /^\/(.+)\/([img]{0,3})$/.exec(str);
        try {
            return new RegExp(matches![1], matches![2]);
        } catch (e) {
            return new RegExp(str);
        }
    }
    destroy() { }
}

export default Block;
