export class ColorTransform {
    constructor(public redMultiplier = 1,
        public greenMultiplier = 1,
        public blueMultiplier = 1,
        public alphaMultiplier = 1,
        public redOffset = 0,
        public greenOffset = 0,
        public blueOffset = 0,
        public alphaOffset = 0) {
    }

    get color() {
        return this.redOffset << 16 | this.greenOffset << 8 | this.blueOffset;
    }

    set color(color: number) {
        this.redOffset = ((color >> 16) & 0xFF);
        this.greenOffset = ((color >> 8) & 0xFF);
        this.blueOffset = color & 0xFF;
        this.redMultiplier = 0;
        this.greenMultiplier = 0;
        this.blueMultiplier = 0;
    }

    concat(second: ColorTransform) {
        this.redMultiplier *= second.redMultiplier;
        this.greenMultiplier *= second.greenMultiplier;
        this.blueMultiplier *= second.blueMultiplier;
        this.alphaMultiplier *= second.alphaMultiplier;
        this.redOffset += second.redOffset;
        this.greenOffset += second.greenOffset;
        this.blueOffset += second.blueOffset;
        this.alphaOffset += second.alphaOffset;
    }

    serialize() {
        return {
            'class': 'ColorTransform',
            'red': {
                'offset': this.redOffset,
                'multiplier': this.redMultiplier
            },
            'green': {
                'offset': this.greenOffset,
                'multiplier': this.greenMultiplier
            },
            'blue': {
                'offset': this.blueOffset,
                'multiplier': this.blueMultiplier
            },
            'alpha': {
                'offset': this.alphaOffset,
                'multiplier': this.alphaMultiplier
            }
        };
    }
}

export function createColorTransform(redMultiplier = 1,
    greenMultiplier = 1,
    blueMultiplier = 1,
    alphaMultiplier = 1,
    redOffset = 0,
    greenOffset = 0,
    blueOffset = 0,
    alphaOffset = 0) {

    return new ColorTransform(redMultiplier,
        greenMultiplier,
        blueMultiplier,
        alphaMultiplier,
        redOffset,
        greenOffset,
        blueOffset,
        alphaOffset);
}