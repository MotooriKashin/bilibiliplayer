import Auxiliary from '../auxiliary';
import STATE from './state';
import { EventEmitter } from 'events';
import { WEBPAGE_RESPONSE } from '../const/webpage-directive';
import { PLAYER_RESPONSE } from '../const/player-directive';

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
    private readonly subject = 'webpage';
    private readonly callbackMaps: IDirectiveCallbackMaps = {};
    private loadCallbacks: any[] = [];
    private initialized = false; // 只有为true才会执行所有回调

    constructor(private readonly auxiliary: Auxiliary) {
        super();
        this.init();
        this.registerListener();
    }

    private init() { }

    private sessionId() {
        return ++this.id;
    }

    private dispatchDirective(
        id: number,
        directive: number,
        data?: object | null,
        callback?: (response?: IReceiverMessage) => void,
    ) {
        const dispatcher = this.auxiliary.player.directiveManager;
        if (typeof dispatcher.receiver === 'function') {
            if (typeof callback === 'function') {
                this.callbackMaps[id] = callback;
            }
            dispatcher.receiver({
                _id: id,
                _origin: this.subject,
                _directive: directive,
                data: data,
            });
        } else {
            console.warn('Can not found `player.directiveManager` method');
        }
    }

    /**
     * @desc 发送指令
     */
    sender(directive: number, data?: object | null, callback?: (response?: IReceiverMessage) => void) {
        if (this.initialized) {
            this.dispatchDirective(this.sessionId(), directive, data, callback);
        } else {
            this.loadCallbacks.push({
                directive: directive,
                data: data,
                callback: callback,
            });
        }
    }

    /**
     * @desc 指令需要返回数据的时候调用
     */
    responder(received: IReceiverMessage, data?: object | null) {
        this.dispatchDirective(received['_id'], WEBPAGE_RESPONSE, data);
    }

    /**
     * @desc 接收指令
     */
    receiver(received: IReceiverMessage) {
        if (received && received['_directive']) {
            if (received['_directive'] === PLAYER_RESPONSE) {
                this.receivedResponseHandler(received);
            } else {
                this.receivedDirectiveHander(received);
            }
        }
    }

    complete() {
        this.initialized = true;
        while (this.loadCallbacks.length > 0) {
            const data = this.loadCallbacks.shift();
            this.dispatchDirective(this.sessionId(), data.directive, data.data, data.callback);
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
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, this.destroy.bind(this));
    }

    private destroy() {
        super.removeAllListeners();
        Object.keys(this.callbackMaps).forEach((id) => {
            delete this.callbackMaps[<keyof IDirectiveCallbackMaps><unknown>id];
        });
    }
}
