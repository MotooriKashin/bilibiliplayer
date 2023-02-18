import { __trace } from "../OOAPI";
import { IComment } from "../Player";
import { Runtime } from "../Runtime/Runtime";
import { Bitmap } from "./Bitmap";
import { Display } from "./Display";
import { Rectangle } from "./DisplayObject";
import { MotionManager } from "./MotionManager";

export class CommentBitmap extends Bitmap {
    private _mM: MotionManager = new MotionManager(this);

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

    public initStyle(style: Object) {
        if (typeof style === 'undefined' || style === null) {
            style = {};
        }
        if ("lifeTime" in style) {
            this._mM.dur = <number>style["lifeTime"] * 1000;
        }
    }

    static createBitmap(params: IComment) {
        return createBitmap(params);
    }
    static createParticle(params: IComment) {
        return createParticle(params);
    }
    static createBitmapData(width: number, height: number, transparent?: boolean, fillColor?: number) {
        if (transparent === void 0) { transparent = true; }
        if (fillColor === void 0) { fillColor = 0xffffffff; }
        return createBitmapData(width, height, transparent, fillColor);
    }
    static createRectangle(x?: number, y?: number, width?: number, height?: number) {
        return new Rectangle(x, y, width, height);
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

