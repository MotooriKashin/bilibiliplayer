import { __channel, __pchannel, __trace } from "../OOAPI";

const permissions: Record<string, boolean> = {};
export function requestPermission(name: string, callback?: Function) {
    __channel("Runtime:RequestPermission", {
        "name": name
    }, (result: boolean) => {
        if (result === true) {
            permissions[name] = true;
        } else {
            permissions[name] = false;
        }
        if (typeof callback === "function") {
            callback(result);
        }
    })
}

export function hasPermission(name: string) {
    if (permissions.hasOwnProperty(name) &&
        permissions[name]) {
        return true;
    }
    return false;
}

export function openWindow(url: string, params?: any, callback?: Function) {
    __channel("Runtime:PrivilegedAPI", {
        "method": "openWindow",
        "params": [url, params]
    }, function (windowId: string) {
        // Create a small compact window object
        const WND = {
            "moveTo": function (x: number, y: number) {
                __pchannel("Runtime:PrivilegedAPI", {
                    "method": "window",
                    "params": [windowId, "moveTo", [x, y]]
                });
            },
            "resizeTo": function (w: number, h: number) {
                __pchannel("Runtime:PrivilegedAPI", {
                    "method": "window",
                    "params": [windowId, "resizeTo", [w, h]]
                });
            },
            "focus": function () {
                __pchannel("Runtime:PrivilegedAPI", {
                    "method": "window",
                    "params": [windowId, "focus"]
                });
            },
            "close": function () {
                __pchannel("Runtime:PrivilegedAPI", {
                    "method": "window",
                    "params": [windowId, "close"]
                });
            }
        };
        callback?.(WND);
    });
}

export function injectStyle(referenceObject: string, style: Object) {
    __pchannel("Runtime:PrivilegedAPI", {
        "method": "injectStyle",
        "params": [referenceObject, style]
    });
}

export function privilegedCode() {
    __trace('Runtime.privilegedCode not available.', 'warn');
}