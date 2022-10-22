import Socket from './socket';
import EventEmitter from 'events';
import Protobuf from 'protobufjs/light';
import { EVENTS } from './state';
// Broadcast gRPC 链路改造
// https://info.bilibili.co/pages/viewpage.action?pageId=53630233
// https://git.bilibili.co/bapis/bapis/blob/master/bilibili/broadcast/v1/broadcast.proto
// broadcast业务方接入文档（gRPC）
// https://info.bilibili.co/pages/viewpage.action?pageId=107128255

export interface IConfig {
    url: string; // 地址
    protocols?: string | string[]; // 协议
    platform?: string; // web
    protobuf?: typeof Protobuf; //
    subscribe?: ISubscribe[];
    room?: IRoom[];

    retry?: boolean; // 是否自动重试(以下三个参数必须同时设置)
    retryCount?: number; // 重试次数，默认  3,
    retryTime?: number; // 开启自动重试，设定自动重试间隔
    retryStep?: number; // 重试递增步长
    heartTime?: number; // 心跳时长
    maxTime?: number; // 重试最大间隔
}
export interface ISubscribePath {
    targetPath?: string;
    typeUrl?: string;
}
export interface ISubscribe {
    json?: string;
    path?: ISubscribePath[];
}
export interface IRoom {
    id: string;
    event: 'join' | 'leave' | 'online';
}
export default class BSocket extends EventEmitter {
    static LOG: { [key: string]: string }[] = [];
    static EVENTS = EVENTS;
    private ws: Socket;
    config: Required<IConfig>;
    constructor(config: IConfig) {
        super();
        this.config = {
            url: '',
            protobuf: null,
            protocols: 'proto',
            platform: 'web',
            retry: true,
            retryCount: 3,
            heartTime: 20000,
            retryTime: 20000,
            retryStep: 5000,
            maxTime: 30000,
            subscribe: [],
            room: [],
            ...<any>config,
        };
        if (config.subscribe) {
            this.config.subscribe = [...config.subscribe];
        }
        this.ws = new Socket(this);
    }

    subscribe(path: ISubscribe[]) {
        this.ws.subscribe(path);
    }
    unSubscribe(path?: string[]) {
        this.ws.unSubscribe(path);
    }
    room(data: IRoom) {
        return this.ws.room(data);
    }

    dispose() {
        this.ws.dispose();
    }
    close() {
        this.ws.close();
    }

    send(data: any, targetPath: string, typeUrl: string) {
        return this.ws.outsend(data, targetPath, typeUrl);
    }
    readyState() {
        return this.ws.readyState();
    }
}
