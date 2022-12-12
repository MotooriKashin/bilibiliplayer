// danmaku uhash to mid
// @see MoePus {@link https://moepus.oicp.net/2016/11/27/crccrack}
// @see esterTion {@link https://github.com/esterTion/BiliBili_crc2mid}
// @license GFUL

export class UHash {
    private static CRCPOLYNOMIAL = 0xEDB88320;
    private static crctable = new Array(256);
    private static create_table() {
        let crcreg,
            i,
            j;
        for (i = 0; i < 256; ++i) {
            crcreg = i;
            for (j = 0; j < 8; ++j) {
                if ((crcreg & 1) !== 0) {
                    crcreg = this.CRCPOLYNOMIAL ^ (crcreg >>> 1);
                } else {
                    crcreg >>>= 1;
                }
            }
            this.crctable[i] = crcreg;
        }
        this.tableCreated = true;
    }
    private static tableCreated = false;
    private index = new Array(4);
    constructor() {
        UHash.tableCreated || UHash.create_table();
    }
    /** uhash(crc32) -> mid */
    decode(input: string) {
        let ht = parseInt('0x' + input) ^ 0xffffffff,
            snum,
            i,
            lastindex,
            deepCheckData;
        for (i = 3; i >= 0; i--) {
            this.index[3 - i] = this.getcrcindex(ht >>> (i * 8));
            snum = UHash.crctable[this.index[3 - i]];
            ht ^= snum >>> ((3 - i) * 8);
        }
        for (i = 0; i < 10000000; i++) {
            lastindex = this.crc32lastindex(<any>i);
            if (lastindex == this.index[3]) {
                deepCheckData = this.deepCheck(i, this.index);
                if (deepCheckData[0]) break;
            }
        }
        if (i == 10000000) return -1;
        return Number(i + '' + (<(string | number)[]>deepCheckData)[1]);
    }
    /** mid -> uhash(crc32) */
    encode(input: number | string) {
        return (((this.crc32(String(input)) + 1) * -1) >>> 0).toString(16)
    }
    private getcrcindex(t: number) {
        for (let i = 0; i < 256; i++) if (UHash.crctable[i] >>> 24 == t) return i;
        return -1;
    }
    private crc32lastindex(input: string) {
        if (typeof (input) != 'string') input = (<any>input).toString();
        let crcstart = 0xFFFFFFFF,
            len = input.length,
            index;
        for (let i = 0; i < len; ++i) {
            index = (crcstart ^ input.charCodeAt(i)) & 0xff;
            crcstart = (crcstart >>> 8) ^ UHash.crctable[index];
        }
        return index;
    }
    private deepCheck(i: number, index: number[]) {
        let tc = 0x00,
            str = '',
            hash = this.crc32(<any>i);
        tc = hash & 0xff ^ index[2];
        if (!(tc <= 57 && tc >= 48)) return [0];
        str += tc - 48;
        hash = UHash.crctable[index[2]] ^ (hash >>> 8);
        tc = hash & 0xff ^ index[1];
        if (!(tc <= 57 && tc >= 48)) return [0];
        str += tc - 48;
        hash = UHash.crctable[index[1]] ^ (hash >>> 8);
        tc = hash & 0xff ^ index[0];
        if (!(tc <= 57 && tc >= 48)) return [0];
        str += tc - 48;
        hash = UHash.crctable[index[0]] ^ (hash >>> 8);
        return [1, str];
    }
    private crc32(input: string) {
        if (typeof (input) != 'string') input = (<any>input).toString();
        let crcstart = 0xFFFFFFFF,
            len = input.length,
            index;
        for (let i = 0; i < len; ++i) {
            index = (crcstart ^ input.charCodeAt(i)) & 0xff;
            crcstart = (crcstart >>> 8) ^ UHash.crctable[index];
        }
        return crcstart;
    }
}