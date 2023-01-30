import { DisplayObject } from "./DisplayObject";
import { MotionManager } from "./MotionManager";

/**
 * Compliant CommentBitmap Polyfill For BiliScriptEngine
 */
export class CommentBitmap extends Bitmap {
    private _mM: MotionManager = new MotionManager(this);

    constructor(params: Object) {
        super('bitmapData' in params ? params['bitmapData'] : undefined);
        this.initStyle(params);
        Runtime.registerObject(this);
        this.bindParent(params);
        this._mM.play();
    }

    get motionManager(): MotionManager {
        return this._mM;
    }

    set motionManager(_m) {
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
        }
    }
}

export function createBitmap(params: Object): any {
    return new CommentBitmap(params);
}

export function createParticle(params: Object): any {
    __trace('Bitmap.createParticle not implemented', 'warn');
    return new CommentBitmap(params);
}

export function createBitmapData(width: number,
    height: number,
    transparent: boolean = true,
    fillColor: number = 0xffffffff): any {

    return new Display.BitmapData(width, height, transparent, fillColor);
}