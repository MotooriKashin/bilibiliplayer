import { init } from "grunt";
import { CCLScripter } from "./CCLScripting";
import { ScriptingContext } from "./ScriptingContext";

interface Message {
    channel: string;
    payload: string;
}
export class BridgedSandbox {
    protected worker: Worker;
    protected context: ScriptingContext;
    protected channels = {};
    protected isRunning = false;
    protected sandbox = this;
    constructor(private scripter: CCLScripter, private stage: HTMLElement, private player: unknown) {
        this.worker = scripter.getWorker();
        this.context = scripter.getScriptingContext(stage);

        if (!this.worker) {
            throw new Error("SANDBOX: Worker pool exhausted.");
        }

        this.worker.addEventListener("message", this.WorkerHook);
    }
    getLogger() {
        return this.scripter.logger;
    };
    getPlayer() {
        return this.player;
    };
    getContext() {
        return this.context;
    };
    addListener = (channel: string, listener: Function) => {
        if (!this.channels[channel]) {
            this.channels[channel] = {
                "max": 0,
                "listeners": []
            };
        }
        if (this.channels[channel].max > 0) {
            if (this.channels[channel].listeners.length >= this.channels[channel].max) {
                return false;
            }
        }
        this.channels[channel].listeners.push(listener);
        return true;
    };
    dispatchMessage = (msg: Message) => {
        if (this.channels[msg.channel] && this.channels[msg.channel].listeners) {
            for (var i = 0; i < this.channels[msg.channel].listeners.length; i++) {
                this.channels[msg.channel].listeners[i](msg.payload);
            }
        } else {
            this.scripter.logger.warn("Message for channel \"" + msg.channel +
                "\" but channel not existant.");
        }
    };
    WorkerHook = (event: { data: string }) => {
        try {
            var resp = JSON.parse(event.data);
        } catch (e) {
            if (e.stack) {
                this.scripter.logger.error(e.stack);
            } else {
                this.scripter.logger.error(e);
            }
            return;
        }
        if (resp.channel === "") {
            switch (resp.mode) {
                case "log":
                default: {
                    this.scripter.logger.log(resp.obj);
                    break;
                }
                case "warn": {
                    this.scripter.logger.warn(resp.obj);
                    break;
                }
                case "err": {
                    this.scripter.logger.error(resp.obj);
                    break;
                }
                case "fatal": {
                    this.scripter.logger.error(resp.obj);
                    this.sandbox.resetWorker();
                    return;
                }
            };
            return;
        }
        if (resp.channel.substring(0, 8) === "::worker") {
            var RN = resp.channel.substring(8);
            switch (RN) {
                case ":state": {
                    if (resp.payload === "running" && resp.auth === "worker") {
                        this.isRunning = true;
                        this.channels = {};
                        this.sandbox.init();
                    }
                    break;
                }
                case ':debug': {
                    this.scripter.logger.log(JSON.stringify(resp.payload));
                    break;
                }
                default: {
                    this.scripter.logger.log(JSON.stringify(resp));
                    break;
                }
            }
        } else {
            this.dispatchMessage(resp);
        }
    }
    resetWorker = () => {
        try {
            this.worker.terminate();
        } catch (e) {

        }
        this.worker = this.scripter.getWorker();
        if (!this.worker) {
            throw new Error("SANDBOX: Worker pool exhausted.");
        }
        this.worker.addEventListener("message", this.WorkerHook);
    }
    eval = (code: string) => {
        // Pushes the code to be evaluated on the Worker
        if (!this.isRunning) {
            throw new Error("Worker offline");
        }
        this.worker.postMessage(JSON.stringify({
            "channel": "::eval",
            "payload": code
        }));
    };
    send = (channel: string, payload: unknown) => {
        // Low level send
        this.worker.postMessage(JSON.stringify({
            "channel": channel,
            "payload": payload
        }));
    };
    init() {
        /** Post whatever we need to **/
        this.send("Update:DimensionUpdate", this.getContext().getDimensions());
        /** Hook Listeners **/
        this.addListener("Runtime::alert", (msg) => {
            alert(msg);
        });
        this.addListener("Runtime::clear", () => {
            this.getContext().clear();
        });
        this.addListener("Player::action", (msg) => {
            try {
                if (this.getPlayer() == null) {
                    this.getLogger().warn("Player not initialized!");
                    return;
                };
                switch (msg.action) {
                    default: return;
                    case "play": this.getPlayer().play(); break;
                    case "pause": this.getPlayer().pause(); break;
                    case "seek": this.getPlayer().seek(msg.params); break;
                    case "jump": this.getPlayer().jump(msg.params); break;
                }
            } catch (e) {
                if (e.stack) {
                    this.getLogger().error(e.stack);
                } else {
                    this.getLogger().error(e.toString());
                }
            }
        });
        this.addListener("Runtime:RegisterObject", (pl) => {
            this.getContext().registerObject(pl.id, pl.data);
        });
        this.addListener("Runtime:DeregisterObject", (pl) => {
            this.getContext().deregisterObject(pl.id);
        });
        this.addListener("Runtime:CallMethod", (pl) => {
            this.getContext().callMethod(pl.id, pl.method, pl.params);
        });
        this.addListener("Runtime:UpdateProperty", (pl) => {
            this.getContext().updateProperty(pl.id, pl.name, pl.value);
        });
        this.getContext().registerObject("__root", { "class": "SpriteRoot" });
    }
}