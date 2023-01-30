
class OOAPI {
    channels = {};
    constructor() {
        self.addEventListener('message', (event) => {
            let msg;
            if (!event) {
                return;
            }
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                __trace(e, 'err');
                return;
            }
            if (msg !== null && msg.hasOwnProperty('channel') &&
                typeof msg.channel === 'string') {
                this.dispatchMessage(msg);
            } else {
                __trace(msg, 'warn');
            }
        });
    }
    protected dispatchMessage(msg) {
        if (this.channels.hasOwnProperty(msg.channel)) {
            for (let i = 0; i < this.channels[msg.channel].listeners.length; i++) {
                try {
                    this.channels[msg.channel].listeners[i](msg.payload);
                } catch (e) {
                    if (e.stack) {
                        __trace(e.stack.toString(), 'err');
                    } else {
                        __trace(e.toString(), 'err');
                    }
                }
            }
        } else {
            __trace('Got message on channel "' + msg.channel +
                '" but channel does not exist.', 'warn');
        }
    };
    listChannels = () => {
        const chl = {};
        for (let chan in this.channels) {
            chl[chan] = {
                'max': this.channels[chan].max,
                'listeners': this.channels[chan].listeners.length
            };
        }
        return chl;
    };
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

export function __trace(obj: any, traceMode: string) {
    self.postMessage(JSON.stringify({
        'channel': '',
        'obj': obj,
        'mode': (traceMode ? traceMode : 'log')
    }));
};

export function __channel(id: string, payload: object, callback: Function) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'payload': payload,
        'callback': true
    }));
    __OOAPI.addListenerChannel(id, callback);
};

export function __schannel(id: string, callback: Function) {
    __OOAPI.addListenerChannel(id, callback);
};

export function __pchannel(id: string, payload: object) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'payload': payload,
        'callback': false
    }));
};

export function __achannel(id: string, auth: string, payload: string) {
    self.postMessage(JSON.stringify({
        'channel': id,
        'auth': auth,
        'payload': payload,
        'callback': false
    }));
};