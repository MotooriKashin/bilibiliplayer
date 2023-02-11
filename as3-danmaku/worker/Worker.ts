import { __achannel, __OOAPI, __schannel, __trace } from './OOAPI'
import { Runtime } from './Runtime/Runtime';
import { Display } from './Display/Display';
import { Tween } from './Tween/Tween';
import { Utils } from './Utils';
import { Player } from './Player';
import { Global } from './Global/Global';
import { ScriptManager } from './Runtime/ScriptManager';
import { trace, load, clone, foreach, stopExecution, wrap } from './Function';
import { CommentBitmap } from './Display/CommentBitmap';

// 建立频道
__OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
__OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

// 暴露接口
Object.defineProperties(self, {
    Runtime: { value: Runtime },
    Display: { value: Display },
    $: { value: Display },
    Player: { value: Player },
    Tween: { value: Tween },
    Utils: { value: Utils },
    Global: { value: Global },
    $G: { value: Global },
    Bitmap: { value: CommentBitmap },
    trace: { value: trace },
    load: { value: load },
    clone: { value: clone },
    foreach: { value: foreach },
    stopExecution: { value: stopExecution },
    ScriptManager: { value: ScriptManager },
    getTimer: { value: Utils.getTimer },
    interval: { value: Utils.interval },
    timer: { value: Utils.timer },
    clearTimeout: { value: Utils.clearTimeout },
    clearInterval: { value: Utils.clearInterval },
    none: { value: null },
    // 以下是兼容数据
    // 似乎很多作品将true拼错了？
    ture: { value: true },
    // [拜年祭2012](av203614)
    ph: {
        get: () => Player.height,
        set: v => Player.height = v
    },
    pw: {
        get: () => Player.width,
        set: v => Player.width = v
    }
})

// 主频道
__schannel("::eval", function (msg: any) {
    try {
        (0, eval)('let importScripts,postMessage,addEventListener,self;\n' + wrap(msg)
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
    } catch (e) {
        if ((<Error>e).message === 'stopExecution') return;
        throw e;
    }
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
            __achannel('::worker:debug', 'worker', (0, eval)(msg.code));
        } catch (e) {
            __achannel('::worker:debug', 'worker', 'Error: ' + e);
        }
    } else {
        __achannel('::worker:debug', 'worker', 'Unrecognized action');
    }
});
// 成功运行反馈
__achannel("::worker:state", "worker", "running");