import { IReverbValue } from './config';

export const buildSimpleImpulse = (ctx: AudioContext, data: IReverbValue) => {
    const decay = ctx.sampleRate * data.decay;
    const buffer = ctx.createBuffer(2, decay, ctx.sampleRate);
    const channel0 = buffer.getChannelData(0);
    const channel1 = buffer.getChannelData(1);
    let r;

    for (let o = 0; o < decay; o++) {
        r = data.reverse ? decay - o : o;
        channel0[o] = (2 * Math.random() - 1) * Math.pow(1 - r / decay, data.fadeIn);
        channel1[o] = (2 * Math.random() - 1) * Math.pow(1 - r / decay, data.fadeIn);
    }
    return buffer;
};

export const buildMoorerReverbImpulse = (ctx: AudioContext, data: IReverbValue) => {
    const rate = ctx.sampleRate;
    const decay = 1.5 * data.decay;
    const s = Math.round(data.decay * rate);
    const c = Math.round(decay * rate);
    const l = Math.round((data.fadeIn || 0) * rate);
    const u = Math.pow(0.001, 1 / s);
    const buffer = ctx.createBuffer(2, c, rate);
    const channel0 = buffer.getChannelData(0);
    const channel1 = buffer.getChannelData(1);

    let r;
    for (let o = 0; o < c; o++) {
        r = data.reverse ? c - o : o;
        channel0[o] = (2 * Math.random() - 1) * Math.pow(u, r);
        channel1[o] = (2 * Math.random() - 1) * Math.pow(u, r);
    }
    for (let o = 0; o < l; o++) {
        channel0[(r = data.reverse ? l - o : o)] *= r / l;
        channel1[r] *= r / l;
    }
    return buffer;
};
