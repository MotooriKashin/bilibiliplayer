import { __pchannel, __schannel } from "../OOAPI";

export class Sound {
    private percent = 0;
    constructor(private name: string, onload?: Function) {
        __pchannel("Sound::action", {
            action: "new",
            name,
            onload: onload ? true : false
        });
        onload && __schannel(`Sound::${name}`, (payload: any) => {
            onload();
            this.percent = 1;
        });
    }
    loadPercent() {
        return this.percent;
    }
    play(startTime: number, loops: number) {
        __pchannel("Sound::action", {
            action: "play",
            name: this.name,
            startTime,
            loops
        });
    }
    stop() {
        __pchannel("Sound::action", {
            action: "stop",
            name: this.name
        });
    }
    remove() {
        __pchannel("Sound::action", {
            action: "remove",
            name: this.name
        });
    }
}