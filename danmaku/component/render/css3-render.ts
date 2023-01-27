import Utils, { browserPrefix } from '../../common/utils';
import Render from './render';
import { imgObj } from '../preload-img';
import enterprise from '../../less/enterprise.svg';
import person from '../../less/person.svg';
import svg from '../svg';
import { ICycDiv } from '../manager/manager';

import ITextDataInterface from '../../interface/text_data';
import IDanmakuConfigExtInterface from '../../interface/danmaku_config_ext';
function htmlEncode(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2f;')
        .replace(/\n/g, '<br>');
}
const prefix = 'b-danmaku';
class CSS3Render extends Render {
    private liked!: boolean; // 是否已经点赞
    font!: string; // 字体
    text!: string;
    hided: boolean = false; // 已经隐藏（正在执行消失动画

    constructor(textData: ITextDataInterface, config: IDanmakuConfigExtInterface, precise = 0, recyclingDiv?: ICycDiv) {
        super(textData, config, precise, recyclingDiv);
        this.init();
    }

    init() {
        super.init();
        this.element = this.textRender(this.textData!, this.config!);
    }
    space(time: number) {
        const { width, height } = this.element!.getBoundingClientRect();
        super.space(width, height, time);
    }

    textRender(textData: ITextDataInterface, config: IDanmakuConfigExtInterface) {
        /**
         * Html document node 文本渲染器
         */
        let fontBorderArr: string[] = [];
        const color = Utils.getHexColor(this.GetOutlineColor(textData));
        fontBorderArr[0] =
            '1px 0 1px ' + color + ',0 1px 1px ' + color + ',0 -1px 1px ' + color + ',-1px 0 1px ' + color;
        fontBorderArr[1] = '0px 0px 1px ' + color + ',0 0 1px ' + color + ',0 0 1px ' + color;
        fontBorderArr[2] = '1px 1px 2px ' + color + ',0 0 1px ' + color;

        /**
         * 使用已回收DIV元素 或 新建DIV元素
         */
        let div: HTMLElement; // 已回收DIV元素 或 新建DIV元素
        let divAppendStatus = true; // 是否需要append状态
        let fontSize = 0;
        let text = this.text = textData.text.replace(/\r/g, '\r\n');

        if (this.recyclingDiv) {
            div = this.recyclingDiv.div;
            divAppendStatus = false;
            div.innerHTML = '';

            this.index2hover = this.recyclingDiv.index;
        } else {
            div = document.createElement('div');
            this.index2hover = Utils.getIndex();
        }
        let className = prefix;

        if (textData.divClassName) {
            className += ' ' + textData.divClassName;
        }

        let divCssText = '';
        if (text) {
            div.innerText = text;
        }

        this.font = (config.bold ? 'bold' : 'normal') + ' ' + fontSize * 2 + 'px ' + config.fontFamily;

        // 图片弹幕一视同仁
        // if (!textData.picture) {
        fontSize = textData.size * this.fontSizeScale(config);
        divCssText += `font-size: ${fontSize}px; `;
        divCssText += `color: ${Utils.getHexColor(textData.color)} ;`;
        divCssText += `font-family: ${config.fontFamily}, Arial, Helvetica, sans-serif; `;
        divCssText += `font-weight: ${config.bold ? 'bold' : 'normal'}; `;
        divCssText += `opacity: ${(config.opacity < 0.1 ? 0.1 : config.opacity) + ''}; `;
        divCssText += `text-shadow: ${fontBorderArr[config.fontBorder]}; `;
        // }

        if (textData.border) {
            divCssText += `border: 1px solid ${Utils.getHexColor(textData.borderColor!)}; `;
            divCssText += `padding-left: 1px; padding-right: 1px;`;
        }
        if (textData.vDanmaku) {
            if (textData.mode === 6) {
                // remove useless reflow, this.parent.offsetWidth -> this.config.width
                divCssText += `bottom: ${this.config!.height}px;`;
            } else {
                // remove useless reflow, this.parent.offsetWidth -> this.config.width
                divCssText += `top: ${this.config!.height}px;`;
            }
            divCssText += `-webkit-writing-mode:vertical-rl;-ms-writing-mode:tb-rl;writing-mode:tb-rl;writing-mode:vertical-rl;`;
        } else {
            if (textData.mode === 6) {
                // remove useless reflow, this.parent.offsetWidth -> this.config.width
                divCssText += `right: ${this.config!.width}px;`;
            } else {
                // remove useless reflow, this.parent.offsetWidth -> this.config.width
                divCssText += `left: ${this.config!.width}px;`;
            }
        }
        const scale = fontSize / 25;
        if (textData.headImg) {
            let icon = '';
            // 以25号字体为基准  padding: 4px 16px 3px (12+ h) + 2px
            className += ` ${prefix}-up`;
            // 头像的高度
            const height = fontSize * 1.125 + 7 * scale - 4;
            if (textData.vDanmaku) {
                divCssText += `padding: ${12 * scale + height + 2}px ${4 * scale}px ${16 * scale}px ${3 * scale
                    }px ; border-radius: ${(height + 4) / 2}px`;
            } else {
                divCssText += `padding: ${4 * scale}px ${16 * scale}px ${3 * scale}px ${12 * scale + height + 2
                    }px; border-radius: ${(height + 4) / 2}px`;
            }
            switch (textData.flag) {
                case -2:
                    icon = 'UP';
                    break;
                case 0:
                    icon = person;
                    break;
                case 1:
                    icon = enterprise;
                    break;

                default:
                    break;
            }
            div.innerHTML = `<span class="${prefix}-up-img" style="width:${height}px;height:${height}px"><img src="${textData.headImg
                }"></span><span class="${prefix}-up-tip ${textData.flag === -2 ? `${prefix}-up-text` : ''}" style="left:${height / 2 + 4
                }px;transform:scale(${fontSize / 40})">${icon}</span>${htmlEncode(textData.text)}`;
        }
        if (textData.likes) {
            className += ` ${prefix}-like`;
            let spanCss = `font-size:${fontSize / 2}px;`;
            if (fontSize < 24) {
                spanCss = `font-size:12px;margin:-${2 * scale}px 0 0 0;`;
                for (let i = 0; i < browserPrefix.length; i++) {
                    spanCss += `${browserPrefix[i]}transform: scale(${scale});`;
                }
            }
            let icon = `<span class="${prefix}-like-icon" style="width:${fontSize}px;height:${fontSize}px;">${svg.like}</span><span class="b-danmaku-like-num" style="${spanCss}">${textData.likes.num}</span>`;
            if (textData.mode === 6) {
                className += ` ${prefix}-like-reverse`;
                div.innerHTML = text + icon;
            } else {
                div.innerHTML = icon + text;
            }
        }
        if (textData.attr === 2 && !textData.vDanmaku) {
            className += ` ${prefix}-high`;
            let spanCss = `font-size:${fontSize / 2}px;`;
            if (fontSize < 24) {
                spanCss = `font-size:12px;`;
                for (let i = 0; i < browserPrefix.length; i++) {
                    spanCss += `${browserPrefix[i]}transform: scale(${scale});`;
                }
            }
            let icon = `<span class="${prefix}-high-icon" style="width:${18 * scale
                }px;height:${fontSize}px;"><em class="${prefix}-high-plus" style="${spanCss}">+1</em>${svg.liked}</span>`;
            let icon2 = '';
            let bg = `<span class="${prefix}-high-bg">${svg.dmhead}</span><span class="${prefix}-high-bg2">${svg.dmtail}</span>`;
            switch (textData.mode) {
                case 6:
                    className += ` ${prefix}-high-reverse`;
                    icon2 = icon;
                    icon = '';
                    break;
                case 4:
                case 5:
                    className += ` ${prefix}-high-top`;
                    bg = `<span class="${prefix}-high-top-bg">${svg.dmcenter}</span>`;
                    break;
                default:
                    break;
            }
            div.innerHTML = `${bg + icon}<span class="${prefix}-high-text">${text}</span>${icon2}`;
        }
        div.className = className;
        div.style.cssText = divCssText;

        if (textData.picture) {
            const data: any = imgObj[textData.picture];
            if (data) {
                // const scale = 0.3 * this.fontSizeScale(config);
                const height = fontSize * 1.125;
                const width = (data.width * height) / data.height;

                div.innerHTML = `<img src="${textData.picture}" style="width:${width}px;height:${height}px;">`;
                div.style.width = `${width}px`;
                div.style.height = `${height}px`;
            }
        }
        divAppendStatus && this.parent.appendChild(div);
        return div;
    }
    mouseEnter() {
        this.element!.classList.add('b-danmaku-hover');
        this.isHover = true;
        this.pause(this._x);
    }
    mouseLeave() {
        this.element?.classList.remove('b-danmaku-hover');
        this.isHover = false;
        this.pauseTime = Date.now();
        // this.render()
    }
    likeNum(num: number, liked: boolean) {
        if (liked) {
            if (this.liked || this.textData!.attr === 2) {
                setTimeout(() => {
                    this.element!.classList.add('b-danmaku-liked');
                }, 20);
                return;
            }
            this.liked = true;
            const fontSize = this.textData!.size * this.fontSizeScale(this.config!);
            let cssText = `width:${fontSize}px;height:${fontSize}px;`;
            if (this.textData!.mode === 6) {
                cssText += `right:0;margin:${fontSize * 0.06}px -${fontSize * 1.2}px 0 0 ;`;
            } else {
                cssText += `margin:${fontSize * 0.06}px 0 0 -${fontSize * 1.2}px;`;
            }
            this.element!.insertAdjacentHTML(
                'afterbegin',
                `<span class="b-danmaku-liked-icon" style="${cssText}">${svg.liked}</span>`,
            );
            setTimeout(() => {
                this.element!.classList.add('b-danmaku-liked');
            }, 20);
        } else {
            this.element!.classList.remove('b-danmaku-liked');
        }
    }

    // 每一帧执行一次
    render() {
        if (this.hided) {
            return;
        }
        if (this.paused && (this.textData!.mode === 1 || this.textData!.mode === 6) && !this.isHover) {
            this.paused = false;
            this.pauseTime = Date.now();
            this.renderStyle(this.textData!.mode === 6, this.distance + this.dWidth, this.rest);
        }
    }

    reset(x: number, y: number) {
        if (this.textData!.vDanmaku) {
            this.element!.style.right = y + 'px';
        } else {
            this.element!.style.top = y + 'px';
        }
    }
    // 首帧渲染位置
    firstFrame(y: number) {
        this.paused = true;
        if (this.textData!.vDanmaku) {
            this.element!.style.right = y + 'px';
        } else {
            this.element!.style.top = y + 'px';
        }
        if (this.textData!.mode === 4 || this.textData!.mode === 5) {
            this.element!.style.left = '50%';
            this.element!.style.marginLeft = -(this.width / 2) + 'px';
        }

        switch (this.textData!.mode) {
            case 1:
                if (this.textData!.vDanmaku) {
                    this.element!.style.top = this.distance + 'px';
                } else {
                    this.element!.style.left = this.distance + 'px';
                }
                this.renderStyle(false, 0, 0);
                break;
            case 6:
                if (this.textData!.vDanmaku) {
                    this.element!.style.bottom = this.distance + 'px';
                } else {
                    this.element!.style.right = this.distance + 'px';
                }
                this.renderStyle(true, 0, 0);
                break;
            default:
                break;
        }
    }

    hideAnimate() {
        this.hided = true;
        this.pause(this._x);
        setTimeout(() => {
            if (this.textData!.mode === 4 || this.textData!.mode === 5) {
                this.element!.style.cssText += `margin-left:${-(
                    this.width / 2 -
                    this.height
                )}px;opacity: 0;transition: all 0.35s linear;`;
            } else {
                this.renderAnimateStyle(this.textData!.mode === 6, this.distance - this._x - this.height, 0.35);
            }
            try {
                setTimeout(() => {
                    this.hide();
                    this.hided = false;
                }, 400);
            } catch (error) { }
        }, 1);
    }
    // 暂停
    pause(x: number) {
        if (this.paused) return;
        if (this.textData!.mode === 1 || this.textData!.mode === 6) {
            this.paused = true;
            if (this.pauseTime) {
                this.rest = this.rest - (Date.now() - this.pauseTime) / 1000;
            }
            this.pauseTime = Date.now();
            this.renderStyle(this.textData!.mode === 6, this.distance - x, 0);
        }
    }

    // 移除dom
    textFree() {
        try {
            // 现在添加到visualArray，是一个异步过程，可能，弹幕被清理了，才被添加进去
            this.parent.removeChild(this.element!);
        } catch (error) { }
    }
    private renderStyle(reverse: boolean, position: number, rest: number) {
        for (let i = 0; i < browserPrefix.length; i++) {
            this.element!.style.cssText += `${browserPrefix[i]}transform: translate${this.X}(${(reverse ? 1 : -1) * position
                }px) translate${this.Y}(0px) translateZ(0px);
            ${browserPrefix[i]}transition: ${browserPrefix[i]}transform ${rest}s linear;`;
        }
    }
    private renderAnimateStyle(reverse: boolean, position: number, rest: number) {
        let css = '';
        for (let i = 0; i < browserPrefix.length; i++) {
            css += `${browserPrefix[i]}transform: translateX(${(reverse ? 1 : -1) * position
                }px) translateY(0px) translateZ(0px);
            ${browserPrefix[i]}transition: all ${rest}s linear;`;
        }
        this.element!.style.cssText = `${this.element!.style.cssText}opacity: 0;${css}`;
    }
}

export default CSS3Render;
