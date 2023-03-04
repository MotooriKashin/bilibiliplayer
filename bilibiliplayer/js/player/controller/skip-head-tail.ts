import STATE from '../state';
import Player from '../../player';
import { IHeadTail } from '../../io/rebuild-player-extra-params';
import { IItemExtInterface } from '../toast';

class SkipHeadTail {
    private head?: number[];
    private tail?: number[];
    private duration!: number;
    private timer = 0;
    private toast?: IItemExtInterface;

    constructor(private player: Player, private headTail: IHeadTail) {
        setTimeout(() => {
            this.player.userLoadedCallback(() => {
                this.init();
            });
        });
    }
    private init() {
        this.getDuration();
        if (this.duration) {
            this.create();
        } else {
            this.beforeCreate();
        }
    }
    private getDuration() {
        this.duration = this.player.duration() || 0;
    }
    private beforeCreate() {
        this.timer = window.setTimeout(() => {
            this.getDuration();
            if (this.duration) {
                this.init();
            } else {
                this.beforeCreate();
            }
        }, 100);
    }
    private create() {

        this.head = this.headTail.head ?? [];
        this.tail = this.headTail.tail ?? [];

        // -1代表跳到片尾
        if (this.tail && this.tail[1] < 0) {
            this.tail[1] = this.duration;
        }

        this.events();

    }
    reload() {
        this.destroy();
        this.init();
    }

    // 判断是否要自动跳过首尾
    autoSkipHeadTail(currentTime: number, isRange = false) {
        if (this.player.errorPlayurl) return;
        if (!this.player.get('video_status', 'skipheadtail')) return;
        if (!this.player.video || this.player.video.paused) return;

        this.autoSeekTail(currentTime, isRange);
    }
    private autoSeekTail(currentTime: number, isRange = false) {
        const skip = this.player.get('video_status', 'skipheadtail');
        const duration = this.player.duration() || 0;
        const head = this.head;
        const tail = this.tail;

        if (head && head[0] >= duration) return;

        let isHead = -1;
        if (isRange) {
            // 在片头片尾中间也跳转
            if (head && currentTime >= head[0] && currentTime < head[1]) {
                isHead = 1;
            }
            if (tail && currentTime >= tail[0] && currentTime < tail[1]) {
                isHead = 0;
            }
        } else {
            if (head && currentTime >= head[0] && currentTime - head[0] < 0.3) {
                isHead = 1;
            }
            if (tail && currentTime >= tail[0] && currentTime - tail[0] < 0.3) {
                isHead = 0;
            }
        }
        if (isHead > -1) {
            const enSkip = () => {
                if (!isHead && tail && tail[0] >= duration) return;
                this.player.toast.addTopHinter(`正在为您跳转${isHead ? '片头' : '片尾'}`, 1000);
                this.player.seek(isHead ? head![1] : tail![1]);
            }
            switch (skip) {
                case 1: {
                    this.toast = this.player.toast.addBottomHinter({
                        restTime: 5,
                        closeButton: true,
                        text: `秒后跳转${isHead ? '片头' : '片尾'}`,
                        jump: '立即跳转',
                        jumpFunc: enSkip,
                        successCallback: enSkip
                    });
                    break;
                }
                case 2:
                    enSkip();
                    break;
                default:
                    break;
            }
        }
    }
    private events() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, this.destroy.bind(this));
    }
    private destroy() {
        this.timer && clearTimeout(this.timer);
        this.player.extraParams!.headTail = null;
        this.toast?.stop();
    }
}

export default SkipHeadTail;
