import { __trace } from "../OOAPI";
import { Runtime } from "./Runtime";
import { Timer } from "./Timer";

interface IMotionManager {
    stop(): void;
}
export const ScriptManager = new (class {
    protected managedElements: Record<string, IMotionManager> = {};
    /** 注册元素动作管理 */
    _registerElement(name: string, mM: IMotionManager) {
        this.managedElements[name] = mM;
    }
    clearTimer() {
        Runtime.getTimer().clearAll('interval');
    }
    clearEl() {
        // Remove all elements drawn
        __trace("ScriptManager.clearEl may not be properly implemented.", "warn");
        Runtime.clear();
    }
    clearTrigger() {
        __trace("ScriptManager.clearTrigger not implemented.", "warn");
    }
    pushEl(el: any) {
        __trace("ScriptManager.pushEl is not properly implemented.", "warn");
        if (el['motionManager']) {
            <IMotionManager>el['motionManager'].start();
        }
        el['visible'] = true;
    }
    popEl(el: any) {
        __trace("ScriptManager.popEl is not properly implemented.", "warn");
        // TODO: Create some kind of thing to register motion managers properly
        if (el['motionManager']) {
            <IMotionManager>el['motionManager'].play();
        }
        el['visible'] = false;
    }
    pushTimer(t: Timer) {
        __trace("ScriptManager.pushTimer not implemented.", "warn");
    }
    popTimer(t: Timer) {
        __trace("ScriptManager.popTimer not implemented.", "warn");
    }
    toString() {
        return '[scriptManager ScriptManager]';
    }
})();