import { ScriptingContext } from "../ScriptingContext";
import { createElement } from "../Utils";
import { DisplayObject } from "./DisplayObject";

export class Sprite extends DisplayObject {
    DOM: HTMLDivElement;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        this.DOM = createElement("div", {
            "style": {
                "position": "absolute",
                "top": data.y ? data.y + "px" : "0px",
                "left": data.x ? data.x + "px" : "0px",
                "width": "100%",
                "height": "100%",
                "overflow": "visible",
                "transformOrigin": "0 0 0"
            }
        });

        data.scaleX = 1;
        data.scaleY = 1;
        data.children = [];

        stage.appendChild(this.DOM);
    }
    getClass() {
        return 'Sprite';
    }
}
export class SpriteRoot extends DisplayObject {
    DOM: HTMLDivElement;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        this.DOM = <HTMLDivElement>stage;
    }
    getClass() {
        return 'SpriteRoot';
    }
}