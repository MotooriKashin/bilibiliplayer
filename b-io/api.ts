
const isNumber = (val: unknown): val is number => !isNaN(parseFloat(<string>val)) && isFinite(<number>val);

export class URL {
    /** 锚 */
    hash?: string;
    /** 基链 */
    base: string;
    /** 参数对象。结果会格式化`undefined``null``NaN`等特殊值，但不会处理数字，以免丢失精度。 */
    params: Record<string, string | number> = {};
    /** 参数链（不含`?`） */
    get param() {
        return Object.entries(this.params).reduce((s, d) => {
            return s += `${s ? "&" : ""}${d[0]}=${d[1]}`;
        }, "");
    }
    /** 提取URL参数 */
    constructor(url: string) {
        const arr1 = url.split("#"); // 第一次分割
        let str = <string>arr1.shift(); // 脱锚
        this.hash = arr1.join("#"); // 提取锚
        (this.hash || url.includes("#")) && (this.hash = `#${this.hash}`); // 格式化锚
        const arr2 = str.split("?"); // 第二次分割
        this.base = <string>arr2.shift(); // 提取基链
        str = arr2.join("?"); // 提取参数
        if (str) {
            str.split("&").forEach(d => {
                const arr3 = d.split("="); // 第三次分割
                const key = <string>arr3.shift(); // 提取键
                let value = arr3.join("=") || ""; // 提取值
                try {
                    if (!isNumber(value)) {
                        value = JSON.parse(value); // 格式化
                    }
                } catch {
                    value === "undefined" && (value = <any>undefined);
                    value === "NaN" && (value = <any>NaN);
                }
                this.params[key] = value;
            });
        }
    }
    sort() {
        this.params = Object.keys(this.params).sort().reduce((s, d) => {
            s[d] = this.params[d];
            return s;
        }, <Record<string, string | number>>{});
    }
    /** 还原url链接 */
    toJSON() {
        return `${this.base ? this.param ? this.base + "?" : this.base : ""}${this.param}${this.hash || ""}`
    }
}

/**
 * 查询参数对象转URL
 * @param url 基链URL，可为空字符串不过返回的将是不含`?`的纯参数链
 * @param obj 查询参数对象，将覆盖基链URL已有参数
 */
export function objUrl(url: string, obj: Record<string, string | number | boolean>) {
    const res = new URL(url);
    Object.entries(obj).forEach(d => {
        if (d[1] === undefined || d[1] === null) return;
        res.params[d[0]] = <any>d[1];
    });
    return res.toJSON();
}
/**
 * 提取URL参数对象，不含参数时返回空对象。**参数判定要求URL至少含有一个`?`**  
 * 结果会格式化`undefined``null``NaN`等特殊值，但不会处理数字，以免丢失精度。
 * @param url 原始URL
 */
export function urlObj(url: string) {
    const res = new URL(url);
    return res.params;
}

/** 检查B站json接口`code !== 0`直接抛出错误 */
export function jsonCheck<T extends IBilibiliJson>(json: T) {
    if (json.code === 0) return json;
    throw new Error(`${json.code} ${json.message}`, { cause: json.code });
}

interface IBilibiliJson {
    code: number;
    message: string;
}