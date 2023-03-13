import { debug } from "../../debug";
import { Vector3D } from "./Vector3D";

export type IMatrix3DData = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];

/**
 * Matrix class to represent a 3d transformation matrix. Such a matrix will be
 * 4x4 containing 16 configurable values.
 * API-compatible with AS3 class of same name.
 */
export class Matrix3D {
    constructor(public _data: IMatrix3DData = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) {
        if (_data.length !== 16) {
            this.identity();
        }
    }
    private dotProduct(a: IMatrix3DData, b: IMatrix3DData) {
        if (a.length !== 16 || b.length !== 16) {
            throw new Error('Matrix3D dot product expects a 4xr Matrix3D');
        }
        const res: IMatrix3DData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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
        return <IMatrix3DData>[
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
            debug.error('Matrix3D.transformVectors expects input size to be multiple of 3.');
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
}