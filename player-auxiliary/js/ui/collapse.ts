import Base from "./base";

import '../../css/collapse.less';

interface IOption {
    value?: boolean;
    foldText?: string;
    unfoldText?: string;
    header?: HTMLElement;
    body?: HTMLElement;
    canCollapse?: number;
    headerBackground?: string;
}

export class Collapse extends Base {
    options: IOption = {
        value: false,
        foldText: '展开',
        unfoldText: '收起',
        canCollapse: 1,
    };
    private valueIn: boolean;
    private elements!: {
        wrap: HTMLElement;
        body: HTMLElement;
        header: HTMLElement;
        arrowText: HTMLElement;
    };
    constructor(container: JQuery, options: IOption) {
        super();
        $.extend(this.options, options);
        this.valueIn = this.options.value!;
        this.createComponent(container, this.options);
    }
    protected create() {
        const prefix = this.prefix;
        const container = this.container[0];
        this.container.addClass(prefix + "collapse");
        $(this.TPL()).appendTo(this.container);

        this.elements = {
            wrap: container.querySelector<HTMLElement>(`.${this.prefix}collapse-wrap`)!,
            body: container.querySelector<HTMLElement>(`.${this.prefix}collapse-body`)!,
            header: container.querySelector<HTMLElement>(`.${this.prefix}collapse-header`)!,
            arrowText: container.querySelector<HTMLElement>(`.${this.prefix}collapse-arrow-text`)!,
        };

        this.elements.body!.appendChild(this.options.body!);
        this.elements.header!.appendChild(this.options.header!);
    }
    protected initEvent() {
        this.elements.body!.addEventListener('transitionend', () => {
            if (this.valueIn) {
                this.elements.body!.style.height = '';
            }
        });
        this.elements.header!.addEventListener('click', () => {
            this.options.canCollapse && this.toggle();
        });
        if (!this.options.canCollapse) {
            this.elements.arrowText!.style.display = 'none';
        }
    }
    protected TPL() {
        const prefix = this.prefix;
        const options = this.options;
        return `<div class="${prefix}collapse-wrap${options.value ? ` ${prefix}collapse-wrap-folded` : ''}">
        <div class="${prefix}collapse-header"${options.headerBackground ? ` style="background-color:${options.headerBackground}` : ''}">
            <div class="${prefix}collapse-arrow">
                <span class="${prefix}collapse-arrow-text">${options.value ? `${options.foldText}` : `${options.unfoldText}`}</span>
            </div>
        </div>
        <div class="${prefix}collapse-body"${options.value ? ' style="height: 0;"' : ''}></div>
    </div>`;
    }
    value(value?: boolean) {
        if (value !== undefined) {
            if (value) {
                this.unfold();
            } else {
                this.fold();
            }
        }
        return this.valueIn;
    }

    unfold(manual?: boolean) {
        // 只响应手动触发
        if (!manual) return;

        if (!this.valueIn) {
            this.valueIn = true;
            this.elements.wrap!.classList.remove(`${this.prefix}collapse-wrap-folded`);
            if (this.options.foldText !== this.options.unfoldText) {
                this.elements.arrowText!.innerHTML = this.options.unfoldText!;
            }
            this.elements.body!.style.height = `${this.elements.body!.scrollHeight}px`;

            this.trigger('change', {
                value: this.valueIn,
                manual,
            });
            this.trigger('unfold', {
                value: this.valueIn,
                manual,
            });
        }
    }

    updateOptions(options: IOption) {
        this.options = {
            ...this.options,
            ...options,
        };
        if (!this.options.canCollapse) {
            this.elements.arrowText!.style.display = 'none';
        } else {
            this.elements.arrowText!.style.display = 'block';
        }
    }
    resize() {
        if (this.valueIn && this.elements.body!.style.height === '0px') {
            this.elements.body!.style.height = `${this.elements.body!.scrollHeight}px`;
        }
    }
    fold(manual?: boolean) {
        // 只响应手动触发
        if (!manual) return;

        if (this.valueIn) {
            this.valueIn = false;
            this.elements.wrap!.classList.add(`${this.prefix}collapse-wrap-folded`);
            if (this.options.foldText !== this.options.unfoldText) {
                this.elements.arrowText!.innerHTML = this.options.foldText!;
            }
            this.elements.body!.style.height = `${this.elements.body!.scrollHeight}px`;
            setTimeout(() => {
                this.elements.body!.style.height = '0px';

                this.trigger('change', {
                    value: this.valueIn,
                    manual,
                });
                this.trigger('fold', {
                    value: this.valueIn,
                    manual,
                });
            }, 0);
        }
    }

    toggle() {
        if (this.valueIn) {
            this.fold(true);
        } else {
            this.unfold(true);
        }
    }
}