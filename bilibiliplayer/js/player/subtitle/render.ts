import { ISubtitleItemInterface } from './manager';
import { IStyleInterface } from '.';
import { htmlEncode, colorFromInt } from '@shared/utils';

interface IRuleInterface {
    width: number; // 容器w
    height: number; // 容器h
    top: number; // 1级界限上
    bottom: number; // 1级界限下
    left: number; // 1级界限左
    right: number; // 1级界限右
    subtitleX: number;
    subtitleH: number; // 内容高度
    subtitleW: number; // 内容宽度
}
interface IRenderOptionsInterface {
    container: JQuery;
    width?: number;
    height?: number;
}

interface IPositionInterface {
    x: number;
    y: number;
}

class Render {
    private container: JQuery;
    private options: IRenderOptionsInterface;
    private positionStart!: IPositionInterface;
    private positionEnd!: IPositionInterface;
    private positionFix: IPositionInterface = {
        x: 0,
        y: 0,
    };
    scale!: number;
    element!: {
        [key: string]: JQuery;
    };
    style: IStyleInterface;
    fading: JQuery[] = [];
    moveRule!: IRuleInterface;
    changeTimer: any;
    mouseIsDown!: boolean;
    isCenter!: boolean; // 字幕是否为居中显示
    isFullscreen!: boolean; // 是否为全屏
    resizeTimer: any;
    isBottomCenter!: boolean;

    constructor(options: IRenderOptionsInterface) {
        this.options = options;
        this.container = this.options.container;
        this.style = {
            scale: true,
        };
        this.init();
    }

    init() {
        this.container.append(`
            <div class="subtitle-position subtitle-position-bc">
                <div class="subtitle-wrap">
                    <div class="subtitle-group"></div>
                    <div class="subtitle-group second"></div>
                </div>
            </div>`);
        this.element = {
            position: this.container.find('.subtitle-position'),
            wrap: this.container.find('.subtitle-wrap'),
            group: this.container.find('.subtitle-group'),
        };
        this.bindEvents();
        this.resizeFont();
    }

    draw(item: ISubtitleItemInterface, groupIndex = 0) {
        this.fading.forEach((item) => {
            item.remove();
        });
        const op = this.style.backgroundOpacity !== undefined ? this.style.backgroundOpacity : 1;
        item.ele = $(
            `<span class="subtitle-item-text" style="background: rgba(0,0,0,${op}); ${this.style.fade ? 'display: none;' : ''}"> ${htmlEncode(item.content) || ''}</span>`,
        );
        this.element.group.eq(groupIndex).append(item.ele);
        if (this.style.fade) {
            item.ele.fadeIn(200);
        }
        this.updateRule();
        clearTimeout(this.changeTimer);
        this.changeTimer =
            this.mouseIsDown &&
            window.setTimeout(() => {
                this.positionEnd = this.updatePosition({
                    x: this.positionEnd.x,
                    y: this.positionEnd.y,
                });
                this.move(this.positionEnd);
            }, 200);
    }

    clear(groupIndex = 0) {
        this.element.group.eq(groupIndex).html('');
    }

    wipe(sub: ISubtitleItemInterface, canFade?: boolean) {
        if (this.style.fade && canFade) {
            this.fading.push(sub.ele!);
            sub.ele!.fadeOut(200, () => {
                this.fading.splice(this.fading.indexOf(sub.ele!), 1);
                sub.ele!.remove();
            });
        } else {
            sub.ele!.remove();
        }
    }

    setStyle(options: IStyleInterface) {
        this.container.css({
            // @ts-ignore
            color: options.color !== undefined ? colorFromInt(options.color) : null,
            textShadow: options.textShadow,
        });

        // fontSize
        if (options.fontSize !== undefined) {
            this.style.fontSize = options.fontSize;
            this.resizeFont();
        }

        // background
        if (options.backgroundOpacity !== undefined) {
            this.style.backgroundOpacity = options.backgroundOpacity;
            this.container.find('.subtitle-item-text').css({
                background: `rgba(0,0,0,${options.backgroundOpacity})`,
            });
        }

        // position
        if (options.position) {
            this.isCenter = false;
            this.style.position = options.position;
            this.setPosition(this.style.position);
        }

        // bilingual
        if (options.bilingual !== undefined) {
            this.style.bilingual = options.bilingual;
        }

        // scale
        if (options.scale !== undefined) {
            this.style.scale = options.scale;
            this.resizeFont();
        }

        // fade
        if (options.fade !== undefined) {
            this.style.fade = options.fade;
        }
    }
    setPosition(position?: string) {
        this.element.position.removeAttr('style');
        this.element.position.removeClass(
            'subtitle-position-bl subtitle-position-bc subtitle-position-br subtitle-position-tl subtitle-position-tc subtitle-position-tr',
        );
        position && this.element.position.addClass(`subtitle-position-${position}`);
    }
    resizeFont() {
        let ratio = 1;
        const rect = this.container[0].getBoundingClientRect();
        if (this.style.scale) {
            ratio = rect.width / 1139;
        }
        if (this.style.fontSize) {
            ratio = ratio * this.style.fontSize;
        }
        this.element.group.eq(0).css({
            fontSize: 28 * ratio,
        });
        this.element.group.eq(1).css({
            fontSize: 20 * ratio,
        });
    }

    subtitleChange(force: boolean = false) {
        if (this.positionEnd && (this.isCenter || force)) {
            this.positionEnd = this.updatePosition({
                x: this.positionEnd.x,
                y: this.positionEnd.y,
            });
            this.move(this.positionEnd);
        }
    }
    updateScreen(isFullscreen: boolean) {
        this.isFullscreen = isFullscreen;
        this.resizePosition();
    }
    private resizePosition() {
        this.resizeTimer && clearTimeout(this.resizeTimer);
        this.resizeTimer = window.setTimeout(() => {
            this.updateRule();
            if (this.isBottomCenter) {
                this.setPosition('bc');
                this.element.position.removeClass('subtitle-position-changed');
            } else {
                this.subtitleChange();
            }
        }, 200);
    }
    private bindEvents() {
        const thumbMove = (e: MouseEvent) => {
            clearTimeout(this.changeTimer);
            this.positionEnd = this.updatePosition({
                x: e.clientX - this.positionStart.x + this.positionFix.x,
                y: e.clientY - this.positionStart.y + this.positionFix.y,
            });
            this.move(this.positionEnd);
        };

        const thumbUp = (e: MouseEvent) => {
            clearTimeout(this.changeTimer);
            this.positionFix = this.positionEnd;
            this.mouseIsDown = false;
            this.positionFix && this.mouseUp();
            document.removeEventListener('mouseup', thumbUp);
            document.removeEventListener('mousemove', thumbMove);
        };

        this.element.wrap[0].addEventListener('mousedown', (e: MouseEvent) => {
            if (e.button === 0) {
                this.mouseIsDown = true;
                this.positionStart = {
                    x: e.clientX,
                    y: e.clientY,
                };
                this.updateRule();
                this.mouseDown();
                this.updateRule();
                document.addEventListener('mousemove', thumbMove);
                document.addEventListener('mouseup', thumbUp);
            }
        });

        this.element.wrap[0].addEventListener('click', (e: MouseEvent) => {
            e.stopPropagation();
        });
    }

    private mouseUp() {
        const width = this.moveRule.width * 0.9;
        const height = this.moveRule.subtitleH;
        const left = this.moveRule.width * 0.25;
        const right = this.moveRule.width * 0.75;
        const bottom = this.moveRule.height * 0.75;
        const subtitleX = this.moveRule.subtitleX;
        const x = this.positionFix.x + width / 2;
        const y = this.positionFix.y + height / 2;
        const setBottom = (value: any) => {
            value['top'] = 'auto';
            value['bottom'] = 100 - ((this.positionFix.y + height) * 100) / this.moveRule.height + '%';
        };
        let value: Record<string, any> = {};
        this.isBottomCenter = false;
        if (x < left) {
            value = {
                transform: '',
                textAlign: 'left',
                left: ((this.positionFix.x + subtitleX) * 100) / this.moveRule.width + '%',
                top: (this.positionFix.y * 100) / this.moveRule.height + '%',
            };
            // 设置底对齐
            if (y > bottom) {
                setBottom(value);
            }
            this.isCenter = false;
        } else if (x > right) {
            value = {
                transform: '',
                textAlign: 'right',
                left: 'auto',
                right: 100 - ((x + this.moveRule.subtitleW / 2) * 100) / this.moveRule.width + '%',
                top: (this.positionFix.y * 100) / this.moveRule.height + '%',
            };
            // 设置底对齐
            if (y > bottom) {
                setBottom(value);
            }
            this.isCenter = false;
        } else {
            this.isCenter = true;
            // 设置底对齐
            if (y > bottom) {
                setBottom(value);
                value['left'] = this.positionFix.x;
                value['transform'] = '';
                this.isCenter = false;
                this.isBottomCenter = true;
            }
        }
        this.element.position.css(value);
    }
    private mouseDown() {
        const width = this.moveRule.width * 0.9;
        const subtitleW = this.moveRule.subtitleW;
        const subtitleX = this.moveRule.subtitleX;
        const position = this.element.position.position();
        this.positionFix = {
            x: position.left + subtitleW / 2 - width / 2 + subtitleX,
            y: position.top,
        };
        this.setPosition('changed');
        this.move(this.positionFix);
    }

    private move(position: IPositionInterface) {
        this.element.position.css({
            transform: `translate(${position.x}px, ${position.y}px)`,
        });
    }

    private updateRule() {
        const container = this.container[0].getBoundingClientRect();
        const wrap = this.element.wrap[0].getBoundingClientRect();
        const bottom = this.isFullscreen ? 54 : 44;
        this.moveRule = {
            width: container.width,
            height: container.height,
            top: container.height * 0.05,
            left: container.width * 0.05,
            bottom: container.height - bottom,
            right: container.width * 0.95,
            subtitleX: this.element.wrap.position().left,
            subtitleH: wrap.height,
            subtitleW: wrap.width,
        };
    }

    private updatePosition(positionEnd: IPositionInterface) {
        const rule = this.moveRule;
        // 左边越界
        if (positionEnd.x + rule.subtitleX < rule.left) {
            positionEnd.x = rule.left - rule.subtitleX;
        }
        // 右边越界
        if (positionEnd.x + rule.subtitleW + rule.subtitleX > rule.right) {
            positionEnd.x = rule.right - rule.subtitleW - rule.subtitleX;
        }
        // 上边越界
        if (positionEnd.y < rule.top) {
            positionEnd.y = rule.top;
        }
        // 下边越界
        if (positionEnd.y + rule.subtitleH > rule.bottom) {
            positionEnd.y = rule.bottom - rule.subtitleH;
        }
        return positionEnd;
    }

    resize() {
        this.resizeFont();
    }

    resetPosition() {
        this.positionFix = {
            x: 0,
            y: 0,
        };
        this.element.position.css({
            transform: '',
        });
        this.element.position.removeClass('subtitle-position-changed');
    }
}

export default Render;
