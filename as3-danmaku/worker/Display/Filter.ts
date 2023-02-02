export interface IFilter {
    class: string;
    type?: string;
    params?: Record<string, any>;
    matrix?: Record<string, any>;
    divisor?: number;
    preserveAlpha?: boolean;
    clamp?: boolean;
    color?: number;
    alpha?: number;
}
export class Filter {
    serialize() {
        return <IFilter>{
            'class': 'Filter',
            'type': 'nullfilter'
        };
    }
}

class BlurFilter extends Filter {
    constructor(protected blurX = 4.0, protected blurY = 4.0) {
        super();
    }

    serialize() {
        const s = super.serialize();
        s['type'] = 'blur';
        s['params'] = {
            'blurX': this.blurX,
            'blurY': this.blurY
        }
        return s;
    }
}

class GlowFilter extends Filter {
    constructor(protected color = 16711680,
        protected alpha = 1.0,
        protected blurX = 6.0,
        protected blurY = 6.0,
        protected strength = 2,
        protected quality?: number,
        protected inner = false,
        protected knockout = false) {
        super();
    }

    serialize() {
        const s = super.serialize();
        s['type'] = 'glow';
        s['params'] = {
            'color': this.color,
            'alpha': this.alpha,
            'blurX': this.blurX,
            'blurY': this.blurY,
            'strength': this.strength,
            'inner': this.inner,
            'knockout': this.knockout
        };
        return s;
    }
}

class DropShadowFilter extends Filter {
    protected inner = false;
    protected knockout = false;
    constructor(protected distance: number = 4.0,
        protected angle: number = 45,
        protected color: number = 0,
        protected alpha: number = 1,
        protected blurX: number = 4.0,
        protected blurY: number = 4.0,
        protected strength: number = 1.0,
        protected quality: number = 1) {
        super();
    }

    serialize() {
        const s = super.serialize();
        s['type'] = 'dropShadow';
        s['params'] = {
            'distance': this.distance,
            'angle': this.angle,
            'color': this.color,
            'blurY': this.blurY,
            'strength': this.strength,
            'inner': this.inner,
            'knockout': this.knockout
        };
        return s;
    }
}

class ConvolutionFilter extends Filter {
    constructor(protected matrixX = 0,
        protected matrixY = 0,
        protected matrix?: number[],
        protected divisor = 1.0,
        protected bias = 0.0,
        protected preserveAlpha = true,
        protected clamp = true,
        protected color = 0,
        protected alpha = 0.0) {
        super();
    };

    serialize() {
        const s = super.serialize();
        s['type'] = 'convolution';
        s['matrix'] = {
            'x': this.matrixX,
            'y': this.matrixY,
            'data': this.matrix
        };
        s['divisor'] = this.divisor;
        s['preserveAlpha'] = this.preserveAlpha;
        s['clamp'] = this.clamp;
        s['color'] = this.color;
        s['alpha'] = this.alpha;
        return s;
    }
}

export function createDropShadowFilter(
    distance = 4.0,
    angle = 45,
    color = 0,
    alpha = 1,
    blurX = 4.0,
    blurY = 4.0,
    strength = 1.0,
    quality = 1): any {

    return new DropShadowFilter(distance, angle, color, alpha, blurX, blurY, strength, quality);
}

export function createGlowFilter(
    color = 16711680,
    alpha = 1.0,
    blurX = 6.0,
    blurY = 6.0,
    strength = 2,
    quality?: number,
    inner = false,
    knockout = false): any {

    return new GlowFilter(color, alpha, blurX, blurY, strength, quality, inner, knockout);
}

export function createBlurFilter(
    blurX = 6.0,
    blurY = 6.0,
    strength = 2): any {

    return new BlurFilter(blurX, blurY);
}

export function createBevelFilter() {
    throw new Error('Display.createBevelFilter not implemented');
}

export function createConvolutionFilter(matrixX = 0,
    matrixY = 0,
    matrix?: number[],
    divisor = 1.0,
    bias = 0.0,
    preserveAlpha = true,
    clamp = true,
    color = 0,
    alpha = 0.0) {

    return new ConvolutionFilter(matrixX, matrixY, matrix, divisor, bias, preserveAlpha, clamp, color, alpha);
}

export function createDisplacementMapFilter() {
    throw new Error('Display.createDisplacementMapFilter not implemented');
}

export function createGradientBevelFilter() {
    throw new Error('Display.createGradientBevelFilter not implemented');
}

export function createGradientGlowFilter() {
    throw new Error('Display.createGradientGlowFilter not implemented');
}

export function createColorMatrixFilter() {
    throw new Error('Display.createColorMatrixFilter not implemented');
}