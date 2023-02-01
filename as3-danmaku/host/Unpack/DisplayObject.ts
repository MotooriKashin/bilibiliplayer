import { ScriptingContext } from "../ScriptingContext";

interface Transformation {
    mode: '2d' | '3d';
    matrix: [number, number, number, number, number, number];
}
export abstract class DisplayObject {
    abstract DOM: HTMLDivElement | SVGSVGElement | HTMLCanvasElement;
    protected _x!: number;
    protected _y!: number;
    protected _transform = <Transformation>{};
    constructor(protected stage: HTMLElement, protected data: Record<string, any>, protected context: ScriptingContext) { }
    unload() {
        try {
            this.stage.removeChild(this.DOM);
        } catch (e) { };
    }
    set visible(v) {
        this.DOM.style.visibility = v ? "visible" : "hidden";
    }
    get visible() {
        return this.DOM.style.visibility === "hidden" ? false : true;
    }
    set alpha(a) {
        this.DOM.style.opacity = a;
    }
    get alpha() {
        return this.DOM.style.opacity;
    }
    set x(x) {
        this._x = x;
        this.setX(x);
    }
    get x() {
        return this._x;
    }
    set y(y) {
        this._y = y;
        this.setY(y);
    }
    get y() {
        return this._y;
    }
    set blendMode(f) {
        this.DOM.style.backgroundBlendMode = f;
        this.DOM.style.mixBlendMode = f;
    }
    get blendMode() {
        return this.DOM.style.backgroundBlendMode || this.DOM.style.mixBlendMode;
    }
    set transform(transformation) {
        this._transform = transformation;
        if (transformation.mode === '2d') {
            const rm = [transformation.matrix[0], transformation.matrix[3], transformation.matrix[1], transformation.matrix[4], transformation.matrix[2], transformation.matrix[5]];
            this.DOM.style.transform = "matrix(1,0,0,1,0,0)";
        } else if (transformation.mode === '3d') {
            this.DOM.style.transform = `matrix3d(${transformation.matrix.join(',')})`;
        }
    }
    get transform() {
        return this._transform;
    }

    protected setX(x: number) {
        this.DOM.style.left = x + "px";
    };
    protected setY(y: number) {
        this.DOM.style.top = y + "px";
    };
    protected setWidth(width: number) {
        this.DOM.style.width = width + "px";
    };
    protected setHeight(height: number) {
        this.DOM.style.height = height + "px";
    };
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
    protected removeChild(childitem: any) {
        const child = this.context.getObject(childitem);
        if (!child)
            return;
        try {
            this.DOM.removeChild(child.DOM!);
        } catch (e) {
            this.context.invokeError((<Error>e).stack, "err");
        }
    };
    protected offset(x: number, y: number) { }
    getClass() {
        return 'DisplayObject';
    }
}