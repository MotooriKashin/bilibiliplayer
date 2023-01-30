import { DisplayObject } from "./DisplayObject";
import { MotionManager } from "./MotionManager";
import { Shape } from "./Shape";

/**
 * Compliant CommentShape Polyfill For BiliScriptEngine
 */
class CommentShape extends Shape {
    private _mM: MotionManager = new MotionManager(this);

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
        if (style["lifeTime"]) {
            this._mM.dur = style["lifeTime"] * 1000;
        }
        if (style.hasOwnProperty("motionGroup")) {
            this._mM.initTweenGroup(style["motionGroup"], this._mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this._mM.initTween(style["motion"], false);
        }
    }

}

export function createShape(params: Object): any {
    return new CommentShape(params);
}