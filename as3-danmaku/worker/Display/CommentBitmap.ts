import { __trace } from "../OOAPI";
import { IComment } from "../Player/player";
import { Runtime } from "../Runtime/Runtime";
import { Bitmap } from "./Bitmap";
import { MotionManager } from "./MotionManager";

export class CommentBitmap extends Bitmap {
    private _mM = new MotionManager(this);
    constructor(params: IComment) {
        super('bitmapData' in params ? params['bitmapData'] : undefined);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this._mM.play();
    }
    get motionManager() {
        return this._mM;
    }
    set motionManager(_m) {
        __trace("IComment.motionManager is read-only", "warn");
    }
    private bindParent(params: IComment) {
        if ("parent" in params) {
            params["parent"]?.addChild?.(this);
        }
    }
    initStyle(style: Object) {
        if (typeof style === 'undefined' || style === null) {
            style = {};
        }
        if ("lifeTime" in style) {
            this._mM.dur = <number>style["lifeTime"] * 1000;
        }
    }
}