/**
 * @description bilibili player mode component
 * @author dingjianqiang@bilibili.com
 * @date 05/19/2016
 */
import STATE from './state';
import Player from '../player';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import { Checkbox } from '@jsc/player-auxiliary/js/ui/checkbox';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

class ModeSelection {
    private player: Player;
    private config: any;
    private container: JQuery;
    private prefix: string;
    private componentName: string;
    private selection: { [key: string]: any };
    private $container!: JQuery;
    private $panel!: JQuery;
    private $mask!: JQuery;
    private $loginBtn!: JQuery;
    private MS_TYPE_OBJ!: { [key: string]: any; };
    private MS_SIZE_OBJ!: { [key: string]: any; };
    private MS_MODE_OBJ!: { [key: string]: any; };
    private inited = false;
    // private littleFont = '';
    // private danmakuColorPicker!: ColorPicker;
    private panelHideTimer!: number | null;
    private panelShowTimer!: number | null;
    private panelShowTimerDelay!: number | null;
    private upDm!: Checkbox;
    private isVip!: boolean; // 是否为vip面板
    private isAdmin!: boolean;
    private openStatus!: number;

    constructor(player: Player, container: JQuery, config: any) {
        this.config = $.extend(
            {
                triggerBtn: '',
                callback: function () { },
                onOpen: function () { },
                onClose: function () { },
                onChange: function () { },
            },
            config,
        );

        this.player = player;
        this.container = container;
        this.prefix = player.prefix;
        this.componentName = 'mode-selection';
        this.selection = {
            type: 0,
            size: 0,
            mode: 0,
        };

        this.config.triggerBtn.on('click', this.toggle.bind(this));
        // this.globalEvents(); // 与hover浮现八字不合，弃置
    }

    private init() {
        if (!this.inited) {
            this.inited = true;

            const cssPrefix = this._cssPrefix.bind(this);

            this.container.addClass('relative');

            this.$container = $('<div>').addClass(cssPrefix('container disabled')).appendTo(this.container);

            this.$panel = $('<div>').addClass(cssPrefix('panel')).appendTo(this.$container);
            this.$mask = $('<div>').addClass(cssPrefix('mask')).appendTo(this.$container);

            this.$loginBtn = $('<a href="javascript:void(0);" >')
                .addClass(cssPrefix('mask-warning login-btn'))
                .appendTo(this.$mask);

            const loginBtn = new Button(this.$loginBtn, {
                // type: 'blue',
                label: "请先登录",
            });
            loginBtn.on('click', () => {
                this.player.quicklogin.load();
            });

            this.initializeRows();

            typeof this.config.callback === 'function' && this.config.callback(this.initializeRows.bind(this));

            this.bindEvents();
        }
    }
    private globalEvents() {
        this.config.triggerBtn &&
            this.config.triggerBtn.hover(
                () => {
                    this.clearPanelTimer(true);
                    this.player.trigger(STATE.EVENT.VIDEO_PANEL_HOVER);
                    this.panelShowTimer = window.setTimeout(
                        () => {
                            this.open();
                        },
                        this.player.config.touchMode ? 0 : 300,
                    );
                },
                () => {
                    this.panelHideTimer = window.setTimeout(
                        () => {
                            this.clearPanelTimer();
                        },
                        this.player.config.touchMode ? 0 : 200,
                    );
                },
            );
        this.player.bind(STATE.EVENT.VIDEO_PANEL_HOVER, () => {
            this.clearPanelTimer();
        });
    }
    private clearPanelTimer(hover?: boolean) {
        this.panelShowTimer && clearTimeout(this.panelShowTimer);
        if (this.panelHideTimer) {
            clearTimeout(this.panelHideTimer);
            this.panelHideTimer = null;
            if (!hover) {
                // 为了解决重复上报问题
                this.panelShowTimerDelay && clearTimeout(this.panelShowTimerDelay);
                this.close();
            }
        }
    }
    private _cssPrefix(className: string) {
        return this.prefix + '-' + this.componentName + '-' + className;
    }

    private _selectionRowTemplate(data: any) {
        let rowHtml = '';
        let selectionHtml = '';
        let extraClass = '';
        let maskHtml = '';
        const prefix = this.prefix;

        if (data && data.selection && data.selection.length) {
            rowHtml += '<div class="' + this._cssPrefix('row') + ' ' + data.type + '">';

            rowHtml += '<div class="row-title">' + data.title + '</div>';
            rowHtml += '<div class="row-selection clearfix">';

            data.selection instanceof Array &&
                data.selection.forEach(function (value: any) {
                    if (!value.hidden) {
                        extraClass = '';
                        if (value.selected) {
                            extraClass = 'active ';
                        }

                        if (value.mask) {
                            extraClass += 'disabled';
                            maskHtml =
                                '<div class="selection-span-mask selection-mask-tooltip" data-position="top-center" data-text="' +
                                value.tipText +
                                '"></div>';
                        }

                        selectionHtml +=
                            '<div class="selection-span js-action ' +
                            extraClass +
                            '" data-type="' +
                            data.type +
                            '" name="' +
                            data.type +
                            '_selector" data-value="' +
                            value.data +
                            '">' +
                            maskHtml;

                        if (value.icon) {
                            selectionHtml += `<span class="${prefix}-iconfont ${value.icon} selection-icon" name="${data.type}_selector">
                            <i class="${prefix}-iconfont icon-24danmucurrent" name="${data.type}_selector"></i>
                        </span>`;
                        }

                        selectionHtml +=
                            '<span class="selection-name" name="' +
                            data.type +
                            '_selector">' +
                            value.name +
                            '</span></div>';
                    }
                });

            rowHtml += selectionHtml;
            rowHtml += '</div></div>';
        }

        return rowHtml;
    }

    private _appendSelectionRow(element: JQuery, data: any) {
        const that = this;

        if (data instanceof Array) {
            data.forEach(function (value) {
                that._appendSelectionRow(element, value);
            });
        } else {
            element.append(that._selectionRowTemplate(data));
        }
    }

    private _updateObj(arr: any, obj: any) {
        if (arr && arr instanceof Array && arr.length) {
            obj.selection &&
                obj.selection.forEach(function (val: any, i: number) {
                    val.hidden = arr[i] ? false : true;

                    // special key for mode selection mode mask
                    if (arr[i] === -1) {
                        val.mask = true;
                        val.tipText = '等级Lv2解锁此功能';
                    } else if (arr[i] === -2) {
                        val.mask = true;
                        val.tipText = '等级Lv3解锁此功能';
                    } else {
                        val.mask = false;
                        val.tipText = '';
                    }
                });
        } else {
            obj.selection = [];
        }
    }

    private _resetSelectionConfig() {
        this.MS_TYPE_OBJ = {
            type: 'pool',
            title: '类型',
            selection: [
                { name: '普通弹幕', data: 0, hidden: true, selected: true },
                { name: '字幕弹幕', data: 1, hidden: true },
            ],
        };
        this.MS_SIZE_OBJ = {
            type: 'fontsize',
            title: '字号',
            selection: [
                { name: '极小', data: 12, hidden: true },
                { name: '超小', data: 16, hidden: true },
                { name: '小', data: 18, hidden: true },
                { name: '标准', data: 25, hidden: true, selected: true },
                { name: '大', data: 36, hidden: true },
                { name: '超大', data: 45, hidden: true },
                { name: '极大', data: 64, hidden: true },
            ],
        };
        this.MS_MODE_OBJ = {
            type: 'mode',
            title: '模式',
            selection: [
                { name: '滚动弹幕', icon: "icon-48danmunormal", data: 1, hidden: true, selected: true },
                { name: '顶部弹幕', icon: "icon-48danmutop", data: 5, hidden: true },
                { name: '底部弹幕', icon: "icon-48danmubottom", data: 4, hidden: true },
                { name: '逆向弹幕', icon: "icon-48danmuback", data: 6, hidden: true },
            ],
        };
    }

    private initializeRows(isLogin?: boolean, pool?: number[], size?: number[], mode?: number[], level?: number) {
        const that = this;

        this._resetSelectionConfig();

        if (isLogin) {
            const times = size!.reduce((res, c) => {
                res[c] ? res[c]++ : (res[c] = 1);
                return res;
            }, <Record<string, any>>{});
            // if (times[1] > 4) {
            //     this.littleFont = 'little-font';
            // }
            that._updateObj(pool, that.MS_TYPE_OBJ);
            that._updateObj(size, that.MS_SIZE_OBJ);
            that._updateObj(mode, that.MS_MODE_OBJ);

            that.enable();
        } else {
            that._updateObj(STATE.SEND_POOL_NORMAL, that.MS_TYPE_OBJ);
            that._updateObj(STATE.SEND_FONT_SIZE_NORMAL, that.MS_SIZE_OBJ);
            that._updateObj(STATE.SEND_MODE_NORMAL, that.MS_MODE_OBJ);
        }

        // control by user status
        this.$panel.html('');
        if (pool instanceof Array && pool.some((i: number) => i > 0)) {
            this.$container.addClass(this._cssPrefix('isVip'));
            this.isVip = true;
        }
        this._appendSelectionRow(this.$panel, [this.MS_TYPE_OBJ, this.MS_SIZE_OBJ, this.MS_MODE_OBJ]);
        const row = this._cssPrefix('row');
        // if (level! > 1) {
        //     this.$panel.append(
        //         $(`<div class="${row} color">
        //                         <div class="row-title">颜色</div>
        //                         <div class="row-selection danmaku-color"></div>
        //                     </div>`),
        //     );
        //     this.danmakuColorPicker = new ColorPicker(this.$panel.find('.danmaku-color')[0], {
        //         width: 176,
        //         countPerLine: 7,
        //         dark: true,
        //     });
        //     this.danmakuColorPicker.on('change', (e) => {
        //         typeof this.config.onChange === 'function' &&
        //             this.config.onChange({
        //                 color: Utils.colorToDecimal(e.value),
        //             });
        //         this.player.track && this.player.track.trackInfoPush('danmuku_color');
        //     });
        // }
        this.$panel.find('.selection-mask-tooltip').each(function () {
            new Tooltip({
                name: 'selection-tip',
                type: 'tip',
                // arrow: true,
                target: $(this),
            });
        });
        this.isAdmin && this.update(this.isAdmin);
    }

    private bindEvents() {
        const that = this;

        this.$panel.on('click', '.js-action', function () {
            that.activeSelectionSpan($(this));
        });

        this.player.$window.on('click contextmenu', function (e: any) {
            if (
                that.openStatus &&
                !$.contains(that.$container[0], e.target) &&
                !$.contains(that.config.triggerBtn[0], e.target) &&
                that.config.triggerBtn[0] !== e.target
            ) {
                that.close();
            }
        });
    }

    private activeSelectionSpan($span: JQuery) {
        const selection: any = {};
        let type;
        let value;

        if (!$span.hasClass('active') && !$span.hasClass('disabled')) {
            $span.parents('.row-selection').find('.selection-span.active').removeClass('active');
            $span.addClass('active');

            type = $span.attr('data-type')!;
            value = parseInt($span.attr('data-value')!, 10);
            selection[type] = value;

            typeof this.config.onChange === 'function' && this.config.onChange(selection);
            if (this.upDm && type === 'pool') {
                if (value) {
                    this.upDm.value(false);
                    this.upDm.disable();
                } else {
                    this.upDm.value(this.player.videoSettings.setting_config.upDm);
                    this.upDm.enable();
                }
            }
        }
    }
    update(isAdmin: boolean) {
        this.isAdmin = isAdmin;
        let value = this.player.videoSettings.setting_config.upDm;
        if (isAdmin && this.inited) {
            const row = this._cssPrefix('row');
            const panel = $(`<div class="${row} updm"><span class="${row}-up"></span></div>`);
            this.$container.addClass(this._cssPrefix('isadmin'));
            if (this.isVip) {
                panel.insertAfter(this.$panel.find('.fontsize'));
            } else {
                this.$panel.append(panel);
            }
            this.upDm = new Checkbox(this.$panel.find(`.${row}-up`), {
                label: '带up主身份标识发送',
                // dark: true,
                checked: isAdmin && value
            });
            this.upDm.on('change', (e: any) => {
                this.config.onChange({ updm: e.value });
                if (e.value) {
                    this.$container.addClass(this._cssPrefix('hasUp'));
                } else {
                    this.$container.removeClass(this._cssPrefix('hasUp'));
                }
                if (e.manual) {
                    this.player.set('setting_config', 'upDm', e.value);
                }
            });
        }
        isAdmin && this.config.onChange({ updm: isAdmin && value });
    }
    // 获取当前用户up主身份标识
    // upcheckbox：1代表头像为选中状态，0代表头像为取消选中,2表示无头像复选框
    getUp() {
        if (this.upDm) {
            return this.player.videoSettings.setting_config.upDm ? 1 : 0;
        }
        return 2;
    }

    toggle() {
        if (!this.inited) {
            this.init();
        }

        if (!this.$container.hasClass('active')) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        if (!this.inited) {
            this.init();
        }

        this.openStatus = 1;
        this.panelShowTimerDelay = window.setTimeout(() => {
            this.panelShowTimerDelay = null;
            // 防止刚执行初始化导致的动画失效
            this.$container.addClass('active');
            if (this.upDm?.value()) {
                this.$container.addClass(this._cssPrefix('hasUp'));
            } else {
                this.$container.removeClass(this._cssPrefix('hasUp'));
            }
        }, 0);

        typeof this.config.onOpen === 'function' && this.config.onOpen();
    }

    close() {
        if (!this.inited) {
            this.init();
        }

        this.openStatus = 0;
        this.$container.removeClass('active');

        typeof this.config.onClose === 'function' && this.config.onClose();
    }

    enable() {
        if (!this.inited) {
            this.init();
        }

        this.$container.removeClass('disabled');
    }

    disable() {
        this.$container.removeClass('disabled');
    }

    destroy() { }
}

export default ModeSelection;
