import { ColorTransform } from "./ColorTransform";
import { Matrix, Matrix3D, Point, Vector3D } from "./Matrix";

interface Transformable {
    width: number;
    height: number;
    transform: Transform;
}

export class PerspectiveProjection {
    public fieldOfView: number = 55;
    public projectionCenter: Point = new Point(0, 0);
    public focalLength: number = 0;

    constructor(t?: Transformable) {
        if (t) {
            this.projectionCenter = new Point(t.width / 2, t.height / 2);
            this.fieldOfView = 55;
            this.focalLength = t.width / 2 / Math.tan(this.fieldOfView / 2);
        }
    }

    public toMatrix3D(): Matrix3D {
        return new Matrix3D();
    }

    public clone(): PerspectiveProjection {
        var proj: PerspectiveProjection = new PerspectiveProjection();
        proj.fieldOfView = this.fieldOfView;
        proj.projectionCenter = this.projectionCenter;
        proj.focalLength = this.focalLength;
        return proj;
    }
}

export class Transform {
    private _parent: Transformable;
    private _matrix: Matrix = new Matrix();
    private _matrix3d: Matrix3D;
    private _perspectiveProjection: PerspectiveProjection;
    private _colorTransform: ColorTransform;

    constructor(parent?: Transformable) {
        this._parent = parent!;
    }

    set parent(p: Transformable) {
        this._parent = p;
    }

    get parent(): Transformable {
        return this._parent;
    }

    set perspectiveProjection(projection: PerspectiveProjection) {
        this._perspectiveProjection = projection;
    }

    get perspectiveProjection(): PerspectiveProjection {
        if (typeof this._perspectiveProjection === 'undefined') {
            this._perspectiveProjection = new PerspectiveProjection(this._parent);
        }
        return this._perspectiveProjection;
    }

    set colorTransform(colorTransform: ColorTransform) {
        this._colorTransform = colorTransform;
    }

    get colorTransform(): ColorTransform {
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

    get matrix3D(): Matrix3D {
        return this._matrix3d;
    }

    get matrix(): Matrix {
        return this._matrix;
    }

    public box3d(sX: number = 1,
        sY: number = 1,
        sZ: number = 1,
        rotX: number = 0,
        rotY: number = 0,
        rotZ: number = 0,
        tX: number = 0,
        tY: number = 0,
        tZ: number = 0): void {

        if (this._matrix !== null || this._matrix3d === null) {
            this._matrix = <any>null;
            this._matrix3d = new Matrix3D();
        }
        this._matrix3d.identity();
        this._matrix3d.appendRotation(rotX, Vector3D.X_AXIS);
        this._matrix3d.appendRotation(rotY, Vector3D.Y_AXIS);
        this._matrix3d.appendRotation(rotZ, Vector3D.Z_AXIS);
        this._matrix3d.appendScale(sX, sY, sZ);
        this._matrix3d.appendTranslation(tX, tY, tZ);
    }

    public box(sX: number = 1, sY: number = 1, rot: number = 0, tX: number = 0, tY: number = 0): void {
        if (this._matrix) {
            this._matrix.createBox(sX, sY, rot, tX, tY);
        } else {
            this.box3d(sX, sY, 1, 0, 0, rot, tX, tY, 0);
        }
    }

    private update(): void {
        if (this._parent === null) {
            return;
        }
        this._parent.transform = this;
    }

    public getRelativeMatrix3D(relativeTo: any): Matrix3D {
        __trace('Transform.getRelativeMatrix3D not implemented', 'warn');
        return new Matrix3D();
    }

    /**
     * Returns the working matrix as a serializable object
     * @returns {*} Serializable Matrix
     */
    public getMatrix() {
        if (this._matrix) {
            return this._matrix;
        } else {
            return this._matrix3d;
        }
    }

    /**
     * Returns matrix type in use
     * @returns {string} - "2d" or "3d"
     */
    public getMatrixType(): string {
        return this._matrix ? '2d' : '3d';
    }

    /**
     * Clones the current transform object
     * The new transform does not bind to any object until it
     * is bound to an object. Before that, updates don't
     * take effect.
     *
     * @returns {Transform} - Clone of transform object
     */
    public clone(): Transform {
        var t: Transform = new Transform();
        t._matrix = this._matrix;
        t._matrix3d = this._matrix3d;
        return t;
    }

    public serialize(): Object {
        return {
            'mode': this.getMatrixType(),
            'matrix': this.getMatrix().serialize()
        };
    }

}