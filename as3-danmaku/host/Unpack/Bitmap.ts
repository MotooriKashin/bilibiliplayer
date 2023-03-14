import { ScriptingContext } from "../ScriptingContext";
import { createElement } from "../Utils";
import { BitmapData } from "./BitmapData";
import { DisplayObject } from "./DisplayObject";

export class Bitmap extends DisplayObject {
    DOM: HTMLCanvasElement;
    protected _bitmapDataId?: number;
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
    _draw(imageData: any) {
        this.DOM.setAttribute('width', imageData.width);
        this.DOM.setAttribute('height', imageData.height);
        const ctx = this.DOM.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);
    };
    setBitmapData(id: number) {
        const bitmapData = this.context.getObject<BitmapData>(<any>id);
        if (this._bitmapDataId) {
            this.context.getObject<BitmapData>(<any>this._bitmapDataId)._deregisterNotify(this);
        }
        bitmapData._registerNotify(this);
        this._bitmapDataId = id;
    };
    getClass() {
        return 'Bitmap';
    }
}