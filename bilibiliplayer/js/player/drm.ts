import Drmsdk from "@jsc/drm";
import { IDashJsonUrlInterface, IMediaDataSourceInterface } from "./r";

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
        const cer = await this.getHttpCer();
        const gen = Drmsdk.biliDRMGenSPC(this.streamKid!, this.uniqueId, cer);
        // TODO:等待一个DRM3片源测试
    }
    protected getHttpCer() {
        return fetch(this.HttpDrmCer).then(d => d.arrayBuffer());
    }
    protected getHttpCkc() {
        return fetch(this.HttpDrmCkc);
    }
    protected getHttpWidevineCer() {
        return fetch(this.HttpDrmWidevineCer).then(d => d.arrayBuffer());
    }
    protected async getWidevineDetail() {
        const cer = await this.getHttpWidevineCer();
        const result = this.arrayBufferToBase64(new Uint8Array(cer));
        if (!result) {
            throw new Error("Get Widevine ServerCertificate Failed");
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
}