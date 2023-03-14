import { Point } from "./Point";

export class Rectangle {
    constructor(public x = 0,
        public y = 0,
        public width = 0,
        public height = 0) {
    }
    get left() {
        return this.x;
    }
    get right() {
        return this.x + this.width;
    }
    get top() {
        return this.y;
    }
    get bottom() {
        return this.y + this.height;
    }
    get size() {
        return new Point(this.width, this.height);
    }
    contains(x: number, y: number) {
        return x >= this.left &&
            y >= this.top &&
            x <= this.right &&
            y <= this.bottom;
    }
    containsPoint(p: Point) {
        return this.contains(p.x, p.y);
    }
    containsRect(r: Rectangle) {
        return this.contains(r.left, r.top) && this.contains(r.right, r.bottom);
    }
    copyFrom(source: Rectangle) {
        this.x = source.x;
        this.y = source.y;
        this.width = source.width;
        this.height = source.height;
    }
    equals(other: Rectangle) {
        return this.x === other.x &&
            this.y === other.y &&
            this.width === other.width &&
            this.height === other.height;
    }
    inflate(dx: number = 0, dy: number = 0) {
        this.x -= dx;
        this.width += 2 * dx;
        this.y -= dy;
        this.height += 2 * dy;
    }
    inflatePoint(p: Point) {
        this.inflate(p.x, p.y);
    }
    isEmpty() {
        return this.width <= 0 || this.height <= 0;
    }
    setTo(x: number = 0,
        y: number = 0,
        width: number = 0,
        height: number = 0): void {

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    offset(x: number = 0, y: number = 0) {
        this.x += x;
        this.y += y;
    }
    offsetPoint(p: Point) {
        this.offset(p.x, p.y);
    }
    setEmpty() {
        this.setTo(0, 0, 0, 0);
    }
    /**
     * 根据坐标生成矩形
     * @param x 横坐标
     * @param y 纵坐标
     */
    unionCoord(x: number, y: number) {
        const dx = x - this.x;
        const dy: number = y - this.y;
        if (dx >= 0) {
            this.width = Math.max(this.width, dx);
        } else {
            this.x += dx;
            this.width -= dx;
        }
        if (dy >= 0) {
            this.height = Math.max(this.height, dy);
        } else {
            this.y += dy;
            this.height -= dy;
        }
    }
    unionPoint(p: Point) {
        this.unionCoord(p.x, p.y);
    }
    union(r: Rectangle) {
        const n = this.clone();
        n.unionCoord(r.left, r.top);
        n.unionCoord(r.right, r.bottom);
        return n;
    }
    toString() {
        return "(x=" + this.x + ", y=" + this.y + ", width=" + this.width +
            ", height=" + this.height + ")";
    }
    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }
    serialize() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}