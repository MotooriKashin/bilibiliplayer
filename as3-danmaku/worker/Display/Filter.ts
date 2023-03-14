import { BitmapData } from "./BitmapData";
import { Point } from "./Point";

export class Filter {
    class = 'Filter';
    type = 'nullfilter';
    get params() {
        return this
    }
    serialize(): Record<string, any> {
        return {
            class: 'Filter',
            type: 'nullfilter'
        };
    }
}
export class BlurFilter extends Filter {
    type = 'blur';
    constructor(public blurX = 4.0, public blurY = 4.0, public quality = 1) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'blur';
        s['params'] = {
            blurX: this.blurX,
            blurY: this.blurY
        }
        return s;
    }
}
export class GlowFilter extends Filter {
    type = 'glow';
    constructor(public color = 16711680,
        public alpha = 1.0,
        public blurX = 6.0,
        public blurY = 6.0,
        public strength = 2,
        public quality?: number,
        public inner = false,
        public knockout = false) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'glow';
        s['params'] = {
            color: this.color,
            alpha: this.alpha,
            blurX: this.blurX,
            blurY: this.blurY,
            strength: this.strength,
            inner: this.inner,
            knockout: this.knockout
        };
        return s;
    }
}
export class DropShadowFilter extends Filter {
    type = 'dropShadow';
    constructor(public distance = 4.0,
        public angle = 45,
        public color = 0,
        public alpha = 1,
        public blurX = 4.0,
        public blurY = 4.0,
        public strength = 1.0,
        public quality = 1,
        public inner = false,
        public knockout = false,
        public hideObject = false
    ) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'dropShadow';
        s['params'] = {
            distance: this.distance,
            angle: this.angle,
            color: this.color,
            blurY: this.blurY,
            strength: this.strength,
            inner: this.inner,
            knockout: this.knockout
        };
        return s;
    }
}
export class ConvolutionFilter extends Filter {
    type = 'convolution';
    get matrix() {
        return {
            x: this.matrixX,
            y: this.matrixY,
            data: this._matrix
        }
    }
    constructor(public matrixX = 0,
        public matrixY = 0,
        public _matrix?: number[],
        public divisor = 1.0,
        public bias = 0.0,
        public preserveAlpha = true,
        public clamp = true,
        public color = 0,
        public alpha = 0.0) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'convolution';
        s['matrix'] = {
            x: this.matrixX,
            y: this.matrixY,
            data: this.matrix
        };
        s['divisor'] = this.divisor;
        s['preserveAlpha'] = this.preserveAlpha;
        s['clamp'] = this.clamp;
        s['color'] = this.color;
        s['alpha'] = this.alpha;
        return s;
    }
}
export class BevelFilter extends Filter {
    constructor(
        public distance = 4.0,
        public angle = 45,
        public highlightColor = 16777215,
        public highlightAlpha = 1.0,
        public shadowColor = 0,
        public shadowAlpha = 1.0,
        public blurX = 4.0,
        public blurY = 4.0,
        public strength = 1,
        public quality = 1,
        public type = "inner",
        public knockout = false
    ) {
        super()
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'inner';
        s['params'] = {
            distance: this.distance,
            angle: this.angle,
            blurX: this.blurX,
            blurY: this.blurY,
            strength: this.strength,
            knockout: this.knockout,
            color: this.highlightColor,
            alpha: this.highlightAlpha
        };
        s['color'] = this.shadowColor;
        s['alpha'] = this.shadowAlpha;
        return s;
    }
}
export class ColorMatrixFilter extends Filter {
    constructor(public matrix: number[] = []) {
        super()
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'colormatrix';
        s['matrix'] = this.matrix;
        return s;
    }
}
export class DisplacementMapFilter extends Filter {
    constructor(
        public mapBitmap?: BitmapData,
        public mapPoint?: Point,
        public componentX = 0,
        public componentY = 0,
        public scaleX = 0.0,
        public scaleY = 0.0,
        public mode = "wrap",
        public color = 0,
        public alpha = 0.0
    ) {
        super()
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'displacementmap';
        s['params'] = {
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            componentX: this.componentX,
            componentY: this.componentY,
            mode: this.mode
        };
        s['color'] = this.color;
        s['alpha'] = this.alpha;
        return s;
    }
}
export class GradientBevelFilter extends Filter {
    constructor(
        public distance = 4.0,
        public angle = 45,
        public colors: number[] = [],
        public alphas: number[] = [],
        public ratios: number[] = [],
        public blurX = 4.0,
        public blurY = 4.0,
        public strength = 1,
        public quality = 1,
        public type = "inner",
        public knockout = false
    ) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'inner';
        s['params'] = {
            distance: this.distance,
            angle: this.angle,
            blurX: this.blurX,
            blurY: this.blurY,
            strength: this.strength,
            knockout: this.knockout,
        };
        return s;
    }
}
export class GradientGlowFilter extends Filter {
    constructor(
        public distance = 4.0,
        public angle = 45,
        public colors: number[] = [],
        public alphas: number[] = [],
        public ratios: number[] = [],
        public blurX = 4.0,
        public blurY = 4.0,
        public strength = 1,
        public quality = 1,
        public type = "inner",
        public knockout = false
    ) {
        super();
    }
    serialize() {
        const s = super.serialize();
        s['type'] = 'inner';
        s['params'] = {
            distance: this.distance,
            angle: this.angle,
            blurX: this.blurX,
            blurY: this.blurY,
            strength: this.strength,
            knockout: this.knockout,
        };
        return s;
    }
}