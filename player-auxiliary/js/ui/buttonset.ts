import Base from "./base";
import { Button } from "./button";

interface IOption {
    items?: string;
    id?: string;
    click?: (e: JQuery.TriggeredEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) => void;
}

export class ButtonSet extends Base {
    options: IOption = {
        id: 'buttonset',
        items: "button, input[type=button], input[type=submit], input[type=reset], input[type=checkbox], input[type=radio], a"
    };
    buttons!: JQuery<HTMLElement>;
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    create() {
        this.element.addClass(this.prefix + "buttonset");
    }
    init() {
        this.refresh();
    }
    private refresh() {
        const rtl = this.element.css("direction") === "rtl";
        const items = this.element.find(this.options.items + ", :data(" + this.prefix + "button)");
        const button = items.filter(":" + this.prefix + "button");
        new Button(items.not(":" + this.prefix + "button"));
        new Button(button).refresh();

        this.buttons = items
            .map(function () {
                return new Button($(this)).widget()[0];
            })
            .removeClass(
                this.prefix + "corner-all " + this.prefix + "corner-left " + this.prefix + "corner-right"
            )
            .filter(":first")
            .addClass(rtl ? this.prefix + "corner-right" : this.prefix + "corner-left")
            .end()
            .filter(":last")
            .addClass(rtl ? this.prefix + "corner-left" : this.prefix + "corner-right")
            .end()
            .end();
    }
    setOption(key: string, value: any) {
        if (key !== "disabled") {
            new Button(this.buttons).option(key, value);
        }
        this.options[<keyof IOption>key] = value;

        return this;
    }
    destroyCus() {
        this.element.removeClass(this.prefix + "buttonset");

        new Button(
            this.buttons
                .map(function () {
                    return new Button($(this)).widget()[0];
                })
                .removeClass(this.prefix + "corner-left " + this.prefix + "corner-right")
                .end(),
            {}
        ).destroy();
    }
}