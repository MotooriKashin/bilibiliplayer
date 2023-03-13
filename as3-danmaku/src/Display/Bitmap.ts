import { BitmapData } from "./BitmapData";
import { DisplayObject } from "./DisplayObject";

export class Bitmap extends DisplayObject {
    DOM: HTMLCanvasElement;
    constructor(public __root: HTMLElement,
        protected bitmapData?: BitmapData,
        public pixelSnapping = "auto",
        public smoothing = false) {
        super(__root);
        this.DOM = document.createElement('canvas');
        this.DOM.style.position = 'absolute';
        this.DOM.style.top = '0px';
        this.DOM.style.left = '0px';
        this.DOM.style.transformOrigin = '0 0 0';

        // Hook DOM
        __root.appendChild(this.DOM);
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
            bitmapData._registerNotify(this);
        }
    }
    _draw(imageData: ImageData) {
        this.DOM.setAttribute('width', <any>imageData.width);
        this.DOM.setAttribute('height', <any>imageData.height);
        const ctx = this.DOM.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
    };
}