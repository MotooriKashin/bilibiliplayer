import { Runtime } from "../Runtime/Runtime";
import { BitmapData } from "./BitmapData";
import { DisplayObject } from "./DisplayObject";

export class Bitmap extends DisplayObject {
    constructor(protected bitmapData?: BitmapData) {
        super(Runtime.generateId('obj-bmp'));
    }
    get width() {
        return this.bitmapData ? this.bitmapData.width * this.scaleX : 0;
    }
    set width(w: number) {
        if (this.bitmapData && this.bitmapData.width > 0) {
            this.scaleX = w / this.bitmapData.width;
        }
    }
    get height() {
        return this.bitmapData ? this.bitmapData.height * this.scaleY : 0;
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