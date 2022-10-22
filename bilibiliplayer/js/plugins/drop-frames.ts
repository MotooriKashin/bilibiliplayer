import Player from '../player';
import STATE from '../player/state';
class DropFrames {
    private config = {
        delay: 1000, // 延时多长时间开始统计
        frames: 15, // 掉帧多少为卡
        duration: 1000, // 多长时间统计一次
    };
    private running = false;
    private dropFrames = 0;
    private timer = {
        start: 0,
        drop: 0,
    };
    private dropCB: { [key: string]: Function } = {};

    constructor(private player: Player) {
        this.globalEvents();
    }

    start(opt = this.config) {
        this.config = {
            ...this.config,
            ...opt,
        };
        if (!this.player.video || this.player.video.paused) return;

        this.pause();
        this.timer.start = window.setTimeout(() => {
            this.dropFrames = this.droppedFrameCount(); // 重置丢帧数
            this.running = true;
            clearTimeout(this.timer.drop);
            this.autoVisible();
        }, this.config.delay);
    }
    pause() {
        clearTimeout(this.timer.start);
        clearTimeout(this.timer.drop);
        this.running = false;
    }
    removeEventListener(event: string) {
        delete this.dropCB[event];
        if (Object.keys(this.dropCB)) return;
        this.pause();
    }
    addEventListener(event: string, cb: Function) {
        this.dropCB[event] = this.dropCB[event] || cb;
    }
    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAY, () => {
            if (Object.keys(this.dropCB)) {
                this.start();
            }
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            this.pause();
        });
    }

    private autoVisible() {
        this.timer.drop = window.setTimeout(() => {
            const currentDrop = this.droppedFrameCount();
            if (currentDrop - this.dropFrames > this.config.frames) {
                Object.keys(this.dropCB).forEach((event: string) => {
                    this.dropCB[event](currentDrop - this.dropFrames);
                });
                return;
            }
            this.dropFrames = currentDrop;
            this.autoVisible();
        }, this.config.duration);
    }
    private droppedFrameCount() {
        const num = this.player.video && (<any>this.player.video).webkitDroppedFrameCount;
        return num || 0;
    }
}

export default DropFrames;
