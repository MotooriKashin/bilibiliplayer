import { __pchannel, __schannel } from "../OOAPI";
import { Bitmap, BitmapData } from "./Bitmap";
import { ByteArray } from "./ByteArray";
import { ColorTransform, createColorTransform } from "./ColorTransform";
import { createBitmap, createParticle, createBitmapData } from "./CommentBitmap";
import { createButton } from "./CommentButton";
import { createCanvas } from "./CommentCanvas";
import { createComment, createTextField } from "./CommentField";
import { createShape } from "./CommentShape";
import { BlendMode, Rectangle, DisplayObject } from "./DisplayObject";
import { Filter, createDropShadowFilter, createGlowFilter, createBlurFilter, createBevelFilter, createConvolutionFilter, createDisplacementMapFilter, createGradientBevelFilter, createGradientGlowFilter, createColorMatrixFilter } from "./Filter";
import { Graphics } from "./Graphics";
import { createGradientBox, createMatrix, createMatrix3D, createPoint, createVector3D, Matrix, Matrix3D, Point, projectVector, projectVectors, toIntVector, toNumberVector, Vector3D } from "./Matrix";
import { MotionManager } from "./MotionManager";
import { Shape } from "./Shape";
import { Sprite, RootSprite, UIComponent } from "./Sprite";
import { createTextFormat, TextField } from "./TextField";
import { PerspectiveProjection, Transform } from "./Transform";

export class Display {
    static Point = Point;
    static Matrix = Matrix;
    static Matrix3D = Matrix3D;
    static Vector3D = Vector3D;
    static createMatrix = createMatrix;
    static createMatrix3D = createMatrix3D;
    static createGradientBox = createGradientBox;
    static createVector3D = createVector3D;
    static projectVector = projectVector;
    static projectVectors = projectVectors;
    static createPoint = createPoint;
    static toIntVector = toIntVector;
    static toNumberVector = toNumberVector;
    static ColorTransform = ColorTransform;
    static createColorTransform = createColorTransform;
    static PerspectiveProjection = PerspectiveProjection;
    static Transform = Transform;
    static Filter = Filter;
    static createDropShadowFilter = createDropShadowFilter;
    static createGlowFilter = createGlowFilter;
    static createBlurFilter = createBlurFilter;
    static createBevelFilter = createBevelFilter;
    static createConvolutionFilter = createConvolutionFilter;
    static createDisplacementMapFilter = createDisplacementMapFilter;
    static createGradientBevelFilter = createGradientBevelFilter;
    static createGradientGlowFilter = createGradientGlowFilter;
    static createColorMatrixFilter = createColorMatrixFilter;
    static BlendMode = BlendMode;
    static Rectangle = Rectangle;
    static DisplayObject = DisplayObject;
    static Graphics = Graphics;
    static Sprite = Sprite;
    static RootSprite = RootSprite;
    static UIComponent = UIComponent;
    static ByteArray = ByteArray;
    static Bitmap = Bitmap;
    static BitmapData = BitmapData;
    static MotionManager = MotionManager;
    static createButton = createButton;
    static createCanvas = createCanvas;
    static Shape = Shape;
    static createShape = createShape;
    static TextField = TextField;
    static createTextFormat = createTextFormat;
    static createComment = createComment;
    static createTextField = createTextField;
    static createBitmap = createBitmap;
    static createParticle = createParticle;
    static createBitmapData = createBitmapData;

    static root = new RootSprite();
    static loaderInfo: unknown;
    static version = '';
    static width = 0;
    static height = 0;
    static fullScreenWidth = 0;
    static fullScreenHeight = 0;

    static _frameRate: number = 24;

    static get stage() {
        return this.root;
    }
    static get frameRate() {
        return this._frameRate;
    }
    static set frameRate(v) {
        this._frameRate = v;
        __pchannel("Display:SetFrameRate", v);
    }
    static toString() {
        return "[display Display]";
    }
}

__schannel("Update:DimensionUpdate", (payload: any) => {
    Display.width = payload["stageWidth"];
    Display.height = payload["stageHeight"];
    if (payload.hasOwnProperty("screenWidth") && payload.hasOwnProperty("screenHeight")) {
        Display.fullScreenWidth = payload["screenWidth"];
        Display.fullScreenHeight = payload["screenHeight"];
    }
});