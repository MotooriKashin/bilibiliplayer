import { BitmapData } from "../Display/BitmapData";
import { DisplayObject } from "../Display/DisplayObject";
import { Filter } from "../Display/Filter";
import { __pchannel, __schannel, __trace } from "../OOAPI";
import { Runtime } from "../Runtime/Runtime";
import { TimeKeeper } from "../Runtime/Timer";
import { Utils } from "../Utils";
import { Sound } from "./sound";

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
export const Player = new (class {
    protected state = 'pause';
    protected _time = 0;
    protected commentList: CommentData[] = [];
    protected refreshRate = 0;
    width = 0;
    height = 0;
    videoWidth = 0;
    videoHeight = 0;
    screenWidth = 0;
    screenHeight = 0;
    version = 0;
    protected lastUpdate = new TimeKeeper();
    get time() {
        if (this.state !== 'playing') {
            return this._time;
        } else {
            return this._time + this.lastUpdate.elapsed;
        }
    }
    constructor() {
        __schannel('Update:DimensionUpdate', (payload: any) => {
            payload.stageWidth && (this.width = payload.stageWidth);
            payload.stageHeight && (this.height = payload.stageHeight);
            payload.videoWidth && (this.videoWidth = payload.videoWidth);
            payload.videoHeight && (this.videoHeight = payload.videoHeight);
            payload.screenWidth && (this.screenWidth = payload.screenWidth);
            payload.screenHeight && (this.screenHeight = payload.screenHeight);
        });
        __schannel("Update:TimeUpdate", (payload: any) => {
            payload.state && (this.state = payload.state);
            payload.time && (this._time = payload.time);
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
        av: string,
        page = 1,
        newWindow = false) {

        __pchannel("Player::action", {
            "action": "jump",
            "params": {
                "vid": av,
                "page": page,
                "window": newWindow
            }
        });
    }
    createSound(name: string, onload?: Function) {
        return new Sound(name, onload);
    }
    /**
     * 弹幕监听
     * @param callback 监听回调
     * @param timeout 延时
     */
    static commentTrigger(callback: (comment: CommentData) => void, timeout = 1000) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support player triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        const player = Runtime.getObject('__player');
        function temp(v: CommentData) {
            callback(v);
        }
        (<any>player).addEventListener('comment', temp);
        Utils.timer(() => (<any>player).removeEventListener('comment', temp), timeout);
    }
    /**
     * 监听按键
     * @param callback 案件名
     * @param timeout 延时
     * @param triggerOnUp 是否松开按钮再回调（默认 否）
     */
    keyTrigger(callback: (key: string) => void,
        timeout = 1000,
        triggerOnUp = false) {
        if (!Runtime.hasObject('__player')) {
            __trace('Your environment does not support key triggers.', 'err');
            return;
        }
        if (timeout < 0) {
            return;
        }
        function temp(e: KeyboardEvent) { callback(e.key) }
        const eventName = 'key' + (triggerOnUp ? 'up' : 'down');
        const player = Runtime.getObject('__player');
        (<any>player).addEventListener(eventName, temp);
        Utils.timer(() => (<any>player).removeEventListener(eventName, temp), timeout);
    }
    setMask(_mask: any) {
        __trace('Masking not supported yet', 'warn');
    }
    toString() {
        return '[player Player]';
    }
})();