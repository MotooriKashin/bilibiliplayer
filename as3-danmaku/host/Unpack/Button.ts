import { createElement } from "../../worker/Utils";
import { ScriptingContext } from "../ScriptingContext";
import { DisplayObject } from "./DisplayObject";

export class Button extends DisplayObject {
    DOM: HTMLDivElement;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        this.DOM = createElement("div", {
            "className": "bpui-button bpui-button-type-small",
            "style": {
                position: "absolute",
                top: data.y ? data.y + "px" : "0px",
                left: data.x ? data.x + "px" : "0px",
                "pointer-events": "auto",
                width: '60px'
            }
        });
        this.DOM.innerText = data.text.replace(/\/n/g, '\n');

        data.scaleX = 1;
        data.scaleY = 1;
        // Hook child
        stage.appendChild(this.DOM);
    }
    set alpha(a) {
        this.data.alpha = Math.min(Math.max(a, 0), 1);
        this.DOM.style.opacity = a;
    }
    get alpha() {
        return this.data.alpha ?? 1;
    }
    set scaleX(x) {
        if (x > 50)
            return;
        this.data.scaleX = x;
        for (let i = 0; i < this.DOM.children.length; i++) {
            (<HTMLElement>this.DOM.children[i]).style.transform = "scale(" + this.data.scaleX + "," + this.data.scaleY + ")";
        }
    }
    get scaleX() {
        return this.data.scaleX;
    }
    set scaleY(y) {
        if (y > 50)
            return;
        this.data.scaleY = y;
        for (let i = 0; i < this.DOM.children.length; i++) {
            (<HTMLElement>this.DOM.children[i]).style.transform = "scale(" + this.data.scaleX + "," + this.data.scaleY + ")";
        }
    }
    get scaleY() {
        return this.data.scaleY;
    }
    getClass() {
        return 'Button';
    }
}