/**
* Class that represents a 2d point
*/
export class Point {
    public x: number;
    public y: number;
    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    set length(_l: number) {
        __trace('Point.length is read-only', 'err');
    }

    get length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public add(p: Point): Point {
        return new Point(p.x + this.x, p.y + this.y);
    }

    public subtract(p: Point): Point {
        return new Point(this.x - p.x, this.y - p.y);
    }

    public static interpolate(a: Point, b: Point, f: number): Point {
        return new Point((b.x - a.x) * f + a.x, (b.y - a.y) * f + a.y);
    }

    public offset(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    public normalize(thickness: number): void {
        var ratio: number = thickness / this.length;
        this.x *= ratio;
        this.y *= ratio;
    }

    public static polar(r: number, theta: number): Point {
        return new Point(r * Math.cos(theta), r * Math.sin(theta));
    }

    public setTo(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    public equals(p: Point): boolean {
        if (p.x === this.x && p.y === this.y) {
            return true;
        }
        return false;
    }

    public toString(): string {
        return '(x=' + this.x + ', y=' + this.y + ')';
    }

    public clone(): Point {
        return new Point(this.x, this.y);
    }
}
/**
 * Matrix class to represent a 2d transformation matrix. This matrix will be
 * 3x3 with 9 configurable values.
 */
export class Matrix {
    private _data: Array<number>;

    constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
        this._data = [a, c, tx, b, d, ty, 0, 0, 1];
    }

    private dotProduct(o: Array<number>): Array<number> {
        if (o.length < 9) {
            throw new Error('Matrix dot product expects a 3x3 Matrix');
        }
        var res: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                for (var k = 0; k < 3; k++) {
                    res[i * 3 + j] += this._data[i * 3 + k] * o[k * 3 + j];
                }
            }
        }
        return res;
    }

    public setTo(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0): void {
        this._data = [a, c, tx, b, d, ty, 0, 0, 1];
    }

    public translate(tX: number, tY: number): void {
        this._data[2] += tX;
        this._data[5] += tY;
    }

    public rotate(q: number): void {
        this._data = this.dotProduct([
            Math.cos(q), -Math.sin(q), 0,
            Math.sin(q), Math.cos(q), 0,
            0, 0, 1
        ]);
    }

    public scale(sx: number, sy: number): void {
        this._data = this.dotProduct([
            sx, 0, 0,
            0, sy, 0,
            0, 0, 1
        ]);
    }

    public identity(): void {
        this.setTo(1, 0, 0, 1, 0, 0);
    }

    public createGradientBox(width: number, height: number, rotation: number, tX: number, tY: number): void {
        this.createBox(width, height, rotation, tX, tY);
    }

    public createBox(sX: number, sY: number, q: number, tX: number, tY: number): void {
        this.identity();
        this.rotate(q);
        this.scale(sX, sY);
        this.translate(tX, tY);
    }

    public clone(): Matrix {
        var a: number = this._data[0],
            b: number = this._data[3],
            c: number = this._data[1],
            d: number = this._data[4],
            tx: number = this._data[2],
            ty: number = this._data[5];
        return new Matrix(a, b, c, d, tx, ty);
    }

    public serialize(): Object {
        return this._data;
    }
}
/**
 * Matrix class to represent a 3d transformation matrix. Such a matrix will be
 * 4x4 containing 16 configurable values.
 * API-compatible with AS3 class of same name.
 * @author Jim Chen
 */
export class Matrix3D {
    private _data: Array<number>;

    constructor(iv: Array<number> = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) {
        if (iv.length === 16) {
            this._data = iv;
        } else if (iv.length === 0) {
            this.identity();
        } else {
            __trace('Matrix3D initialization vector invalid', 'warn');
            this.identity();
        }
    }

    private dotProduct(a: Array<number>, b: Array<number>): Array<number> {
        if (a.length !== 16 || b.length !== 16) {
            throw new Error('Matrix3D dot product expects a 4xr Matrix3D');
        }
        var res: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 4; j++) {
                for (var k = 0; k < 4; k++) {
                    res[i * 4 + j] += a[i * 4 + k] * b[k * 4 + j];
                }
            }
        }
        return res;
    }

    private rotationMatrix(angle: number, axis: Vector3D): Array<number> {
        var sT: number = Math.sin(angle), cT: number = Math.cos(angle);
        return [
            cT + axis.x * axis.x * (1 - cT), axis.x * axis.y * (1 - cT) - axis.z * sT, axis.x * axis.z * (1 - cT) + axis.y * sT, 0,
            axis.x * axis.y * (1 - cT) + axis.z * sT, cT + axis.y * axis.y * (1 - cT), axis.y * axis.z * (1 - cT) - axis.x * sT, 0,
            axis.z * axis.x * (1 - cT) - axis.y * sT, axis.z * axis.y * (1 - cT) + axis.x * sT, cT + axis.z * axis.z * (1 - cT), 0,
            0, 0, 0, 1
        ];
    }

    public identity(): void {
        this._data = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    }

    public append(lhs: Matrix3D): void {
        this._data = this.dotProduct(lhs._data, this._data);
    }

    public appendRotation(degrees: number, axis: Vector3D, pivotPoint?: Vector3D): void {
        if (pivotPoint) {
            this.appendTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z);
        }
        this._data = this.dotProduct(this.rotationMatrix(degrees * Math.PI / 180, axis), this._data);
        if (pivotPoint) {
            this.appendTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
        }
    }

    public appendTranslation(x: number, y: number, z: number): void {
        this._data = this.dotProduct([
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        ], this._data);
    }

    public appendScale(sX: number = 1, sY: number = 1, sZ: number = 1): void {
        this._data = this.dotProduct([
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            0, 0, 0, 1
        ], this._data);
    }

    public prepend(rhs: Matrix3D): void {
        this._data = this.dotProduct(this._data, rhs._data);
    }

    public prependRotation(degrees: number, axis: Vector3D, pivotPoint?: Vector3D): void {
        if (pivotPoint) {
            this.prependTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z);
        }
        this._data = this.dotProduct(this._data, this.rotationMatrix(degrees * Math.PI / 180, axis));
        if (pivotPoint) {
            this.prependTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z);
        }
    }

    public prependTranslation(x: number, y: number, z: number): void {
        this._data = this.dotProduct(this._data, [
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1
        ]);
    }

    public prependScale(sX: number, sY: number, sZ: number): void {
        this._data = this.dotProduct(this._data, [
            sX, 0, 0, 0,
            0, sY, 0, 0,
            0, 0, sZ, 0,
            0, 0, 0, 1
        ]);
    }

    public transformVector(v: Vector3D): Vector3D {
        var rx = this._data[0] * v.x + this._data[1] * v.y +
            this._data[2] * v.z + this._data[3] * v.w;
        var ry = this._data[4] * v.x + this._data[5] * v.y +
            this._data[6] * v.z + this._data[7] * v.w;
        var rz = this._data[8] * v.x + this._data[9] * v.y +
            this._data[10] * v.z + this._data[11] * v.w;
        var rw = this._data[12] * v.x + this._data[13] * v.y +
            this._data[14] * v.z + this._data[15] * v.w;
        return new Vector3D(rx, ry, rz, rw);
    }

    /**
     * Given an array of numbers representing vectors, postMultiply them to the current matrix.
     * @param vin - input (x,y,z)
     * @param vout - output (x,y,z)
     */
    public transformVectors(vin: Array<number>, vout: Array<number>): void {
        if (vin.length % 3 !== 0) {
            __trace('Matrix3D.transformVectors expects input size to be multiple of 3.', 'err');
            return;
        }
        for (var i = 0; i < vin.length / 3; i++) {
            var x = vin[i * 3], y = vin[i * 3 + 1], z = vin[i * 3 + 2];
            var rx = this._data[0] * x + this._data[1] * y + this._data[2] * z;
            var ry = this._data[4] * x + this._data[5] * y + this._data[6] * z;
            var rz = this._data[8] * x + this._data[9] * y + this._data[10] * z;
            vout.push(rx, ry, rz);
        }
    }

    public transpose(): void {
        this._data = [
            this._data[0], this._data[4], this._data[8], this._data[12],
            this._data[1], this._data[5], this._data[9], this._data[13],
            this._data[2], this._data[6], this._data[10], this._data[14],
            this._data[3], this._data[7], this._data[11], this._data[15]
        ];
    }

    public clone(): Matrix3D {
        return new Matrix3D(this._data);
    }

    public serialize(): Object {
        return this._data;
    }
}
export class Vector3D {
    public static X_AXIS: Vector3D = new Vector3D(1, 0, 0);
    public static Y_AXIS: Vector3D = new Vector3D(0, 1, 0);
    public static Z_AXIS: Vector3D = new Vector3D(0, 0, 1);
    public x: number;
    public y: number;
    public z: number;
    public w: number;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    public toString(): string {
        return '(x=' + this.x + ', y=' + this.y + ', z=' + this.z + ', w=' + this.w + ')';
    }
}
export function createMatrix(
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number): any {

    return new Matrix(a, b, c, d, tx, ty);
}

export function createMatrix3D(iv: Array<number>): any {
    return new Matrix3D(iv);
}

export function createGradientBox(
    width: number,
    height: number,
    rotation: number,
    tX: number,
    tY: number): Matrix {

    var m: Matrix = new Matrix();
    // Note: Magic number here is some flash scaling constant
    m.createGradientBox(width / 1638.4,
        height / 1638.4,
        rotation,
        tX + width / 2,
        tY + height / 2);
    return m;
}

export function createVector3D(x: number = 0,
    y: number = 0,
    z: number = 0,
    w: number = 0): any {

    return new Vector3D(x, y, z, w);
}

export function projectVector(matrix: Matrix3D, vector: Vector3D): any {
    return matrix.transformVector(vector);
}

export function projectVectors(matrix: Matrix3D,
    verts: Array<number>,
    projectedVerts: Array<number>,
    uvts: Array<number>): void {

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
    var transformed: Array<number> = [];
    matrix.transformVectors(verts, transformed);
    for (var i = 0; i < transformed.length / 3; i++) {
        var x = transformed[i * 3], y = transformed[i * 3 + 1];
        projectedVerts.push(x, y);
    }
}

export function createPoint(x: number = 0, y: number = 0): any {
    return new Point(x, y);
}

/**
 * Transforms a JS Array into an AS3 Vector<int>.
 *   Nothing is actually done since the methods are very
 *   similar across both.
 * @param {Array<number>} array - Array
 * @returns {Array<number>} - AS3 Integer Vector
 */
export function toIntVector(array: Array<number>): Array<number> {
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
 * @param {Array<number>} array - Array
 * @returns {Array<number>} - AS3 Number Vector
 */
export function toNumberVector(array: Array<number>): Array<number> {
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