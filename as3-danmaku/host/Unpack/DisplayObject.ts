import { debug } from "../../debug";
import { numberColor } from "../../worker/Utils";
import { ScriptingContext } from "../ScriptingContext";

interface Transformation {
    mode: '2d' | '3d';
    matrix: [number, number, number, number, number, number];
}
interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface Filter {
    type: string;
    params: Record<string, any>;
}
export abstract class DisplayObject {
    abstract DOM: HTMLElement | SVGSVGElement;
    protected _x!: number;
    protected _y!: number;
    protected _transform = <Transformation>{};
    protected _boundingBox = <Rectangle>{};
    protected _filters = <Filter[]>[];
    protected _name!: string;
    constructor(protected stage: HTMLElement, protected data: Record<string, any>, protected context: ScriptingContext) {
        data && (data.children = []);
    }
    unload() {
        try {
            this.DOM.remove();
        } catch (e) { };
    }
    set alpha(a) {
        this.DOM.style.opacity = a;
    }
    get alpha() {
        return this.DOM.style.opacity;
    }
    set x(x) {
        this._x = x;
        this.DOM.style.left = x + "px";
    }
    get x() {
        return this._x;
    }
    set y(y) {
        this._y = y;
        this.DOM.style.top = y + "px";
    }
    get y() {
        return this._y;
    }
    set boundingBox(r: Rectangle) {
        this._boundingBox = r;
        this.x = r.x;
        this.y = r.y;
        this.width = r.width;
        this.height = r.height;
    }
    get boundingBox() {
        return this._boundingBox;
    }
    /** End Transform Area **/
    set width(width) {
        this._boundingBox.width = width;
        this.DOM.style.width = width + "px";
    }
    get width() {
        return this._boundingBox.width;
    }
    set height(height) {
        this._boundingBox.height = height;
        this.DOM.style.height = height + "px";
    }
    get height() {
        return this._boundingBox.height;
    }
    set filters(filters: Filter[]) {
        this._filters = filters ?? [];
        const shadows: string[] = [];
        this._filters.forEach(d => {
            switch (d.type) {
                case 'blur': {
                    shadows.push([0, 0, Math.max(d.params.blurX, d.params.blurY) + "px"].join(" "));
                    break;
                }
                case 'glow': {
                    for (let i = 0; i < Math.min(2, d.params.strength); i++) {
                        shadows.push([0, 0, Math.max(d.params.blurX, d.params.blurY) + "px", numberColor(d.params.color)].join(" "));
                    }
                    break;
                }
            }
        });
        this.DOM.style.textShadow = shadows.join(",");
    }
    get filters() {
        return this._filters;
    }
    set transform(transformation) {
        this._transform = transformation;
        if (transformation.mode === '2d') {
            const rm = [
                transformation.matrix[0],
                transformation.matrix[3],
                transformation.matrix[1],
                transformation.matrix[4],
                transformation.matrix[2],
                transformation.matrix[5]
            ];
            this.DOM.style.transform = `matrix(${rm.join(',')})`;
        } else if (transformation.mode === '3d') {
            this.DOM.style.transform = `matrix3d(${transformation.matrix.join(',')})`;
        }
    }
    get transform() {
        return this._transform;
    }
    set visible(v) {
        this.DOM.style.visibility = v ? "visible" : "hidden";
    }
    get visible() {
        return this.DOM.style.visibility === "hidden" ? false : true;
    }
    set blendMode(f) {
        this.DOM.style.backgroundBlendMode = f;
        this.DOM.style.mixBlendMode = f;
    }
    get blendMode() {
        return this.DOM.style.backgroundBlendMode || this.DOM.style.mixBlendMode;
    }
    set name(name: string) {
        this._name = name;
    }
    get name() {
        return this._name;
    }
    protected addChild(childitem: any) {
        const child = this.context.getObject(childitem);
        this.data.children.push(child);
        if (!child)
            return;
        if (child.DOM) {
            if (child.getClass() === "Shape") {
                const tX = this._x + (this.stage.offsetWidth / 2), tY = this._y + (this.stage.offsetHeight / 2);
                child.offset(tX, tY);
                child.DOM.style.left = -tX + "px";
                child.DOM.style.top = -tY + "px";
            }
            this.DOM.appendChild(child.DOM);
        } else {
            this.context.invokeError("Sprite.addChild failed. Attempted to add non object", "err");
        }
    };
    protected removeChild(id: string) {
        const child = this.context.getObject(id);
        if (!child)
            return;
        try {
            child.DOM?.remove();
        } catch (e) {
            debug.error(e);
        }
    };
    protected removeChildren(ids: string[]) {
        ids.forEach(d => this.removeChild(d));
    }
    protected offset(x: number, y: number) { }
    getClass() {
        return 'DisplayObject';
    }
}