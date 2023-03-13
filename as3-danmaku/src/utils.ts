export function extend<T extends object, U extends object>(target: T, source: U) {
    for (const key in source) {
        if (!(key in target)) {
            Reflect.set(target, key, (<any>source)[key]);
        }
    }
    return target;
}
export function numberColor(color: number | string = 0): string {
    if (typeof color === 'string') {
        color = parseInt(color.toString());
        if (Number.isNaN(color)) {
            color = 0;
        }
    }
    let code: string = color.toString(16);
    while (code.length < 6) {
        code = '0' + code;
    }
    return '#' + code;
}