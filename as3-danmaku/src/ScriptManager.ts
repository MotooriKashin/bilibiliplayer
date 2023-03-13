import { debug } from "../debug";
import { CommentScript } from "./CommentScript";
import { Player } from "./player";
import { Timer } from "./Runtime/Timer";

export class ScriptManager {
    protected managedElements = new WeakSet();
    constructor(private _player: Player, protected factory: CommentScript) { }
    clearTimer() {
        debug.warn('ScriptManager.clearTimer may not be properly implemented.');
    }
    clearTrigger() {
        debug.warn("ScriptManager.clearTrigger not implemented.");
    }
    pushEl(el: any) {
        this.managedElements.add(el);
    }
    popEl(el: any) {
        try {
            el.motionManager.stop();
            el["remove"]();
            this.managedElements.delete(el);
        } catch { }
    }
    pushTimer(t: Timer) {
        this.managedElements.add(t);
    }
    popTimer(t: Timer) {
        try {
            t.stop();
            this.managedElements.delete(t);
        } catch { }
    }
}