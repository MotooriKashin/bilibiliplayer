import Base from "./base";

import '../../css/input.less';

interface IOption {
    value?: string;
    placeholder?: string;
    type?: string;
    step?: number;
    max?: number;
    min?: number;
    disabled?: boolean;
}

export class Input extends Base {
    options: IOption = {
        value: '',
        placeholder: '',
        type: '',
        step: 1,
        max: Infinity,
        min: -Infinity,
    }
    protected elements!: {
        input: HTMLInputElement | HTMLTextAreaElement;
        wrap: HTMLElement;
        up: HTMLElement | null;
        down: HTMLElement | null;
    };
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    protected create() {
        const prefix = this.prefix;
        const container = this.container[0];
        this.container.addClass(prefix + "input");
        $(this.TPL()).appendTo(this.container);

        this.elements = {
            input: container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`.${this.prefix}input-input`)!,
            wrap: container.querySelector<HTMLElement>(`.${this.prefix}input-wrap`)!,
            up: container.querySelector<HTMLElement>(`.${this.prefix}input-stepper-up`),
            down: container.querySelector<HTMLElement>(`.${this.prefix}input-stepper-down`),
        };
    }
    protected initEvent() {
        this.elements.input!.addEventListener('change', () => {
            if (this.options.type === 'number' && this.value() !== '') {
                let value = parseFloat(this.value());
                value = Math.max(value, this.options.min!);
                value = Math.min(value, this.options.max!);
                (<HTMLInputElement>this.elements.input).value = value + '';
            }

            this.trigger('change', {
                value: this.value(),
                manual: true,
            });
        });

        this.elements.input!.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });

        this.elements.input!.addEventListener('input', () => {
            this.trigger('input', {
                value: this.value(),
                manual: true,
            });
        });

        this.elements.input!.addEventListener('blur', () => {
            if (this.options.type === 'number' && this.value() !== '') {
                const value = parseFloat(this.value());
                let result = value;
                result = Math.max(result, this.options.min!);
                result = Math.min(result, this.options.max!);

                if (value !== result) {
                    this.value(result);
                }
            }
            this.trigger('blur', {});
        });

        this.elements.input!.addEventListener('focus', () => {
            this.trigger('focus', {});
        });

        if (this.options.type === 'number') {
            let repeatTimer = 0;
            let setRepeatTimer = 0;

            const clearTimers = () => {
                window.clearInterval(setRepeatTimer);
                window.clearInterval(repeatTimer);
            };

            this.elements.up!.addEventListener('mousedown', () => {
                setRepeatTimer = window.setTimeout(() => {
                    repeatTimer = window.setInterval(() => {
                        this.step();
                    }, 60);
                }, 500);
            });

            this.elements.up!.addEventListener('mouseup', () => {
                clearTimers();
                this.step();
            });

            this.elements.up!.addEventListener('mouseleave', () => {
                clearTimers();
            });

            this.elements.down!.addEventListener('mousedown', () => {
                setRepeatTimer = window.setTimeout(() => {
                    repeatTimer = window.setInterval(() => {
                        this.step(true);
                    }, 60);
                }, 500);
            });

            this.elements.down!.addEventListener('mouseup', () => {
                clearTimers();
                this.step(true);
            });

            this.elements.down!.addEventListener('mouseleave', () => {
                clearTimers();
            });

            this.elements.input!.addEventListener('mousewheel', (e) => {
                e.preventDefault();
            });
        }
    }
    protected TPL() {
        const prefix = this.prefix;
        const options = this.options;
        const input = options.type === 'textarea'
            ? `<textarea class="${prefix}input-input" type="text"${options.placeholder ? ` placeholder="${options.placeholder}"` : ""}${options.disabled ? ` disabled="disabled"` : ""}>${options.value}</textarea>`
            : `<input class="${prefix}input-input" type="${options.type === 'number' ? "number" : "text"}"${options.placeholder ? ` placeholder="${options.placeholder}"` : ""}${options.disabled ? ` disabled="disabled"` : ""} value="${options.value}">`;
        const number = options.type === 'number'
            ? `
            <div class="${prefix}input-stepper">
                <div class="${prefix}input-stepper-half ${prefix}input-stepper-up">
                    <span class="${prefix}input-arrow ${prefix}input-arrow-up"></span>
                </div>
                <div class="${prefix}input-stepper-half ${prefix}input-stepper-down">
                    <span class="${prefix}input-arrow ${prefix}input-arrow-down"></span>
                </div>
            </div>`
            : "";
        return `
        <div class="${prefix}input-wrap${options.disabled ? ` ${prefix}input-wrap-disabled` : ""}">
            ${input}${number}
        </div>
        `;
    }

    private step(reverse = false) {
        const setReverse = reverse ? -1 : 1;
        if (this.value() !== '') {
            this.value((parseFloat(this.value()) + this.options.step! * setReverse).toFixed(5), true);
        }
    }

    value(value?: string | number, manual = false) {
        if (value !== undefined) {
            let result;
            if (this.options.type === 'number' && value !== '') {
                result = typeof value === 'string' ? parseFloat(value) : value;
                result = Math.max(result, this.options.min!);
                result = Math.min(result, this.options.max!) + '';
            } else {
                result = value + '';
            }

            if (this.value() !== result) {
                (<HTMLInputElement>this.elements.input).value = result;

                this.trigger('change', {
                    value: result,
                    manual,
                });

                this.trigger('input', {
                    value: result,
                    manual,
                });
            }
        }
        return (<HTMLInputElement>this.elements.input).value;
    }

    disable() {
        this.elements.wrap!.classList.add(`${this.prefix}input-wrap-disabled`);
        (<HTMLInputElement>this.elements.input).disabled = true;
        return this;
    }

    enable() {
        this.elements.wrap!.classList.remove(`${this.prefix}input-wrap-disabled`);
        (<HTMLInputElement>this.elements.input).disabled = false;
        return this;
    }

    focus() {
        this.elements.input!.focus();
    }
}