type IMatrixData = [number, number, number, number, number, number, number, number, number];
/**
 * Matrix class to represent a 2d transformation matrix. This matrix will be
 * 3x3 with 9 configurable values.
 */
export class Matrix {
    _data: IMatrixData;
    constructor(public a = 1, public b = 0, public c = 0, public d = 1, public tx = 0, public ty = 0) {
        this._data = [a, c, tx, b, d, ty, 0, 0, 1];
    }
    private dotProduct(o: IMatrixData) {
        if (o.length < 9) {
            throw new Error('Matrix dot product expects a 3x3 Matrix');
        }
        const res: IMatrixData = [0, 0, 0, 0, 0, 0, 0, 0, 0];
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
}