import Main from './ts/main';

export interface IConfig {
    url: string; // 地址
    urlList: string[]; // 地址列表
    rid: number; // 房间 ID
    accepts: [];
    platform: 'web'; // web
    operation: any;
    retry?: boolean; // 是否自动重试
    retryMaxCount?: number; // 重试次数，默认0，无限次
    retryInterval?: number; // 开启自动重试，设定自动重试间隔
    version?: number;
    fallback?: Function; // 关闭自动重试，设定链接失败后回调
    heartBeatInterval?: number; // 心跳包间隔，默认30s, 如果活动需要稳定，可以减少
    onHeartBeatReply?: Function; // 收到 Heart Beat 回调
    onChangeRoomReply?: Function; // 收到ChangeRoom回调
    onRegisterReply?: Function; // 收到注册指令回调
    onUnRegisterReply?: Function; // 收到取消注册指令回调
    onInitialized?: Function; // WebSocket 初始化完成回调
    onReceivedMessage?: Function;
    onRetryFallback?: Function;
    onMsgReply?: Function;
    onOgvCmdReply?: Function; // 首播EP收到Ovg指令回调
    onOpen?: Function; // WebSocket Open 回调
    onClose?: Function; // WebSocket Close 回调
    onError?: Function; // WebSocket Error 回调
    onListConnectError?: Function; // UrlList 连接错误回调
    backoff?: {
        max_delay: 120; // 最大重试间隔
        base_delay: 3; // 初始重试间隔
        factor: 1.6; // 间隔递增
        jitter: 0.2; // 间隔抖动
    };
}
class Broadcast {
    ws: Main;
    constructor(config: IConfig) {
        this.ws = new Main(config);
    }

    destroy() {
        this.ws && this.ws.destroy();
    }

    send(data: any) {
        this.ws && this.ws.send(data);
    }

    getAuthInfo() {
        return this.ws && this.ws.getAuthInfo();
    }

    getRetryCount() {
        return this.ws && this.ws.getRetryCount();
    }
    /**
     * 切换房间号
     */
    changeRoom(data: any) {
        return this.ws && this.ws.changeRoom(data);
    }

    /**
     * 注册指令
     */
    registerOperation(operation: any) {
        return this.ws && this.ws.registerOperation(operation);
    }

    /**
     * 取消注册指令
     */
    unRegisterOperation(operation: any) {
        return this.ws && this.ws.unRegisterOperation(operation);
    }
}

export default Broadcast;
