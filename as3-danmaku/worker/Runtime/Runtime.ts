import { NotCrypto } from "./NotCrypto";
import { alert, hasObject, getObject, registerObject, deregisterObject, generateId, reset, clear, crash, exit } from "./Object";
import { requestPermission, hasPermission, openWindow, injectStyle, privilegedCode } from "./Permissions";
import { ScriptManager } from "./ScriptManager";
import { supports, requestLibrary } from "./Supports";
import { getTimer, TimeKeeper, Timer, updateFrameRate } from "./Timer";

export class Runtime {
    static NotCrypto = NotCrypto;
    static Timer = Timer;
    static TimeKeeper = TimeKeeper;
    static getTimer = getTimer;
    static updateFrameRate = updateFrameRate;
    static _defaultScriptManager = new ScriptManager();
    static requestPermission = requestPermission;
    static hasPermission = hasPermission;
    static openWindow = openWindow;
    static injectStyle = injectStyle;
    static privilegedCode = privilegedCode;
    static supports = supports;
    static requestLibrary = requestLibrary;
    static hasObject = hasObject;
    static getObject = getObject;
    static registerObject = registerObject;
    static deregisterObject = deregisterObject;
    static generateId = generateId;
    static reset = reset;
    static clear = clear;
    static crash = crash;
    static exit = exit;
    static alert = alert;
}