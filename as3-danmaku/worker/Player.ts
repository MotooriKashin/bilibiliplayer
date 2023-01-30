/**
 * Partially Compliant CommentData Adapter
 */
class CommentData {
    private _dbid = 0;

    constructor(comment: Object) {
        this._dbid = comment["dbid"];
        this.size = comment["size"];
        this.text = comment["text"];
        this.mode = comment["mode"];
        this.stime = comment["stime"];
        this.date = comment["date"];
    }

    public blocked: boolean = false;
    public blockType: number = 0;
    public border: boolean = false;
    public credit: boolean = false;

    get danmuId(): number {
        return this._dbid;
    }

    public date: string = "";
    public deleted: boolean = false;
    public id: number = 0;
    public mode: number = 0;
    public msg: string = "";
    public live: boolean = true;
    public locked: boolean = true;
    public on: boolean = true;
    public pool: number = 0;
    public preview: boolean = false;
    public reported: boolean = false;
    public size: number = 25;
    public stime: number = 0;
    public text: string = "";
    public type: string = "";
    public uid: string = "";
}
/**
 * Class for sound support
 */
class Sound {
    private _id: string;
    private _isPlaying: boolean = false;

    constructor(protected _source: string, public onload?: Function) {
        this._id = Runtime.generateId('obj-snd');
    }

    public createFromURL(url: string): void {
        this._source = url;
    }

    public play(): void {
        if (this._isPlaying) {
            return;
        }
    }

    public remove(): void {

    }

    public stop(): void {
        if (!this._isPlaying) {
            return;
        }
    }

    public loadPercent(): number {
        return 0;
    }

    public getId(): string {
        return this._id;
    }

    public dispatchEvent(_eventName: string, _params: any): void {

    }

    public unload(): void {
        this.stop();
    }

    public serialize(): Object {
        return {
            'class': 'Sound',
            'url': this._source
        };
    }
}

function createSound(sample: string, onload?: Function): Sound {
    return new Sound(sample, onload);
}

export class Player {
    static createSound = createSound;
    accessor readonly state: string = '';
    private _time: string;
    accessor readonly commentList: CommentData[];
    accessor readonly refreshRate: number;
    accessor readonly width: number;
    accessor readonly height: number;
    accessor readonly videoWidth: number;
    accessor readonly videoHeight: number;
    accessor readonly version: number;
    lastUpdate: Runtime.TimeKeeper = new Runtime.TimeKeeper();

    get time() {
        if (this.state !== 'playing') {
            return this._time;
        } else {
            return this._time + this.lastUpdate.elapsed;
        }
    }


    constructor() {
        __schannel('Update:DimensionUpdate', (payload: object) => {
            this.width = payload["stageWidth"];
            this.height = payload["stageHeight"];
            if (payload.hasOwnProperty("videoWidth") &&
                payload.hasOwnProperty("videoHeight")) {

                this.videoWidth = payload["videoWidth"];
                this.videoHeight = payload["videoHeight"];
            }
        });
        __schannel("Update:TimeUpdate", (payload: object) => {
            this.state = payload["state"];
            this._time = payload["time"];
            this.lastUpdate.reset();
        });
    }

    play() {
        __pchannel("Player::action", {
            "action": "play"
        });
    }
    pause() {
        __pchannel("Player::action", {
            "action": "pause"
        });
    }
    seek(offset: number) {
        __pchannel("Player::action", {
            "action": "seek",
            "params": offset
        });
    }
    jump(
        video: string,
        page: number = 1,
        newWindow: boolean = false) {

        __pchannel("Player::action", {
            "action": "jump",
            "params": {
                "vid": video,
                "page": page,
                "window": newWindow
            }
        });
    }
    commentTrigger(callback: Function, timeout: number) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support player triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        var listener = function (comment: CommentData) {
            callback(comment);
        };
        var player: Runtime.IMetaObject =
            Runtime.getObject<Runtime.IMetaObject>('__player');
        player.addEventListener('comment', listener);
        //TODO: remove the listener after timeout
        //player.removeEventListener('comment', listener);
    }
    keyTrigger(callback: Function,
        timeout: number = 1000,
        triggerOnUp: boolean = false) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support key triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        var eventName: string = 'key' + (triggerOnUp ? 'up' : 'down');
        var listener: (number) => void = function (key) {
            callback(key.keyCode);
        };
        var player: Runtime.IMetaObject =
            Runtime.getObject<Runtime.IMetaObject>('__player');
        player.addEventListener(eventName, listener);
        //TODO: remove the listener after the timeout
        //player.removeEventListener(eventName, listener);
    }
    setMask(_mask: any) {
        __trace('Masking not supported yet', 'warn');
    }
    toString() {
        return '[player Player]';
    }
}