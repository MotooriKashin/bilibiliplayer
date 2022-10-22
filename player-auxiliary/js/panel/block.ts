import STATE from './state';
import ContextMenu from '../plugins/context-menu';
import BlocklistIO from '../plugins/block-list-io';
import Tooltip from '../plugins/tooltip';
import Auxiliary, { IReceived } from '../auxiliary';
import { IDanmakuData } from './danmaku-list';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import Player from '@jsc/bilibiliplayer/js/player';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { colorFromInt } from '@shared/utils';

type TypeMapKey = 'user' | 'regexp' | 'keyword' | 'color';
type ActiveTabMapType = 'keyword' | 'regexp' | 'user' | 'color';
interface IBlockListItem {
    id?: number;
    s: boolean; // 是否启用
    t: number | string; // 类型,0:keyword,1:regexp,2:user
    v: string; // 值
}
class Block {
    private auxiliary: Auxiliary;
    // private config: any;
    private prefix: string;
    private activeTabType: number;
    private listEnum: { [key: string]: string };
    private typeEnum: { [key: string]: string };
    private guid: number;
    private guidMap: any;
    private distinct: any;
    private container!: JQuery;
    private blockListType = 'custom';
    private contextMenu!: ContextMenu;
    private blockListIndex = 0;
    private BLOCK_LIST_MIN = 99999999;
    private proxyListUpdate!: Function; // Function & _.Cancelable
    private proxySubListUpdate!: Function; // Function & _.Cancelable
    private inited = false;
    private blockWrap!: JQuery;
    // private resizeTimer!: number;
    private allSyncTooltip: any;
    block: any = {
        setting: {
            blockType: [],
            enabled: true,
            list: [],
            aiblock: true,
            ailevel: 0,
        },
    };
    private types = {
        user: "用户",
        regexp: "正则",
        keyword: "文本",
        color: "颜色",
    };
    private blockType = {
        type_top: 1,
        type_bottom: 2,
        type_scroll: 3,
        function_special: 5,
        type_color: 7,
    };
    player: Player;
    blockMax: boolean = false;
    listType = "custom";

    constructor(auxiliary: Auxiliary) {
        this.auxiliary = auxiliary;
        this.prefix = auxiliary.prefix;
        this.activeTabType = STATE.BLOCK_TAB_TEXT; // USER or non-USER(TEXT)
        this.player = auxiliary.player;
        this.listEnum = {
            '0': 'custom',
            '1': 'cloud',
            '2': 'up',
            custom: '0',
            cloud: '1',
            up: '2',
        };
        this.typeEnum = {
            '0': 'keyword',
            '1': 'regexp',
            '2': 'user',
            "-": "color",
            keyword: '0',
            regexp: '1',
            user: '2',
            color: "-"
        };
        this.guid = 1;
        this.guidMap = {};
        this.distinct = {};

        this.beforeInit();
        this.globalEvents();
    }
    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, () => {
            if (this.inited) {
                this.inited = false;
                this.activeTabType = STATE.BLOCK_TAB_TEXT;
                this.blockListIndex = 0;
                this.guid = 1;
                this.guidMap = {};
                this.distinct = {};
                this.beforeInit();
            }
        });
        // 124002
        this.auxiliary.directiveManager.on(PD.DB_PUT_BLOCK_TYPE.toString(), (e, received: IReceived) => {
            this.setBlockType(received);
            this.updateList();
        });
        // 124003
        this.auxiliary.directiveManager.on(PD.DB_PUT_BLOCK_ITEM.toString(), (e, received: IReceived) => {
            this.add(received['data']['uhash'], 'user', true, true);
            this.updateList();
        });
        // 124004
        this.auxiliary.directiveManager.on(PD.DB_PUT_SYNC_BLOCK_ITEM.toString(), (e, received: IReceived) => {
            this.playerSync(received['data']);
        });
        // 124007
        this.auxiliary.directiveManager.on(PD.DB_PUT_BLOCK_SYNC.toString(), (e, received: IReceived) => {
            const raw = received.data;
            if (raw && raw.code === 0 && raw.data) {
                this.block.sync_btn && this.block.sync_btn.disable && this.block.sync_btn.disable();
                this.updateBlockList(raw);
                this.updateList();
            }
        });
    }
    show() {
        if (!this.inited) {
            this.beforeInit();
        }
        this.auxiliary.template.blockPanel.show();
    }

    hide() {
        if (!this.inited) {
            this.beforeInit();
        }
        this.auxiliary.template.blockPanel.hide();
    }
    private TPL() {
        const prefix = this.prefix;
        return `<div class="${prefix}-block-wrap">
        <div class="${prefix}-block-tablist">
            <div class="${prefix}-block-tabpanel no-bottom" role="switch">
                <div class="${prefix}-block-tabpanel-row special-title">
                    <input type="checkbox" class="${prefix}-block-status" />
                </div>
                <div class="${prefix}-block-sync-btn">
                    <i class="${prefix}-iconfont icon-12refresh"></i>同步屏蔽列表
                </div>
            </div>
            <div class="${prefix}-block-tabpanel" role="list">
                <div class="${prefix}-block-tabpanel-row">
                    <input type="text" class="${prefix}-block-string-short" placeholder="请输入关键词" value="" />
                    <div class="${prefix}-block-string-short-btn" name="danmaku_ban_textfield">
                        <span name="danmaku_ban_textfield">添加</span>
                    </div>
                </div>
                <div class="${prefix}-block-tabpanel-row">
                    <div class="${prefix}-block-tabpanel-row-inline">
                        <ul class="${prefix}-block-list-type"></ul>
                    </div>
                </div>
                <div class="${prefix}-block-tabpanel-row active-1">
                    <div class="${prefix}-block-tabpanel-row special-tabs">
                        <div class="${prefix}-block-type-keyword">屏蔽词</div>
                        <div class="${prefix}-block-type-user">屏蔽用户</div>
                    </div>
                    <div class="${prefix}-block-tabpanel-row ${prefix}-border">
                        <div class="${prefix}-block-list-function">
                            <div class="${prefix}-block-list-function-type">类别</div>
                            <div class="${prefix}-block-list-function-content">内容（<span class="${prefix}-block-number">-</span>）</div>
                            <div class="${prefix}-block-list-function-state">状态</div>
                            <div class="${prefix}-block-list-function-delete">操作</div>
                            <div class="${prefix}-block-list-function-sync">同步</div>
                        </div>
                        <div class="${prefix}-block-list-wrap">
                            <div class="${prefix}-block-empty">暂无屏蔽内容</div>
                            <div class="${prefix}-block-list"></div>
                        </div>
                    </div>
                </div>
                <div class="${prefix}-block-tabpanel-row">
                    <div class="${prefix}-block-list-spread-btn">
                        <span class="${prefix}-block-list-state">展开更多</span>
                        <span class="${prefix}-block-number-spread">（-）</span>
                    </div>
                </div>
            </div>
            <div class="${prefix}-block-tabpanel" role="normal">
                <div class="${prefix}-block-tabpanel-title">按类型屏蔽</div>
                <div class="${prefix}-block-filter-type-list"></div>
                <div class="${prefix}-block-filter-function-list"></div>
            </div>
            <div class="${prefix}-block-tabpanel no-bottom" role="normal">
                <div class="${prefix}-block-content">
                    <div class="${prefix}-block-tabpanel-title">智能云屏蔽</div>
                    <div class="${prefix}-block-setting">
                        <input type="checkbox" class="${prefix}-block-aiblock" />
                    </div>
                </div>
                <div class="${prefix}-block-content">
                    <div class="${prefix}-block-label">屏蔽等级</div>
                    <div class="${prefix}-block-setting">
                        <div class="${prefix}-block-ailevel"></div>
                    </div>
                </div>
                <div class="${prefix}-block-content">
                    <div class="${prefix}-block-label">越高越严格，最大屏蔽等级为“硬核会员弹幕模式”</div>
                </div>
            </div>
        </div>
    </div>
    <div class="${prefix}-block-list-hide-btn">收起</div>`;
    }

    getBlock(name: string) {
        if (!this.inited) {
            this.beforeInit();
        }

        return this.block[name];
    }

    private beforeInit() {
        // 224001
        this.auxiliary.directiveManager.sender(WD.DB_RETRIEVE_DATA, null, (received?: IReceived) => {
            this.block.setting = received!['data'];
            this.block.setting.blockType = this.block.setting['blockType'] || [];
            this.block.setting.enabled = this.block.setting['enabled'];
            this.block.setting.list = this.block.setting['list'] instanceof Array ? this.block.setting['list'] : [];
            for (let i = 0; i < this.block.setting.list.length; i++) {
                const item = this.block.setting.list[i];
                item['t'] = this.typeEnum[item['t']] || 'keyword';
                if (!this.verifyDistinct(item, 'custom', true)) {
                    this.block.setting.list.splice(i, 1);
                    i--;
                }
            }
            this.init();
        });
    }

    set(type: string, key: string, value: any) {
        this.block.setting[key] = value;
    }

    setBlockType(received: IReceived) {
        const data = received['data'];
        if (data['enabled']) {
            this.block.setting.blockType.push(data['type']);
        } else {
            const i = this.block.setting.blockType.indexOf(data['type']);
            if (i > -1) {
                this.block.setting.blockType.splice(i, 1);
            }
        }
        // 更新屏蔽列表状态，此处屏蔽状态取值与设置中取值是相反的！
        Object.entries(this.blockType).forEach(d => {
            if (data['type'] === d[1]) {
                this.block[`filter_${d[0]}`].value(!data['enabled'])
            }
        });
    }

    private init(reload?: boolean) {
        if (!this.inited) {
            this.inited = true;
            const auxiliary = this.auxiliary;
            const template = auxiliary.template;
            const block: any = this.block;
            const prefix = this.prefix;
            const that = this;
            const container = (this.container = template.blockPanel);
            container.html('');
            container.find('.' + this.prefix + '-panel-close').click(function () {
                container.hide();
            });
            container.append(this.TPL());
            block.tabpanel = container.find('.' + prefix + '-block-tabpanel');

            block.status = new Checkbox(container.find('.' + prefix + '-block-status'), {
                checked: block.setting.enabled,
                label: "屏蔽列表",
                flexWrap: true,
                textLeft: true,

                change: e => {
                    // 224002
                    this.auxiliary.directiveManager.sender(WD.DB_ON_OFF_BLOCK_TYPE, {
                        enabled: e.value,
                    });
                    this.auxiliary.trackInfoPush('danmaku_ban_on', e.value ? 1 : 0);
                    block.setting.enabled = e.value;
                    this.set('block', 'status', e.value);
                    if (!e.value) {
                        container.find('.' + prefix + '-block-tabpanel[role="list"]').addClass('tabpanel-hide');
                    } else {
                        container.find('.' + prefix + '-block-tabpanel[role="list"]').removeClass('tabpanel-hide');
                    }
                }
            });

            block.aiblock = new Checkbox(container.find('.' + prefix + '-block-aiblock'), {
                checked: this.auxiliary.player.videoSettings.block.aiblock,
                label: '',
                flexWrap: true,
                textLeft: true,

                change: e => {
                    block.setting.aiblock = e.value;
                    this.auxiliary.player.set("block", "aiblock", e.value);
                }
            });
            block.ailevel = new Slider(container.find('.' + prefix + '-block-ailevel'), {
                precision: 11,
                hint: true,
                width: 175,
                height: 13,

                valueSetAnalyze: b => b / 11,
                valueGetAnalyze: b => b * 11,
                formatTooltip: b => {
                    b = b * 11;
                    return b === 0 ? "关闭" : (b <= 10 ? b + "级" : "硬核");
                },
                change: e => {
                    block.setting.ailevel = e.value;
                    this.auxiliary.player.set("block", "ailevel", e.value);
                }
            });
            block.ailevel.value(this.auxiliary.player.videoSettings.block.ailevel);

            if (!block.setting.enabled) {
                container.find('.' + prefix + '-block-tabpanel[role="list"]').addClass('tabpanel-hide');
            }

            // 获取屏蔽弹幕类型
            Object.entries(this.blockType).forEach(d => {
                block.setting[d[0]] = !block.setting.list.includes(d[1]);
            });
            block.filter_type_list = container.find("." + prefix + "-block-filter-type-list");
            [
                ["scroll", "滚动弹幕", "48danmuscroll", "scroll"],
                ["top", "顶端弹幕", "48danmutop", "top"],
                ["bottom", "底端弹幕", "48danmubottom", "btm"],
                ["color", "彩色弹幕", "48danmucolor", "color"]
            ].forEach(d => {
                block["filter_type_" + d[0]] = $(`<div class="${this.prefix}-block-filter-type ${block.setting["type_" + d[0]] ? "" : "disabled"}" ftype="${d[0]}">
                <i class="${this.prefix}-block-filter-image ${this.prefix}-iconfont icon-${d[2]}">
                    <i class="${this.prefix}-block-filter-disabled ${this.prefix}-iconfont icon-24danmuforbid"></i>
                </i>
                <div class="${this.prefix}-block-filter-label">${d[1]}</div>
            </div>`).appendTo(block.filter_type_list).on("click", function () {
                    const value = $(this).hasClass("disabled");
                    // that.player.set("block", "type_" + d[0], value);
                    // $(this).toggleClass("disabled");
                    const data = {
                        type: (<any>that).blockType["type_" + d[0].toLowerCase()],
                        enabled: !value,
                    };
                    // 124002
                    that.auxiliary.directiveManager.sender(PD.DB_PUT_BLOCK_TYPE, data);
                    that.setBlockType(<any>{ data });
                    that.updateList();
                });
                block["filter_type_" + d[0]].value = function (value: any) {
                    if (typeof value === "undefined") {
                        return block.setting["type_" + d[0]];
                    }

                    that.player.set("block", "type_" + d[0], value);
                    value ? $(this).removeClass("disabled") : $(this).addClass("disabled");
                }
            });

            block.filter_function_list = container.find("." + prefix + "-block-filter-function-list");
            [["special", "特殊弹幕", "48danmuspe"]].forEach(d => {
                block["filter_function_" + d[0]] = $(`<div class="${this.prefix}-block-filter-function ${block.setting["function_" + d[0]] ? "" : "disabled"}" ftype="${d[0]}">
                <i class="${this.prefix}-block-filter-image ${this.prefix}-iconfont icon-${d[2]}">
                    <i class="${this.prefix}-block-filter-disabled ${this.prefix}-iconfont icon-24danmuforbid"></i>
                </i>
            <div class="${this.prefix}-block-filter-label">${d[1]}</div>
            </div>`).appendTo(block.filter_function_list).on("click", function () {
                    const value = $(this).hasClass("disabled");
                    // that.player.set("block", "function_" + d[0], value);
                    // $(this).toggleClass("disabled");
                    const data = {
                        type: (<any>that).blockType["function_" + d[0].toLowerCase()],
                        enabled: !value,
                    };
                    // 124002
                    that.auxiliary.directiveManager.sender(PD.DB_PUT_BLOCK_TYPE, data);
                    that.setBlockType(<any>{ data });
                    that.updateList();
                });
                block["filter_function_" + d[0]].value = function (value: any) {
                    if (typeof value === "undefined") {
                        return block.setting["function_" + d[0]];
                    }

                    that.player.set("block", "function_" + d[0], value);
                    value ? $(this).removeClass("disabled") : $(this).addClass("disabled");
                }
            });

            block.filter_string_short = container.find('.' + prefix + '-block-string-short');
            block.filter_string_short_btn = container.find('.' + prefix + '-block-string-short-btn');
            const addBlock = () => {
                const val = block.filter_string_short.val();
                const isRegex = that.isRegexString(val);
                that.blockFilterAdd(
                    {
                        t: isRegex ? 'regexp' : 'keyword',
                        v: isRegex ? val.substr(1, val.length - 2) : val,
                        s: true,
                    },
                    block.filter_string_short,
                    false,
                    true,
                );
                that.auxiliary.trackInfoPush('danmaku_ban_textfield');
            };
            new Button(block.filter_string_short_btn, { click: addBlock });
            block.filter_string_short.on('keydown', (e: any) => {
                if (e.keyCode === 13) {
                    addBlock();
                }
            });

            // 同步屏蔽列表
            block.sync_btn = new Button(container.find('.' + prefix + '-block-sync-btn'), {
                type: "small",
                textOnly: true,

                click: e => {
                    if (block.sync_btn.options.disabled) {
                        return false;
                    }
                    block.sync_btn && block.sync_btn.disable && block.sync_btn.disable();
                    block.list_hide_btn.click();
                    this.syncBlock(true);
                    this.auxiliary.trackInfoPush('danmaku_ban_synchronize');
                }
            });
            this.allSyncTooltip = new Tooltip({
                target: $(block.sync_btn.container),
                type: 'tip',
                name: 'sync_button_hinter',
                position: 'bottom-right',
                text: '登录后下载屏蔽列表',
            });

            block.list_wrap = container.find('.' + prefix + '-block-list-wrap');
            block.list = container.find('.' + prefix + '-block-list');

            block.special_tabs = container.find("." + prefix + "-block-tabpanel-row.special-tabs").parent();
            block.list_number = container.find("." + prefix + "-block-number");
            block.number_spread = container.find("." + prefix + "-block-number-spread");
            block.spread_btn = container.find("." + prefix + "-block-list-spread-btn");
            block.list_hide_btn = container.find("." + prefix + "-block-list-hide-btn");
            block.list_state = container.find("." + prefix + "-block-list-state");
            block.type_keyword = container.find("." + prefix + "-block-type-keyword");
            block.type_user = container.find("." + prefix + "-block-type-user");

            // this.wrapResize();

            let singleSyncTooltip: any = null;
            block.list_wrap
                .on('mouseenter', '.' + prefix + '-block-line-sync', function (this: HTMLElement) {
                    if ($(this).hasClass('icon-general-complete')) {
                        return;
                    }
                    singleSyncTooltip = new Tooltip({
                        target: $(this),
                        name: 'request-block-add-hinter',
                        position: 'top-center',
                        text: '上传屏蔽词',
                        autoHide: false,
                    });
                })
                .on('mouseleave', '.' + prefix + '-block-line-sync', function () {
                    if (singleSyncTooltip) {
                        singleSyncTooltip.destroy();
                        singleSyncTooltip = null;
                    }
                });
            block.spread_btn.click(function () {
                block.list_wrap.hasClass("block-max") ? (block.list_state.html("展开更多"), block.list_wrap.removeClass("block-spread"), block.list_wrap.removeClass("block-max"), that.blockMax = false, that.freshBlockList(that.listType, true)) : (that.freshBlockList(), that.wrapResize());
            });
            block.list_hide_btn.click(function () {
                block.list_state.html("展开更多");
                block.list_wrap.removeClass("block-spread");
                block.list_wrap.removeClass("block-max");
                that.blockMax = false;
                block.list_hide_btn.hide();
                that.freshBlockList(that.listType, true);
            });

            block.type_keyword.click(() => {
                block.special_tabs.removeClass("active-2").addClass("active-1");
                if (that.activeTabType !== STATE.BLOCK_TAB_TEXT) {
                    that.activeTabType = STATE.BLOCK_TAB_TEXT;
                    that.freshBlockList(null, true);
                }
            });
            block.type_user.click(() => {
                block.special_tabs.removeClass("active-1").addClass("active-2");
                if (that.activeTabType !== STATE.BLOCK_TAB_USER) {
                    that.activeTabType = STATE.BLOCK_TAB_USER;
                    that.freshBlockList(null, true);
                }
            });

            this.blockWrap = container.find('.' + prefix + '-block-wrap');
            this.blockWrap.mCustomScrollbar({
                axis: "y",
                scrollInertia: 100,
                autoHideScrollbar: true,

                mouseWheel: {
                    scrollAmount: 48,
                    preventDefault: false,
                },

                callbacks: {
                    whileScrolling: function () {
                        that.wrapResize((<any>this).mcs.top);
                    },
                },
            });

            this.contextMenu = new ContextMenu(this.auxiliary, block.list_wrap, {
                menu: [],
                appendTo: this.auxiliary.template.auxiliaryArea,
                targetClass: this.prefix + '-border',
                changedMode: true,
                changedType: 2, // 0, 1, 2
                // autoRemove: false,
                onChange: function ($target: JQuery) {
                    if (!auxiliary.user.status().login) {
                        return [];
                    }
                    const blocklistIO = new BlocklistIO(that.auxiliary);
                    const output: any[] = [
                        {
                            type: 'function',
                            name: 'export_file',
                            text: '导出xml文件',
                            click: function () {
                                blocklistIO.downLoadFile();
                            },
                        },
                        {
                            type: 'function',
                            name: 'import_file',
                            text: '导入xml文件',
                            click: function () {
                                const callback = function (blocklist: any) {
                                    // var blocklist = that.player.get('block', 'list');
                                    const buffer = [];
                                    const data: IBlockListItem[] = [];
                                    for (let i = 0; i < blocklist.length; i++) {
                                        const item = blocklist[i];
                                        buffer.push({
                                            t: item['t'],
                                            v: item['v'],
                                            s: item['s'] === 'true',
                                        });
                                        data.push({
                                            t: +that.typeEnum[item['t']],
                                            v: item['v'],
                                            s: item['s'] === 'true',
                                            id: -1,
                                        });
                                    }
                                    that.blockFilterAdd(buffer, null, true);
                                    // 224008
                                    if (data.length > 0) {
                                        that.auxiliary.directiveManager.sender(WD.DB_IMPORT_BLOCK_LIST, data);
                                    }
                                };
                                blocklistIO.upLoadFile(callback);
                            },
                        },
                    ];
                    output.push({
                        type: 'descipline',
                    });
                    return output.reverse();
                },
            });

            this.freshBlockList('custom', true);
            // list: []
            auxiliary.userLoadedCallback(info => {
                if (info.login) {
                    that.judgeLocalSyncStatus();
                    that.freshBlockList(null, true);
                    that.allSyncTooltip.options.text = '下载屏蔽列表';
                    block.sync_btn && block.sync_btn.enable && block.sync_btn.enable();
                    that.syncBlock();
                } else {
                    that.allSyncTooltip.options.text = '登录后下载屏蔽列表';
                    block.sync_btn && block.sync_btn.disable && block.sync_btn.disable();
                }
            });
        }
    }
    // 同步屏蔽列表
    private syncBlock(toast?: boolean) {
        // 224007
        this.auxiliary.directiveManager.sender(WD.DB_SYNC_BLOCK_LIST, null, (received?: IReceived) => {
            const raw = received!['data'];
            const block = this.block;
            if (raw) {
                if (!raw || raw['code'] || !raw['data']) {
                    block.sync_btn && block.sync_btn.enable && block.sync_btn.enable();
                    // console.debug('error');
                    toast &&
                        new Tooltip({
                            target: $(block.sync_btn.container),
                            name: 'sync_button_hinter',
                            position: 'bottom-right',
                            text: '同步失败',
                        });
                    return;
                }
                this.updateBlockList(raw);
                if (!toast) return;
                if (this.allSyncTooltip) {
                    this.allSyncTooltip.hide();
                    this.allSyncTooltip.options.text = '屏蔽列表已下载';
                }
                if (raw.data.rule) {
                    new Tooltip({
                        target: $(block.sync_btn.container),
                        name: 'sync_button_hinter',
                        position: 'bottom-right',
                        text: '已成功同步' + raw.data.rule.length + '条屏蔽词',
                    });
                }
            } else {
                block.sync_btn && block.sync_btn.enable && block.sync_btn.enable();
                if (!toast) return;
                if (this.allSyncTooltip) {
                    this.allSyncTooltip.options.text = '下载屏蔽列表';
                }
                new Tooltip({
                    target: $(block.sync_btn.container),
                    name: 'sync_button_hinter',
                    position: 'bottom-right',
                    text: '网络异常，同步失败',
                });
            }
        });
    }

    private updateBlockList(raw: any) {
        const localItem: any = {};
        const localIdMap: any = {};
        const block: any = this.block;
        block.setting.list.forEach((item: IBlockListItem) => {
            if (typeof item['id'] !== 'undefined' && item['id'] !== -1) {
                localIdMap[item['id']] = item;
            }
            const type = item['t'];
            const value = item['v'];
            const key = type === 'keyword' ? type + value.toLowerCase() : type + value;
            localItem[key] = item;
        });
        if (Array.isArray(raw.data['rule'])) {
            raw.data['rule'].forEach((item: any) => {
                let type = this.typeEnum[item['type']];
                let value = item['filter'];
                const id = item['id'];
                let key;
                if (id == null || type == null) {
                    return;
                }

                if (!value) {
                    type = 'keyword';
                    value = { '0': 't', '1': 'r', '2': 'u' }[<'0' | '1' | '2'>item['type']] + '=';
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
                block.setting.list.push({ t: type, v: value, s: true, id: id });
            });
        }
        for (const id in localIdMap) {
            if (localIdMap.hasOwnProperty(id)) {
                delete localIdMap[id]['id']; // 对本地显示同步但实际已被删除的屏蔽条目做处理
            }
        }
        this.set('block', 'list', block.setting.list);
        this.freshBlockList('custom', true);
    }
    private getGuid() {
        return String(this.guid++);
    }

    /**
     * 判断字符串是否是正则表达式字符串
     */
    private isRegexString(str: string) {
        return str[0] === '/' && str[str.length - 1] === '/' && str.length > 2;
    }

    /**
     * @desc item 参数是一条完整的屏蔽词条目
     */
    private distinctKey(item: IBlockListItem, listType: string) {
        if (!item) {
            return;
        }
        const type = item['t'];
        let value = item['v'];
        if (type === 'keyword') {
            value = value.toLowerCase();
        }
        return this.listEnum[listType || this.blockListType] + this.typeEnum[type] + value;
    }

    private verifyDistinct(item: IBlockListItem, listType?: string, distinct?: any) {
        let guid;
        const key = this.distinctKey(item, listType!);

        if (!this.distinct[key!]) {
            guid = this.getGuid();
            this.guidMap[guid] = item;
            this.distinct[key!] = {
                item: item,
                guid: guid,
            };
            if (distinct) {
                return true;
            }
        } else {
            if (distinct) {
                return false;
            }
        }

        return this.distinct[key!];
    }

    private removeDistinct(item: IBlockListItem, listType?: string) {
        let guid;
        const key = this.distinctKey(item, listType!);

        if (this.distinct[key!]) {
            guid = this.distinct[key!].guid;
            delete this.guidMap[guid];
            delete this.distinct[key!];
            return true;
        } else {
            return false;
        }
    }

    private judgeLocalSyncStatus() {
        const list = this.block.setting.list;
        const curUid = this.auxiliary.user.status().uid;
        const preUid = this.block.setting['lastUid'];
        if (String(curUid) !== String(preUid)) {
            list.forEach(function (item: IBlockListItem) {
                item['id'] = -1;
            });
        }
    }

    private wrapResize(top?: number) {
        if (typeof top === undefined) {
            top = (<any>this).blockWrap.mcs.top;
        }
        const container = this.container;
        const block = this.block;
        if (((block.list_wrap.position().top + block.list_wrap.height() + 60 + top - container.height()!) > 0) && block.list_wrap.hasClass("block-spread")) {
            this.blockMax = true;
            block.list_hide_btn.show().stop().animate({
                opacity: 1,
            }, 200);
        } else {
            this.blockMax = false;
            block.list_hide_btn.stop().animate({
                opacity: 0,
            }, 200, function () {
                block.list_hide_btn.hide();
            })
        }
    }

    private freshBlockList(listType?: string | null, fresh?: any) {
        const block = this.block;
        let list = [];
        listType = listType || this.blockListType;
        // block.list_type.value(listType);
        if (listType === 'custom') {
            list = block.setting.list;
        }
        if (listType !== this.blockListType || fresh) {
            block.list.empty();
            this.blockListType = listType;
            this.blockListIndex = 0;
        }
        list = this.blockTabFilter(list);
        const len = list.length;
        const start = this.blockListIndex;
        const tip =
            this.blockListIndex === 0
                ? this.BLOCK_LIST_MIN
                : Math.ceil(this.auxiliary.template.container.height()! / 24);
        const end = this.blockListIndex + tip > len ? len : this.blockListIndex + tip;
        this.blockListIndex = end;
        this.blockListAdd(listType, list.slice(start, end));
        this.blockNumberUpdate();

        // this.clearBlockListMark();
    }

    private blockTabFilter(list: any[]) {
        const that = this;
        return list.filter(function (item) {
            if (that.activeTabType === STATE.BLOCK_TAB_USER) {
                return item['t'] === 'user';
            } else if (that.activeTabType === STATE.BLOCK_TAB_REGEXP) {
                return item['t'] === 'regexp';
            } else {
                return item['t'] !== 'regexp' && item['t'] !== 'user';
            }
        });
    }

    private blockNumberUpdate() {
        const block = this.block;
        let list = [];
        const listType = this.blockListType;
        if (listType === 'custom') {
            list = block.setting.list;
        }
        list = this.blockTabFilter(list);
        const len = list.length;
        block.list_number.html(len || '-');
        if (len === 0) {
            block.list_wrap.addClass('block-empty');
        } else {
            block.list_wrap.removeClass('block-empty');
        }
    }
    judgeUser(danmaku: IDanmakuData) {
        const block = this.block.setting;
        let l;
        for (let i = 0; i < block.list.length; i++) {
            l = block.list[i];
            if (l['t'] === 'user' && String(danmaku.uhash) === String(l['v'])) {
                return STATE.BLOCK_LIST_USER;
            }
        }
        return STATE.BLOCK_DISABLED;
    }
    judge(danmaku: IDanmakuData) {
        if (danmaku.border) {
            return 0;
        }
        const block = this.block.setting;
        const auxiliary = this.auxiliary;
        const blockType = block.blockType;
        let text;
        try {
            text = danmaku.mode === 7 && danmaku.text[0] === '[' ? JSON.parse(danmaku.text)[4] : danmaku.text;
        } catch (e) {
            text = danmaku.text;
        }
        let l;
        // 优先分析屏蔽列表
        if (danmaku.mode <= 7 && Number(block.enabled) !== 0) {
            for (let i = 0; i < block.list.length; i++) {
                l = block.list[i];
                if (!l['s']) {
                    continue;
                }
                if (l['t'] === 'user' && String(danmaku.uhash) === String(l['v'])) {
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
                            return STATE.BLOCK_LIST_KEYWORD;
                        }
                    } catch (e) { }
                }
                if (l['t'] === 'regexp') {
                    try {
                        if (this.filterRegexp(l['v']).test(text)) {
                            return STATE.BLOCK_LIST_REGEXP;
                        }
                    } catch (e) { }
                }
                if (
                    l['t'] === 'color' &&
                    danmaku.color &&
                    colorFromInt(danmaku.color).toUpperCase() === '#' + l['v'].toUpperCase()
                ) {
                    return STATE.BLOCK_LIST_COLOR;
                }
            }
        }
        if (blockType.indexOf(3) > -1 && danmaku.mode === 1) {
            return STATE.BLOCK_SCROLL;
        }
        if (blockType.indexOf(2) > -1 && danmaku.mode === 4) {
            return STATE.BLOCK_BOTTOM;
        }
        if (blockType.indexOf(1) > -1 && danmaku.mode === 5) {
            return STATE.BLOCK_TOP;
        }
        if (
            blockType.indexOf(7) > -1 &&
            danmaku.mode <= 7 &&
            danmaku.color &&
            colorFromInt(danmaku.color).toUpperCase() !== '#FFFFFF'
        ) {
            return STATE.BLOCK_COLOR;
        }
        if (blockType.indexOf(5) > -1 && (danmaku.pool === 2 || danmaku.mode === 7)) {
            return STATE.BLOCK_SPECIAL;
        }
        return STATE.BLOCK_DISABLED;
    }
    /**
     * @desc data - 一条屏蔽条目或者是多条屏蔽条目数组格式（不可压缩）
     */
    private blockFilterAdd(data: any, element?: JQuery | null, local?: any, isAdd?: boolean) {
        const that = this;
        const list = this.block.setting.list;
        const hold: any[] = [];
        const defers: any[] = [];
        let total = 0;
        let count = 0;

        data = Array.isArray(data) ? data : [data];

        function showTooltip(text?: string, force?: boolean) {
            if ((force && data.length !== 1) || (!force && data.length === 1)) {
                new Tooltip({
                    target: that.block.filter_string_short_btn,
                    name: 'filter_button_add_hinter',
                    position: 'top-right',
                    text: text || '已添加该屏蔽词',
                });
            }
        }

        data.forEach(function (item: IBlockListItem) {
            const type = item['t'];
            const value = item['v'];
            const startup = item['s'];
            const key = that.distinctKey(item, 'custom');
            const hybrid = that.distinct[key!];

            if (!value) {
                return false;
            }
            if (element) {
                element.val('');
            }

            if (hybrid) {
                showTooltip('已屏蔽');
                if (!hybrid.item['s']) {
                    if (that.blockListType === 'custom') {
                        const guid = hybrid.guid;
                        const currentline = that.block.list.find('[data-block-guid="' + guid + '"]');
                        if (currentline.hasClass('block-state-disabled')) {
                            currentline.find('.' + that.prefix + '-block-line-state').click();
                        }
                        hybrid.item['s'] = true;
                    }
                    return true;
                } else {
                    return false;
                }
            }

            if (that.auxiliary.user.status().login || isAdd) {
                if (!local && that.typeEnum[type] !== '-') {
                    total++;
                    const defer = that
                        .requestBlockAdd(item, function (isFaultRegex: boolean) {
                            ++count === total && add_filter_data(isFaultRegex);
                        })
                        .then(function (raw: any) {
                            if (raw) {
                                if (raw['code'] === 36004) {
                                    showTooltip(raw['message'] || '正则格式不对');
                                } else {
                                    showTooltip('已添加该屏蔽词，并已同步到云端');
                                }
                            } else {
                                showTooltip('已添加该屏蔽词');
                            }
                        })
                        .catch(function () {
                            showTooltip();
                        });
                    defers.push(defer);
                } else {
                    showTooltip();
                }
            } else {
                showTooltip();
            }

            if (that.verifyDistinct(item, 'custom', true)) {
                hold.push(item);
            }
        });
        showTooltip('批量导入成功', true);
        !total && add_filter_data();

        function add_filter_data(isFaultRegex?: boolean) {
            list.push.apply(list, hold);
            that.set('block', 'list', list);
            if (that.blockListType === 'custom') {
                if (data.length === 1) {
                    if (
                        that.blockTabFilter(hold).length &&
                        that.blockListIndex + 1 === that.blockTabFilter(list).length &&
                        that.activeTabType === 0
                    ) {
                        that.blockListAdd('custom', that.blockTabFilter(hold));
                        that.blockListIndex++;
                    } else if (!isFaultRegex) {
                        that.blockListAdd('custom', that.blockTabFilter(hold));
                    }
                } else {
                    that.blockListAdd('custom', that.blockTabFilter(hold));
                    that.blockListIndex = that.blockTabFilter(list).length;
                }
            }
            that.blockNumberUpdate();
        }

        if (total) {
            return Promise.all(defers).then(() => {
                // 由于没有弹幕列表的状态，因此这里的主次列表都更新
                this.updateList();
            });
        }

        return true;
    }
    private updateList() {
        if (this.auxiliary.list) {
            this.proxyListUpdate = this.proxyListUpdate || this.auxiliary.list.createScheduleUpdateProxy(100);
            this.proxySubListUpdate =
                this.proxySubListUpdate || this.auxiliary.list.createScheduleUpdateProxy(100, true);
            this.proxyListUpdate();
            this.proxySubListUpdate();
        }
    }

    /**
     * 仅限自定义列表
     */
    private requestBlockAdd(item: IBlockListItem, alwaysCallback?: Function) {
        const that = this;
        const list = this.block.setting.list;
        const type = item['t'];
        const prerun = (raw?: any) => {
            if (typeof alwaysCallback === 'function') {
                if (raw && raw.code === 36004) {
                    // 正则格式不正确
                    alwaysCallback(true);
                } else {
                    alwaysCallback(false);
                }
            }
        };
        // 224003
        return new Promise((resolve, reject) => {
            this.auxiliary.directiveManager.sender(
                WD.DB_CREATE_BLOCK_ITEM,
                {
                    t: +this.typeEnum[type],
                    v: item['v'],
                    s: item['s'],
                    id: item['id'] || -1,
                },
                (received?: IReceived) => {
                    if (that.auxiliary.user.status().login) {
                        const raw = received!['data'];
                        prerun.call(null, raw);
                        if (!raw) {
                            reject('HTTP error: ');
                            return;
                        }
                        switch (raw['code']) {
                            case 0:
                                if (!item['id'] || item['id'] === -1) {
                                    item['id'] = raw['data']['id'];
                                    that.handler(item);
                                }
                                break;
                            case 36005:
                                if (!item['id'] || item['id'] === -1) {
                                    item['id'] = raw['data']['id'];
                                    that.handler(item);
                                }
                                break;
                        }
                        // complete
                        that.set('block', 'list', list);
                        if (!raw || raw['status'] !== 200) {
                            prerun.apply(null);
                        }
                        resolve(raw);
                    } else {
                        setTimeout(() => {
                            if (typeof alwaysCallback === 'function') {
                                alwaysCallback(false);
                            }
                            resolve(null);
                        }, 0);
                    }
                },
            );
        });
    }

    private blockLineTP(startup: boolean, listType: string, type: string, sync: string) {
        const prefix = this.prefix;
        return `<div class="${prefix}-block-line ${startup ? "" : "block-state-disabled"}">
<span class="${prefix}-block-line-type">${(<any>this).types[type]}</span><span class="${prefix}-block-line-content"></span><span class="${prefix}-block-line-state">${startup ? "启用" : "关闭"}</span>${listType !== "custom" ? "" : `<span class="${prefix}-block-line-delete ${prefix}-iconfont icon-12delete"></span>`}${(listType !== "custom") || (type === "color") ? "" : `<span class="${prefix}-block-line-sync ${prefix}-iconfont ${sync}"></span>`}
    </div>`;
    }

    private blockListAdd(listType?: string, data?: any) {
        const that = this;
        const block = this.block;
        let list = [];
        const prefix = this.prefix;
        let multiple = $([]);
        if (listType === 'custom') {
            list = block.setting.list;
        }

        (Array.isArray(data) ? data : [data]).forEach(function (l) {
            if (!l) {
                return;
            }
            const guid = that.verifyDistinct(l, listType).guid;
            const lid = l['id'] && l['id'] !== -1;
            const type: TypeMapKey = l['t'];
            const value = l['v'];
            const startup = l['s'];
            let blockLine: JQuery;
            blockLine = $(
                that.blockLineTP(startup, listType!, type, lid ? "icon-complete" : "icon-12refresh"),
            );
            blockLine.click(function () {
                $(this).addClass('block-state-selected');
                $(this).siblings().removeClass('block-state-selected');
            });
            blockLine
                .attr('data-block-guid', guid)
                .find('.' + prefix + '-block-line-content')
                .text(value)
                .attr('title', value)
                .prepend(
                    // @ts-ignore
                    type === 'color' &&
                    $('<span>', {
                        css: {
                            display: 'inline-block',
                            'vertical-align': 'baseline',
                            'margin-bottom': '-1px',
                            'margin-right': '3px',
                            width: '10px',
                            height: '10px',
                            border: '1px solid #222',
                            'background-color': function () {
                                let color = value.trim();
                                if (/#.*/.test(color)) {
                                    color = color.slice(1);
                                }
                                color = (parseInt(color, 16) + 0x000000) & 0xffffff;
                                return colorFromInt(color);
                            },
                        },
                    }),
                );
            blockLine.find('.' + prefix + '-block-line-state').click(function () {
                const currentLine = $(this).parents(`.${prefix}-block-line`);
                const guid = currentLine.attr('data-block-guid');
                const item = that.guidMap[guid!];
                item['s'] = currentLine.hasClass('block-state-disabled');
                currentLine.toggleClass('block-state-disabled');
                $(this).html(currentLine.hasClass('block-state-disabled') ? '关闭' : '启用');
                if (listType === 'custom') {
                    // 224005
                    const t = +that.typeEnum[item['t']];
                    that.auxiliary.directiveManager.sender(WD.DB_ON_OFF_BLOCK_ITEM, {
                        t,
                        v: item['v'],
                        s: item['s'],
                        id: item['id'] || -1,
                    });
                    if (item['s']) {
                        that.auxiliary.trackInfoPush('danmaku_ban_effect', t);
                    } else {
                        that.auxiliary.trackInfoPush('danmaku_ban_invilid', t);
                    }
                    that.set('block', 'list', block.setting.list);
                }
            });
            blockLine.find('.' + prefix + '-block-line-delete').click(function () {
                const currentLine = $(this).parents(`.${prefix}-block-line`);
                const guid = currentLine.attr('data-block-guid');
                const item = that.guidMap[guid!];
                const deleteData = {
                    id: item['id'] || -1,
                    type: item['t'],
                    data: item['v'],
                    startup: item['s'],
                };
                that.blockFilterRemove(deleteData.data, deleteData.type, deleteData.id);
                that.auxiliary.trackInfoPush('danmaku_ban_delete', +that.typeEnum[item['t']]);
            });
            blockLine.find('.' + prefix + '-block-line-sync.icon-12refresh').click(function () {
                const currentLine = $(this).parents();
                const guid = currentLine.attr('data-block-guid');
                const item = that.guidMap[guid!];
                const data = {
                    type: item['t'],
                    data: item['v'],
                    startup: item['s'],
                    id: item['id'] || -1,
                };
                if (data.id && data.id !== -1) {
                    return $(this).removeClass('icon-12refresh').addClass('icon-complete');
                }
                // 224006
                that.auxiliary.directiveManager.sender(
                    WD.DB_SYNC_BLOCK_ITEM,
                    {
                        t: +that.typeEnum[item['t']],
                        v: item['v'],
                        s: item['s'],
                        id: item['id'] || -1,
                    },
                    (received?: IReceived) => {
                        const raw = received!['data'];
                        if (raw) {
                            let text;
                            if (raw) {
                                switch (raw['code']) {
                                    case 0:
                                        if (!item['id'] || item['id'] === -1) {
                                            item['id'] = raw['data']['id'];
                                            that.handler(item);
                                        }
                                        text = '同步完成';
                                        break;
                                    case 36005:
                                        if (!item['id'] || item['id'] === -1) {
                                            item['id'] = raw['data']['id'];
                                            that.handler(item);
                                        }
                                        return;
                                    default:
                                        text = raw['message'] || '同步失败';
                                }
                            } else {
                                text = '同步失败';
                            }
                            new Tooltip({
                                name: 'request-block-add-hinter',
                                target: blockLine,
                                position: 'top-right',
                                text: text,
                            });
                        } else {
                            new Tooltip({
                                name: 'request-block-add-hinter',
                                target: blockLine,
                                position: 'top-right',
                                text: '网络异常，同步失败',
                            });
                        }
                    },
                );
            });

            multiple = multiple.add(blockLine);
        });

        multiple.appendTo(block.list);
    }
    private handler(l?: IBlockListItem) {
        const guid = this.verifyDistinct(l!, 'custom').guid;
        this.block.list
            .find('[data-block-guid="' + guid + '"]')
            .find('.' + this.prefix + '-block-line-sync')
            .removeClass('icon-player-sync')
            .addClass('icon-general-complete');
        this.set('block', 'list', this.block.setting.list);
    }
    private blockFilterRemove(value: string, type?: ActiveTabMapType, id?: any) {
        if (!value) {
            return false;
        }
        const list: IBlockListItem[] = this.block.setting.list;
        const activeTabMap = {
            keyword: STATE.BLOCK_TAB_TEXT,
            regexp: STATE.BLOCK_TAB_TEXT,
            user: STATE.BLOCK_TAB_USER,
            color: STATE.BLOCK_TAB_TEXT,
        };
        for (let i = 0; i < list.length; i++) {
            const l = list[i];
            const c = typeof id !== 'undefined' && id !== -1 ? l['id'] === id : l['t'] === type && l['v'] === value;
            if (c) {
                // 224004
                this.auxiliary.directiveManager.sender(WD.DB_DELETE_BLOCK_ITEM, {
                    t: +this.typeEnum[l['t']],
                    v: l['v'],
                    s: l['s'],
                    id: l['id'] || -1,
                });
                list.splice(i, 1);
                this.set('block', 'list', list);
                if (this.blockListType === 'custom') {
                    const currentList = this.blockTabFilter(list);
                    const guid = this.verifyDistinct(l).guid;
                    this.block.list.find('[data-block-guid="' + guid + '"]').remove();
                    this.removeDistinct(l);
                    if (this.activeTabType === activeTabMap[type!]) {
                        if (this.blockListIndex - 1 < currentList.length) {
                            this.blockListAdd(this.blockListType, currentList[this.blockListIndex - 1]);
                        } else {
                            this.blockListIndex--;
                        }
                    }
                }
                this.blockNumberUpdate();
                return true;
            }
        }
        return false;
    }

    private filterRegexp(str: string) {
        const matches = /^\/(.+)\/([img]{0,3})$/.exec(str);
        try {
            return new RegExp(matches![1], matches![2]);
        } catch (e) {
            return new RegExp(str);
        }
    }

    private playerSync(data: IBlockListItem) {
        if (data['id'] && data['id'] !== -1) {
            data['t'] = this.typeEnum[data['t']];
            const key = this.distinctKey(data, 'custom');
            if (this.distinct[key!]) {
                this.distinct[key!].item['id'] = data['id'];
                this.handler(this.distinct[key!].item);
            }
        }
    }
    add(str: string, type: string, startup: any, local?: any) {
        if (!this.inited) {
            this.init();
        }
        return this.blockFilterAdd(
            {
                t: type,
                v: str,
                s: startup,
            },
            null,
            local,
            true,
        );
    }

    batchAdd(ids: string, type: any) {
        if (!this.inited) {
            this.init();
        }
        const strs = ids.split(',');
        const buffer: IBlockListItem[] = [];
        const data: any = [];
        for (let i = 0; i < strs.length; i++) {
            buffer.push({
                t: type,
                v: strs[i],
                s: true,
            });
            data.push({
                t: 2,
                v: strs[i],
                s: true,
                id: -1,
            });
        }
        // TODO: 弹幕屏蔽全部改用 batch 接口 (?)
        new Promise((resolve, reject) => {
            // 224009
            this.auxiliary.directiveManager.sender(WD.DB_CREATE_BLOCK_USERS, data, (received?: IReceived) => {
                this.updateBlock(received?.data && received.data.data, buffer);
                resolve(received);
            });
        }).then(() => {
            // 由于没有弹幕列表的状态，因此这里的主次列表都更新
            this.updateList();
        });
    }

    private updateBlock(data: any[], buffer: IBlockListItem[]) {
        let list: IBlockListItem[] = [];
        if (Array.isArray(data) && data.length > 0) {
            data.forEach((item) => {
                list.push({
                    t: this.typeEnum[item.type],
                    v: item.filter,
                    s: true,
                    id: item.id,
                });
            });
        } else {
            list = buffer;
        }
        this.blockFilterAdd(list, null, true);
    }
    remove(str: string, type?: any, id?: any) {
        if (!this.inited) {
            this.init();
        }

        return this.blockFilterRemove(str, type, id);
    }

    private destroy() { }
}

export default Block;
