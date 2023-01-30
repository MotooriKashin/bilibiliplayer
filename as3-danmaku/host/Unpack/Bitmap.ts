import { ScriptingContext } from "../ScriptingContext";
import { DisplayObject } from "./DisplayObject";
import { createElement } from "./Unpack";

export class BitmapData extends DisplayObject {
    DOM: HTMLDivElement;
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
    updateBox(update: unknown) {
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
export class Bitmap extends DisplayObject {
    DOM: HTMLCanvasElement;
    protected _bitmapDataId: number;

    constructor(stage: HTMLElement, data: Record<string, any>, context: ScriptingContext) {
        super(stage, data, context);
        this.DOM = createElement('canvas', {
            'style': {
                'position': 'absolute',
                "top": data.y ? data.y + "px" : "0px",
                "left": data.x ? data.x + "px" : "0px",
                "transformOrigin": "0 0 0"
            }
        });
        // Set bitmap data
        if ('bitmapData' in data) {
            this.setBitmapData(data['bitmapData']);
        }
        // Hook DOM
        stage.appendChild(this.DOM);
    }
    _draw(imageData) {
        this.DOM.setAttribute('width', imageData.width);
        this.DOM.setAttribute('height', imageData.height);
        const ctx = this.DOM.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
    };
    setBitmapData(id: number) {
        const bitmapData: BitmapData = this.context.getObject(id);
        if (this._bitmapDataId !== null) {
            this.context.getObject(this._bitmapDataId)._deregisterNotify(this);
        }
        bitmapData._registerNotify(this);
        this._bitmapDataId = id;
    };
    getClass() {
        return 'Bitmap';
    }
}