import Base from './base';
import { compressorValue, ICompressorValue } from '../common/config';

export default class Compressor extends Base {
    private comp!: DynamicsCompressorNode;
    private presetName: string;
    data: ICompressorValue;
    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        super(audioCtx, audioSource);
        this.presetName = 'default';
        this.data = compressorValue[<keyof typeof compressorValue>this.presetName];
        this.init();
    }

    get source(): DynamicsCompressorNode {
        return this.comp;
    }

    connect(t: any) {
        this.comp.connect(t);
    }

    disconnect() {
        this.comp.disconnect();
    }

    private init() {
        this.comp = this.audioCtx.createDynamicsCompressor();
        this.selectPreset(this.presetName);
    }
    selectPreset(t: string) {
        const e = compressorValue[<keyof typeof compressorValue>t];
        if (e) {
            this.presetName = t;
            this.setData(e);
        }
    }
    setData(t: any) {
        if (Object.keys(t).length) {
            this.data = {
                ...this.data,
                ...t,
            };
            if (this.comp) {
                this.comp.threshold.value = this.data.threshold;
                this.comp.knee.value = this.data.knee;
                this.comp.ratio.value = this.data.ratio;
                this.comp.attack.value = this.data.attack;
                this.comp.release.value = this.data.release;
            }
        }
    }
}
