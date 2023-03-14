import { __trace } from "../OOAPI";
import { IComment } from "../Player/player";
import { Runtime } from "../Runtime/Runtime";
import { MotionManager } from "./MotionManager";
import { TextField } from "./TextField";

export class CommentField extends TextField {
    protected mM = new MotionManager(this);
    constructor(text: string, params = <IComment>{}) {
        super(text, 0xffffff);
        this.setDefaults(params);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this.mM.play();
    }
    set fontsize(size: number) {
        var tf = this.getTextFormat();
        tf.size = size;
        this.setTextFormat(tf);
    }
    get fontsize() {
        return this.getTextFormat().size;
    }
    set font(fontname: string) {
        var tf = this.getTextFormat();
        tf.font = fontname;
        this.setTextFormat(tf);
    }
    get font() {
        return this.getTextFormat().font;
    }
    set align(a: string) {
        var tf = this.getTextFormat();
        tf.align = a;
        this.setTextFormat(tf);
    }
    get align() {
        return this.getTextFormat().align;
    }
    set bold(b: boolean) {
        var tf = this.getTextFormat();
        tf.bold = b;
        this.setTextFormat(tf);
    }
    get bold() {
        return this.getTextFormat().bold;
    }
    get motionManager() {
        return this.mM;
    }
    set motionManager(_m: MotionManager) {
        __trace("IComment.motionManager is read-only", "warn");
    }
    protected bindParent(params: IComment) {
        if (params.hasOwnProperty("parent")) {
            params["parent"]?.addChild?.(this);
        }
    }
    initStyle(style: any = {}) {
        if ("lifeTime" in style) {
            this.mM.dur = <number>style["lifeTime"] * 1000;
        }
        if ("fontsize" in style) {
            this.getTextFormat().size = style["fontsize"];
        }
        if ("font" in style) {
            this.getTextFormat().font = style["font"];
        }
        if ("color" in style) {
            this.getTextFormat().color = style["color"];
        }
        if ("bold" in style) {
            this.getTextFormat().bold = style["bold"];
        }
        if (style.hasOwnProperty("motionGroup")) {
            this.mM.initTweenGroup(style["motionGroup"] || [], this.mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this.mM.initTween(style["motion"]!, false);
        }
    }
}