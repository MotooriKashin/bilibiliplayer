import { debug } from "../../debug";
import { numberColor } from "../utils";
import { BlurFilter, Filter, GlowFilter } from "./Filter";
import { Point } from "./Point";
import { Rectangle } from "./Rectangle";
import { Transform } from "./Transform";

export interface IMotion {
    x: number;
    y: number;
    z: number;
    alpha: string;
    scale: number;
    motionGroup?: object[];
    lifeTime: number;
    motion: {
        lifeTime: number;
    };
    parent?: DisplayObject;
}
export class DisplayObject {
    protected class = 'DisplayObject';
    DOM!: HTMLElement | SVGSVGElement;
    protected _z!: number;
    protected _scaleX = 1;
    protected _scaleY = 1;
    protected _scaleZ = 1;
    protected _rotationX = 0;
    protected _rotationY = 0;
    protected _rotationZ = 0;
    protected _anchor = new Point();
    protected _boundingBox = new Rectangle();
    protected _transform = new Transform(this);
    protected children: DisplayObject[] = [];
    protected _filters: Filter[] = [];
    protected _name = '';
    protected _parent?: DisplayObject;
    protected _listeners: Record<string, Function[]> = {};
    constructor(public __root: HTMLElement) { }
    set alpha(a) {
        this.DOM.style.opacity = a;
    }
    get alpha() {
        return this.DOM.style.opacity;
    }
    set anchor(p: Point) {
        this._anchor = p;
        this.x = p.x;
        this.y = p.y;
    }
    get anchor() {
        return this._anchor;
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
    set cacheAsBitmap(_value: boolean) {
        debug.warn("DisplayObject.cacheAsBitmap is not supported");
    }
    get cacheAsBitmap() {
        return false;
    }
    set filters(filters: Filter[]) {
        this._filters = filters ?? [];
        const shadows: string[] = [];
        this._filters.forEach(d => {
            if (d.type === "blur") {
                shadows.push([0, 0, Math.max(
                    (<BlurFilter>d).params.blurX, (<BlurFilter>d).params.blurY) +
                    "px"].join(" "));
            } else if (d.type === "glow") {
                for (let i = 0; i < Math.min(2, (<GlowFilter>d).params.strength); i++) {
                    shadows.push([0, 0, Math.max(
                        (<GlowFilter>d).params.blurX, (<GlowFilter>d).params.blurY) +
                        "px", numberColor((<GlowFilter>d).params.color)].join(" "));
                }
            }
        });
        this.DOM.style.textShadow = shadows.join(",");
    }
    get filters() {
        return this._filters;
    }
    get root() {
        return this._parent// TODO: Sprite this.__root; 
    }
    /** Start Transform Area **/
    protected _updateBox(mode = this._transform.getMatrixType()) {
        if (mode === "3d") {
            this._transform.box3d(this._scaleX,
                this._scaleY,
                this._scaleZ,
                this._rotationX,
                this._rotationY,
                this._rotationZ,
                0,
                0,
                this._z);
        } else {
            this._transform.box(this._scaleX,
                this._scaleY,
                this._rotationZ * Math.PI / 180);
        }
        this.transform = this._transform;
    }
    set rotationX(x: number) {
        this._rotationX = x;
        this._updateBox("3d");
    }
    get rotationX() {
        return this._rotationX;
    }
    set rotationY(y: number) {
        this._rotationY = y;
        this._updateBox("3d");
    }
    get rotationY() {
        return this._rotationY;
    }
    set rotationZ(z: number) {
        this._rotationZ = z;
        this._updateBox();
    }
    get rotationZ() {
        return this._rotationZ;
    }
    set rotation(r: number) {
        this._rotationZ = r;
        this._updateBox();
    }
    get rotation() {
        return this._rotationZ;
    }
    set scaleX(val: number) {
        this._scaleX = val;
        this._updateBox();
    }
    get scaleX() {
        return this._scaleX;
    }
    set scaleY(val: number) {
        this._scaleY = val;
        this._updateBox();
    }
    get scaleY() {
        return this._scaleY;
    }
    set scaleZ(val: number) {
        this._scaleZ = val;
        this._updateBox("3d");
    }
    get scaleZ() {
        return this._scaleZ;
    }
    set x(x) {
        this._anchor.x = x;
        this.DOM.style.left = x + "px";
    }
    get x() {
        return this._anchor.x;
    }
    set y(y) {
        this._anchor.y = y;
        this.DOM.style.top = y + "px";
    }
    get y() {
        return this._anchor.y;
    }
    set z(val) {
        this._z = val;
        this._updateBox("3d");
    }
    get z() {
        return this._z;
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
    set transform(transformation) {
        this._transform = transformation;
        if (transformation.mode === '2d') {
            const rm = [
                transformation.matrix._data[0],
                transformation.matrix._data[3],
                transformation.matrix._data[1],
                transformation.matrix._data[4],
                transformation.matrix._data[2],
                transformation.matrix._data[5]
            ];
            this.DOM.style.transform = `matrix(${rm.join(',')})`;
        } else if (transformation.mode === '3d') {
            this.DOM.style.transform = `matrix3d(${transformation.matrix3D._data.join(',')})`;
        }
    }
    get transform() {
        return this._transform;
    }
    set name(name: string) {
        this._name = name;
    }
    get name() {
        return this._name;
    }
    get loaderInfo() {
        debug.warn("DisplayObject.loaderInfo is not supported");
        return {};
    }
    get parent() {
        return this._parent // DODO: ?? Display.root;
    }
    get video() {
        return // TODO: Player;
    }
    /** AS3 Stuff **/
    dispatchEvent(event: string, data?: any) {
        if (this._listeners.hasOwnProperty(event)) {
            if (this._listeners[event]) {
                for (let i = 0; i < this._listeners[event].length; i++) {
                    try {
                        this._listeners[event][i](data);
                    } catch (e) {
                        debug.error(e)
                    }
                }
            }
        }
    }
    addEventListener(event: string, listener: Function) {
        if (!this._listeners.hasOwnProperty(event)) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(listener);
        this.DOM.addEventListener(<any>event, <any>listener);
    }
    removeEventListener(event: string, listener: Function) {
        if (!this._listeners.hasOwnProperty(event) ||
            this._listeners[event].length === 0) {
            return;
        }
        const index = this._listeners[event].indexOf(listener);
        if (index >= 0) {
            this._listeners[event].splice(index, 1);
        }
        this.DOM.removeEventListener(<any>event, <any>listener);
    }
    /** DisplayObjectContainer **/
    get numChildren() {
        return this.children.length;
    }
    protected offset(x: number, y: number) { }
    addChild(o: DisplayObject) {
        this.children.push(o);
        this._boundingBox.unionCoord(o._anchor.x + o._boundingBox.left, o._anchor.y + o._boundingBox.top);
        this._boundingBox.unionCoord(o._anchor.x + o._boundingBox.right, o._anchor.y + o._boundingBox.bottom);
        o._parent = this;
        if (o.DOM) {
            if (o.class === "Shape") {
                const tX = this._anchor.x + (this.__root.offsetWidth / 2), tY = this._anchor.y + (this.__root.offsetHeight / 2);
                o.offset(tX, tY);
                o.DOM.style.left = -tX + "px";
                o.DOM.style.top = -tY + "px";
            }
            this.DOM.appendChild(o.DOM);
        } else {
            debug.error('Sprite.addChild failed. Attempted to add non object');
        }
    }
    removeChild(childitem: DisplayObject) {
        if (!childitem)
            return;
        try {
            const index = this.children.indexOf(childitem);
            if (index >= 0) {
                this.removeChildAt(index);
            }
            childitem.DOM?.remove();
        } catch (e) {
            debug.error(e)
        }
    };
    getChildAt(index: number) {
        if (index < 0 || index > this.children.length) {
            throw new RangeError('No child at index ' + index);
        }
        return this.children[index];
    }
    getChildIndex(o: DisplayObject) {
        return this.children.indexOf(o);
    }
    removeChildAt(index: number) {
        const o: DisplayObject = this.getChildAt(index);
        this.children.splice(index, 1);
        o._parent = null!;
        this.removeChild(o);
    }
    removeChildren(begin: number, end: number = this.children.length) {
        const removed: Array<DisplayObject> = this.children.splice(begin, end - begin);
        removed.forEach(d => {
            delete d._parent;
            this.removeChild(d);
        });
    }
    contains(child: DisplayObject) {
        return this.DOM.contains(child.DOM);
    }
    /**
     * Removes the object from a parent if exists.
     */
    remove() {
        this.DOM.remove();
        // Remove itself
        if (this._parent) {
            this._parent.removeChild(this);
        } else {
            this.root?.removeChild(this);
        }
    }
    /**
     * Clones the current display object
     */
    clone() {
        const alternate = new DisplayObject(this.__root);
        alternate._transform = this._transform.clone();
        alternate._transform.parent = alternate;
        alternate._boundingBox = this._boundingBox.clone();
        alternate._anchor = this._anchor.clone();
        alternate.alpha = this.alpha;
        return alternate;
    }
    hasOwnProperty(prop: string) {
        return prop in this;
    }
    unload() {
        try {
            this.visible = false;
            this.remove()
        } catch (e) { };
    }
}