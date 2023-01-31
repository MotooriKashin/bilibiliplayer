import { __pchannel, __trace } from "../OOAPI";
import { DisplayObject } from "./DisplayObject";
import { Matrix } from "./Matrix";

export class Graphics {
    protected lineWidth = 1;

    constructor(protected parent: DisplayObject) { }

    /**
     * protected method to re-evaluate a bounding box for the parent
     * @param x x coordinate of point
     * @param y y coordinate of point
     */
    protected _evaluateBoundingBox(x: number, y: number) {
        this.parent.boundingBox.unionCoord(x + this.lineWidth / 2,
            y + this.lineWidth / 2);
    }

    /**
     * protected method to call a drawing method
     * @param method method name
     * @param params parameters to the method
     */
    protected _callDrawMethod(method: string, params: any) {
        __pchannel('Runtime:CallMethod', {
            'id': this.parent.getId(),
            'context': 'graphics',
            'method': method,
            'params': params
        });
    }

    /**
     * Line to point
     * @param x x coordinate
     * @param y y coordinate
     */
    public lineTo(x: number, y: number) {
        this._evaluateBoundingBox(x, y);
        this._callDrawMethod('lineTo', [x, y]);
    }

    /**
     * Move to point
     * @param x x coordinate
     * @param y y coordinate
     */
    public moveTo(x: number, y: number) {
        this._evaluateBoundingBox(x, y);
        this._callDrawMethod('moveTo', [x, y]);
    }

    /**
     * Quadratic Beizer Curve
     * @param cx Control point x
     * @param cy Control point y
     * @param ax Anchor x
     * @param ay Anchor y
     */
    public curveTo(cx: number, cy: number, ax: number, ay: number) {
        this._evaluateBoundingBox(ax, ay);
        this._evaluateBoundingBox(cx, cy);
        this._callDrawMethod('curveTo', [cx, cy, ax, ay]);
    }

    /**
     * Cubic Beizer Curve
     * @param cax Control point A x
     * @param cay Control point A y
     * @param cbx Control point B x
     * @param cby Control point B y
     * @param ax Anchor x
     * @param ay Anchor y
     */
    public cubicCurveTo(cax: number,
        cay: number,
        cbx: number,
        cby: number,
        ax: number,
        ay: number) {

        this._evaluateBoundingBox(cax, cay);
        this._evaluateBoundingBox(cbx, cby);
        this._evaluateBoundingBox(ax, ay);
        this._callDrawMethod('cubicCurveTo', [cax, cay, cbx, cby, ax, ay]);
    }

    /**
     * Set line style
     * @param thickness line thickness
     * @param color line color (default 0)
     * @param alpha alpha (default 1)
     * @param hinting pixel hinting (default false)
     * @param scale scale mode (default "normal")
     * @param caps line cap mode (default "none")
     * @param joints line joint mode (default "round")
     * @param miterlim miter limit (default 3)
     */
    public lineStyle(thickness: number,
        color = 0,
        alpha = 1.0,
        hinting = false,
        scale = 'normal',
        caps = 'none',
        joints = 'round',
        miter = 3) {

        this.lineWidth = thickness;
        this._callDrawMethod('lineStyle', [thickness, color, alpha, caps, joints, miter]);
    }

    /**
     * Draw a rectangle
     * @param x x coordinate
     * @param y y coordinate
     * @param w width
     * @param h height
     */
    public drawRect(x: number, y: number, w: number, h: number) {
        this._evaluateBoundingBox(x, y);
        this._evaluateBoundingBox(x + w, y + h);
        this._callDrawMethod('drawRect', [x, y, w, h]);
    }

    /**
     * Draws a circle
     * @param x center x
     * @param y center y
     * @param r radius
     */
    public drawCircle(x: number, y: number, r: number) {
        this._evaluateBoundingBox(x - r, y - r);
        this._evaluateBoundingBox(x + r, y + r);
        this._callDrawMethod('drawCircle', [x, y, r]);
    }

    /**
     * Draws an ellipse
     * @param cx center x
     * @param cy center y
     * @param w width
     * @param h height
     */
    public drawEllipse(cx: number, cy: number, w: number, h: number) {
        this._evaluateBoundingBox(cx - w / 2, cy - h / 2);
        this._evaluateBoundingBox(cx + w / 2, cy + h / 2);
        this._callDrawMethod('drawEllipse', [cx + w / 2, cy + h / 2, w / 2, h / 2]);
    }

    /**
     * Draws a rounded rectangle
     * @param x x coordinate
     * @param y y coordinate
     * @param w width
     * @param h height
     * @param elw ellipse corner width
     * @param elh ellipse corner height
     */
    public drawRoundRect(x: number,
        y: number,
        w: number,
        h: number,
        elw: number,
        elh: number) {

        this._evaluateBoundingBox(x, y);
        this._evaluateBoundingBox(x + w, y + h);
        this._callDrawMethod('drawRoundRect', [x, y, w, h, elw, elh]);
    }

    /**
     * Executes a list of drawing commands with their data given in the data array
     * @param commands Commands by index
     * @param data List of data
     * @param winding evenOdd or nonZero
     */
    public drawPath(commands: Array<number>, data: Array<number>, winding = "evenOdd") {
        /** TODO: Evaluate bounding box **/
        this._callDrawMethod('drawPath', [commands, data, winding]);
    }

    /**
     * Fill next shape with solid color
     * @param color color RGB values
     * @param alpha alpha value
     */
    public beginFill(color: number, alpha = 1.0) {
        this._callDrawMethod('beginFill', [color, alpha]);
    }

    /**
     * Gradient Fill Not Supported yet
     */
    public beginGradientFill(fillType: string,
        colors: Array<number>,
        alphas: Array<number>,
        ratios: Array<number>,
        matrix?: Matrix,
        spreadMethod = 'pad',
        interpolationMethod = 'rgb',
        focalPointRatio = 0): void {

        __trace('Graphics.beginGradientFill still needs work.', 'warn');
        if (fillType !== 'linear' && fillType !== 'radial') {
            __trace('Graphics.beginGradientFill unsupported fill type : ' +
                fillType, 'warn');
            return;
        }
        this._callDrawMethod('beginGradientFill', [
            fillType,
            colors,
            alphas,
            ratios,
            matrix ? matrix.serialize : null,
            spreadMethod,
            interpolationMethod,
            focalPointRatio]);
    }

    /**
     * Shader Fill Not Supported yet
     */
    public beginShaderFill(shader: any, matrix: Matrix) {
        __trace('Graphics.beginShaderFill not supported.', 'warn');
    }

    /**
     * Stop and finalize fill
     */
    public endFill() {
        this._callDrawMethod('endFill', []);
    }

    /**
     * Given a list of vertices (and optionally indices). Draws triangles to the screen
     * @param verts Vertices (x,y) as a list
     * @param indices ndices for positions in verts[2 * i], verts[2 * i + 1]
     * @param uvtData Texture mapping stuff. Not supported any time soon.
     * @param culling "none" shows all triangles, "positive"/"negative" will cull triangles by normal along z-axis
     */
    public drawTriangles(verts: Array<number>,
        indices?: Array<number>,
        uvtData?: Array<number>,
        culling = 'none') {

        if (!indices) {
            indices = [];
            for (let i = 0; i < verts.length; i += 2) {
                indices.push(i / 2);
            }
        } else {
            indices = indices.slice(0);
        }
        if (indices.length % 3 !== 0) {
            __trace('Graphics.drawTriangles malformed indices count. ' +
                'Must be multiple of 3.', 'err');
            return;
        }
        /** Do culling of triangles here to lessen work later **/
        if (culling !== 'none') {
            for (let i = 0; i < indices.length / 3; i++) {
                const ux = verts[2 * indices[i * 3 + 1]] - verts[2 * indices[i * 3]],
                    uy = verts[2 * indices[i * 3 + 1] + 1] - verts[2 * indices[i * 3] + 1],
                    vx = verts[2 * indices[i * 3 + 2]] - verts[2 * indices[i * 3 + 1]],
                    vy = verts[2 * indices[i * 3 + 2] + 1] - verts[2 * indices[i * 3 + 1] + 1];
                const zcomp = ux * vy - vx * uy;
                if (zcomp < 0 && culling === 'positive' ||
                    zcomp > 0 && culling === 'negative') {
                    /** Remove the indices. Leave the vertices. **/
                    indices.splice(i * 3, 3);
                    i--;
                }
            }
        }
        /** Update the bounding box **/
        for (let i = 0; i < indices.length; i++) {
            this._evaluateBoundingBox(verts[2 * indices[i]], verts[2 * indices[i] + 1]);
        }
        this._callDrawMethod('drawTriangles', [verts, indices, culling]);
    }

    /**
     * Clears everything the current graphics context has drawn
     */
    public clear() {
        this.parent.boundingBox.setEmpty();
        this._callDrawMethod('clear', []);
    }
}