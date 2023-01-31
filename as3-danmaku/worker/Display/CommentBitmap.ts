import { __trace } from "../OOAPI";
import { IComment } from "../Player";
import { registerObject } from "../Runtime/Object";
import { Bitmap, BitmapData } from "./Bitmap";
import { Display } from "./Display";
import { DisplayObject } from "./DisplayObject";
import { MotionManager } from "./MotionManager";

export class CommentBitmap extends Bitmap {
    private _mM: MotionManager = new MotionManager(this);

    constructor(params: IComment) {
        super('bitmapData' in params ? params['bitmapData'] : undefined);
        this.initStyle(params);
        registerObject(this);
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
            params["parent"]?.addChild(this);
        }
    }

    public initStyle(style: Object) {
        if (typeof style === 'undefined' || style === null) {
            style = {};
        }
        if ("lifeTime" in style) {
            this._mM.dur = <number>style["lifeTime"] * 1000;
        }
    }
}

export function createBitmap(params: IComment) {
    return new CommentBitmap(params);
}

export function createParticle(params: IComment) {
    __trace('Bitmap.createParticle not implemented', 'warn');
    return new CommentBitmap(params);
}

export function createBitmapData(width: number,
    height: number,
    transparent = true,
    fillColor = 0xffffffff) {

    return new Display.BitmapData(width, height, transparent, fillColor);
}