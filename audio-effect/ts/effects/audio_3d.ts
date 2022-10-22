import Base from './base';

export default class Audio3d extends Base {
    private panner!: PannerNode;
    private timer!: number;
    constructor(audioCtx: AudioContext, audioSource: MediaElementAudioSourceNode) {
        super(audioCtx, audioSource);
        this.init();
    }

    get source(): PannerNode {
        return this.panner;
    }

    connect(t: any) {
        this.panner.connect(t);
        this.start();
    }

    disconnect() {
        this.panner.disconnect();
        this.stop();
    }

    private start() {
        if (!this.timer) {
            let e = 0;
            this.timer = window.setInterval(() => {
                this.set3d(1.5 * Math.cos(e), 0, 1.5 * Math.sin(e));
                e += 0.5;
            }, 1e3);
        }
    }

    private stop() {
        clearInterval(this.timer);
        this.timer = 0;
    }

    private set3d(x: number, y: number, z = 300) {
        if (this.panner.positionX) {
            this.panner.positionX.value = x;
            this.panner.positionY.value = y;
            this.panner.positionZ.value = z;
        } else {
            this.panner.setPosition(x, y, z);
        }
    }

    private init() {
        this.panner = this.audioCtx.createPanner();
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;
        this.panner.coneInnerAngle = 360;
        this.panner.coneOuterAngle = 0;
        this.panner.coneOuterGain = 0;
    }
}
