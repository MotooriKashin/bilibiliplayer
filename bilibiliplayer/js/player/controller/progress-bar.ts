import { IEvent } from "@jsc/player-auxiliary/js/ui/base";
import { Slider } from "@jsc/player-auxiliary/js/ui/slider";
import { fmSeconds } from "@shared/utils";
import ApiPlayerVideoShot, { ApiPlayerVideoShotInData, ApiPlayerVideoShotOutData } from "../../io/api-x-player-videoshot";
import { IHeadTail } from "../../io/rebuild-player-extra-params";
import Player from "../../player";
import Controller from "../controller";
import STATE from "../state";
import SkipHeadTail from "./skip-head-tail";

export class ProgressBar {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private container!: JQuery<HTMLElement>;
    private bar!: JQuery<HTMLElement>;
    private slider!: Slider;
    private lock?: boolean;
    private timer?: number;
    private lastPlayCurrentTime!: number;
    private lastPlayTotalTime!: number;
    private safariVideoDuration!: number;
    private updateDurationMark?: boolean;
    private progressDetailImgInitialized?: boolean;
    private progressDetailImgLoaded?: boolean;
    private img!: JQuery<HTMLElement>;
    private progressDetail!: JQuery<HTMLElement>;
    private time!: JQuery<HTMLElement>;
    private imgShow!: number;
    private HOVER_FIX = 2;
    private skipHeadTail?: SkipHeadTail;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
        this.globalEvents();
    }
    private init() {
        const that = this;
        const player = this.player;
        function moveProgressDetail(e: IEvent) {
            if ($(e.target!).is(that.slider.handle)) {
                that.progressDetail.hide();
                clearTimeout(that.imgShow);
                that.img.hide();
            } else {
                const left = that.slider.getEventsPage(e).x - that.bar.offset()!.left;
                that.progressDetail.css("left", left + "px");

                let time = (left - <number>that.slider.handle.width() / 2) * (player.duration() || 0) / (that.bar.width()! - that.slider.handle.width()!);
                if ((that.HOVER_FIX < left) && ((that.bar.width()! - that.HOVER_FIX) > left)) {
                    that.progressDetail.show();
                } else {
                    that.progressDetail.hide();
                }
                (time < 0) && (time = 0);
                (player.duration()! < time) && (time = player.duration()!);
                that.time.html(fmSeconds(time));
                that.setProgressDetailImg(that.img, time);

                that.imgShow = window.setTimeout(function () {
                    that.progressDetailImgLoaded && that.img.css("display", "");
                }, 1000);
            }
        }
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.bar = $(this.SLIDERTPL()).appendTo(this.container);

        this.slider = new Slider(this.bar, {
            name: "slider",
            videoProgress: true,
            disableChangeMessage: true,
            disabled: true,

            start: () => {
                this.lock = true;
            },
            move: (e: IEvent) => {
                clearInterval(that.timer);
                this.controller.timeLabel.setCurrentTime(fmSeconds(this.player.duration()! * e.value));
                this.player.trigger(STATE.EVENT.VIDEO_MEDIA_SEEKING, {
                    time: e.value * this.player.duration()!,
                });
            },
            change: (e: IEvent) => {
                clearInterval(that.timer);
                that.lock = false;
                this.player?.seek(this.player.duration()! * e.value, STATE.SEEK_TYPE.SLIDEBAR);
                that.timer = window.setInterval(function () {
                    that.onTime();
                }, 200);
            },
            mouseenter: () => {
                if (!player.video) {
                    return false;
                }
                if (!that.progressDetailImgInitialized) {
                    that.progressDetailImgInitialized = true;
                    that.getProgressDetailImg(that.img, 5);
                }
                this.player.$window.bind('mousemove' + player.config.namespace, <any>moveProgressDetail);
            },
            mouseleave: () => {
                this.player.$window.unbind('mousemove' + player.config.namespace, <any>moveProgressDetail);
                that.progressDetail.hide();
                clearTimeout(that.imgShow);
            }
        });

        this.progressDetail = $(this.DETAILTPL()).appendTo(this.bar).hide();
        this.time = $(this.DETAIL_TIME()).prependTo(this.progressDetail);
        this.img = $(this.DETAIL_IMG()).prependTo(this.progressDetail).hide();

        player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, (event: Event) => {
            this.slider.resize();
        });
        this.timer = window['setInterval'](() => {
            this.onTime();
        }, 200);

        this.slider.bufferValue(this.slider.getBufferValue());
    }
    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
        this.player.bind(STATE.EVENT.PLAYER_RELOADED, () => {
            this.progressDetailImgInitialized = false;
        });
    }
    private setProgressDetailImg(element: JQuery<HTMLElement>, value: number) {
        let timeArr = $(element).data('pv_index');
        if (!timeArr) {
            return false;
        }
        timeArr = JSON.parse(timeArr);
        if (!timeArr.length) {
            return false;
        }
        let p = timeArr.length - 2;
        let np = false;
        for (let t = 0; t < timeArr.length - 1; t++) {
            if (value >= timeArr[t] && value < timeArr[t + 1]) {
                p = t - 1;
                break;
            }
        }
        let imgArr = $(element).data('pv_img');
        if (!imgArr) {
            return false;
        }
        imgArr = JSON.parse(imgArr);
        if (Object.prototype.toString.call(imgArr) === '[object Object]') {
            const temp = [];
            for (const i in imgArr) {
                if (imgArr.hasOwnProperty(i)) {
                    temp.push(imgArr[i]);
                }
            }
            imgArr = temp;
        }
        if (!imgArr.length || !imgArr[Math.floor(p / 100)]) {
            return false;
        }
        const pvData = {
            pv_img: imgArr,
            pv_x_len: parseInt($(element).data("pv_x_len"), 10) || 10,
            pv_y_len: parseInt($(element).data("pv_y_len"), 10) || 10,
            pv_x_size: parseInt($(element).data("pv_x_size"), 10) || 160,
            pv_y_size: parseInt($(element).data("pv_y_size"), 10) || 90,
        };
        element.css({
            width: pvData.pv_x_size,
            height: pvData.pv_y_size,
            "transform": "scale(" + 160 / pvData.pv_x_size + ")",
            "transform-origin": "0 0",
            "background-image": "url(" + imgArr[Math.floor(p / 100)] + ")",
            "background-position": pvData.pv_x_size * -(p % 100 % pvData.pv_x_len) + "px " + pvData.pv_y_size * -Math.floor(p % 100 / pvData.pv_y_len) + "px",
        });
    }
    private DETAILTPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-progress-detail">
                <div class="${prefix}-video-progress-detail-sign">
                    <div class="${prefix}-video-progress-detail-sign-down"></div>
                    <div class="${prefix}-video-progress-detail-sign-up"></div>
                </div>
            </div>
            `;
    }
    private DETAIL_IMG() {
        return `<div class="${this.prefix}-video-progress-detail-img"></div>`;
    }
    private DETAIL_TIME() {
        return `<div class="${this.prefix}-video-progress-detail-time"></div>`;
    }
    private getProgressDetailImg(element: JQuery<HTMLElement>, retry: number) {
        if (!retry || !this.player.config.cid || (!this.player.config.aid && !this.player.config.bvid)) {
            return false;
        }
        const data: Partial<ApiPlayerVideoShotInData> = {
            cid: this.player.config.cid,
            jsonp: 'jsonp',
        };
        if (this.player.config.bvid) {
            data.bvid = this.player.config.bvid;
        } else {
            data.aid = this.player.config.aid;
        }
        new ApiPlayerVideoShot(<ApiPlayerVideoShotInData>data).getData({
            success: (data: ApiPlayerVideoShotOutData) => {
                if (data && data.data && data.data.image) {
                    const response = data.data;
                    this.progressDetailImgLoaded = true;

                    this.getArrayBufferIndex(response.pvdata, (indexList) => {
                        element.data({
                            pv_img: JSON.stringify(response.image),
                            pv_x_len: response.imgXlen,
                            pv_y_len: response.imgYlen,
                            pv_x_size: response.imgXsize,
                            pv_y_size: response.imgYsize,
                            pv_index: JSON.stringify(indexList),
                        });
                    });
                } else {
                    setTimeout(() => {
                        this.getProgressDetailImg(element, --retry);
                    }, 1000);
                }
            },
            error: () => {
                setTimeout(() => {
                    this.getProgressDetailImg(element, --retry);
                }, 1000);
            },
        });
    }
    private getArrayBufferIndex(url: string, callback?: (arrList: any[]) => void) {
        if (!url) {
            return false;
        }
        const indexList: number[] = [];
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url.replace('http://', '//'));
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            const data = xhr['response'];
            const dataview = new DataView(data);
            const uint = new Uint8Array(data['byteLength']);
            for (let i = 0; i < uint.length; i += 2) {
                const high = dataview.getUint8(i) << 8;
                const low = dataview.getUint8(i + 1);
                const index = high | low;
                indexList.push(index);
            }
            callback?.(indexList);
        };
        xhr.send(null);
    }
    private onTime() {
        const player = this.player;
        if (player.video) {
            const currentTime = this.player.currentTime()!;
            let duration = this.player.duration()!;
            if (currentTime !== this.lastPlayCurrentTime) {
                this.player.trigger(STATE.EVENT.VIDEO_PROGRESS_UPDATE, {
                    currentTime: currentTime,
                });
                this.updateVideoTime(currentTime);
            }
            if (duration !== this.lastPlayTotalTime && !this.player.getTimeOffset()) {
                this.updateVideoTime(currentTime, duration || 0);
            }

            // 互动视频特殊处理（不走以下逻辑
            this.skipHeadTail?.autoSkipHeadTail(currentTime);
        }
    }
    newSkip(headTail: IHeadTail) {
        if (this.skipHeadTail) return;
        this.skipHeadTail = new SkipHeadTail(this.player, headTail);
    }
    updateVideoTime(current: number, total?: number) {
        const player = this.player;
        const controller = this.controller;
        controller.timeLabel.setCurrentTime(fmSeconds(current));
        this.lastPlayCurrentTime = current;

        if (total !== this.lastPlayTotalTime && total! > 0 && (!this.lastPlayTotalTime || !this.updateDurationMark)) {
            controller.startButton.enable();
            this.slider.enable();

            controller.timeLabel.setTotalTime(fmSeconds(total!));
            this.lastPlayTotalTime = total!;
            this.safariVideoDuration = player.duration(player.video, true)!;
        }

        this.lock || this.slider.value((this.lastPlayCurrentTime / this.lastPlayTotalTime) || 0);
        if (player.config.ad) {
            player.template.skipTime.html(
                String(Math.floor(this.lastPlayTotalTime!) - Math.floor(this.lastPlayCurrentTime)) || '-',
            );
            if (this.lastPlayTotalTime! <= this.lastPlayCurrentTime && this.lastPlayTotalTime! > 0) {
                typeof player.config.afterplay === 'function' && player.config.afterplay();
            }
        }
    }
    private SLIDERTPL(): any {
        return `<div class="${this.prefix}-video-progress-bar"></div>`;
    }
    private TPL(): any {
        return `<div class="${this.prefix}-video-progress"></div>`;
    }
    setRange(rate: number) {
        this.slider.bufferValue(rate);
    }
    getRange() {
        return this.slider.bufferValue();
    }
    getProgressRate() {
        return this.slider.value()!;
    }
    setProgressRate(percentage: number) {
        return this.slider.value(percentage);
    }
    moveProgress(percentage: number) {
        this.slider.move(percentage);
    }
    getDuration(): number {
        return this.safariVideoDuration || this.player.duration(this.player.video, true)!;
    }
    private destroy() {
        this.timer && clearInterval(this.timer);
        delete this.skipHeadTail;
    }
}