import { BridgedSandbox } from "./BridgedSandbox";
import { ScriptingContext } from "./ScriptingContext";

export class CCLScripter {
    version = 1.0;
    logger = {
        log: (...msg: any) => { console.log(...msg); },
        error: (...msg: any) => { console.error(...msg); },
        warn: (...msg: any) => { console.warn(...msg); }
    };
    constructor(private workerUrl: string) { }
    getWorker() {
        return new Worker(this.workerUrl);
    }
    getScriptingContext(stage: HTMLElement) {
        return new ScriptingContext(this, stage);
    }
    getSandbox(stage: HTMLElement, player) {
        return new BridgedSandbox(this, stage, player);
    };
}