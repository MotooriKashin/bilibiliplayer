import Base from "./base";

interface Item {
    name?: string;
    html?: string;
    value: string;
    selected?: boolean;
    disabled?: boolean;
    attributes?: Record<string, any>;
}
interface IOption {
    items: Item[];
    type?: string;
    change?: (v: { value: string }) => void;
    defaultSelected?: boolean;
    id?: string;
}
export class Tabmenu extends Base {
    options: IOption = {
        items: [],
        type: "",
        // change: null,
        defaultSelected: true,
        id: 'tabmenu'
    };
    private list!: JQuery<HTMLUListElement>;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    create() {
        const options = this.options;
        const prefix = this.prefix;
        this.list = this.container.is("ul")
            ? <JQuery<HTMLUListElement>>this.container.addClass(prefix + "tab-list")
            : <JQuery<HTMLUListElement>>$("<ul>").addClass(prefix + "tab-list").appendTo(this.container);
        this.options.type && this.container.addClass(prefix + "tab-list-type-" + this.options.type);

        options.items.forEach(d => { this.add(d) });

        if (this.getSelected().length === 0 && options.defaultSelected) {
            this.setSelect(this.list.find("." + prefix + "tab-list-row").eq(0));
        }
        return this.container;
    }
    initEvent() {
        const that = this;
        const prefix = this.prefix;
        this.unbind(this.list.find("." + prefix + "tab-list-row"), "click");

        this.bind(this.list, "click", "." + prefix + "tab-list-row", function (e: JQuery.ClickEvent) {
            e.stopPropagation();
            that.eventHandle($(e.currentTarget));
        });
    }
    private eventHandle(li: JQuery<HTMLElement>) {
        if (li && !this.canSelected(li)) {
            return false;
        }

        this.change(li);
    }
    private change(li: JQuery<HTMLElement>) {
        li = li || this.getSelected();
        this.trigger("change", { value: li.attr("data-value") }, li);
    };
    private canSelected(li: JQuery<HTMLElement>) {
        if (li.attr("data-selected") || li.attr("data-disabled")) {
            return false;
        }

        this.setSelect(li);
        return true;
    }
    private setSelect(li: JQuery<HTMLElement>) {
        const prefix = this.prefix;
        $("." + prefix + "tab-list-row", this.list)
            .removeClass(prefix + "state-selected")
            .removeAttr("data-selected");
        this.list.find("i")
            .removeClass("icon-radio-selected")
            .addClass("icon-radio-default");
        li.addClass(prefix + "state-selected").attr("data-selected", "selected");
        li.find("i").addClass("icon-radio-selected").removeClass("icon-radio-default");
    }
    private add(item: Item) {
        const prefix = this.prefix;
        const li = $("<li>").addClass(prefix + "tab-list-row").appendTo(this.list);
        item.name ? li.text(item.name) : item.html && li.html(item.html);
        li.attr("data-value", item.value);
        item.selected && li.attr("data-selected", "selected");
        item.disabled && li.attr("data-disabled", "disabled").addClass(prefix + "state-disabled");

        if (this.options.type === "radios") {
            const radios = $(`"<i class="${this.prefix}tab-list-row-radio bilibili-player-iconfont icon-radio-default"></i>`);
            li.prepend(radios);
        }

        this.setAttributes(li, item.attributes);
        return li;
    }
    private getSelected() {
        return this.list.find('[data-selected="selected"]');
    }
    value(value: string) {
        if (value !== undefined) {
            const li = this.list.find(`[data-value="${value}"]`);
            li.length && this.eventHandle(li);
            return li;
        }

        return this.getSelected().attr("data-value");
    }
}