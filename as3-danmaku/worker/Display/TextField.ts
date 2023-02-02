import { __trace } from "../OOAPI";
import { Runtime } from "../Runtime/Runtime";
import { DisplayObject } from "./DisplayObject";

class TextFormat {
    align!: string;
    fontsize!: number;
    constructor(public font = "SimHei",
        public size = 25,
        public color = 0xFFFFFF,
        public bold = false,
        public italic = false,
        public underline = false,
        _url = "",
        _target = "",
        _align = "left",
        _leftMargin = 0,
        _rightMargin = 0,
        _indent = 0,
        _leading = 0) { }

    serialize(): Object {
        return {
            "class": "TextFormat",
            "font": this.font,
            "size": this.size,
            "color": this.color,
            "bold": this.bold,
            "underline": this.underline,
            "italic": this.italic
        };
    }
}


export class TextField extends DisplayObject {
    private _textFormat = new TextFormat();
    private _background = false;
    private _backgroundColor = 0xffffff;
    private _border = false;
    private _borderColor = 0;

    constructor(private _text = "", color = 0) {
        super(Runtime.generateId('obj-textfield'));
        this._textFormat.color = color;
        this.boundingBox.width = this.textWidth;
        this.boundingBox.height = this.textHeight;
    }

    get text() {
        return this._text;
    }

    set text(t: string) {
        this._text = t;
        this.boundingBox.width = this.textWidth;
        this.boundingBox.height = this.textHeight;
        this.propertyUpdate("text", this._text);
    }

    get length() {
        return this.text.length;
    }

    set length(_l: number) {
        __trace("TextField.length is read-only.", "warn");
    }

    get htmlText() {
        return this.text;
    }

    set htmlText(text: string) {
        __trace("TextField.htmlText is restricted due to security policy.", "warn");
        this.text = text.replace(/<\/?[^>]+(>|$)/g, '');
    }

    set textWidth(_w: number) {
        __trace("TextField.textWidth is read-only", "warn");
    }

    set textHeight(_h: number) {
        __trace("TextField.textHeight is read-only", "warn");
    }

    get textWidth() {
        /** TODO: Fix this to actually calculate the width **/
        return this._text.length * this._textFormat.size;
    }

    get textHeight() {
        /** TODO: Fix this to actually calculate the height **/
        return this._textFormat.size;
    }

    get color() {
        return this._textFormat.color;
    }

    set color(c: number) {
        this._textFormat.color = c;
        this.setTextFormat(this._textFormat);
    }

    get background() {
        return this._background;
    }

    set background(enabled: boolean) {
        this._background = enabled;
        this.propertyUpdate("background", enabled);
    }

    get backgroundColor() {
        return this._backgroundColor;
    }

    set backgroundColor(color: number) {
        this._backgroundColor = color;
        this.propertyUpdate("backgroundColor", color);
    }

    get border() {
        return this._border;
    }

    set border(enabled: boolean) {
        this._border = enabled;
        this.propertyUpdate('border', enabled);
    }

    get borderColor() {
        return this._borderColor;
    }

    set borderColor(color: number) {
        this._borderColor = color;
        this.propertyUpdate('borderColor', color);
    }

    getTextFormat() {
        return this._textFormat;
    }

    setTextFormat(tf: TextFormat) {
        this._textFormat = tf;
        this.methodCall("setTextFormat", tf.serialize());
    }

    appendText(t: string) {
        this.text = this.text + t;
    }

    serialize() {
        const serialized = super.serialize();
        serialized["class"] = "TextField";
        serialized["text"] = this._text;
        serialized["textFormat"] = this._textFormat.serialize();
        return serialized;
    }
}

export function createTextFormat() {
    return new TextFormat();
}