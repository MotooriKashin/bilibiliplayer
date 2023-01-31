/**
 * 线性函数 
 * @param t 动点
 * @param b 起点
 * @param c 终点
 * @param d 距离
 * @return 运动率
 */
export function linear(t: number, b: number, c: number, d: number): number {
    return t * c / d + b;
}
/** 平方 */
export function quadratic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t + b;
    t--;
    return -c / 2 * (t * (t - 2) - 1) + b;
}
/** 立方 */
export function cubic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t + 2) + b;
}
/** 四次方 */
export function quartic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t + b;
    t -= 2;
    return -c / 2 * (t * t * t * t - 2) + b;
}
/** 五次方 */
export function quintic(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * t * t * t * t * t + b;
    t -= 2;
    return c / 2 * (t * t * t * t * t + 2) + b;
}
/** 圆形 */
export function circular(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return -c / 2 * (Math.sqrt(1 - t * t) - 1) + b;
    t -= 2;
    return c / 2 * (Math.sqrt(1 - t * t) + 1) + b;
}
/** 正弦 */
export function sine(t: number, b: number, c: number, d: number): number {
    return -c / 2 * (Math.cos(Math.PI * t / d) - 1) + b;
}
/** 指数 */
export function exponential(t: number, b: number, c: number, d: number): number {
    t /= d / 2;
    if (t < 1) return c / 2 * Math.pow(2, 10 * (t - 1)) + b;
    t--;
    return c / 2 * (-Math.pow(2, -10 * t) + 2) + b;
}

/**
 * 拓展对象方法
 * @param runtime 目标对象
 */
export function extendWithEasingFunctions(runtime: any) {
    /** TODO: Remove when BSE no longer requires this **/
    const load = {
        linear: linear,
        back: null,
        bounce: null,
        circular: circular,
        cubic: cubic,
        elastic: null,
        exponential: exponential,
        sine: sine,
        quintic: quintic
    };
    for (const i in load) {
        runtime[i] = load[<'cubic'>i];
    }
}

export function getEasingFuncByName(easing: string = "None") {
    easing = easing.toLowerCase();
    switch (easing) {
        case "none":
        case "linear":
        default:
            return linear;
        case "exponential":
            return exponential;
        case "circular":
            return circular;
        case "quadratic":
            return quadratic;
        case "cubic":
            return cubic;
        case "quartic":
            return quartic;
        case "quintic":
            return quintic;
        case "sine":
            return sine;
    }
}