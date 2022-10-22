import Base from './base';
import Utils from '../common/utils';
import { reverbValue, IReverbValue } from '../common/config';
import { buildSimpleImpulse, buildMoorerReverbImpulse } from '../common/impulse';

export default class Reverb extends Base {
    private inputNode: GainNode;
    private outputNode: GainNode;
    private convolverNode: ConvolverNode;
    private wetGainNode: GainNode;
    private dryGainNode: GainNode;
    private highCutNode: BiquadFilterNode;
    private lowCutNode: BiquadFilterNode;
    private data: IReverbValue;
    private lpFreqStart: number;
    private lpFreqEnd: number;
    private presetName: string;
    private ir!: AudioBuffer;

    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        super(audioCtx, audioSource);

        this.lpFreqStart = 15e3;
        this.lpFreqEnd = 1e3;
        this.presetName = 'default';
        this.data = {
            ...reverbValue.default,
        };

        this.inputNode = audioCtx.createGain();
        this.convolverNode = audioCtx.createConvolver();
        this.outputNode = audioCtx.createGain();
        this.wetGainNode = audioCtx.createGain();
        this.dryGainNode = audioCtx.createGain();
        this.highCutNode = audioCtx.createBiquadFilter();
        this.lowCutNode = audioCtx.createBiquadFilter();

        this.highCutNode.type = 'lowpass';

        this.lowCutNode.type = 'highpass';

        this.init();
    }

    get source(): GainNode {
        return this.inputNode;
    }

    connect(t: any) {
        this.outputNode.connect(t);
    }

    disconnect() {
        this.outputNode.disconnect();
    }

    selectPreset(t: string) {
        const e = reverbValue[<keyof typeof reverbValue>t];
        if (e) {
            this.presetName = t;
            this.setData(e);
        }
    }
    setData(t: any) {
        if (0 < Object.keys(t).length) {
            for (const n in t) {
                if (n === 'mix') {
                    this.mix = t[n];
                } else if (n === 'gain') {
                    this.gain = t[n];
                }
            }
            this.data = {
                ...this.data,
                ...t,
            };
            this.updateImpulse();
        }
    }

    private init() {
        this.inputNode.connect(this.highCutNode);
        this.highCutNode.connect(this.lowCutNode);
        this.lowCutNode.connect(this.convolverNode);
        this.convolverNode.connect(this.wetGainNode);
        this.wetGainNode.connect(this.outputNode);
        this.inputNode.connect(this.dryGainNode);
        this.dryGainNode.connect(this.outputNode);
        this.mix = this.data.mix;
    }

    private applyGradualLowpass(ir: any, lpFreqStart: number, lpFreqEnd: number) {
        if (!this.convolverNode) return;
        if (lpFreqStart !== 0) {
            const o = [];
            for (let i = 0; i < ir.numberOfChannels; i++) {
                o[i] = ir.getChannelData(i);
            }
            const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
                ir.numberOfChannels,
                o[0].length,
                ir.sampleRate,
            );
            const source = ctx.createBufferSource();
            source.buffer = ir;
            const biquad = ctx.createBiquadFilter();

            const start = Math.min(lpFreqStart, ir.sampleRate / 2);
            const end = Math.min(lpFreqEnd, ir.sampleRate / 2);

            biquad.type = 'lowpass';
            biquad.Q.value = 1e-4;
            biquad.frequency.setValueAtTime(start, 0);
            biquad.frequency.linearRampToValueAtTime(end, this.data.decay);
            source.connect(biquad);
            biquad.connect(ctx.destination);
            source.start();
            ctx.oncomplete = (t: any) => {
                this.convolverNode && (this.convolverNode.buffer = t.renderedBuffer);
            };
            ctx.startRendering();
        } else {
            this.convolverNode.buffer = ir;
        }
    }
    private updateImpulse() {
        if (!this.audioCtx) return;
        if (this.data.ir === 'moorer') {
            this.ir = buildMoorerReverbImpulse(this.audioCtx, this.data);
        } else {
            this.ir = buildSimpleImpulse(this.audioCtx, this.data);
        }
        this.applyGradualLowpass(this.ir, this.lpFreqStart || 0, this.lpFreqEnd || 0);
    }

    get mix() {
        return this.data.mix;
    }
    set mix(t) {
        this.data.mix = t;
        if (this.dryGainNode && this.wetGainNode) {
            this.dryGainNode.gain.value = Utils.getDryLevel(this.mix);
            this.wetGainNode.gain.value = Utils.getWetLevel(this.mix);
        }
    }
    get decay() {
        return this.data.decay;
    }
    set decay(t) {
        this.data.decay = t;
        this.updateImpulse();
    }
    get fadeIn() {
        return this.data.fadeIn;
    }
    set fadeIn(t) {
        this.data.fadeIn = t;
        this.updateImpulse();
    }
    get reverse() {
        return this.data.reverse;
    }
    set reverse(t) {
        this.data.reverse = t;
        this.updateImpulse();
    }
    get highCut() {
        return this.data.highCut;
    }
    set highCut(t) {
        this.data.highCut = t;
        if (this.audioCtx && this.highCutNode) {
            this.highCutNode.frequency.setValueAtTime(this.data.highCut, this.audioCtx.currentTime);
        }
    }
    get lowCut() {
        return this.data.lowCut;
    }
    set lowCut(t) {
        this.data.lowCut = t;
        if (this.audioCtx && this.lowCutNode) {
            this.lowCutNode.frequency.setValueAtTime(this.data.lowCut, this.audioCtx.currentTime);
        }
    }
    get gain() {
        return this.data.gain;
    }
    set gain(t) {
        this.data.gain = t;
        if (this.audioCtx && this.outputNode) {
            this.outputNode.gain.setValueAtTime(this.data.gain, this.audioCtx.currentTime);
        }
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        webkitOfflineAudioContext: typeof OfflineAudioContext
    }
}