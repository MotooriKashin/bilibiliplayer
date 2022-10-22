import { IConfig } from '../audioEffect';
import utils from './common/utils';
import Preset, { IPresetItem } from './common/preset';
import Compressor from './effects/compressor';
import Audio3d from './effects/audio_3d';
import Phone from './effects/phone';
import Equalizer from './effects/equalizer';
import Reverb from './effects/reverb';
import preset from './common/preset';
export interface IEffects {
    active: boolean;
    node: any;
}

export default class Audio {
    static weakMap: WeakMap<HTMLMediaElement, MediaElementAudioSourceNode> = new WeakMap();

    private currentEffect!: string;
    audioCtx!: AudioContext;
    mediaElement: HTMLVideoElement;
    source!: MediaElementAudioSourceNode;
    destination!: AudioDestinationNode;
    gain!: GainNode;
    effectsList!: string[];
    currentEffects!: string[];
    effectsObj!: { [key: string]: IEffects };

    constructor(config: Required<IConfig>) {
        this.effectsObj = {};
        this.mediaElement = config.mediaElement;
        this.init();
        this.connectAll();
    }
    clear() {
        this.disconnect();
        this.connectAll();
    }
    play() {
        this.setEffect(this.currentEffect, true);
    }
    pause() {
        // this.disconnect();
    }
    update(video?: HTMLVideoElement) {
        if (video && video !== this.mediaElement) {
            this.destroy();
            this.mediaElement = video;
            this.init();
            this.play();
        }
    }
    setEffect(effect: string, force = false) {
        if (this.noCtx()) return;
        if (this.currentEffect === effect && !force) return;
        this.currentEffect = effect;

        this.disconnect();
        const list = Preset[<keyof typeof preset>effect]?.items;
        if (list) {
            list.forEach((item: IPresetItem) => {
                this.effectsObj[item.name].active = true;
                item.preset && this.effectsObj[item.name].node.selectPreset(item.preset);
            });
        }
        this.effectsObj.compressor.active = true;
        this.connectAll();
    }
    customEffect(val: number[], type: string) {
        this.setEffect('default');
        this.effectsObj.eq.node.customEffect(val, type);
    }
    setEffectType(type: string) {
        this.effectsObj.eq.node.selectType(type);
        this.setEffect('default', true);
    }
    setGain(val: number) {
        if (this.noCtx()) return;
        this.gain.gain.setTargetAtTime(utils.db2gain(val), this.audioCtx.currentTime, 0.015);
    }
    reload() {
        this.effectsObj.eq.node.reload();
        this.setGain(0);
    }

    private init() {
        if (this.noCtx()) {
            if (Audio.weakMap.has(this.mediaElement)) {
                this.source = Audio.weakMap.get(this.mediaElement)!;
                this.audioCtx = <AudioContext>this.source.context;
            } else {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                this.source = this.audioCtx.createMediaElementSource(this.mediaElement);
                Audio.weakMap.set(this.mediaElement, this.source);
            }
            this.destination = this.audioCtx.destination;

            this.gain = this.audioCtx.createGain();

            this.effectsObj = {
                eq: {
                    active: false,
                    node: new Equalizer(this.audioCtx, this.source),
                },
                reverb: {
                    active: false,
                    node: new Reverb(this.audioCtx, this.source),
                },
                a3d: {
                    active: false,
                    node: new Audio3d(this.audioCtx, this.source),
                },
                phone: {
                    active: false,
                    node: new Phone(this.audioCtx, this.source),
                },
                compressor: {
                    active: false,
                    node: new Compressor(this.audioCtx, this.source),
                },
            };
            this.effectsList = Object.keys(this.effectsObj);
            this.disconnect();
        }
    }

    private disconnect() {
        this.source.disconnect();
        let effect;
        this.effectsList.forEach((t: string) => {
            effect = this.effectsObj[t];
            if (effect?.active && effect.node.source) {
                effect.node.disconnect();
                effect.active = false;
            }
        });
        this.gain.disconnect();
    }

    private connectAll() {
        // if (this.config.paused) return;
        let line: any = this.source;
        let effect;
        this.effectsList.forEach((t: string) => {
            effect = this.effectsObj[t];
            if (effect?.active && effect.node.source) {
                line.connect(effect.node.source);
                line = effect.node;
            }
        });
        line.connect(this.gain);
        this.gain.connect(this.destination);
    }

    private noCtx() {
        return !this.audioCtx || this.audioCtx.state === 'closed';
    }

    destroy() {
        this.disconnect();
        this.audioCtx && this.audioCtx.close();
    }
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}