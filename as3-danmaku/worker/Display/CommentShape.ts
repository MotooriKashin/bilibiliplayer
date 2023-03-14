import { __trace } from "../OOAPI";
import { IComment } from "../Player/player";
import { Runtime } from "../Runtime/Runtime";
import { MotionManager } from "./MotionManager";
import { Shape } from "./Shape";

export class CommentShape extends Shape {
    protected _mM = new MotionManager(this);
    constructor(params: IComment) {
        super();
        this.setDefaults(params);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this._mM.play();
    }
    get motionManager() {
        return this._mM;
    }
    set motionManager(_m: MotionManager) {
        __trace("IComment.motionManager is read-only", "warn");
    }
    protected bindParent(params: IComment) {
        if (params.hasOwnProperty("parent")) {
            params["parent"]?.addChild?.(this);
        }
    }
    initStyle(style = <IComment>{}) {
        if (style["lifeTime"]) {
            this._mM.dur = style["lifeTime"] * 1000;
        }
        if (style.hasOwnProperty("motionGroup")) {
            this._mM.initTweenGroup(style["motionGroup"] || [], this._mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this._mM.initTween(style["motion"]!, false);
        }
    }
}