import { __achannel, __OOAPI, __schannel, __trace } from './OOAPI'
import { Runtime } from './Runtime/Runtime';
import { Display } from './Display/Display';
import { Tween } from './Tween/Tween';
import { Utils } from './Utils';
import { Player } from './Player';
import { Global } from './Global/Global';
import { ScriptManager } from './Runtime/ScriptManager';
import { trace, load, clone, foreach, stopExecution } from './Function';

// 建立频道
__OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
__OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

// 执行AS3代码
function EVAL(code: string) {
    try {
        new Function(
            'Runtime', 'Display', '$', 'Player',
            'Tween', 'Utils', 'getTimer', 'interval',
            'timer', 'Global', '$G', 'clearTimeout',
            'clearInterval', 'trace', 'load', 'clone',
            'foreach', 'stopExecution', 'ScriptManager',
            'importScripts', 'postMessage', 'addEventListener', 'self',
            code)(
                Runtime, Display, Display, Player,
                Tween, Utils, Utils.getTimer, Utils.interval,
                Utils.timer, Global, Global, Utils.clearTimeout,
                Utils.clearInterval, trace, load, clone,
                foreach, stopExecution, ScriptManager,
                undefined, undefined, undefined, undefined
            );
    } catch (e) {
        if ((<Error>e).message === 'stopExecution') return;
        throw e;
    }
}
// 主频道
__schannel("::eval", function (msg: any) {
    EVAL(msg
        .replace(/(\/n|\\n|\n|\r\n)/g, '\n') // 处理换行变成 /n 导致代码报错
        .replace(/`/g, '\\`') // （前置）转义模板字符串标记
        .replace(/'|"/g, '`') // 替换引号为模板字符串以处理前面 /n 可能导致的语法错误
        .replace(/(&amp;)|(&lt;)|(&gt;)|(&apos;)|(&quot;)/g, (a: string) => {
            // 处理误当成xml非法字符的转义字符
            return <string>{
                '&amp;': '&',
                '&lt;': '<',
                '&gt;': '>',
                '&apos;': '\'',
                '&quot;': '"'
            }[a]
        })
    );
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
            __achannel('::worker:debug', 'worker', EVAL(msg.code));
        } catch (e) {
            __achannel('::worker:debug', 'worker', 'Error: ' + e);
        }
    } else {
        __achannel('::worker:debug', 'worker', 'Unrecognized action');
    }
});
// 成功运行反馈
__achannel("::worker:state", "worker", "running");