import Mouse from './mouse';
import { IOption, IEvent } from './base';

class Selectable extends Mouse {
    options: IOption = {
        // appendTo: 'body',
        autoRefresh: true,
        distance: 0,
        filter: '>*', // jquery version <1.8 bug
        tolerance: 'touch',
        escapeSelector: '',
        disableJudge: function (el?: JQuery) {
            return true;
        },

        // callbacks
        selected: null,
        selecting: null,
        start: null,
        stop: null,
        unselected: null,
        unselecting: null,
        disabled: undefined,
        appendTo: undefined,
        cancel: 'input,textarea,button,select,option',
        delay: 0,
        id: 'selectable'
    };
    private dragged!: boolean;
    private refresh!: () => void;
    private selectees!: JQuery;
    private helper!: JQuery;
    private opos!: number[];
    private multiselectKeep!: boolean;
    private uniqueSelectElement!: boolean;

    constructor(container: JQuery, options: IOption) {
        super(container, options);
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }

    create() {
        let selectees: JQuery;
        const that = this;
        const prefix = this.prefix;

        this.element.addClass(prefix + 'selectable');

        this.dragged = false;

        // cache selectee children based on filter
        this.refresh = function () {
            selectees = $(that.options.filter, that.element[0]);
            selectees.addClass(prefix + 'selectable-row');
            selectees.each(function () {
                const $this = $(this);
                const pos = $this.offset()!;
                $.data(this, 'selectable-item', {
                    element: this,
                    $element: $this,
                    left: pos.left,
                    top: pos.top,
                    right: pos.left + $this.outerWidth()!,
                    bottom: pos.top + $this.outerHeight()!,
                    startselected: false,
                    selected: $this.hasClass(prefix + 'selected'),
                    selecting: $this.hasClass(prefix + 'selecting'),
                    unselecting: $this.hasClass(prefix + 'unselecting'),
                });
            });
        };
        this.refresh();

        this.selectees = selectees!.addClass(prefix + 'selectable-row');
        this.mouseInit();

        this.helper = $('<div class="' + prefix + 'selectable-helper"></div>');
    }

    destroyCus() {
        const prefix = this.prefix;
        this.selectees.removeClass(prefix + 'selectable-row').removeData('selectable-item');
        this.element.removeClass(prefix + 'selectable ' + prefix + 'selectable-disabled');
        this.mouseDestroy();
    }

    private escape(event: IEvent) {
        if (!this.options.escapeSelector) {
            return false;
        }
        return (
            $(event.target!).is($(this.options.escapeSelector)) ||
            $(event.target!).parents(this.options.escapeSelector).length > 0
        );
    }

    // @ts-ignore
    mouseStart(event: IEvent) {
        const that = this;
        const options = this.options;
        const prefix = this.prefix;

        this.opos = [event.pageX!, event.pageY!];

        if (this.options.disabled) {
            return;
        }

        this.selectees = $(options.filter, this.element[0]);
        this.trigger('start', event);

        if (options.appendTo) {
            $(options.appendTo).append(this.helper);
        }
        // position helper (lasso)
        this.helper.css({
            left: event.pageX! + 1,
            top: event.pageY! + 1,
            width: 0,
            height: 0,
        });

        if (options.autoRefresh) {
            this.refresh();
        }

        if (this.selectees.filter('.' + prefix + 'selected').length > 1) {
            this.multiselectKeep = true;
        } else {
            this.multiselectKeep = false;
        }

        const prevLength = this.selectees.filter('.' + prefix + 'selected').length;
        this.uniqueSelectElement = false;

        // 未按Ctrl 把所有选中元素标记为将要取消
        this.selectees.filter('.' + prefix + 'selected').each(function () {
            const selectee = $.data(this, 'selectable-item');
            selectee.startselected = true;

            // 如果只有一个选中元素，判断是不是事件选中元素，是就放弃处理
            if (prevLength === 1) {
                $(event.target!)
                    .parents()
                    .add($(event.target!))
                    .each(function () {
                        const selecteeChild = $.data(this, 'selectable-item');
                        if (selecteeChild && selecteeChild.$element.is(selectee.$element)) {
                            that.uniqueSelectElement = selecteeChild;
                        }
                    });

                if (that.uniqueSelectElement) {
                    return false;
                }
            }

            if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !that.escape(event)) {
                selectee.$element.removeClass(prefix + 'selected');
                selectee.selected = false;
                selectee.$element.addClass(prefix + 'unselecting');
                selectee.unselecting = true;
                that.trigger('unselecting', event, {
                    unselecting: selectee.element,
                });
            }
        });
        // jquery3 addBack()
        $(event.target!)
            .parents()
            .add($(event.target!))
            .each(function () {
                let doSelect;
                const selectee = $.data(this, 'selectable-item');
                if (selectee) {
                    // 多选状态下全部标记了取消 保留当前选择项为将要选中
                    if (
                        that.selectees.filter('.' + prefix + 'selected').length === 0 &&
                        that.multiselectKeep &&
                        that.options.disableJudge(selectee.$element)
                    ) {
                        doSelect = true;
                    } else {
                        // 如果当前项是非选中状态 则标记为将要选中
                        // 如果当前项是选中状态 则标记为将要取消
                        doSelect =
                            !selectee.$element.hasClass(prefix + 'selected') &&
                            that.options.disableJudge(selectee.$element);
                    }

                    selectee.$element
                        .removeClass(doSelect ? prefix + 'unselecting' : prefix + 'selected')
                        .addClass(doSelect ? prefix + 'selecting' : prefix + 'unselecting');
                    selectee.unselecting = !doSelect;
                    selectee.selecting = doSelect;
                    selectee.selected = doSelect;
                    if (doSelect) {
                        that.trigger('selecting', event, {
                            selecting: selectee.element,
                        });
                    } else {
                        that.trigger('unselecting', event, {
                            unselecting: selectee.element,
                        });
                    }

                    return false;
                }
            });
        return true;
    }

    mouseDrag(event: IEvent) {
        this.dragged = true;
        const prefix = this.prefix;

        if (this.options.disabled) {
            return;
        }

        let tmp;
        const that = this;
        const options = this.options;
        let x1 = this.opos[0];
        let y1 = this.opos[1];
        let x2 = event.pageX!;
        let y2 = event.pageY!;

        if (x1 > x2) {
            tmp = x2;
            x2 = x1;
            x1 = tmp;
        }
        if (y1 > y2) {
            tmp = y2;
            y2 = y1;
            y1 = tmp;
        }
        // +1 to allow click event
        this.helper.css({
            left: x1 + 1,
            top: y1 + 1,
            width: x2 - x1,
            height: y2 - y1,
        });

        this.selectees.each(function () {
            const selectee = $.data(this, 'selectable-item');
            let hit = false;

            // prevent helper from being selected if appendTo: selectable
            if (!selectee || selectee.element === that.element[0]) {
                return;
            }

            if (options.tolerance === 'touch') {
                hit = !(selectee.left > x2 || selectee.right < x1 || selectee.top > y2 || selectee.bottom < y1);
            } else if (options.tolerance === 'fit') {
                hit = selectee.left > x1 && selectee.right < x2 && selectee.top > y1 && selectee.bottom < y2;
            }

            if (hit) {
                // 去除选中状态
                if (selectee.selected) {
                    selectee.$element.removeClass(prefix + 'selected');
                    selectee.selected = false;
                }
                // 单选多选取消标记 其余取消非选中标记
                // shit
                if (
                    !(event.metaKey || event.ctrlKey || event.shiftKey || that.escape(event)) &&
                    selectee.unselecting &&
                    !that.uniqueSelectElement
                ) {
                    selectee.$element.removeClass(prefix + 'unselecting');
                    selectee.unselecting = false;
                }

                // 划过没有标记的元素标记为将选中状态
                if (!selectee.selecting && !selectee.unselecting && that.options.disableJudge(selectee.$element)) {
                    selectee.$element.addClass(prefix + 'selecting');
                    selectee.selecting = true;
                    that.trigger('selecting', event, {
                        selecting: selectee.element,
                    });
                }
            } else {
                // UNSELECT
                if (selectee.selecting) {
                    if (
                        (event.metaKey || event.ctrlKey || event.shiftKey || that.escape(event)) &&
                        selectee.startselected
                    ) {
                        selectee.$element.removeClass(prefix + 'selecting');
                        selectee.selecting = false;
                        selectee.$element.addClass(prefix + 'selected');
                        selectee.selected = true;
                    } else {
                        selectee.$element.removeClass(prefix + 'selecting');
                        selectee.selecting = false;
                        if (selectee.startselected) {
                            selectee.$element.addClass(prefix + 'unselecting');
                            selectee.unselecting = true;
                        }
                        that.trigger('unselecting', event, {
                            unselecting: selectee.element,
                        });
                    }
                }
                if (selectee.selected) {
                    if (
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey &&
                        !selectee.startselected &&
                        !that.escape(event)
                    ) {
                        selectee.$element.removeClass(prefix + 'selected');
                        selectee.selected = false;

                        selectee.$element.addClass(prefix + 'unselecting');
                        selectee.unselecting = true;
                        that.trigger('unselecting', event, {
                            unselecting: selectee.element,
                        });
                    }
                }
            }
        });

        return false;
    }

    mouseStop(event: IEvent) {
        const that = this;
        const prefix = this.prefix;
        this.dragged = false;

        $('.' + prefix + 'unselecting', this.element[0]).each(function () {
            const selectee = $.data(this, 'selectable-item');
            selectee.$element.removeClass(prefix + 'unselecting');
            selectee.unselecting = false;
            selectee.startselected = false;
            that.trigger('unselected', event, {
                unselected: selectee.element,
            });
        });
        $('.' + prefix + 'selecting', this.element[0]).each(function () {
            const selectee = $.data(this, 'selectable-item');
            selectee.$element.removeClass(prefix + 'selecting').addClass(prefix + 'selected');
            selectee.selecting = false;
            selectee.selected = true;
            selectee.startselected = true;
            that.trigger('selected', event, {
                selected: selectee.element,
            });
        });
        this.trigger('stop', event);
        this.helper.remove();

        return false;
    }
}

export default Selectable;
