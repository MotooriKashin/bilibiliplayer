import { debug } from "../../debug";
import { Bitmap } from "./Bitmap";
import { ByteArray } from "./ByteArray";
import { ColorTransform } from "./ColorTransform";
import { DisplayObject } from "./DisplayObject";
import { Matrix } from "./Matrix";
import { Rectangle } from "./Rectangle";

class DirtyArea {
    protected xBegin?: number;
    protected yBegin?: number;
    protected xEnd?: number;
    protected yEnd?: number;
    expand(x: number, y: number) {
        this.xBegin = this.xBegin === null ? x : Math.min(this.xBegin!, x);
        this.xEnd = this.xEnd === null ? x : Math.max(this.xEnd!, x);
        this.yBegin = this.yBegin === null ? y : Math.min(this.yBegin!, y);
        this.yEnd = this.xEnd === null ? y : Math.max(this.yEnd!, y);
    }
    asRect() {
        if (this.isEmpty()) {
            return new Rectangle(0, 0, 0, 0);
        }
        return new Rectangle(this.xBegin ?? 0,
            this.yBegin ?? 0,
            (this.xEnd! - this.xBegin!) ?? 0,
            (this.yEnd! - this.yBegin!) ?? 0);
    }
    isEmpty() {
        return this.xBegin ?? this.yBegin ?? this.xEnd ?? this.yEnd ?? true;
    }
    reset() {
        delete this.xBegin;
        delete this.xEnd;
        delete this.yBegin;
        delete this.yEnd;
    }
}
export class BitmapData extends DisplayObject {
    protected rect: Rectangle;
    protected locked = false;
    protected dirtyArea = new DirtyArea();
    protected byteArray: number[] = [];
    private _data: ImageData;
    protected _notifyList: Bitmap[] = [];
    constructor(
        public __root: HTMLElement,
        width: number,
        height: number,
        protected transparent = true,
        protected fillColor = 0xffffffff
    ) {
        super(__root);
        this.rect = new Rectangle(0, 0, width, height);
        this._data = new ImageData(width, height);
        this._fill();
    }
    protected _fill() {
        this.byteArray = [];
        for (let i = 0; i < this.rect.width * this.rect.height; i++) {
            this.byteArray.push(this.fillColor);
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
    protected _updateBoxP(changeRect?: Rectangle) {
        if (this.dirtyArea.isEmpty()) {
            // Don't update anything if nothing was changed
            return;
        }
        if (this.locked) {
            // Don't send updates if this is locked
            return;
        }
        const change = changeRect ?? this.dirtyArea.asRect();

        // Make sure we're not out-of-bounds
        if (!this.rect.containsRect(change)) {
            debug.error('BitmapData._updateBox box ' + change.toString() +
                ' out of bonunds ' + this.rect.toString());
            throw new Error('Rectangle provided was not within image bounds.');
        }
        // Extract the values
        const region: number[] = [];
        for (let i = 0; i < change.height; i++) {
            for (let j = 0; j < change.width; j++) {
                region.push(this.byteArray[(change.y + i) * this.rect.width +
                    change.x + j]!);
            }
        }
        this.updateBox(change, region);
        this.dirtyArea.reset();
    }
    protected updateBox(box: Rectangle, region: number[]) {
        for (let y = box.y; y < box.y + box.height; y++) {
            for (let x = box.x; x < box.x + box.width; x++) {
                // Unpack ARGB
                const color = region[y * box.width + x];
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
    }
    get height() {
        return this.rect.height;
    }
    get width() {
        return this.rect.width;
    }
    draw(source: DisplayObject | BitmapData,
        matrix?: Matrix,
        colorTransform?: ColorTransform,
        blendMode?: string,
        clipRect?: Rectangle,
        smoothing = false) {
        if (!(source instanceof BitmapData)) {
            debug.error('Drawing non BitmapData is not supported!');
            return;
        }
        if (matrix) {
            debug.warn('Matrix transforms not supported yet.');
        }
        if (colorTransform) {
            debug.warn('Color transforms not supported yet.');
        }
        if (blendMode && blendMode !== 'normal') {
            debug.warn('Blend mode [' + blendMode + '] not supported yet.');
        }
        if (smoothing !== false) {
            debug.warn('Smoothign not supported!');
        }
        this.lock();
        if (clipRect) {
            clipRect = new Rectangle(0, 0, source.width, source.height);
        }
        this.setPixels(clipRect!, source.getPixels(clipRect!));
        this.unlock();
    }
    getPixel(x: number, y: number) {
        return this.getPixel32(x, y) & 0x00ffffff;
    }
    getPixel32(x: number, y: number) {
        if (x >= this.rect.width || y >= this.rect.height ||
            x < 0 || y < 0) {
            throw new Error('Coordinates out of bounds');
        }
        try {
            return this.transparent ? this.byteArray[y * this.rect.width + x] :
                (this.byteArray[y * this.rect.width + x] & 0x00ffffff) + 0xff000000;
        } catch (e) {
            return this.fillColor;
        }
    }
    getPixels(rect: Rectangle) {
        if (typeof rect === 'undefined' || rect === null) {
            throw new Error('Expected a region to acquire pixels.');
        }
        if (rect.width === 0 || rect.height === 0) {
            return new ByteArray();
        }
        const region: ByteArray = new ByteArray();
        for (let i = 0; i < rect.height; i++) {
            this.byteArray.slice((rect.y + i) * this.rect.width + rect.x,
                (rect.y + i) * this.rect.width + rect.x + rect.width).forEach(function (v) {
                    region.push(v)
                });
        }
        return region;
    }
    setPixel(x: number, y: number, color: number) {
        // Force alpha channel to be full
        this.setPixel32(x, y, (color & 0x00ffffff) + 0xff000000);
    }
    setPixel32(x: number, y: number, color: number) {
        if (!this.transparent) {
            // Force alpha channel
            color = (color & 0x00ffffff) + 0xff000000;
        }
        this.byteArray[y * this.rect.width + x] = color;
        this.dirtyArea.expand(x, y);
        this._updateBoxP();
    }
    setPixels(rect: Rectangle, input: Array<number>) {
        if (rect.width === 0 || rect.height === 0) {
            return;
        }
        // Test if the input is correct length
        if (input.length !== rect.width * rect.height) {
            throw new Error('setPixels expected ' + (rect.width * rect.height) +
                ' pixels, but actually got ' + input.length);
        }
        if (!this.transparent) {
            input = input.map(function (color) {
                return (color & 0x00ffffff) + 0xff000000;
            });
        }
        for (let i = 0; i < rect.width; i++) {
            for (let j = 0; j < rect.height; j++) {
                this.byteArray[(rect.y + j) * this.width + (rect.x + i)] =
                    input[j * rect.width + i];
                this.dirtyArea.expand(i, j);
            }
        }
        this._updateBoxP();
    }
    getVector(rect: Rectangle): number[] {
        if (this.rect.equals(rect)) {
            return this.byteArray;
        }
        const vector: number[] = [];
        for (let j = rect.y; j < rect.y + rect.height; j++) {
            for (let i = rect.x; i < rect.x + rect.width; i++) {
                vector.push((<any>rect)[j * this.rect.width + i]);
            }
        }
        return vector;
    }
    lock() {
        this.locked = true;
    }
    unlock(changeRect?: Rectangle) {
        this.locked = false;
        if (!changeRect) {
            this._updateBoxP();
        } else {
            this._updateBoxP(changeRect);
        }
    }
    dispatchEvent(_event: string, _data?: any) {

    }
    get fill() {
        return this.fillColor;
    }
    clone() {
        const data = new BitmapData(this.__root, this.width, this.height,
            this.transparent, this.fillColor);
        data.byteArray = this.byteArray.slice(0);
        data._updateBoxP(data.rect);
        return data;
    }
}