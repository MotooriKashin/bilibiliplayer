import STATE from './state';
import WS_BINARY_HEADER_LIST from './header-list';
import UTILS from './utils';
import { IConfig } from '../index';

export default class Main {
    private options!: IConfig;
    private wsBinaryHeaderList: any;
    private authInfo: any;
    private state: any;
    private callbackQueueList: any;
    private heatTimer: number = 0;
    private delay!: number;
    private ws!: WebSocket | null;
    private encoder: any;
    private decoder: any;

    constructor(options: IConfig) {
        if (Main.checkOptions(options)) {
            const DEFAULT_OPTIONS: any = {
                url: this.getURL(), // 地址
                urlList: [], // 地址列表
                accepts: [],
                platform: 'web', // web
                rid: 0, //  room_id // video://{aid}/{cid}
                retry: true, // 是否自动重试
                retryMaxCount: 0, // 重试次数，默认0，无限次
                retryInterval: 5, // 开启自动重试，设定自动重试间隔
                version: 1,
                // fallback: () => {}, // 关闭自动重试，设定链接失败后回调
                heartBeatInterval: 30, // 心跳包间隔，默认30s, 如果活动需要稳定，可以减少
                onHeartBeatReply: () => { }, // 收到 Heart Beat 回调
                onChangeRoomReply: () => { }, // 收到ChangeRoom回调
                onRegisterReply: () => { }, // 收到注册指令回调
                onUnRegisterReply: () => { }, // 收到取消注册指令回调
                onInitialized: () => { }, // WebSocket 初始化完成回调
                onOpen: () => { }, // WebSocket Open 回调
                onClose: () => { }, // WebSocket Close 回调
                onError: () => { }, // WebSocket Error 回调
                onListConnectError: () => { }, // UrlList 连接错误回调
                backoff: {
                    max_delay: 120, // 最大重试间隔
                    base_delay: 3, // 初始重试间隔
                    factor: 1.6, // 间隔递增
                    jitter: 0.2, // 间隔抖动
                },
            };
            // mixin options
            this.options = UTILS.extend({}, DEFAULT_OPTIONS, options);
            this.wsBinaryHeaderList = UTILS.extend([], WS_BINARY_HEADER_LIST);
            this.authInfo = {
                origin: '',
                encode: '',
            };
            if (this.options.urlList.length !== 0) {
                // this.options.urlList.push(this.options.url);
                this.options.retryMaxCount !== 0 &&
                    this.options.retryMaxCount! < this.options.urlList.length &&
                    (this.options.retryMaxCount = this.options.urlList.length - 1);
            }

            this.state = {
                retryCount: 0,
                listConnectFinishedCount: 0, // Hostlist 均连接完成次数
                index: 0, // 用于取Hostlist数组的下标
            };

            // callback queue list
            this.callbackQueueList = {
                onInitializedQueue: [],
                onOpenQueue: [],
                onCloseQueue: [],
                onErrorQueue: [],
                onHeartBeatReplyQueue: [],
                onRetryFallbackQueue: [],
                onListConnectErrorQueue: [],
            };

            this.heatTimer = 0;
            this.delay = this.options.backoff!.base_delay;
            this.mixinCallback().initialize(
                this.options.urlList.length > 0 ? this.options.urlList[0] : this.options.url,
            );
        }
    }
    static checkOptions(options: any) {
        if (!(options || options! instanceof Object)) {
            console.error('WebSocket Initialize options missing or error.', options);
            return false;
        }
        return true;
    }
    private getURL() {
        return /https/g.test(window.location.href)
            ? 'wss://broadcast.chat.bilibili.com:7823/sub'
            : 'ws://broadcast.chat.bilibili.com:7822/sub';
    }
    private initialize(url: string) {
        const cWebSocket = 'MozWebSocket' in window ? window.MozWebSocket : window.WebSocket,
            options = this.options;
        try {
            this.ws = new cWebSocket!(url);

            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = this.onOpen.bind(this);
            this.ws.onmessage = this.onMessage.bind(this);
            this.ws.onclose = this.onClose.bind(this);
            this.ws.onerror = this.onError.bind(this);

            UTILS.callFunction(this.callbackQueueList.onInitializedQueue);
            this.callbackQueueList.onInitializedQueue = [];
        } catch (e) {
            typeof options.fallback === 'function' && options.fallback();
        }

        return this;
    }

    private onOpen() {
        console.log('[Websocket]: On Open.');

        this.userAuthentication();

        UTILS.callFunction(this.callbackQueueList.onOpenQueue);

        return this;
    }

    private userAuthentication() {
        const options = this.options,
            token: Record<string, any> = {};
        let auth: any = '';
        if (options.rid) {
            token['room_id'] = options.rid;
        }
        if (options.platform) {
            token['platform'] = options.platform;
        }
        if (options.operation) {
            token['accepts'] = options.operation;
        }
        auth = this.convertToArrayBuffer(JSON.stringify(token), STATE.WS_OP_USER_AUTHENTICATION);

        this.authInfo.origin = token;
        this.authInfo.encode = auth;

        // setTimeout(() => {
        this.ws!.send(auth);
        // }, 0);
    }
    private registerOperationList() {
        this.options.operation.forEach((item: any) => {
            this.registerOperation(item);
        });
    }
    registerOperation(operation: any) {
        const val = operation.operation;
        this.send(this.convertToArrayBuffer(JSON.stringify(operation), STATE.WS_OP_REGISTER));
        if (this.options.operation.indexOf(val) < 0) {
            this.options.operation.push(val);
        }
    }
    unRegisterOperation(operation: any) {
        const val = operation.operation;
        this.send(this.convertToArrayBuffer(JSON.stringify(operation), STATE.WS_OP_UNREGISTER));
        const index = this.options.operation.indexOf(val);
        if (index >= 0) {
            this.options.operation.splice(index, 1);
        }
    }
    getAuthInfo() {
        return this.authInfo;
    }
    changeRoom(data: any) {
        const room = this.convertToArrayBuffer(JSON.stringify(data), STATE.WS_OP_CHANGEROOM);
        this.ws!.send(room);
    }
    private heartBeat() {
        // console.log('[Websocket]: On Heart.');
        clearTimeout(this.heatTimer);
        const heartBeatMsg = this.convertToArrayBuffer({}, STATE.WS_OP_HEARTBEAT);

        this.ws!.send(heartBeatMsg);

        this.heatTimer = window.setTimeout(() => {
            this.heartBeat();
        }, this.options.heartBeatInterval! * 1000);
    }
    private onMessage(msg: any) {
        try {
            const convertedMsg = this.convertToObject(msg.data);
            // console.log('[Websocket]: On Message.', convertedMsg);

            if (convertedMsg) {
                // console.log('convertedMsg', convertedMsg.op, convertedMsg);
                switch (convertedMsg.op) {
                    case STATE.WS_OP_HEARTBEAT_REPLY:
                        this.onHeartBeatReply(convertedMsg.body);
                        break;
                    case STATE.WS_OP_CONNECT_SUCCESS:
                        this.heartBeat();
                        break;
                    case STATE.WS_OP_CHANGEROOM_REPLY:
                        if (Number(convertedMsg.body.code) === 0) {
                            this.options.onChangeRoomReply!({
                                data: convertedMsg && convertedMsg.body,
                            });
                        }
                        break;
                    case STATE.WS_OP_REGISTER_REPLY:
                        if (Number(convertedMsg.body.code) === 0) {
                            this.options.onRegisterReply!({
                                data: convertedMsg && convertedMsg.body,
                            });
                        }
                        break;
                    case STATE.WS_OP_UNREGISTER_REPLY:
                        if (Number(convertedMsg.body.code) === 0) {
                            this.options.onUnRegisterReply!({
                                data: convertedMsg && convertedMsg.body,
                            });
                        }
                        break;
                    case STATE.WS_OP_DATA:
                    case STATE.WS_OP_BATCH_DATA:
                        convertedMsg.body.forEach((item: any) => {
                            this.msgReply({
                                op: convertedMsg.op,
                                body: item,
                            });
                        });
                        break;
                    case STATE.WS_OP_OGVCMD_REPLY:
                        this.onOgvCmdReply(convertedMsg);
                        break;
                    default:
                        this.msgReply(convertedMsg);
                        break;
                }
            }
        } catch (e) {
            console.error('WebSocket Error: ', e);
        }
        return this;
    }

    private msgReply(convertedMsg: any) {
        if (convertedMsg && convertedMsg.op && convertedMsg.body) {
            typeof this.options.onMsgReply === 'function' &&
                this.options.onMsgReply({
                    operation: convertedMsg && convertedMsg.op,
                    data: convertedMsg && convertedMsg.body,
                });
        }
    }
    private onHeartBeatReply(data: any) {
        UTILS.callFunction(this.callbackQueueList.onHeartBeatReplyQueue, data);
    }

    private onOgvCmdReply(convertedMsg: any) {
        if (convertedMsg && convertedMsg.op && convertedMsg.body) {
            typeof this.options.onOgvCmdReply === 'function' &&
                this.options.onOgvCmdReply({
                    operation: convertedMsg && convertedMsg.op,
                    data: convertedMsg && convertedMsg.body,
                });
        }
    }

    private onClose() {
        // console.log('[Websocket]: On Close.');
        const len = this.options.urlList.length;
        UTILS.callFunction(this.callbackQueueList.onCloseQueue);

        clearTimeout(this.heatTimer);

        if (!this.options.retry) return this;
        if (this.checkRetryState()) {
            // console.log('delay', this.delay);
            setTimeout(() => {
                console.error('Websocket Retry .', this.delay * 1000);
                // len !== 0
                // && this.state.index > len - 1
                // && (this.state.index = 0);

                // if (len !== 0 && this.state.index >= len - 2) {
                this.state.index += 1;
                if (len !== 0 && this.state.index > len - 1) {
                    this.state.index = 0;
                    this.state.listConnectFinishedCount += 1;
                    this.state.listConnectFinishedCount === 1 &&
                        UTILS.callFunction(this.callbackQueueList.onListConnectErrorQueue);
                }
                len === 0 ? this.initialize(this.options.url) : this.initialize(this.options.urlList[this.state.index]);
                if (this.delay < this.options.backoff!.max_delay) {
                    this.delay *= this.options.backoff!.factor;
                    this.delay *= 1 + this.options.backoff!.jitter * (Math.random() * 2 - 1);
                }
            }, this.delay * 1000);
        } else {
            console.error('Websocket Retry Failed.');
            UTILS.callFunction(this.callbackQueueList.onRetryFallbackQueue);
        }

        return this;
    }

    private onError(err: any) {
        console.error('Websocket On Error.', err);
        UTILS.callFunction(this.callbackQueueList.onErrorQueue, err);

        return this;
    }

    destroy() {
        clearTimeout(this.heatTimer);
        this.options.retry = false;
        this.ws && this.ws.close();
        this.ws = null;
    }

    private convertToArrayBuffer(data: any, operation: any) {
        // get encoder
        if (!this.encoder) {
            this.encoder = UTILS.getEncoder();
        }

        const headerArrayBuffer = new ArrayBuffer(STATE.WS_PACKAGE_HEADER_TOTAL_LENGTH),
            headerDataView = new DataView(headerArrayBuffer, STATE.WS_PACKAGE_OFFSET),
            bodyArrayBuffer = this.encoder.encode(data);

        // set header total length, length = header length + body length
        headerDataView.setInt32(
            STATE.WS_PACKAGE_OFFSET,
            STATE.WS_PACKAGE_HEADER_TOTAL_LENGTH + bodyArrayBuffer.byteLength,
        );

        // update header operation value
        this.wsBinaryHeaderList[2].value = operation;

        // loop set header
        this.wsBinaryHeaderList.forEach((v: any) => {
            if (v.bytes === 4) {
                headerDataView.setInt32(v.offset, v.value);
                if (v.key === 'seq') {
                    ++v.value;
                }
            } else if (v.bytes === 2) {
                headerDataView.setInt16(v.offset, v.value);
            } else if (v.bytes === 1) {
                headerDataView.setInt8(v.offset, v.value);
            }
        });

        return UTILS.mergeArrayBuffer(headerArrayBuffer, bodyArrayBuffer);
    }

    private convertToObject(arrayBuffer: ArrayBuffer) {
        const dataView = new DataView(arrayBuffer),
            data: any = {};

        // get package header data
        data.packetLen = dataView.getInt32(STATE.WS_PACKAGE_OFFSET);
        this.wsBinaryHeaderList.forEach((v: any) => {
            if (v.bytes === 4) {
                data[v.key] = dataView.getInt32(v.offset);
            } else if (v.bytes === 2) {
                data[v.key] = dataView.getInt16(v.offset);
            } else if (v.bytes === 1) {
                data[v.key] = dataView.getInt8(v.offset);
            }
        });

        // get decoder
        if (!this.decoder) {
            this.decoder = UTILS.getDecoder();
        }
        if (data.op && data.op === STATE.WS_OP_BATCH_DATA) {
            data.body = this.parseDanmaku(arrayBuffer, dataView, STATE.WS_PACKAGE_HEADER_TOTAL_LENGTH, data.packetLen);
        } else if (data.op && STATE.WS_OP_DATA === data.op) {
            data.body = this.parseDanmaku(arrayBuffer, dataView, STATE.WS_PACKAGE_OFFSET, data.packetLen);
        } else if (data.op && data.op === STATE.WS_OP_OGVCMD_REPLY) {
            data.body = this.parseOgvCmd(arrayBuffer, dataView, STATE.WS_PACKAGE_OFFSET, data.packetLen);
        } else if (data.op) {
            data.body = [];
            let offset = STATE.WS_PACKAGE_OFFSET,
                packetLen = data.packetLen,
                headerLen: any = '',
                body = '';
            for (; offset < arrayBuffer.byteLength; offset += packetLen) {
                packetLen = dataView.getInt32(offset);
                headerLen = dataView.getInt16(offset + STATE.WS_HEADER_OFFSET);
                // body = JSON.parse(this.decoder.decode(arrayBuffer.slice(offset + headerLen,
                //     offset + packetLen)));
                try {
                    body = JSON.parse(this.decoder.decode(arrayBuffer.slice(offset + headerLen, offset + packetLen)));
                    data.body = body;
                } catch (e) {
                    body = this.decoder.decode(arrayBuffer.slice(offset + headerLen, offset + packetLen));
                    console.error('decode body error:', new Uint8Array(arrayBuffer), data);
                }
            }
        }

        return data;
    }
    private parseDanmaku(arrayBuffer: ArrayBuffer, dataView: DataView, off: number, packetLen: number) {
        const list = [];
        let headerLen: number;
        for (let offset = off; offset < arrayBuffer.byteLength; offset += packetLen) {
            packetLen = dataView.getInt32(offset);
            headerLen = dataView.getInt16(offset + STATE.WS_HEADER_OFFSET);
            try {
                list.push(JSON.parse(this.decoder.decode(arrayBuffer.slice(offset + headerLen, offset + packetLen))));
            } catch (e) {
                list.push(this.decoder.decode(arrayBuffer.slice(offset + headerLen, offset + packetLen)));
                console.error('decode body error:', new Uint8Array(arrayBuffer));
            }
        }
        return list;
    }
    // 解析Ogv命令推送内容
    private parseOgvCmd(arrayBuffer: ArrayBuffer, dataView: DataView, off: number, packetLen: number) {
        let list;
        let headerLen: number;
        packetLen = dataView.getInt32(off);
        headerLen = dataView.getInt16(off + STATE.WS_HEADER_OFFSET);
        try {
            list = JSON.parse(this.decoder.decode(arrayBuffer.slice(off + headerLen, off + packetLen)));
        } catch (e) {
            list = this.decoder.decode(arrayBuffer.slice(off + headerLen, off + packetLen));
            console.error('decode body error:', new Uint8Array(arrayBuffer));
        }
        return list;
    }
    send(data: any) {
        this.ws && this.ws.send(data);
    }

    private addCallback(callback: any, callbackList: any) {
        if (typeof callback === 'function' && callbackList instanceof Array) {
            callbackList.push(callback);
        }

        return this;
    }

    private mixinCallback() {
        const options = this.options,
            callbackQueueList = this.callbackQueueList;

        this.addCallback(options.onReceivedMessage, callbackQueueList.onReceivedMessageQueue)
            .addCallback(options.onHeartBeatReply, callbackQueueList.onHeartBeatReplyQueue)
            .addCallback(options.onInitialized, callbackQueueList.onInitializedQueue)
            .addCallback(options.onOpen, callbackQueueList.onOpenQueue)
            .addCallback(options.onClose, callbackQueueList.onCloseQueue)
            .addCallback(options.onError, callbackQueueList.onErrorQueue)
            .addCallback(options.onRetryFallback, callbackQueueList.onRetryFallbackQueue)
            .addCallback(options.onListConnectError, callbackQueueList.onListConnectErrorQueue);

        return this;
    }

    getRetryCount() {
        return this.state.retryCount;
    }

    private checkRetryState() {
        const options = this.options;
        let status = false;

        if (options.retryMaxCount === 0 || this.state.retryCount < options.retryMaxCount!) {
            this.state.retryCount += 1;
            status = true;
        }

        return status;
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        MozWebSocket: typeof WebSocket;
    }
}