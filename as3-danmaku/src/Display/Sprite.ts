import { debug } from "../../debug";
import { DisplayObject } from "./DisplayObject"
import { Graphics } from "./Graphics";
import { Point } from "./Point";

export class Sprite extends DisplayObject {
    protected class = 'Sprite';
    mask: unknown;
    protected _graphics = new Graphics(this);
    protected _mouseEnabled = true;
    protected _mousePosition = new Point(0, 0);
    protected _useHandCursor = false;
    protected buttonMode = false;
    DOM: HTMLDivElement;
    constructor(public __root: HTMLElement) {
        super(__root);
        this.DOM = document.createElement('div');
        this.DOM.style.position = 'absolute';
        this.DOM.style.top = '0px';
        this.DOM.style.left = '0px';
        this.DOM.style.width = '100%';
        this.DOM.style.height = '100%';
        this.DOM.style.overflow = 'visible';
        this.DOM.style.transformOrigin = '0 0 0';

        __root.appendChild(this.DOM);
    }
    get graphics() {
        return this._graphics;
    }
    get mouseEnabled() {
        return this._mouseEnabled;
    }
    set mouseEnabled(enabled) {
        this._mouseEnabled = enabled;
        // TODO: this.propertyUpdate('mouseEnabled', enabled);
    }
    get useHandCursor() {
        return this._useHandCursor;
    }
    set useHandCursor(use: boolean) {
        this._useHandCursor = use;
        // TODO: this.propertyUpdate('useHandCursor', use);
    }
}
export class RootSprite extends Sprite {
    protected class = 'RootSprite';
    constructor(public __root: HTMLElement) {
        super(__root);
        this.DOM = <HTMLDivElement>__root;
    }
    get parent() {
        debug.warn('root sprite is faultiness!')
        return this;
    }
}
export class UIComponent extends Sprite {
    protected class = 'UIComponent';
    protected _styles: Record<string, any> = {};
    constructor(public __root: HTMLElement) {
        super(__root);
    }
    /**
     * Clears the style for the UIComponent which this is
     * @param style - style to clear
     */
    clearStyle(style: string) {
        delete this._styles[style];
    }
    /**
     * Get the style for the UIComponent which this is
     * @param style - style to set
     * @return value - value of that style
     */
    getStyle(style: string) {
        return this._styles[style];
    }
    /**
     * Set the style for the UIComponent which this is
     * @param styleProp - style to set
     * @param value - value to set the style to
     */
    setStyle(styleProp: string, value: any) {
        debug.warn("UIComponent.setStyle not implemented");
        this._styles[styleProp] = value;
    }
    setFocus() {
        // TODO: this.methodCall("setFocus", null);
    }
    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
    move(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}