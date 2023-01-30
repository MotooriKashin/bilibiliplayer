import { Bitmap, BitmapData } from "./Bitmap";
import { ByteArray } from "./ByteArray";
import { ColorTransform, createColorTransform } from "./ColorTransform";
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

    accessor root = new RootSprite();
    accessor loaderInfo: unknown;
    accessor version = '';
    accessor width = 0;
    accessor height = 0;
    accessor fullScreenWidth = 0;
    accessor fullScreenHeight = 0;

    _frameRate: number = 24;

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
    constructor() {
        __schannel("Update:DimensionUpdate", function (payload) {
            this.width = payload["stageWidth"];
            this.height = payload["stageHeight"];
            if (payload.hasOwnProperty("screenWidth") && payload.hasOwnProperty("screenHeight")) {
                this.fullScreenWidth = payload["screenWidth"];
                this.fullScreenHeight = payload["screenHeight"];
            }
        });
    }
}