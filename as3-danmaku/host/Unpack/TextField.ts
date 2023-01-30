import { ScriptingContext } from "../ScriptingContext";
import { DisplayObject } from "./DisplayObject";
import { color, createElement, sensibleDefaults } from "./Unpack";

interface Transform {
    mode: '2d' | '3d';
    matrix: [number, number, number, number, number, number];
}
export class TextField extends DisplayObject {
    DOM: HTMLDivElement;
    protected _transform: Transform;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        sensibleDefaults(data, {
            'text': '',
            'textFormat': {},
            'className': 'cmt'
        });
        this.DOM = createElement("div", {
            "style": {
                "position": "absolute",
                "opacity": data.alpha != null ? data.alpha : 1,
                "transformOrigin": "0 0 0"
            },
            "className": "cmt"
        });
        /** Load the text format **/
        this.setTextFormat(data['textFormat']);
        /** Load x,y **/
        this.setX(data.x);
        this.setY(data.y);
        this.DOM.appendChild(document.createTextNode(data['text']));
        // Hook child
        stage.appendChild(this.DOM);
    }
    protected setTextFormat(textFormat: Record<string, any>) {
        this.DOM.style.fontFamily = textFormat.font;
        this.DOM.style.fontSize = textFormat.size + "px";
        this.DOM.style.color = color(textFormat.color);
        if (textFormat.color <= 16) {
            this.DOM.style.textShadow = "0 0 1px #fff";
        };
        if (textFormat.bold)
            this.DOM.style.fontWeight = "bold";
        if (textFormat.underline)
            this.DOM.style.textDecoration = "underline";
        if (textFormat.italic)
            this.DOM.style.fontStyle = "italic";
        this.DOM.style.margin = textFormat.margin;
    }
    protected setX(x: number) {
        this.data.x = x;
        this.DOM.style.left = x + "px";
    }
    protected setY(y: number) {
        this.data.x = y;
        this.DOM.style.top = y + "px";
    }
    protected setAlpha(a: string) {
        this.data.alpha = a;
        this.DOM.style.opacity = a;
    }
    protected setText(text: string) {
        this.DOM.innerHTML = "";
        this.DOM.appendChild(document.createTextNode(text));
    }
    protected setFilters(params: any[]) {
        const shadows: any[] = [];
        params.forEach(d => {
            if (d.type === "blur") {
                shadows.push([0, 0, Math.max(
                    d.params.blurX, d.params.blurY) +
                    "px"].join(" "));
            } else if (d.type === "glow") {
                for (let i = 0; i < Math.min(2, d.params.strength); i++) {
                    shadows.push([0, 0, Math.max(
                        d.params.blurX, d.params.blurY) +
                        "px", color(d.params.color)].join(" "));
                }
            }
        });
        this.DOM.style.textShadow = shadows.join(",");
    }

    set alpha(a) {
        this.setAlpha(a);
    }
    get alpha(): string {
        return this.data.alpha;
    }
    set x(x) {
        this.setX(x);
    }
    get x(): number {
        return this.data.x;
    }
    set y(y) {
        this.setY(y);
    }
    get y(): number {
        return this.data.y;
    }
    set text(text) {
        this.setText(text)
    }
    get text() {
        return this.DOM.textContent!;
    }
    set filters(f) {
        this.setFilters(f);
    }
    get filters() {
        return this.DOM.style.textShadow.split(',');
    }
    set transform(f: Transform) {
        this._transform = f;
        if (f.mode === "2d") {
            const rm = [f.matrix[0], f.matrix[3], f.matrix[1], f.matrix[4], f.matrix[2], f.matrix[5]];
            this.DOM.style.transform = "matrix(" + (rm.join(",")) + ")";
        } else {
            this.DOM.style.transform = "matrix3d(" + (f.matrix.join(",")) + ")";
        }
    }
    get transform() {
        return this._transform;
    }
    getClass() {
        return 'TextField';
    }
}
