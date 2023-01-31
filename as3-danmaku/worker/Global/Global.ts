export class Global {
    static _store: Record<string, any> = {};
    static _set = (key: string, val: any) => {
        this._store[key] = val;
    };
    static _get = (key: string) => {
        return this._store[key];
    };
    static _ = (key: string) => {
        return this._get(key);
    };
}