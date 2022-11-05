import Drmsdk from "@jsc/drm";
import { IDashJsonUrlInterface, IDashSegmentInterface, IMediaDataSourceInterface } from "./r";

export class Drm {
    protected widevineServerURL = '//bvc-drm.bilivideo.com/bili_widevine';
    protected HttpDrmWidevineCer = '//bvc-drm.bilivideo.com/cer/bilibili_certificate.bin';
    protected HttpDrmCer = '//bvc-drm.bilivideo.com/cer/bilidrm_pub.key';
    protected HttpDrmCkc = '//bvc-drm.bilivideo.com/bilidrm';
    protected HttpDrmCheck = '//api.bilibili.com/pgc/player/web/check';
    constructor(protected drmTechType: 3 | 2, protected mediaDataSource?: IMediaDataSourceInterface) { }
    getData() {
        switch (this.drmTechType) {
            case 3:
                return this.getKeyDetail();
            case 2:
                return this.getWidevineDetail();
            default:
        }
    }
    protected async getKeyDetail() {
        const uniqueId = this.uniqueId;
        const sdk = await Drmsdk();
        const cer = await this.getHttpCer();
        const gen = sdk.biliDRMGenSPC(this.streamKid!, uniqueId, cer);
        const ckc = await this.getHttpCkc(gen.spc);
        const parse = sdk.biliDRMParseCKC(ckc, uniqueId);
        const key = this.toUrl(this.encodeHex(this.streamKid!));
        const value = this.toUrl(parse.key);
        if (!parse || !parse.key) {
            throw new Error("DRM: Parsed CKC invalid");
        }
        const clearkeys: Record<string, string> = {};
        clearkeys[key] = value;
        return {
            protectionData: {
                "org.w3.clearkey": {
                    clearkeys,
                    priority: 0
                }
            }
        }
    }
    protected getHttpCer() {
        return fetch(this.HttpDrmCer).then(d => d.arrayBuffer());
    }
    protected getHttpCkc(spc: string) {
        return fetch(this.HttpDrmCkc, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: JSON.stringify({ spc })
        }).then(d => d.json().then(d => this.toByteArray(d.ckc)));
    }
    protected getHttpWidevineCer() {
        return fetch(this.HttpDrmWidevineCer).then(d => d.arrayBuffer());
    }
    protected async getWidevineDetail() {
        const cer = await this.getHttpWidevineCer();
        const result = this.arrayBufferToBase64(new Uint8Array(cer));
        if (!result) {
            throw new Error("DRM: Get Widevine ServerCertificate Failed");
        }
        return {
            protectionData: {
                "com.widevine.alpha": {
                    serverURL: this.widevineServerURL,
                    serverCertificate: result,
                    priority: 0
                }
            },
            ignoreEmeEncryptedEvent: true
        }
    }
    protected arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
    protected get streamKid() {
        if ((<IDashJsonUrlInterface>this.mediaDataSource?.url)?.video) {
            const r = (<IDashJsonUrlInterface>this.mediaDataSource!.url).video;
            if (Array.isArray(r) && r.length) {
                const i = r[0].bilidrm_uri;
                if ("string" == typeof i)
                    return i.split("//").pop();
            }
        }
        return null;
    }
    protected get uniqueId() {
        let t = '';
        while (t.length < 16) {
            t += Math.random().toString(36).substr(2);
        }
        return t.substr(0, 16);
    }
    protected encodeHex(str: string) {
        return btoa(str.match(/\w{2}/g)!.map((function (e) {
            return String.fromCharCode(parseInt(e, 16))
        }
        )).join(""))
    }
    protected toUrl(str: string) {
        return "string" == typeof str ? str.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_") : str
    }
    protected toByteArray(str: string) {
        const i: number[] = [];
        function l(e: string) {
            var t = e.length;
            if (t % 4 > 0)
                throw new Error("DRM: Invalid string. Length must be a multiple of 4");
            var r = e.indexOf("=");
            return -1 === r && (r = t),
                [r, r === t ? 0 : 4 - r % 4]
        }
        const hash = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        for (let j = 0; j < hash.length; ++j) {
            i[hash.charCodeAt(j)] = j;
        }
        var t, r, n = l(str), a = n[0], s = n[1], u = new Uint8Array(function (e, t, r) {
            return 3 * (t + r) / 4 - r
        }(0, a, s)), c = 0, d = s > 0 ? a - 4 : a;
        for (r = 0; r < d; r += 4)
            t = i[str.charCodeAt(r)] << 18 | i[str.charCodeAt(r + 1)] << 12 | i[str.charCodeAt(r + 2)] << 6 | i[str.charCodeAt(r + 3)],
                u[c++] = t >> 16 & 255,
                u[c++] = t >> 8 & 255,
                u[c++] = 255 & t;
        2 === s && (t = i[str.charCodeAt(r)] << 2 | i[str.charCodeAt(r + 1)] >> 4,
            u[c++] = 255 & t);
        1 === s && (t = i[str.charCodeAt(r)] << 10 | i[str.charCodeAt(r + 1)] << 4 | i[str.charCodeAt(r + 2)] >> 2,
            u[c++] = t >> 8 & 255,
            u[c++] = 255 & t);
        return u
    }
    static setContentProtection(arr: IDashSegmentInterface[]) {
        return Array.isArray(arr) ? arr.map(d => {
            d && (d.ContentProtection = {
                schemeIdUri: "urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e",
                value: "ClearKey1.0"
            });
            return d;
        }) : arr;
    }
    static setContentProtectionPSSH(arr: IDashSegmentInterface[]) {
        return Array.isArray(arr) ? arr.map(d => {
            d && d.widevine_pssh && (d.ContentProtection = {
                schemeIdUri: "urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
                pssh: {
                    __prefix: "cenc",
                    __text: d.widevine_pssh
                }
            });
            return d;
        }) : arr;
    }
}