import { debug } from "../debug";

interface IChannel {
    max: number;
    auth?: number;
    listeners: Function[];
}
interface Message {
    channel: string;
    payload: unknown;
}
class OOAPI {
    /** 频道列表 */
    channels: Record<string, IChannel> = {};
    constructor() {
        self.addEventListener('message', (event) => {
            if (!event) {
                return;
            }
            try {
                const msg = JSON.parse(event.data);
                if (msg.hasOwnProperty('channel') && typeof msg.channel === 'string') {
                    this.dispatchMessage(msg);
                } else {
                    __trace(msg, 'warn');
                }
            } catch (e) {
                __trace(e, 'err');
            }
        });
    }
    /**
     * 消息分发
     * @param msg 消息内容
     */
    protected dispatchMessage(msg: Message) {
        if (msg.channel in this.channels) {
            this.channels[msg.channel]?.listeners.forEach(d => {
                try {
                    d(msg.payload);
                } catch (e) {
                    if ((<Error>e).stack) {
                        __trace((<Error>e).stack?.toString(), 'err');
                    } else {
                        __trace((<Error>e).toString(), 'err');
                    }
                }
            });
        }
    };
    /** 读取所有频道 */
    listChannels = () => {
        const chl = <Record<string, Record<'max' | 'listeners', number>>>{};
        for (const chan in this.channels) {
            chl[chan] = {
                'max': this.channels[chan].max,
                'listeners': this.channels[chan].listeners.length
            };
        }
        return chl;
    };
    /**
     * 删除频道
     * @param channelId 频道名
     * @param authToken 口令
     * @returns 是否删除成功
     */
    deleteChannel = (channelId: string, authToken: number) => {
        if (!(channelId in this.channels)) {
            return true;
        }
        if (authToken || this.channels[channelId].auth) {
            if (authToken === this.channels[channelId].auth) {
                delete this.channels[channelId];
                return true;
            }
            return false;
        } else {
            delete this.channels[channelId];
            return true;
        }
    };
    /**
     * 创建频道
     * @param channelId 频道名
     * @param maximum 回调上限
     * @param authToken 口令
     * @returns 是否创建成功
     */
    createChannel = (channelId: string, maximum: number, authToken: number) => {
        if (!(channelId in this.channels)) {
            this.channels[channelId] = {
                'max': maximum ? maximum : 0,
                'auth': authToken,
                'listeners': []
            };
            return true;
        }
        return false;
    };
    /**
     * 监听频道
     * @param channel 频道
     * @param listener 监听回调
     * @returns 是否监听成功
     */
    addListenerChannel = (channel: string, listener: Function) => {
        if (!(channel in this.channels)) {
            this.channels[channel] = {
                'max': 0,
                'listeners': []
            };
        }
        if (this.channels[channel].max > 0) {
            if (this.channels[channel].listeners.length >=
                this.channels[channel].max) {
                return false;
            }
        }
        this.channels[channel].listeners.push(listener);
        return true;
    };
}

export const __OOAPI = new OOAPI();
/**
 * 日志
 * @param obj 内容
 * @param traceMode 级别
 */
export function __trace(obj: any, traceMode?: 'log' | 'warn' | 'err' | 'fatal') {
    switch (traceMode) {
        case "warn":
            debug.warn(obj);
            break;
        case "err":
            debug.error(obj);
            break;
        case "fatal":
            debug.error(obj);
            self.postMessage(JSON.stringify({
                'channel': 'fatal',
                'obj': obj
            }));
            break;
        default:
            debug.log(obj);
            break;
    }
};
/**
 * 发送消息（回调）
 * @param id 频道名
 * @param payload 内容
 * @param callback 回调
 */
export function __channel(id: string, payload: object, callback: Function) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'payload': payload,
        'callback': true
    }));
    __OOAPI.addListenerChannel(id, callback);
};
/**
 * 监听频道
 * @param id 频道名
 * @param callback 回调
 */
export function __schannel(id: string, callback: Function) {
    __OOAPI.addListenerChannel(id, callback);
};
/**
 * 发送消息（不回调）
 * @param id 频道名
 * @param payload 
 */
export function __pchannel(id: string, payload: any) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'payload': payload,
        'callback': false
    }));
};
/**
 * 发送消息（带口令）
 * @param id 频道名
 * @param auth 口令
 * @param payload 内容
 */
export function __achannel(id: string, auth: string, payload: any) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'auth': auth,
        'payload': payload,
        'callback': false
    }));
};