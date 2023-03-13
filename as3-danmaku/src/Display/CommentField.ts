import { IMotion } from "./DisplayObject";
import { MotionManager } from "./MotionManager";
import { TextField } from "./TextField";
import { TextFormat } from "./TextFormat";

export interface ICommentFieldStyle extends IMotion {
    font: string;
    fontsize: number;
    color: number;
    bold: boolean;
}
export class CommentField extends TextField {
    protected class = 'CommentField';
    motionManager = new MotionManager(this);
    private _format!: TextFormat;
    private defaultTextFormat!: TextFormat;
    constructor(public __root: HTMLElement) {
        super(__root);
        this.motionManager.play();
    }
    initStyle(style: ICommentFieldStyle) {
        this.x = style.x;
        this.y = style.y;
        this.z = style.z;
        this.alpha = style.alpha;
        this.scaleX = this.scaleY = style.scale;
        const text = new TextFormat(style.font, style.fontsize, style.color, style.bold);
        this._format = text;
        this.defaultTextFormat = text;
        this.setTextFormat(text);

        if ("parent" in style) {
            style["parent"]?.addChild?.(this);
        }
        if ("lifeTime" in style) {
            this.motionManager.dur = <number>style["lifeTime"] * 1000;
        }
        if ("motionGroup" in style) {
            this.motionManager.initTweenGroup(style["motionGroup"] || [], this.motionManager.dur);
        } else if ("motion" in style) {
            this.motionManager.initTween(style["motion"]!, false);
        }
    }
    remove() {
        try {
            this.motionManager.stop();
            this.parent?.removeChild(this);
        }
        catch { }
    }
    get align() {
        return this._format.align;
    }
    set align(param1) {
        this._format.align = param1;
        this.setTextFormat(this._format);
    }
    get bold() {
        return this._format.bold;
    }
    set bold(param1) {
        this._format.bold = param1;
        this.setTextFormat(this._format);
    }
    get font() {
        return this._format.font;
    }
    set font(param1) {
        this._format.font = param1;
        this.setTextFormat(this._format);
    }
    get fontsize() {
        return this._format.size;
    }
    set fontsize(param1) {
        this._format.size = param1;
        this.setTextFormat(this._format);
    }
    get color() {
        return this._format.color;
    }
    set color(param1) {
        this._format.color = param1;
        this.setTextFormat(this._format);
    }
    get htmlText() {
        return super.text;
    }
    set htmlText(param1) {
        super.text = param1;
    }
}