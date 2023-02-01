import { BitmapData } from "./Display/Bitmap";
import { DisplayObject } from "./Display/DisplayObject";
import { Filter } from "./Display/Filter";
import { __schannel, __pchannel, __trace } from "./OOAPI";
import { Runtime } from "./Runtime/Runtime";
import { TimeKeeper } from "./Runtime/Timer";

export interface IComment {
    dbid: number;
    size: number;
    text: string;
    mode: number;
    stime: number;
    date: string;

    bitmapData?: BitmapData;
    parent?: DisplayObject;
    motionGroup?: any[];
    motion: any;

    class: string;
    x?: number;
    y?: number;
    alpha?: number;
    filters?: Filter[];
    lifeTime?: number;
}
/** 弹幕数据 */
class CommentData {
    blocked = false;
    blockType = 0;
    border = false;
    credit = false;
    date = "";
    deleted = false;
    id = 0;
    mode = 0;
    msg = "";
    live = true;
    locked = true;
    on = true;
    pool = 0;
    preview = false;
    reported = false;
    size = 25;
    stime = 0;
    text = "";
    type = "";
    uid = "";

    danmuId = 0;

    constructor(comment: IComment) {
        this.danmuId = comment["dbid"];
        this.size = comment["size"];
        this.text = comment["text"];
        this.mode = comment["mode"];
        this.stime = comment["stime"];
        this.date = comment["date"];
    }
}
class Sound {
    protected id = Runtime.generateId('obj-snd');
    protected isPlaying: boolean = false;

    constructor(protected source: string, protected onload?: Function) { }

    createFromURL(url: string) {
        this.source = url;
    }

    play() {
        if (this.isPlaying) {
            return;
        }
    }

    remove() {

    }

    stop() {
        if (!this.isPlaying) {
            return;
        }
    }

    loadPercent(): number {
        return 0;
    }

    getId(): string {
        return this.id;
    }

    dispatchEvent(eventName: string, params: any) {

    }

    unload() {
        this.stop();
    }

    serialize() {
        return {
            'class': 'Sound',
            'url': this.source
        };
    }
}

function createSound(sample: string, onload?: Function) {
    return new Sound(sample, onload);
}

export class Player {
    static createSound = createSound;
    state: string = '';
    protected _time: string = '';
    commentList: CommentData[] = [];
    refreshRate: number = 0;
    width: number = 0;
    height: number = 0;
    videoWidth: number = 0;
    videoHeight: number = 0;
    version: number = 0;
    lastUpdate: TimeKeeper = new TimeKeeper();

    get time() {
        if (this.state !== 'playing') {
            return this._time;
        } else {
            return this._time + this.lastUpdate.elapsed;
        }
    }


    constructor() {
        __schannel('Update:DimensionUpdate', (payload: any) => {
            this.width = payload["stageWidth"];
            this.height = payload["stageHeight"];
            if (payload.hasOwnProperty("videoWidth") &&
                payload.hasOwnProperty("videoHeight")) {

                this.videoWidth = payload["videoWidth"];
                this.videoHeight = payload["videoHeight"];
            }
        });
        __schannel("Update:TimeUpdate", (payload: any) => {
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
    /**
     * 跳转新视频
     * @param video vid
     * @param page p
     * @param newWindow 是否新建标签页（默认 否）
     */
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
    /**
     * 弹幕监听
     * @param callback 监听回调
     * @param timeout 延时
     */
    commentTrigger(callback: (comment: CommentData) => void, timeout: number) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support player triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        const player = Runtime.getObject('__player');
        (<any>player).addEventListener('comment', (v: CommentData) => callback(v));
        //TODO: remove the listener after timeout
        //player.removeEventListener('comment', listener);
    }
    /**
     * 监听按键
     * @param callback 案件名
     * @param timeout 延时
     * @param triggerOnUp 是否松开按钮再回调（默认 否）
     */
    keyTrigger(callback: (key: string) => void,
        timeout: number = 1000,
        triggerOnUp: boolean = false) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support key triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        const eventName: string = 'key' + (triggerOnUp ? 'up' : 'down');
        const player = Runtime.getObject('__player');
        (<any>player).addEventListener(eventName, (e: KeyboardEvent) => callback(e.key));
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