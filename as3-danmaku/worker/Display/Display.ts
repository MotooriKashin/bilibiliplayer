import { debug } from "../../debug";
import { __pchannel } from "../OOAPI";
import { IComment, Player } from "../Player/player";
import { Utils } from "../Utils";
import { BitmapData } from "./BitmapData";
import { ColorTransform } from "./ColorTransform";
import { CommentBitmap } from "./CommentBitmap";
import { CommentButton } from "./CommentButton";
import { CommentCanvas } from "./CommentCanvas";
import { CommentField } from "./CommentField";
import { CommentShape } from "./CommentShape";
import { BevelFilter, BlurFilter, ColorMatrixFilter, ConvolutionFilter, DisplacementMapFilter, DropShadowFilter, GlowFilter, GradientBevelFilter, GradientGlowFilter } from "./Filter";
import { Matrix } from "./Matrix";
import { IMatrix3DData, Matrix3D } from "./Matrix3D";
import { Point } from "./Point";
import { Rectangle } from "./Rectangle";
import { Simple2D } from "./Simple2D";
import { RootSprite } from "./Sprite";
import { TextField } from "./TextField";
import { TextFormat } from "./TextFormat";
import { Vector3D } from "./Vector3D";

export const Display = new (class {
    root = new RootSprite();
    loaderInfo: unknown;
    _frameRate = 24;
    get version() {
        return Player.version;
    }
    get fullScreenWidth() {
        return Player.screenWidth;
    }
    get fullScreenHeight() {
        return Player.screenHeight;
    }
    get screenWidth() {
        return Player.screenWidth;
    }
    get screenHeight() {
        return Player.screenHeight;
    }
    get stageWidth() {
        return Player.width;
    }
    get stageHeight() {
        return Player.height;
    }
    get width() {
        return Player.videoWidth;
    }
    get height() {
        return Player.videoHeight;
    }
    get stage() {
        return this.root;
    }
    get frameRate() {
        return this._frameRate;
    }
    set frameRate(v) {
        this._frameRate = v;
        __pchannel("Display:SetFrameRate", v);
    }
    toString() {
        return "[display Display]";
    }

    createMatrix(a?: number, b?: number, c?: number, d?: number, tx?: number, ty?: number) {
        return new Matrix(a, b, c, d, tx, ty);
    }
    createGradientBox(width: number, height: number, rotation: number, tX: number, tY: number) {
        return new Matrix().createGradientBox(width, height, rotation, tX, tY);
    }
    createPoint(x?: number, y?: number) {
        return new Point(x, y);
    }
    createComment(text: string, params: IComment) {
        return new CommentField(text, params);
    }
    createShape(params: IComment) {
        return new CommentShape(params);
    }
    createCanvas(params: IComment) {
        return new CommentCanvas(params);
    }
    createButton(params: IComment) {
        return new CommentButton(params);
    }
    createGlowFilter(
        color = 16711680,
        alpha = 1.0,
        blurX = 6.0,
        blurY = 6.0,
        strength = 2,
        quality = 1,
        inner = false,
        knockout = false
    ) {
        return new GlowFilter(color, alpha, blurX, blurY, strength, quality, inner, knockout);
    }
    createBlurFilter(blurX = 4.0, blurY = 4.0, quality = 1) {
        return new BlurFilter(blurX, blurY, quality);
    }
    toIntVector(array: number[]) {
        Object.defineProperty(array, 'as3Type', {
            get: function () {
                return 'Vector<int>';
            }
        });
        return array.map(Math.floor);
    }
    toUIntVector(array: number[]) {
        Object.defineProperty(array, 'as3Type', {
            get: function () {
                return 'Vector<uint>';
            }
        });
        return array.map(Math.floor);
    }
    toNumberVector(array: number[]) {
        Object.defineProperty(array, 'as3Type', {
            get: function () {
                return 'Vector<number>';
            }
        });
        return array;
    }
    createMatrix3D(iv: IMatrix3DData) {
        return new Matrix3D(iv);
    }
    createColorTransform(
        redMultiplier = 1.0,
        greenMultiplier = 1.0,
        blueMultiplier = 1.0,
        alphaMultiplier = 1.0,
        redOffset = 0,
        greenOffset = 0,
        blueOffset = 0,
        alphaOffset = 0
    ) {
        return new ColorTransform(redMultiplier, greenMultiplier, blueMultiplier, alphaMultiplier, redOffset, greenOffset, blueOffset, alphaOffset);
    }
    createTextFormat(
        font?: string,
        size?: number,
        color?: number,
        bold?: boolean,
        italic?: boolean,
        underline?: boolean,
        url?: string,
        target?: string,
        align?: string,
        leftMargin?: number,
        rightMargin?: number,
        indent?: number,
        leading?: number
    ) {
        return new TextFormat(font, size, color, bold, italic, underline, url, target, align, leftMargin, rightMargin, indent, leading);
    }
    createVector3D(x = 0.0, y = 0.0, z = 0.0, w = 0.0) {
        return new Vector3D(x, y, z, w)
    }
    createTextField() {
        return new TextField("");
    }
    createBevelFilter(
        distance?: number,
        angle?: number,
        highlightColor?: number,
        highlightAlpha?: number,
        shadowColor?: number,
        shadowAlpha?: number,
        blurX?: number,
        blurY?: number,
        strength?: number,
        quality?: number,
        type?: string,
        knockout?: boolean
    ) {
        return new BevelFilter(distance, angle, highlightColor, highlightAlpha, shadowColor, shadowAlpha, blurX, blurY, strength, quality, type, knockout);
    }
    createColorMatrixFilter(matrix?: number[]) {
        return new ColorMatrixFilter(matrix);
    }
    createConvolutionFilter(
        matrixX?: number,
        matrixY?: number,
        _matrix?: number[],
        divisor?: number,
        bias?: number,
        preserveAlpha?: boolean,
        clamp?: boolean,
        color?: number,
        alpha?: number) {
        return new ConvolutionFilter(matrixX, matrixY, _matrix, divisor, bias, preserveAlpha, clamp, color, alpha);
    }
    createDisplacementMapFilter(
        mapBitmap?: BitmapData,
        mapPoint?: Point,
        componentX?: number,
        componentY?: number,
        scaleX?: number,
        scaleY?: number,
        mode?: string,
        color?: number,
        alpha?: number
    ) {
        return new DisplacementMapFilter(mapBitmap, mapPoint, componentX, componentY, scaleX, scaleY, mode, color, alpha);
    }
    createDropShadowFilter(
        distance = 4.0,
        angle = 45,
        color = 0,
        alpha = 1.0,
        blurX = 4.0,
        blurY = 4.0,
        strength = 1.0,
        quality = 1,
        inner = false,
        knockout = false,
        hideObject = false
    ) {
        return new DropShadowFilter(distance, angle, color, alpha, blurX, blurY, strength, quality, inner, knockout, hideObject);
    }
    createGradientBevelFilter(
        distance = 4.0,
        angle = 45,
        colors: number[] = [],
        alphas: number[] = [],
        ratios: number[] = [],
        blurX = 4.0,
        blurY = 4.0,
        strength = 1,
        quality = 1,
        type = "inner",
        knockout = false
    ) {
        return new GradientBevelFilter(distance, angle, colors, alphas, ratios, blurX, blurY, strength, quality, type, knockout);
    }
    createGradientGlowFilter(
        distance = 4.0,
        angle = 45,
        colors: number[] = [],
        alphas: number[] = [],
        ratios: number[] = [],
        blurX = 4.0,
        blurY = 4.0,
        strength = 1,
        quality = 1,
        type = "inner",
        knockout = false
    ) {
        return new GradientGlowFilter(distance, angle, colors, alphas, ratios, blurX, blurY, strength, quality, type, knockout);
    }
    pointTowards(
        percent: Number,
        mat: Matrix3D,
        pos: Vector3D,
        at?: Vector3D,
        up?: Vector3D
    ) {
        // TODO：return Matrix3D
    }
    projectVector(matrix: Matrix3D, vector: Vector3D) {
        return matrix.transformVector(vector);
    }
    projectVectors(matrix: Matrix3D,
        verts: number[],
        projectedVerts: number[],
        uvts: number[]) {

        /** Clear projected Verts **/
        while (projectedVerts.length > 0) {
            projectedVerts.pop();
        }
        if (verts.length % 3 !== 0) {
            debug.warn(
                'Display.projectVectors input vertex Vector must be a multiple of 3.');
            return;
        }
        const transformed: Array<number> = [];
        matrix.transformVectors(verts, transformed);
        for (let i = 0; i < transformed.length / 3; i++) {
            const x = transformed[i * 3], y = transformed[i * 3 + 1];
            projectedVerts.push(x, y);
        }
    }
    createBitmapData(width: number,
        height: number,
        transparent = true,
        fillColor = 0xffffffff) {

        return new BitmapData(width, height, transparent, fillColor);
    }
    createBitmap(params: IComment) {
        return new CommentBitmap(params);
    }
    createParticle({ obj, radius = 200 }: any) {
        if (!obj) return;
        const iParticleStart = Utils.getTimer();
        const pic = obj;
        const Arr_tp: Simple2D[] = [];
        let Out = 0;
        const bm = new BitmapData(pic.width, pic.height);
        bm.draw(pic);
        const bm1 = new BitmapData(pic.width + radius * 2, pic.height + radius * 2, true, 0);
        const bms = new CommentBitmap(<any>{ bitmapData: bm1 });
        this.stage.addChild(bms)
        bms.x = 0;
        bms.y = 0;
        let i = 0;
        while (i < pic.width) {
            let j = 0;
            while (j < pic.height) {
                if (bm.getPixel32(i, j) != 0) {
                    bm1.setPixel32(i + radius, j + radius, bm.getPixel32(i, j));
                    const tp = new Simple2D(i + radius, j + radius, (Math.random() - Math.random()) * 5, (Math.random() - Math.random()) * 5, 0.5 + Math.random() * 5, bm.getPixel32(i, j));
                    Arr_tp.push(tp);
                }
                j++;
            }
            i++;
        }
        // bm.dispose();
        const rect = new Rectangle(0, 0, bms.width, bms.height);
        const loop = () => {
            bm1.lock();
            // bm1.fillRect(rect, 0);
            let i = 0;
            while (i < Arr_tp.length) {
                const d = Arr_tp[i];
                if (!d.isOut) {
                    d.update();
                    if (d.valid(bm1)) {
                        Out++;
                    }
                    bm1.setPixel32(d.x, d.y, d.Allcolor);
                }
                i++;
            }
            bm1.unlock();
            if (Out / Arr_tp.length > 0.8) {
                debug.log("Particle Done @ " + (Utils.getTimer() - iParticleStart));
                bms.removeEventListener('enterFrame', loop);
                bms.remove();
                // bm1.dispose();
            }
        }
        bms.addEventListener('enterFrame', loop);
        return bms;
    }
})();