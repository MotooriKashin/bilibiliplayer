import Base from './base';
import { eqBand, frequency, IEQBands } from '../common/config';

export default class Equalizer extends Base {
    private input!: GainNode;
    private output!: GainNode;
    private eq: any[];
    private eqSetting!: number[];
    private preset!: IEQBands;
    private presetName!: string;
    private type!: string;
    data!: number[];
    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        super(audioCtx, audioSource);
        this.eq = [];
        this.beforeInit();
        this.init();
    }

    get source(): GainNode {
        return this.input;
    }

    connect(t: any) {
        this.output.connect(t);
    }

    disconnect() {
        this.output.disconnect();
    }

    private beforeInit() {
        this.type = '10';
        this.presetName = 'default';
        this.preset = eqBand[<keyof typeof eqBand>this.type];
        this.eqSetting = frequency[<keyof typeof frequency>this.type];
        this.data = [...this.preset[<keyof IEQBands>this.presetName]];
    }

    private init() {
        this.input = this.audioCtx.createGain();
        this.output = this.audioCtx.createGain();
        this.resetEQ(this.eqSetting);
        this.setData(this.data);
    }
    selectType(type: string) {
        if (type && type !== this.type && eqBand[<keyof typeof eqBand>type]) {
            this.preset = eqBand[<keyof typeof eqBand>type];
            const e = this.preset[<keyof IEQBands>this.presetName];

            this.resetEQ(frequency[<keyof typeof frequency>type]);
            this.type = type;
            this.data = e.slice(0);

            this.setData(this.data);
            return true;
        }
        return false;
    }
    selectPreset(name: string) {
        const frequency = this.preset[<keyof IEQBands>name];
        if (frequency) {
            this.presetName = name;
            this.setData(frequency, false);
        }
    }
    getPresetsList() {
        return Object.keys(this.preset).slice(0);
    }

    reload() {
        if (this.type === '10' && this.presetName === 'default') return;
        this.beforeInit();
        this.resetEQ(this.eqSetting);
        this.setData(this.data);
    }
    customEffect(val: number[], type = '10') {
        this.data = val;
        if (this.selectType(type)) return;
        this.setData(this.data);
    }

    private resetEQ(frequency: number[]) {
        if (this.audioCtx && this.input && this.output) {
            this.eqSetting = frequency;

            const ctx = this.audioCtx;

            this.eq.forEach((t) => {
                t.disconnect();
            });
            for (let i = 0; i < frequency.length; i++) {
                let o;
                if (this.eq[i]) {
                    o = this.eq[i];
                } else {
                    o = ctx.createBiquadFilter();
                    this.eq.push(o);
                }
                o.frequency.setValueAtTime(frequency[i], ctx.currentTime);
                o.Q.value = 0.7;
                o.type = 'peaking';
            }
            this.eq[0].type = 'lowshelf';
            this.eq[frequency.length - 1].type = 'highshelf';

            for (let j = 1; j < frequency.length; j++) {
                this.eq[j - 1].connect(this.eq[j]);
            }
            this.input.connect(this.eq[0]);
            this.eq[frequency.length - 1].connect(this.output);
        }
    }
    setData(frequency: number[], e = true) {
        if (Array.isArray(frequency) && frequency.length && this.audioCtx) {
            for (let i = 0; i < this.eqSetting.length; i++) {
                this.data[i] = frequency[i];
                if (this.eq[i]) {
                    this.eq[i].gain.setTargetAtTime(frequency[i] ? frequency[i] : 0, this.audioCtx.currentTime, 0.015);
                }
            }
        }
    }
}
