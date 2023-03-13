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
    get red() {
        return {
            offset: this.redOffset,
            multiplier: this.redMultiplier
        }
    }
    get green() {
        return {
            offset: this.greenOffset,
            multiplier: this.greenMultiplier
        }
    }
    get blue() {
        return {
            offset: this.blueOffset,
            multiplier: this.blueMultiplier
        }
    }
    get alpha() {
        return {
            offset: this.alphaOffset,
            multiplier: this.alphaMultiplier
        }
    }
}