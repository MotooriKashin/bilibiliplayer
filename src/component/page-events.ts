interface ITriggerReloadData {
    aid: string;
    cid: string;
    bvid?: string;
}

interface IReceived {
    _id: number;
    _directive: number;
    _origin: string;
    data: any;
}

const PLAYER_RESPONSE = 100000;

const PW_PGC_FOLLOW = 129001;
const PW_PGC_BPP = 129002;
const PW_PLAYER_EXTRA = 129003;
const PW_PAGE_HEIMU = 129004;
const PW_PAGE_VIPPAY = 129005;
const PW_PAGE_PAY = 129006;
const PW_PAGE_SHOW1080 = 129007;
const PW_PLAYER_FULLWIN = 129008;
const PW_PLAYER_WIDEWIN = 129009;
const PW_PLAYER_CHANGE = 129010;
const PW_NUM_ONLINE = 129011;
const PW_SEND_ERROR = 129012;
const PW_FEEDBACK_PANEL = 129013;

const PI_UGC_RELOAD = 130001;
const PI_UGC_FOLLOW = 130002;
const PI_UGC_LIKE = 130003;
const PI_COMMON_COIN = 130004;
const PI_UGC_COLLECT = 130005;
const PI_UGC_AUTHOR = 130006;
const PI_UGC_ELECMODAL = 130007;
const PI_UGC_ACTION = 130008;
const PI_UGC_FUNCTIONS = 130009;
const PI_UGC_ELECLIST = 130010;
const PI_UGC_ELECFEED = 130011;
const PI_UGC_ELECLAST = 130012;

const PAGE_RESPONSE = 200000;
const WP_GET_PLAYER_STATE = 228002;
const WP_SET_PLAYER_STATE = 228003;

const pageEvents = {
    callbackMaps: <Record<string, any>>{},
    id: -1,
    sessionId() {
        return --this.id;
    },
    dispatchDirective(
        id: number,
        directive: number,
        data?: object | null,
        callback?: (response?: IReceived) => void,
        origin = 'webpage',
    ) {
        const dispatcher = window.directiveDispatcher;
        if (typeof dispatcher === 'function') {
            if (typeof callback === 'function') {
                this.callbackMaps[id] = callback;
            }
            dispatcher({
                _id: id,
                _origin: origin,
                _directive: directive,
                data: data,
            });
        }
    },

    /**
     * @desc 发送指令
     */
    sender(directive: number, data?: object | null, callback?: (response?: IReceived) => void, origin = 'webpage') {
        this.dispatchDirective(this.sessionId(), directive, data, callback, origin);
    },

    /**
     * @desc 指令需要返回数据的时候调用
     */
    responder(received: IReceived, data?: object | null) {
        this.dispatchDirective(received['_id'], PAGE_RESPONSE, data);
    },
    /**
     * @desc 接收指令
     */
    receiver(received: IReceived) {
        if (received && received._directive) {
            if (received._id < 0) {
                if (this.callbackMaps[received._id]) {
                    this.callbackMaps[received._id](received.data);
                    delete this.callbackMaps[received._id];
                }
                return;
            }
            switch (received._directive) {
                case PI_UGC_RELOAD: // 01
                    this.triggerReload(received.data);
                    break;
                case PI_UGC_FOLLOW: // 02
                    this.attentionTrigger(received.data);
                    break;
                case PI_UGC_LIKE: // 03
                    this.triggerEvent('playerCallSendLike');
                    break;
                case PI_COMMON_COIN: // 04
                    this.triggerEvent('playerCallSendCoin');
                    break;
                case PI_UGC_COLLECT: // 05
                    this.triggerEvent('playerCallSendCollect');
                    break;
                case PI_UGC_AUTHOR: // 06
                    this.responder(received, this.getPageInfo('getAuthorInfo'));
                    break;
                case PI_UGC_ELECMODAL: // 07
                    this.getPageElec('showModal');
                    break;
                case PI_UGC_ACTION: // 08
                    this.responder(received, this.getPageInfo('getActionState'));
                    break;
                case PI_UGC_FUNCTIONS: // 09
                    this.responder(received, this.getPageFunctions());
                    break;
                case PI_UGC_ELECLIST: // 10
                    this.responder(received, this.getPageElec('getElecData'));
                    break;
                case PI_UGC_ELECFEED: // 11
                    this.responder(received, this.getPageElec('isCharged'));
                    break;
                case PI_UGC_ELECLAST: // 12
                    this.responder(received, this.getPageElec('isLastAv'));
                    break;
                case PW_PGC_FOLLOW: // 01
                    this.getPgcFollow(received.data, (data: {}) => {
                        this.responder(received, data);
                    });
                    break;
                case PW_PGC_BPP: // 02
                    this.getPageBpp('open');
                    break;
                case PW_PLAYER_EXTRA: // 03
                    this.responder(received, this.getPageInfo('getPlayerExtraParams'));
                    break;
                case PW_PAGE_HEIMU: // 04
                    this.getPageHeimu(received.data);
                    break;
                case PW_PAGE_VIPPAY: // 05
                    this.triggerEvent('showVipPay');
                    break;
                case PW_PAGE_PAY: // 06
                    this.triggerEvent('showPay');
                    break;
                case PW_PAGE_SHOW1080: // 07
                    this.triggerEvent('show1080p');
                    break;
                case PW_PLAYER_FULLWIN: // 08
                    this.screenChange('player_fullwin', received.data);
                    break;
                case PW_PLAYER_WIDEWIN: // 09
                    this.screenChange('player_widewin', received.data);
                    break;
                case PW_PLAYER_CHANGE: // 10
                    this.graymanager('clickMenu', received.data && received.data.type);
                    break;
                case PW_NUM_ONLINE: // 11
                    this.setNumOnline(received.data);
                    break;
                case PW_SEND_ERROR: // 12
                    this.setSendError(received.data);
                    break;
                case PW_FEEDBACK_PANEL: // 13
                    this.graymanager('getFeedback');
                    break;
                default:
                    break;
            }
        }
    },
    // reload
    triggerReload(data: ITriggerReloadData) {
        const prop = this.getWindowProp('triggerReload');
        if (prop && data) {
            prop(data.aid, data.cid, data.bvid);
        }
    },
    // 关注
    attentionTrigger(data: {}) {
        const prop = this.getWindowProp('attentionTrigger');
        prop && prop(data);
    },
    // 触发页面方法
    triggerEvent(name: string) {
        const prop = this.getWindowProp(name);
        prop && prop();
    },
    // 获取页面信息
    getPageInfo(name: string) {
        const prop = this.getWindowProp(name);
        if (prop) {
            return prop();
        }
        return null;
    },
    // 获取充电信息
    getPageElec(name: string) {
        const prop = this.getPlayerAgentProp('elecPlugin');
        if (prop) {
            if (typeof prop[name] === 'function') {
                return prop[name]();
            }
            return null;
        }
        return null;
    },
    // 获取播放器额外参数
    getExtraParams(name: string) {
        const prop = this.getWindowProp(name);
        if (prop) {
            const elec = prop();
            if (typeof elec[name] === 'function') {
                return elec[name]();
            }
            return null;
        }
        return null;
    },
    // pgc追番
    getPgcFollow(data: { isFollow: boolean }, cb: Function) {
        const prop = this.getWindowProp('callBangumiFollow');
        if (prop && data) {
            prop(data.isFollow, cb);
        }
    },
    // pgc承包
    getPageBpp(name: string) {
        const prop = this.getPlayerAgentProp('objBPPlugin');
        if (prop) {
            if (typeof prop[name] === 'function') {
                return prop[name]();
            }
            return null;
        }
        return null;
    },
    // 开关灯
    getPageHeimu(data: { opacity: number; show: boolean }) {
        const prop = this.getWindowProp('heimu');
        if (prop && data) {
            prop(data.opacity, data.show);
        }
    },
    // 屏幕变化
    screenChange(method: string, data: { isWin: boolean }) {
        const prop = this.getWindowProp(method);
        if (prop && data) {
            prop(data.isWin);
        }
    },
    // 在线人数
    setNumOnline(data: { num: number }) {
        const prop = this.getWindowProp('PlayerSetOnline');
        if (prop && data) {
            prop(data.num);
        }
    },
    setSendError(data: { code: number; message: string }) {
        const prop = this.getWindowProp('showRealNameBind');
        if (prop && data) {
            prop(+data.code, data.message);
        }
    },
    // graymanager 方法
    graymanager(method: string, data: {} | undefined = undefined) {
        const prop = this.getPlayerAgentProp('GrayManager');
        if (prop && typeof prop[method] === 'function') {
            prop[method](data);
        }
    },
    // 获取页面所有方法
    getPageFunctions() {
        const data: Record<string, any> = {};
        const playerAgent = [
            'attentionTrigger',
            'getAuthorInfo',
            'elecPlugin',
            'objBPPlugin',
            'playerCallSendCoin',
            'playerCallSendLike',
            'playerCallSendCollect',
            'callBangumiFollow',
            'getActionState',
        ];
        for (let i = 0, len = playerAgent.length; i < len; i++) {
            const element = playerAgent[i];
            const prop = this.getPlayerAgentProp(element);
            if (prop) {
                data[element] = element;
            }
        }
        return data;
    },
    getWindowProp(prop: string) {
        const agent = window.PlayerAgent;
        const method = (agent && agent[<keyof typeof agent>prop]) || window[<keyof Window>prop];
        if (typeof method === 'function') {
            return method;
        }
        return null;
    },
    getPlayerAgentProp(prop: string) {
        const agent = window.PlayerAgent;
        return (agent && agent[<keyof typeof agent>prop]) || window[<keyof Window>prop];
    },
};

export default pageEvents;
