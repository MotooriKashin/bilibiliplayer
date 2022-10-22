import svg from "../panel/svg";
import Base from "./base";

import '../../css/swiper.less';

interface IStep {
    edge_id: number | string;
    title: string;
    cid: number;
    cover: string;
}

interface IOption {
    value?: number | string;
    width?: number;
    height?: number;
    list?: IStep[];
    clickFn?: Function;
    margin?: string;
    border?: boolean;
}

export class Swiper extends Base {
    options: IOption = {
        value: 0,
        height: 89,
        width: 117,
        margin: '0 0 0 25px',
        border: true,
        clickFn: () => { },
        list: [],
    };
    protected translate = 0;
    protected position: Record<string, number> = {};
    protected elements!: {
        wrap: HTMLElement;
        overhide: HTMLElement;
        pre: HTMLElement;
        next: HTMLElement;
        current: HTMLElement;
        list: HTMLElement;
    };
    constructor(container: JQuery, options: IOption = {}) {
        super();
        $.extend(this.options, options);
        this.createComponent(container, this.options);
    }
    protected create() {
        const prefix = this.prefix;
        const container = this.container[0];
        this.container.addClass(prefix + "swiper");
        $(this.TPL()).appendTo(this.container);

        this.elements = {
            wrap: container.querySelector<HTMLElement>(`.${this.prefix}swiper-wrap`)!,
            overhide: container.querySelector<HTMLElement>(`.${this.prefix}swiper-overhide`)!,
            pre: container.querySelector<HTMLElement>(`.${this.prefix}swiper-pre`)!,
            next: container.querySelector<HTMLElement>(`.${this.prefix}swiper-next`)!,
            current: container.querySelector<HTMLElement>(`.${this.prefix}swiper-item-active`)!,
            list: container.querySelector<HTMLElement>(`.${this.prefix}swiper-list`)!,
        }

        this.resize();
        this.reset(0);
    }
    protected initEvent() {
        this.elements.pre.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.reset(1);
        });
        this.elements.next.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            this.reset(-1);
        });
        this.elements.wrap.addEventListener('click', (e: any) => {
            e.stopPropagation();
            if (typeof this.options.clickFn !== 'function') {
                return;
            }
            const el: HTMLElement = this.parentUntil(e.target, `${this.prefix}swiper-item`);
            if (el) {
                const index = (<any>[]).indexOf.call(el.parentNode!.children, el);
                this.value(index + 1);
                this.options.clickFn(index);
            }
        });
    }
    protected TPL() {
        const prefix = this.prefix;
        const items = this.options.list?.reduce((s, d) => {
            s += `
            <div class="${prefix}swiper-item${d.edge_id == this.options.value ? ` ${prefix}swiper-item-active` : ""}" style="width:${this.options.width}px;height:${this.options.height}px;margin:${this.options.margin}">
                <div class="${prefix}swiper-img">
                    <img src="${d.cover}" />
                    <div class="${prefix}swiper-text">${d.title}</div>
                </div>
            </div>
            `;
            return s;
        }, '') || '';
        return `
        <div class="${prefix}swiper-wrap"  style="height:${this.options.height}px;">
            <div class="${prefix}swiper-pre">${svg.arrow}</div>
            <div class="${prefix}swiper-overhide">
                <div class="${prefix}swiper-list${this.options.border ? ` ${prefix}swiper-border` : ""}">
                    ${items}
                </div>
            </div>
            <div class="${prefix}swiper-next">${svg.arrow}</div>
        </div>`
    }
    // index: 为第几个元素，非下标
    value(index: number) {
        if (this.options.value !== index) {
            this.elements.current!.classList.remove(`${this.prefix}swiper-item-active`);
            const cur = this.elements.list!.querySelector(`.${this.prefix}swiper-item:nth-child(${index})`);
            if (cur && cur.classList) {
                cur.classList.add(`${this.prefix}swiper-item-active`);
                this.elements.current = this.container[0].querySelector<HTMLElement>(`.${this.prefix}swiper-item-active`)!;
                this.options.value = index;
            } else {
                return false;
            }
        }
        return this.options.value;
    }
    private parentUntil(elem: HTMLElement, until: string) {
        let matched = null;
        let cur: any = elem.parentNode;

        while (cur && cur.nodeType !== 9) {
            if (cur.classList.contains(until)) {
                matched = cur;
                break;
            }
            cur = cur.parentNode;
        }
        return matched;
    }
    resize(scale: number = 1) {
        try {
            const containerRect = this.elements.overhide!.getBoundingClientRect();
            const listRect = this.elements.list!.getBoundingClientRect();
            const currentRect = this.elements.current!.getBoundingClientRect();

            this.position = {
                listWidth: listRect.width / scale,
                wrapWidth: containerRect.width / scale,
                containerLeft: containerRect.left / scale,
                currentLeft: currentRect.left / scale,
            };

            this.reset(2);
        } catch (error) { }
    }
    private reset(pre: number) {
        const min = this.position.wrapWidth - this.position.listWidth;
        if (min >= 0) {
            this.elements.wrap!.classList.remove(`${this.prefix}swiper-has-next`, `${this.prefix}swiper-has-pre`);
            return;
        }
        switch (pre) {
            case 1:
            case -1:
                this.translate += pre * this.position.wrapWidth;
                break;
            case 0:
                this.translate +=
                    this.position.containerLeft - this.position.currentLeft + this.position.wrapWidth - 117;
                break;
            default:
                break;
        }
        if (this.translate <= min) {
            this.translate = min;
            this.elements.wrap!.classList.remove(`${this.prefix}swiper-has-next`);
        } else {
            this.elements.wrap!.classList.add(`${this.prefix}swiper-has-next`);
        }
        if (this.translate >= 0) {
            this.translate = 0;
            this.elements.wrap!.classList.remove(`${this.prefix}swiper-has-pre`);
        } else {
            this.elements.wrap!.classList.add(`${this.prefix}swiper-has-pre`);
        }
        this.elements.list!.style.webkitTransform = `translateX(${this.translate}px)`;
        this.elements.list!.style.transform = `translateX(${this.translate}px)`;
    }
}