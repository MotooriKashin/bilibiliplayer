export class Global {
    static _store = {};
    static _set = (key, val) => {
        this._store[key] = val;
    };
    static _get = (key) => {
        return this._store[key];
    };
    static _ = (key) => {
        return this._get(key);
    };
}