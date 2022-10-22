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
    change?: (v: { value: string }) => void;
    id?: string;
}
export class Multiselect extends Base {
    options: IOption = {
        items: [],
        id: 'multiselect-list'
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
            ? <JQuery<HTMLUListElement>>this.container.addClass(prefix + "multiselect-list")
            : <JQuery<HTMLUListElement>>$("<ul>").addClass(prefix + "multiselect-list").appendTo(this.container);

        options.items.forEach(d => { this.add(d) });

        return this.container;
    }
    initEvent() {
        const that = this;
        const prefix = this.prefix;
        this.unbind(this.list.find("." + prefix + "multiselect-list-row"), "click");

        this.bind(this.list, "click", "." + prefix + "multiselect-list-row", function (e: JQuery.ClickEvent) {
            e.stopPropagation();
            that.eventHandle($(e.currentTarget));
        });
    }
    eventHandle(li: JQuery<HTMLLIElement>) {
        if (li && !this.canSelected(li)) {
            return false;
        }

        this.change(li);
    }
    private change(li: JQuery<HTMLLIElement>) {
        li = li || this.getSelected();
        this.trigger("change", { value: li.attr("data-value") }, li);
    }
    private getSelected() {
        return this.list.find('[data-selected="selected"]');
    }
    private canSelected(li: JQuery<HTMLLIElement>) {
        if (li.attr("data-disabled")) {
            return false;
        }

        li.attr("data-selected") ? this.disSelected(li) : this.enSelected(li);
        return true;
    }
    private enSelected(li: JQuery<HTMLLIElement>) {
        li.addClass(this.prefix + "state-selected").attr("data-selected", "selected");
    }
    private disSelected(li: JQuery<HTMLLIElement>) {
        li.removeClass(this.prefix + "state-selected").removeAttr("data-selected");
    }
    private add(item: Item) {
        const prefix = this.prefix;
        const li = $("<li>").addClass(prefix + "multiselect-list-row").appendTo(this.list);
        item.name ? li.text(item.name) : item.html && li.html(item.html);
        li.attr("data-value", item.value);
        item.selected && li.attr("data-selected", "selected");
        item.disabled && li.attr("data-disabled", "disabled").addClass(prefix + "state-disabled");
        this.setAttributes(li, item.attributes);
        return li;
    }
    value(value?: string) {
        if (value !== undefined) {
            const li = this.list.find(`[data-value="${value}"]`);
            li.length && this.eventHandle(<JQuery<HTMLLIElement>>li);
            return li;
        }

        const result: string[] = [];

        this.getSelected().each(function (e, d) {
            const li = $(d);
            li.attr("data-value") && result.push(li.attr("data-value")!);
        });

        return result;
    }
}