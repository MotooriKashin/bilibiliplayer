import { __trace } from "../OOAPI";

/**
* Class that represents a 2d point
*/
export class Point {

    constructor(public x = 0, public y = 0) { }

    set length(_l: number) {
        __trace('Point.length is read-only', 'err');
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    add(p: Point) {
        return new Point(p.x + this.x, p.y + this.y);
    }

    subtract(p: Point) {
        return new Point(this.x - p.x, this.y - p.y);
    }

    static interpolate(a: Point, b: Point, f: number) {
        return new Point((b.x - a.x) * f + a.x, (b.y - a.y) * f + a.y);
    }

    offset(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    normalize(thickness: number) {
        const ratio: number = thickness / this.length;
        this.x *= ratio;
        this.y *= ratio;
    }

    static polar(r: number, theta: number) {
        return new Point(r * Math.cos(theta), r * Math.sin(theta));
    }

    setTo(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    equals(p: Point) {
        if (p.x === this.x && p.y === this.y) {
            return true;
        }
        return false;
    }

    toString() {
        return '(x=' + this.x + ', y=' + this.y + ')';
    }

    clone() {
        return new Point(this.x, this.y);
    }
}
/**
 * Matrix class to represent a 2d transformation matrix. This matrix will be
 * 3x3 with 9 configurable values.
 */
export class Matrix {
    private _data: Array<number>;

    constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        this._data = [a, c, tx, b, d, ty, 0, 0, 1];
    }

    private dotProduct(o: Array<number>) {
        if (o.length < 9) {
            throw new Error('Matrix dot product expects a 3x3 Matrix');
        }
        const res = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 3; k++) {
                    res[i * 3 + j] += this._data[i * 3 + k] * o[k * 3 + j];
                }
            }
        }
        return res;
    }

    setTo(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        this._data = [a, c, tx, b, d, ty, 0, 0, 1];
    }

    translate(tX: number, tY: number) {
        this._data[2] += tX;
        this._data[5] += tY;
    }

    rotate(q: number) {
        this._data = this.dotProduct([
            Math.cos(q), -Math.sin(q), 0,
            Math.sin(q), Math.cos(q), 0,
            0, 0, 1
        ]);
    }

    scale(sx: number, sy: number) {
        this._data = this.dotProduct([
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1
        ]);
    }

    identity() {
        this.setTo(1, 0, 0, 1, 0, 0);
    }

    createGradientBox(width: number, height: number, rotation: number, tX: number, tY: number) {
        this.createBox(width, height, rotation, tX, tY);
    }

    createBox(sX: number, sY: number, q: number, tX: number, tY: number) {
        this.identity();
        this.rotate(q);
        this.scale(sX, sY);
        this.translate(tX, tY);
    }

    clone() {
        const a = this._data[0],
            b = this._data[3],
            c = this._data[1],
            d = this._data[4],
            tx = this._data[2],
            ty = this._data[5];
        return new Matrix(a, b, c, d, tx, ty);
    }

    serialize() {
        return this._data;
    }
}
/**
 * Matrix class to represent a 3d transformation matrix. Such a matrix will be
 * 4x4 containing 16 configurable values.
 * API-compatible with AS3 class of same name.
 */
export class Matrix3D {
    private _data!: Array<number>;

    constructor(iv = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) {
        if (iv.length === 16) {
            this._data = iv;
        } else if (iv.length === 0) {
            this.identity();
        } else {
            __trace('Matrix3D initialization vector invalid', 'warn');
            this.identity();
        }
    }

    private dotProduct(a: Array<number>, b: Array<number>) {
        if (a.length !== 16 || b.length !== 16) {
            throw new Error('Matrix3D dot product expects a 4xr Matrix3D');
        }
        const res = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                for (let k = 0; k < 4; k++) {
                    res[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        return res;
    }

    private rotationMatrix(angle: number, axis: Vector3D) {
        const sT = Math.sin(angle), cT: number = Math.cos(angle);
        return [
            cT + axis.x * axis.x * (1 - cT), axis.x * axis.y * (1 - cT) - axis.z * sT, axis.x * axis.z * (1 - cT) + axis.y * sT, 0,
            axis.x * axis.y * (1 - cT) + axis.z * sT, cT + axis.y * axis.y * (1 - cT), axis.y * axis.z * (1 - cT) - axis.x * sT, 0,
            axis.z * axis.x * (1 - cT) - axis.y * sT, axis.z * axis.y * (1 - cT) + axis.x * sT, cT + axis.z * axis.z * (1 - cT), 0,
            0, 0, 0, 1
        ];
    }

    identity() {
        this._data = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }

    append(lhs: Matrix3D) {
        this._data = this.dotProduct(lhs._data, this._data);
    }

    appendRotation(degrees: number, axis: Vector3D, pivotPoint?: Vector3D) {
        if (pivotPoint) {
            this.appendTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z);
        }
        this._data = this.dotProduct(this.rotationMatrix(degrees * Math.PI / 180, axis), this._data);
        if (pivotPoint) {
            this.appendTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
        }
    }

    appendTranslation(x: number, y: number, z: number) {
        this._data = this.dotProduct([
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        ], this._data);
    }

    appendScale(sX = 1, sY = 1, sZ = 1) {
        this._data = this.dotProduct([
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            0, 0, 0, 1
        ], this._data);
    }

    prepend(rhs: Matrix3D) {
        this._data = this.dotProduct(this._data, rhs._data);
    }

    prependRotation(degrees: number, axis: Vector3D, pivotPoint?: Vector3D) {
        if (pivotPoint) {
            this.prependTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z);
        }
        this._data = this.dotProduct(this._data, this.rotationMatrix(degrees * Math.PI / 180, axis));
        if (pivotPoint) {
            this.prependTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
        }
    }

    prependTranslation(x: number, y: number, z: number) {
        this._data = this.dotProduct(this._data, [
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        ]);
    }

    prependScale(sX: number, sY: number, sZ: number) {
        this._data = this.dotProduct(this._data, [
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            0, 0, 0, 1
        ]);
    }

    transformVector(v: Vector3D) {
        const rx = this._data[0] * v.x + this._data[1] * v.y +
            this._data[2] * v.z + this._data[3] * v.w;
        const ry = this._data[4] * v.x + this._data[5] * v.y +
            this._data[6] * v.z + this._data[7] * v.w;
        const rz = this._data[8] * v.x + this._data[9] * v.y +
            this._data[10] * v.z + this._data[11] * v.w;
        const rw = this._data[12] * v.x + this._data[13] * v.y +
            this._data[14] * v.z + this._data[15] * v.w;
        return new Vector3D(rx, ry, rz, rw);
    }

    /**
     * Given an array of numbers representing vectors, postMultiply them to the current matrix.
     * @param vin - input (x,y,z)
     * @param vout - output (x,y,z)
     */
    transformVectors(vin: Array<number>, vout: Array<number>) {
        if (vin.length % 3 !== 0) {
            __trace('Matrix3D.transformVectors expects input size to be multiple of 3.', 'err');
            return;
        }
        for (let i = 0; i < vin.length / 3; i++) {
            const x = vin[i * 3], y = vin[i * 3 + 1], z = vin[i * 3 + 2];
            const rx = this._data[0] * x + this._data[1] * y + this._data[2] * z;
            const ry = this._data[4] * x + this._data[5] * y + this._data[6] * z;
            const rz = this._data[8] * x + this._data[9] * y + this._data[10] * z;
            vout.push(rx, ry, rz);
        }
    }

    transpose() {
        this._data = [
            this._data[0], this._data[4], this._data[8], this._data[12],
            this._data[1], this._data[5], this._data[9], this._data[13],
            this._data[2], this._data[6], this._data[10], this._data[14],
            this._data[3], this._data[7], this._data[11], this._data[15]
        ];
    }

    clone() {
        return new Matrix3D(this._data);
    }

    serialize() {
        return this._data;
    }
}
export class Vector3D {
    static X_AXIS: Vector3D = new Vector3D(1, 0, 0);
    static Y_AXIS: Vector3D = new Vector3D(0, 1, 0);
    static Z_AXIS: Vector3D = new Vector3D(0, 0, 1);

    constructor(public x = 0, public y = 0, public z = 0, public w = 0) { }

    toString() {
        return '(x=' + this.x + ', y=' + this.y + ', z=' + this.z + ', w=' + this.w + ')';
    }
}
export function createMatrix(
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number) {

    return new Matrix(a, b, c, d, tx, ty);
}

export function createMatrix3D(iv: Array<number>) {
    return new Matrix3D(iv);
}

export function createGradientBox(
    width: number,
    height: number,
    rotation: number,
    tX: number,
    tY: number) {

    const m = new Matrix();
    // Note: Magic number here is some flash scaling constant
    m.createGradientBox(width / 1638.4,
        height / 1638.4,
        rotation,
        tX + width / 2,
        tY + height / 2);
    return m;
}

export function createVector3D(x = 0,
    y = 0,
    z = 0,
    w = 0) {

    return new Vector3D(x, y, z, w);
}

export function projectVector(matrix: Matrix3D, vector: Vector3D) {
    return matrix.transformVector(vector);
}

export function projectVectors(matrix: Matrix3D,
    verts: Array<number>,
    projectedVerts: Array<number>,
    uvts: Array<number>) {

    /** Clear projected Verts **/
    while (projectedVerts.length > 0) {
        projectedVerts.pop();
    }
    if (verts.length % 3 !== 0) {
        __trace(
            'Display.projectVectors input vertex Vector must be a multiple of 3.',
            'err');
        return;
    }
    const transformed: Array<number> = [];
    matrix.transformVectors(verts, transformed);
    for (let i = 0; i < transformed.length / 3; i++) {
        const x = transformed[i * 3], y = transformed[i * 3 + 1];
        projectedVerts.push(x, y);
    }
}

export function createPoint(x: number = 0, y: number = 0) {
    return new Point(x, y);
}

/**
 * Transforms a JS Array into an AS3 Vector<int>.
 *   Nothing is actually done since the methods are very
 *   similar across both.
 * @param array Array
 * @returns AS3 Integer Vector
 */
export function toIntVector(array: Array<number>) {
    Object.defineProperty(array, 'as3Type', {
        get: function () {
            return 'Vector<int>';
        },
        set: function (_value) {
            __trace('as3Type should not be set.', 'warn');
        }
    });
    return array.map(Math.floor);
}

/**
 * Transforms a JS Array into an AS3 Vector<number>.
 *   Nothing is actually done since the methods are very
 *   similar across both.
 * @param array Array
 * @returns AS3 Number Vector
 */
export function toNumberVector(array: Array<number>) {
    Object.defineProperty(array, 'as3Type', {
        get: function () {
            return 'Vector<number>';
        },
        set: function (_value) {
            __trace('as3Type should not be set.', 'warn');
        }
    });
    return array;
}