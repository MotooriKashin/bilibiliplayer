import Player from '../player';
import STATE from './state';
import EventEmitter from 'events';
import { WEBPAGE_RESPONSE } from '../const/webpage-directive';
import { PLAYER_RESPONSE, AI_STATUS_CHANGE, VI_RECT_CHANGE } from '../const/player-directive';

/**
 * @desc 外部数据
 */
export interface IReceiverMessage {
    _id: number;
    _origin: string;
    _directive: number;
    data?: any;
}

interface IDirectiveCallbackMaps {
    [id: number]: (response?: IReceiverMessage) => void;
}

export class DirectiveManager extends EventEmitter {
    private id = 0;
    private clientRect!: ClientRect | DOMRect;
    private readonly subject = 'html5';
    private readonly callbackMaps: IDirectiveCallbackMaps = {};
    playerEventLists: IReceiverMessage[] = [];

    constructor(private readonly player: Player) {
        super();
        this.init();
    }

    private init() {
        this.player.userLoadedCallback(info => {
            this.sender(AI_STATUS_CHANGE, info);
        });
        this.registerListener();
    }

    private sessionId() {
        return ++this.id;
    }

    private dispatchDirective(
        id: number,
        directive: number,
        data?: object | null,
        callback?: (response?: IReceiverMessage) => void,
        forPage?: boolean,
    ) {
        // 改为直接发送到auxiliary
        const dispatcher = this.player.auxiliary;
        const received = {
            _id: id,
            _origin: this.subject,
            _directive: directive,
            data: data,
        };
        if (dispatcher && typeof dispatcher.directiveDispatcher === 'function') {
            if (typeof callback === 'function') {
                this.callbackMaps[id] = callback;
            }
            dispatcher.directiveDispatcher(received);
            if (this.playerEventLists.length > 0) {
                while (this.playerEventLists.length > 0) {
                    dispatcher.directiveDispatcher(this.playerEventLists.shift());
                }
            }
        } else {
            this.playerEventLists.push(received);
        }
    }

    /**
     * @desc 发送指令
     */
    sender(directive: number, data?: object | null, callback?: (response?: IReceiverMessage) => void) {
        this.dispatchDirective(this.sessionId(), directive, data, callback);
    }

    /**
     * @desc 指令需要返回数据的时候调用
     */
    responder(received: IReceiverMessage, data?: object | null) {
        this.dispatchDirective(received['_id'], PLAYER_RESPONSE, data);
    }

    /**
     * @desc 接收指令
     */
    receiver(received: IReceiverMessage) {
        if (received && received['_directive']) {
            if (received['_directive'] === WEBPAGE_RESPONSE) {
                this.receivedResponseHandler(received);
            } else {
                this.receivedDirectiveHander(received);
            }
        }
    }

    private receivedResponseHandler(received: IReceiverMessage) {
        const id = received['_id'];
        if (this.callbackMaps[id]) {
            this.callbackMaps[id](received);
            delete this.callbackMaps[id];
        }
    }

    /**
     * @desc 发出事件，由对应的模块去处理相应的指令
     * @desc Player 销毁时，此模块内部会自动解绑所有事件
     * @example
     *   this.directiveManager.on(ADM_START_POS_PICKUP.toString(), (e, received: IReceiverMessage) => {
     *       // Your code
     *   });
     */
    private receivedDirectiveHander(received: IReceiverMessage) {
        this.emit(received['_directive'].toString(), null, received);
    }

    private registerListener() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, this.destroy.bind(this));
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, (event: Event, mode: number) => {
            if (!this.player.config.element) return;
            const rect = this.player.config.element.getBoundingClientRect();
            if (this.clientRect) {
                if (this.clientRect.width !== rect.width || this.clientRect.height !== rect.height) {
                    setTimeout(() => {
                        this.sender(VI_RECT_CHANGE, {
                            w: rect.width,
                            h: rect.height,
                            mode: this.player.state.mode,
                        });
                    }, 0);
                }
            } else {
                setTimeout(() => {
                    this.sender(VI_RECT_CHANGE, {
                        w: rect.width,
                        h: rect.height,
                        mode: this.player.state.mode,
                    });
                }, 0);
            }
            this.clientRect = rect;
        });
    }

    private destroy() {
        super.removeAllListeners();
        Object.keys(this.callbackMaps).forEach((id) => {
            delete this.callbackMaps[<any>id];
        });
    }
}
