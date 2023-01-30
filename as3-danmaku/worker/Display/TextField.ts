import { DisplayObject } from "./DisplayObject";

/**
 * TextFormat polyfill for AS3
 * @author Jim Chen
 */
class TextFormat {
    public font: string;
    public size: number;
    public color: number;
    public bold: boolean;
    public italic: boolean;
    public underline: boolean;

    constructor(font: string = "SimHei",
        size: number = 25,
        color: number = 0xFFFFFF,
        bold: boolean = false,
        italic: boolean = false,
        underline: boolean = false,
        _url: string = "",
        _target: string = "",
        _align: string = "left",
        _leftMargin: number = 0,
        _rightMargin: number = 0,
        _indent: number = 0,
        _leading: number = 0) {

        this.font = font;
        this.size = size;
        this.color = color;
        this.bold = bold;
        this.italic = italic;
        this.underline = underline;
    }

    public serialize(): Object {
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

/**
 * TextField Polyfill for AS3.
 * @author Jim Chen
 */
export class TextField extends DisplayObject {
    private _text: string;
    private _textFormat: TextFormat;
    private _background: boolean = false;
    private _backgroundColor: number = 0xffffff;
    private _border: boolean = false;
    private _borderColor: number = 0;

    constructor(text: string = "", color: number = 0) {
        super(Runtime.generateId('obj-textfield'));
        this._text = text;
        this._textFormat = new TextFormat();
        this._textFormat.color = color;
        this.boundingBox.width = this.textWidth;
        this.boundingBox.height = this.textHeight;
    }

    get text(): string {
        return this._text;
    }

    set text(t: string) {
        this._text = t;
        this.boundingBox.width = this.textWidth;
        this.boundingBox.height = this.textHeight;
        this.propertyUpdate("text", this._text);
    }

    get length(): number {
        return this.text.length;
    }

    set length(_l: number) {
        __trace("TextField.length is read-only.", "warn");
    }

    get htmlText(): string {
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

    get textWidth(): number {
        /** TODO: Fix this to actually calculate the width **/
        return this._text.length * this._textFormat.size;
    }

    get textHeight(): number {
        /** TODO: Fix this to actually calculate the height **/
        return this._textFormat.size;
    }

    get color(): number {
        return this._textFormat.color;
    }

    set color(c: number) {
        this._textFormat.color = c;
        this.setTextFormat(this._textFormat);
    }

    get background(): boolean {
        return this._background;
    }

    set background(enabled: boolean) {
        this._background = enabled;
        this.propertyUpdate("background", enabled);
    }

    get backgroundColor(): number {
        return this._backgroundColor;
    }

    set backgroundColor(color: number) {
        this._backgroundColor = color;
        this.propertyUpdate("backgroundColor", color);
    }

    get border(): boolean {
        return this._border;
    }

    set border(enabled: boolean) {
        this._border = enabled;
        this.propertyUpdate('border', enabled);
    }

    get borderColor(): number {
        return this._borderColor;
    }

    set borderColor(color: number) {
        this._borderColor = color;
        this.propertyUpdate('borderColor', color);
    }

    public getTextFormat(): any {
        return this._textFormat;
    }

    public setTextFormat(tf: any) {
        this._textFormat = <TextFormat>tf;
        this.methodCall("setTextFormat", tf.serialize());
    }

    public appendText(t: string): void {
        this.text = this.text + t;
    }

    public serialize(): Object {
        var serialized: Object = super.serialize();
        serialized["class"] = "TextField";
        serialized["text"] = this._text;
        serialized["textFormat"] = this._textFormat.serialize();
        return serialized;
    }
}

export function createTextFormat(): any {
    return new TextFormat();
}