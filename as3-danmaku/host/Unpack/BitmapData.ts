import { ScriptingContext } from "../ScriptingContext";
import { Bitmap } from "./Bitmap";
import { DisplayObject } from "./DisplayObject";

export class BitmapData extends DisplayObject {
    DOM!: HTMLDivElement;
    protected _notifyList: Bitmap[] = [];
    protected _data: ImageData;
    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        this._data = new ImageData(data.width, data.height);
    }
    _fill(color: number) {
        const r = (color >> 16) & 0xff,
            g = (color >> 8) & 0xff,
            b = color & 0xff,
            a = (color >> 24) & 0xff;
        for (let y = 0; y < this._data.height; y++) {
            for (let x = 0; x < this._data.width; x++) {
                const i = 4 * (y * this._data.width + x);
                this._data.data[i] = r;
                this._data.data[i + 1] = g;
                this._data.data[i + 2] = b;
                this._data.data[i + 3] = a;
            }
        }
    }
    _registerNotify(bitmap: Bitmap) {
        if (this._notifyList.indexOf(bitmap) < 0) {
            this._notifyList.push(bitmap);
            // Also notify immediately
            bitmap._draw(this._data);
        }
    };
    _deregisterNotify(bitmap: Bitmap) {
        const index = this._notifyList.indexOf(bitmap);
        if (index >= 0) {
            this._notifyList.splice(index, 1);
        }
    };
    updateBox(update: any) {
        const box = update.box;
        for (let y = box.y; y < box.y + box.height; y++) {
            for (let x = box.x; x < box.x + box.width; x++) {
                // Unpack ARGB
                const color = update.values[y * box.width + x];
                const r = (color >> 16) & 0xff,
                    g = (color >> 8) & 0xff,
                    b = color & 0xff,
                    a = (color >> 24) & 0xff;
                const i = 4 * (y * this._data.width + x);
                this._data.data[i] = r;
                this._data.data[i + 1] = g;
                this._data.data[i + 2] = b;
                this._data.data[i + 3] = a;
            }
        }

        // Update all relevant images
        this._notifyList.forEach((image) => {
            image._draw(this._data);
        });
    };
    getClass() {
        return 'BitmapData';
    }
}