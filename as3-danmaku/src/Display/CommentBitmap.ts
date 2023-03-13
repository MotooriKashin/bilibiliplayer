import { Bitmap } from "./Bitmap";
import { BitmapData } from "./BitmapData";
import { DisplayObject, IMotion } from "./DisplayObject";
import { MotionManager } from "./MotionManager";

export interface ICommentBitmapStyle extends IMotion {
    bitmapData: BitmapData;
    pixelSnapping?: string;
    smoothing?: boolean;
}
export interface IParticleStyle {
    obj: DisplayObject,
    radius?: number;
}
export class CommentBitmap extends Bitmap {
    motionManager = new MotionManager(this);
    constructor(public __root: HTMLElement,
        bitmapData?: BitmapData,
        public pixelSnapping = "auto",
        public smoothing = false) {
        super(__root, bitmapData);
        this.motionManager.play();
    }
    initStyle(style: ICommentBitmapStyle) {
        this.x = style.x;
        this.y = style.y;
        this.z = style.z;
        this.alpha = style.alpha;
        this.scaleX = this.scaleY = style.scale;
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
}