export class GlobalVariables {
    _store: Record<string, any> = {};
    _set = (key: string, val: any) => {
        this._store[key] = val;
    };
    _get = (key: string) => {
        return this._store[key];
    };
    _ = (key: string) => {
        return this._get(key);
    };
}