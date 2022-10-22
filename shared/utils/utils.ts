import { AnimationConfigWithData, AnimationConfigWithPath } from 'lottie-web/build/player/lottie_light';
import md5 from 'md5';

export interface IAjax {
    url: string;
    method?: string;
    contentType?: string;
    async?: boolean;
    withCredentials?: boolean;
    data?: any;
}

export interface IDownload {
    text: any;
    fileName: string;
    type?: string;
}

export const ibrowserPrefix = ['', '-webkit-', '-moz-', '-ms-'];

export function browserPrefix(key: string, val: string) {
    let css = '';
    for (let i = 0; i < browserPrefix.length; i++) {
        css += `${ibrowserPrefix[i] + key}: ${val};`;
    }
    return css;
}

export function getSessionID(): string {
    return md5(String(getCookie('buvid3') || Math.floor(Math.random() * 100000).toString(16)) + +new Date());
}

export function getSearchParam(name: string, url?: string): string | null {
    let searchIndex: number;
    let hashIndex: number;
    let searchString: string;
    if (typeof url === 'string') {
        searchIndex = url.indexOf('?');
        hashIndex = url.indexOf('#');
        if (searchIndex === -1) {
            searchString = '';
        } else if (hashIndex === -1) {
            searchString = url.slice(searchIndex, url.length);
        } else {
            searchString = url.slice(searchIndex, hashIndex);
        }
    } else {
        searchString = window.location.search;
    }
    const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)', 'i');
    const r = searchString.substr(1).match(reg);
    if (r != null) {
        try {
            return decodeURIComponent(r[2]);
        } catch (e) {
            return null;
        }
    }
    return null;
}

export function fmSeconds(sec: number): string {
    if (sec == null) {
        sec = 0;
    }
    let ret: string;
    sec = Math.floor(sec) >> 0;
    ret = ('0' + (sec % 60)).slice(-2);
    ret = Math.floor(sec / 60) + ':' + ret;
    if (ret.length < 5) {
        ret = '0' + ret;
    }
    return ret;
}

export function fmSecondsAPP(sec: number): string {
    if (sec == null) {
        sec = 0;
    }
    let ret: string;
    let second;
    let minute;
    let hour;
    sec = Math.floor(sec) >> 0;
    hour = Math.floor(sec / 3600);
    minute = Math.floor((sec - hour * 3600) / 60);
    second = sec - hour * 3600 - minute * 60;
    ret = `${hour ? hour + ':' : ''}${minute}:${('0' + second).slice(-2)}`;
    return ret;
}

export function colorFromInt(value: number): string {
    return '#' + ('00000' + value.toString(16)).slice(-6);
}

export function htmlEncode(str: string, hasSpace?: boolean, hasSpecial?: boolean) {
    if (!hasSpecial) {
        str = str
            .replace(/&/g, '')
            .replace(/</g, '')
            .replace(/>/g, '')
            .replace(/"/g, '')
            .replace(/'/g, '')
            .replace(/\//g, '')
            .replace(/:/g, '')
            .replace(/;/g, '');
    }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2f;')
        .replace(/ /g, hasSpace ? ' ' : '&nbsp;')
        .replace(/\n/g, '<br>');
}

export function isPlainObject(obj: any) {
    if (typeof obj !== 'object' || obj.nodeType || (obj !== null && obj !== undefined && obj === obj.window)) {
        return false;
    }

    if (obj.constructor && !Object.prototype.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf')) {
        return false;
    }

    return true;
}

export function qualityMap(quality: number): number {
    const mapping = {
        1: 16, // deprecated
        2: 64, // deprecated
        3: 80, // deprecated
        4: 112, // deprecated
        48: 64, // deprecated
    };
    return mapping[<keyof typeof mapping>quality] || quality;
}

export function getCookie(cookieName: string): string {
    const defaultResult = '';
    if (cookieName == null) {
        return defaultResult;
    }
    const cookies = document.cookie.split(';');
    const decodeCookieName = decodeURIComponent(cookieName);
    for (let i = 0; i < cookies.length; i++) {
        const [key, value] = cookies[i].trim().split('=');
        if (decodeURIComponent(key) === decodeCookieName) {
            return decodeURIComponent(value);
        }
    }
    return defaultResult;
}

export function setCookie(name: string, value: string, days: number = 365) {
    const date = new Date();
    const encodeName = encodeURIComponent(name);
    const encodeValue = encodeURIComponent(value);
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${encodeName}=${encodeValue}; expires=${date.toUTCString()}; path=/; domain=.bilibili.com`;
}

export function getLocalSettings(key: string): string | null {
    if (window.localStorage && localStorage.getItem) {
        return localStorage.getItem(key);
    } else {
        return getCookie(key);
    }
}

export function setLocalSettings(key: string, val: string) {
    if (window.localStorage && localStorage.setItem) {
        try {
            return localStorage.setItem(key, val);
        } catch (e) { }
    } else {
        return setCookie(key, val);
    }
}

export function fmDate(dateString: number | string): string {
    let date = new Date(dateString);
    // 兼容不同时区
    date = new Date(+date + (new Date().getTimezoneOffset() + 8 * 60) * 60 * 1000);
    const year = date.getFullYear() + '';
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}${month}${day}`;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (val: object, key: string | symbol) => hasOwnProperty.call(val, key);

export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object';

export function ajax(obj: IAjax) {
    return new Promise((resolve: (value?: any) => void, reject) => {
        const method = obj.method ? obj.method.toUpperCase() : 'GET';
        const async = obj.async ?? true;
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = obj.withCredentials ?? true;

        xhr.addEventListener('load', () => {
            resolve(xhr.response);
        });
        xhr.addEventListener('error', () => {
            reject(xhr);
        });
        xhr.addEventListener('abort', () => {
            reject(xhr);
        });
        if (method === 'POST') {
            xhr.open(method, obj.url, async);
            xhr.setRequestHeader('Content-type', obj.contentType || 'application/x-www-form-urlencoded');
            xhr.send(obj.data);
        } else if (method === 'GET') {
            const data = obj.data ? `?${objToStr(obj.data)}` : '';
            const url = `${obj.url}${data}`;
            xhr.open(method, url, async);
            xhr.send();
        } else {
            xhr.open(method, obj.url);
            xhr.send();
        }
    });
}

export function objToStr(obj: any) {
    let oStr = '';
    for (let key in obj) {
        oStr += `${key}=${obj[key]}&`;
    }
    return oStr.slice(0, -1);
}

export const browser = {
    get version() {
        const ua = navigator.userAgent.toLowerCase();
        const isSafari =
            /(webkit)[ \/]([\w.]+).*(version)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.test(ua) ||
            /(version)(applewebkit)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.test(ua);
        const match = /(chrome)[ \/]([\w.]+)/.exec(ua) || '';
        const matched = {
            browser: match[5] || match[3] || match[1] || '',
            version: match[4] || match[2] || '0',
        };
        let version = 0;
        if (matched.browser) {
            version = parseInt(matched.version, 10);
        }
        return {
            // 浏览器
            browser: matched.browser,
            version: version,

            // 系统
            linux: /Linux/i.test(ua),
            tesla: /Tesla/i.test(ua),

            // 内核
            webKit: /AppleWebKit/i.test(ua),
            gecko: /Gecko/i.test(ua) && !/KHTML/i.test(ua),
            trident: /Trident/i.test(ua),
            presto: /Presto/i.test(ua),

            // 手机
            mobile: /AppleWebKit.*Mobile.*/i.test(ua),
            iOS: /Mac OS X[\s_\-\/](\d+[.\-_]\d+[.\-_]?\d*)/i.test(ua),
            iPhone: /iPhone/i.test(ua),
            iPad: /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
            webApp: !/Safari/i.test(ua),
            android: /Android/i.test(ua),
            windowsPhone: /Windows Phone/i.test(ua),
            microMessenger: /MicroMessenger/i.test(ua),

            // 桌面
            msie: /msie [\w.]+/i.test(ua),
            edge: /edge/i.test(ua),
            edgeBuild16299: /(\s|^)edge\/16.16299(\s|$)/i.test(ua),
            safari: isSafari,
            safariSupportMSE: isSafari && /Version\/1\d/i.test(ua),

            firefox: /Firefox/i.test(ua),
        };
    },
    get isMobile() {
        return (
            browser.version.mobile ||
            browser.version.iOS ||
            browser.version.android ||
            browser.version.windowsPhone
        );
    },
    get supportAudioContext() {
        return (
            (window.AudioContext || window.webkitAudioContext) &&
            (window.OfflineAudioContext || window.webkitOfflineAudioContext) &&
            !browser.version.firefox &&
            !browser.version.safari
        );
    },
};

export const base64 = {
    encode(str: string) {
        // first we use encodeURIComponent to get percent-encoded UTF-8,
        // then we convert the percent encodings into raw bytes which
        // can be fed into btoa.
        return btoa(
            encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
                return String.fromCharCode(Number('0x' + p1));
            }),
        );
    },
    decode(str: string) {
        // Going backwards: from bytestream, to percent-encoding, to original string.
        return decodeURIComponent(
            atob(str)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join(''),
        );
    },
};

export function extend(deep = false, target: Record<string, any> = {}, ...arg: any): any {
    if (isNotObj(target)) {
        target = {};
    }
    if (arg && arg.length) {
        let options = arg.shift();
        if (isNotObj(options)) {
            options = {};
        }
        let value;
        for (const key in options) {
            if (Object.prototype.hasOwnProperty.call(options, key)) {
                value = options[key];
                if (deep && !isNotObj(value)) {
                    if (Array.isArray(value)) {
                        if (!Array.isArray(target[key])) {
                            target[key] = [];
                        }
                        target[key] = extend(true, target[key], value);
                    } else {
                        if (isNotObj(target[key])) {
                            target[key] = {};
                        }
                        target[key] = extend(true, target[key], value);
                    }
                } else {
                    target[key] = value;
                }
            }
        }

        if (arg.length) {
            return extend(deep, target, ...arg);
        } else {
            return target;
        }
    } else {
        return target;
    }
}

export function isNotObj(obj: any) {
    return obj === null || typeof obj !== 'object';
}

export function throttle(fn: Function, delay: number) {
    let flag = true;
    return (...arg: any) => {
        // 开关打开时，执行任务
        if (flag) {
            fn(...arg);
            flag = false;
            // delay时间之后，任务开关打开
            setTimeout(() => {
                flag = true;
            }, delay);
        }
    };
}

export function isSupportWebGL() {
    let canvas = document.createElement('canvas');
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null;
    let debugInfo: WEBGL_debug_renderer_info | null;
    let vendor = '';
    let renderer = '';
    try {
        gl =
            canvas.getContext('webgl2') ||
            canvas.getContext('webgl') ||
            <WebGLRenderingContext | null>canvas.getContext('experimental-webgl');
        if (gl) {
            debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        }
    } catch (e) {
        console.warn(e);
    }
    return !!(renderer || vendor);
}

export function dateParser(date: string, timeZone?: number): number | false {
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
        timeZone = timeZone || 0;
        const [y, m, d] = date.split('-');
        return (
            +new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)) * (1 / 1000) -
            (new Date().getTimezoneOffset() + timeZone * 60) * 60
        );
    } else {
        return false;
    }
}

export function getSessionSettings(key: string): string | null {
    if (window.sessionStorage && sessionStorage.getItem) {
        return sessionStorage.getItem(key);
    } else {
        return getCookie(key);
    }
}

export function setSessionSettings(key: string, val: string) {
    if (window.sessionStorage && sessionStorage.setItem) {
        try {
            return sessionStorage.setItem(key, val);
        } catch (e) {
            console.warn(e);
        }
    } else {
        return setCookie(key, val);
    }
}

export function colorToDecimal(color: string): Number {
    if (color[0] === '#') {
        color = color.substr(1);
    }
    if (color.length === 3) {
        color = `${color[0]}${color[0]}${color[1]}${color[1]}${color[2]}${color[2]}`;
    }
    return (parseInt(color, 16) + 0x000000) & 0xffffff;
}

export function formatDate(date: Date | null, format?: string): string {
    date = date || new Date();
    format = format || 'yyyy-MM-dd mm:ss';
    const mapping = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'h+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S+': date.getMilliseconds(),
    };
    if (/(y+)/i.test(format)) {
        format = format.replace(
            RegExp.$1,
            date
                .getFullYear()
                .toString()
                .substr(4 - RegExp.$1.length),
        );
    }
    for (const k in mapping) {
        if (new RegExp(`(${k})`).test(format)) {
            const n =
                RegExp.$1.length === 1 ? mapping[<keyof typeof mapping>k] : ('00' + mapping[<keyof typeof mapping>k]).substr(mapping[<keyof typeof mapping>k].toString().length);
            format = format.replace(RegExp.$1, <any>n);
        }
    }
    return format;
}

export function thumbnail(url: string, width: number, height?: number, qc: boolean = true): string {
    height = height || width;
    // 暂存 url 中查询参数，拼到 url 最后
    const queryString = getQueryString(url);
    url = removeQueryString(url);
    // 检查 url 是否符合 bfs 规范，若不合法，直接返回url
    if (!validateBfsUrl(removeBfsParams(url))) {
        return appendQueryString(url, queryString);
    }
    // 移除 url 中 @ 后的 bfs 参数
    url = removeBfsParams(url);
    // 设置宽高
    url = setSize(url, width, height, qc);
    // 设置 url 后缀名
    url = setUrlExt(url);
    url = appendQueryString(url, queryString);
    return url;
}

function getQueryString(url: string) {
    let queryString = '';
    if (url && url.split) {
        queryString = url.split('?')[1];
    }
    return queryString;
}

function removeQueryString(url: string) {
    let trimmedUrl = url;
    if (url && url.slice && url.indexOf) {
        const pos = url.indexOf('?');
        if (pos > -1) {
            trimmedUrl = url.slice(0, pos);
        }
    }
    return trimmedUrl;
}

function validateBfsUrl(url: string) {
    // url 是否为 string
    if (!url || typeof url !== 'string') {
        return false;
    }
    // 文件格式是否支持
    const supportedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (supportedExts.indexOf(getUrlExt(url)!) === -1) {
        return false;
    }
    // 路径是否包含 /bfs/
    if (url.indexOf('/bfs/') === -1) {
        return false;
    }
    return true;
}

function removeBfsParams(url: string) {
    let trimmedUrl = url;
    if (url && url.slice && url.indexOf) {
        const pos = url.indexOf('@');
        if (pos > -1) {
            trimmedUrl = url.slice(0, pos);
        }
    }
    return trimmedUrl;
}

function appendQueryString(url: string, queryString: string) {
    return queryString && queryString !== '' ? `${url}?${queryString}` : url;
}

function setSize(url: string, width: number, height: number, qc?: boolean) {
    // 设置宽高
    if (isNumeric(width) && width > 0) {
        url = appendUrlParam(url, 'w', Math.round(width));
    }
    if (isNumeric(height) && height > 0) {
        url = appendUrlParam(url, 'h', Math.round(height));
    }
    if (qc) {
        url = appendUrlParam(url, 'Q', 100);
        url = appendUrlParam(url, 'c', 1);
    }
    return url;
}

export function fmSecondsReverse(format: string): number {
    if (format == null) {
        return 0;
    }
    const secArr = format.toString().split(':').reverse();
    if (!secArr.length) {
        return 0;
    } else {
        return (
            (parseInt(secArr[0], 10) || 0) +
            (parseInt(secArr[1], 10) || 0) * 60 +
            (parseInt(secArr[2], 10) || 0) * 3600
        );
    }
}

function setUrlExt(url: string) {
    const ext = getUrlExt(removeBfsParams(url));
    let newExt = ext;
    if (ext !== 'gif' && canUseWebP()) {
        newExt = 'webp';
    }
    if (!hasUrlParams(url) && ext !== newExt) {
        url += `@.${newExt}`;
    } else if (hasUrlParams(url)) {
        url += `.${newExt}`;
    }
    // url = url.replace(RegExp('\.' + ext + '$'), `.${ext}`)
    return url;
}

function getUrlExt(url: string) {
    if (url && url.split) {
        return url.split('.').pop()!.toLowerCase();
    }
}

function canUseWebP() {
    try {
        const canvas = document.createElement('canvas');
        if (canvas.getContext && canvas.getContext('2d')) {
            try {
                // 某些 Android 浏览器不兹词 toDataURL.
                return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            } catch (error) {
                return false;
            }
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

function hasUrlParams(url: string) {
    return url.indexOf('@') > -1;
}

function appendUrlParam(url: string, param: string, value: number) {
    url += url.indexOf('@') === -1 ? '@' : '_';
    url += value + param;
    return url;
}

function isNumeric(n: number | string) {
    return !isNaN(parseFloat(<string>n)) && isFinite(<number>n);
}

export function formatNum(n: number | string) {
    const num = parseInt(<string>n, 10);
    if (num < 0 || n == null || n === undefined) {
        return '--';
    }
    if (String(n).indexOf('.') !== -1 || String(n).indexOf('-') !== -1) {
        return n;
    }
    if (num === 0) {
        return 0;
    }
    n = num;
    if (n >= 10000 && n < 100000000) {
        return (n / 10000).toFixed(n % 10000 > 500 && n % 10000 < 9500 ? 1 : 0) + '万';
    } else if (n >= 100000000) {
        return (n / 100000000).toFixed(n % 1e8 > 5e6 && n % 1e8 < 9.5e7 ? 1 : 0) + '亿';
    } else {
        return n;
    }
}

export function download(o: IDownload) {
    const obj: IDownload = $.extend(
        {
            text: '',
            type: 'text/plain;charset=utf-8',
            fileName: 'text.txt',
        },
        o,
    );
    const blob = new Blob([obj.text], { type: obj.type });
    if (window['navigator']['msSaveOrOpenBlob']) {
        // For IE
        navigator['msSaveBlob']!(blob, obj.fileName);
    } else {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link['download'] = obj.fileName;
        link.style.display = 'none';
        link.target = '_blank';
        link.click();
        window['setTimeout'](() => {
            //  Remove unnecessary nodes and recycle the memory of blob
            link.remove();
            window.URL.revokeObjectURL(link.href);
        }, 3000);
    }
}

export function upload(callback: Function) {
    // const uploader: any = $('<input type="file">');
    const uploader = <HTMLInputElement>document.createElement('input');
    uploader.setAttribute('type', 'file');
    (() => {
        uploader.click();
    })();
    const reImport = () => {
        const reader = new FileReader();
        reader.readAsText(uploader['files']![0]);
        reader.onload = () => {
            callback(reader);
        };
    };
    if (!browser.version.trident && !browser.version.edge) {
        uploader.addEventListener('change', () => {
            reImport();
        });
    } else {
        // IE系的浏览器因为浏览器本身的bug无法用click()触发input元素的change事件,这里做下处理.
        window['setTimeout'](() => {
            if (uploader.getAttribute('value')!.length > 0) {
                reImport();
            }
        }, 0);
    }
}

export function strLength(text: string, max: number) {
    let strLen = 0;
    let str = '';
    if (text) {
        const list = text.split('');
        let len = 0;
        for (let i = 0; i < list.length; i++) {
            if (text.charCodeAt(i) > 255) {
                len = 2;
            } else {
                len = 1;
            }
            if (strLen + len > 2 * max) {
                break;
            }
            str += list[i];
            strLen += len;
        }
    }
    return {
        len: Math.ceil(strLen / 2),
        str,
    };
}

/**
 * 随机区间
 */
export function random(start: number, end: number) {
    return start + (Math.floor(Math.random() * 100) * (end - start)) / 100;
}

export function shuffle<T>(array: T[], copy?: boolean): T[] {
    let len = array.length;
    const prime = copy ? array.slice() : array;

    while (len) {
        const randomIndex = Math.floor(Math.random() * len);
        const buffer = prime[--len];
        prime[len] = prime[randomIndex];
        prime[randomIndex] = buffer;
    }

    return prime;
}

export function parseUrl(param: string): { [key: string]: string } {
    if (!param) {
        return {};
    }
    let list = param.split('?');
    const obj = {
        url: list[0],
    };
    const search = list[1];

    if (search) {
        list = search.split('&');
        let ele;
        list.forEach((item: string) => {
            ele = item.split('=');
            obj[<'url'>ele[0]] = ele[1];
        });
    }
    return obj;
}

export function getBit(target: number, digit: number) {
    return target.toString && +target.toString(2)[target.toString(2).length - digit];
}

export function getDecoder() {
    if (window['TextDecoder']) {
        return new window['TextDecoder']();
    }

    return {
        decode: (buf: any) =>
            decodeURIComponent(window['escape'](String.fromCharCode.apply(String, <any>new Uint8Array(buf)))),
    };
}

export function bindAll(arr: string[], context: any) {
    for (let i = 0; i < arr.length; i += 1) {
        if (context[arr[i]]) {
            context[arr[i]] = context[arr[i]].bind(context);
        }
    }
}

export function createLottieAnimation(options: AnimationConfigWithPath | AnimationConfigWithData) {
    options.container.innerHTML = '';
    return window['lottie'].loadAnimation({
        renderer: 'svg',
        loop: false,
        autoplay: false,
        ...options,
    });
}

export function noop() { }

export function timeParser(str: string): number | false {
    const t = /^(\d+h)?(\d+m|^s)?(\d+s)?(\d+ms)?$/.exec(str);
    const getNum = function (s: string): number {
        return parseInt(s, 10) || 0;
    };
    if (t && t[0]) {
        return getNum(t[1]) * 60 * 60 + getNum(t[2]) * 60 + getNum(t[3]) + getNum(t[4]) / 1000;
    } else if (parseFloat(str) >= 0 || parseFloat(str) === -1) {
        return parseFloat(str);
    } else {
        return false;
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Navigator {
        msSaveOrOpenBlob?: typeof Blob;
        msSaveBlob?: (target: Blob, fileName?: string) => void;
    }
}