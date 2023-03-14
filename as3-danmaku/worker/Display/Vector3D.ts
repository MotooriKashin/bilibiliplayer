export class Vector3D {
    static X_AXIS: Vector3D = new Vector3D(1, 0, 0);
    static Y_AXIS: Vector3D = new Vector3D(0, 1, 0);
    static Z_AXIS: Vector3D = new Vector3D(0, 0, 1);

    constructor(public x = 0, public y = 0, public z = 0, public w = 0) { }

    toString() {
        return '(x=' + this.x + ', y=' + this.y + ', z=' + this.z + ', w=' + this.w + ')';
    }
}