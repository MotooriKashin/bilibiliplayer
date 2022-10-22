export class Deferred<T> {
    resolve!: (value?: T | PromiseLike<T>) => void;
    reject!: (reason?: any) => void;
    private readonly promise: Promise<T>;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = <any>resolve;
            this.reject = reject;
        });
    }

    then(onFulfilled?: (value: T) => T | PromiseLike<T>, onRejected?: (reason: any) => PromiseLike<never>): Promise<T> {
        return this.promise.then(onFulfilled, onRejected);
    }

    catch(onRejected?: (reason: any) => PromiseLike<never>): Promise<T> {
        return this.promise.catch(onRejected);
    }
}
