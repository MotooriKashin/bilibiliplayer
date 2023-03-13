import { IMotion } from "./DisplayObject";
import { MotionManager } from "./MotionManager";
import { UIComponent } from "./Sprite";

export interface ICommentButtonStyle extends IMotion {
    text: string;
    onclick?: Function;
}
export class CommentButton extends UIComponent {
    protected class = 'Button';
    motionManager = new MotionManager(this);
    constructor(public __root: HTMLElement) {
        super(__root);
        this.DOM = document.createElement('div');
        this.DOM.classList.add('bpui-button', 'bpui-button-type-small');
        this.DOM.style.position = 'absolute';
        this.DOM.style.top = '0px';
        this.DOM.style.left = '0px';
        this.DOM.style.pointerEvents = 'auto';

        this.scaleX = 1;
        this.scaleY = 1;
        // Hook child
        __root.appendChild(this.DOM);
    }
    initStyle(style: ICommentButtonStyle) {
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
        } else {
            this.motionManager.dur = 4000;
        }
        if ('text' in style) {
            this.text = style["text"];
        }
        if ("motionGroup" in style) {
            this.motionManager.initTweenGroup(style["motionGroup"] || [], this.motionManager.dur);
        } else if ("motion" in style) {
            this.motionManager.initTween(style["motion"]!, false);
        }
        if (style.onclick) {
            this.addEventListener('click', style.onclick)
        }
    }
    remove() {
        try {
            this.motionManager.stop();
            this.parent?.removeChild(this);
        }
        catch { }
    }
    set text(text) {
        this.DOM.innerText = text.replace(/\/n/g, '\n');
    }
    get text() {
        return this.DOM.textContent!;
    }
}