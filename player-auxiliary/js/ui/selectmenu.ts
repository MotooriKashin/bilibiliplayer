import Base from "./base";

import '../../css/selectmenu.less';

interface Item {
    name: string;
    value: string;
    selected?: boolean;
    disabled?: boolean;
    attributes?: Record<string, any>;
}
interface IOption {
    name?: string;
    items: Item[];
    hover?: boolean;
    type?: string;
    mode?: string;
    change?: (v: { value: string }) => void;
    arrow?: boolean; // tq
    repeat?: boolean;
    disMCS?: boolean; // Dz
    callback?: Function; // ki
    id?: string;
    mscNum?: number;
    setHeight?: number;

    hideMCS?: boolean;
}
export class Selectmenu extends Base {
    options: IOption = {
        name: "",
        items: [],
        hover: true,
        type: "left",
        mode: "",
        // change: null,
        arrow: true,
        repeat: false,
        disMCS: false,
        // callback: null,
        id: 'selectmenu',
        mscNum: 6,
    };
    private initList = false;
    private active = false;
    static catches: Selectmenu[] = [];
    private list!: JQuery<HTMLElement>;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
        Selectmenu.catches.push(this);
    }
    create() {
        const options = this.options;
        const prefix = this.prefix;
        const container = this.container;
        this.options.mode && container.addClass("selectmenu-mode-" + this.options.mode);

        if (options.items.length) {
            container.empty();
            this.list = $("<ul>")
                .addClass(prefix + "selectmenu-list")
                .addClass(prefix + "selectmenu-list-" + this.options.type);
            this.list.children().addClass(prefix + "selectmenu-list-row");
            options.items.forEach(d => { this.add(d) })
        } else {
            this.list = container
                .find(">ul")
                .addClass(prefix + "selectmenu-list")
                .addClass(prefix + "selectmenu-list-" + this.options.type);
        }
        this.options.arrow && $("<div>")
            .addClass(prefix + "selectmenu-arrow " + prefix + "icon " + prefix + "icon-arrow-down")
            .prependTo(container);
        $("<span>").addClass(prefix + "selectmenu-txt").prependTo(container);
        const selected = this.getSelected();
        if (selected.length === 0) {
            this.setSelected(this.list.find("li." + prefix + "selectmenu-list-row").eq(0));
        } else {
            $("." + prefix + "selectmenu-txt", this.container).html(selected.html());
        }
        this.options.hideMCS && container.addClass("mCSBhide");

        return container;
    }
    initEvent() {
        const container = this.container;
        const that = this;
        const prefix = this.prefix;
        this.unbind(container, "mouseenter");
        this.unbind(container, "mouseleave");
        this.unbind(container, "click");

        this.bind(container, "click", function (e: Event) {
            that.tap(e);
        });

        if (this.options.hover === true) {
            this.bind(container, "mouseenter", function (e: Event) {
                that.eventHandle(e);
            });
            this.bind(container, "mouseleave", function () {
                that.reflesh();
            })
        }

        this.unbind(this.list.find("li." + prefix + "selectmenu-list-row"), "click");

        this.bind(this.list, "click", "li." + prefix + "selectmenu-list-row", function (e: any) {
            that.select($(e.currentTarget));
            // that.container.trigger("click");
        });
    }
    private tap(e: Event) {
        this.active ? this.reflesh() : this.eventHandle(e);
    }
    private eventHandle(e: Event) {
        e.stopPropagation();

        Selectmenu.catches.forEach(d => { d.reflesh() });

        if (!this.container.attr("data-disabled") && this.list.length) {
            const that = this;
            this.container.addClass(this.prefix + "selectmenu-on");

            if (!this.initList) {
                this.list.appendTo(this.container);
                if ((this.options.items.length > this.options.mscNum!) && !this.options.disMCS) {
                    this.list.mCustomScrollbar({
                        axis: "y",
                        scrollInertia: 100,
                        autoHideScrollbar: true,
                        setHeight: this.options.setHeight,

                        mouseWheel: {
                            preventDefault: false,
                        }
                    });
                }

                this.initList = true;
            }

            this.list.show();
            (typeof this.options.callback === "function") && this.options.callback();
            this.active = true;

            if (this.options.hover !== true) {
                this.unbind(<any>$(document), "click");

                this.bind($(document), "click", function () {
                    that.reflesh();
                });
            }
        }
    }
    private setSelected(li: JQuery<HTMLElement>) {
        const prefix = this.prefix;
        $("li." + prefix + "selectmenu-list-row", this.list).removeAttr("data-selected");
        li.attr("data-selected", "selected");
        $("." + prefix + "selectmenu-txt", this.container).html(li.html());
    }
    value(value?: string | number, change = true) {
        if (value !== undefined) {
            const li = this.list.find(`[data-value="${value}"]`).first();
            li.length && this.canSelected(li) && this.change(li, change);
            return li;
        }

        return this.getSelected().attr("data-value");
    }
    private change(li: JQuery<HTMLElement>, change = true) {
        li = li || this.getSelected();
        change && this.trigger("change", { value: li.attr("data-value") }, li);
    }
    select(li: JQuery<HTMLElement>) {
        this.reflesh();

        if (li && !this.canSelected(li)) {
            return false;
        }

        this.change(li);
    }
    private reflesh() {
        this.container.removeClass(this.prefix + "selectmenu-on");
        this.list.hide();
        this.active = false;
        this.options.hover !== true && this.unbind(<any>$(document), "click");
    }
    private canSelected(li: JQuery<HTMLElement>) {
        if ((li.attr("data-selected") && !this.options.repeat) || li.attr("data-disabled")) {
            return false;
        }

        this.setSelected(li);
        return true;
    }
    private getSelected() {
        return this.list.find(`[data-selected="selected"]`);
    }
    private add(item: Item) {
        const li = $("<li>")
            .addClass(this.prefix + "selectmenu-list-row")
            .html(item.name)
            .appendTo(this.list);
        li.attr("data-value", item.value);
        item.selected && li.attr("data-selected", "selected");
        item.disabled && li
            .attr("data-disabled", "disabled")
            .addClass(this.prefix + "state-disabled");
        this.options.name && li.attr("name", this.options.name);
        this.setAttributes(li, item.attributes);
        return li;
    }
    close(e?: JQuery.ClickEvent) {
        const prefix = this.prefix;

        if (e) {
            if (e.originalEvent) {
                $("." + prefix + "selectmenu").each(function (c, d) {
                    $("." + prefix + "selectmenu-list", $(d)).hide();
                })
            } else {
                $("." + prefix + "selectmenu-list", e).hide();
            }
        }
    }
    refresh() {
        this.setSelected(this.getSelected());
    }
    reset() {
        const li = this.list.children().first();
        const prefix = this.prefix;
        $("li." + prefix + "selectmenu-list-row", this.list).removeAttr("data-selected");
        li.attr("data-selected", "selected");
        $("." + prefix + "selectmenu-txt", this.container).html(li.html());
        li.attr("data-disabled") || this.change(li);
    }
}