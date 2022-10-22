import '../../css/skipcard.less';

export interface ISkipCard {
    id: number;
    from: number;
    to: number;

    status: boolean; // true已选 false未选
    cardType: number; // 1 标准卡 2 原跳转卡

    // 必剪数据
    icon?: string;
    label?: string;
    content?: string;
    button?: string;
    link?: string;

    // 预约数据
    title?: string;
    buttonTitle?: string;
    buttonSelectedTitle?: string;
    showSelected?: boolean;
    seasonId?: number;
    activityId?: number;
    bizType?: number; // 1 追番追剧 2活动预约 3跳转链接
}
interface ISkipOptions {
    container: HTMLElement;
    prefix: string;
    list: ISkipCard[];
    click: (item: ISkipCard) => void;
    show: (item: ISkipCard) => void;
}

export default class SkipCard {
    private container: HTMLElement;
    private config: ISkipOptions;
    private prefix: string;
    private list: ISkipCard[];
    private cPanel!: ISkipCard;
    private element!: { [key: string]: HTMLElement | HTMLImageElement; };

    constructor(opt: ISkipOptions) {
        this.config = {
            ...opt,
        };
        this.container = opt.container || document.createElement('div');
        this.prefix = opt.prefix;
        this.list = opt.list;
        this.init();
    }
    init() {
        let hasSkip;
        let hasCustom;
        this.list.forEach((card: ISkipCard) => {
            switch (card.cardType) {
                case 1:
                    hasCustom = true;
                    break;
                case 2:
                    hasSkip = true;
                    break;
                default:
                    break;
            }
        });
        this.tpl(<any>hasSkip, <any>hasCustom);
    }

    timeUpdate(time: number) {
        for (let i = 0; i < this.list.length; i++) {
            const ele = this.list[i];
            if (!ele.showSelected && ele.status) {
                continue;
            }
            if (ele.from <= time && ele.to >= time) {
                if (this.cPanel !== ele) {
                    this.cPanel = ele;
                    if (this.cPanel.cardType === 1) {
                        this.element.stardcardLeft.textContent = ele.title!;
                        if (ele.status) {
                            this.element.stardcardRight.textContent = ele.buttonSelectedTitle!;
                        } else {
                            this.element.stardcardRight.textContent = ele.buttonTitle!;
                        }
                        this.buttonActive(ele.status);
                        this.element.stardcard.classList.add(`${this.prefix}-show`);
                        this.element.card?.classList.remove(`${this.prefix}-show`);
                    } else {
                        (<HTMLImageElement>this.element.img).src = ele.icon!;
                        this.element.label.textContent = ele.label!;
                        this.element.content.textContent = ele.content!;
                        this.element.btn.textContent = ele.button!;
                        this.element.card.classList.add(`${this.prefix}-show`);
                        this.element.stardcard?.classList.remove(`${this.prefix}-show`);
                    }
                    this.config.show(this.cPanel);
                }
                return;
            }
        }
        this.cPanel = <any>null;
        this.hide();
    }

    updataButton(card: ISkipCard) {
        this.list.forEach((item) => {
            switch (item.bizType) {
                case 1:
                    if (item.seasonId === card.seasonId) {
                        item.status = card.status;
                    }
                    break;

                case 2:
                    if (item.activityId === card.activityId) {
                        item.status = card.status;
                    }
                    break;
            }
        });
        //追番预约文案
        if (card.status) {
            this.element.stardcardRight.textContent = card.buttonSelectedTitle!;
        } else {
            this.element.stardcardRight.textContent = card.buttonTitle!;
        }
        this.buttonActive(card.status);
        setTimeout(() => {
            this.hide();
        }, 500);
    }

    buttonActive(action: boolean) {
        if (action) {
            this.element.stardcardRight.classList.add(`${this.prefix}-active`);
        } else {
            this.element.stardcardRight.classList.remove(`${this.prefix}-active`);
        }
    }

    hide() {
        this.element.card?.classList.remove(`${this.prefix}-show`);
        this.element.stardcard?.classList.remove(`${this.prefix}-show`);
    }

    private tpl(hasSkip: boolean, hasCustom: boolean) {
        const prefix = this.prefix;
        let dom = '';
        if (hasSkip) {
            dom = `<div class="${prefix}-skipcard">
            <div class="${prefix}-skipcard-left"><img class="${prefix}-skipcard-left-img"></div>
            <div class="${prefix}-skipcard-center"><div class="${prefix}-skipcard-center-label"></div><div class="${prefix}-skipcard-center-content"></div></div>
            <div class="${prefix}-skipcard-right"></div>
            </div>`;
        }
        if (hasCustom) {
            dom += `<div class="${prefix}-stardcard">
            <div class="${prefix}-stardcard-left"></div>
            <div class="${prefix}-stardcard-right"></div>
            </div>`;
        }
        this.container.insertAdjacentHTML('beforeend', dom);
        this.element = {
            // 必剪dom
            card: <HTMLElement>document.querySelector(`.${prefix}-skipcard`),
            img: <HTMLImageElement>document.querySelector(`.${prefix}-skipcard-left-img`),
            label: <HTMLElement>document.querySelector(`.${prefix}-skipcard-center-label`),
            content: <HTMLElement>document.querySelector(`.${prefix}-skipcard-center-content`),
            btn: <HTMLElement>document.querySelector(`.${prefix}-skipcard-right`),

            // 预约、追番dom
            stardcard: <HTMLElement>document.querySelector(`.${prefix}-stardcard`),
            stardcardLeft: <HTMLElement>document.querySelector(`.${prefix}-stardcard-left`),
            stardcardRight: <HTMLElement>document.querySelector(`.${prefix}-stardcard-right`),
        };
        this.element.btn?.addEventListener('click', () => {
            this.config.click(this.cPanel);
        });
        this.element.stardcardRight?.addEventListener('click', () => {
            this.config.click(this.cPanel);
        });
    }
    dispose() {
        if (this.element) {
            this.element.card && this.container.removeChild(this.element.card);
            this.element.stardcard && this.container.removeChild(this.element.stardcard);
        }
    }
}
