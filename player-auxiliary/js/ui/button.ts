import Base from "./base";

interface IOption {
    textOnly?: boolean; // Ot
    id?: string;
    disabled?: boolean;
    text?: boolean;
    label?: string;
    class?: string; // Jc

    icons?: { // Me
        primary?: string; // Ve
        secondary?: string; // Bo
    };

    click?: (e: JQuery.TriggeredEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void;
    type?: string;
    name?: string;
}
export class Button extends Base {
    options: IOption = {
        id: "button",
        // disabled: null,
        text: true,
        label: <any>null,
        // class: null,

        icons: {
            primary: <any>null,
            secondary: <any>null,
        },

        // click: null,
        type: "",
        name: "",
    };
    defaultElement = '<button>'; // oH
    private name = 'button'; // Kw
    private classes = 'button-icons-only button-icon-only button-text-icons button-text-icon-primary button-text-icon-secondary button-text-only'; // kB
    private mouseElement?: HTMLElement; // ms
    private id: string | undefined;
    private type!: "checkbox" | "radio" | "input" | "button";
    private targetElement!: JQuery<HTMLElement>;
    private isTltle?: boolean;
    // eventNamespace Cc
    // targetElement sa
    // initHover rJ
    // uuid bf
    // setAttributes Eo
    // cssPrefix ee
    // getEventsPage Ke
    constructor(container: JQuery, options: IOption = {}) {
        super();
        $.extend(this.options, options);
        this.id = this.options.id;
        this.createComponent(container, this.options);
    }
    create() {
        const prefix = this.prefix;
        const that = this;
        this.element.closest("form").unbind("reset" + this.eventNamespace).bind("reset" + this.eventNamespace, this.reset);
        if (typeof this.options.disabled !== "boolean") {
            this.options.disabled = !!this.element.prop("disabled");
        } else {
            this.element.prop("disabled", this.options.disabled);
        }
        this.preInit();
        this.isTltle = !!this.targetElement.attr("title");

        const options = this.options;
        const isCheckboxOrRadio = (this.type === "checkbox") || (this.type === "radio");
        const className = isCheckboxOrRadio ? "" : prefix + "state-active";

        if (options.label === null) {
            options.label = this.type === "input" ? <string>this.targetElement.val() : this.targetElement.html();
        }

        if (options.type) {
            const types = options.type.split(",");
            types.forEach(d => { this.targetElement.addClass(prefix + "button-type-" + d) })
        }

        this.initHover(this.targetElement);

        this.targetElement
            .addClass(this.name).attr("role", "button")
            .bind("mouseenter" + this.eventNamespace, function () {
                options.disabled || ((that.mouseElement === this) && $(this).addClass(prefix + "state-active"));
            })
            .bind("mouseleave" + this.eventNamespace, function () {
                options.disabled || $(this).removeClass(className);
            })
            .bind("click" + this.eventNamespace, function (b) {
                if (options.disabled) {
                    b.preventDefault();
                    b.stopImmediatePropagation();
                } else {
                    that.trigger('click', b);
                }
            });
        this.bind({
            focus: function () {
                this.targetElement.addClass(prefix + "state-focus");
            },

            blur: function () {
                this.targetElement.removeClass(prefix + "state-focus");
            },
        });

        isCheckboxOrRadio && this.element.bind("change" + this.eventNamespace, function () {
            that.refresh();
        });

        if (this.type === "checkbox") {
            this.targetElement.bind("click" + this.eventNamespace, function () {
                if (options.disabled) {
                    return false;
                }
            })
        } else if (this.type === "radio") {
            this.targetElement.bind("click" + this.eventNamespace, function () {
                if (options.disabled) {
                    return false;
                }

                $(this).addClass(prefix + "state-active");
                that.targetElement.attr("data-pressed", "true");
                const ele = that.element[0];

                that.filterRadio(<HTMLFormElement>ele).not(ele).map(function () {
                    return new Button($(this)).widget()[0];
                }).removeClass(prefix + "state-active").attr("data-pressed", "false");
            })
        } else {
            this.targetElement
                .bind("mousedown" + this.eventNamespace, function () {
                    if (options.disabled) {
                        return false;
                    }

                    $(this).addClass(prefix + "state-active");
                    that.mouseElement = this;

                    that.document.one("mouseup", function () {
                        that.mouseElement = <any>null;
                    });
                })
                .bind("mouseup" + this.eventNamespace, function () {
                    if (options.disabled) {
                        return false;
                    }

                    $(this).removeClass(prefix + "state-active");
                })
                .bind("keydown" + this.eventNamespace, function (b) {
                    if (options.disabled) {
                        return false;
                    }

                    ((32 !== b.keyCode) && (13 !== b.keyCode)) || $(this).addClass(prefix + "state-active");
                })
                .bind("keyup" + this.eventNamespace + " blur" + this.eventNamespace, function () {
                    $(this).removeClass(prefix + "state-active");
                });

            if (this.targetElement.is("a")) {
                this.targetElement.keyup(function (b) {
                    (32 === b.keyCode) && $(this).click();
                })
            }
        }

        this.setOption("disabled", options.disabled);
        this.change();
    }
    setOption(key: string, value: any) { // qc
        const prefix = this.prefix;
        this.options[<keyof IOption>key] = value;

        if (key === "disabled") {
            this.widget().toggleClass(prefix + "state-disabled", !!value);
            this.element.prop("disabled", !!value);
            if (value) {
                if ((this.type === "checkbox") || (this.type === "radio")) {
                    this.targetElement.removeClass(prefix + "state-focus");
                } else {
                    this.targetElement.removeClass(prefix + "state-focus ${prefix}state-active");
                }
            }
        } else {
            (key === "active") && this.widget().toggleClass("state-active", !!value);
            this.change();
        }
        return this;
    }
    private change() { // tA
        const prefix = this.prefix;

        if (this.type === "input") {
            this.options.label && this.element.val(this.options.label);
        } else {
            const targetElement = this.targetElement.removeClass(this.classes.split(" ").join(prefix + " "));
            const span = $("<span></span>", this.document[0]).addClass(prefix + "button-text").html(this.options.label!).appendTo(targetElement.empty()).text();
            const icons = this.options.icons!;
            const isIcon = icons.primary && icons.secondary;
            const addClass = [];

            if (icons.primary || icons.secondary) {
                this.options.text && addClass.push(prefix + "button-text-icon" + (isIcon ? "s" : icons.primary ? "-primary" : "-secondary"));

                icons.primary && targetElement.prepend(
                    `<span class="${prefix}button-icon-primary ${prefix}icon ${icons.primary}"></span>`
                );
                icons.secondary && targetElement.append(
                    `<span class="${prefix}button-icon-secondary ${prefix}icon ${icons.secondary}"></span>`
                );

                if (!this.options.text) {
                    addClass.push(isIcon ? "" + prefix + "button-icons-only" : prefix + "button-icon-only");
                    this.isTltle || targetElement.attr("title", $.trim(span));
                }
                if (this.options.name) {
                    this.targetElement.children()?.attr("name", this.options.name);
                }
            }

            this.options.textOnly && addClass.push(prefix + "button-text-only");

            if (this.options.class) {
                this.targetElement.attr(
                    "class",
                    this.targetElement.attr("class")!.replace(new RegExp(prefix + "button-theme-\\w+", "g"), "")
                );
                this.targetElement.addClass(prefix + "button-theme-" + this.options.class);
            }

            targetElement.addClass(addClass.join(" "));
        }
    }
    widget() { // cg
        return this.targetElement;
    }
    refresh() {
        const prefix = this.prefix;
        const that = this;
        const disabled = this.element.is("input, button") ? this.element.is(":disabled") : this.element.hasClass(prefix + "button-disabled");
        if (this.options.disabled !== disabled) {
            this.setOption("disabled", disabled);
        }

        if (this.type === "radio") {
            this.filterRadio(<HTMLFormElement>this.element[0]).each(function () {
                if ($(this).is(":checked")) {
                    new Button($(this)).widget().addClass(prefix + "state-active").attr("data-pressed", "true");
                } else {
                    new Button($(this)).widget().removeClass(prefix + "state-active").attr("data-pressed", "false");
                }
            });
        } else if (this.type === "checkbox") {
            if (this.element.is(":checked")) {
                this.targetElement.addClass(prefix + "state-active").attr("data-pressed", "true");
            } else {
                this.targetElement.removeClass(prefix + "state-active").attr("data-pressed", "false");
            }
        }
    }
    private filterRadio(radio: HTMLFormElement) { // hA
        const name = radio.name;
        const form = radio.form;
        let forms: JQuery<HTMLElement> = $([]);

        if (name) {
            const str = name.replace(/'/g, "\\'");
            forms = form
                ? $(form).find("[name=\"" + str + "\"][type=radio]")
                : $("[name=\"" + str + "\"][type=radio]", radio.ownerDocument).filter(function () {
                    return !(<HTMLFormElement>this).form;
                })
        }
        return forms;
    }
    private preInit() {
        const prefix = this.prefix;
        switch (true) {
            case this.element.is("[type=checkbox]"):
                this.type = "checkbox";
                break;
            case this.element.is("[type=radio]"):
                this.type = "radio";
                break;
            case this.element.is("input"):
                this.type = "input";
                break;
            default: this.type = "button";
        }
        if ((this.type === "checkbox") || (this.type === "radio")) {
            let last = this.element.parents().last();
            const label = `label[for="${this.element.attr("id")}"]`;

            this.targetElement = last.find(label);
            if (!this.targetElement.length) {
                last = last.length ?
                    last.siblings()
                    : this.element.siblings(),
                    this.targetElement = last.filter(label),
                    this.targetElement.length || (this.targetElement = last.find(label))
            }

            const checked = this.element.is(":checked");
            checked && this.targetElement.addClass(prefix + "state-active");
            this.targetElement.prop("data-pressed", checked);
        } else {
            this.targetElement = this.element;
        }
    }
    private reset() {
        setTimeout(() => {
            new Button($(this).find(":" + this.prefix + "button")).refresh();
        }, 1);
    }
    destroyCus() { // Ff
        const prefix = this.prefix;
        this.element.removeClass(prefix + "helper-hidden-accessible");
        this.targetElement
            .removeClass(this.name + " " + prefix + "state-active " + this.classes.split(" ").join(" " + prefix))
            .removeAttr("role")
            .removeAttr("data-pressed")
            .html(this.targetElement.find("." + prefix + "button-text").html());
        this.isTltle || this.targetElement.removeAttr("title");
    }
}