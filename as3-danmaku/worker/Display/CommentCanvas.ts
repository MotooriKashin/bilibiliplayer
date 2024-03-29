import { __trace } from "../OOAPI";
import { IComment } from "../Player/player";
import { Runtime } from "../Runtime/Runtime";
import { MotionManager } from "./MotionManager";
import { Sprite } from "./Sprite";

export class CommentCanvas extends Sprite {
    private mM: MotionManager = new MotionManager(this);
    constructor(params: IComment) {
        super();
        this.setDefaults(params);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this.mM.play();
    }
    get motionManager() {
        return this.mM;
    }
    set motionManager(_m: MotionManager) {
        __trace("IComment.motionManager is read-only", "warn");
    }
    private bindParent(params: IComment) {
        if (params.hasOwnProperty("parent")) {
            params["parent"]?.addChild?.(this);
        }
    }
    initStyle(style: IComment) {
        if (style["lifeTime"]) {
            this.mM.dur = style["lifeTime"] * 1000;
        }
        if (style.hasOwnProperty("motionGroup")) {
            this.mM.initTweenGroup(style["motionGroup"] || [], this.mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this.mM.initTween(style["motion"]!, false);
        }
    }
}