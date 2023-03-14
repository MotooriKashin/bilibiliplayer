import { debug } from "../../debug";
import { ColorTransform } from "./ColorTransform";
import { DisplayObject } from "./DisplayObject";
import { Matrix } from "./Matrix";
import { Matrix3D } from "./Matrix3D";
import { Point } from "./Point";
import { Vector3D } from "./Vector3D";
export class PerspectiveProjection {
    fieldOfView = 55;
    projectionCenter = new Point(0, 0);
    focalLength = 0;
    constructor(t?: DisplayObject) {
        if (t) {
            this.projectionCenter = new Point(t.width / 2, t.height / 2);
            this.fieldOfView = 55;
            this.focalLength = t.width / 2 / Math.tan(this.fieldOfView / 2);
        }
    }
    toMatrix3D() {
        return new Matrix3D();
    }
    clone() {
        const proj = new PerspectiveProjection();
        proj.fieldOfView = this.fieldOfView;
        proj.projectionCenter = this.projectionCenter;
        proj.focalLength = this.focalLength;
        return proj;
    }
}
export class Transform {
    private _matrix = new Matrix();
    private _matrix3d?: Matrix3D;
    private _perspectiveProjection?: PerspectiveProjection;
    private _colorTransform?: ColorTransform;
    constructor(public parent?: DisplayObject) { }
    set perspectiveProjection(projection: PerspectiveProjection) {
        this._perspectiveProjection = projection;
    }
    get perspectiveProjection() {
        if (typeof this._perspectiveProjection === 'undefined') {
            this._perspectiveProjection = new PerspectiveProjection(this.parent);
        }
        return this._perspectiveProjection;
    }
    set colorTransform(colorTransform: ColorTransform) {
        this._colorTransform = colorTransform;
    }
    get colorTransform() {
        if (typeof this._colorTransform === 'undefined') {
            this._colorTransform = new ColorTransform();
        }
        return this._colorTransform;
    }
    set matrix3D(m: Matrix3D) {
        if (m === null) {
            if (this._matrix3d === null) {
                return;
            }
            this._matrix3d = <any>null;
            this._matrix = new Matrix();
        } else {
            this._matrix = <any>null;
            this._matrix3d = m;
        }
        this.update();
    }
    get matrix3D() {
        return this._matrix3d!;
    }
    set matrix(m: Matrix) {
        if (m === null) {
            if (this._matrix === null) {
                return;
            }
            this._matrix = <any>null;
            this._matrix3d = new Matrix3D();
        } else {
            this._matrix3d = <any>null;
            this._matrix = m;
        }
        this.update();
    }
    get matrix() {
        return this._matrix;
    }
    box3d(sX = 1,
        sY = 1,
        sZ = 1,
        rotX = 0,
        rotY = 0,
        rotZ = 0,
        tX = 0,
        tY = 0,
        tZ = 0) {

        if (this._matrix || !this._matrix3d) {
            this._matrix = undefined!;
            this._matrix3d = new Matrix3D();
        }
        this._matrix3d.identity();
        this._matrix3d.appendRotation(rotX, Vector3D.X_AXIS);
        this._matrix3d.appendRotation(rotY, Vector3D.Y_AXIS);
        this._matrix3d.appendRotation(rotZ, Vector3D.Z_AXIS);
        this._matrix3d.appendScale(sX, sY, sZ);
        this._matrix3d.appendTranslation(tX, tY, tZ);
    }
    box(sX = 1, sY = 1, rot = 0, tX = 0, tY = 0) {
        if (this._matrix) {
            this._matrix.createBox(sX, sY, rot, tX, tY);
        } else {
            this.box3d(sX, sY, 1, 0, 0, rot, tX, tY, 0);
        }
    }
    private update() {
        if (!this.parent) {
            return;
        }
        this.parent.transform = this;
    }
    getRelativeMatrix3D(relativeTo: any) {
        debug.warn('Transform.getRelativeMatrix3D not implemented');
        return new Matrix3D();
    }
    /**
     * Returns the working matrix as a serializable object
     * @returns Serializable Matrix
     */
    getMatrix() {
        if (this._matrix) {
            return this._matrix;
        } else {
            return this._matrix3d;
        }
    }
    /**
     * Returns matrix type in use
     * @returns - "2d" or "3d"
     */
    getMatrixType() {
        return this._matrix ? '2d' : '3d';
    }
    /**
     * Clones the current transform object
     * The new transform does not bind to any object until it
     * is bound to an object. Before that, updates don't
     * take effect.
     *
     * @returns Clone of transform object
     */
    clone() {
        const t = new Transform(this.parent);
        t._matrix = this._matrix;
        t._matrix3d = this._matrix3d;
        return t;
    }
    get mode() {
        return this.getMatrixType();
    }
    serialize() {
        return {
            mode: this.getMatrixType(),
            matrix: this.getMatrix()?.serialize()
        };
    }
}