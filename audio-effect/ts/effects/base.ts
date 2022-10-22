export default class Base {
    audioCtx: AudioContext;
    audioSource: MediaElementAudioSourceNode;
    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        this.audioCtx = audioCtx;
        this.audioSource = audioSource;
    }

    get source(): any {
        return this.audioCtx.createGain();
    }
    connect(t: any) {}

    disconnect() {}
}
