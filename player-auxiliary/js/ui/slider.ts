import Base, { IEvent } from "./base";
import EVENTLIST from "./event";

import '../../css/slider.less';

interface IOption {
    name?: string;
    value?: number;
    aclinic?: boolean; // Le
    precision?: number;
    sliderS?: number // Uf
    start?: Function;
    update?: (v: { value: number }, handle: JQuery<HTMLElement>) => void;
    move?: (v: { value: number }) => void;
    mouseenter?: (e: IEvent, t: Slider) => void;
    mouseleave?: (e: IEvent, t: Slider) => void;
    change?: (v: { value: number }, handle: JQuery<HTMLElement>) => void;
    hint?: boolean;
    disableChangeMessage?: boolean; // nB
    handleWidth?: number; // ld
    handleHeight?: number; // kd
    width?: number;
    height?: number;
    valueSetAnalyze?: (value: number) => number; // Wi
    valueGetAnalyze?: (value: number) => number; // df
    formatTooltip?: (value: number) => string | number; // $f
    videoProgress?: boolean;
    id?: string;
    disabled?: boolean;
}
export class Slider extends Base {
    options: IOption = {
        id: 'slider',
        name: '',
        value: 0,
        aclinic: true,
        precision: 0,
        // sliderS: null,
        hint: false,
        disableChangeMessage: false,
        handleWidth: 14,
        handleHeight: 14,
        width: 0,
        height: 0,

        valueSetAnalyze: v => v,
        valueGetAnalyze: v => v,
        formatTooltip: v => v,
    };
    private progress = 0;
    private sliderS = 0;
    private retry = 0;
    private trackerWrp!: JQuery<HTMLElement>;
    private tracker!: JQuery<HTMLElement>;
    handle!: JQuery<HTMLElement>;
    private progressWrp!: JQuery<HTMLElement>;
    private hint?: JQuery<HTMLElement>;
    private bufferBar?: JQuery<HTMLElement>;
    private valueBuffer!: number;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    private handleWidth() {
        return this.options.handleWidth! || this.handle.width()!;
    }
    private handleHeight() {
        return this.options.handleHeight! || this.handle.height()!;
    }
    private trackerWrpWidth() {
        return this.options.width! || this.trackerWrp.width()!;
    }
    private trackerWrpHeight() {
        return this.options.height! || this.trackerWrp.height()!;
    }
    protected create() {
        this.trackerWrp = $("<div>").addClass(this.cssPrefix("tracker-wrp")).appendTo(this.container);
        this.tracker = $("<div>").addClass(this.cssPrefix("tracker")).appendTo(this.trackerWrp);
        this.handle = $("<div>").addClass(this.cssPrefix("handle")).appendTo(this.tracker);
        if (this.options.videoProgress) {
            this.bufferBar = $(`<div class="bilibili-player-video-progress-buffer" style="${this.options.aclinic ? 'width: 0;' : 'height: 0;'}">
        <div class="bilibili-player-video-progress-buffer-range" style="overflow: hidden;"></div>
    </div>`).appendTo(this.tracker);
        }
        if (this.options.aclinic) {
            this.progressWrp = $("<div>").addClass(this.cssPrefix("progress")).appendTo(this.tracker);
            this.progressWrp[0].style.cssText = "width: " + (parseFloat(<any>this.options.value) * (this.trackerWrpWidth() - this.handleWidth()) + this.handleWidth() / 2) / this.trackerWrpWidth() * 100 + "%";
        } else {
            this.container.addClass(this.prefix + "slider-vertical");
            this.progressWrp = $("<div>").addClass(this.cssPrefix("progress")).appendTo(this.tracker);
            this.progressWrp[0].style.cssText = "height: " + (parseFloat(<any>this.options.value) * (this.trackerWrpHeight() - this.handleHeight()) + this.handleHeight() / 2) / this.trackerWrpHeight() * 100 + "%";
        }
        this.options.hint && (this.hint = $("<div>").addClass(this.cssPrefix("hint")).appendTo(this.handle).hide());
        this.options.name && (this.trackerWrp.attr("name", this.options.name), this.tracker.attr("name", this.options.name), this.handle.attr("name", this.options.name));
        return this.container;
    }
    protected initEvent() {
        const that = this;
        let num: number;

        this.bind(this.handle, EVENTLIST.mousedown, function (this: Slider, e: IEvent) {
            e.preventDefault();
            e.stopPropagation!();
            if (e.button > 1) { } else {
                that.retry = 0;
                num = that.options.aclinic
                    ? that.getEventsPage(e).x - that.trackerWrp.offset()!.left - this.handleWidth() / 2
                    : that.trackerWrpHeight() - that.getEventsPage(e).y + that.trackerWrp.offset()!.top - this.handleHeight() / 2;
                this.moveHandle(num);
                that.mouseOver(e);
                that.trigger("start");
                that.options.hint && that.hint?.html(<any>that.options.formatTooltip!(that.progress)).show();
            }
        });

        this.bind(this.trackerWrp, EVENTLIST.mousedown, function (this: Slider, e: IEvent) {
            e.preventDefault();
            e.stopPropagation!();
            if (e.button > 1) { } else {
                that.retry = 0;
                num = that.options.aclinic
                    ? that.getEventsPage(e).x - that.trackerWrp.offset()!.left - this.handleWidth() / 2
                    : that.trackerWrpHeight() - that.getEventsPage(e).y + that.trackerWrp.offset()!.top - this.handleHeight() / 2;
                this.moveHandle(num);
                that.mouseOver(e);
                that.trigger("start");
                that.options.hint && that.hint?.html(<any>that.options.formatTooltip!(that.progress)).show();
            }
        });

        this.bind(this.container, "mouseenter", function (this: Slider, e: IEvent) {
            that.trigger("mouseenter", e, this);
        });

        this.bind(this.container, "mouseleave", function (this: Slider, e: IEvent) {
            that.trigger("mouseleave", e, this);
        });
    }
    private mouseOver(e: IEvent) {
        const that = this;
        let nlen: number;
        const len = this.options.aclinic
            ? this.getEventsPage(e).x - this.handle.position().left + this.handleWidth() / 2
            : this.getEventsPage(e).y - this.handle.position().top - this.handleHeight();

        this.bind($(document), EVENTLIST.mousemove, function (this: Slider, e: IEvent) {
            that.retry++;
            e.preventDefault();
            if (that.retry < 2) { } else {
                nlen = this.options.aclinic
                    ? that.getEventsPage(e).x - len
                    : that.trackerWrpHeight() - that.getEventsPage(e).y + len;
                that.moveHandle(nlen);
                that.trigger("move", { value: that.options.valueGetAnalyze!(that.progress) });
                that.options.hint && that.hint?.html(<any>that.options.formatTooltip!(that.progress));
            }
        });

        this.bind(this.document, EVENTLIST.mouseup, function (this: Slider) {
            that.retry = 0;
            that.unbind(<any>$(document), EVENTLIST.mousemove);
            that.unbind(this.document, EVENTLIST.mouseup);
            that.trigger("change", { value: that.options.valueGetAnalyze!(that.progress) }, that.handle);
            that.options.hint && that.hint?.html("").hide();
        });
    }
    private moveHandle(v: number) {
        const width = this.options.aclinic
            ? this.trackerWrpWidth() - this.handleWidth()
            : this.trackerWrpHeight() - this.handleHeight();
        v < 0 ? v = 0 : (width < v) && (v = width);
        this.move(v / width);
    }
    move(percentage: number) {
        const prefix = this.prefix;
        let progress: number;
        if (this.options.precision && (this.options.precision > 1)) {
            percentage = Math.round(this.options.precision * percentage) / this.options.precision;
        }
        this.progress = percentage;

        if (this.options.sliderS && (this.options.sliderS <= 1)) {
            percentage = Math.round(this.progress / this.options.sliderS);
            this.progress = progress = this.options.sliderS * percentage;

            if (String(percentage) === String(this.sliderS)) {
                return;
            }

            for (let i = 0; i < (Math.floor(1 / this.options.sliderS)); i++) {
                this.trackerWrp.removeClass(prefix + "slider-s" + i);
            }

            this.trackerWrp.addClass(prefix + "slider-s" + percentage);
            this.sliderS = percentage;
        } else {
            progress = this.progress;
        }

        this.trigger("update", { value: this.options.valueGetAnalyze!(progress) }, this.handle);
        (progress > 1) && (progress = 1);
        if (this.options.aclinic) {
            this.handle[0].style.cssText = "left: " + (progress * (this.trackerWrpWidth() - this.handleWidth()) + this.handleWidth() / 2) / this.trackerWrpWidth() * 100 + "%;";
            this.progressWrp[0].style.cssText = "width: " + progress * 100 + "%";
        } else {
            this.handle[0].style.cssText = "bottom: " + (progress * (this.trackerWrpHeight() - this.handleHeight()) + this.handleHeight() / 2) / this.trackerWrpHeight() * 100 + "%;";
            this.progressWrp[0].style.cssText = "height: " + progress * 100 + "%";
        }
    }
    value(value?: number, change = true) {
        if (value !== undefined) {
            this.move(this.options.valueSetAnalyze!(value));
            this.options.disableChangeMessage || change && this.trigger("change", { value: this.value() }, this.handle);
        } else {
            return this.options.valueGetAnalyze!(this.progress);
        }
    }
    resize() {
        const progress = this.progress;
        this.handle[0].style.cssText = this.options.aclinic
            ? "left: " + (progress * (this.trackerWrpWidth() - this.handleWidth()) + this.handleWidth() / 2) / this.trackerWrpWidth() * 100 + "%"
            : "bottom: " + (progress * (this.trackerWrpHeight() - this.handleHeight()) + this.handleHeight() / 2) / this.trackerWrpHeight() * 100 + "%";
    }
    getBufferValue() {
        return this.valueBuffer;
    }
    bufferValue(value?: number) {
        if (this.options.videoProgress) {
            if (value !== undefined && typeof value === 'number') {
                value = Math.max(value, 0);
                value = Math.min(value, 1);

                this.valueBuffer = value;
                if (this.options.aclinic) {
                    this.bufferBar && (this.bufferBar[0].style.cssText = "width: " + this.valueBuffer * 100 + "%");
                } else {
                    this.bufferBar && (this.bufferBar[0].style.cssText = "height: " + this.valueBuffer * 100 + "%");
                }
            }
            return this.valueBuffer;
        }
    }
}