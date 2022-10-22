import Base from './base';

export default class Phone extends Base {
    private lowPass: BiquadFilterNode;
    private lowPass2: BiquadFilterNode;
    private highPass: BiquadFilterNode;
    private highPass2: BiquadFilterNode;

    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        super(audioCtx, audioSource);

        this.lowPass = audioCtx.createBiquadFilter();
        this.lowPass.type = 'lowpass';
        this.lowPass.frequency.value = 2e3;

        this.lowPass2 = audioCtx.createBiquadFilter();
        this.lowPass2.type = 'lowpass';
        this.lowPass2.frequency.value = 2e3;

        this.highPass = audioCtx.createBiquadFilter();
        this.highPass.type = 'highpass';
        this.highPass.frequency.value = 500;

        this.highPass2 = audioCtx.createBiquadFilter();
        this.highPass2.type = 'highpass';
        this.highPass2.frequency.value = 500;

        this.init();
    }

    get source(): BiquadFilterNode {
        return this.lowPass;
    }

    connect(t: any) {
        this.highPass2.connect(t);
    }

    disconnect() {
        this.highPass2.disconnect();
    }

    private init() {
        this.lowPass.connect(this.lowPass2);
        this.lowPass2.connect(this.highPass);
        this.highPass.connect(this.highPass2);
    }
}
