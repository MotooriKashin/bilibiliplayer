import { DisplayObject } from "./DisplayObject";
import { MotionManager } from "./MotionManager";
import { UIComponent } from "./Sprite";

/**
 * Compliant CommentButton Polyfill For BiliScriptEngine
 */
class CommentButton extends UIComponent {
    private _mM: MotionManager = new MotionManager(this);
    private _label: string = "";

    constructor(params: Object) {
        super();
        this.setDefaults(params);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this._mM.play();
    }

    get motionManager(): MotionManager {
        return this._mM;
    }

    set motionManager(_m: MotionManager) {
        __trace("IComment.motionManager is read-only", "warn");
    }

    private bindParent(params: Object): void {
        if (params.hasOwnProperty("parent")) {
            (<DisplayObject>params["parent"]).addChild(this);
        }
    }

    public initStyle(style: Object): void {
        if (typeof style === 'undefined' || style === null) {
            style = {};
        }
        if ("lifeTime" in style) {
            this._mM.dur = <number>style["lifeTime"] * 1000;
        } else {
            this._mM.dur = 4000;
        }
        if (style.hasOwnProperty("text")) {
            this._label = style["text"];
        }
        if (style.hasOwnProperty("motionGroup")) {
            this._mM.initTweenGroup(style["motionGroup"], this._mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this._mM.initTween(style["motion"], false);
        }
    }

    public serialize(): Object {
        var serialized: Object = super.serialize();
        serialized["class"] = "Button";
        serialized["text"] = this._label;
        return serialized;
    }
}

export function createButton(params: Object): any {
    return new CommentButton(params);
}