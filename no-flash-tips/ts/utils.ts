const utils = {
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

    getRandomID: (len = 8) => {
        const str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';

        for (let i = 0; i < len; i++) {
            id += str.charAt(Math.floor(Math.random() * str.length));
        }
        return id;
    },

    callFunction: (func: any, data: any) => {
        if (func instanceof Array && func.length) {
            func.forEach((fn) => typeof fn === 'function' && fn(data));
        } else {
            return typeof func === 'function' && func(data);
        }

        return null;
    },

    bindElemResize(elem: any, callback: Function) {
        if (!(elem && elem.getBoundingClientRect)) {
            return false;
        }

        let latestWidth = 0,
            latestHeight = 0;

        function resize() {
            const rect = elem.getBoundingClientRect(),
                width = rect.width,
                height = rect.height;

            if (!(width === latestWidth && height === latestHeight)) {
                latestWidth = width;
                latestHeight = height;

                typeof callback === 'function' && callback(width, height);
            }
        }
        document.addEventListener('scroll', resize);
        window.addEventListener('resize', resize);
        return resize;
    },
};

export default utils;
