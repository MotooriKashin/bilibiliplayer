/**
* Class that represents a 2d point
*/
export class Point {
    static interpolate(a: Point, b: Point, f: number) {
        return new Point((b.x - a.x) * f + a.x, (b.y - a.y) * f + a.y);
    }
    static polar(r: number, theta: number) {
        return new Point(r * Math.cos(theta), r * Math.sin(theta));
    }
    constructor(public x = 0, public y = 0) { }
    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    add(p: Point) {
        return new Point(p.x + this.x, p.y + this.y);
    }
    subtract(p: Point) {
        return new Point(this.x - p.x, this.y - p.y);
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