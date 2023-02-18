import { Display } from "./Display/Display";
import { __trace } from "./OOAPI";

/** 日志 */
export function trace(msg: any) {
    if (typeof msg === 'object') {
        __trace(JSON.stringify(msg), 'log');
    } else {
        __trace(msg, 'log');
    }
}
/** 加载模块 */
export function load(library: string, onComplete: Function) {
    // 所有模块已内置，直接返回
    if (typeof onComplete === 'function') {
        onComplete();
    }
}
/** 克隆数据 */
export function clone(target: any) {
    if (null === target || 'object' !== typeof target) {
        return target;
    }

    if (typeof target['clone'] === 'function') {
        return target.clone();
    }

    if (Array.isArray(target)) {
        return target.slice(0);
    }

    const copy = <Record<string, any>>{};
    copy.constructor = copy.constructor;
    copy.prototype = copy.prototype;
    for (const x in target) {
        copy[x] = target[x];
    }
    return copy;
}
/**
 * 类似数组`forEach`方法
 * @param enumerable 数组
 * @param callback 回调
 */
export function foreach(enumerable: ArrayLike<any>, callback: Function) {
    if (null === enumerable || "object" !== typeof enumerable) {
        return;
    }
    // DisplayObjects 不可例举
    if (enumerable instanceof Display.DisplayObject) {
        return;
    }

    for (const x in enumerable) {
        if (enumerable.hasOwnProperty(x)) {
            callback(x, enumerable[x]);
        }
    }
}
/** 停止执行 */
export function stopExecution() {
    throw new Error('stopExecution')
}
/** 修正换行符 */
export function wrap(str: string) {
    return str
        .replace(/\\\/n/g, d => d.replace(/\/n/g, '_W_P_0')) // 正则里的/n预处理
        .replace(/\/n/g, '\n') // 修正换行符
        .replace(/\\"/gs, '_W_P_1') // 引号嵌套预处理
        .replace(/".*?"/gs, d => d.replace(/\n/g, '\\n')) // 引号换行
        .replace(/_W_P_1/g, '\\"') // 还原嵌套引号
        .replace(/_W_P_0/g, '/n'); // 还原非换行符的/n
}