import Base from "./base";
import { Button } from "./button";

interface IOption {
    id?: string;
    label: string;
    state?: number;
    change?: (v: { value: number }) => void;
    textOnly?: boolean; // Ot
    class?: string; // Mn
}

export class Tristatecheckbox extends Base {
    options: IOption = {
        // label: null,
        state: 0,
        // change: null,
        label: "",
        id: "tristatecheckbox",
        class: ""
    };
    label!: JQuery<HTMLLabelElement>;
    button!: JQuery<HTMLElement>;
    state = 0;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    create() {
        this.element.addClass(this.prefix + "tristatecheckbox");
        this.container = this.element.parent();
        if (this.options.id === "tristatecheckbox") {
            this.element.attr("id", this.options.id + this.uuid);
        } else {
            this.options.id && this.element.attr("id", this.options.id);
        }
        if (this.container.find("label").length) {
            this.label = this.container
                .find("label")
                .attr("for", this.element.attr("id")!)
                .addClass(this.options.class!)
        } else {
            this.label = <any>$("<label>")
                .attr("for", this.element.attr("id")!)
                .addClass(this.options.class!)
                .appendTo(this.container);
        }

        const label = this.options.label || this.label.html();
        this.options.label = `<i class="bpui-icon-checkbox icon-12checkbox"></i><i class="bpui-icon-checkbox icon-12selected2"></i><i class="bpui-icon-checkbox icon-12select"></i><span class="${this.prefix}checkbox-text">${label}</span>`;
        new Button(this.element, this.options);
        this.button = this.element;

        if (window.navigator.userAgent.indexOf("Trident") >= 0) {
            this.bind("click", (b: any) => {
                b.target.indeterminate || (+this.state !== 1) || $(b.target).trigger("change", { value: this.state });
            });
        }

        this.bind("change", (e: Event) => {
            e.hasOwnProperty("which") || e.preventDefault();
            this.change(e);
        });

        this.element.prop("indeterminate") ? this.setChange(1) : this.setChange(this.options.state!);
    }
    private change(e: Event) {
        switch (this.state) {
            case 0:
                this.setChange(1);
                break;
            case 1:
                this.setChange(2);
                break;
            default:
                this.setChange(0);
        }

        this.trigger("change", { value: this.state }, this.element, e);
    }
    setValue(value: number, change = true) { // Ja
        this.setChange(value);
        change && this.trigger("change", { value: this.state });
    }
    private setChange(value: number) {
        const element = this.element;
        this.state = value;
        const prefix = this.prefix;

        switch (this.state) {
            case 0:
                element.prop("indeterminate", false);
                element.prop("checked", false);
                element.siblings("label").removeClass(prefix + "state-active");
                break;
            case 1:
                element.prop("indeterminate", true);
                element.siblings("label").removeClass(prefix + "state-active").addClass(prefix + "state-indeterminate");
                break;
            case 2:
                element.prop("indeterminate", false);
                element.prop("checked", true);
                element.siblings("label").removeClass(prefix + "state-indeterminate").addClass(prefix + "state-active");
                break;
            default:
                element.prop("indeterminate", false);
                element.prop("checked", false);
        }
    }
    value() {
        return this.state;
    }
    setOption(key: string, value: any) {
        if (key === "disabled") {
            new Button(this.element).option(key, value);
        }
        this.options[<"label">key] = value;

        return this;
    }
    destroyCus() {
        this.element.removeClass(this.prefix + "tristatecheckbox");
        new Button(this.element).destroy();
    }
}