interface IOptions {
    name?: string;
    target?: JQuery;
    type?: string;
    text?: any; // 提示信息
    position?: string; // 'top|bottom|left|right|center - left|right|top|bottom|center'
    fontSize?: number;
    padding?: number[]; // [3, 5, 3, 5]
    left?: number;
    top?: number;
    margin?: number;
    theme?: string;
    arrow?: boolean;
    changeMode?: number | string; // 0 : 不做处理; 1: refresh; 2: hide
    singleMode?: boolean;
    animation?: boolean;
    supportShow?: boolean;
    autoShow?: boolean;
    autoHide?: boolean;
    hideTime?: number;
    autoRemove?: boolean;
    game?: boolean;
    callback?: () => void;
    onShow?: (that: Tooltip) => void;
    onHide?: (that: Tooltip) => void;
}

class Tooltip {
    options: IOptions;

    private status: number;
    private prefix: string;
    private triggerClass: string;
    private timeOut!: number;
    private $tooltips!: JQuery;

    constructor(options: IOptions) {
        this.options = $.extend(
            {
                name: 'player-tooltip',
                target: $(document.body),
                type: 'info',
                // text: '提示信息',
                // position: 'top-left', // 'top|bottom|left|right|center - left|right|top|bottom|center'
                // fontSize: 12,
                // padding: [3, 5, 3, 5],
                left: 0,
                top: 0,
                margin: 5,
                // theme: 'black',
                arrow: false,
                changeMode: 0, // 0 : 不做处理, 1: refresh, 2: hide
                singleMode: true,
                animation: true,
                supportShow: true,
                autoShow: true,
                autoHide: true,
                hideTime: 3000,
                autoRemove: true,
                game: false,
                callback: () => { },
                onShow: () => { },
                onHide: () => { },
            },
            options,
        );

        this.status = 0;
        this.prefix = 'player-tooltips';

        this.triggerClass = this.prefix + '-trigger';

        if (this.options.type === 'tip') {
            this.options.autoShow = false;
            this.options.autoHide = false;
            this.options.autoRemove = true;
        }

        this.initialize();
    }

    private initialize() {
        this.options.target!.addClass(this.triggerClass);

        this.options.autoShow && this.show();

        typeof this.options.callback === 'function' && this.options.callback();

        this.options.type === 'tip' && this.bindEvents();
    }

    private bindEvents() {
        const that = this;

        this.options
            .target!.on('mouseenter', function (e) {
                that.options.supportShow && that.show();
            })
            .on('mouseleave', function (e) {
                that.hide();
            })
            .on('click', function (e) {
                const mode = parseInt(that.options.changeMode + '', 10);

                if (!isNaN(mode)) {
                    switch (mode) {
                        case 1:
                            $(e.target)
                                .siblings()
                                .each(function (i, elem) {
                                    const $this = $(elem);

                                    setTimeout(function () {
                                        $this.hasClass(that.triggerClass) &&
                                            $this.is(':visible') &&
                                            $this.trigger('mouseenter');
                                    }, 0);

                                    return false;
                                });

                            break;
                        case 2:
                            that.hide();
                            break;
                        case 3:
                            that.options.target!.trigger('mouseleave');
                            that.options.target!.trigger('mouseenter');
                            break;
                        default:
                            break;
                    }
                }
            });
    }

    private toggle(options: IOptions) {
        if (!this.status) {
            this.show(options);
        } else {
            this.hide();
        }
    }

    show(options?: IOptions) {
        const that = this;
        let delay = 200;

        if (this.options.type === 'info') {
            delay = 0;
        }

        if (!this.status) {
            this.timeOut = window.setTimeout(() => {
                if (that.options.singleMode) {
                    that.destroy(true);
                }

                that.create();

                that.status = 1;
                that.$tooltips.addClass('active');

                typeof that.options.onShow === 'function' && that.options.onShow(that);

                if (that.options.autoHide) {
                    setTimeout(() => {
                        that.hide();
                    }, that.options.hideTime);
                }
            }, delay);
        }
    }

    private add(options: IOptions) {
        if (typeof options === 'string') {
            options = $.extend(this.options, {
                text: options,
            });
        } else if (typeof options === 'object') {
            options = $.extend(this.options, options);
        }

        const $tooltip = this.template(false, options);

        this.$tooltips.append($tooltip);

        this.updatePos(true);
    }

    hide() {
        this.status = 0;

        clearTimeout(this.timeOut);

        this.$tooltips && this.$tooltips.removeClass('active');

        typeof this.options.onHide === 'function' && this.options.onHide(this);

        this.options.autoRemove && this.destroy();
    }

    destroy(all?: boolean) {
        clearTimeout(this.timeOut);

        if (!all) {
            this.$tooltips && this.$tooltips.remove();
        } else {
            const $tooltip = $('.' + this.prefix + '[data-tooltip-name="' + this.options.name + '"]');
            $tooltip.length && $tooltip.remove();
        }
    }

    private getElemPos($elem: JQuery) {
        const offset = $elem.offset();

        return {
            x: offset!['left'],
            y: offset!['top'],
            w: $elem.outerWidth(),
            h: $elem.outerHeight(),
        };
    }

    private create() {
        // console.log('create..', this.$tooltips);

        if (!$('.' + this.prefix + '[data-tooltip-name="' + this.options.name + '"]').length) {
            this.$tooltips = this.template(true);
            this.options.game && this.$tooltips.addClass('tooltip-game');
            $(document.body).append(this.$tooltips);
        }

        const $toolTip = this.template();
        $toolTip.appendTo(this.$tooltips);

        this.updatePos();
    }

    private template(isTooltips?: boolean, options?: IOptions) {
        let html = '';
        const classArr = [];
        let className;
        let text;
        let position;

        options = options || this.options;

        text = options.text || options.target!.attr('data-text');
        position = options.position || options.target!.attr('data-position');
        options.changeMode = options.target!.attr('data-change-mode') || 0;

        if (isTooltips) {
            classArr.push(options.type);
            classArr.push(position);
            options.animation && classArr.push('animation');
            className = classArr.join(' ');

            html =
                '<div class="' + this.prefix + ' ' + className + '"  data-tooltip-name="' + options.name + '"></div>';
        } else {
            let style = '';

            if (options.padding) {
                if (options.padding instanceof Array) {
                    style += 'padding:' + options.padding.join('px ') + 'px;';
                } else if (typeof options.padding === 'number') {
                    style += 'padding:' + options.padding + ';';
                }
            }

            if (options.fontSize && typeof options.fontSize === 'number') {
                style += 'font-size:' + options.fontSize + 'px;';
            }

            html = '<div class="tooltip" style="' + style + '">' + text + '</div>';
        }

        return $(html);
    }

    private updatePos(isTranslate?: boolean) {
        const options = this.options;
        const targetPos = this.getElemPos(options.target!);
        const tooltipsPos = this.getElemPos(this.$tooltips);
        const $window = $(window);
        const scrollTop = $window.scrollTop() || 0;
        const scrollLeft = $window.scrollLeft() || 0;
        let left: number;
        let top: number;
        let arrowStyle;
        let position;

        position = options.position || options.target!.attr('data-position');

        switch (position) {
            case 'top-left':
                left = targetPos.x;
                top = targetPos.y - options.margin! - tooltipsPos.h!;
                arrowStyle = 'left:' + targetPos.w! / 2 + 'px;';
                break;
            case 'top-center':
                left = targetPos.x + targetPos.w! / 2 - tooltipsPos.w! / 2;
                top = targetPos.y - options.margin! - tooltipsPos.h!;
                arrowStyle = 'left:' + tooltipsPos.w! / 2 + 'px;';
                break;
            case 'top-right':
                left = targetPos.x + targetPos.w! - tooltipsPos.w!;
                top = targetPos.y - options.margin! - tooltipsPos.h!;
                arrowStyle = 'left:' + (tooltipsPos.w! - targetPos.w! / 2) + 'px;';
                break;
            case 'bottom-left':
                left = targetPos.x;
                top = targetPos.y + targetPos.h! + options.margin!;
                arrowStyle = 'left:' + targetPos.w! / 2 + 'px;';
                break;
            case 'bottom-center':
                left = targetPos.x + targetPos.w! / 2 - tooltipsPos.w! / 2;
                top = targetPos.y + targetPos.h! + options.margin!;
                arrowStyle = 'left:' + tooltipsPos.w! / 2 + 'px;';
                break;
            case 'bottom-right':
                left = targetPos.x + targetPos.w! - tooltipsPos.w!;
                top = targetPos.y + targetPos.h! + options.margin!;
                arrowStyle = 'left:' + (tooltipsPos.w! - targetPos.w! / 2) + 'px;';
                break;
            case 'left-top':
                left = targetPos.x - options.margin! - tooltipsPos.w!;
                top = targetPos.y;
                break;
            case 'left-center':
                left = targetPos.x - options.margin! - tooltipsPos.w!;
                top = targetPos.y + targetPos.h! / 2 - tooltipsPos.h! / 2;
                break;
            case 'left-bottom':
                left = targetPos.x - options.margin! - tooltipsPos.w!;
                top = targetPos.y + targetPos.h! - tooltipsPos.h!;
                break;
            case 'right-top':
                left = targetPos.x + options.margin! + targetPos.w!;
                top = targetPos.y;
                break;
            case 'right-center':
                left = targetPos.x + options.margin! + targetPos.w!;
                top = targetPos.y + targetPos.h! / 2 - tooltipsPos.h! / 2;
                break;
            case 'right-bottom':
                left = targetPos.x + options.margin! + targetPos.w!;
                top = targetPos.y + targetPos.h! - tooltipsPos.h!;
                break;
            case 'center-center':
                left = targetPos.x + targetPos.w! / 2 - tooltipsPos.w! / 2;
                top = targetPos.y + targetPos.h! / 2 - tooltipsPos.h! / 2;
                break;
            default:
                break;
        }

        if (options.arrow) {
            const $arrow = $('<div class="arrow" style="' + arrowStyle + '"></div>');

            this.$tooltips.append($arrow);
        }

        this.$tooltips.css({
            left: left! + options.left! - scrollLeft,
            top: top! + options.top! - scrollTop,
        });
    }
}

export default Tooltip;
