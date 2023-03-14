export class Sound {
    _sound: HTMLAudioElement;
    constructor(name: string) {
        const url = `//i2.hdslb.com/soundlib/${name}.mp3`;
        this._sound = new Audio(url);
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