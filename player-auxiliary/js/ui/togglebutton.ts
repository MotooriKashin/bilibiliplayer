import Base from "./base";

interface IOption {
    icon?: string;
    change?: (v: { value: string }) => void;
    id?: string;
}
export class Togglebutton extends Base {
    options: IOption = {
        id: 'togglebutton'
        // icon: null,
        // change: null,
    };
    status: 0 | 1 = 0;
    constructor(container: JQuery, options: IOption = {}) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    create() {
        if (this.options.icon) {
            $(`<i class="${this.prefix}icon">`)
                .addClass(this.options.icon)
                .appendTo(this.container);
        }
        this.setState("on");
        return this.container;
    }
    initEvent() {
        const that = this;

        this.bind(this.container, "click", function () {
            that.toggle();
        });
    }
    private toggle(status?: string) {
        this.setState(status);
        this.trigger("change", { value: this.status });
    }
    private setState(status?: string) {
        if (status === undefined) {
            status = +this.status === 1 ? "off" : "on"
        }
        if (status === "off") {
            this.container.removeClass(this.prefix + "state-active");
            this.status = 0;
        } else {
            this.container.addClass(this.prefix + "state-active");
            this.status = 1;
        }
    }
}