export function debug(...arg: any[]) {
    setTimeout(console.log.bind(console, `%c[AS3 parser]`, "color: blue;", ...arg))
}
debug.log = function (...arg: any[]) {
    setTimeout(console.log.bind(console, `%c[AS3 parser]`, "color: blue;", ...arg))
}
debug.debug = function (...arg: any[]) {
    setTimeout(console.debug.bind(console, `[AS3 parser]`, ...arg))
}
debug.warn = function (...arg: any[]) {
    setTimeout(console.warn.bind(console, `[AS3 parser]`, ...arg))
}
debug.error = function (...arg: any[]) {
    setTimeout(console.error.bind(console, `[AS3 parser]`, ...arg))
}