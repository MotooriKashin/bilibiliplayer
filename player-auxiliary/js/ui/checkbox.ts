import Base from "./base";
import { Button } from "./button";
import { Tristatecheckbox } from "./tristatecheckbox";

interface IOption {
    disabled?: boolean;
    checked?: boolean;
    label: string;
    textLeft?: boolean; // So
    flexWrap?: boolean; // ry
    class?: string; // Mn
    click?: (target: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void;
    change?: (e: { value: boolean }) => void;
    round?: boolean; // FJ
    id?: string;
    tristate?: boolean; // Yo
    selected?: boolean;
}

export class Checkbox extends Base {
    options: IOption = {
        label: "",
        textLeft: false,
        flexWrap: false,
        // class: null,
        // click: null,
        // change: null,
        round: false,
        id: "checkbox",
        class: ""
    };
    child!: Button | Tristatecheckbox; // ca
    private label!: JQuery<HTMLLabelElement>;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    create() {
        this.container = this.element.parent();
        if (this.options.id === "checkbox") {
            this.element.attr("id", this.options.id + this.uuid);
        } else {
            this.options.id && this.element.attr("id", this.options.id);
        }
        if (this.container.find("label").length) {
            this.label = this.container
                .find("label")
                .attr("for", this.element.attr("id")!)
                .addClass(this.options.class!);
        } else {
            this.label = <any>$("<label>")
                .attr("for", this.element.attr("id")!)
                .addClass(this.options.class!)
                .appendTo(this.container);
        }

        const label = this.options.label || this.label.html();
        let child = this.options.round
            ? '<i class="bpui-icon-checkbox icon-12checkbox-round"></i><i class="bpui-icon-checkbox icon-12selected2-round"></i><i class="bpui-icon-checkbox icon-12select-round"></i>'
            : '<i class="bpui-icon-checkbox icon-12checkbox"></i><i class="bpui-icon-checkbox icon-12selected2"></i><i class="bpui-icon-checkbox icon-12select"></i>';
        if (this.options.flexWrap) {
            child = '<span class="bpui-flex-wrap"><span class="bpui-flex-button"></span></span>';
        }
        if (this.options.textLeft) {
            child = `<span class="${this.prefix}checkbox-text">${label}</span>${child}`;
            this.label.addClass(this.prefix + "text-left");
        } else {
            child += `<span class="${this.prefix}checkbox-text">${label}</span>`;
            this.label.removeClass(this.prefix + "text-left");
        }
        if (this.options.tristate) {
            this.tristatecheckbox(label);
        } else {
            if (this.options.checked) this.element.attr("checked", "checked");
            this.button(child);
        }
        this.element.on('click', (e) => {
            this.trigger('click', e);
        });


        this.container.data(this.prefix + "checkbox", this);
    }
    tristatecheckbox(label: string) {
        this.child = new Tristatecheckbox(this.element, {
            textOnly: true,
            state: <any>this.options.checked,
            label,
            change: <any>this.options.change
        });
    }
    private button(label: string) {
        this.child = new Button(this.element, {
            textOnly: true,
            label,
            disabled: this.options.disabled
        });
    }
    initEvent() {
        const that = this;

        if (!this.options.tristate) {
            this.bind(this.element, "change", function (e: Event) {
                e.stopPropagation();
                that.change(e);
            });
        }
    }
    private change(e?: Event, change = true) {
        change && this.trigger("change", { value: this.element.is(":checked") }, this.element, e);
    }
    value(value?: boolean, change = true) {
        if (typeof value !== "undefined") {
            this.setValue(value, change);
        } else if (this.options.tristate) {
            (<Tristatecheckbox>this.child).value();
        } else {
            return this.element.is(":checked");
        }
    }
    refresh() {
        new Button(this.element).refresh();
    }
    private setValue(value: boolean | number, change = true) {
        if (!this.options.disabled) {
            if (this.options.tristate) {
                (<Tristatecheckbox>this.child).setValue(<number>value, change);
            } else {
                this.element.prop("checked", value);
                if (value) {
                    this.element.siblings("label").addClass(this.prefix + "state-active");
                } else {
                    this.element.siblings("label").removeClass(this.prefix + "state-active");
                }
                this.change(undefined, change)
            }
        }
    }
    setOption(key: string, value: any) {
        if (typeof key !== "undefined") {
            new Button(this.element).option(key, value);
            this.options[<'label'>key] = value;
        }

        return this;
    }
    destroyCus() {
        new Button(this.element).destroy()
    }
}