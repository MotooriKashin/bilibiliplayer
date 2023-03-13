import { numberColor } from "../utils";
import { DisplayObject } from "./DisplayObject";
import { TextFormat } from "./TextFormat";

export class TextField extends DisplayObject {
    DOM: HTMLDivElement;
    protected class = 'TextField';
    protected textFormat = new TextFormat('黑体', 25, 16777215);
    constructor(public __root: HTMLElement) {
        super(__root);
        this.DOM = document.createElement('div');
        this.DOM.style.position = 'absolute';
        this.DOM.style.transformOrigin = '0 0 0';

        this.setTextFormat(this.textFormat);
        __root.appendChild(this.DOM);
    }
    protected setTextFormat(textFormat: TextFormat) {
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
    set text(text) {
        this.DOM.innerText = text.replace(/\/n/g, '\n');
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
}