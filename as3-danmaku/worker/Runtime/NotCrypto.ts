class Rc4 {
    protected _s: number[] = [];
    constructor(key: number[]) {
        for (var i = 0; i < 256; i++) {
            this._s[i] = i;
        }
        var j = 0;
        for (var i = 0; i < 256; i++) {
            j = j + this._s[i] + key[i % key.length] % 256;
            var m = this._s[i];
            this._s[i] = this._s[j];
            this._s[j] = m;
        }
    }
}
export class NotCrypto {
    static _rngState = [
        Math.floor(Date.now() / 1024) % 1024,
        Date.now() % 1024
    ];
    static xorshift128p() {
        var s0 = this._rngState[1], s1 = this._rngState[0];
        this._rngState[0] = s0;
        s1 ^= s1 << 23;
        s1 ^= s1 >> 17;
        s1 ^= s0;
        s1 ^= s0 >> 26;
        this._rngState[1] = s1;
    }
    static random(bits: number = 16) {
        if (bits === void 0) { bits = 16; }
        if (bits > 32) {
            throw new Error('NotCrypto.random expects 32 bits or less');
        }
        if (Math && Math.random) {
            var value = 0;
            for (var i = 0; i < bits; i++) {
                value = (value << 1) + (Math.random() < 0.5 ? 0 : 1);
            }
            return value;
        }
        else {
            return this.fallbackRandom(Date.now() % 1024, bits);
        }
    }
    static fallbackRandom(seed: number, bits = 16) {
        if (bits === void 0) { bits = 16; }
        if (bits > 32) {
            throw new Error('NotCrypto.fallbackRandom expects 32 bits or less');
        }
        for (var i = 0; i < seed; i++) {
            this.xorshift128p();
        }
        var mask = 0;
        for (var i = 0; i < bits; i++) {
            mask = (mask << 1) + 1;
        }
        return (this._rngState[0] + this._rngState[1]) & mask;
    }
    static toHex(value: number, length: number) {
        if (length === void 0) { length = 0; }
        if (length <= 0) {
            return value.toString(16);
        }
        var base = value.toString(16);
        while (base.length < length) {
            base = '0' + base;
        }
        return base;
    }
}