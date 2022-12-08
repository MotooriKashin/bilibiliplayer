import ContextMenu from '../plugins/context-menu';
import Tooltip from '../plugins/tooltip';
import Clipboard from 'clipboard';
import STATE from './state';
import { throttle } from 'underscore';
import Auxiliary, { IReceived } from '../auxiliary';
import { IUserLoginInfos } from './user';
import DatePicker from '../plugins/date-picker';
import Selectable from '../ui/selectable';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import { Button } from '../ui/button';
import { fmSeconds, formatDate } from '@shared/utils';

export interface IDanmakuData {
    stime: number;
    mode: number;
    date: number;
    pool: number;
    uhash: string;
    dmid: string;
    text: string;
    size?: number;
    color?: number;
    mid?: number;
    weight?: number;
    uname?: string;
    selected?: boolean;
    border?: boolean;
}
class List {
    private config: any;
    private options: any;
    private auxiliary: Auxiliary;
    private prefix: string;
    private ui: any;
    private report: any;
    private prevAnchor: any;
    private listWrap: JQuery;
    private listMask: JQuery;
    private container!: JQuery;
    private targetFunc!: JQuery;
    private selectable: any;
    private contextMenu!: ContextMenu;
    private child: any;
    private TITLE_TPL!: string;
    private CHILD_TPL!: string;
    private scrollTop: number = 0;
    private lastScrollTop: any[] = [0, 0];
    private multiple: any;
    private inited = false;
    private datePicker!: DatePicker;
    private danamkuTip = '该视频弹幕为空';
    private orderlist: any = {
        stime: 'danmuku_time_menu',
        text: 'danmuku_content_menu',
        date: 'danmuku_sendtime_menu',
        uname: 'danmuku_sender_menu',
    };
    private basMode = false;
    dmClosed!: boolean; // 是否关闭弹幕功能
    danmakuArray: IDanmakuData[] = [];
    dmidApplied: any;
    dmidMoved: any;
    dmidDelted: any;
    loadfailed!: boolean;
    private dmLoaded!: Promise<void> | null;
    uname: boolean;
    danmakuMask!: JQuery<HTMLElement>;

    constructor(auxiliary: Auxiliary, options: any) {
        this.auxiliary = auxiliary;
        this.options = options;
        this.config = {
            // 弹幕列表配置
            listWrap: this.auxiliary.template.danmakuWrap, // 弹幕列表容器
            size: 30, // 弹幕列表容纳个数
            lineHeight: 24, // 弹幕列表行高
            orderby: '', // 排序
            positive: true, // 是否正序
        };
        this.listWrap = $(this.config['listWrap']);
        this.listMask = this.auxiliary.template.danmakuMask;
        this.prefix = this.auxiliary.prefix;
        this.ui = this.auxiliary.auxiliaryUI;
        this.dmidApplied = {};
        this.dmidDelted = {};
        this.dmidMoved = {};
        this.prevAnchor = null;
        this.auxiliary.template.danmakuMask.addClass('disabled').html('弹幕列表填充中...');
        this.uname = Boolean(this.danmakuArray[0] && this.danmakuArray[0].mid);

        this.resize(this.listWrap);
        this.events();
        // if (this.auxiliary.config.isListSpread) {
        // this.getList().then(() => {
        //     this.update();
        // });
        // }
    }
    private getList(retry = false) {
        if (!this.dmLoaded) {
            this.dmLoaded = new Promise((resolve, reject) => {
                // 221001 获取列表
                this.auxiliary.directiveManager.sender(WD.DL_RETRIEVE_DATA, { retry }, (received?: IReceived) => {
                    if (received?.data.danmaku === 'error') {
                        this.failed(() => {
                            this.reLoad(true);
                        });
                        this.dmLoaded = null;
                        return reject();
                    } else {
                        this.load(received!);
                        if (!this.inited) {
                            this.init();
                        }
                        return resolve();
                    }
                });
            });
        }
        return this.dmLoaded;
    }

    private reLoad(retry = false) {
        if (!this.inited) {
            this.init();
        }
        this.auxiliary.template.danmakuMask.addClass('disabled').html('弹幕列表填充中...').show();
        this.child && this.child.hide();
        this.danmakuArray = [];
        this.dmLoaded = null;

        this.auxiliary.template.danmakuBtnFooter.css("opacity", "1");

        // if (this.listShowed()) {
        this.getList(retry).then(() => {
            this.update(false, 0);
            this._createDatePicker(true);
        });
        // }
    }
    private load(received: IReceived) {
        if (received._origin === 'flash') {
            if (Array.isArray(received.data)) {
                let xml = '';
                for (let i = 0, len = received.data.length; i < len; i++) {
                    xml += String.fromCharCode(received['data'][i]);
                }
                this.danmakuArray = this.parse(xml) || [];
            }
        } else {
            let dm = received.data.danmaku || [];
            if (typeof dm === 'string') {
                dm = this.parse(dm);
            }
            // Array.prototype.push.apply(this.danmakuArray, dm);
            this.danmakuArray = this.danmakuArray.concat(dm);
        }
    }
    private failed(callback: Function) {
        this.loadfailed = true;
        this.resize(this.listWrap);
        this.auxiliary.template.danmakuMask.addClass('disabled').html('弹幕列表装填失败 ');
        $('<a href="javascript:void(0);">点击重试</a>')
            .appendTo(this.auxiliary.template.danmakuMask)
            .click(() => {
                typeof callback === 'function' && callback();
            });
    }
    private events() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_CHANGE, () => {
            // if (this.listShowed()) {
            this.getList().then(() => {
                this.update();
            });
            // }
        });

        this.auxiliary.directiveManager.on(PD.DL_PUT_RECALL_DANMAKU.toString(), (e, received: IReceived) => {
            if (this.danmakuArray?.length) {
                this.playerDanmakuRecall(received);
            }
        });
        // 121002
        this.auxiliary.directiveManager.on(PD.DL_PUT_DANMAKU.toString(), (e, received: IReceived) => {
            const data = received['data'];
            data.forEach((data: any) => {
                const danmaku = {
                    stime: data['stime'],
                    mode: data['mode'],
                    date: data['date'],
                    pool: data['pool'],
                    color: data['color'],
                    text: data['text'],
                    dmid: data['dmid'] + '',
                    border: true,
                    uid: data['uid'],
                    mid: data['uid'],
                    uhash: data['uhash'],
                    uname: data['uname'],
                    weight: data['weight'],
                };
                this.danmakuArray.push(danmaku);
            });

            this.update();
        });
        // 121003
        this.auxiliary.directiveManager.on(PD.DL_SCROLL_TO_VIEW.toString(), (e, received: IReceived) => {
            this.auxiliary.auxiliaryUI.showTabList(STATE.PANEL.DANMAKU, '弹幕列表');
            this.getList().then(() => {
                this.search(String(received.data.dmid));
            });
        });
        // 121006
        this.auxiliary.directiveManager.on(PD.DL_DANMAKU_STATUS.toString(), (e, received: IReceived) => {
            this.dmClosed = false;
            switch (received.data.state) {
                case STATE.DANMAKU_LIST_DEFAULT:
                    this.danamkuTip = '该视频弹幕为空';
                    this.datePicker?.disabled(false);
                    break;
                case STATE.DANMAKU_LIST_CLOSED:
                    this.dmClosed = true;
                    this.danamkuTip = received.data.text || '本视频的弹幕功能已被关闭';
                    this.datePicker?.disabled(true);
                    break;
                case STATE.DANMAKU_LIST_UPDATE:
                    this.danamkuTip = received.data.text || '弹幕系统技术升级中';
                    break;
                default:
                    break;
            }
            this.auxiliary.advPanel.dmClose(this.dmClosed);
            this.auxiliary.basPanel?.dmClose(this.dmClosed);
            this.auxiliary.basVisualPanel?.dmClose(this.dmClosed);
            // 外部改变弹幕开关状态，重新获取弹幕
            if (received.data.outChange) {
                this.dmLoaded = null;
                this.danmakuArray.length = 0;
                this.reLoad();
            }
            this.update();
        });
        // 124005
        this.auxiliary.directiveManager.on(PD.DL_PUT_PROTECT_DANMAKU.toString(), (e, received: IReceived) => {
            this.getList().then(() => {
                const dmids = received['data'];
                dmids.forEach((mid: number) => {
                    this.dmidApplied[mid] = true;
                });
            });
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
            this.update();
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, () => {
            this.reLoad();
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            this.destroy();
        });
    }

    private playerDanmakuRecall(received: IReceived) {
        const o = received['data'];
        if (o['res'] && Number(o['res']['code']) === 0) {
            this.remove(o['data']['dmid'] + '');
            this.update();
        }
    }
    private parseData(data: string) {
        try {
            data = data.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '');
        } catch (e) {
            console.log(e);
        }
        return new window.DOMParser().parseFromString(data, 'text/xml');
    }
    private parse(data: string) {
        const result = this.parseData(data);
        const danmakuArray = [];
        if (result) {
            // xml弹幕解析
            const items: any[] | HTMLCollectionOf<Element> = result.getElementsByTagName('d') || [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const json = item.getAttribute('p')!.split(',');
                let text = item.textContent;
                let data: IDanmakuData;
                if (!text) {
                    // @ts-ignore
                    text = item.text;
                }
                if (typeof text === 'undefined') {
                    continue;
                }
                data = {
                    stime: Number(json[0]),
                    mode: Number(json[1]),
                    size: Number(json[2]),
                    color: Number(json[3]),
                    date: Number(json[4]),
                    pool: Number(json[5]),
                    uhash: json[6],
                    dmid: String(json[7]),
                    text: Number(json[1]) === 9 ? String(text) : String(text).replace(/(\/n|\\n|\n|\r\n)/g, '\r'),
                };
                danmakuArray.push(data);
            }
        }
        return danmakuArray;
    }
    private isMineDanmaku(d: any) {
        if (d) {
            const uid = +this.auxiliary.user.status().uid!;
            if (d.mid && +d.mid === uid) return true;
            let uhash = this.auxiliary.user.status().uhash;
            if (d.uhash.length !== uhash!.length && uid) {
                return parseInt(d.uhash, 16) === parseInt(uhash!, 16);
            }
            return d.uhash === uhash;
        }
        return false;
    }
    private init() {
        if (!this.inited) {
            this.toinit();
        }
    }
    private toinit() {
        this.inited = true;

        const that = this;
        const auxiliary = this.auxiliary;
        const prefix = this.prefix;
        this._createTpl();
        this.danmakuMask = auxiliary.template.danmakuMask;
        this.container = this.listWrap.find('.' + prefix + '-danmaku-list').empty();
        this.container.length || (this.container = $("<ul>").addClass("" + prefix + "-danmaku-list").appendTo(this.listWrap));
        // this.danmakuDetailContainer = this.auxiliary.template.danmakuFunction.find(
        //     '.' + prefix + '-danmaku-btn-danmaku',
        // );

        if (!this.container.length) {
            this.container = $('<ul>')
                .addClass('' + prefix + '-danmaku-list')
                .prependTo(this.listWrap.find(`.${prefix}-danmaku-contaner`));
        }
        this.container.css('height', this.auxiliary.template.container.height()! - 120 + 'px');
        this.selectable = new Selectable(this.container, {
            disableJudge: function (element: HTMLElement) {
                return (
                    !$(element).hasClass('danmaku-info-row-block') &&
                    !$(element).hasClass('danmaku-info-row-special') &&
                    !$(element).hasClass('danmaku-info-row-protect')
                );
            },
            escapeSelector: '.danmaku-info-select-state',
            selected: function (event: JQuery.Event) {
                that.select(event, 'selected');
            },
            selecting: function (event: JQuery.Event) {
                that.select(event, 'selecting');
            },
            start: function (event: JQuery.Event) {
                that.select(event, 'start');
            },
            stop: function (event: JQuery.Event) {
                that.select(event, 'stop');
            },
            unselected: function (event: JQuery.Event) {
                that.select(event, 'unselected');
            },
            unselecting: function (event: JQuery.Event) {
                that.select(event, 'unselecting');
            },
        });
        this.listWrap = this.listWrap.mCustomScrollbar({
            axis: "y",
            scrollInertia: 100,
            autoHideScrollbar: true,

            mouseWheel: {
                scrollAmount: that.config.lineHeight * 2,
                preventDefault: false,
            },

            callbacks: {
                whileScrolling: function () {
                    that.scrollTop = (<any>this).mcs.top;
                    that.onUpdate((<any>this).mcs.top);
                    that.auxiliary.trigger(STATE.EVENT.AUXILIARY_PANEL_SCROLL);
                },
            },
        });
        this.targetFunc = this.auxiliary.template.danmakuFunction;
        this.update();

        this.targetFunc.children().each(function (i, e) {
            $(e).click(function () {
                that.order($(this).attr('orderby')!, $(this));
            });
        });
        // fix
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_REFULLSCREEN, function () {
            that.update();
            that.update(true);
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, function () {
            that.update();
            that.update(true);
        });

        this._multiple_init();
        this.contextMenu = new ContextMenu(this.auxiliary, this.listWrap, {
            menu: [],
            appendTo: this.auxiliary.template.auxiliaryArea,
            targetClass: 'danmaku-info-row',
            changedMode: true,
            changedType: 2, // 0, 1, 2
            // autoRemove: false,
            onChange: function ($target: JQuery) {
                let danmakuArray;
                let danmaku: IDanmakuData;
                const no = parseInt($target.attr('dmno')!, 10);
                const optDanmakuArray: any[] = [];
                const childList = that.child;
                if (childList.container.find($target).length === 1) {
                    danmakuArray = childList.danmakuArray;
                } else {
                    danmakuArray = that.danmakuArray;
                }
                danmaku = danmakuArray[no];
                if (!danmaku) {
                    return true;
                }
                const block = that.auxiliary.block.judge(danmaku);
                // console.debug(danmaku, block);
                for (let i = 0; i < danmakuArray.length; i++) {
                    if (danmakuArray[i].selected) {
                        optDanmakuArray.push(danmakuArray[i]);
                    }
                }
                const output: any[] = [
                    {
                        type: 'function',
                        text: '复制选中弹幕',
                        afterAppend: function (e: any) {
                            new Clipboard(e[0], {
                                text: function () {
                                    auxiliary.trackInfoPush('list_contextmenu_copy');
                                    return danmaku.mode > 6 ? '<? 高级弹幕 />' : danmaku.text;
                                },
                            });
                        },
                    },
                    {
                        type: 'function',
                        name: 'list_report',
                        text: '举报弹幕',
                        click: function (target: JQuery) {
                            that.getReport().report.show!(danmaku);
                            const info: any = { dmid: danmaku.dmid };
                            if (danmaku.weight! > 0) {
                                info.weight = danmaku.weight;
                            }
                            auxiliary.trackInfoPush('list_contextmenu_report', JSON.stringify(info));
                        },
                    },
                    {
                        type: 'function',
                        text: '查看该发送者的所有弹幕',
                        click: function () {
                            that.child.show(danmaku);
                            auxiliary.trackInfoPush('list_contextmenu_watchall');
                        },
                    },
                ];
                const batchBlock = {
                    type: 'function',
                    name: 'list_prevent',
                    text:
                        optDanmakuArray.length > 1
                            ? '屏蔽这些弹幕的发送者'
                            : block === STATE.BLOCK_LIST_USER
                                ? '取消屏蔽这条弹幕的发送者'
                                : '屏蔽发送者',
                    click: function () {
                        if (optDanmakuArray.length === 1) {
                            if (block === STATE.BLOCK_LIST_USER) {
                                that.auxiliary.block.remove(String(danmaku.uhash), 'user');
                            } else {
                                that.auxiliary.block.add(String(danmaku.uhash), 'user', true);
                            }
                        } else {
                            const ids = [];
                            for (let j = 0; j < optDanmakuArray.length; j++) {
                                if (
                                    ids.indexOf(optDanmakuArray[j].uhash) === -1 &&
                                    !that.isMineDanmaku(optDanmakuArray[j])
                                ) {
                                    ids.push(optDanmakuArray[j].uhash);
                                }
                            }
                            that.auxiliary.block.batchAdd(ids.join(','), 'user');
                        }
                        that.update();
                        that.update(true);
                        auxiliary.trackInfoPush('list_contextmenu_prevent');
                    },
                };
                if (!that.isMineDanmaku(danmaku)) {
                    output.unshift(batchBlock);
                }
                if (that.isMineDanmaku(danmaku) && optDanmakuArray.length === 1 && danmaku.mode !== 9) {
                    output.push({
                        type: 'function',
                        name: 'list_recall',
                        text: '撤回这条弹幕',
                        click: function () {
                            that.danmakuRecall(danmaku);
                            that.auxiliary.trackInfoPush('list_contextmenu_recall');
                        },
                    });
                }
                const info = that.auxiliary.user.status();
                if (info && info.login) {
                    if (info.is_system_admin || info.isadmin || info.p_role === STATE.P_ROLE_ASSISTANT) {
                        output.push({
                            type: 'function',
                            text: 'UP主视频中禁言此用户',
                            click: function ($target: JQuery, e: JQuery.Event) {
                                const selectedList = that._getSelectedList();
                                if (selectedList.length) {
                                    that._danmakuBanned(info, selectedList, e.pageX!, e.pageY!);
                                }
                                auxiliary.trackInfoPush('list_contextmenu_ban');
                            },
                        });
                    }
                }
                return output.reverse();
            },
        });
        this._child();
        this.container.click((e) => {
            if (!$(e.target).hasClass('danmaku-info-time') && !$(e.target).hasClass('danmaku-info-time-edit')) {
                this.container.find('.danmaku-info-time-edit').focusout();
            }
        });
        this.auxiliary.userLoadedCallback(() => {
            this.danamkuManagement();
            this.update();
            this.update(true);
        });
        this._createDatePicker();
    }
    add(danmaku: IDanmakuData) {
        this.danmakuArray.push(danmaku);
        this.update();
    }
    getReport() {
        return this.auxiliary.report;
    }
    applyProtect(danmakuArray: IDanmakuData[] | IDanmakuData, options: any) {
        if (!this.inited) {
            this.init();
        }
        const that = this;
        const dmids: IDanmakuData[] = [];
        let text = '提交申请失败，请稍后重试';
        const sTop = document.documentElement.scrollTop || document.body.scrollTop;
        const sLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
        if (!this.auxiliary.defaultHTML5) {
            text = 'Flash暂不支持，请切换H5';
            new Tooltip({
                top: options.top + sTop,
                left: options.left + sLeft - text.length * 12,
                position: 'top-left',
                text: text,
            });
            return;
        }
        (Array.isArray(danmakuArray) ? danmakuArray : [danmakuArray]).forEach(function (item) {
            dmids.push(that.danmakuListItem(item));
        });
        // 221007
        this.auxiliary.directiveManager.sender(WD.DL_REQUEST_PROTECT, dmids, (received?: IReceived) => {
            const data = received!['data'];
            if (data) {
                if (!data['code']) {
                    text = '申请已提交，请耐心等待UP主审核！';
                } else if (data['message']) {
                    text = data['message'];
                }
                switch (data['code']) {
                    case 0:
                    case 36104:
                        dmids.forEach(function (dmid) {
                            that.dmidApplied[dmid['dmid']] = true;
                        });
                        that.update();
                        that.update(true);
                        break;
                }
            } else {
                text = '网络错误，请稍后重试';
            }
            new Tooltip({
                top: options.top + sTop,
                left: options.left + sLeft - text.length * 12,
                position: 'top-left',
                text: text,
            });
        });
    }
    MULTIPLE_TPL() {
        const prefix = this.prefix;
        return (
            '<div class="' +
            prefix +
            '-danmaku-multiple-control">' +
            '<div class="' +
            prefix +
            '-danmaku-multiple-control-title">已选择<span class="' +
            prefix +
            '-danmaku-multiple-control-number">-</span>条</div>' +
            '<div class="' +
            prefix +
            '-danmaku-multiple-control-cancel">取消选择</div>' +
            '<div class="' +
            prefix +
            '-danmaku-multiple-control-submit" name="list_prevent_all"><span name="list_prevent_all">批量屏蔽</span></div>' +
            '</div>'
        );
    }

    private UP_ARROW_TPL() {
        return `<i class="${this.prefix}-icon ${this.prefix}-icon-arrow-up"></i>`;
    }

    private DOWN_ARROW_TPL() {
        return `<i class="${this.prefix}-icon ${this.prefix}-icon-arrow-down"></i>`;
    }

    private _createTpl() {
        const prefix = this.prefix;
        this.TITLE_TPL = `
        <div name="danmuku_time_menu" class="${prefix}-danmaku-btn-time" orderby="stime">时间</div>
<div name="danmuku_content_menu" class="${prefix}-danmaku-btn-danmaku" orderby="text">弹幕内容</div>
${this.uname
                ? `<div name="danmuku_sender_menu" class="${prefix}-danmaku-btn-uname" orderby="uname">发送者</div>`
                : `<div name="danmuku_sendtime_menu" class="${prefix}-danmaku-btn-date" orderby="date">发送时间</div>`}`;
        this.CHILD_TPL = `
        <div class="${prefix}-panel-title">找到<span class="${prefix}-danmaku-list-child-number">-</span>条弹幕<i class="${prefix}-iconfont ${prefix}-panel-close icon-12close"></i></div>
<div class="${prefix}-danmaku-function">
	<div name="danmuku_time_menu" class="${prefix}-danmaku-btn-time" orderby="stime">时间</div>
	<div name="danmuku_content_menu" class="${prefix}-danmaku-btn-danmaku" orderby="text">弹幕内容</div>
	${this.uname
                ? `<div name="danmuku_sender_menu" class="${prefix}-danmaku-btn-uname" orderby="uname">发送者</div>`
                : `<div name="danmuku_sendtime_menu" class="${prefix}-danmaku-btn-date" orderby="date">发送时间</div>`}
</div>
<div class="${prefix}-danmaku-wrap"></div>`;
        this.auxiliary.template.danmakuFunction.html(this.TITLE_TPL);
    }

    private _child() {
        const that = this;
        const prefix = this.prefix;
        this.child = {
            config: {
                orderby: '',
                positive: true,
            },
        };
        this.child.danmakuArray = [];
        this.child.wrap = $('<div class="' + prefix + '-danmaku-wrap-child"></div>').html(this.CHILD_TPL).appendTo(this.listWrap);
        this.child.wrap.html(this.CHILD_TPL);
        this.child.listWrap = this.child.wrap.find('.' + prefix + '-danmaku-wrap');
        this.child.number = this.child.wrap.find('.' + prefix + '-danmaku-list-child-number');
        this.child.container = $('<ul>')
            .addClass('' + prefix + '-danmaku-list')
            .prependTo(this.child.listWrap);
        this.child.close_btn = this.child.wrap.find('.' + prefix + '-panel-close');
        this.child.targetFunc = this.child.wrap.find('.' + prefix + '-danmaku-function');
        // this.player.ui.buttonset(this.child.targetFunc);
        this.child.targetFunc.children().each(function (i: number, e: JQuery.Event) {
            $(e).click(function () {
                that.order($(this).attr('orderby')!, $(this), true);
            });
        });

        this.child.selectable = new Selectable(this.child.container, {
            disableJudge: function (element: HTMLElement) {
                return (
                    !$(element).hasClass('danmaku-info-row-block') &&
                    !$(element).hasClass('danmaku-info-row-special') &&
                    !$(element).hasClass('danmaku-info-row-protect')
                );
            },
            escapeSelector: '.danmaku-info-select-state',
            selected: function (event: JQuery.Event) {
                that.select(event, 'selected', true);
            },
            selecting: function (event: JQuery.Event) {
                that.select(event, 'selecting', true);
            },
            start: function (event: JQuery.Event) {
                that.select(event, 'start', true);
            },
            stop: function (event: JQuery.Event) {
                that.select(event, 'stop', true);
            },
            unselected: function (event: JQuery.Event) {
                that.select(event, 'unselected', true);
            },
            unselecting: function (event: JQuery.Event) {
                that.select(event, 'unselecting', true);
            },
        });

        this.child.listWrap = this.child.listWrap.mCustomScrollbar({
            axis: "y",
            scrollInertia: 100,
            autoHideScrollbar: true,

            mouseWheel: {
                scrollAmount: that.config.lineHeight * 2,
                preventDefault: 0,
            },

            callbacks: {
                whileScrolling: function () {
                    that.onUpdate((<any>this).mcs.top, true);
                    that.auxiliary.trigger(STATE.EVENT.AUXILIARY_PANEL_SCROLL);
                },
            },
        });

        this.child.show = function (danmaku: IDanmakuData) {
            const uhash = danmaku.uhash;
            that.child.danmakuArray = [];
            for (let i = 0; i < that.danmakuArray.length; i++) {
                if (String(that.danmakuArray[i].uhash) === String(uhash)) {
                    that.child.danmakuArray.push(that.danmakuArray[i]);
                }
            }
            that.child.number.html(that.child.danmakuArray.length);
            that.child.targetFunc.find('[orderby] .' + that.prefix + '-icon').remove();
            that.child.wrap.show();
            that.update(true, 0);
        };

        this.child.hide = function () {
            that.child.danmakuArray = [];
            that.child.wrap.hide();
        };

        this.child.close_btn.click(function () {
            that.child.hide();
        });
    }

    private _multiple_init() {
        const that = this;
        this.multiple = {};
        const container = $(this.MULTIPLE_TPL()).appendTo(this.targetFunc);
        const prefix = this.prefix + '-danmaku-multiple-control-';
        this.multiple.template = {
            container: container,
            number: container.find('.' + prefix + 'number'),
            cancel: container.find('.' + prefix + 'cancel'),
            submit: container.find('.' + prefix + 'submit'),
        };
        this.multiple.show = function (child: any) {
            if (child) {
                that.multiple.child = true;
                container.appendTo(that.child.targetFunc).show().stop().animate({ top: '0px' }, 300);
            } else {
                that.multiple.child = false;
                container.appendTo(that.targetFunc).show().stop().animate({ top: '0px' }, 300);
            }
        };

        this.multiple.hide = function () {
            container.stop().animate({ top: '-20px' }, 300, function () {
                container.hide();
            });
        };

        new Button(this.multiple.template.cancel[0], {
            type: "small",

            click: () => {
                that._unselect(that.multiple.child);
                that.multiple.hide();
            }
        });

        new Button(this.multiple.template.submit[0], {
            type: "small",

            click: () => {
                let danmakuArray;
                if (that.multiple.child) {
                    danmakuArray = that.child.danmakuArray;
                } else {
                    danmakuArray = that.danmakuArray;
                }
                const ids = [];
                for (let i = 0; i < danmakuArray.length; i++) {
                    if (
                        danmakuArray[i].selected &&
                        ids.indexOf(danmakuArray[i].uhash) === -1 &&
                        !that.isMineDanmaku(danmakuArray[i])
                    ) {
                        ids.push(danmakuArray[i].uhash);
                    }
                }
                that.auxiliary.block.batchAdd(ids.join(','), 'user');

                container.stop().animate({ top: '-40px' }, 500, function () {
                    that.multiple.hide();
                });
            }
        });
    }

    private _unselect(child: any) {
        let danmakuArray;
        const childList = this.child;
        if (child) {
            danmakuArray = childList.danmakuArray;
        } else {
            danmakuArray = this.danmakuArray;
        }
        for (let i = 0; i < danmakuArray.length; i++) {
            danmakuArray[i].selected = false;
        }
        this.update(child);
    }

    select(event: any, status: any, child?: boolean) {
        if (!this.inited) {
            this.init();
        }
        const that = this;
        let i;
        let n;
        let danmakuArray: any[];
        let container;
        let count = 0;
        const shiftArr = [];
        const childList = that.child;
        if (child) {
            danmakuArray = childList.danmakuArray;
            container = childList.container;
        } else {
            danmakuArray = this.danmakuArray;
            container = this.container;
        }
        if (
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !(
                $(event.target).is($('.danmaku-info-select-state')) ||
                $(event.target).parents('.danmaku-info-select-state').length > 0
            ) &&
            status === 'stop'
        ) {
            for (i = 0; i < danmakuArray.length; i++) {
                danmakuArray[i].selected = false;
            }
        }
        container.find('li').each(function (i: number, e: JQuery.Event) {
            n = parseInt($(e).attr('dmno')!, 10);
            if ($(e).hasClass('bpui-selected')) {
                danmakuArray[n].selected = true;
            } else {
                danmakuArray[n].selected = false;
            }
        });
        for (i = 0; i < danmakuArray.length; i++) {
            if (danmakuArray[i].selected) {
                count++;
                shiftArr.push(i);
            }
        }
        if (count > 1 && event.shiftKey && status === 'stop') {
            // shift choose
            const nowN = $(event.target).hasClass('danmaku-info-row')
                ? parseInt($(event.target).attr('dmno')!, 10)
                : parseInt($(event.target).parents('.danmaku-info-row').attr('dmno')!, 10);
            const nowI = shiftArr.indexOf(nowN);
            if (nowI > -1) {
                let startI;
                let endI;
                count = 0;
                for (i = 0; i < danmakuArray.length; i++) {
                    danmakuArray[i].selected = false;
                    container.find('li.danmaku-info-row[dmno="' + i + '"]').removeClass('bpui-selected');
                }
                if (nowI === 0) {
                    startI = shiftArr[nowI];
                    endI = shiftArr[shiftArr.length - 1];
                } else if (nowI === shiftArr.length - 1) {
                    startI = shiftArr[0];
                    endI = shiftArr[nowI];
                } else if (
                    Math.abs(shiftArr[nowI] - shiftArr[nowI - 1]) < Math.abs(shiftArr[nowI] - shiftArr[nowI + 1])
                ) {
                    startI = shiftArr[0];
                    endI = shiftArr[nowI];
                } else {
                    startI = shiftArr[nowI];
                    endI = shiftArr[shiftArr.length - 1];
                }
                for (i = startI; i <= endI; i++) {
                    danmakuArray[i].selected = true;
                    container.find('li.danmaku-info-row[dmno="' + i + '"]').addClass('bpui-selected');
                    count++;
                }
            }
        }
        this.multiple.template.number.html(count || 1);
        if (status === 'stop') {
            if (count > 1) {
                this.multiple.show(child);
                container.addClass('multi-selected');
            } else {
                this.multiple.hide();
                container.removeClass('multi-selected');
            }
        }
    }

    search(dmid: string) {
        if (!this.inited) {
            this.init();
        }
        let target: number;
        for (let i = 0, len = this.danmakuArray.length; i < len; i++) {
            this.danmakuArray[i].selected = false;
            if (this.danmakuArray[i].dmid === dmid) {
                target = i;
                this.danmakuArray[i].selected = true;
            }
        }
        if (target! !== undefined) {
            this.listWrap.mCustomScrollbar("scrollTo", target * this.config.lineHeight, {
                callbacks: true,
                scrollInertia: 0,
            });
        }
    }

    /**
     * @desc Schedule `update` method
     * @desc Cannot use this method if you invoke `update` method many times with different params
     */
    createScheduleUpdateProxy(wait: number, child?: boolean) {
        return throttle(() => this.update(child), wait || 40);
    }

    update(child?: any, top?: number) {
        if (!this.inited) {
            return;
        }
        const that = this;
        const template = this.auxiliary.template;
        let container: JQuery;
        let danmakuArray: any[];
        let listWrap: any;
        let height = 0;
        const childList = that.child;
        if (this.danmakuArray.length === 0) {
            if (!this.loadfailed) {
                this.listMask.html(this.danamkuTip);
                this.listMask.show();
            }
            this.container.hide();
        } else {
            this.listMask.hide();
            this.container.show();
        }
        // 推荐视频、弹幕列表、屏蔽设定
        // 从其他tab切到弹幕列表时，会刷新列表，但list_wrap获取的始终是主列表
        // 暂时的解决方法：切到弹幕列表时，让其始终显示主列表
        if (!child) {
            container = this.container;
            danmakuArray = this.danmakuArray;
            listWrap = this.listWrap;
            // height = 32;
        } else {
            container = childList.container;
            danmakuArray = childList.danmakuArray;
            listWrap = childList.listWrap;
        }
        let mcs = listWrap[0].mcs;
        if (typeof top !== 'undefined') {
            listWrap.mCustomScrollbar("scrollTo", top, {
                moveDragger: true,
                scrollInertia: 0
            });
        } else {
            top = mcs ? -mcs.top : 0;
        }
        container.css('height', danmakuArray.length * this.config['lineHeight'] + 'px');
        listWrap.css(
            "height",
            template.container.outerHeight()! - template.info.outerHeight()! - template.filters.outerHeight()! - template.danmakuFunction.outerHeight()! - height - template.danmakuBtnFooter.outerHeight()! - template.danmakuManagement.outerHeight()! + "px"
        );
        this.danmakuMask.css({
            height: this.listWrap.height() + "px",
            "line-height": this.listWrap.height() + "px",
        });

        this.config['size'] = Math.ceil(parseInt(this.listWrap.css('height'), 10) / this.config['lineHeight']) + 5;
        let startPos = Math.floor(top / this.config['lineHeight']);
        startPos = Math.max(0, startPos);
        const endPos =
            startPos + this.config['size'] > danmakuArray.length ? danmakuArray.length : startPos + this.config['size'];
        if (this.prevAnchor === startPos) {
            return true;
        }
        container.empty();
        for (let i = startPos; i < endPos; i++) {
            this.editDanmaku(danmakuArray, i, startPos, endPos, container, child);
        }
        container
            .find('li')
            .eq(0)
            .css('padding-top', startPos * this.config['lineHeight'] + 'px');
        // fix hidden to visible bug
        if (mcs) {
            mcs.content.css('top', mcs.top + 'px');
        }
        this.setReportBtn(this.auxiliary.user.status(), container);

        // 弹幕数由实时弹幕接口接管
        // this.updateDanmakuNumber();
    }

    private setReportBtn(status: IUserLoginInfos, container: JQuery) {
        const btn = container && container.find('.danmaku-info-report-btn');
        if (status.login) {
            btn && btn.css('display', '');
        } else {
            btn && btn.hide();
        }
    }
    private editDanmaku(
        danmakuArray: IDanmakuData[],
        i: number,
        startPos: number,
        endPos: number,
        container: JQuery,
        child: JQuery,
    ) {
        const that = this;
        const danmaku = danmakuArray[i];
        const block = that.auxiliary.block.judge(danmaku);
        const blockUser = that.auxiliary.block.judgeUser(danmaku);
        let danmakuText = danmaku.text;
        if (block) {
            danmaku.selected = false;
        }
        if (danmaku.mode === 7) {
            try {
                danmakuText = JSON.parse(danmaku.text.replace(/\r|\n|\/r|\/n/g, ''))[4];
            } catch (e) {
                console.debug(e);
            }
        }
        const fms = fmSeconds(danmaku.stime);
        // const dms = $('<li dmno="' + i + '" class="danmaku-info-row' + (danmaku.selected ? ' bpui-selected' : '') + (block ? ' danmaku-info-row-block' : '') + (danmaku.mode === 8 ? ' danmaku-info-row-special' : '') + (danmaku.pool === 1 ? ' danmaku-info-row-caption' : '') + (danmaku.mode === 7 ? ' danmaku-info-row-super' : '') + (danmaku.mode === 9 ? ' danmaku-info-row-code' : '') + '">'
        //     + '<span class="danmaku-info-time">' + fmSeconds
        //     + '</span>'
        //     + '<span class="danmaku-info-danmaku"></span></li>');
        //     container.append(dms);
        //     if (dms) {
        //         return;
        //     }
        const dm = $(
            '<li dmno="' +
            i +
            '" class="danmaku-info-row' +
            (danmaku.selected ? ' bpui-selected' : '') +
            (block ? ' danmaku-info-row-block' : '') +
            (danmaku.mode === 8 ? ' danmaku-info-row-special' : '') +
            (danmaku.pool === 1 ? ' danmaku-info-row-caption' : '') +
            (danmaku.mode === 7 ? ' danmaku-info-row-super' : '') +
            (danmaku.mode === 9 ? ' danmaku-info-row-code' : '') +
            '">' +
            '<span class="danmaku-info-time">' +
            fms +
            '</span>' +
            '<span class="danmaku-info-danmaku"></span></li>',
        )
            .on('dblclick', (e) => {
                if (
                    !$(e.target).hasClass('danmaku-info-time-edit') &&
                    !$(e.target).hasClass('danmaku-info-report-btn') &&
                    ($(e.target).hasClass('danmaku-info-danmaku') || $(e.target).hasClass('danmaku-info-time'))
                ) {
                    window['player']['seek'](danmaku.stime - 1);

                    if (this.basMode && danmaku.mode === 9) {
                        if (/\/\/ Generated by bas visual panel$/.test(danmaku.text)) {
                            this.auxiliary.basVisualPanel.setData(danmaku);
                        } else {
                            new Tooltip({
                                name: 'unsupported-bas',
                                target: $(e.target),
                                position: 'center-center',
                                text: '该弹幕只支持代码模式编辑',
                            });
                        }
                    }
                }
            })
            .bind('contextmenu', () => {
                if (!$(this).hasClass('bpui-selected')) {
                    $(this).siblings().removeClass('bpui-selected');
                    for (let j = startPos; j < endPos; j++) {
                        danmakuArray[j].selected = false;
                    }
                    $(this).addClass('bpui-selected');
                    danmaku.selected = true;
                }
            })
            .append(() => {
                return $('<span>')
                    .addClass('danmaku-info-date')
                    .text(formatDate(new Date(danmaku.date * 1000), 'MM-dd hh:mm'));
            });
        dm.find('.danmaku-info-danmaku')
            .attr('title', danmakuText.substring(0, 1000))
            .text(danmakuText.substring(0, 30));
        if (that.dmidMoved[danmaku.dmid]) {
            dm.addClass('danmaku-info-row-caption');
        }
        if (that.dmidDelted[danmaku.dmid]) {
            dm.addClass('danmaku-info-row-deleting');
        }
        if (block) {
            dm.find('.danmaku-info-date').hide();
            dm.append('<span class="danmaku-info-tips danmaku-info-block">' + that._block_state(block) + '</span>');
            dm.find('.danmaku-info-danmaku').append(
                '<span class="danmaku-info-block">' + that._block_state(block) + '</span>',
            );
        }
        const floatLayer = $('<div>').addClass('danmaku-info-float-layer').appendTo(dm);
        const isMine = this.isMineDanmaku(danmaku);
        if (isMine && danmaku.mode !== 9) {
            $(
                '<div class="danmaku-info-report-btn" data-tooltip="1" data-change-mode="2" data-text="撤回这条弹幕" data-position="top-right" data-change-mode="1">撤回</div>',
            )
                .appendTo(floatLayer)
                .click(function (e) {
                    // e.stopImmediatePropagation();
                    that.auxiliary.trackInfoPush('list_recall');
                    that.danmakuRecall(danmaku);
                });
        } else {
            $(
                '<div class="danmaku-info-report-btn" data-tooltip="1" data-change-mode="2" data-text="举报该弹幕的发送者" data-position="top-right" data-change-mode="1">举报</div>',
            )
                .appendTo(floatLayer)
                .click(function (e) {
                    const info: any = { dmid: danmaku.dmid };
                    if (danmaku.weight! > 0) {
                        info.weight = danmaku.weight;
                    }
                    that.auxiliary.trackInfoPush('list_report', JSON.stringify(info));
                    // e.stopImmediatePropagation();
                    that.getReport().report.show!(danmaku);
                });
        }
        if (that.canProtect(danmaku)) {
            const protectBtn = $(
                '<div class="danmaku-info-protect-btn" data-tooltip="1" data-change-mode="2" data-text="申请保护该弹幕" data-position="top-right" data-change-mode="1">申请保护</div>',
            ).appendTo(floatLayer);
            if (that.dmidApplied[danmaku.dmid]) {
                dm.addClass('danmaku-info-raw-applied');
                protectBtn.attr('data-text', '该弹幕已申请保护~').text('已申请');
            }
            protectBtn.click(function (e) {
                if (!dm.hasClass('danmaku-info-raw-applied')) {
                    that.auxiliary.trackInfoPush('danmaku_protect_apply_dmlist');
                    that.applyProtect(danmaku, { top: e.clientY, left: e.clientX });
                }
            });
        } else if (!isMine && danmaku.mode < 8) {
            $(
                '<div class="danmaku-info-block-btn" data-tooltip="1" data-change-mode="2" data-text="' +
                (blockUser ? '取消' : '') +
                '屏蔽该弹幕的发送者" data-position="top-right" data-change-mode="1">' +
                (blockUser ? '取消屏蔽' : '屏蔽用户') +
                '</div>',
            )
                .appendTo(floatLayer)
                .click(function (e) {
                    // e.stopImmediatePropagation();
                    const s: number = Number($(this).parents('.danmaku-info-row').attr('dmno'));
                    if (danmaku.mode > 7) {
                        return true;
                    }
                    if (blockUser) {
                        that.auxiliary.block.remove(danmakuArray[s].uhash, 'user');
                        that.update();
                        child && that.update(child);
                    } else {
                        that.auxiliary.block.add(danmakuArray[s].uhash, 'user', true);
                    }
                    that.auxiliary.trackInfoPush('list_prevent');
                });
        }
        container.append(dm);

        dm.find('[data-tooltip="1"]').each((i, e) => {
            new Tooltip({
                name: 'controll-tooltip',
                target: $(e),
                type: 'tip',
                margin: 1,
            });
        });
    }
    private _showRecall(text: string, type?: string) {
        if (type && type === 'list') {
            new Tooltip({
                name: 'recall',
                target: this.auxiliary.template.auxiliaryArea,
                position: 'center-center',
                text: text,
                padding: [15, 20, 15, 20],
            });
        } else {
            new Tooltip({
                name: 'recall',
                target: this.auxiliary.template.playerWrap,
                position: 'center-center',
                text: text,
                padding: [15, 20, 15, 20],
            });
        }
    }
    resize(listWrap: JQuery) {
        const template = this.auxiliary.template;
        const options = this.auxiliary.options;
        const offset = this.auxiliary.extraParams ? this.auxiliary.extraParams.danmakuListOffset : 0;
        let h = this.auxiliary.getPlayerHeight();
        h = offset ? h - offset : h;
        const maskH =
            h -
            this.auxiliary.filtersHeight -
            template.danmakuFunction.outerHeight()! -
            template.danmakuManagement.outerHeight()! -
            template.danmakuBtnFooter.outerHeight()!;
        this.listMask && this.listMask.css({ height: maskH + 'px', 'line-height': maskH + 'px' });
        listWrap && listWrap.css('height', maskH + 'px');
    }
    remove(dmid: string) {
        for (let i = 0; i < this.danmakuArray.length; i++) {
            if (dmid === this.danmakuArray[i].dmid) {
                this.danmakuArray.splice(i, 1);
            }
        }
    }
    private danmakuRecall(danmaku: IDanmakuData) {
        const data = this.danmakuListItem(danmaku);
        // 221006
        this.auxiliary.directiveManager.sender(WD.DL_RECALL_DANMAKU, data, (received?: IReceived) => {
            const res = received!['data'];
            if (res && (Number(res['code']) === 0 || res['message'])) {
                if (res && Number(res['code']) === 0) {
                    this.remove(data['dmid'] + '');
                    this.update();
                }
                if (res && (res['code'] !== undefined || res['message'])) {
                    this._showRecall(res['message'], 'list');
                } else {
                    const text = '撤回失败，服务器出错';
                    this._showRecall(text, 'list');
                }
            } else {
                let text = '';
                if (res['status'] >= 500 && res['status'] < 600) {
                    text = '撤回失败，服务器出错';
                } else {
                    text = '撤回失败，请检查你的网络';
                }
                this._showRecall(text, 'list');
            }
        });
    }
    private _block_state(state: number) {
        switch (state) {
            case STATE.BLOCK_CLOUD_UP:
                return 'UP主屏蔽';
            case STATE.BLOCK_LIST_USER:
            case STATE.BLOCK_LIST_KEYWORD:
            case STATE.BLOCK_LIST_COLOR:
            case STATE.BLOCK_LIST_REGEXP:
            case STATE.BLOCK_CLOUD_VIDEO:
            case STATE.BLOCK_CLOUD_PARTITION:
            case STATE.BLOCK_CLOUD_ALL:
                return '已屏蔽';
            case STATE.BLOCK_SCROLL:
            case STATE.BLOCK_REVERSE:
            case STATE.BLOCK_BOTTOM:
            case STATE.BLOCK_TOP:
            case STATE.BLOCK_COLOR:
            case STATE.BLOCK_DISABLED:
            case STATE.BLOCK_GUEST:
            case STATE.BLOCK_FONTSIZE:
            // case STATE.BLOCK_FUNC_NORMAL:
            // case STATE.BLOCK_FUNC_SUBTITLE:
            // case STATE.BLOCK_FUNC_SPECIAL:
            default:
                return '';
        }
    }

    private _order(orderby: string, element: JQuery, child: any) {
        const childList = this.child;
        const config = child ? childList.config : this.config;
        let danmakuArray = child ? childList.danmakuArray : this.danmakuArray;
        const target = child ? childList.targetFunc : this.targetFunc;
        if (orderby === config['orderby']) {
            config['positive'] = !config['positive'];
        } else {
            config['positive'] = true;
        }
        config['orderby'] = orderby;
        const positive = config['positive'];

        if (orderby === 'text') {
            // 屏蔽排序需要拆分数组
            const blockDanmakuArray = [];

            for (let i = danmakuArray.length - 1; i >= 0; i--) {
                if (this.auxiliary.block.judge(danmakuArray[i])) {
                    blockDanmakuArray.push(danmakuArray.splice(i, 1)[0]);
                }
            }

            blockDanmakuArray.sort(this._order_function(positive, orderby));
            danmakuArray.sort(this._order_function(positive, orderby));

            if (positive) {
                danmakuArray = danmakuArray.concat(blockDanmakuArray);
            } else {
                danmakuArray = blockDanmakuArray.concat(danmakuArray);
            }

            if (child) {
                childList.danmakuArray = danmakuArray;
            } else {
                this.danmakuArray = danmakuArray;
            }
        } else {
            danmakuArray.sort(this._order_function(positive, orderby));
        }

        target.find(`[orderby] .${this.prefix}-icon`).remove();
        target
            .find('[orderby="' + orderby + '"]')
            .append(config['positive'] ? this.UP_ARROW_TPL() : this.DOWN_ARROW_TPL());

        this.update(child);
        this.auxiliary.trackInfoPush(this.orderlist[orderby]);
    }

    private _order_function(positive: any, orderby: string) {
        return function (a: any, b: any) {
            if (a[orderby] > b[orderby]) {
                return positive ? 1 : -1;
            } else if (a[orderby] < b[orderby]) {
                return positive ? -1 : 1;
            } else {
                return 0;
            }
        };
    }

    order(orderby: string, element: any, child?: any) {
        if (!this.inited) {
            this.init();
        }
        if (orderby === 'stime' || orderby === 'text' || orderby === 'date' || orderby === 'uname') {
            this._order(orderby, element, child);
        } else {
            return false;
        }
    }

    canProtect(d: IDanmakuData) {
        const user = this.auxiliary.user.status();
        return (
            d &&
            ((d.mid && String(d.mid) === String(user.uid)) || d.uhash === user.uhash || d.uhash === user.uhash) &&
            user.level! >= 4 &&
            this.auxiliary.config.playerType === 1
        );
        // return false;
    }

    onUpdate(top: any, child?: boolean) {
        if (!this.inited) {
            this.init();
        }
        top = top || 0;
        const type = child ? 1 : 0;
        // console.log(this.danmakuArray.length);
        if (typeof this.lastScrollTop[type] === 'undefined') {
            this.lastScrollTop[type] = top;
            this.update(child);
        } else if (this.lastScrollTop[type] - top < -5 || this.lastScrollTop[type] - top > 5) {
            this.lastScrollTop[type] = top;
            this.update(child);
        }
        // console.log('------');
        // console.log('this.lastScrollTop[type]:' + this.lastScrollTop[type]);
        // console.log('top:' + top);
        // console.log('this.lastScrollTop[type] - top:' + (this.lastScrollTop[type] - top) + (this.lastScrollTop[type] - top < -5 || this.lastScrollTop[type] - top > 100));
    }

    danamkuManagement() {
        if (!this.inited) {
            this.init();
        }
        const that = this;
        const prefix = this.prefix;
        const auxiliary = this.auxiliary;
        const template = auxiliary.template;
        const danmakuOperations = [
            {
                icon: 'icon-18danmaku-backstage',
                text: '后台',
                name: 'danamku-backstage',
                title: '去后台管理(按住Ctrl可多选)',
                handler: that._danmakuBackstage,
            },
            {
                icon: 'icon-18danmaku-move',
                text: '移动',
                name: 'danmaku-move',
                title: '选中弹幕移动到字幕池(按住Ctrl可多选)',
                handler: that._danmakuMove,
            },
            {
                icon: 'icon-18danmaku-protect',
                text: '保护',
                name: 'danmaku-protect',
                title: '保护选中弹幕(按住Ctrl可多选)',
                handler: that._danmakuProtect,
            },
            {
                icon: 'icon-18danmaku-ignore',
                text: '忽略',
                name: 'danmaku-ignore',
                title: '忽略被举报的弹幕(按住Ctrl可多选)',
                handler: that._danmakuIgnore,
            },
            {
                icon: 'icon-18danmaku-delete',
                text: '删除',
                name: 'danmaku-delete',
                title: '删除选中弹幕(按住Ctrl可多选)',
                handler: that._danmakuDelete,
            },
        ];
        const info = that.auxiliary.user.status();
        template.danmakuManagement.empty();
        const renderTabs = (filteredOptions: any) => {
            this.auxiliary.template.danmakuList.addClass(`${prefix}-hasmanage`);
            const width = 100 / filteredOptions.length;
            filteredOptions.forEach((item: any) => {
                const wrapper = $(
                    `<div class="${prefix}-fl" style="width: ${width}%;"><i class="${prefix}-iconfont ${item.icon}"></i><div>${item.text}</div></div>`,
                );
                const tooltipBase = {
                    target: wrapper,
                    name: item.name,
                    top: 8,
                    position: 'top-right',
                };
                new Tooltip(
                    $.extend(
                        {
                            text: item.title,
                            type: 'tip',
                        },
                        tooltipBase,
                    ),
                );
                wrapper.click((e) => {
                    const selectedList = that._getSelectedList();
                    if (selectedList.length) {
                        item.handler.call(that, info, selectedList, tooltipBase);
                    }
                });
                template.danmakuManagement.append(wrapper);
            });
        };

        if (info && info.login) {
            if (info.isadmin) {
                renderTabs(danmakuOperations.slice(1));
            } else if (info.p_role === STATE.P_ROLE_ASSISTANT) {
                renderTabs(danmakuOperations.slice(1));
            }
        }
    }

    private _getSelectedList() {
        return this.danmakuArray.filter((d) => d.selected);
    }

    private _danmakuBackstage(info: any, selectedList: any[], tooltipBase?: any) {
        const dmids = selectedList.map((d) => d.dmid).join(',');
        if (info.isSysAdmin) {
            const url = `//interface.bilibili.com?dmid=${dmids}&dm_inid=${info.chat_id}`;
            this.auxiliary.window['open'](url);
        }
    }

    private _danmakuMove(info: any, selectedList: any[], tooltipBase: any) {
        const that = this;
        const dmidList = selectedList.map((d) => this.danmakuListItem(d));
        const moveHander = () => {
            dmidList.forEach((d) => {
                that.dmidMoved[d['dmid']] = true;
            });
            that.update();
        };
        // 221002
        this.auxiliary.directiveManager.sender(WD.DL_MOVE_DANMAKU, dmidList, (received?: IReceived) => {
            const json = received!['data'];
            if (json) {
                if (json && json['code'] === 0) {
                    moveHander();
                }
                that._danmakuTooltip(tooltipBase, json);
            } else {
                that._danmakuTooltip(tooltipBase);
            }
        });
        this.auxiliary.trackInfoPush('list_up_tosubtitle');
    }

    private _danmakuProtect(info: any, selectedList: any[], tooltipBase: any) {
        const that = this;
        const dmidList = selectedList.map((d) => this.danmakuListItem(d));
        // 221003
        this.auxiliary.directiveManager.sender(WD.DL_PROTECT_DANMAKU, dmidList, (received?: IReceived) => {
            const json = received!['data'];
            if (json) {
                if (json && json['code'] === 0) {
                    that._danmakuTooltip(tooltipBase, json);
                }
            } else {
                that._danmakuTooltip(tooltipBase);
            }
        });
        this.auxiliary.trackInfoPush('list_up_protect');
    }

    private _danmakuIgnore(info: any, selectedList: any[], tooltipBase?: any) {
        // @TODO: remove ui and relevant code
    }
    private _danmakuDelete(info: any, selectedList: any[], tooltipBase?: any) {
        const that = this;
        const dmidList = selectedList.map((d) => this.danmakuListItem(d));
        const deleteHander = () => {
            dmidList.forEach((d) => {
                that.dmidDelted[d['dmid']] = true;
                // that.auxiliary.basDanmaku && that.auxiliary.basDanmaku.remove(dmid);
                that.auxiliary.basPanel && that.auxiliary.basPanel.delSendedDanmaku(d['dmid']);
            });
            that.update();
        };

        // 221004
        this.auxiliary.directiveManager.sender(WD.DL_DELETE_DANMAKU, dmidList, (received?: IReceived) => {
            const json = received!['data'];
            if (json) {
                if (json && json['code'] === 0) {
                    deleteHander();
                }
                that._danmakuTooltip(tooltipBase, json);
            } else {
                that._danmakuTooltip(tooltipBase);
            }
        });
        this.auxiliary.trackInfoPush('list_up_ignore_report');
    }
    private _danmakuBanned(info: any, selectedList: any[], pageX: number, pageY: number) {
        const that = this;
        const tooltipBase = {
            top: pageY,
            left: pageX,
            position: 'top-left',
        };
        // 221005
        const data = this.danmakuListItem(selectedList[0]);
        this.auxiliary.directiveManager.sender(WD.DL_FORBID_USER_SEND, data, (received?: IReceived) => {
            const json = received!['data'];
            if (json) {
                that._danmakuTooltip(tooltipBase, json);
                return;
            }
            that._danmakuTooltip(tooltipBase);
        });
    }
    private danmakuListItem(danmaku: IDanmakuData) {
        return {
            color: danmaku.color,
            date: danmaku.date,
            dmid: danmaku.dmid + '',
            mode: danmaku.mode,
            pool: danmaku.pool,
            stime: danmaku.stime,
            text: danmaku.text,
            uhash: danmaku.uhash,
            size: danmaku.size,
            uname: danmaku.uname,
            uid: danmaku.mid,
        };
    }
    show() {
        if (!this.inited) {
            this.init();
        }
        if (this.lastScrollTop) {
            this.lastScrollTop = [this.scrollTop];
        }
    }
    private _createDatePicker(reload?: boolean) {
        if (this.datePicker && reload) {
            this.datePicker.reload();
            return;
        }
        if (!this.datePicker) {
            let currentDate = null;
            if (this.options['timestamp']) {
                // 仅生效一次
                currentDate = {
                    year: new Date(this.auxiliary.config.d!).getFullYear(),
                    month: new Date(this.auxiliary.config.d!).getMonth(),
                    day: new Date(this.auxiliary.config.d!).getDate(),
                };
                delete this.config['timestamp'];
                delete this.auxiliary.config.d;
            }
            this.datePicker = new DatePicker(this.auxiliary, this.auxiliary.template.historyBtn, {
                appendTo: $('.' + this.auxiliary.prefix + '-danmaku'),
                position: 'top-center',
                top: -5,
                disabled: this.dmClosed,
                currentDate: currentDate!,
                onToggle: () => {
                    // that.player.template.historyBtn.toggleClass('active');
                },
                onChange: (timestamp: number) => {
                    this.auxiliary.template.danmakuMask.removeClass('disabled').html('弹幕列表装填中...').show();
                    const t = timestamp + (new Date().getTimezoneOffset() + 480) * 60;
                    const date = new Date(t * 1000);
                    this.loadHistory(timestamp === 0 ? '0' : formatDate(date, 'yyyy-MM-dd'));
                },
            });
        }
    }

    private loadHistory(date: string) {
        // 222002
        this.auxiliary.directiveManager.sender(
            WD.HD_DATE_CHANGE,
            {
                date: date,
            },
            (received?: IReceived) => {
                if (received!['data'] === 'error') {
                    this.failed(() => {
                        this.loadHistory(date);
                    });
                    return;
                }
                this.danmakuArray = [];
                this.load(received!);
                this.update(false, 0);
            },
        );
    }
    private _danmakuTooltip(tooltipBase: any, json?: any) {
        if (json) {
            if (json.code === 0) {
                new Tooltip($.extend({ text: '操作成功' }, tooltipBase));
            } else {
                new Tooltip($.extend({ text: json.message || '操作失败' }, tooltipBase));
            }
        } else {
            new Tooltip($.extend({ text: '操作失败' }, tooltipBase));
        }
    }

    setBasMode(state: boolean) {
        if (state) {
            this.basMode = true;
            this.auxiliary.template.danmakuList.addClass(`${this.prefix}-bas-mode`);
            if (!this.child) {
                return;
            }
            this.child.danmakuArray = [];
            for (let i = 0; i < this.danmakuArray.length; i++) {
                if (this.danmakuArray[i].mode === 9) {
                    this.child.danmakuArray.push(this.danmakuArray[i]);
                }
            }
            this.child.number.html(this.child.danmakuArray.length);
            this.child.targetFunc.find('[orderby] .' + this.prefix + '-icon').remove();
            this.child.wrap.show();
            this.update(true, 0);
            if (this.child.config['orderby'] !== 'stime') {
                this.order('stime', null, true);
            }
        } else {
            this.basMode = false;
            this.auxiliary.template.danmakuList.removeClass(`${this.prefix}-bas-mode`);

            this.child?.wrap.hide();
            this.update(false, 0);
        }
    }

    destroy() {
        this.inited = false;
        this.danmakuArray = [];
    }
}

export default List;
