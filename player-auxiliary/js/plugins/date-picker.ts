/**
 * @description date picker plugins
 * @author  tuzkiss
 * @date 16/5/6.
 */
import STATE from '../panel/state';
import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import { browser, formatDate } from '@shared/utils';

interface IDateConfig {
    url?: string;
    appendTo?: JQuery;
    position?: string; // top|bottom - left|center|right
    currentDate?: ICurrentDate;
    top?: number;
    left?: number | string;
    disableMode?: boolean;
    animation?: boolean;
    disabled?: boolean;
    onInit?: (status: number, value: number) => void;
    onToggle?: (status: number, value: number) => void;
    onOpen?: (value: number) => void;
    onClose?: (value: number) => void;
    onChange?: (timestamp: number) => void;
}

interface ITemplete {
    container: JQuery;
    prev: JQuery;
    next: JQuery;
    year: JQuery;
    month: JQuery;
    week: JQuery;
    dayContent: JQuery;
}

interface ICurrentDate {
    year?: number;
    month?: number;
    day?: number;
}

interface IDateObj {
    fullDate: Date;
    year: number;
    month: number;
    day: number;
    num: number;
    firstDayPos: number;
    timestamp: number;
}

class DatePicker {
    config: IDateConfig;
    updatePositionStatus!: number | boolean;
    // default date picker config
    private weekConfigDefault = ['日', '一', '二', '三', '四', '五', '六'];
    private monthConfigDefault = [
        '一月',
        '二月',
        '三月',
        '四月',
        '五月',
        '六月',
        '七月',
        '八月',
        '九月',
        '十月',
        '十一月',
        '十二月',
    ];
    private yearNameDefault = '年';
    private reDate = new Date();
    private utcTime = this.reDate.getTime() + this.reDate.getTimezoneOffset() * 60000;
    private timeZeroDay = new Date(this.utcTime).getDate() - this.reDate.getDate();
    private timeZeroOffset = (this.reDate.getTimezoneOffset() + 480) * 60; // GMT+0800
    // private targetTimeZone = -8; // 目标时区，东8区(标准北京时间)，与服务器时区对应
    private auxiliary: Auxiliary;
    private prefix: string;
    private triggerBtn: JQuery;
    private status!: number;
    private activeDateArr!: number[];
    private current!: IDateObj;
    private active!: IDateObj;
    private activeMonth!: IDateObj;
    private hasNext!: boolean;
    private template!: ITemplete;
    private inited = false;
    private monthDataCache!: { [k: string]: any; };
    private actionList: { [action: string]: (elem?: JQuery) => void } = {
        prev: () => {
            this.changeMonth(-1);
        },
        next: () => {
            if (this.hasNext) {
                this.changeMonth(1);
            }
        },
        changeDay: (elem?: JQuery) => {
            const $this = elem!;
            let timestamp = parseInt($this.attr('data-timestamp')!, 10) * 1000;

            if (!$this.hasClass('active')) {
                // change the active day
                this.template.dayContent.find('.day-span.active').removeClass('active');
                $this.addClass('active');
                this.active = this.getDateObj(timestamp);

                // if active day is today, return 0
                if (this.active.timestamp === this.getDateObj().timestamp) {
                    timestamp = 0;
                }

                // trigger change day callback handler
                typeof this.config.onChange === 'function' && this.config.onChange(timestamp / 1000);
            }

            this.close();
        },
    };
    constructor(auxiliary: Auxiliary, triggerBtn: JQuery, config: IDateConfig) {
        this.config = $.extend(
            {
                url: '',
                appendTo: $(document.body),
                position: 'bottom-right', // top|bottom - left|center|right
                currentDate: null,
                // class="' + prefix + '-video-wrap ' + prefix + '-video-wrap-plus"
                top: 0,
                left: 0,
                disableMode: true,
                // animation: true,
                // onInit: function () {},
                // onToggle: function () {},
                // onOpen: function () {},
                // onClose: function () {},
                // onChange: function (timestamp) { }
            },
            config,
        );

        this.auxiliary = auxiliary;
        this.prefix = auxiliary.prefix;
        this.triggerBtn = triggerBtn;

        this.init();
        // console.log(this);
    }

    init() {
        this.monthDataCache = {};

        // the active day array
        this.activeDateArr = [];
        this.inited = false;
        // active status  0:close  1:open
        this.status = 0;
        // update position status
        this.updatePositionStatus = 1;
        // the current day
        if (this.config.currentDate) {
            this.current = this.getDateObj(
                this.config.currentDate.year,
                this.config.currentDate.month,
                this.config.currentDate.day,
            );
        } else {
            this.current = this.getDateObj();
        }

        // the active day
        this.active = this.current;

        // the active month
        this.activeMonth = this.current;

        this.hasNext = false;
        this.triggerBtn.off('click').on('click', (e) => {
            e.preventDefault();
            if (!this.config.disabled) {
                this.toggle();
            }
        });
    }
    private getDateObj(year?: number, month?: number, day?: number): IDateObj {
        let date;
        if (!year) {
            date = new Date();
        } else if (typeof year === 'number' && !month && !day) {
            if ((year + '').toString().length === 10) {
                year *= 1000;
            }
            year += this.timeZeroOffset * 1000;
            date = new Date(year);
        } else {
            date = new Date(year, month!, day);
        }

        const reYear = date.getFullYear();
        const reMonth = date.getMonth();
        const reDay = date.getDate();
        const timestamp = new Date(reYear, reMonth, reDay).getTime() / 1000 - this.timeZeroOffset;
        const firstDayPos = new Date(reYear, reMonth, 1).getDay();
        const num = new Date(reYear, reMonth + 1, 0).getDate();

        return {
            fullDate: date,
            year: reYear,
            month: reMonth,
            day: reDay,
            num: num,
            firstDayPos: firstDayPos,
            timestamp: timestamp,
        };
    }

    private dayContentTemplate(dateObj: IDateObj): string {
        let contentHtml = '';
        let i;
        let len;

        if (typeof dateObj === 'object') {
            len = dateObj.firstDayPos;
            for (i = 0; i < len; i++) {
                contentHtml += this.daySpanTemplate('');
            }
            len = dateObj.num;
            for (i = 0; i < len; i++) {
                contentHtml += this.daySpanTemplate(this.getDateObj(dateObj.year, dateObj.month, i + 1));
            }
        }

        return contentHtml;
    }

    private daySpanTemplate(dateObj: string | IDateObj): string {
        let className = '';

        if (typeof dateObj === 'object') {
            if (!this.config.disableMode) {
                className = 'day-enable';
            }

            return (
                '<span class="day-span ' +
                className +
                ' js-action" data-timestamp="' +
                dateObj.timestamp +
                '" data-action="changeDay">' +
                dateObj.day +
                '</span>'
            );
        } else {
            return '<span class="day-span">' + dateObj + '</span>';
        }
    }

    private lastIndexOf(arr: number[], item: number) {
        if (arr instanceof Array) {
            let i = arr.length;

            while (i--) {
                if (arr[i] === item) {
                    break;
                }
            }

            return i;
        }
    }

    private snippet(): string[] {
        const prefix = this.prefix;
        return [
            '<div class="' + prefix + '-danmaku-date-picker-container">',
            '<div class="' + prefix + '-danmaku-date-picker-header">',
            '<a href="javascript:void(0)" data-action="prev" class="' +
            prefix +
            '-danmaku-date-picker-btn btn-prev js-action disabled"></a>',
            '<a href="javascript:void(0)" data-action="next" class="' +
            prefix +
            '-danmaku-date-picker-btn btn-next js-action disabled"></a>',
            '<span class="' +
            prefix +
            '-danmaku-date-picker-year"></span><span class="' +
            prefix +
            '-danmaku-date-picker-month"></span>',
            '</div>',
            '<div class="' + prefix + '-danmaku-date-picker-body">',
            '<div class="' + prefix + '-danmaku-date-picker-week clearfix"></div>',
            '<div class="' + prefix + '-danmaku-date-picker-day-content clearfix"></div>',
            '</div>',
        ];
    }

    private initialize(): void {
        if (!this.inited) {
            this.inited = true;
            const parent = this.config.appendTo!;
            const weekArr = this.weekConfigDefault;
            let weekHtml = '';
            const that = this;
            const prefix = this.prefix;
            this.template && this.template.container.remove();
            parent.append($(this.snippet().join('')));

            this.template = {
                container: parent.find('.' + prefix + '-danmaku-date-picker-container').last(),
                prev: parent.find('.' + prefix + '-danmaku-date-picker-btn.btn-prev').last(),
                next: parent.find('.' + prefix + '-danmaku-date-picker-btn.btn-next').last(),
                year: parent.find('.' + prefix + '-danmaku-date-picker-year').last(),
                month: parent.find('.' + prefix + '-danmaku-date-picker-month').last(),
                week: parent.find('.' + prefix + '-danmaku-date-picker-week').last(),
                dayContent: parent.find('.' + prefix + '-danmaku-date-picker-day-content').last(),
            };

            weekArr.forEach(function (val) {
                weekHtml += that.daySpanTemplate(val);
            });

            this.template.container.attr('data-position', this.config.position!);
            this.config.animation && this.template.container.addClass('animation');
            this.template.year.text(this.current.year + this.yearNameDefault);
            this.template.month.text(this.monthConfigDefault[this.current.month]);
            this.template.week.html(weekHtml);
            this.template.dayContent.html(this.dayContentTemplate(this.current));

            this.onInit().bindEvents();

            this.updatePosition();
        }
    }

    private initializeClass() {
        const $spans = this.template.dayContent.find('.day-span[data-timestamp]');
        let $this;
        let timestamp;

        if (this.config.disableMode) {
            $spans.removeClass('js-action');
            for (let i = 0, len = this.activeMonth.num; i < len; i++) {
                $this = $spans.eq(i);
                timestamp = parseInt($this.attr('data-timestamp')!, 10);

                // enable the active day
                if (this.lastIndexOf(this.activeDateArr, timestamp)! > -1 && !isNaN(timestamp)) {
                    $this.addClass('day-enable js-action');
                }

                // if the day is the current day
                timestamp === this.current.timestamp && $this.addClass('day-enable js-action');

                // if the day is the active day
                timestamp === this.active.timestamp && $this.addClass('active');
            }

            timestamp = parseInt($spans.last().attr('data-timestamp')!, 10);
            this.hasNext = timestamp < this.getDateObj().timestamp;
            this.hasNext ? this.template.next.removeClass('disabled') : this.template.next.addClass('disabled');
        } else {
            this.hasNext = true;
            this.template.prev.removeClass('disabled');
            this.template.next.removeClass('disabled');

            for (let i = 0, len = this.active.num; i < len; i++) {
                $this = $spans.eq(i);
                timestamp = parseInt($this.attr('data-timestamp')!, 10);

                // if the day is the current day
                if (timestamp === this.current.timestamp) {
                    $this.addClass('day-enable js-action');
                }

                // if the day is the active day
                if (timestamp === this.active.timestamp) {
                    $this.addClass('active');
                }
            }
        }

        return this;
    }

    private bindEvents() {
        const that = this;
        let $this: JQuery;
        let action: string;
        let timer: number;

        const chooseDate = (dom: JQuery) => {
            action = dom.attr('data-action')!;
            typeof that.actionList[action] === 'function' && that.actionList[action].call(that, dom);
        };

        if (
            !browser.version.mobile &&
            !browser.version.iPhone &&
            !browser.version.iPad &&
            !browser.version.microMessenger &&
            !browser.version.android
        ) {
            this.template.container.on('mousedown', '.js-action', (e) => {
                e.preventDefault();
                $this = $(e.currentTarget);
                chooseDate($this);
                if ($this.attr('data-action') !== 'changeDay') {
                    timer = window.setInterval(() => {
                        chooseDate($this);
                    }, 250);
                }
            });

            this.auxiliary.$window.on('mouseup', () => {
                if (timer) {
                    clearInterval(timer);
                }
            });
        } else {
            this.template.container.on('click', '.js-action', (e: any) => {
                e.preventDefault();
                $this = $(e.currentTarget);
                chooseDate($this);
            });
        }

        this.auxiliary.$window.on('click contextmenu', (e: any) => {
            const target = e.target;
            that.status &&
                !(
                    $.contains(that.template.container[0], target) ||
                    $.contains(that.triggerBtn[0], target) ||
                    that.triggerBtn[0] === target
                ) &&
                that.close();
        });

        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
            that.updatePositionStatus = true;
            typeof that.updatePosition === 'function' && that.status && that.updatePosition();
        });

        return this;
    }
    disabled(disable: boolean) {
        this.config.disabled = disable;
    }
    reload() {
        this.init();
        this.initialize();
    }
    changeMonth(offset: number) {
        if (!this.inited) {
            this.initialize();
        }

        this.activeMonth = this.getDateObj(this.activeMonth.year, this.activeMonth.month + offset, 1);
        this.template.year.html(this.activeMonth.year + this.yearNameDefault);
        this.template.month.html(this.monthConfigDefault[this.activeMonth.month]);
        this.template.dayContent.html(this.dayContentTemplate(this.activeMonth));
        this.fetchHistoryDateIndex().then(() => {
            this.updatePositionStatus = true;
            this.initializeClass().updatePosition();
        });
    }

    toggle() {
        if (!this.inited) {
            this.initialize();
        }

        this.fetchHistoryDateIndex().then(() => {
            if (this.activeDateArr.length > 0) {
                if (this.status) {
                    this.close();
                } else {
                    this.open();
                }
            } else {
                // init danmaku history json
                this.activeDateArr.push(this.getDateObj().timestamp);
                this.open();
            }
        });
    }

    private fetchHistoryDateIndex(): Promise<undefined> {
        const that = this;
        const mflag = formatDate(new Date(this.activeMonth.year, this.activeMonth.month), 'yyyy-MM');
        return new Promise((resolve: (value?: PromiseLike<undefined>) => void, reject) => {
            if (this.monthDataCache[mflag]) {
                resolve();
            } else {
                // 222001
                this.auxiliary.directiveManager.sender(
                    WD.HD_MONTH_CHANGE,
                    {
                        month: mflag,
                    },
                    (received?: IReceived) => {
                        const data = received!['data'];
                        this.monthDataCache[mflag] = data;
                        if (data.data && data.data.length) {
                            data.data.forEach((val: string) => {
                                const [y, m, d] = val.split('-').map(Number);
                                const timestamp = this.getDateObj(y, m - 1, d).timestamp;
                                that.activeDateArr.push(timestamp);
                            });
                        } else {
                            that.activeDateArr.push(that.getDateObj().timestamp);
                        }
                        resolve();
                    },
                );
            }
        });
    }

    private open() {
        this.status = 1;

        this.template.container.addClass('active');
        this.initializeClass().updatePosition();

        this.onToggle().onOpen();
    }

    private close() {
        this.status = 0;

        this.template.container.removeClass('active');

        this.onToggle().onClose();
    }

    private value() {
        return this.active.timestamp * 1000;
    }

    private onInit() {
        typeof this.config.onInit === 'function' && this.config.onInit(this.status, this.value());

        return this;
    }

    private onToggle() {
        typeof this.config.onToggle === 'function' && this.config.onToggle(this.status, this.value());

        return this;
    }

    private onOpen() {
        typeof this.config.onOpen === 'function' && this.config.onOpen(this.value());

        return this;
    }

    private onClose() {
        typeof this.config.onClose === 'function' && this.config.onClose(this.value());

        return this;
    }

    updatePosition() {
        if (!this.inited) {
            return;
        }

        if (this.updatePositionStatus) {
            const tBtn = this.triggerBtn;
            const container = this.template.container;
            const parent = this.config.appendTo;
            const scrollTop = $(window).scrollTop();

            // trigger btn
            const tOffset = tBtn.offset();
            const tLeft = tOffset!.left;
            const tW = tBtn.outerWidth();

            // date picker container
            const cW = container.outerWidth();

            // append to parent
            const pOffset = parent!.offset();
            const pLeft = pOffset!.left;

            let x = -9999;
            const y = -9999;

            switch (this.config.position) {
                case 'top-left':
                    x = tLeft - pLeft;
                    break;
                case 'top-center':
                    x = tLeft + (tW! - cW!) / 2 - pLeft;
                    break;
                case 'top-right':
                    x = tLeft + tW! - cW! - pLeft;
                    break;
                case 'bottom-left':
                    x = tLeft - pLeft;
                    break;
                case 'bottom-center':
                    x = tLeft + (tW! - cW!) / 2 - pLeft;
                    break;
                case 'bottom-right':
                    x = tLeft + tW! - cW! - pLeft;
                    break;
                default:
                    break;
            }

            // console.log(tTop, tLeft, tW, tH, cW, cH, x, y);

            container.css({
                bottom: '40px',
                left: x + parseInt(this.config.left + '', 10),
            });

            this.updatePositionStatus = false;
        }

        return this;
    }
}

export default DatePicker;
