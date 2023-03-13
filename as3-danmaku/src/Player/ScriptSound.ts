export class ScriptSound {
    private _sound: HTMLAudioElement;
    constructor(name: string, onload?: Function) {
        const url = `//i2.hdslb.com/soundlib/${name}.mp3`;
        this._sound = new Audio(url);
        onload && this._sound.addEventListener('onloadedmetadata', e => {
            onload();
        });
    }
    loadPercent() {
        return Math.floor(this._sound.buffered.end(0) / this._sound.duration);
    }
    play(startTime: number, loops: number) {
        startTime && (this._sound.currentTime = startTime / 1000);
        this._sound.play();
    }
    stop() {
        this._sound.currentTime = this._sound.duration;
    }
    remove() {
        this._sound.remove();
    }
}