export function debug(...arg: any[]) {
    console.log(`%c[AS3 parser]`, "color: blue;", ...arg)
}
debug.log = function (...arg: any[]) {
    console.log(`%c[AS3 parser]`, "color: blue;", ...arg)
}
debug.debug = function (...arg: any[]) {
    console.debug(`[AS3 parser]`, ...arg)
}
debug.warn = function (...arg: any[]) {
    console.warn(`[AS3 parser]`, ...arg)
}
debug.error = function (...arg: any[]) {
    console.error(`[AS3 parser]`, ...arg)
}