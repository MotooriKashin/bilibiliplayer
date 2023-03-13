import { DisplayObject } from "../Display/DisplayObject";
import { Player } from "../player";
import { ScriptSound } from "./ScriptSound";

export class ScriptPlayer {
    protected _state = 'pause';
    protected _time = 0;
    constructor(protected _player: Player) { }
    play() {
        if (!this._player.isPlayerControlApiEnable) {
            return;
        }
        this._player.play();
    }
    pause() {
        if (!this._player.isPlayerControlApiEnable) {
            return;
        }
        this._player.pause();
    }
    seek(offset: number) {
        if (!this._player.isPlayerControlApiEnable) {
            return;
        }
        this._player.seek(offset / 1000);
    }
    jump(av: string, page = 1, newWindow = false) {
        window.open(`https://www.bilibili.com/video/${av}?p=${page}`, newWindow ? '_self' : '_blank');
    }
    get state() {
        return this._state;
    }
    get time() {
        return this._time * 1000;
    }
    commentTrigger(func: Function, timeout = 1000) {
        if (!this._player.isPlayerControlApiEnable) {
            return 0;
        }
        this._player.commentTriggerManager.addTrigger(func);
        let timer = setTimeout(() => {
            clearTimeout(timer);
            this._player.commentTriggerManager.removeTrigger(func);
        }, timeout);
        return timer;
    }
    keyTrigger(func: Function, timeout = 1000, isUp = false) {
        if (!this._player.isPlayerControlApiEnable) {
            return 0;
        }
        this._player.scriptEventManager.addKeyboardHook(func, isUp);
        let timer = setTimeout(() => {
            clearTimeout(timer);
            this._player.scriptEventManager.removeKeyboardHook(func, isUp);
        }, timeout);
        return timer;
    }
    setMask(mask: DisplayObject) {
        if (!this._player.isPlayerControlApiEnable) {
            return;
        }
        this._player.parent.mask = mask;
    }
    createSound(name: string, onload?: Function) {
        if (!this._player.isPlayerControlApiEnable) {
            return;
        }
        return new ScriptSound(name, onload);
    }
    get commentList() {
        if (!this._player.isPlayerControlApiEnable) {
            return [];
        }
        return this._player.commentList;
    }
    get refreshRate() {
        return 0;
    }
    set refreshRate(param1: number) {

    }
    get width() {
        return this._player.stageWidth;
    }
    get height() {
        return this._player.stageHeight;
    }
    get videoWidth() {
        return this._player.videoWidth;
    }
    get videoHeight() {
        return this._player.videoHeight;
    }
    get isContinueMode() {
        return false;
    }
}