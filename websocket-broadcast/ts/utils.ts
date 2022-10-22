/**
 *  Danmaku WebSocket UTILS
 */
const UTILS = {
    getDecoder: () => {
        if (window.TextDecoder) {
            return new window.TextDecoder();
        }
        return {
            decode: (buf: any) =>
                decodeURIComponent(
                    // @ts-ignore
                    window.escape(String.fromCharCode.apply(String, new Uint8Array(buf))),
                ),
        };
    },
    getEncoder: () => {
        if (window.TextEncoder) {
            return new window.TextEncoder();
        }

        return {
            encode: (str: string) => {
                const buf = new ArrayBuffer(str.length), // 每个字符占用2个字节
                    bufView = new Uint8Array(buf);

                for (let i = 0, strLen = str.length; i < strLen; i++) {
                    bufView[i] = str.charCodeAt(i);
                }
                return buf;
            },
        };
    },
    mergeArrayBuffer(arrayBuffer1: any, arrayBuffer2: any) {
        const unit8Array1 = new Uint8Array(arrayBuffer1),
            unit8Array2 = new Uint8Array(arrayBuffer2),
            res = new Uint8Array(unit8Array1.byteLength + unit8Array2.byteLength);

        res.set(unit8Array1, 0);
        res.set(unit8Array2, unit8Array1.byteLength);

        return res.buffer;
    },
    callFunction: (func: Function, data?: any) => {
        if (func instanceof Array && func.length) {
            func.forEach((fn) => typeof fn === 'function' && fn(data));
        } else {
            return typeof func === 'function' && func(data);
        }

        return null;
    },
    extend: (target: any, ...args: any) => {
        const res = target || {};

        if (res instanceof Object) {
            args.forEach((obj: any) => {
                if (obj instanceof Object) {
                    Object.keys(obj).forEach((key) => {
                        res[key] = obj[key];
                    });
                }
            });
        }

        return res;
    },
};

export default UTILS;
