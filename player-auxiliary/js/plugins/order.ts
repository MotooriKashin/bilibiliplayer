interface Option {
    type?: string;
    selector?: string;
    change?: (target: JQuery<HTMLElement>, value: JQuery.TriggeredEvent<HTMLElement, any, HTMLElement, HTMLElement>) => void,
    value?: string;
}

export class Order {
    static prefix = "bppl";
    selected = Order.prefix + "-state-selected";
    constructor(public target: JQuery<HTMLElement>, public option: Option) {
        this.init();
    }
    init() {
        this.target.on(
            this.option.type || "click",
            this.option.selector || ("." + Order.prefix + "-tab-i"),
            (d) => {
                var c = $(d.currentTarget);
                this.change(c) && (typeof this.option.change === "function") && this.option.change.call(this, c, d);
            }
        );
        if (this.option.value) {
            const value = this.target.find(this.option.value);
            (value.length === 1) && this.change(value);
        }
    }
    change(elem: JQuery<HTMLElement>) {
        if (elem.hasClass(this.selected) || elem.attr("disabled")) {
            return false;
        }

        $("." + this.selected, this.target).removeClass(this.selected);
        elem.addClass(this.selected);
        return true;
    }
}