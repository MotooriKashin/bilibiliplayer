/**
 * @see https://github.com/sindresorhus/screenfull.js
 * Modify for project
 */
/*!
 * screenfull
 * v3.0.0 - 2015-11-24
 * (c) Sindre Sorhus; MIT License
 */
interface IFullscreen {
    requestFullscreen?: string;
    exitFullscreen?: string;
    fullscreenElement?: string;
    fullscreenEnabled?: string;
    fullscreenchange?: string;
    fullscreenerror?: string;
}

const fn: IFullscreen = (() => {
    let val;
    let valLength;

    const fnMap = [
        [
            'requestFullscreen',
            'exitFullscreen',
            'fullscreenElement',
            'fullscreenEnabled',
            'fullscreenchange',
            'fullscreenerror',
        ],
        // new WebKit
        [
            'webkitRequestFullscreen',
            'webkitExitFullscreen',
            'webkitFullscreenElement',
            'webkitFullscreenEnabled',
            'webkitfullscreenchange',
            'webkitfullscreenerror',
        ],
        // old WebKit (Safari 5.1)
        [
            'webkitRequestFullScreen',
            'webkitCancelFullScreen',
            'webkitCurrentFullScreenElement',
            'webkitCancelFullScreen',
            'webkitfullscreenchange',
            'webkitfullscreenerror',
        ],
        [
            'mozRequestFullScreen',
            'mozCancelFullScreen',
            'mozFullScreenElement',
            'mozFullScreenEnabled',
            'mozfullscreenchange',
            'mozfullscreenerror',
        ],
        [
            'msRequestFullscreen',
            'msExitFullscreen',
            'msFullscreenElement',
            'msFullscreenEnabled',
            'MSFullscreenChange',
            'MSFullscreenError',
        ],
    ];

    const l = fnMap.length;
    const ret: any = {};

    for (let i = 0; i < l; i++) {
        val = fnMap[i];
        if (val && val[1] in document) {
            for (let i = 0, valLength = val.length; i < valLength; i++) {
                ret[fnMap[0][i]] = val[i];
            }
            return ret;
        }
    }
    return false;
})();

const keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;
const reDocument: any = document;

const screenfull = {
    request(elem: any) {
        const request = fn['requestFullscreen'];

        elem = elem || document.documentElement;

        // Work around Safari 5.1 bug: reports support for
        // keyboard in fullscreen even though it doesn't.
        // Browser sniffing, since the alternative with
        // setTimeout is even worse.
        if (/5\.1[\.\d]* Safari/.test(navigator.userAgent)) {
            elem[request!]();
        } else {
            try {
                const reElement: any = Element;
                elem[request!](keyboardAllowed ? reElement['ALLOW_KEYBOARD_INPUT'] : {});
            } catch (error) {
                elem[request!]();
            }
        }
    },
    exit(elem: any) {
        (elem || document)[fn['exitFullscreen']!]();
    },
    toggle(elem: any) {
        if ((elem || document)[fn['fullscreenElement']!]) {
            this.exit(elem);
        } else {
            this.request(elem);
        }
    },
    judgeFullscreen(elem: any) {
        return Boolean((elem || document)[fn['fullscreenElement']!]);
    },
    enabled: Boolean(reDocument[fn['fullscreenEnabled']!]),
    raw: fn,
};

Object.defineProperties(screenfull, {
    isFullscreen: {
        get() {
            return Boolean(reDocument[fn['fullscreenElement']!]);
        },
    },
    element: {
        enumerable: true,
        get() {
            return reDocument[fn['fullscreenElement']!];
        },
    },
    enabled: {
        enumerable: true,
        get() {
            // Coerce to boolean in case of old WebKit
            return Boolean(reDocument[fn['fullscreenEnabled']!]);
        },
    },
});

export default screenfull;
