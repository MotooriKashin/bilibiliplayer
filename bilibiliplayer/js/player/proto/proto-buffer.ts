import { Root } from 'protobufjs'; // respectively "./node_modules/protobufjs"
import dmproto from '../../const/dm.json';

export interface IDmResponse {
    data: {
        elems: IDmData[];
    };
    loadTime: number;
}
export interface IDmReject {
    data: any;
    loadTime: number;
    msg: string;
    status: number;
}
export interface IDmView {
    state: number;
    text: string;

    textSide: string;
    //  分段弹幕配置
    dmSge: {
        pageSize: number;
        total: number;
    };

    flag: {
        recFlag: number;
        recText: string;
        recSwitch: number;
    };
    // 高级弹幕链接地址 （上传到bfs）
    specialDms: string[];
    // up主的checkbox 是否存在
    checkBox: boolean;
    //弹幕数
    count: number;
    commandDms: ICommandDm[];
    dmSetting: IDMSetting;
    reportFilter: string[];
}

//指令弹幕
export interface ICommandDm {
    //弹幕id
    id: number;
    idStr: string;
    //oid
    oid: number;
    //mid
    mid: number;
    //弹幕指令
    command: string;
    //弹幕内容
    content: string;
    // 弹幕位置
    progress: number;
    //创建时间
    ctime: string;
    //修改时间
    mtime: string;
    // extra
    extra: string;
    // 下面两个是post接口数据
    type: number;
    state: number;
}
export interface IDmData {
    id: string;
    idStr: string;
    progress: number;
    mode: number;
    fontsize: number;
    color: number;
    midHash: string;
    content: string;
    ctime: number;
    weight: number;
    pool: number;
    attr: number;
    action?: string;
}
export interface IDMSetting {
    dmSwitch: boolean;
    aiSwitch: boolean;
    aiLevel: number;
    blocktop: boolean;
    blockscroll: boolean;
    blockbottom: boolean;
    blockcolor: boolean;
    blockspecial: boolean;
    preventshade: boolean;
    dmask: boolean;
    opacity: number;
    dmarea: number;
    speedplus: number;
    fontsize: number;
    screensync: boolean;
    speedsync: boolean;
    fontfamily: string;
    bold: boolean;
    fontborder: string;
    drawType: string;
}

// 文档： https://info.bilibili.co/pages/viewpage.action?pageId=3672133#id-%E5%BC%B9%E5%B9%95%E6%8E%A5%E5%8F%A3%E6%96%87%E6%A1%A3%EF%BC%88%E6%96%B0%EF%BC%89-web%E5%BC%B9%E5%B9%95%E7%BD%91%E5%85%B3%E6%8E%A5%E5%8F%A3
export default class ProtoBuffer {
    private deatroyed = false;
    private xhrList: XMLHttpRequest[] = [];
    loadPromise!: Promise<unknown>;
    protoMessage: any = {};
    lookupType!: string;
    loadList!: number[];

    loadDmPb(url: string, withCredentials = true, message = 'DmSegMobileReply') {
        return this.nativeXHR(url, withCredentials)
            .then((data: { data: ArrayBuffer; loadTime: number }) => {
                if (!this.protoMessage[message]) {
                    const root = Root.fromJSON(dmproto);
                    this.protoMessage[message] = root.lookupType(`bilibili.community.service.dm.v1.${message}`);
                }
                const msg = this.protoMessage[message].decode(new Uint8Array(data.data));
                const resObj = this.protoMessage[message].toObject(msg);
                return Promise.resolve({
                    data: resObj,
                    loadTime: data.loadTime,
                });
            })
            .catch((err) => {
                return Promise.reject(err);
            });
    }

    private nativeXHR(
        url: string,
        withCredentials = true,
        responseType: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' = 'arraybuffer',
    ) {
        return new Promise((resolve: (data: { data: ArrayBuffer; loadTime: number; }) => void, reject) => {
            const startTime = performance.now();
            const xhr = new XMLHttpRequest();
            this.xhrList.push(xhr);
            xhr.open('get', url, true);
            xhr.responseType = responseType;
            xhr.addEventListener('load', () => {
                if (this.deatroyed) return;
                resolve({
                    data: xhr.response,
                    loadTime: performance.now() - startTime,
                });
            });
            xhr.addEventListener('error', () => {
                if (this.deatroyed) return;
                reject({
                    msg: xhr.statusText || 'ioError',
                    status: xhr.status,
                });
            });
            xhr.addEventListener('abort', () => {
                console.log('abort', xhr);
            });
            if (withCredentials) {
                xhr.withCredentials = true;
            }
            xhr.send();
        });
    }
    destroy() {
        this.xhrList.forEach((xhr) => {
            xhr?.abort();
        });
        this.xhrList = [];
    }
}
