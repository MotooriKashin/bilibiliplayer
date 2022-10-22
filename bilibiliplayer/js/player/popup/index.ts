import STATE from '../state';
import CSSRender from './render';
import Player from '../../player';
import Manager from './manager';

import '../../../css/popup.less';

export interface IVoteAnswer {
    idx: number;
    desc: string;
    cnt: number;
    percent?: number;
}
export interface IPoputBodyInterface {
    type: number;
    from: number;
    to: number;
    pos_x: number;
    pos_y: number;
    mid: number; // 要关注的mid
    dmid: string;
    face?: string;
    isFollow?: boolean; // 是否已关注
    ele?: JQuery | null;
    key?: string; // 只供编译器使用

    question?: string;
    myVote?: number;
    duration?: number;
    voteId?: number;
    options?: IVoteAnswer[];
    handled?: boolean;
    arcType?: number; // 视频类型，0: pgc，1: ogv
}

interface IOptionsInterface {
    time?: () => number;
    container?: JQuery;
    visible?: boolean;
}

class Popup {
    paused: boolean;
    player: Player;
    manager!: Manager;
    options: IOptionsInterface;
    private inited = false;
    private hasBlackside!: boolean; // 是否有黑边
    private render!: CSSRender;
    /**
     * 视频宽高
     */
    private resolutionWidth!: number;
    private resolutionHeight!: number;
    /**
     * 显示区域宽高
     */
    innerWidth!: number;
    innerHeight!: number;
    mid!: number;
    ele: {
        [key: string]: JQuery;
    } = {};
    data!: IPoputBodyInterface[];
    dragable!: boolean;

    constructor(options: IOptionsInterface, player: Player) {
        const _DEFAULT_OPTIONS: IOptionsInterface = {};
        this.options = $.extend(_DEFAULT_OPTIONS, options);
        this.player = player;
        this.paused = this.player.video && this.player.video.paused;
        this.init();
    }

    updateMid(mid: number) {
        this.mid = mid;
    }
    update(data: IPoputBodyInterface[]) {
        const run = () => {
            data = data.sort((a, b) => a.from - b.from);
            data = data.map((item) => {
                item.face = item.face?.replace('http://', '//');
                return item;
            });
            this.data = data;
            this.manager && this.manager.refresh();
        };

        run();
    }

    setDragable(val: boolean) {
        this.dragable = val;
    }

    play() {
        this.paused = false;
    }

    pause() {
        this.paused = true;
    }

    shortcutVote(idx: number, cb?: Function) {
        return this.render?.shortcutVote(idx, cb);
    }

    // 只用于投票更新状态
    outVote(idx: number) {
        this.render?.outVote(idx);
    }

    private init() {
        if (!this.inited) {
            this.options.container!.append(
                `<div class="${this.player.prefix}-popup-inner"><div class="${this.player.prefix}-popup-padding"><div class="${this.player.prefix}-popup-area"></div></div></div>`,
            );
            this.ele.area = this.options.container!.find(`.${this.player.prefix}-popup-area`);
            this.ele.inner = this.options.container!.find(`.${this.player.prefix}-popup-inner`);
            this.render = new CSSRender(
                {
                    container: this.ele.area,
                    player: this.player,
                    time: this.options.time!,
                },
                this,
            );
            this.manager = new Manager(
                {
                    time: this.options.time!,
                    render: this.render,
                },
                this,
            );
            this.inited = true;
            this.setBlackside(this.player.state.mode);
            this.resize();
            this.bindEvents();
        }
    }

    private bindEvents() {
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, () => {
            this.play();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            this.pause();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            this.pause();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => {
            this.refresh();
            this.play();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
            this.refresh();
        });
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, (event: Event, mode: number) => {
            this.setBlackside(mode);
            this.render && this.resize();
        });
        this.player.bind(STATE.EVENT.VIDEO_SIZE_RESIZE, () => {
            this.render && this.resize();
        });
    }

    private refresh() {
        this.manager && this.manager.refresh();
    }

    resize(width = this.resolutionWidth, height = this.resolutionHeight) {
        if (this.hasBlackside) {
            this.options.container?.css({
                padding: '48px 7px',
            });
        } else {
            this.options.container?.css({
                padding: '',
            });
        }
        this.resolutionWidth = width;
        this.resolutionHeight = height;
        if (this.inited) {
            let w = +this.player.video?.style.width;
            let h = +this.player.video?.style.height;
            if (w) {
                this.ele.inner.css({
                    width: w,
                    height: h,
                });
            } else {
                w = this.options.container!.width()!;
                h = this.options.container!.height()!;
                if (w / width > h / height) {
                    this.ele.inner.css({
                        width: (((h / height) * width) / w) * 100 + '%',
                        height: '100%',
                    });
                } else {
                    this.ele.inner.css({
                        width: '100%',
                        height: (((w / width) * height) / h) * 100 + '%',
                    });
                }
            }
            this.innerWidth = this.ele.inner!.width()!;
            this.innerHeight = this.ele.inner!.height()!;
        }
        this.render && this.render.resize();
    }

    // 判断是否有黑边
    private setBlackside(mode: number) {
        let hasBlackside = this.player.videoSettings['video_status']['blackside_state'];
        if (typeof this.player.globalFunction.WINDOW_AGENT.toggleBlackSide !== 'function') {
            hasBlackside = false;
        }
        if (mode === STATE.UI_NORMAL && hasBlackside) {
            this.hasBlackside = true;
        } else {
            this.hasBlackside = false;
        }
    }

    clear() {
        this.manager && this.manager.clear();
    }

    destroy() {
        this.pause();
        this.manager && this.manager.destroy();
        this.options.container!.html('');
    }

    option(key: any, value: any): any {
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.options.visible = value;
                if (value) {
                    this.manager?.next();
                } else {
                    this.clear();
                }
                break;
            default:
                break;
        }
    }
}

export default Popup;