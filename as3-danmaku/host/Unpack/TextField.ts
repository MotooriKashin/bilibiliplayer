import { createElement, extend, numberColor } from "../../worker/Utils";
import { ScriptingContext } from "../ScriptingContext";
import { DisplayObject } from "./DisplayObject";

export class TextField extends DisplayObject {
    DOM: HTMLDivElement;
    private textFormat: Record<string, any>;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        extend(data, {
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
        this.setTextFormat(this.textFormat = data['textFormat']);
        /** Load x,y **/
        this.x = data.x;
        this.y = data.y;
        this.text = data.text;
        // Hook child
        stage.appendChild(this.DOM);
    }
    protected setTextFormat(textFormat: Record<string, any>) {
        this.DOM.style.fontFamily = textFormat.font;
        this.DOM.style.fontSize = textFormat.size + "px";
        this.DOM.style.color = numberColor(textFormat.color);
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
    protected setText(text: string) {
        this.DOM.innerHTML = "";
        this.DOM.innerText = text.replace(/\/n/g, '\n');
    }
    set text(text) {
        this.setText(text)
    }
    get text() {
        return this.DOM.textContent!;
    }
    get length() {
        return this.text.length;
    }
    get htmlText() {
        return this.text;
    }
    set htmlText(text: string) {
        this.text = text.replace(/<\/?[^>]+(>|$)/g, '');
    }
    get textWidth() {
        return this.DOM.style.width;
    }
    get textHeight() {
        return this.DOM.style.height;
    }
    get color() {
        return this.textFormat.color;
    }
    set color(c: number) {
        this.textFormat.color = c;
        this.setTextFormat(this.textFormat);
    }
    protected _background = false;
    get background() {
        return this._background;
    }
    set background(enabled: boolean) {
        this._background = enabled;
    }
    protected _backgroundColor!: number;
    get backgroundColor() {
        return this._backgroundColor;
    }
    set backgroundColor(color: number) {
        this._backgroundColor = color;
        this.DOM.style.backgroundColor = numberColor(color);
    }
    protected _border = false;
    get border() {
        return this._border;
    }
    set border(enabled: boolean) {
        this._border = enabled;
    }
    protected _borderColor!: number;
    get borderColor() {
        return this._borderColor;
    }
    set borderColor(color: number) {
        this._borderColor = color;
        this.DOM.style.borderColor = numberColor(color);
    }
    appendText(t: string) {
        this.text += t;
    }
    getClass() {
        return 'TextField';
    }
}