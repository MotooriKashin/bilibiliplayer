/**
 * TODO: 完善声明
 * @file playurl模块
 */
export default class PlayurlModule {
    static Pointer_stringify(input: Record<string, any>): string;
    static cwrap(ptr: string, p2: any, arr: string[]);
    static Runtime: {
        addFunction(callback: Function): void;
    }
}