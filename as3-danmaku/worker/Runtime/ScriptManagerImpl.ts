import { Timer } from "./Timer";

interface IMotionManager {
    stop(): void;
}
export class ScriptManagerImpl {
    private _managedElements: { [name: string]: IMotionManager } = {};

    constructor() { }

    /**
     * Internal method to register an element's MotionManager with ScriptManager
     */
    public _registerElement(name: string, mM: IMotionManager): void {
        this._managedElements[name] = mM;
    }

    public clearTimer(): void {
        Runtime.getTimer().clearAll('interval');
    }

    public clearEl(): void {
        // Remove all elements drawn
        __trace("ScriptManager.clearEl may not be properly implemented.", "warn");
        Runtime.clear();
    }

    public clearTrigger(): void {
        __trace("ScriptManager.clearTrigger not implemented.", "warn");
    }

    public pushEl(el: any): void {
        __trace("ScriptManager.pushEl is not properly implemented.", "warn");
        if (el['motionManager']) {
            <IMotionManager>el['motionManager'].start();
        }
        el['visible'] = true;
    }

    public popEl(el: any): void {
        __trace("ScriptManager.popEl is not properly implemented.", "warn");
        // TODO: Create some kind of thing to register motion managers properly
        if (el['motionManager']) {
            <IMotionManager>el['motionManager'].play();
        }
        el['visible'] = false;
    }

    public pushTimer(t: Timer): void {
        __trace("ScriptManager.pushTimer not implemented.", "warn");
    }

    public popTimer(t: Timer): void {
        __trace("ScriptManager.popTimer not implemented.", "warn");
    }

    public toString(): string {
        return '[scriptManager ScriptManager]';
    }
}