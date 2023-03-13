import { IMotion } from "./DisplayObject";
import { MotionManager } from "./MotionManager";
import { Sprite } from "./Sprite";

export class CommentCanvas extends Sprite {
    motionManager = new MotionManager(this);
    constructor(public __root: HTMLElement) {
        super(__root);
        this.motionManager.play();
    }
    initStyle(style: IMotion) {
        this.x = style.x;
        this.y = style.y;
        this.z = style.z;
        this.alpha = style.alpha;
        this.scaleX = this.scaleY = style.scale;
        this.mouseEnabled = false;
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