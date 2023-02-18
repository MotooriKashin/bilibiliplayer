import Utils from '../../common/utils';
import Render from './render';
import { imgObj, svgObj, loadSvg } from '../preload-img';

import ITextDataInterface from '../../interface/text_data';
import IDanmakuConfigExtInterface from '../../interface/danmaku_config_ext';
import ITextRenderInterface from '../../interface/text_render';

class CanvasRender extends Render {
    private startTime!: number;
    private liked!: boolean; // 点赞状态
    private canvas!: ITextRenderInterface;
    private headLeft = 0; // 点赞弹幕左侧偏移距离

    font!: string; // 字体
    text!: string;

    constructor(textData: ITextDataInterface, config: IDanmakuConfigExtInterface, precise = 0) {
        super(textData, config, precise);
        this.init();
    }

    init() {
        super.init();
        this.canvas = this.textRender(this.textData!, this.config!);
        this.element = this.canvas.bitmap;
    }
    space(time: number) {
        super.space(this.canvas.width, this.canvas.height, time);
    }

    /**
     * canvas 文本渲染器
     */
    textRender(textData: ITextDataInterface, config: IDanmakuConfigExtInterface) {
        const canvasFontArr = [
            [2, 3, 0, 0],
            [1, 3, 0, 0],
            [1, 2, 2, 2],
        ];
        const scaleRate = config.devicePR;
        const borderConfig = canvasFontArr[config.fontBorder];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        // 测量大小
        let headLeft = 0; // 头像弹幕左边空隙
        let headTop = 0; // 头像弹幕上边空隙
        let head2 = 2 * scaleRate; // 头像弹幕上边空隙
        let width = 0;
        let height = 0;
        let lineHeight = 1.125;
        let i: number;
        let chr: any[] = [];
        let arrWidth: any[] = [];
        config.fontFamily = config.fontFamily ? config.fontFamily : 'Microsoft YaHei';
        if (textData.text && !textData.canvas) {
            const size = textData.size * scaleRate * this.fontSizeScale(config);
            this.font = context.font = (config.bold ? 'bold' : 'normal') + ' ' + size + 'px ' + config.fontFamily;
            this.text = textData.text.replace(/(\/n|\\n|\n|\r\n)/g, '\n');
            const lines = this.text.split('\n');
            if (textData.vDanmaku) {
                chr = this.stringToArray(textData.text);
                arrWidth = [];
                let wid: number;
                let text: string;
                for (let i = 0; i < chr.length; i++) {
                    text = chr[i];
                    wid = context.measureText(text).width * lineHeight;
                    arrWidth.push(wid);
                    height += wid;
                }
                width = lines.length * size * lineHeight;
            } else {
                height = lines.length * size * lineHeight;
                for (i = 0; i < lines.length; i++) {
                    const w = context.measureText(lines[i]).width;
                    if (w > width) {
                        width = w;
                    }
                }
            }
            if (textData.headImg) {
                // 以25号字体为基准  padding: 4px 16px 3px (12+ h) + 2px
                const scale = size / 25;
                // const height = size * 1.125 + 7 * scale - 4;
                if (textData.vDanmaku) {
                    width += 7 * scale;
                    height += 28 * scale + width + head2;
                    headLeft = 12 * scale + width + head2;
                    headTop = head2 * scale;
                } else {
                    height += 7 * scale;
                    width += 28 * scale + height + head2;
                    headLeft = 12 * scale + height + head2;
                    headTop = head2;
                }
            }
            // 重新设置大小,上下文失效
            canvas.setAttribute('width', width + head2 + '');
            canvas.setAttribute('height', height + head2 + '');
            // 设置opacity
            context.globalAlpha = config.opacity;
            // 彩蛋绘制
            if (textData.picture) {
                const data: any = imgObj[textData.picture];
                if (data) {
                    height = size * 1.125;
                    width = (data.width * height) / data.height;
                    canvas.setAttribute('width', width + '');
                    canvas.setAttribute('height', height + '');

                    context.drawImage(data.img, 0, 0, width, height);

                    return {
                        width,
                        height,
                        bitmap: canvas,
                    };
                }
            }

            if (textData.headImg) {
                const data: any = imgObj[textData.headImg];
                if (data) {
                    const d = textData.vDanmaku ? width : height;
                    // 绘制背景
                    this.roundRect(context, 0, 0, width, height, d / 2);
                    context.fillStyle = 'rgba(0,0,0,0.5)';
                    context.fill();
                    // 绘制头像
                    this.circleImg(context, data.img, head2, head2, d / 2 - head2);
                    switch (textData.flag) {
                        case -2:
                            // 绘制up头标
                            this.roundRect(context, d / 2, head2, (d * 2) / 3, d / 3, d / 6);
                            context.fillStyle = '#00a1d6';
                            context.fill();
                            context.fillStyle = '#fff';
                            context.font = 'normal ' + size / 3 + 'px ' + config.fontFamily;
                            context.fillText('UP', (d * 5) / 6 - size / 4, head2 + d / 4);
                            break;
                        case 0:
                        case 1:
                            const iconl = d - head2 - 0.5 * size;
                            context.drawImage(svgObj[textData.flag], iconl, iconl, 0.5 * size, 0.5 * size);
                            break;

                        default:
                            break;
                    }
                }
            }
            // 消息中心跳转
            if (textData.likes) {
                const scale = size / 25;
                const num = String(textData.likes.num);
                if (textData.vDanmaku) {
                } else {
                    height += 10 * scale;
                    headLeft = 37 * scale + num.length * 12;
                    width += headLeft + 12 * scale;
                    headTop = head2;
                }
                // 重新设置大小,上下文失效
                canvas.setAttribute('width', String(width + 2));
                canvas.setAttribute('height', String(height + 2));

                context.strokeStyle = '#ffffff';
                context.strokeRect(0, 0, width, height);

                context.globalAlpha = 0.5;
                context.fillRect(0, 0, width, height);
                context.fillStyle = '#ffffff';
                context.fill();

                context.globalAlpha = config.opacity;
                context.drawImage(svgObj.like, 6 * scale, 6 * scale, size, size);
                context.font = 'normal ' + size / 2 + 'px ' + config.fontFamily;
                context.fillText(num, 30 * scale, 12 * scale);
            }
            // 已经点赞状态
            if (this.liked) {
                const scale = size / 25;
                height += 10 * scale;
                headLeft = 37 * scale;
                width += headLeft + 12 * scale;
                headTop = 0;
                // 重新设置大小,上下文失效
                canvas.setAttribute('width', String(width + 2));
                canvas.setAttribute('height', String(height + 2));

                context.globalAlpha = config.opacity;
                let x = 6 * scale + size * 0.1;
                let y = 6 * scale + size * 0.1;
                if (this.textData!.mode === 6) {
                    headLeft = 0;
                    x = width - size * 0.84 - x;
                }
                this.headLeft = headLeft;
                context.drawImage(svgObj.liked, x, y, size * 0.84, size * 0.84);
            }

            // 设置后字体失效
            context.font = (config.bold ? 'bold' : 'normal') + ' ' + size + 'px ' + config.fontFamily;
            // 开始绘制字体
            // 绘制边框
            if (textData.border) {
                context.strokeStyle = Utils.getHexColor(textData.borderColor!);
                context.strokeRect(0, 0, width, height);
            }
            // 预存设置阴影前的样式
            // context.save();
            // 绘制轮廓
            // 有阴影时不画,节省时间
            // 最佳模仿bilibili弹幕阴影
            context.strokeStyle = Utils.getHexColor(this.GetOutlineColor(textData));
            context.lineWidth = borderConfig[0];
            context.shadowBlur = borderConfig[1];
            // context.shadowOffsetX = borderConfig[2];
            // context.shadowOffsetY = borderConfig[3];
            context.shadowColor = Utils.getHexColor(this.GetOutlineColor(textData));
            for (i = 0; i < lines.length; i++) {
                if (i > 0) {
                    headTop = 0;
                }
                if (textData.vDanmaku) {
                    let x = borderConfig[2];
                    let y = (i + 1) * size * lineHeight + borderConfig[3];
                    this.textVertical(context, chr, arrWidth, x, y, width, false, headLeft);
                } else {
                    context.strokeText(
                        lines[i],
                        borderConfig[2] + headLeft,
                        (i + 1) * size + borderConfig[3] + headTop,
                    );
                }
            }

            // context.restore();
            // 绘制文本
            context.fillStyle = Utils.getHexColor(textData.color);

            for (i = 0; i < lines.length; i++) {
                if (i > 0) {
                    headTop = 0;
                }
                if (textData.vDanmaku) {
                    let x = 0;
                    let y = (i + 1) * size * lineHeight;
                    this.textVertical(context, chr, arrWidth, x, y, width, true, headLeft);
                } else {
                    context.fillText(lines[i], headLeft, (i + 1) * size + headTop);
                }
            }
        } else {
            if (textData.canvas && textData.canvas.length > 0) {
                let position = 0;
                for (let i = 0; i < textData.canvas.length; i++) {
                    let element = textData.canvas[i];
                    if (textData.vDanmaku) {
                        width = width > element.height ? width : element.height;
                        height = height + element.width;
                    } else {
                        width = width + element.width;
                        height = height > element.height ? height : element.height;
                    }
                }
                width += 2;
                height += 2;
                // 重新设置大小,上下文失效
                canvas.setAttribute('width', width + '');
                canvas.setAttribute('height', height + '');
                for (let i = 0; i < textData.canvas.length; i++) {
                    let ele = textData.canvas[i];
                    if (textData.vDanmaku) {
                        context.translate(ele.width / 2, position + ele.width / 2);
                        context.rotate(Math.PI / 2);
                        context.drawImage(ele.canvas, -ele.width / 2, -ele.height / 2, ele.width, ele.height);
                        context.setTransform(1, 0, 0, 1, 0, 0);
                    } else {
                        context.drawImage(ele.canvas, position, (height - ele.height) / 2, ele.width, ele.height);
                    }
                    position = position + ele.width + 2;
                }
            }
        }
        return {
            bitmap: canvas,
            width: width,
            height: height,
        };
    }

    mouseEnter() {
        this.isHover = true;
        this.pause(this._x, this._y);
    }
    mouseLeave() {
        this.isHover = false;
        this.pauseTime = Date.now();
    }
    likeNum(num: number, liked: boolean) {
        this.liked = liked;
        loadSvg('liked').then(() => {
            this.canvas = this.textRender(this.textData!, this.config!);
            this.element = this.canvas.bitmap;
        });
    }

    render(x: number, y: number, pauseRender?: boolean) {
        const c = (<any>this.parent).getContext('2d');
        const scaleRate = 1;
        let reverse = false;
        if (!this.startTime) {
            this.startTime = Date.now();
            this.pauseTime = Date.now();
        }
        if (this.paused && !pauseRender) {
            this.paused = false;
            this.pauseTime = Date.now();
            return true;
        }
        if (this.textData!.mode === 6) {
            reverse = true;
        }
        /**
         * canvas 绘制函数
         * @param canvas
         * @param x
         * @param y
         * @param config
         */
        try {
            if (this.element != null && this.element.style.visibility !== 'hidden') {
                if (this.textData!.vDanmaku) {
                    c.drawImage(
                        this.element,
                        this.vDistance - y - this.dHength,
                        reverse ? this.distance - x - this.dWidth || 0 : x,
                        (<any>this.element).width / scaleRate,
                        (<any>this.element).height / scaleRate,
                    );
                } else {
                    c.drawImage(
                        this.element,
                        reverse ? this.distance - x - this.dWidth || 0 : x - this.headLeft,
                        y,
                        (<any>this.element).width / scaleRate,
                        (<any>this.element).height / scaleRate,
                    );
                }
            }
        } catch (e) {
            console.warn(e);
        }
    }

    reset(x: number, y: number) {
        this.render(x, y);
    }

    pause(x: number, y: number) {
        if (this.paused) return;

        this.paused = true;
        if (this.pauseTime) {
            this.rest = this.rest - (Date.now() - this.pauseTime) / 1000;
        }
        this.pauseTime = Date.now();
        this.render(x, y, true);
    }

    textFree() {
        this.element && this.element.remove && this.element.remove();
    }

    stringToArray(str: string) {
        let i = 0;
        let arr = [];
        let codePoint;
        if (!(<any>String).fromCodePoint) {
            (<any>String).fromCodePoint = function fromCodePoint() {
                let chars = [];
                let point;
                let offset;
                let units;
                let i;
                for (i = 0; i < arguments.length; ++i) {
                    point = arguments[i];
                    offset = point - 0x10000;
                    units = point > 0xffff ? [0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff)] : [point];
                    chars.push(String.fromCharCode.apply(null, units));
                }
                return chars.join('');
            };
        }
        while (!isNaN((codePoint = this.knownCharCodeAt(str, i)))) {
            codePoint !== 65039 && arr.push((<any>String).fromCodePoint(codePoint));
            i++;
        }
        return arr;
    }

    private knownCharCodeAt(str: string, idx: number) {
        str += '';
        let code;
        let end = str.length;
        let surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
        while (surrogatePairs.exec(str) != null) {
            let li = surrogatePairs.lastIndex;
            if (li - 2 < idx) {
                idx++;
            } else {
                break;
            }
        }
        if (idx >= end || idx < 0) {
            return NaN;
        }
        code = str.charCodeAt(idx);
        let hi;
        let low;
        if (0xd800 <= code && code <= 0xdbff) {
            hi = code;
            low = str.charCodeAt(idx + 1);
            return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
        }
        return code;
    }

    private textVertical(
        context: any,
        chr: string[],
        arrWidth: number[],
        x: number,
        y: number,
        width: number,
        isfill: boolean,
        headLeft = 0,
    ) {
        const align = context.textAlign;
        const baseline = context.textBaseline;
        if (align === 'start' || align === 'left') {
            x = x + width / 2;
        } else if (align === 'end' || align === 'right') {
            x = x - width / 2;
        }
        if (baseline === 'bottom' || baseline === 'alphabetic' || baseline === 'ideographic') {
            y = y - arrWidth[0] / 2;
        } else if (baseline === 'top' || baseline === 'hanging') {
            y = y + arrWidth[0] / 2;
        }
        y += headLeft;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        for (let j = 0; j < chr.length; j++) {
            const letter = chr[j];
            const code = letter.charCodeAt(0);
            if (code <= 256) {
                if (j === 0) {
                    y = headLeft + arrWidth[j] / 2;
                }
                context.translate(x, y);
                context.rotate(Math.PI / 2);
                context.translate(-x, -y);
            }
            if (isfill) {
                context.fillText(letter, x, y);
            } else {
                context.strokeText(letter, x, y);
            }
            // 旋转坐标系还原成初始态
            context.setTransform(1, 0, 0, 1, 0, 0);
            y = y + (arrWidth[j] + arrWidth[j + 1]) / 2;
        }
        context.textAlign = align;
        context.textBaseline = baseline;
    }

    private circleImg(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, r: number) {
        const d = 2 * r;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        canvas.setAttribute('width', d + '');
        canvas.setAttribute('height', d + '');

        context.beginPath();
        context.arc(r, r, r, 0, 2 * Math.PI);
        context.clip();
        context.drawImage(img, 0, 0, d, d);

        ctx.drawImage(canvas, x, y);
    }
    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        const min_size = Math.min(w, h);
        if (r > min_size / 2) r = min_size / 2;
        // 开始绘制
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

export default CanvasRender;
