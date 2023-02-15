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
import { TweenEasing } from './Tween/Easing';

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
    TweenEasing: { value: TweenEasing },
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
    getTimer: { value: Utils.getTimer.bind(Utils) },
    interval: { value: Utils.interval.bind(Utils) },
    timer: { value: Utils.timer.bind(Utils) },
    clearTimeout: { value: Utils.clearTimeout.bind(Utils) },
    clearInterval: { value: Utils.clearInterval.bind(Utils) },
    none: { value: null },
    // 以下是兼容数据
    // 似乎很多作品将true拼错了？
    ture: { value: true },
    // [[弹幕大赛]Q&A リサイタル! ~TV ver~](av399127)
    Arial: { value: 'Arial' },
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
__schannel("::eval", function (msg: string) {
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
            // .replace(/\/n/g, '\n') // 处理所有换行符 TODO: 类似于【除以n】的情况怎么办？
            // .replace(/"[^"]+"/g, d => d.replace(/\n/g, '\\n')) // 双引号中的/n可能被误伤
            // .replace(/'[^']+'/g, d => d.replace(/\n/g, '\\n')) // 单引号中的/n可能被误伤
            // .replace(/\\\n/g, '\\/n') // 正则表达式中的\/n可能被误伤
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