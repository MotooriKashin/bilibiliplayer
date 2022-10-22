import Base, { IEvent } from "./base";
import { Button } from "./button";

interface IOption {
    icons?: { // Me
        down?: string; // ar
        up?: string; // Zt
    };
    max?: number;
    min?: number;
    page?: number;
    step?: number;
    change?: (v: { value: number }) => void;
    changeValue?: Function;
    start?: (e: IEvent) => void;
    stop?: (e: IEvent) => void;
    value?: number;
    disabled?: boolean;
    id?: string;
    spin?: (e: IEvent, v: { value: number }) => void;
}
export class Spinner extends Base {
    options: IOption = {
        icons: {
            down: "icon-arrow-down-s",
            up: "icon-arrow-up-s"
        },
        // max: null,
        // min: null,
        page: 10,
        step: 1,
        id: 'spinner'
    };
    private wrap!: JQuery<HTMLElement>;
    private buttons!: JQuery<HTMLElement>;

    private valNow!: string;
    private bluring?: boolean;
    private wheeling?: boolean;
    private wheelStep?: number;
    private repeating?: number;
    private wheelDelaying?: number;
    constructor(container: JQuery, options: IOption = {}) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    protected create() {
        this.element = $("<input>").appendTo(this.container);
        this.attr("max", this.options.max);
        this.attr("min", this.options.min);
        this.attr("step", this.options.step);
        (typeof this.options.value !== "undefined") && this.reset(this.options.value, true);
        this.TPL();
        // this.on(this.events); // 此文件这么多未知属性是为那般？
        this.refresh();

        // this.on(this.window, {
        //     xP: function () {
        //         this.element.removeAttr("autocomplete");
        //     },
        // });
    }
    protected initEvent() {
        const that = this;

        this.bind({
            keydown: (e: IEvent) => {
                this.start(e) && this.keydown(e) && e.preventDefault();
            },

            keyup: "stop",

            focus: () => {
                this.valNow = <string>this.element.val();
            },

            blur: (e: IEvent) => {
                if (this.bluring) {
                    delete this.bluring;
                } else {
                    this.stop();

                    if (!this.valueTrue()) {
                        let c = this.value() || 0;
                        let f = this.options.max!;
                        let d = this.options.min!;
                        c = f < c ? f : c;
                        this.value(d > c ? d : c);
                    }

                    this.refresh();
                    (this.element.val() !== this.valNow) && this.trigger("change", { value: this.element.val() });
                }
            },
            mousewheel: (b: IEvent, c: any) => {
                if (c) {
                    if (!this.wheeling && !this.start(b))
                        return !1;
                    this.wheelValue((0 < c ? 1 : -1) * this.options.step!, b);
                    clearTimeout(this.wheelDelaying);
                    this.wheelDelaying = this.delay(() => {
                        this.wheeling && this.stop(b)
                    }, 100);
                    b.preventDefault()
                }
            }
        });
        this.bind(this.container, {
            mousedown: (e: IEvent) => {
                const val = this.element[0] === this.document[0].activeElement ? this.valNow : this.element.val();
                function d(this: Spinner) {
                    if (this.element[0] !== this.document[0].activeElement) {
                        this.element.focus();
                        this.valNow = <string>val;
                        this.delay(() => {
                            this.valNow = <string>val;
                        });
                    }
                }
                e.preventDefault();
                d.call(this);
                this.bluring = !0;
                this.delay(() => {
                    delete this.bluring;
                    d.call(this)
                });
                if (!1 !== this.start(e)) {
                    this.repeat(null, $(e.currentTarget!).hasClass(this.prefix + "spinner-up") ? 1 : -1, e)
                }
            },
            mouseup: "stop",
            mouseenter: (e: IEvent) => {
                if ($(e.currentTarget!).hasClass(this.prefix + "state-active")) {
                    if (!1 === this.start(e))
                        return !1;
                    this.repeat(null, $(e.currentTarget!).hasClass(this.prefix + "spinner-up") ? 1 : -1, e);
                }
            },
            mouseleave: "stop"
        }, "." + this.prefix + "spinner-button");
    }
    private keydown(e: IEvent) {
        const options = this.options;
        switch (e.keyCode) {
            case 38:
                return this.repeat(null, 1, e),
                    !0;
            case 40:
                return this.repeat(null, -1, e),
                    !0;
            case 33:
                return this.repeat(null, options.page!, e),
                    !0;
            case 34:
                return this.repeat(null, -options.page!, e),
                    !0;
        }
        return !1;
    }
    private repeat(b: number | null, c: number, d: IEvent) {
        b = b || 500;
        clearTimeout(this.repeating);
        this.repeating = this.delay(function (this: Spinner) {
            this.repeat(40, c, d)
        }, b);
        this.wheelValue(c * this.options.step!, d);
    }
    private stop(e?: IEvent) {
        if (this.wheeling) {
            clearTimeout(this.repeating);
            clearTimeout(this.wheelDelaying);
            this.wheelStep = 0;
            this.wheeling = !1;
            this.trigger("stop", e);
        }
    }
    private start(e: IEvent) {
        if (!this.wheeling && !1 === this.trigger("start", e))
            return !1;
        this.wheelStep || (this.wheelStep = 1);
        return this.wheeling = !0
    }
    private wheelValue(num: number, e: IEvent) {
        let value = this.value() || 0;
        this.wheelStep || (this.wheelStep = 1);
        value = this.fixNum(value + num * this.floorNum(this.wheelStep));
        this.wheeling && !1 === this.trigger("spin", e, {
            value: value
        }) || (this.reset(value), this.wheelStep++)
    }
    private floorNum(b: number) {
        return Math.floor(b * b * b / 5E4 - b * b / 500 + 17 * b / 200 + 1);
    }
    private valueTrue() {
        const v = this.value();
        return v === null ? false : this.fixNum(v!) === v;
    }
    private TPL() {
        const prefix = this.prefix;
        const wrap = this.wrap = this.element
            .addClass(prefix + "spinner-input")
            .attr("autocomplete", "off")
            .wrap(this.TPL_SPAN())
            .parent()
            .append(this.TPL_A());
        this.element.attr("role", "spinbutton");
        this.buttons = new Button(wrap.find("." + prefix + "spinner-button").attr("tabIndex", -1)).widget();
        this.options.disabled && this.disable();
    }
    private TPL_SPAN() {
        return `<span class="${this.prefix}spinner-wrp"></span>`;
    }
    private TPL_A() {
        return `<a class="${this.prefix}spinner-button ${this.prefix}spinner-up">
        <span class="${this.prefix}icon ${this.options.icons!.up}"></span>
        </a>
        <a class="${this.prefix}spinner-button ${this.prefix}spinner-down">
        <span class="${this.prefix}icon ${this.options.icons!.down}"></span>
        </a>`;
    }
    reset(value: string | number, manual?: boolean) {
        if (value !== "") {
            let num = this.parse(value);
            if (num !== null) {
                manual || (num = this.fixNum(num));
                value = this.format(num!);
            }
        }

        this.element.val(value);
        this.refresh();
    }
    refresh() {
        this.element.attr({
            "data-valuemin": this.options.min,
            "data-valuemax": this.options.max,
            "data-valuenow": this.parse(<string>this.element.val()!),
        });
    }
    private fixNum(num: number) {
        const options = this.options;
        const min = options.min ? options.min : 0;
        num = min + options.step! * Math.round((num - min) / options.step!);
        num = parseFloat(num.toFixed(this.precision()));
        return options.max && (options.max < num)
            ? options.max
            : options.min && (options.min > num)
                ? options.min
                : num;
    }
    private precision() {
        let num = this.fixDot(this.options.step!);
        this.options.min && (num = Math.max(num, this.fixDot(this.options.min)));
        return num;
    }
    private fixDot(num: number | string) {
        num = num.toString();
        const i = num.indexOf(".");
        return i === -1 ? 0 : num.length - i - 1;
    }
    private attr(key: string, value: any) {
        if ((key === "culture") || (key === "numberFormat")) {
            var d = this.parse(<string>this.element.val())!;
            this.options[<'value'>key] = value;
            this.element.val(this.format(d));
        } else {
            ((key !== "max") && (key !== "min") && (key !== "step")) || (typeof value !== "string") || (value = this.parse(value));
            if (key === "icons") {
                this.buttons.first()
                    .find("." + this.prefix + "icon")
                    .removeClass(this.options.icons!.up)
                    .addClass(value.up);
                this.buttons.last()
                    .find("." + this.prefix + "icon")
                    .removeClass(this.options.icons!.down)
                    .addClass(value.down);
            }
            this.options[<'value'>key] = value;
            if (key === "disabled") {
                this.getWrap().toggleClass(this.prefix + "state-disabled", !!value);
                this.element.prop("disabled", !!value);
                const button = new Button(this.buttons);
                value ? button.disable() : button.enable();
            }
        }
        return this;
    }
    private getWrap() {
        return this.wrap;
    }
    private format(v: string | number) {
        return v === "" ? "" : v;
    }
    private parse(v: string | number) {
        if ((typeof v === "string") && (v !== "")) {
            v = parseFloat(v);
        }
        return (v === "") || isNaN(v) ? null : v;
    }
    value(value?: number) {
        if (value === undefined) {
            return this.parse(<number>this.element.val()!);
        }

        const num = <number>this.element.val();
        this.reset(value);
        this.refresh();
        (this.element.val() !== num) && this.trigger("change", { value });
    }
    destroyCus() {
        this.element.removeClass(this.prefix + "spinner-input")
            .prop("disabled", !1)
            .removeAttr("autocomplete")
            .removeAttr("role")
            .removeAttr("data-valuemin")
            .removeAttr("data-valuemax")
            .removeAttr("data-valuenow");
        this.wrap.replaceWith(this.element);
    }
}