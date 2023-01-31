import { __achannel, __OOAPI, __schannel } from './OOAPI'
import { Runtime as _Runtime } from './Runtime/Runtime';
import { Display as _Display } from './Display/Display';
import { Tween as _Tween } from './Tween/Tween';
import { Utils as _Utils } from './Utils';
import { Global as _Global } from './Global/Global';
import { trace as _trace, load as _load, clone as _clone, foreach as _foreach } from './Function';

// 建立频道
__OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
__OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

// 主频道
__schannel("::eval", function (msg: any) {
    // 通过闭包阻止eval代码轻易获取部分环境对象
    (function (__code, importScripts, postMessage, addEventListener, self) {
        const Runtime = _Runtime;
        const Display = _Display;
        const $ = _Display;
        const Tween = _Tween;
        const Utils = _Utils;
        const getTimer = _Utils.getTimer;
        const interval = _Utils.interval;
        const timer = _Utils.timer;
        const Global = _Global;
        const $G = _Global;
        const clearTimeout = _Utils.clearTimeout;
        const clearInterval = _Utils.clearInterval;
        const trace = _trace;
        const load = _load;
        const clone = _clone;
        const foreach = _foreach;
        eval(__code);
    })(msg);
});
// 调试频道
__schannel("::debug", function (msg: any) {
    if (typeof msg === 'undefined' || msg === null ||
        !msg.hasOwnProperty('action')) {
        __achannel('::worker:debug', 'worker', 'Malformed request');
        return;
    }
    if (msg.action === 'list-channels') {
        __achannel('::worker:debug', 'worker', __OOAPI.listChannels());
    } else if (msg.action === 'raw-eval') {
        try {
            __achannel('::worker:debug', 'worker', eval(msg.code));
        } catch (e) {
            __achannel('::worker:debug', 'worker', 'Error: ' + e);
        }
    } else {
        __achannel('::worker:debug', 'worker', 'Unrecognized action');
    }
});
// 成功运行反馈
__achannel("::worker:state", "worker", "running");