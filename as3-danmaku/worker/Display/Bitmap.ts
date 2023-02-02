import { __trace, __pchannel } from "../OOAPI";
import { Runtime } from "../Runtime/Runtime";
import { ByteArray } from "./ByteArray";
import { ColorTransform } from "./ColorTransform";
import { Rectangle, DisplayObject } from "./DisplayObject";
import { Matrix } from "./Matrix";

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
        return new Rectangle(this.xBegin,
            this.yBegin,
            this.xEnd! - this.xBegin!,
            this.yEnd! - this.yBegin!);
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

export class Bitmap extends DisplayObject {

    constructor(protected bitmapData?: BitmapData) {
        super(Runtime.generateId('obj-bmp'));
    }

    get width() {
        return this.bitmapData ? this.bitmapData.width * this.scaleX : 0;
    }

    get height() {
        return this.bitmapData ? this.bitmapData.height * this.scaleY : 0;
    }

    set width(w: number) {
        if (this.bitmapData && this.bitmapData.width > 0) {
            this.scaleX = w / this.bitmapData.width;
        }
    }

    set height(h: number) {
        if (this.bitmapData && this.bitmapData.height > 0) {
            this.scaleY = h / this.bitmapData.height;
        }
    }

    getBitmapData() {
        return this.bitmapData;
    }

    setBitmapData(bitmapData: BitmapData) {
        if (typeof bitmapData !== 'undefined') {
            this.bitmapData = bitmapData;
            // Propagate up
            this.methodCall('setBitmapData', bitmapData.getId());
        }
    }

    serialize() {
        const serialized = super.serialize();
        (<any>serialized)["class"] = 'Bitmap';
        if (this.bitmapData !== null) {
            (<any>serialized)["bitmapData"] = this.bitmapData?.getId();
        }
        return serialized;
    }
}


export class BitmapData {
    protected rect: Rectangle;
    protected locked = false;
    protected dirtyArea = new DirtyArea();
    protected byteArray: number[] = [];

    constructor(width: number,
        height: number,
        protected transparent = true,
        protected fillColor = 0xffffffff,
        protected id = Runtime.generateId('obj-bmp-data')) {

        this.rect = new Rectangle(0, 0, width, height);

        this._fill();

        // Register this
        Runtime.registerObject(this);
    }

    protected _fill() {
        this.byteArray = [];
        for (let i = 0; i < this.rect.width * this.rect.height; i++) {
            this.byteArray.push(this.fillColor);
        }
    }

    protected _updateBox(changeRect?: Rectangle) {
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
            __trace('BitmapData._updateBox box ' + change.toString() +
                ' out of bonunds ' + this.rect.toString(), 'err');
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
        this._methodCall('updateBox', {
            'box': change.serialize(),
            'values': region
        });
        this.dirtyArea.reset();
    }

    protected _methodCall(methodName: string, params: any) {
        __pchannel("Runtime:CallMethod", {
            "id": this.id,
            "method": methodName,
            "params": params
        });
    }

    get height() {
        return this.rect.height;
    }

    get width() {
        return this.rect.width;
    }

    set height(_height: number) {
        __trace('BitmapData.height is read-only', 'warn');
    }

    set width(_width: number) {
        __trace('BitmapData.height is read-only', 'warn');
    }

    draw(source: DisplayObject | BitmapData,
        matrix?: Matrix,
        colorTransform?: ColorTransform,
        blendMode?: string,
        clipRect?: Rectangle,
        smoothing = false) {
        if (!(source instanceof BitmapData)) {
            __trace('Drawing non BitmapData is not supported!', 'err');
            return;
        }
        if (matrix) {
            __trace('Matrix transforms not supported yet.', 'warn');
        }
        if (colorTransform) {
            __trace('Color transforms not supported yet.', 'warn');
        }
        if (blendMode && blendMode !== 'normal') {
            __trace('Blend mode [' + blendMode + '] not supported yet.', 'warn');
        }
        if (smoothing !== false) {
            __trace('Smoothign not supported!', 'warn');
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
        this._updateBox();
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
        this._updateBox();
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
            this._updateBox();
        } else {
            this._updateBox(changeRect);
        }
    }

    dispatchEvent(_event: string, _data?: any) {

    }

    getId() {
        return this.id;
    }

    serialize() {
        return {
            'class': 'BitmapData',
            'width': this.rect.width,
            'height': this.rect.height,
            'fill': this.fillColor
        };
    }

    unload() {
        this._methodCall('unload', undefined);
    }

    clone() {
        const data = new BitmapData(this.width, this.height,
            this.transparent, this.fillColor);
        data.byteArray = this.byteArray.slice(0);
        data._updateBox(data.rect);
        return data;
    }
}