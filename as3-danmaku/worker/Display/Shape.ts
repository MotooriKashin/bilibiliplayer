import { DisplayObject } from "./DisplayObject";
import { Graphics } from "./Graphics";

export class Shape extends DisplayObject {
    private _graphics: Graphics;
    constructor() {
        super();
        this._graphics = new Graphics(this);
    }
    get graphics() {
        return this._graphics;
    }
    serialize() {
        var serialized = super.serialize();
        serialized['class'] = 'Shape';
        return serialized;
    }
}