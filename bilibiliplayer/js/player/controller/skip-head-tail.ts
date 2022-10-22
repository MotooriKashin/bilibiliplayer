import STATE from '../state';
import Player from '../../player';
import { IHeadTail } from '../../io/rebuild-player-extra-params';
interface ISkipOptions {
    container: JQuery;
    headTail: IHeadTail;
    autoPlay: boolean;
}

class SkipHeadTail {
    private prefix: string;
    private container: JQuery;
    private elements!: { [key: string]: JQuery; };
    private head!: number[] | null;
    private tail!: number[] | null;
    private duration: any;
    private skip!: number;
    private isFirst!: boolean;
    private timer = {
        skip: 0,
        show: 0,
        hide: 0,
        init: 0,
    };
    private leftMin = 0;
    private toastOnce = 1; // toast只提示一次
    private playOnce = 1; // 只监听play一次
    private progressWidth!: number;
    private eventDelay = false;
    private dotPosition = {
        dotWidth: 0,
        coinWidth: 0,
    };
    private userSet = false; // 用户设置跳转为是（主要是为了区分暂停状态下的用户行为

    constructor(private player: Player, private options: ISkipOptions) {
        this.container = options.container;
        this.prefix = this.player.prefix;
        setTimeout(() => {
            this.player.userLoadedCallback(() => {
                this.init();
            });
        }, 0);
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
        this.timer.init = window.setTimeout(() => {
            this.getDuration();
            if (this.duration) {
                this.init();
            } else {
                this.beforeCreate();
            }
        }, 100);
    }
    private create() {
        const prefix = this.prefix;
        this.head = this.options.headTail.head;
        this.tail = this.options.headTail.tail;
        this.skip = this.player.get('video_status', 'skip');
        this.isFirst = this.options.headTail.first;

        // -1代表跳到片尾
        if (this.tail && this.tail[1] < 0) {
            this.tail[1] = this.duration;
        }

        this.container.append($(this.TPL()));
        this.resize();
        this.elements = {
            skip: this.container.find(`.${prefix}-skip`),
            panel: this.container.find(`.${prefix}-skip-panel`),
            head: this.container.find(`.${prefix}-skip-dot-head`),
            tail: this.container.find(`.${prefix}-skip-dot-tail`),
            yes: this.container.find(`.${prefix}-skip-btn-yes`),
            no: this.container.find(`.${prefix}-skip-btn-no`),
        };
        this.randerDot();
        this.noPointer();
        this.events();

        if (this.eventDelay) {
            this.autoSkipHeadTail(this.player.currentTime()!, true);
        }
    }
    reload() {
        this.destroy();
        this.init();
    }
    changeState(open: number, track: string, inner = true) {
        if (open === 1) {
            this.userSet = true;
            this.autoSkipHeadTail(this.player.currentTime()!, true);
        } else if (open === 2) {
            this.userSet = false;
        }

        if (this.skip === open) return;
        this.skip = open;

        this.noPointer();

        if (inner) {
            // this.player.controller.settingButton?.skipHeadTail?.value(open === 1);

            this.player.set('video_status', 'skip', open);
        }
    }
    // 是否响应点的hover
    private noPointer() {
        if (this.skip === 1) {
            this.elements?.skip.addClass(`${this.prefix}-no-pointer`);
        } else {
            this.elements?.skip.removeClass(`${this.prefix}-no-pointer`);
        }
    }
    // 配置时间特殊情况处理：
    // 1、片头开始时间＞视频总长：无片头片尾
    // 2、片尾开始时间＞视频总长：无片尾
    // 3、片尾结束时间＞视频总长：片尾到视频结尾
    private randerDot() {
        if (this.head) {
            if (this.head[0] >= this.duration) return;

            this.elements.head.css({
                left: this.parseNum(this.head[0]),
                display: 'block',
            });
        }

        if (this.tail) {
            if (this.tail[0] >= this.duration) return;

            this.elements.tail.css({
                left: this.parseNum(this.tail[0]),
                display: 'block',
            });
        }
    }
    // 片头片尾文案
    skipText(time: number) {
        let txt = '';
        if (this.duration) {
            const currentTime = this.player.currentTime()!;

            if (this.head) {
                this.elements.head.css('opacity', 1);
                const headTime = this.head[0];
                if (Math.abs(time - headTime) < this.dotPosition.dotWidth) {
                    txt = '片头';
                }
                if (Math.abs(currentTime - headTime) < this.dotPosition.coinWidth) {
                    this.elements.head.css('opacity', 0);
                }
            }

            if (this.tail) {
                this.elements.tail.css('opacity', 1);
                const tailTime = this.tail[0];
                if (Math.abs(time - tailTime) < this.dotPosition.dotWidth) {
                    txt = '片尾';
                }
                if (Math.abs(currentTime - tailTime) < this.dotPosition.coinWidth) {
                    this.elements.tail.css('opacity', 0);
                }
            }
        }
        return txt;
    }
    videoPlay() {
        // 只处理第一次toast
        if (this.playOnce) {
            this.playOnce = 0;
            if (this.isFirst && this.toastOnce) {
                this.autoSkipHeadTail(this.player.currentTime()!, true);
            } else {
                this.eventDelay = true;
            }
        }
    }

    // 判断是否要自动跳过首尾
    autoSkipHeadTail(currentTime: number, isRange = false) {
        if (this.player.errorPlayurl) return;
        if (this.skip !== 1) return;
        if (!this.player.video || this.player.video.paused) return;

        this.autoSeekTail(currentTime, isRange);
    }
    private autoSeekTail(currentTime: number, isRange = false) {
        const duration = this.player.duration() || 0;
        const head = this.head;
        const tail = this.tail;

        if (head && head[0] >= duration) return;

        let isHead = -1;
        if (isRange || this.userSet) {
            // 在片头片尾中间也跳转
            this.userSet = false;
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
            if (!isHead && tail && tail[0] >= duration) return;
            if (this.isFirst) {
                this.showFirstToast();
                return;
            }
            this.player.toast.addTopHinter(`正在为您跳转${isHead ? '片头' : '片尾'}`, 1000);
            this.player.seek(isHead ? head![1] : tail![1]);
        }
    }
    private parseNum(num: number, min = 0, max = 1) {
        let cent = num / this.duration;
        cent = Math.min(cent, max);
        cent = Math.max(cent, min);
        return `${cent * 100}%`;
    }
    private events() {
        this.elements.head.hover(
            () => {
                this.elements.panel.css('left', this.parseNum(this.head![0], this.leftMin, 1 - this.leftMin));
                this.triggerHover();
            },
            () => {
                this.triggerLeave();
            },
        );
        this.elements.tail.hover(
            () => {
                this.elements.panel.css('left', this.parseNum(this.tail![0], this.leftMin, 1 - this.leftMin));
                this.triggerHover();
            },
            () => {
                this.triggerLeave();
            },
        );
        this.elements.panel.hover(
            () => {
                this.triggerHover();
            },
            () => {
                this.triggerLeave();
            },
        );
        this.player.bind(STATE.EVENT.VIDEO_PANEL_HOVER, () => {
            this.clearPanelTimer();
        });
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            this.resize();
        });
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, this.destroy.bind(this));

        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            // seek时重置用户行为
            this.userSet = false;
        });

        this.container.hover(
            () => {
                clearTimeout(this.timer.skip);
                this.elements.skip.show();
            },
            () => {
                this.timer.skip = window.setTimeout(() => {
                    this.elements.skip.hide();
                }, 200);
            },
        );
        this.elements.head.on('click', () => {
            this.player.seek(this.head![0]);
        });
        this.elements.tail.on('click', () => {
            this.player.seek(this.tail![0]);
        });
        this.elements.yes.on('click', () => {
            this.changeState(1, 'skip-click');
        });
        this.elements.no.on('click', () => {
            this.changeState(2, 'skip-click');
            this.elements.panel.hide();
        });
    }
    private showFirstToast() {
        if (this.isFirst && this.skip === 1 && this.toastOnce) {
            this.toastOnce = 0;
            this.player.toast.addBottomHinter({
                timeout: 10000,
                closeButton: true,
                text: '首次观看为您播放片头片尾',
                jump: '仍然跳过',
                theme: 'blue',
                jumpFunc: () => {
                    this.isFirst = false;
                    this.changeState(1, 'firstskip-click');
                },
            });
        }
    }
    private resize() {
        this.progressWidth = this.container.width()!;
        this.leftMin = 65 / this.progressWidth;
        this.dotPosition.dotWidth = (2 / this.progressWidth) * this.duration;
        this.dotPosition.coinWidth = this.dotPosition.dotWidth * 4.5;
    }
    private triggerHover() {
        this.clearPanelTimer(true);
        this.player.trigger(STATE.EVENT.VIDEO_PANEL_HOVER);
        this.timer.show = window.setTimeout(() => {
            this.elements.panel.show();
        }, 300);
    }
    private triggerLeave() {
        this.timer.hide = window.setTimeout(() => {
            this.clearPanelTimer();
        }, 200);
    }
    private clearPanelTimer(hover?: boolean) {
        this.timer.show && clearTimeout(this.timer.show);
        if (this.timer.hide) {
            clearTimeout(this.timer.hide);
            this.timer.hide = 0;
            if (!hover) {
                this.elements.panel.hide();
            }
        }
    }
    private destroy() {
        this.timer.init && clearTimeout(this.timer.init);
        this.timer.show && clearTimeout(this.timer.show);
        this.timer.hide && clearTimeout(this.timer.hide);
        this.container.html('');
        this.player.extraParams!.headTail = null;
    }
    private TPL() {
        const prefix = this.prefix;
        return `<div class="${prefix}-skip">
                    <div class="${prefix}-skip-panel">
                        <div class="${prefix}-skip-title">始终跳过片头片尾</div>
                        <div class="${prefix}-skip-btn">
                            <span class="${prefix}-skip-btn-yes">是</span>
                            <span class="${prefix}-skip-btn-no">否</span>
                        </div>
                    </div>
                    <span class="${prefix}-skip-dot-head"></span>
                    <span class="${prefix}-skip-dot-tail"></span>
                </div>`;
    }
}

export default SkipHeadTail;
