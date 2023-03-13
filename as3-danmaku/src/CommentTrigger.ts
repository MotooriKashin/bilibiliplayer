export class CommentTriggerManager {
    protected callbacks: Function[] = [];
    protected map = new WeakMap();
    addTrigger(param1: Function) {
        this.map.set(param1, this.callbacks.push(param1));
    };
    removeTrigger(param1: Function) {
        const index = this.map.get(param1);
        delete this.callbacks[index - 1];
        this.map.delete(param1);
    };
    trigger(param1: object) {
        this.callbacks.forEach(d => {
            d(param1);
        });
        return true;
    };
}