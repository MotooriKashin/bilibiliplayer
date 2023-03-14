import { __pchannel, __trace } from "../OOAPI";
import { IComment, Player } from "../Player/player";
import { Runtime } from "../Runtime/Runtime";
import { Display } from "./Display";
import { Filter } from "./Filter";
import { Point } from "./Point";
import { Rectangle } from "./Rectangle";
import { Transform } from "./Transform";

export class DisplayObject {
    protected static SANDBOX_EVENTS: string[] = ["enterFrame"];
    /** This represents an element in the HTML rendering **/
    protected _alpha = 1;
    protected _anchor = new Point();
    protected _boundingBox = new Rectangle();
    protected _z = 0;
    protected _scaleX = 1;
    protected _scaleY = 1;
    protected _scaleZ = 1;
    protected _rotationX = 0;
    protected _rotationY = 0;
    protected _rotationZ = 0;
    protected _filters: Filter[] = [];
    protected _blendMode = "normal";
    protected _listeners: Record<string, Function[]> = {};
    protected _parent?: DisplayObject;
    protected _name = "";
    protected _children: DisplayObject[] = [];
    protected _transform = new Transform(this);
    protected _hasSetDefaults = false;
    constructor(protected id = Runtime.generateId(), protected _visible = true) { }
    setDefaults(defaults = <IComment>{}) {
        if (this._hasSetDefaults) {
            __trace("DisplayObject.setDefaults called more than once.", "warn");
            return;
        }
        this._hasSetDefaults = true;
        try {
            /** Try reading the defaults from motion fields **/
            if (defaults.hasOwnProperty("motion")) {
                const motion = defaults["motion"];
                if (motion.hasOwnProperty("alpha")) {
                    this._alpha = motion["alpha"]["fromValue"];
                }
                if (motion.hasOwnProperty("x")) {
                    this._anchor.x = motion["x"]["fromValue"];
                }
                if (motion.hasOwnProperty("y")) {
                    this._anchor.y = motion["y"]["fromValue"];
                }
            } else if (defaults.hasOwnProperty("motionGroup") &&
                defaults["motionGroup"] && defaults["motionGroup"].length > 0) {
                const motion = defaults["motionGroup"][0];
                if (motion.hasOwnProperty("alpha")) {
                    this._alpha = motion["alpha"]["fromValue"];
                }
                if (motion.hasOwnProperty("x")) {
                    this._anchor.x = motion["x"]["fromValue"];
                }
                if (motion.hasOwnProperty("y")) {
                    this._anchor.y = motion["y"]["fromValue"];
                }
            }
        } catch (e) {

        }
        if (defaults.hasOwnProperty("alpha")) {
            this._alpha = defaults["alpha"]!;
        }
        if (defaults.hasOwnProperty("x")) {
            this._anchor.x = defaults["x"]!;
        }
        if (defaults.hasOwnProperty("y")) {
            this._anchor.y = defaults["y"]!;
        }
    }
    eventToggle(eventName: string, mode = "enable") {
        if (DisplayObject.SANDBOX_EVENTS.indexOf(eventName) > -1) {
            return;
            /* No need to notify */
        }
        __pchannel("Runtime:ManageEvent", {
            "id": this.id,
            "name": eventName,
            "mode": mode
        });
    }
    propertyUpdate(propertyName: string, updatedValue: any) {
        __pchannel("Runtime:UpdateProperty", {
            "id": this.id,
            "name": propertyName,
            "value": updatedValue
        });
    }
    methodCall(methodName: string, params: any) {
        __pchannel("Runtime:CallMethod", {
            "id": this.id,
            "method": methodName,
            "params": params
        });
    }

    /** Properties **/
    set alpha(value: number) {
        this._alpha = value;
        this.propertyUpdate("alpha", value);
    }
    get alpha(): number {
        return this._alpha;
    }
    set anchor(p: Point) {
        this._anchor = p;
        this.propertyUpdate("x", p.x);
        this.propertyUpdate("y", p.y);
    }
    get anchor() {
        return this._anchor;
    }
    set boundingBox(r: Rectangle) {
        this._boundingBox = r;
        this.propertyUpdate("boundingBox", r);
    }
    get boundingBox() {
        return this._boundingBox;
    }
    set cacheAsBitmap(_value: boolean) {
        __trace("DisplayObject.cacheAsBitmap is not supported", "warn");
    }
    get cacheAsBitmap() {
        return false;
    }
    set filters(filters: Filter[]) {
        this._filters = filters ? filters : [];
        const serializedFilters: Array<Object> = [];
        for (let i = 0; i < this._filters.length; i++) {
            if (!this.filters[i]) {
                continue;
            }
            serializedFilters.push(this._filters[i].serialize());
        }
        this.propertyUpdate("filters", serializedFilters);
    }
    get filters() {
        return this._filters;
    }
    get root() {
        return Display.root;
    }
    set root(_s: DisplayObject) {
        __trace("DisplayObject.root is read-only.", "warn");
    }
    get stage() {
        return Display.root;
    }
    set stage(_s: DisplayObject) {
        __trace("DisplayObject.stage is read-only.", "warn");
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
    set transform(t: any) {
        this._transform = t;
        if (this._transform.parent !== this) {
            this._transform.parent = this;
        }
        this.propertyUpdate('transform', this._transform.serialize());
    }
    get transform() {
        return this._transform;
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
    set x(val: number) {
        this._anchor.x = val;
        this.propertyUpdate("x", val);
    }
    get x() {
        return this._anchor.x;
    }
    set y(val: number) {
        this._anchor.y = val;
        this.propertyUpdate("y", val);
    }
    get y() {
        return this._anchor.y;
    }
    set z(val: number) {
        this._z = val;
        this._updateBox("3d");
    }
    get z() {
        return this._z;
    }
    set width(w: number) {
        this._boundingBox.width = w;
        this.propertyUpdate('width', w);
    }
    get width() {
        return this._boundingBox.width;
    }
    set height(h: number) {
        this._boundingBox.height = h;
        this.propertyUpdate('height', h);
    }
    get height() {
        return this._boundingBox.height;
    }
    set visible(visible: boolean) {
        this._visible = visible;
        this.propertyUpdate('visible', visible);
    }
    get visible() {
        return this._visible;
    }
    set blendMode(blendMode: string) {
        this._blendMode = blendMode;
        this.propertyUpdate('blendMode', blendMode);
    }
    get blendMode() {
        return this._blendMode;
    }
    set name(name: string) {
        this._name = name;
        this.propertyUpdate('name', name);
    }
    get name() {
        return this._name;
    }
    set loaderInfo(_name: any) {
        __trace("DisplayObject.loaderInfo is read-only", "warn");
    }
    get loaderInfo() {
        __trace("DisplayObject.loaderInfo is not supported", "warn");
        return {};
    }
    set parent(_p: DisplayObject) {
        __trace("DisplayObject.parent is read-only", "warn");
    }
    get parent() {
        return this._parent ?? Display.root;
    }
    get video() {
        return Player;
    }
    /** AS3 Stuff **/
    dispatchEvent(event: string, data?: any) {
        if (this._listeners.hasOwnProperty(event)) {
            if (this._listeners[event]) {
                for (let i = 0; i < this._listeners[event].length; i++) {
                    try {
                        this._listeners[event][i](data);
                    } catch (e) {
                        if ((<Error>e).hasOwnProperty('stack')) {
                            __trace((<Error>e).stack?.toString(), 'err');
                        } else {
                            __trace((<Error>e).toString(), 'err');
                        }
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
        if (this._listeners[event].length === 1) {
            this.eventToggle(event, 'enable');
        }
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
        if (this._listeners[event].length === 0) {
            this.eventToggle(event, 'disable');
        }
    }
    /** DisplayObjectContainer **/
    get numChildren() {
        return this._children.length;
    }
    addChild(o: DisplayObject) {
        // Make sure we're not adding a child onto a parent
        if (typeof o === 'undefined' || o === null) {
            throw new Error('Cannot add an empty child!');
        }
        if (o.contains(this)) {
            throw new Error('Attempting to add an ancestor of this DisplayObject as a child!');
        }
        this._children.push(o);
        this._boundingBox.unionCoord(o._anchor.x + o._boundingBox.left, o._anchor.y + o._boundingBox.top);
        this._boundingBox.unionCoord(o._anchor.x + o._boundingBox.right, o._anchor.y + o._boundingBox.bottom);
        o._parent = this;
        this.methodCall('addChild', o.id);
    }
    removeChild(o: DisplayObject) {
        const index = this._children.indexOf(o);
        if (index >= 0) {
            this.removeChildAt(index);
        }
    }
    getChildAt(index: number) {
        if (index < 0 || index > this._children.length) {
            throw new RangeError('No child at index ' + index);
        }
        return this._children[index];
    }
    getChildIndex(o: DisplayObject) {
        return this._children.indexOf(o);
    }
    removeChildAt(index: number) {
        const o: DisplayObject = this.getChildAt(index);
        this._children.splice(index, 1);
        o._parent = null!;
        this.methodCall('removeChild', o.id);
    }
    removeChildren(begin: number, end: number = this._children.length) {
        const removed: Array<DisplayObject> = this._children.splice(begin, end - begin);
        const ids: Array<string> = [];
        for (let i = 0; i < removed.length; i++) {
            removed[i]._parent = null!;
            ids.push(removed[i].id);
        }
        this.methodCall('removeChildren', ids);
    }
    contains(child: DisplayObject) {
        if (child === this) {
            return true;
        }
        if (this._children.indexOf(child) >= 0) {
            return true;
        }
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].contains(child)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Removes the object from a parent if exists.
     */
    remove() {
        // Remove itself
        if (this._parent) {
            this._parent.removeChild(this);
        } else {
            this.root.removeChild(this);
        }
    }
    toString() {
        return '[' + (this._name.length > 0 ? this._name : 'displayObject') +
            ' DisplayObject]@' + this.id;
    }
    /**
     * Clones the current display object
     */
    clone() {
        const alternate = new DisplayObject();
        alternate._transform = this._transform.clone();
        alternate._transform.parent = alternate;
        alternate._boundingBox = this._boundingBox.clone();
        alternate._anchor = this._anchor.clone();
        alternate._alpha = this._alpha;
        return alternate;
    }
    hasOwnProperty(prop: string) {
        if (prop === 'clone') {
            return true;
        } else {
            return Object.prototype.hasOwnProperty.call(this, prop);
        }
    }
    /** Common Functions **/
    serialize() {
        this._hasSetDefaults = true;
        const filters: any[] = [];
        for (let i: number = 0; i < this._filters.length; i++) {
            filters.push(this._filters[i].serialize());
        }
        return <any>{
            class: 'DisplayObject',
            x: this._anchor.x,
            y: this._anchor.y,
            alpha: this._alpha,
            filters: filters
        };
    }
    unload() {
        this._visible = false;
        this.remove();
        this.methodCall('unload', null);
    }
    getId() {
        return this.id;
    }
    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            left: 0,
            right: 0,
            top: 0,
            buttom: 0
        }
    }
}