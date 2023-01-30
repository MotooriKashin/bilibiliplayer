import { DisplayObject } from "./DisplayObject";
import { Graphics } from "./Graphics";

/**
 * Shape Polyfill for AS3.
 * @author Jim Chen
 */
export class Shape extends DisplayObject {
    private _graphics: Graphics;

    constructor() {
        super();
        this._graphics = new Graphics(this);
    }

    get graphics(): Graphics {
        return this._graphics;
    }

    public serialize(): Object {
        var serialized: Object = super.serialize();
        serialized['class'] = 'Shape';
        return serialized;
    }
}