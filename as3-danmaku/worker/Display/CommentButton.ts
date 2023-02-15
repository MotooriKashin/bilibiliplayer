import { __trace } from "../OOAPI";
import { IComment } from "../Player";
import { Runtime } from "../Runtime/Runtime";
import { MotionManager } from "./MotionManager";
import { UIComponent } from "./Sprite";

class CommentButton extends UIComponent {
    protected mM = new MotionManager(this);
    protected label = "";

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

    protected bindParent(params: IComment) {
        if (params.hasOwnProperty("parent")) {
            params["parent"]?.addChild(this);
        }
        if ('onclick' in params && typeof params.onclick === 'function') {
            this.addEventListener('click', params.onclick);
        }
    }

    initStyle(style: IComment) {
        if (typeof style === 'undefined' || style === null) {
            style = <any>{};
        }
        if ("lifeTime" in style) {
            this.mM.dur = <number>style["lifeTime"] * 1000;
        } else {
            this.mM.dur = 4000;
        }
        if (style.hasOwnProperty("text")) {
            this.label = style["text"];
        }
        if (style.hasOwnProperty("motionGroup")) {
            this.mM.initTweenGroup(style["motionGroup"] || [], this.mM.dur);
        } else if (style.hasOwnProperty("motion")) {
            this.mM.initTween(style["motion"]!, false);
        }
    }

    serialize() {
        const serialized = super.serialize();
        serialized["class"] = "Button";
        serialized["text"] = this.label;
        return serialized;
    }
}

export function createButton(params: IComment) {
    return new CommentButton(params);
}