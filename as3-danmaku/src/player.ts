import { As3Danmaku } from "..";
import { CommentTriggerManager } from "./CommentTrigger";
import { RootSprite } from "./Display/Sprite";
import { ScriptEventManager } from "./ScriptEventManager";

export class Player {
    parent: RootSprite;
    scriptEventManager = new ScriptEventManager();
    commentTriggerManager = new CommentTriggerManager();
    debugEnabled = true;
    codeHighlightEnabled = true;
    commentList = [];
    constructor(protected player: any, protected as3: As3Danmaku, wrap: HTMLDivElement) {
        this.parent = new RootSprite(wrap);
    }
    get width() {
        return this.as3.resolutionWidth;
    }
    get height() {
        return this.as3.resolutionHeight;
    }
    get isPlayerControlApiEnable() {
        return this.as3.visibleStatus;
    }
    get scriptEnabled() {
        return this.as3.visibleStatus;
    }
    get stime() {
        return this.as3.cTime;
    }
    get videoWidth() {
        return this.as3.resolutionWidth;
    }
    get videoHeight() {
        return this.as3.resolutionHeight;
    }
    get stageWidth() {
        return this.as3.resolutionWidth;
    }
    get stageHeight() {
        return this.as3.resolutionHeight;
    }
    play() {
        this.player.play();
    }
    pause() {
        this.player.pause();
    }
    seek(offset: number) {
        this.player.seek(offset);
    }
}