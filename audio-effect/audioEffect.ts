import './static/index.less';
import Audio from './ts/audio';
import EffectSelector from './ts/panel/effect-selector';

export interface IConfig {
    container: HTMLElement;
    mediaElement?: HTMLVideoElement;
    data?: any;
    paused?: boolean;
    prefix?: string;
    theme?: string;
    localDate?: Function;
    track?: Function;
}
export interface ILocalData {
    custom: boolean; // 是否优先使用自定义效果
    left: string;
    right: string;
    rightValue: number[];
    rightType: string;
    gain: number;
}

export default class AudioEffect {
    config: Required<IConfig>;
    audio: Audio;
    effectSelector!: EffectSelector;

    constructor(opts: IConfig) {
        this.config = {
            mediaElement: document.createElement('video'),
            data: {},
            paused: true,
            theme: 'blue',
            prefix: 'bl-audio',
            localDate: (data: ILocalData) => {},
            track: (param: string, name: string) => {},
            ...opts,
        };
        this.config.data = {
            ...opts.data,
        };
        this.audio = new Audio(this.config);
        this.effectSelector = new EffectSelector(this);
    }

    showPanel(cfg: IConfig) {
        if (cfg.container !== this.config.container) {
            this.effectSelector.reload(cfg);
        }
        this.effectSelector.show();
    }
    play() {
        if (!this.config.paused) return;
        this.config.paused = false;
        this.audio.play();
    }
    pause() {
        if (this.config.paused) return;
        this.config.paused = true;
        this.audio.pause();
    }
    clear() {
        this.audio.clear();
    }
    setGain(val: number) {
        this.audio.setGain(val);
    }
    setEffectPreset(type: string, force = false) {
        this.audio.setEffect(type, force);
    }
    customEffect(val: number[], type = '10') {
        this.audio.customEffect(val, type);
    }
    setEffectType(type: string) {
        this.audio.setEffectType(type);
    }
    update(video?: HTMLVideoElement) {
        this.audio.update(video);
    }
    reload() {
        this.audio.reload();
    }
    destroy() {
        this.audio.destroy();
    }
}
