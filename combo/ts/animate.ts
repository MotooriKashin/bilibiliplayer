import { unzip } from '@jsc/bilibiliplayer/js/unzip';
import { IConfig, IComboCard } from '..';
import { formatText } from './state';

interface IElements {
    [key: string]: HTMLElement;
}

interface IImg {
    length: number;
    [key: string]: any;
}

export interface IFold {
    anim1: IImg;
    anim2: IImg;
    anim3: IImg;
    bgin: IImg;
    bgloop: IImg;
    bgout: IImg;
    number: IImg;
    [key: string]: IImg;
}

// 入场动画时长
let bgin = 330;
// 开始入场165ms后开始显示文字
let showText = 165;
// 出场动画时长
const bgout = 1670;
// 爆炸阶段  文字动画时长
const textWrap = 460;
// 爆炸背景时长
const fire = 2000;
// 背景循环时长
const loopTime = 2000;

export default class Animate {
    private pfx: string;
    private container: HTMLElement;
    private templete!: IElements;
    private templeteNum: HTMLElement[] = [];
    private rNum = 0; //
    private text: string = '';
    private paused = true;
    private showed: boolean = false;
    private card!: IComboCard;
    private cardFold: { [key: string]: Promise<IFold> } = {};
    private cardList: IComboCard[];

    constructor(private config: IConfig) {
        this.container = config.container || document.createElement('div');
        this.pfx = config.pfx!;
        this.cardList = config.list;
        if (config.noin) {
            bgin = 0;
            showText = 0;
        }

        this.formatFold();

        this.tpl();
    }

    private formatFold() {
        let card;
        for (let i = 0; i < this.cardList.length; i++) {
            card = this.cardList[i];
            card.count = Math.min(this.config.max!, card.count);
            if (card.text || this.config.noin || card.type === 100) {
                card.text = formatText(card.text);
            } else {
                this.cardList.splice(i, 1);
                i--;
            }
        }
        this.cardList.forEach((card) => {
            this.cardFold[card.url] = this.cardFold[card.url] || unzip(card.data);

            this.cardFold[card.url].then((fold) => {
                card.fold = fold;
                this.showNum();
                this.resize();
                this.play();
            });
        });
    }

    updata(list: IComboCard[]) {
        if (this.config.noin) {
            this.rNum = 0;
        }
        if (list?.length) {
            this.cardList = list;
            this.formatFold();
        } else {
            this.cardList = [];
            this.showNum();
        }
    }
    delete() {
        this.hide();
    }
    resize() {
        const width = this.container.offsetWidth;
        let name = '';
        const first = `${this.pfx}-first`;
        const sec = `${this.pfx}-sec`;
        const four = `${this.pfx}-four`;
        switch (true) {
            case width < 638:
                name = first;
                break;
            case width < 854:
                name = sec;
                break;
            case width < 1070:
                name = '';
                break;
            default:
                name = four;
                break;
        }
        if (this.templete.combo) {
            this.templete.combo.classList.remove(first, sec, four);
            name && this.templete.combo.classList.add(name);
        }
    }
    pause() {
        this.showNum();
        this.paused = true;
    }
    play() {
        if (this.paused) {
            this.paused = false;
            this.render();
        }
    }
    show() {
        this.showed = true;
        this.templete.combo.classList.add(`${this.pfx}-show`);
        if (this.card?.type === 100) {
            this.templete.combo.classList.add(`${this.pfx}-show-text`, `${this.pfx}-million`);
        }
    }
    hide() {
        this.showed = false;
        this.templete.combo.classList.remove(`${this.pfx}-show`);
        this.templete.combo.classList.remove(`${this.pfx}-show-text`);
        this.templete.combo.classList.add(`${this.pfx}-hide`);
    }
    search(x: number, y: number) {
        const rect = this.templete.wrap.getBoundingClientRect();
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
            return this.card;
        }
        return false;
    }
    option(key: string, value: any) {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.config.visible = value;
                if (value) {
                    this.show();
                } else {
                    this.hide();
                }
                break;
            default:
                break;
        }
    }
    private render() {
        if (this.paused) return;
        this.showNum();
        window.requestAnimationFrame(() => {
            this.rNum++;
            this.render();
        });
    }

    private showNum() {
        if (!this.config.visible) return;

        let cTime = this.config.timeSyncFunc() || 0;
        let card!: IComboCard;
        for (let i = 0; i < this.cardList.length; i++) {
            card = this.cardList[i];
            if (card.stime <= cTime && card.stime + card.duration >= cTime) {
                break;
            } else {
                card = <any>null;
            }
        }
        this.card = card;
        if (cTime <= 0 || !card) {
            this.hide();
            return;
        }
        const color = card.fold?.combo_res?.template?.textColor || '#fed1a9';
        this.templete.text.style.color = color;
        if (card.fold?.number?.['10']) {
            this.templete.numX.setAttribute('src', card.fold.number['10'] || '');
        }
        if (!this.showed) {
            this.config.intoShow?.(card);
        }
        cTime -= card.stime;
        if (this.rNum % 5 !== 0 && cTime < 8280) {
            return;
        }
        // 百亿活动特殊配置
        this.templete.text.textContent = card.text;
        if (card.type === 100) {
            this.templete.bg.setAttribute('src', card.fold?.bgin[0] || '');
            this.renderNum(card, cTime, card.duration);
            this.show();
            return;
        }

        if (cTime >= showText) {
            this.templete.combo.classList.add(`${this.pfx}-show-text`);
        }

        if (cTime < bgin) {
            if (card.fold?.bgin) {
                const bgi = Math.ceil((card.fold.bgin.length * cTime) / bgin) - 1;
                this.templete.bg.setAttribute('src', card.fold.bgin[bgi]);
            }
            this.renderNum(card, 0, bgin);
            this.show();
            return;
        }
        cTime -= bgin;
        const loopEnd = card.duration - bgout - bgin;

        this.renderNum(card, cTime, loopEnd);

        const step1 = (card.step[0] / card.count) * loopEnd;
        const step2 = (card.step[1] / card.count) * loopEnd;
        const step3 = (card.step[2] / card.count) * loopEnd;
        let fireBg = '';
        if (cTime >= step1 && cTime < step1 + fire) {
            this.textAnimate(cTime, step1);
            if (card.fold?.anim1) {
                const dur = cTime - step1;
                const fb = Math.ceil((card.fold.anim1.length * dur) / fire) - 1;
                fireBg = card.fold.anim1[fb];
            }
        } else if (cTime >= step2 && cTime < step2 + fire) {
            this.textAnimate(cTime, step2);
            if (card.fold?.anim2) {
                const dur = cTime - step2;
                const fb = Math.ceil((card.fold.anim2.length * dur) / fire) - 1;
                fireBg = card.fold.anim2[fb];
            }
        } else if (cTime >= step3 && cTime < step3 + fire) {
            this.textAnimate(cTime, step3);
            if (card.fold?.anim3) {
                const dur = cTime - step3;
                const fb = Math.ceil((card.fold.anim3.length * dur) / fire) - 1;
                fireBg = card.fold.anim3[fb];
            }
        }

        this.templete.fire.setAttribute('src', fireBg);

        if (cTime <= loopEnd) {
            if (card.fold?.bgloop) {
                const rTime = cTime % loopTime;
                const bgl = Math.ceil((card.fold.bgloop.length * rTime) / loopTime) - 1;
                this.templete.bg.setAttribute('src', card.fold.bgloop[bgl]);
            }
            this.show();
            return;
        }
        cTime -= loopEnd;
        if (cTime <= bgout) {
            if (card.fold?.bgout) {
                const bgo = Math.ceil((card.fold.bgout.length * cTime) / bgout) - 1;
                this.templete.bg.setAttribute('src', card.fold.bgout[bgo]);
            }
            if (cTime > 1170) {
                this.templete.combo.classList.remove(`${this.pfx}-show-text`);
            }
            this.show();
            return;
        }
        this.hide();
    }
    private renderNum(card: IComboCard, cTime: number, loopEnd: number) {
        let num = Math.ceil((card.count * cTime) / loopEnd);
        num = Math.min(num, card.count);
        num = Math.max(num, 0);

        const list = String(num).split('').reverse();
        if (card.fold?.number) {
            for (let i = 0; i < 7; i++) {
                if (list[i]) {
                    this.templeteNum[i].setAttribute('src', card.fold.number[list[i]]);
                    this.templeteNum[i].classList.remove(`${this.pfx}-hide`);
                } else {
                    this.templeteNum[i].classList.add(`${this.pfx}-hide`);
                }
            }
            this.templete.textHide.classList.remove(`${this.pfx}-show`);
        } else {
            // this.templete.textHide.classList.add(`${this.pfx}-show`);
            // this.templete.textHide.textContent = 'x ' + num;
        }
    }
    private textAnimate(ctime: number, step: number) {
        if (ctime < step + textWrap) {
            this.templete.wrap.classList.add(`${this.pfx}-animate`);
        } else {
            this.templete.wrap.classList.remove(`${this.pfx}-animate`);
        }
    }
    private tpl() {
        const wrap = `<div class="${this.pfx}-container">
        <div class="${this.pfx}-up-bg"><img class="${this.pfx}-up-bg-img" src=""></div>
        <div class="${this.pfx}-up-wrap">
            <div class="${this.pfx}-up-text">${this.text}</div>
            <div class="${this.pfx}-up-num">
                <div class="${this.pfx}-up-num-text"></div>
                <img class="${this.pfx}-up-num-x" src="">
                <img  class="${this.pfx}-up-num-img1" src="">
                <img  class="${this.pfx}-up-num-img2" src="">
                <img  class="${this.pfx}-up-num-img3" src="">
                <img  class="${this.pfx}-up-num-img4" src="">
                <img  class="${this.pfx}-up-num-img5" src="">
                <img  class="${this.pfx}-up-num-img6" src="">
                <img  class="${this.pfx}-up-num-img7" src="">
            </div>
        </div>
        <div class="${this.pfx}-up-fire"><img class="${this.pfx}-up-fire-img" src=""></div>
        </div>`;
        this.container.insertAdjacentHTML('beforeend', wrap);
        this.templete = {
            combo: <HTMLElement>document.querySelector(`.${this.pfx}-container`)!,
            wrap: <HTMLElement>document.querySelector(`.${this.pfx}-up-wrap`)!,
            num: <HTMLElement>document.querySelector(`.${this.pfx}-up-num`)!,
            numX: <HTMLElement>document.querySelector(`.${this.pfx}-up-num-x`)!,
            textHide: <HTMLElement>document.querySelector(`.${this.pfx}-up-num-text`)!,
            bg: <HTMLElement>document.querySelector(`.${this.pfx}-up-bg-img`)!,
            text: <HTMLElement>document.querySelector(`.${this.pfx}-up-text`)!,
            fire: <HTMLElement>document.querySelector(`.${this.pfx}-up-fire-img`)!,
        };
        this.templeteNum = [
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img7`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img6`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img5`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img4`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img3`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img2`)!,
            <HTMLElement>document.querySelector(`.${this.pfx}-up-num-img1`)!,
        ];
    }

    dispose() {
        this.pause();
        this.hide();
        this.container.removeChild(this.templete.combo);
    }
}
