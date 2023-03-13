export class ScriptEventManager {
    private record: Function[] = [];
    addKeyboardHook(func: Function, isUp = false) {
        document.addEventListener(isUp ? 'keyup' : 'keydown', <any>func);
        this.record.push(() => {
            this.removeKeyboardHook(func, isUp);
        })
    }
    removeKeyboardHook(func: Function, isUp = false) {
        document.removeEventListener(isUp ? 'keyup' : 'keydown', <any>func);
    }
    removeAll() {
        while (this.record.length) {
            this.record.shift()?.();
        }
    }
}