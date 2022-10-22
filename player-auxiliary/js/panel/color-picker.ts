import Player from '@jsc/bilibiliplayer/js/player';
import STATE from '@jsc/bilibiliplayer/js/player/state';
import { Button } from '../ui/button';
class ColorPicker {
    private container: any;
    private config: any;
    private triggerBtn: any;
    private MAJOR_COLOR_ARR = ['00', '33', '66', '99', 'CC', 'FF'];
    private LEVEL_WARNING = '等级Lv2 解锁此功能';
    private activeColor = 'FFFFFF';
    private disabled = false;
    private prefix: string;
    private componentName = 'color-picker';
    private openStatus = 0;
    private $container!: JQuery;
    private $inputGroup!: JQuery;
    private $panel!: JQuery;
    private $mask!: JQuery;
    private $color!: JQuery;
    private $input!: JQuery;
    private $loginBtn!: JQuery;
    private $levelWarning!: JQuery;
    private $callbackBtn!: JQuery;
    private inited = false;

    private panelShowTimer!: number;
    private panelHideTimer!: number;
    private panelShowTimerDelay!: number;

    constructor(public player: Player, container: any, config: any) {
        this.config = $.extend(
            {
                triggerBtn: '',
                changedMode: 1, // 0 : color, 1 : background
                callback: function () { },
                onChange: function (color: string) { },
                onOpen: function () { },
                onClose: function () { },
            },
            config,
        );
        this.container = container;
        this.triggerBtn = this.config.triggerBtn || this.container;
        this.prefix = player.prefix;
        this.config.triggerBtn.on('click', this.toggle.bind(this));
        // this.globalEvents();
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
            this.panelHideTimer = <any>null;
            if (!hover) {
                // 为了解决重复上报问题
                this.panelShowTimerDelay && clearTimeout(this.panelShowTimerDelay);
                this.close();
            }
        }
    }
    private _cssPrefix(className: string) {
        return `${this.prefix}-${this.componentName}-${className}`;
    }
    private _getColorSpan(color: string) {
        return `<span class="color-span" name="color_picker" data-color="${color}" style="background-color:#${color}"></span>`;
    }
    private _getColorPanel() {
        let panelHtml = '';
        const parentHtml = '<div class="color-spans clearfix">';
        const parentLineHtml = '<div class="color-spans color-line clearfix">';
        const colorArr = this.MAJOR_COLOR_ARR;
        const len = colorArr.length;
        const spFirst = 0;
        const spLast = len - 1;
        let i: number;
        let j: number;
        let k: number;
        // first line
        panelHtml += parentLineHtml;
        for (i = 0; i < len; i++) {
            panelHtml += this._getColorSpan(colorArr[i] + colorArr[i] + colorArr[i]);
        }

        panelHtml += this._getColorSpan(colorArr[spLast] + colorArr[spFirst] + colorArr[spFirst]);
        panelHtml += this._getColorSpan(colorArr[spFirst] + colorArr[spLast] + colorArr[spFirst]);
        panelHtml += this._getColorSpan(colorArr[spFirst] + colorArr[spFirst] + colorArr[spLast]);
        panelHtml += this._getColorSpan(colorArr[spLast] + colorArr[spLast] + colorArr[spFirst]);
        panelHtml += this._getColorSpan(colorArr[spFirst] + colorArr[spLast] + colorArr[spLast]);
        panelHtml += this._getColorSpan(colorArr[spLast] + colorArr[spFirst] + colorArr[spLast]);
        panelHtml += '</div>';

        // second line
        panelHtml += parentLineHtml;
        for (i = 0; i < len * 2; i++) {
            panelHtml += this._getColorSpan('000000');
        }
        panelHtml += '</div>';

        // six loop part

        for (i = 0; i < len; i++) {
            panelHtml += parentHtml;

            for (j = 0; j < len; j++) {
                for (k = 0; k < len; k++) {
                    panelHtml += this._getColorSpan(colorArr[i] + colorArr[k] + colorArr[j]);
                }
            }

            panelHtml += '</div>';
        }

        return panelHtml;
    }

    private _initialize() {
        if (!this.inited) {
            this.inited = true;

            const cssPrefix = this._cssPrefix.bind(this);

            this.$container = $('<div>').addClass(cssPrefix('container disabled')).appendTo(this.container);

            this.$inputGroup = $('<div>').addClass(cssPrefix('input-group ')).appendTo(this.$container);
            this.$panel = $('<div>').addClass(cssPrefix('panel clearfix')).appendTo(this.$container);
            this.$mask = $('<div>').addClass(cssPrefix('mask')).appendTo(this.$container);

            // this.$title = $('<span>').addClass(cssPrefix('color-title')).html('色值').appendTo(this.$inputGroup);
            this.$color = $('<span>')
                .addClass(cssPrefix('color-current'))
                .css('background-color', `#${this.activeColor}`)
                .appendTo(this.$inputGroup);
            this.$input = $('<input>')
                .attr('type', 'text')
                .attr('name', 'color_picker')
                .attr('maxlength', 6)
                .addClass(cssPrefix('color-code'))
                .val(this.activeColor)
                .appendTo(this.$inputGroup);

            this.$panel.html(this._getColorPanel());

            this.$loginBtn = $('<a href="javascript:void(0);" >')
                .addClass(cssPrefix('mask-warning login-btn hover-show'))
                .appendTo(this.$mask);
            this.$levelWarning = $('<span>')
                .addClass(cssPrefix('mask-warning warning-text hover-show'))
                .html(this.LEVEL_WARNING)
                .appendTo(this.$mask);

            this.$callbackBtn = $('<span>').addClass(cssPrefix('current-color')).appendTo(this.config.triggerBtn);
            this.config.triggerBtn.addClass('relative').find('i').addClass('relative').css('zIndex', 10);

            this.$panel.find(`.color-span[data-color="${this.activeColor}"]`).attr('data-active', 1);

            new Button(this.$loginBtn, {
                label: "请先登录"
            }).on("click", e => {
                this.player.quicklogin?.load();
            });

            this._bindEvents();

            this.enable(0);

            typeof this.config.callback === 'function' && this.config.callback(this.enable.bind(this));
        }
    }
    private _bindEvents() {
        const that = this;

        this.$panel
            .on('mouseenter', '.color-span', function () {
                !that.disabled && that.changeColor('', $(this));
            })
            .on('click', '.color-span', function () {
                that.disabled = true;
                that.changeColor('', $(this), true);
            });

        this.$input.on('keyup', function (e) {
            const $this = $(this);
            let code = String($this.val())['trim']();
            const which = e.which;

            code = code
                .replace(/[^0-9a-fA-F]/g, '')
                .substr(0, 6)
                .toUpperCase();

            if (which === 13) {
                code = ('000000' + code).substr(-6);
                that.changeColor(code, null, true);
            } else if (which < 37 || which > 40) {
                $this.val(code);
                code.length && that.changeColor(code);
            }
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
    changeColor(color: string, $color?: JQuery | null, autoClose?: boolean) {
        if (!this.inited) {
            this._initialize();
        }

        let $current = this.$panel.find(`.color-span[data-color="${color}"]`);

        if ($color && $color.length) {
            color = $color.attr('data-color')!;
            $current = $color;
        }

        this.$panel.find('.color-span.active').removeClass('active');
        $current.eq(0).addClass('active');

        color && this.$input.val(color);
        color && this.$color.css('background-color', `#${color}`);

        if (autoClose) {
            this.$panel.find('.color-span[data-active="1"]').attr('data-active', 0);
            $current.attr('data-active', 1);

            this.activeColor = color;

            switch (this.config.changedMode) {
                case 0:
                    this.$callbackBtn.css('color', `#${color}`);
                    break;
                case 1:
                    this.$callbackBtn.css('background-color', `#${color}`);
                    break;
                default:
                    break;
            }

            typeof this.config.onChange === 'function' &&
                this.config.onChange({ color: parseInt(color, 16), value: color });
            this.close();
        }
    }

    toggle() {
        if (!this.inited) {
            this._initialize();
        }

        if (!this.$container.hasClass('active')) {
            this.open();
        } else {
            this.close();
        }
    }

    open() {
        if (!this.inited) {
            this._initialize();
        }

        const $currentActive = this.$panel.find('.color-span.active');
        const $lastActive = this.$panel.find('.color-span[data-active="1"]');

        $currentActive !== $lastActive && this.changeColor('', $lastActive);

        this.openStatus = 1;
        setTimeout(() => {
            // 防止刚执行初始化导致的动画失效
            this.$container.addClass('active');
        }, 0);

        typeof this.config.onOpen === 'function' && this.config.onOpen();
    }

    close() {
        if (!this.inited) {
            this._initialize();
        }

        this.openStatus = 0;
        this.$container.removeClass('active');
        this.disabled = false;

        typeof this.config.onClose === 'function' && this.config.onClose();
    }

    enable(status: number) {
        if (!this.inited) {
            this._initialize();
        }

        // 0 : un login
        // 1 : level 1

        switch (status) {
            case 0:
                this.$loginBtn.show();
                this.$levelWarning.hide();
                break;
            case 1:
                this.$loginBtn.hide();
                this.$levelWarning.show();
                break;
            default:
                this.$container.removeClass('disabled');
                break;
        }

        this.changeColor('FFFFFF');
    }

    disable() {
        if (!this.inited) {
            this._initialize();
        }

        this.$container.addClass('disabled');
    }
}

export default ColorPicker;
