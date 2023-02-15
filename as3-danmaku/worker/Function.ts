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
    const comma: string[] = [];
    const arr = str.split('');
    let node = false;
    let nodex = false; // 多行注释
    arr.forEach((d, i, s) => {
        switch (d) {
            case '/': {
                if (!comma.length && s[i + 1] && s[i + 1] === '*') {
                    nodex = true;
                }
                if (!comma.length && s[i + 1] && s[i + 1] === '/') {
                    node = true;
                }
                if (s[i - 1] === '\\') break;
                // /n -> \n
                if (s[i + 1] && s[i + 1] === 'n') {
                    s[i] = '';
                    s[i + 1] = comma.length ? '\\n' : '\n';
                }
                break;
            }
            case '*': {
                if (nodex && s[i + 1] && s[i + 1] === '/') {
                    nodex = false;
                }
                break;
            }
            case '\n': {
                if (nodex) break;
                if (node) {
                    node = false;
                    break;
                }
                // 引号内 \n => \\n
                if (comma.length) {
                    s[i] = '\\n';
                }
                break;
            }
            case '"': {
                if (nodex || node) break;
                if (s[i - 1] === '\\') break;
                if (comma.length && comma[0] === d) {
                    comma.shift(); // 抛出后引号
                } else {
                    comma.unshift('"'); // 记录前引号
                }
                break;
            }
            case "'": {
                if (nodex || node) break;
                if (s[i - 1] === '\\') break;
                if (comma.length && comma[0] === d) {
                    comma.shift(); // 抛出后引号
                } else {
                    if (s[i - 1] && /[A-Za-z]/.test(s[i - 1]) && s[i + 1] && /[A-Za-z]/.test(s[i + 1])) break; // 忽略英文缩写
                    comma.unshift("'"); // 记录前引号
                }
                break;
            }
            default: break;
        }
    });
    return arr.join('');
}