import { IDanmaku } from "..";
import { debug } from "../debug";
import { __achannel, OOAPI, __schannel } from "./OOAPI";
import { Execute } from "./Script/Script";
import { VirtualMachine } from "./Script/VirtualMachine";

// 建立频道
OOAPI.createChannel("::eval", 1, Math.round(Math.random() * 100000));
OOAPI.createChannel("::debug", 1, Math.round(Math.random() * 100000));

// 弹幕解析栈
const Parse: Record<string, VirtualMachine> = {};
// 清空弹幕
__schannel('::clear', function () {
    Object.keys(Parse).forEach(async d => delete Parse[d]);
});
// 解析弹幕
__schannel('::parse', function (dms: IDanmaku[]) {
    dms.forEach(async dm => {
        try {
            Parse[dm.dmid] = Execute(dm.text);
        } catch (e) {
            debug.error(e);
        }
    });
    dms.length && debug(`已解析${dms.length}条弹幕~`);
});
// 运行弹幕
__schannel("::eval", function (dmid: string) {
    const vm = Parse[dmid];
    if (vm) {
        vm.execute();
        vm.rewind();
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
        __achannel('::worker:debug', 'worker', OOAPI.listChannels());
    } else if (msg.action === 'raw-eval') {
        try {
            const vm = Execute(msg.code);
            __achannel('::worker:debug', 'worker', vm.execute());
        } catch (e) {
            __achannel('::worker:debug', 'worker', 'Error: ' + e);
        }
    } else {
        __achannel('::worker:debug', 'worker', 'Unrecognized action');
    }
});
// 成功运行反馈
__achannel("::worker:state", "worker", "running");