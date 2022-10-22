import Base, { IEvent } from "./base";

interface Item {
    empty?: boolean; // MP
    name?: string;
    disabled?: boolean;
    attributes?: Record<string, any>;
    left?: Item[];
}
interface IOption {
    disabled?: boolean;
    icons?: { // Me
        left?: string; // yl
    };
    data?: Item[];
    items?: string;
    listTag?: string;
    position?: {
        xQ: string; // xQ
        vP: string; // vP
    };
    menuName?: string;
    blur?: (ele: JQuery<HTMLElement>, value: {
        item: JQuery<HTMLElement>;
        value: any;
    }) => void;
    focus?: (ele: JQuery<HTMLElement>, value: {
        item: JQuery<HTMLElement>;
        value: any;
    }) => void;
    select?: (ele: JQuery<HTMLElement>, value: {
        item: JQuery<HTMLElement>;
        value: any;
    }) => void;
    id?: string;
}
export class Menu extends Base {
    options: IOption = {
        icons: {
            left: "icon-arrow-left"
        },
        items: "> *",
        listTag: "ul",
        position: {
            xQ: "left-1 top",
            vP: "right top",
        },
        id: 'menu',
    };
    private delayTime = 300;
    private currentElement!: JQuery<HTMLElement>;
    private focusing = false;
    private active?: JQuery<HTMLElement>;
    private delaying!: number;
    private holding?: string;
    private keyDowning!: number;
    constructor(container: JQuery, options: IOption = {}) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    protected create() {
        const prefix = this.prefix;
        this.currentElement = this.element = this.options.data
            ? this.initDate(this.options.data, this.container.is("ul"))
            : this.container.is("ul") ? this.container : this.container.find(">ul");
        this.element.addClass(prefix + "menu")
            .toggleClass(prefix + "menu-icons", !!this.element.find("." + prefix + "icon").length)
            .attr({
                menuName: this.options.menuName,
                tabIndex: 0,
            });

        this.uniqueId(this.element);
        this.options.disabled && this.element.addClass(prefix + "state-disabled").attr("data-disabled", "true");
        return this.container;
    }
    protected initEvent() {
        const prefix = this.prefix;

        this.bind(this.container, "click", (e: IEvent) => {
            e.stopPropagation!();
            this.focusing = false;
        });

        this.bind({
            mouseleave: "collapseAll",

            focus: (b: IEvent, c: any) => {
                const d = this.active || this.element.find(this.options.items!).eq(0);
                c || this.focus(b, d);
            },

            blur: (b: IEvent) => {
                this.delay(() => {
                    $.contains(this.element[0], this.document[0].activeElement) || this.delayHandle(b);
                });
            },

            keydown: "keydown"
        });

        this.bind("mousedown", "." + prefix + "menu-item", (b: IEvent) => {
            b.preventDefault();
        });

        this.bind("click", "." + prefix + "menu-item", (b: IEvent) => {
            var d = $(b.target!);
            if (!this.focusing && d.not("." + prefix + "state-disabled").length) {
                this.select(b);
                b.isPropagationStopped() || (this.focusing = true);
                if (d.has("." + prefix + "menu").length) {
                    this.expand(b);
                } else {
                    if (!this.element.is(":focus") && $(this.document[0].activeElement)
                        .closest("." + prefix + "menu").length) {
                        this.element.trigger("focus", { value: [true] });
                        this.active && (this.active.parents("." + prefix + "menu").length === 1) && clearTimeout(this.delaying)
                    };
                }
            }
        });

        this.bind("mouseenter", "." + prefix + "menu-item", (b: IEvent) => {
            if (!this.holding) {
                var d = $(b.currentTarget!);
                d.siblings("." + prefix + "state-active").removeClass(prefix + "state-active");
                this.focus(b, d);
            }
        });

        this.bind("mouseleave", "." + prefix + "menu", "collapseAll");
        this.refresh();

        this.bind(this.document, {
            click: (b: IEvent) => {
                this.hasManu(b) && this.delayHandle(b);
                this.focusing = false;
            },
        });
    }
    protected keydown(c: IEvent) {
        let prevent = true;
        const prefix = this.prefix;

        switch (c.keyCode) {
            case 33:
                this.prevPage(c);
                break;
            case 34:
                this.nextPage(c);
                break;
            case 36:
                this.move("first", "first", c);
                break;
            case 35:
                this.move("last", "last", c);
                break;
            case 38:
                this.prev(c);
                break;
            case 40:
                this.next(c);
                break;
            case 37:
                this.collapse(c);
                break;
            case 39:
                this.active && !this.active.is("." + prefix + "state-disabled") && this.expand(c);
                break;
            case 13:
            case 32:
                this.enter(c);
                break;
            case 27:
                this.collapse(c);
                break;
            default:
                prevent = false;
                let code = this.holding || "";
                let charCode = String.fromCharCode(c.keyCode);
                let active = false;
                clearTimeout(this.keyDowning);
                code === charCode ? active = true : charCode = code + charCode;
                let elems = this.trim(charCode);
                elems = active && (elems.index(this.active!.next()) !== -1)
                    ? this.active!.nextAll("." + prefix + "menu-item")
                    : elems;
                elems.length || (charCode = String.fromCharCode(c.keyCode), elems = this.trim(charCode));
                if (elems.length) {
                    this.focus(c, elems);
                    this.holding = charCode;
                    this.keyDowning = this.delay(() => {
                        delete this.holding;
                    }, 1000);
                } else {
                    delete this.holding;
                }
        }

        prevent && c.preventDefault();
    }
    setOption(key: string, value: any) {
        const prefix = this.prefix;
        (key === "icons") && this.element.find("." + prefix + "menu-icon").removeClass(this.options.icons!.left).addClass(value.left);
        (key === "disabled") && this.element.toggleClass(prefix + "state-disabled", !!value).attr("data-disabled", value);

        return this;
    }
    protected trim(str: string) {
        str = str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        const reg = new RegExp("^" + str, "i");
        const prefix = this.prefix;

        return this.currentElement.find(this.options.items!).filter("." + prefix + "menu-item").filter(function () {
            return reg.test($.trim($(this).text()));
        });
    }
    protected enter(c: IEvent) {
        this.active!.is("." + this.prefix + "state-disabled") || (this.active!.is('[data-haspopup="true"]') ? this.expand(c) : this.select(c));
    }
    protected collapse(c: IEvent) {
        const parent = this.active && this.active.parent().closest("." + this.prefix + "menu-item", this.element[0]);
        parent && parent.length && (this.close(), this.focus(c, parent));
    }
    protected nextPage(c: IEvent) {
        const prefix = this.prefix;
        if (!this.active) {
            this.next(c);
        } else if (!this.hasNext()) {
            if (this.overHeight()) {
                const e = this.active.offset()!.top!;
                const k = this.element.height()!;
                let b: JQuery<HTMLElement>;

                this.active.nextAll("." + prefix + "menu-item").each(function () {
                    b = $(this);

                    if ((b.offset()!.top - e - k) >= 0) {
                        return false;
                    }
                });

                this.focus(c, b!);
            } else {
                this.focus(c, this.currentElement.find(this.options.items!)[this.active ? "last" : "first"]());
            }
        }
    }
    protected hasPrev() {
        return this.active && !this.active.prevAll("." + this.prefix + "menu-item").length;
    }
    protected hasNext() {
        return this.active && !this.active.nextAll("." + this.prefix + "menu-item").length;
    };
    protected prevPage(c: IEvent) {
        const prefix = this.prefix;
        if (!this.active) {
            this.next(c);
        } else if (!this.hasPrev()) {
            if (this.overHeight()) {
                const top = this.active.offset()!.top;
                const height = this.element.height()!;
                let b: JQuery<HTMLElement>;

                this.active.prevAll("." + prefix + "menu-item").each(function () {
                    b = $(this);

                    if ((b.offset()!.top - top + height) <= 0) {
                        return false;
                    }
                });

                this.focus(c, b!);
            } else {
                this.focus(c, this.currentElement.find(this.options.items!).first());
            }
        }
    }
    protected prev(c: IEvent) {
        this.move("prev", "last", c);
    }
    protected next(c: IEvent) {
        this.move("next", "first", c);
    }
    protected move(type: string, to: string, c: IEvent) {
        const prefix = this.prefix;
        let active: JQuery<HTMLElement>;
        if (this.active) {
            active = (type === "first") || (type === "last")
                ? this.active[type === "first" ? "prevAll" : "nextAll"]("." + prefix + "menu-item").eq(-1)
                : (<any>this).active[type + "All"]("." + prefix + "menu-item").eq(0)
        }
        (active! && active.length && this.active) || (active = (<any>this).currentElement.find(this.options.items!)[to]());
        this.focus(c, active);
    }
    protected hasManu(c: IEvent) {
        return !$(c.target!).closest("." + this.prefix + "menu").length;
    }
    protected refresh() {
        const that = this;
        const left = this.options.icons!.left!;
        const listTag = this.element.find(this.options.listTag!);
        const prefix = this.prefix;
        this.element.toggleClass(prefix + "menu-icons", !!this.element.find("." + prefix + "icon").length);

        listTag.filter(":not(." + prefix + "menu)")
            .addClass(prefix + "menu " + prefix + "component " + prefix + "front")
            .hide()
            .attr({
                menuName: this.options.menuName,
                "data-hidden": "true",
                "data-expanded": "false",
            })
            .each(function () {
                const c = $(this);
                const d = c.parent();
                const f = $("<span>")
                    .addClass(prefix + "menu-icon " + prefix + "icon " + left)
                    .data(prefix + "menu-submenu-carat", true);
                d.attr("data-haspopup", "true").prepend(f);
                c.attr("data-labelledby", d.attr("id")!);
            });

        const items = listTag.add(this.element).find(this.options.items!);

        items.not("." + prefix + "menu-item").each(function () {
            var b = $(this);
            that.divider(b) && b.addClass(prefix + "menu-divider");
        });

        this.uniqueId(items.not("." + prefix + "menu-item, ." + prefix + "menu-divider"))
            .addClass(prefix + "menu-item")
            .attr({
                tabIndex: -1,
                menuName: this.menuName(),
            });

        items.filter("." + prefix + "state-disabled").attr("data-disabled", "true");
        this.active && !$.contains(this.element[0], this.active[0]) && this.blur();
    }
    protected menuName() {
        return {
            menu: "menuitem", // tb
            option: "option", // rQ
        }[this.options.menuName!];
    }
    protected divider(c: JQuery<HTMLElement>) {
        return !/[^\-\u2014\u2013\s]/.test(c.text());
    }
    protected expand(c: IEvent) {
        const children = this.active && this.active.children("." + this.prefix + "menu ").find(this.options.items!).first();

        children && children.length && (this.open(children.parent()), this.delay(() => {
            this.focus(c, children);
        }));
    }
    protected select(c: IEvent) {
        const prefix = this.prefix;
        this.active = this.active || $(c.target!).closest("." + prefix + "menu-item");

        const d = {
            item: this.active,
        };
        this.active.has("." + prefix + "menu").length || this.delayHandle(c, true);
        this.trigger("select", c, d);
    }
    protected delayHandle(e: IEvent, b?: boolean) {
        clearTimeout(this.delaying);
        const prefix = this.prefix;

        this.delaying = this.delay(() => {
            let f = b ? this.element : $(e && e.target!).closest(this.element.find("." + prefix + "menu"));
            f.length || (f = this.element);
            this.close(f);
            this.blur(e);
            this.currentElement = f;
        }, this.delayTime);
    }
    protected focus(e: IEvent, d: JQuery<HTMLElement>): any {
        const prefix = this.prefix;
        this.blur(e, e && (e.type === "focus"));
        this.scrollIntoView(d);
        this.active = d.first();
        const active = this.active.addClass(prefix + "state-focus").removeClass(prefix + "state-active");
        this.options.menuName && this.element.attr("data-activedescendant", active.attr("id")!);
        this.active.parent().closest("." + prefix + "menu-item").addClass(prefix + "state-active");

        active && ((<any>active).type === "keydown")
            ? this.close()
            : this.delaying = this.delay(() => {
                this.close();
            }, this.delayTime);

        const children = d.children("." + prefix + "menu");
        children.length && children && /^mouse/.test((<any>children).type) && this.hidden(children);
        this.currentElement = d.parent();

        this.trigger("focus", children, {
            item: d,
        });
    }
    hidden(c: JQuery<HTMLElement>) {
        clearTimeout(this.delaying);

        (c.attr("data-hidden") === "true") && (this.delaying = this.delay(() => {
            this.close();
            this.open(c);
        }, this.delayTime));
    }
    open(c: JQuery<HTMLElement>) {
        const position = $.extend({
            of: this.active!,
        }, this.options.position);

        const prefix = this.prefix;
        clearTimeout(this.delaying);
        this.element.find("." + prefix + "menu")
            .not(c.parents("." + prefix + "menu"))
            .hide()
            .attr("data-hidden", "true");
        c.show().removeAttr("data-hidden").attr("data-expanded", "true");
        (<any>c).position(position); // 似乎是旧版jQuery专属方法？
    }
    close(c?: JQuery<HTMLElement>) {
        c || (c = this.active ? this.active.parent() : this.element);
        const prefix = this.prefix;
        c.find("." + prefix + "menu")
            .hide()
            .attr("data-hidden", "true")
            .attr("data-expanded", "false")
            .end()
            .find("." + prefix + "state-active")
            .not("." + prefix + "state-focus")
            .removeClass(prefix + "state-active");
    }
    private overHeight() {
        return this.element.prop("scrollHeight") > this.element.outerHeight()!;
    }
    protected scrollIntoView(c: JQuery<HTMLElement>) {
        if (this.overHeight()) {
            let topWidth = parseFloat($.css(this.currentElement[0], "borderTopWidth")) || 0;
            let paddingTop = parseFloat($.css(this.currentElement[0], "paddingTop")) || 0;
            topWidth = c.offset()!.top - this.currentElement.offset()!.top - topWidth - paddingTop;
            paddingTop = this.currentElement.scrollTop()!;
            const height = this.currentElement.height()!;
            const outerHeight = c.outerHeight()!;
            if (topWidth < 0) {
                this.currentElement.scrollTop(paddingTop + topWidth);
            } else {
                if (height < (topWidth + outerHeight)) {
                    this.currentElement.scrollTop(paddingTop + topWidth - height + outerHeight);
                }
            }
        }
    }
    protected blur(e?: IEvent, focus?: boolean) {
        const prefix = this.prefix;
        focus || clearTimeout(this.delaying);

        if (this.active) {
            this.active.removeClass(prefix + "state-focus");
            this.active = <any>null;
            this.trigger("blur", e, {
                item: this.active,
            })
        }
    }
    protected initDate(data: Item[], hasul?: boolean) {
        const ul = hasul ? this.container : $("<ul>");
        data.forEach(d => {
            if (d.empty) {
                $("<li>").appendTo(ul);
            } else {
                var k = $("<li>").appendTo(ul).html(d.name!);
                d.disabled && k.addClass(this.prefix + "state-disabled");
                this.setAttributes(k, d.attributes);
                d.left && k.append(this.initDate(d.left));
            }
        });

        ul.appendTo(this.container);
        return ul;
    }
    destroyCus() {
        const prefix = this.prefix;

        this.removeUniqueId(
            this.element.removeAttr("data-activedescendant")
                .find("." + prefix + "menu")
                .add(this.element)
                .removeClass(prefix + "menu " + prefix + "component " + prefix + "menu-icons " + prefix + "front")
                .removeAttr("role")
                .removeAttr("tabIndex")
                .removeAttr("data-labelledby")
                .removeAttr("data-expanded")
                .removeAttr("data-hidden")
                .removeAttr("data-disabled")
                .show()
        );

        this.removeUniqueId(this.element.find("." + prefix + "menu-item"))
            .removeClass(prefix + "menu-item")
            .removeAttr("role")
            .removeAttr("data-disabled")
            .removeClass(prefix + "state-hover")
            .removeAttr("tabIndex")
            .removeAttr("role")
            .removeAttr("data-haspopup")
            .children()
            .each(function () {
                var b = $(this);
                b.data(prefix + "menu-submenu-carat") && b.remove();
            });

        this.element.find("." + prefix + "menu-divider").removeClass(prefix + "menu-divider");
    }
}