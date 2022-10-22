interface IAjax {
    method: string;
    url: string;
    type?: string;
    async?: boolean;
    withCredentials?: boolean;
    data?: any;
}
interface IUtils {
    hashManage: IHashManage;
    _iframe?: HTMLIFrameElement;
    cookie: IUtilsCookie;
    localStorage: IUtilslocalStorage;
    storageTimer?: number;
    isUndefined: (obj: {}) => boolean;
    ChatGetSettings: (key: string) => string | null | number;
    ChatSaveSettings: (key: string, val: string | number, days?: number) => void;
    ChatRemoveSettings: (key: string) => void;
    loadLocalStorage: (callback: Function) => void;
    getLocalStorage: (name: string) => string | null | number;
    setLocalStorage: (name: string, value: string | number) => void;
    removeLocalStorage: (name: string) => void;
    GetUrlValue: (name: string) => string | null;
    getIPCrc: (ip: any) => void;
    getHiddenProp: () => string | null;
    _getHiddenProp?: () => string;
    isDocumentHidden: () => {};
    cloneDeep: (obj: {}, deep: boolean) => {};
    loadScript: (options: IOptions, windows?: Window) => void;
    parseConfig: (obj: any, key: string, val: any) => void;
    defaultSearch: (param?: string) => {};
    objToStr: (obj: any) => string;
    ajax: (obj: IAjax) => Promise<any>;
}

interface IHashManage {
    prependHash: string;
    _change: (key: string, value: string | boolean | null) => Record<PropertyKey, any> | string | number;
    get: (key: string) => string | number;
    set: (key: string, value: string) => Record<PropertyKey, any>;
    clear: () => void;
}

interface IUtilsCookie {
    get: (cookieName: string) => string;
    decode: (value: string) => string;
    set: (name: string, value: string | boolean | number, days?: number | undefined) => void;
    delete: (name: string) => void;
}

interface IUtilslocalStorage {
    _support: boolean;
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string | number) => void;
    removeItem: (key: string) => void;
}

interface IOptions {
    url: string;
    success: () => void;
    error?: () => void;
}

export const utils: IUtils = {
    hashManage: {
        prependHash: '!',
        _change(key: string, value: string | boolean | null) {
            let hash = location.hash,
                hashArray: any[] = [],
                hashString = '',
                index = 0,
                keys: any;
            const hashMap: Record<string, any> = {};
            if (hash) {
                hash = hash.substring(1);
                if (this.prependHash) {
                    hash = hash.replace(
                        new RegExp(`^${this.prependHash.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}`),
                        '',
                    );
                }
            }
            hashArray = hash.split('&');
            for (let i = 0; i < hashArray.length; i++) {
                const k = hashArray[i].split('=')[0],
                    v = hashArray[i].split('=')[1];
                if (k) {
                    hashMap[k] = decodeURIComponent(v);
                }
            }

            if (typeof key === 'object') {
                keys = Object.keys(key).length;
                for (let j = 0; j < keys; j++) {
                    const val = key[keys[j]];
                    if (val) {
                        hashMap[keys[j]] = encodeURIComponent(val);
                    } else if (val === false) {
                        delete hashMap[keys[j]];
                    }
                }
            } else if (value) {
                hashMap[key] = encodeURIComponent('' + value);
            } else if (value === false) {
                delete hashMap[key];
            } else if (typeof key === 'undefined') {
                return hashMap;
            } else {
                return hashMap[key] || null;
            }

            keys = Object.keys(hashMap);
            for (let k = 0; k < keys.length; k++) {
                if (index !== 0) {
                    hashString += '&';
                } else {
                    hashString += this.prependHash;
                }
                hashString += `${keys[k]}=${hashMap[keys[k]]}`;
                index += 1;
            }
            location.hash = hashString;
            return hashMap;
        },

        get(key: string) {
            return <string>this._change(key, null);
        },
        set(key: string, value: string) {
            return <Record<PropertyKey, any>>this._change(key, value);
        },
        clear() {
            location.hash = '';
        },
    },

    isUndefined(obj: {}) {
        return typeof obj === 'undefined';
    },

    cookie: {
        get: function (cookieName: string) {
            const cookieParams: Record<string, any> = {};
            const cookies = document.cookie ? document.cookie.split('; ') : [];
            for (let i = 0; i < cookies.length; i++) {
                const parts = cookies[i].split('=');
                let cookie = parts.slice(1).join('=');

                if (cookie.charAt(0) === '"') {
                    cookie = cookie.slice(1, -1);
                }

                try {
                    const name = this.decode(parts[0]);
                    cookie = this.decode(cookie);
                    cookieParams[name] = cookie;

                    if (cookieName === name) {
                        break;
                    }
                } catch (e) {
                    console.warn(e);
                }
            }
            return cookieParams[cookieName];
        },

        decode: function (value: string) {
            return value.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
        },

        set: function (name: string, value: string | boolean | number, days: number | undefined = 365) {
            const exp: Date = new Date();
            exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = `${name}=${escape(
                '' + value,
            )};expires=${exp.toUTCString()}; path=/; domain=.bilibili.com`;
        },

        delete: function (name: string) {
            this.set(name, '', -1);
        },
    },

    ChatGetSettings(key: string) {
        if (this.localStorage._support) {
            return this.localStorage.getItem(key);
        }
        return this.cookie.get(key);
    },

    ChatSaveSettings(key: string, val: string | number, days?: number) {
        if (this.localStorage._support) {
            return this.localStorage.setItem(key, val);
        }
        return this.cookie.set(key, val, days);
    },

    ChatRemoveSettings(key: string) {
        if (this.localStorage._support) {
            return this.localStorage.removeItem(key);
        }
        return this.cookie.delete(key);
    },

    localStorage: {
        _support: (() => {
            try {
                return !!(window.localStorage && typeof window.localStorage === 'object');
            } catch (e) {
                return false;
            }
        })(),
        getItem(key: string) {
            if (this._support) {
                return window.localStorage.getItem(key);
            }
            return null;
        },
        setItem(key: string, value: string | number) {
            if (this._support) {
                window.localStorage.setItem(key, '' + value);
            }
        },
        removeItem(key: string) {
            window.localStorage.removeItem(key);
        },
    },

    loadLocalStorage(callback: Function) {
        const that = this,
            configMap = ['bilibililover', 'defaulth5', 'firstentergraytest', 'bilibili_player_settings'];
        this._iframe = document.createElement('iframe');
        this._iframe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;';
        this._iframe.src = '//www.bilibili.com/blackboard/iframemessage.html';
        document.body.appendChild(this._iframe);
        this._iframe.addEventListener &&
            this._iframe.addEventListener('load', () => {
                try {
                    for (let i = 0; i < configMap.length; i++) {
                        if (that._iframe && that._iframe.contentWindow) {
                            window.localStorage.setItem(
                                configMap[i],
                                that._iframe.contentWindow.localStorage.getItem(configMap[i])!,
                            );
                        }
                    }
                } catch (e) {
                    // console.error(e);
                }
                clearTimeout(that.storageTimer);
                callback();
            });
        this.storageTimer = window.setTimeout(() => {
            callback();
        }, 500);
    },

    getLocalStorage(name: string) {
        if (this._iframe) {
            try {
                return this._iframe.contentWindow && this._iframe.contentWindow.localStorage.getItem(name);
            } catch (e) {
                // console.error(e);
            }
        } else {
            try {
                return this.ChatGetSettings(name);
            } catch (e) {
                // console.error(e);
            }
        }
        return null;
    },

    setLocalStorage(name: string, value: string | number) {
        try {
            this.ChatSaveSettings(name, value);
        } catch (e) {
            // console.error(e);
        }
        if (this._iframe) {
            try {
                this._iframe.contentWindow && this._iframe.contentWindow.localStorage.setItem(name, '' + value);
            } catch (e) {
                // console.error(e);
            }
        }
    },

    removeLocalStorage(name: string) {
        try {
            this.ChatRemoveSettings(name);
        } catch (e) {
            // console.error(e);
        }
        if (this._iframe) {
            try {
                this._iframe.contentWindow && this._iframe.contentWindow.localStorage.removeItem(name);
            } catch (e) {
                // console.error(e);
            }
        }
    },

    GetUrlValue(name: string) {
        const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`, 'i'),
            r = window.location.search.substr(1).match(reg);
        if (r != null) {
            try {
                return decodeURIComponent(r[2]);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    getIPCrc(ip: any) {
        const playerCrc32 = new Crc32();
        playerCrc32.reset();
        playerCrc32.update(ip);
        this.cookie.set('HTML5PlayerCRC32', '' + playerCrc32.finish());
    },

    getHiddenProp() {
        const prefixes = ['webkit', 'moz', 'ms', 'o'];

        // if 'hidden' is natively supported just return it
        if ('hidden' in document) {
            return 'hidden';
        }

        // otherwise loop over all the known prefixes until we find one
        for (let i = 0; i < prefixes.length; i++) {
            if (`${prefixes[i]}Hidden` in document) {
                return `${prefixes[i]}Hidden`;
            }
        }

        // otherwise it's not supported
        return null;
    },

    isDocumentHidden() {
        const prop = this._getHiddenProp && this._getHiddenProp();
        if (!prop) {
            return false;
        }

        return document[<keyof Document>prop]!;
    },
    cloneDeep(obj: Record<string, any>, deep: boolean) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        const target: Record<string, any> = Array.isArray(obj) ? [] : {};
        for (const name in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, name)) {
                const value = obj[name];
                if (deep) {
                    if (typeof value === 'object') {
                        target[name] = this.cloneDeep(value, deep);
                    } else {
                        target[name] = value;
                    }
                } else {
                    target[name] = value;
                }
            }
        }
        return target;
    },
    loadScript: (options: IOptions, windows?: Window) => {
        const topWindow = windows || window;
        const script = topWindow.document.createElement('script');
        script.onload = function () {
            options.success && options.success();
        };
        script.onerror = () => {
            options.error && options.error();
        };
        script.src = options.url;

        topWindow.document.head.appendChild(script);
        return script;
    },
    parseConfig(obj: any, key: string, val: any) {
        switch (key) {
            case 'has_danmaku':
                obj['hasDanmaku'] = val ? (val === 'false' ? '' : true) : '';
                break;
            case 'urlparam':
                obj['extra_params'] = val ? decodeURIComponent(val) : '';
                obj[key] = val ? val + encodeURIComponent('&season_type=') + utils.GetUrlValue('season_type') : '';
                break;
            case 'p':
                obj[key] = +val || 1;
                break;
            case 'page':
                obj['p'] = +val || 1;
                break;
            case 'epid':
                obj.episodeId = Number(val);
                break;
            case 'danmaku':
                obj.danmaku = val === '0' ? '' : true;
                break;
            default:
                obj[key] = val;
                break;
        }
    },
    defaultSearch(param?: string) {
        let list: string[] = [];
        const obj = {};
        if (param) {
            list = param.split('&');
        }
        const url = window.location.search;
        if (url.indexOf('?') !== -1) {
            const urlParam = url.slice(1).split('&');
            urlParam && list.push(...urlParam);
        }
        let ele;
        list.forEach((item: string) => {
            ele = item.split('=');
            utils.parseConfig(obj, ele[0], ele[1]);
        });
        return obj;
    },
    objToStr(obj: any) {
        let oStr = '';
        for (let key in obj) {
            oStr += `${key}=${obj[key]}&`;
        }
        return oStr.slice(0, -1);
    },
    ajax(obj: IAjax) {
        return new Promise(function (resolve, reject) {
            const method = obj.method ? obj.method.toUpperCase() : 'GET';
            const async = obj.async ? true : false;
            const xhr = new XMLHttpRequest();
            const data = obj.data ? utils.objToStr(obj.data) : '';
            xhr.withCredentials = obj.withCredentials || false;
            if (method === 'POST') {
                xhr.open(method, obj.url, async);
                xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                xhr.send(data);
            } else if (method === 'GET') {
                const url = `${obj.url}?${data}`;
                xhr.open(method, url, async);
                xhr.send();
            } else {
                xhr.open(method, obj.url);
                xhr.send();
            }
            xhr.addEventListener('load', () => {
                resolve(xhr.response);
            });
            xhr.addEventListener('error', () => {
                reject();
            });
            xhr.addEventListener('abort', () => {
                reject();
            });
        });
    },
};

class Crc32 {
    value: number;
    crc32Table: number[] = this.makeTable();
    constructor() {
        this.value = 0;
    }

    makeTable() {
        const table: any[] = [];
        for (let i = 0; i < 256; i++) {
            let value = i;
            for (let j = 0; j < 8; j++) {
                if ((value & 1) === 1) {
                    value = (value >>> 1) ^ 0xedb88320;
                } else {
                    value >>>= 1;
                }
            }
            table[i] = value >>> 0; // / http://stackoverflow.com/questions/18638900/javascript-crc32
        }
        return table;
    }

    updateBytes(initial: number, bytes: Uint8Array) {
        let value = ~initial;
        const len = bytes.length;
        for (let i = 0; i < len; i++) {
            value = this.crc32Table[(value & 0xff) ^ bytes[i]] ^ (value >>> 8);
        }
        return ~value >>> 0;
    }
    // / https://github.com/SheetJS/js-crc32/blob/master/crc32.js
    updateStr(initial: number, str: string) {
        let value = initial ^ -1;
        for (let i = 0, L = str.length, c, d; i < L;) {
            c = str.charCodeAt((i += 1));
            if (c < 0x80) {
                value = (value >>> 8) ^ this.crc32Table[(value ^ c) & 0xff];
            } else if (c < 0x800) {
                value = (value >>> 8) ^ this.crc32Table[(value ^ (192 | ((c >> 6) & 31))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | (c & 63))) & 0xff];
            } else if (c >= 0xd800 && c < 0xe000) {
                c = (c & 1023) + 64;
                d = str.charCodeAt((i += 1)) & 1023;
                value = (value >>> 8) ^ this.crc32Table[(value ^ (240 | ((c >> 8) & 7))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | ((c >> 2) & 63))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | ((d >> 6) & 15) | ((c & 3) << 4))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | (d & 63))) & 0xff];
            } else {
                value = (value >>> 8) ^ this.crc32Table[(value ^ (224 | ((c >> 12) & 15))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | ((c >> 6) & 63))) & 0xff];
                value = (value >>> 8) ^ this.crc32Table[(value ^ (128 | (c & 63))) & 0xff];
            }
        }
        return (value ^ -1) >>> 0;
    }
    reset() {
        this.value = 0;
    }
    update(data: any) {
        if (typeof data === 'string') {
            this.value = this.updateStr(this.value, data);
        } else if (data instanceof Uint8Array || data.constructor.toString().indexOf('Uint8Array') !== -1) {
            this.value = this.updateBytes(this.value, data);
        } else if (data instanceof ArrayBuffer || data.constructor.toString().indexOf('ArrayBuffer') !== -1) {
            this.value = this.updateBytes(this.value, new Uint8Array(data, 0, data.byteLength));
        }
    }
    finish() {
        return this.value;
    }
}
