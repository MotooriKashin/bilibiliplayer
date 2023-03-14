import { debug } from "../../debug";
import { __schannel, __trace } from "../OOAPI";
import { Runtime } from "../Runtime/Runtime";
import { DisplayObject } from "./DisplayObject";
import { Graphics } from "./Graphics";
import { Point } from "./Point";

export class Sprite extends DisplayObject {
    private _graphics: Graphics;
    private _mouseEnabled = true;
    private _mousePosition = new Point(0, 0);
    private _useHandCursor = false;
    constructor(id?: string) {
        super(id);
        this._graphics = new Graphics(this);
    }
    get graphics() {
        return this._graphics;
    }
    set graphics(_g: Graphics) {
        __trace('Sprite.graphics is read-only.', 'warn');
    }
    get mouseEnabled() {
        return this._mouseEnabled;
    }
    set mouseEnabled(enabled) {
        this._mouseEnabled = enabled;
        this.propertyUpdate('mouseEnabled', enabled);
    }
    get useHandCursor(): boolean {
        return this._useHandCursor;
    }
    set useHandCursor(use: boolean) {
        this._useHandCursor = use;
        this.propertyUpdate('useHandCursor', use);
    }
    serialize() {
        const serialized = super.serialize();
        serialized['class'] = 'Sprite';
        return serialized;
    }
}
export class RootSprite extends Sprite {
    private _metaRoot: any;
    constructor() {
        super('__root');
        this._metaRoot = Runtime.getObject('__root');

        __schannel('__root', (obj: any) => {
            Object.assign(this._metaRoot, obj);
        })
    }
    get parent() {
        debug.warn('root sprite is faultiness!')
        return this._metaRoot;
    }
    addEventListener(eventName: string, listener: Function) {
        __trace('Listener[' + eventName + '] on root sprite inadvisible', 'warn');
        this._metaRoot.addEventListener(eventName, listener);
    }
    removeEventListener(eventName: string, listener: Function) {
        this._metaRoot.removeEventListener(eventName, listener, false);
    }
}
export class UIComponent extends Sprite {
    private _styles: Record<string, any> = {};
    constructor(id?: string) {
        super(id);
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
        __trace("UIComponent.setStyle not implemented", "warn");
        this._styles[styleProp] = value;
    }
    setFocus() {
        this.methodCall("setFocus", null);
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