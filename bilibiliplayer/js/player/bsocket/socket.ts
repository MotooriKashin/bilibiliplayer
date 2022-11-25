import { EVENTS, PATH, ROOM } from './state';
import BSocket, { IConfig, ISubscribe, ISubscribePath, IRoom } from './light';
import Protobuf, { Type, Root, Message } from 'protobufjs/light';
import bproto from '../../const/bsocket.json';

interface IStatus {
    code: number;
    message: string;
    details: any;
}
interface IFrameOption {
    /**
     * 必填, 为frame请求序号，seq+1， 对应request/response
     */
    sequence: number;
    /**
     * 选填，消息id， 用于消息回执（当is_ack=true）
     */
    messageId: number;
    /**
     * 选填，是否进行消息回执
     */
    isAck: boolean;
    /**
     * 选填，业务状态码
     */
    status: IStatus;
    /**
     * 选填，业务ack来源，用于消息回执
     */
    ackOrigin: string;
}
interface IRespose {
    options: IFrameOption;
    targetPath: string;
    body: {
        value?: ArrayBuffer;
        type_url?: string;
    };
}
interface IRequest {
    options: {
        sequence: number;
    };
    targetPath: string;
    body: Message<{}>;
}
interface IRoomReq {
    id?: string;
    join?: {};
    leave?: {};
    online?: {};
}
interface IRoomRespose {
    id?: string;
    join?: {};
    leave?: {};
    online?: {
        online?: number;
    };
    msg?: {
        targetPath: string;
        body: {
            value?: ArrayBuffer;
            type_url?: string;
        };
    };
}
export default class Socket {
    private config: Required<IConfig>;
    private protobuf!: typeof Protobuf;
    /** 是否初始化完成 */
    private inited!: boolean;
    /** WebSocket 实例 */
    private ws!: WebSocket;
    /** 返回消息总type */
    private msgType!: Type;
    /** any 类型type */
    private anyType!: Type;
    /** any 类型type */
    private targetPathType!: Type;
    /** 心跳请求type */
    private beatReqType!: Type;
    /** 心跳返回type */
    private ackReqType!: Type;
    /** 房间请求type */
    private roomRequest!: Type;
    /** 房间相应type */
    private roomResp!: Type;
    /**
     * join 进入房间type
     * leave 离开房间type
     * online 获取在线人数
     */
    private roomEvents!: {
        join: Type;
        leave: Type;
        online: Type;
    };
    /** 外部type */
    private outType: { [key: string]: Type } = {};
    /**
     * 重连次数
     * 每次重连，时间间隔递增
     * 有最大值（在config里面定义
     */
    private retryCount = 0;
    /** 是否以销毁 */
    private disposed!: boolean;
    /* 每次发送消息，唯一标识 */
    private seq = 1;

    /** 重试定时器, 链接成功，清除定时器 */
    private retryTimer!: number;
    /** 心跳定时器 */
    private beatTimer!: number;
    /** 心跳三次没收到回复，重连 */
    private beatCount = 0;

    /** 用于重连，重新订阅 */
    private subscribed: { [key: string]: string } = {};
    /** 用于重连，重新进入房间 */
    private roomed: { [key: string]: IRoom } = {};
    /** 是否已鉴权 */
    private authed = false;

    /**
     * 用上面是seq 来标识，订阅的target
     * 进入的房间
     * 订阅可以订阅一个列表
     * 房间只能一个一个进
     */
    private msgFlag: { [key: string]: IRoom | string[] } = {};

    constructor(private bsocket: BSocket) {
        this.config = bsocket.config;
        this.init();
    }
    private init() {
        const room = this.config.room;
        this.protobuf = this.config.protobuf;
        if (room) {
            for (let i = 0; i < room.length; i++) {
                this.roomed[room[i].id] = room[i];
            }
        }
        const root = this.protobuf.Root.fromJSON(bproto);
        this.msgType = root.lookupType('BroadcastFrame');
        this.targetPathType = root.lookupType('TargetPath');
        this.beatReqType = root.lookupType('HeartbeatReq');
        this.ackReqType = root.lookupType('MessageAckReq');
        this.anyType = root.lookupType('google.protobuf.Any');

        this.roomRequest = root.lookupType('RoomReq');
        this.roomResp = root.lookupType('RoomResp');
        this.roomEvents = {
            join: root.lookupType('RoomJoinEvent'),
            leave: root.lookupType('RoomLeaveEvent'),
            online: root.lookupType('RoomOnlineEvent'),
        };

        this.initSocket();
    }
    private addLog(key: string, value = '') {
        if (BSocket.LOG.length > 1000) {
            BSocket.LOG.shift();
        }
        BSocket.LOG.push({ [key]: value });
    }

    private send(data: IRequest, type = this.msgType) {
        if (this.disposed) {
            return;
        }
        this.addLog('send', JSON.stringify(data));
        const info = this.toBuffer(data, type);
        if (info) {
            const state = this.readyState();
            switch (state) {
                case 0:
                    console.warn('is CONNECTING');
                    break;
                case 1:
                    this.ws?.send(info);
                    break;
                default:
                    this.retry();
                    break;
            }
        } else {
            console.warn('格式不对');
        }
    }
    // 初始化或重连websocket
    private initSocket() {
        const webSocket = window.MozWebSocket || window.WebSocket;
        try {
            if (this.config.protocols) {
                this.ws = new webSocket(this.config.url, this.config.protocols);
            } else {
                this.ws = new webSocket(this.config.url);
            }
            this.ws.binaryType = 'arraybuffer';
            this.ws.onopen = this.onopen.bind(this);
            this.ws.onmessage = this.onmessage.bind(this);
            this.ws.onclose = this.onclose.bind(this);
            this.ws.onerror = this.onerror.bind(this);

            this.bsocket.emit(EVENTS.B_INITED, this.inited);
            this.inited = true;
            this.disposed = false;
            this.addLog('init', this.config.url);
        } catch (err) {
            this.addLog('initErr', JSON.stringify(err));
            console.warn(err);
            this.onerror(err);
        }
    }
    /**
     * webSocket 连接成功
     */
    private onopen(data: Event) {
        this.addLog('open', JSON.stringify(data));
        this.retryCount = 0;
        this.bsocket.emit(EVENTS.B_OPEN, data);
        this.auth();
    }
    /**
     * webSocket 关闭
     */
    private onclose() {
        this.bsocket.emit(EVENTS.B_CLOSE);
        this.addLog('close', '');
    }
    /**
     * webSocket error
     */
    private onerror(err: any) {
        this.bsocket.emit(EVENTS.B_ERROR, err);
        this.addLog('err', JSON.stringify(err));
    }
    /**
     * 鉴权后执行订阅 以及进入房间
     */
    private onAuthed(msg: IRespose) {
        this.bsocket.emit(EVENTS.B_AUTH, msg);
        this.authed = true;

        if (this.config.subscribe?.length) {
            this.subscribe(this.config.subscribe);
            this.config.subscribe.length = 0;
        }
        const list = Object.keys(this.subscribed);
        if (list.length) {
            this.subscribeBase(list);
        }
        for (const room in this.roomed) {
            this.roomBase(this.roomed[room]);
        }
    }
    /**
     * 收到消息
     */
    private onmessage(response: MessageEvent) {
        const msg = this.toMsg(response.data, this.msgType);
        this.beatCount = 0;
        this.retryTimer && clearTimeout(this.retryTimer);
        this.heartBeat();

        this.addLog('msg', JSON.stringify(msg));
        if (!msg) {
            return;
        }
        if (msg.options?.isAck) {
            this.send({
                options: {
                    sequence: ++this.seq,
                },
                targetPath: PATH.MSG_ACK,
                body: this.encodeAny(
                    this.ackReqType.create({
                        ackId: msg.options.messageId,
                        ackOrigin: msg.options.ackOrigin,
                        targetPath: msg.targetPath,
                    }),
                    this.ackReqType,
                    PATH.MSG_ACK_REQ,
                ),
            });
        }
        if (msg?.targetPath) {
            switch (msg.targetPath) {
                case PATH.AUTH:
                    this.onAuthed(msg);
                    break;
                case PATH.SUBSCRIBE:
                    this.onSubscribed(msg);
                    break;
                case PATH.UNSUBSCRIBE:
                    this.onUnSubscribed(msg);
                    break;
                case PATH.HEARTBEAT:
                    this.bsocket.emit(EVENTS.B_HEARTBEAT, msg);
                    break;
                case PATH.ENTER:
                    this.onRoomMsg(msg);
                    break;
                default:
                    this.bsocket.emit(EVENTS.B_MSG, msg);
                    break;
            }
        }
        /**
         * 清除心跳次数
         * 链接成功，清除定时器
         *
         */
        delete this.msgFlag[msg.options?.sequence];
    }
    /**
     * @private 取消订阅成功
     */
    private onUnSubscribed(msg: IRespose) {
        const list = this.msgFlag[msg.options?.sequence] as string[];
        this.bsocket.emit(EVENTS.B_UN_SUB, msg, list);
        if (list) {
            for (let i = 0; i < list.length; i++) {
                delete this.subscribed[list[i]];
            }
        }
    }
    /**
     * 订阅成功
     */
    private onSubscribed(msg: IRespose) {
        const list = this.msgFlag[msg.options?.sequence] as string[];
        this.bsocket.emit(EVENTS.B_SUB, msg, list);
        if (list) {
            for (let i = 0; i < list.length; i++) {
                this.subscribed[list[i]] = list[i];
            }
        }
    }
    /**
     * 接收消息
     */
    private onRoomMsg(msg: IRespose) {
        if (msg.body?.value) {
            const value = this.toMsg(msg.body.value, this.roomResp) as IRoomRespose;

            // 房间消息推送
            if (value.msg?.targetPath) {
                if (this.outType[value.msg.targetPath]) {
                    const data = this.toMsg(value.msg.body.value!, this.outType[value.msg.targetPath]);
                    this.bsocket.emit(EVENTS.B_MSG, { data, id: value.id });
                    return;
                } else {
                    console.warn('err: targetPath mismatch >', value.msg.targetPath);
                }
            }
            const room: IRoom = this.msgFlag[msg.options?.sequence] as IRoom;
            // 进入、离开房间
            if (room) {
                switch (room.event) {
                    case ROOM.JOIN:
                        this.roomed[room.id] = room;
                        break;
                    case ROOM.LEAVE:
                        delete this.roomed[room.id];
                        break;
                    default:
                        break;
                }
                this.bsocket.emit(EVENTS.B_ROOM, value);
                return;
            }
        }
        this.bsocket.emit(EVENTS.B_MSG, msg);
    }
    /**
     * 鉴权
     */
    private auth() {
        this.send({
            options: {
                sequence: ++this.seq,
            },
            targetPath: PATH.AUTH,
            body: this.encodeAny(this.anyType.create({}), this.anyType, PATH.AUTHREQ),
        });
    }

    /**
     * 外部发送数据
     */
    outsend(data: any, targetPath: string, typeUrl: string) {
        this.addLog('outSend', JSON.stringify(data));
        if (this.outType[targetPath]) {
            this.send({
                options: {
                    sequence: ++this.seq,
                },
                targetPath,
                body: this.encodeAny(this.outType[targetPath].create(data), this.outType[targetPath], typeUrl),
            });
        } else {
            console.warn('no type: ' + targetPath);
        }
    }

    /**
     * 返回 webSocket 状态
     */
    readyState() {
        return this.ws?.readyState;
    }
    /**
     * 销毁
     */
    dispose() {
        this.disposed = true;
        this.addLog('event', 'dispose');
        this.retryTimer && clearTimeout(this.retryTimer);
        this.beatTimer && clearTimeout(this.beatTimer);
        this.close();
    }
    /**
     * 关闭webSocket
     */
    close() {
        this.addLog('event', 'close');
        this.ws?.close();
    }
    /**
     * 取消订阅(当不传或length===0时，取消订阅所有)
     */
    unSubscribe(path?: string[]) {
        this.addLog('unsubscribe', JSON.stringify(path));
        let unPath: string[] = [];
        if (path?.length) {
            let i, ele;
            for (i = 0; i < path.length; i++) {
                ele = path[i];
                if (this.subscribed[ele]) {
                    unPath.push(ele);
                    delete this.subscribed[ele];
                }
            }
        } else {
            unPath = Object.keys(this.subscribed);
        }
        this.subscribeBase(unPath, false);
    }
    /**
     *订阅
     *如果是初始话传入的subscribe，则不进行重复判断
     */
    subscribe(subscribe: ISubscribe[]) {
        this.addLog('subscribe', JSON.stringify(subscribe));

        if (!Array.isArray(subscribe)) {
            console.warn('not array subscribe');
            return;
        }
        try {
            const targetPaths: string[] = [];
            let i, ele, root, path;
            for (i = 0; i < subscribe.length; i++) {
                ele = subscribe[i];
                if (ele.json) {
                    root = this.protobuf.Root.fromJSON(JSON.parse(ele.json));
                    path = this.getTargetPaths(root, ele);
                    if (path) {
                        targetPaths.push.apply(targetPaths, path);
                    }
                }
            }
            if (targetPaths.length) {
                // 订阅
                this.subscribeBase(targetPaths);
            }
        } catch (error) {
            console.warn(error);
        }
    }
    /**
     * 获取未订阅的targetPaths
     */
    private getTargetPaths(root: Root, subscribe: ISubscribe) {
        if (!Array.isArray(subscribe.path)) {
            console.warn('not array path');
            return null;
        }
        // 生成类型
        let path: ISubscribePath;
        let targetPath: string;
        // 过滤已经订阅的
        const targetPaths: string[] = [];
        for (let i = 0; i < subscribe.path.length; i++) {
            path = subscribe.path[i];
            if (path.targetPath && path.typeUrl) {
                targetPath = path.targetPath;
                if (targetPath && !this.subscribed[targetPath]) {
                    this.outType[targetPath] = root.lookupType(path.typeUrl);
                    targetPaths.push(targetPath);
                }
            }
        }
        return targetPaths;
    }

    private subscribeBase(path: string[], subscribe = true) {
        if (!path || !path.length) return;

        let sequence = ++this.seq;

        this.msgFlag[sequence] = path;

        this.send({
            options: {
                sequence,
            },
            targetPath: subscribe ? PATH.SUBSCRIBE : PATH.UNSUBSCRIBE,
            body: this.encodeAny(
                this.targetPathType.create({
                    targetPaths: path,
                }),
                this.targetPathType,
                PATH.TARGETPATH,
            ),
        });
    }
    /**
     *进入/离开房间
     *如果是初始话传入的room，则不进行重复判断
     */
    room(data: IRoom) {
        this.addLog('roomIn', JSON.stringify(data));

        const id = data?.id;
        if (id) {
            switch (data.event) {
                case ROOM.JOIN:
                    if (this.roomed[id]) {
                        console.warn('is in room: ' + id);
                        return;
                    }
                    break;
                case ROOM.LEAVE:
                    if (!this.roomed[id]) {
                        console.warn('is not in room: ' + id);
                        return;
                    }
                    break;
                default:
                    break;
            }
        }
        if (this.authed) {
            this.roomBase(data);
        } else {
            this.roomed[data.id] = data;
        }
    }
    private roomBase(data: IRoom) {
        if (data.id && this.roomEvents[data.event]) {
            const body: IRoomReq = {
                id: data.id,
            };
            body[data.event] = this.roomEvents[data.event].create({});

            const seq = ++this.seq;
            this.msgFlag[seq] = data;

            this.send({
                options: {
                    sequence: seq,
                },
                targetPath: PATH.ENTER,
                body: this.encodeAny(this.roomRequest.create(body), this.roomRequest, PATH.ROOMREQ),
            });
        } else {
            console.warn('no event: ' + data.event);
        }
    }
    /**
     * 重连
     */
    private retry() {
        this.dispose();
        this.initSocket();
        const time = Math.min(this.config.retryTime + this.retryCount * this.config.retryStep, this.config.maxTime);
        this.retryCount++;
        this.retryTimer = window.setTimeout(() => {
            this.addLog('retry', String(this.retryCount));
            this.retry();
        }, time);
    }
    /**
     * 心跳
     */
    private heartBeat() {
        if (this.beatCount > 3) {
            this.retry();
            return true;
        }
        this.beatTimer && clearTimeout(this.beatTimer);
        this.beatTimer = window.setTimeout(() => {
            this.addLog('heartBeat', String(this.beatCount));

            this.beatCount++;
            this.send({
                options: {
                    sequence: ++this.seq,
                },
                targetPath: PATH.HEARTBEAT,
                body: this.encodeAny(this.beatReqType.create({}), this.beatReqType, PATH.HEARTBEATRES),
            });
            this.heartBeat();
        }, this.config.heartTime);
    }

    /**
     *  buffer转成数据
     */
    private toMsg(buffer: ArrayBuffer, type: Type) {
        let data;
        try {
            const message = type.decode(new Uint8Array(buffer));
            data = type.toObject(message) as IRespose;
        } catch (err) {
            this.onerror(err);
        }
        return data;
    }
    /**
     * 数据转成buffer
     */
    private toBuffer(data: IRequest, type: Type) {
        const errMsg = type.verify(data);
        if (errMsg) return '';

        let message = type.create(data);
        const buffer = type.encode(message).finish();
        return buffer;
    }
    /**
     *any 类型文件
     */
    private encodeAny(msg: Message<{}>, type: Type, url: string) {
        url = `type.googleapis.com${url}`;
        return this.anyType.create({
            type_url: url,
            value: type.encode(msg).finish(),
        });
    }
}
