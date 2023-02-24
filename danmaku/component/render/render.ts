import ITextDataInterface from '../../interface/text_data';
import IDanmakuConfigExtInterface from '../../interface/danmaku_config_ext';
import ITextRenderInterface from '../../interface/text_render';
import { IBaseModeInterface } from '../../interface/danmaku_mode';
import { ICycDiv } from '../manager/manager';

/**
 * 文本实例
 */
export abstract class Render {
    textData: ITextDataInterface | null;
    x: number;
    y: number;
    /* tslint:disable */
    _x!: number;
    _y!: number;
    /* tslint:enable */
    width: number;
    height: number;
    index: number;
    bottom: number;
    middle!: number;
    start: number;
    end: number;
    rest: number;
    pauseTime!: number;
    paused!: boolean;
    isHover!: boolean;

    manager?: IBaseModeInterface | null;

    protected parent: HTMLElement;
    config: IDanmakuConfigExtInterface | null;
    protected recyclingDiv: ICycDiv; // 回收DIV元素
    precise: number;

    element: HTMLElement | null;
    speed: number;
    distance!: number; // 运动距离 （会变
    wdistance!: number; // 运动距离 （会变
    vDistance!: number; // 垂直方向距离（相对于运方向）
    dWidth!: number; // 弹幕的长度
    dHength!: number; // 弹幕的垂直高度
    X!: string; // 运动方向 （x:水平方向， y:垂直方向）
    Y!: string; // 运动方向
    index2hover!: number; // 节点插入到页面的顺序
    stime!: number;

    /** 使用换行符排版的mode */
    protected special = false;

    constructor(textData: ITextDataInterface, config: IDanmakuConfigExtInterface, precise = 0, recyclingDiv?: ICycDiv) {
        this.textData = textData;
        this.config = config;
        this.width = 0;
        this.height = 0;
        this.element = null;

        this.start = 0;
        this.end = 0;

        this.speed = 0;
        this.rest = 0;

        this.x = 0;
        this.y = 0;
        this.bottom = 0;
        this.index = 0xffffff;
        this.precise = precise || 0;

        this.parent = this.config.container;

        this.recyclingDiv = recyclingDiv!;

        // 不要在基类中调用子类初始化方法！此时子类尚未初始化完成，已初始化属性可能重新变成未初始化！
        // 正确调用位置在请在子类（该子类不作为基类又派生其他子类）`super`方法之后。
        // this.init(); 
    }

    init() {
        // 普权弹幕提权。注释掉以允许换行空白字符排版
        // if (
        //     this.textData!.mode === 1 ||
        //     this.textData!.mode === 4 ||
        //     this.textData!.mode === 5 ||
        //     this.textData!.mode === 6
        // ) {
        //     if (!(<AnyObject>window)['String']['prototype']['trim']) {
        //         (<AnyObject>window)['String']['prototype']['trim'] = function () {
        //             return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        //         };
        //     }
        //     if (this.textData!.text) {
        //         this.textData!.text = (<any>this).textData!.text.trim();
        //     }
        // }
    }

    space(width: number, height: number, time: number) {
        this.width = width;
        this.height = height;
        if (this.textData!.vDanmaku) {
            // 因为有预渲染，为了避免字体阴影突出，把宽度加1
            this.distance = this.config!.height + 1;
            this.vDistance = this.config!.width;
            this.dWidth = height;
            this.dHength = width;
            this.X = 'Y';
            this.Y = 'X';
        } else {
            this.distance = this.config!.width + 1;
            this.vDistance = this.config!.height;
            this.dWidth = width;
            this.dHength = height;
            this.X = 'X';
            this.Y = 'Y';
        }

        this.wdistance = this.distance;
        this.start = time;

        if (this.textData!.mode === 1 || this.textData!.mode === 6) {
            this.getSpeed();
            this.distance -= this.precise * this.speed;
            this.rest = (this.distance + this.dWidth) / this.speed;
            this.end = this.start + this.rest * this.config!.videoSpeed;
            this.middle = this.start + (this.distance / this.speed) * this.config!.videoSpeed;
        } else {
            this.end = this.start + (this.textData!.duration || this.config!.duration) * this.config!.videoSpeed;
        }
    }

    GetOutlineColor(textData: ITextDataInterface) {
        return textData.color ? 0 : 0xffffff;
    }

    getSpeed() {
        this.speed =
            ((512 * this.config!.devicePR + this.dWidth) / (this.textData!.duration || this.config!.duration)) *
            this.config!.speedPlus *
            (this.config!.speedSync ? this.config!.videoSpeed : 1);
    }

    setY(y: number, index: number) {
        this.y = y;
        this.bottom = this.y + this.dHength;
        this.index = index;

        this.stime = Number('1' + y + this.bottom);
    }

    getX() {
        this.pauseTime = this.pauseTime || Date.now();
        return (
            this.distance -
            ((Date.now() - this.pauseTime + ((this.distance + this.dWidth) / this.speed - this.rest) * 1000) / 1000) *
            this.speed
        );
    }

    getRight() {
        return this.getX() + this.dWidth;
    }

    free(isRemoveRecycling?: boolean) {
        const isRecycling = this.config && this.config.isRecycling;
        const element = this.element!;

        if (isRecycling && !isRemoveRecycling && (this.textData!.mode === 1 || this.textData!.mode === 6)) {
            this.config = null;
            this.textData = null;
            return element;
        } else {
            this.config = null;
            this.textData = null;
            this.textFree();
            this.element = null;
        }
    }
    // 获取字体缩放比例
    fontSizeScale(config: IDanmakuConfigExtInterface) {
        return config.fontSize * (config.fullScreenSync ? this.parent.getBoundingClientRect().height / 440 : 1);
    }

    hide() {
        this.element!.style.visibility = 'hidden';
    }

    show() {
        this.element!.style.visibility = '';
    }
    firstFrame(y: number) { }
    hideAnimate() { }

    abstract textRender(
        textData: ITextDataInterface,
        config: IDanmakuConfigExtInterface,
    ): ITextRenderInterface | HTMLElement;

    abstract render(x: number, y: number, pauseRender?: boolean): void;

    abstract likeNum(num: number, liked: boolean): void;
    abstract mouseEnter(): void;
    abstract mouseLeave(): void;
    abstract reset(x: number, y: number, time: number): void;

    abstract pause(x: number, y: number, time: number): void;

    abstract textFree(): void;
}

export default Render;
