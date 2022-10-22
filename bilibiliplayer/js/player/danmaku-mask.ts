import SessionController from './session-controller';
import STATE from './state';
import Player from '../player';
import RangeLoader, { ApiRangeInData } from '../io/xhr-range-loader';
import Pako from 'pako';
import { getDecoder } from '@shared/utils';

interface IMaskConfigInterface {
    danmaku: string;
    visible: boolean;
    dmask: boolean;
    inlinemode: boolean;
    data: string;
    cid: number;
}
interface IHeaderInterface {
    tag: string;
    version: number;
    codeId: number;
    reserved: number;
    entryNum: number;
}
interface ILoadingInterface {
    start: number;
    end: number;
}
interface IMaskSizeInterface {
    width: number;
    height: number;
    replaceWidth: string;
    replaceHeight: string;
}
interface IBlackSideInterface {
    top: number;
    left: number;
}
interface IPlayerSizeInterface {
    clientW?: number;
    clientH?: number;
    videoW?: number;
    videoH?: number;
    padding?: number;
    scale?: string;
}
interface IMaskListInterface {
    list: IMaskMenuInterface[]; // 目录
    dataList: IMaskDataInterface[]; // mask数据
}
interface IMaskMenuInterface {
    offset: number; // 该蒙版帧数据段在文件中的偏移量
    time: number; // 蒙版帧的起始pts_time
}
interface IMaskDataInterface {
    data: IPerMaskDataInterface[];
    end: number; // 当前段的结束时间
    start: number; // 当前段的开始时间
}
interface IPerMaskDataInterface {
    time: number; // 对应的时间
    data: string; // 每帧mask数据 base64
}
class DanmakuMask {
    private player: Player;
    private config: IMaskConfigInterface;
    private padding: number = 0; // 视频上下黑边（0-100）
    private paused!: boolean; // 是否暂停
    private getMask!: RangeLoader; // 获取数据ajax
    private container: JQuery; // 要加蒙板的标签
    private maskList!: IMaskListInterface; // 所有分组数据的集合
    private maskUrl: string; // 蒙版数据url
    private animate!: number; // 定时器
    private maskTime!: number; // 当前帧的时间
    private fps: number; // 每秒多少帧
    private maxfps: number; // 每秒max多少帧
    private direction: string = 'bottom';
    private decoder: any; // 转换为字符
    private header!: IHeaderInterface; // 头部信息
    private headerLength!: number; // 蒙版头的长度
    private isGettingheader!: boolean; // 是否在获取蒙版头
    private bufferOffset!: number; // 当前所获取的位置
    private perPart: number = 22; // 每次请求多少段
    private loadingTime!: ILoadingInterface; // 正在加载的时间段
    private maskStart!: number; // 每次渲染的起始时间
    private lockStart!: number; // 卡顿起始时间
    private lockSended!: boolean; // 是否发送卡顿埋点
    private cMask!: string; // 当前蒙版数据
    private maskSize!: IMaskSizeInterface; // 蒙版宽高
    private isMirror!: boolean; // 播放器是否镜像
    private videoSize!: number; // 视频比例 0为默认
    private blackSide!: IBlackSideInterface; // 黑边大小
    private hasBlackside!: boolean; // 是否有黑边
    private playerSize!: IPlayerSizeInterface; // 播放器尺寸
    private startTime!: number; // 动画开始时间
    private autoFps: any; // 自动降帧时间
    private ratioError: number = 0; // 比例相差太大埋点只报一次

    constructor(player: Player, config: IMaskConfigInterface) {
        this.player = player;
        this.config = config;
        this.container = $(this.config.danmaku);
        this.maskUrl = (<any>config).data['mask_url'];
        this.maxfps = (<any>config).data['fps'];
        this.fps = Math.min(this.maxfps, 24);
        this.init();
        this.globalEvents();
    }

    init() {
        this.maskList = {
            list: [],
            dataList: [],
        };
        this.blackSide = {
            top: 48,
            left: 7,
        };
        this.autoFps = {
            slow: 0,
            fast: 0,
        };
        this.playerSize = {};
        this.startTime = 0;
        this.paused = true;
        this.isGettingheader = true;
        this.bufferOffset = 0;
        this.headerLength = 16;
        this.isMirror = SessionController.getSession('video_status', 'videomirror');
        this.wrapReset(this.player.state.mode);
        this.getHeader(this.bufferOffset, this.headerLength);
    }

    setFPS(num: number) {
        const n = +num;
        if (n <= 0) {
            this.fps = 1;
        } else if (n > this.maxfps) {
            this.fps = this.maxfps;
        } else {
            this.fps = n;
        }
    }

    play() {
        this.paused = false;
        this.maskStart = 0;
        this.lockStart = 0;
        this.setAnimation();
    }

    pause() {
        this.paused = true;
    }

    changeContainer() {
        this.container = $(this.config.danmaku);
    }
    maskIsShow() {
        return this.config.visible && this.config['dmask'];
    }

    /**
     * 设置显示隐藏
     */
    setting(key: string, value?: boolean) {
        if (arguments.length === 1) {
            return this.config[<keyof IMaskConfigInterface>key];
        } else {
            if (this.config[<keyof IMaskConfigInterface>key] !== value) {
                (<any>this).config[key] = value;
                if (value) {
                    this.setAnimation();
                } else {
                    this.cancelAnimation();
                    this.cMask = '';
                    this.setMaskImage();
                }
            }
            return value;
        }
    }
    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, (event: Event, mode: number) => {
            this.wrapReset(mode);
        });
        this.player.bind(STATE.EVENT.VIDEO_MIRROR, () => {
            this.isMirror = SessionController.getSession('video_status', 'videomirror');
        });
        this.player.bind(STATE.EVENT.VIDEO_SIZE_RESIZE, () => {
            this.setVideoSize();
        });
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
    }
    // 确定缩放比例
    private setVideoSize(resize = true) {
        const videoScale = {
            'video-size-4-3': 0.75,
            'video-size-16-9': 0.5625,
        };
        const videoSize = SessionController.getSession('video_status', 'videosize');
        this.videoSize = videoScale[<keyof typeof videoScale>videoSize];
        resize && this.resize();
    }
    // 判断是否有黑边
    private setBlackside(mode: number, resize = true) {
        let hasBlackside = this.player.videoSettings['video_status']['blackside_state'];
        if (typeof this.player.globalFunction.WINDOW_AGENT.toggleBlackSide !== 'function') {
            hasBlackside = false;
        }
        if (mode === STATE.UI_NORMAL && hasBlackside) {
            this.hasBlackside = true;
        } else {
            this.hasBlackside = false;
        }
        resize && this.resize();
    }
    // 卡顿埋点
    private setInfo() {
        if (!this.maskStart) return;
        const now = Date.now();
        const fps = 1000 / (now - this.maskStart);

        if (fps < this.fps * 0.7) {
            // 降帧
            if (this.autoFps.slow) {
                if (now - this.autoFps.slow > 1000) {
                    this.setFPS(--this.fps);
                    this.autoFps.slow = 0;
                }
            } else {
                this.autoFps.slow = now;
            }
            this.autoFps.fast = 0;
        } else {
            // 升帧
            this.autoFps.slow = 0;
            if (this.autoFps.fast) {
                if (now - this.autoFps.fast > 1000) {
                    this.setFPS(++this.fps);
                    this.autoFps.fast = 0;
                }
            } else {
                this.autoFps.fast = now;
            }
        }

        if (this.lockSended) return;
        // 卡顿埋点
        if (fps < 10) {
            if (this.lockStart) {
                if (now - this.lockStart > 3000) {
                    this.lockSended = true;
                }
            } else {
                this.lockStart = now;
            }
        } else {
            this.lockStart = 0;
        }
    }
    // 比例相差太大埋点
    private setRatio() {
        if (this.ratioError) return;

        this.ratioError = 1;
    }
    // 设置动画
    private setAnimation() {
        if (
            this.paused ||
            !this.config.visible ||
            !this.config['dmask'] ||
            this.isGettingheader ||
            !this.config['inlinemode']
        ) {
            return;
        }
        this.cancelAnimation();
        this.animate = window.requestAnimationFrame((timestamp: number) => {
            if (timestamp - this.startTime > 1000 / this.fps) {
                this.startTime = timestamp;
                this.showMask();
            }
            this.setAnimation();
        });
    }
    // 取消动画
    private cancelAnimation() {
        window.cancelAnimationFrame(this.animate);
    }
    // 渲染每一帧数据
    private showMask() {
        if (!this.player.video) {
            return;
        }
        this.setInfo();
        this.maskStart = Date.now();
        const currentTime = this.player.currentTime()! * 1000;
        let list: IPerMaskDataInterface[] = [];
        // 获取当前时间段的数据
        this.maskList.dataList.forEach((ele: IMaskDataInterface) => {
            if (ele.start <= currentTime && currentTime < ele.end) {
                list = ele.data;
            }
        });
        const lens = list ? list.length : 0;
        if (lens <= 0) {
            this.cMask = '';
            this.setMaskImage();
            if (
                this.loadingTime.end === 0 ||
                (currentTime < this.loadingTime.start && currentTime >= this.loadingTime.end)
            ) {
                this.loadMask(currentTime);
            }
            return;
        }

        let mask;
        const ctime = this.player.currentTime()! * 1000 || 0;
        const offset = Math.floor(1000 / this.fps);
        for (let i = 0; i < lens; i++) {
            const item = list[i];
            if (ctime + offset <= item['time'] && item['time'] < ctime + offset * 3) {
                mask = item;
                break;
            }
        }
        if (mask && this.maskTime !== mask['time']) {
            this.maskTime = mask['time'];
            this.cMask = mask['data'];
            this.setMaskImage();
        }
    }
    // 渲染
    private setMaskImage() {
        let bg = '';
        if (this.cMask) {
            const cMask = this.parseBase64(this.cMask);
            bg = `linear-gradient(to ${this.direction},
                rgba(0,0,0,1),
                rgba(0,0,0,1) ${this.padding}%,
                rgba(0,0,0,0) ${this.padding}%),
                linear-gradient(to ${this.direction},
                rgba(0,0,0,0) ${100 - this.padding}%,
                rgba(0,0,0,1) ${100 - this.padding}%,
                rgba(0,0,0,1)),url(${cMask})`;
            if (this.hasBlackside) {
                let direction = 'bottom';
                if (this.direction === 'bottom') {
                    direction = 'right';
                }
                bg = `linear-gradient(to ${direction},
                    rgba(0,0,0,1),
                    rgba(0,0,0,1) ${this.playerSize.padding}%,
                    rgba(0,0,0,0) ${this.playerSize.padding}%),
                    linear-gradient(to ${direction},
                    rgba(0,0,0,0) ${100 - this.playerSize.padding!}%,
                    rgba(0,0,0,1) ${100 - this.playerSize.padding!}%,
                    rgba(0,0,0,1)), ${bg}`;
            }
        }
        this.container.css({ '-webkit-mask-image': bg });
    }
    // io
    private getBufferRange(from: number, to: number, cb: Function) {
        if (this.maskUrl) {
            const range = to === -1 ? `bytes=${from}-` : `bytes=${from}-${to}`;
            this.getMask = new RangeLoader(<ApiRangeInData>{
                url: this.maskUrl,
                range: range,
            }).getData({
                success: (res: ArrayBuffer) => {
                    typeof cb === 'function' && cb(res);
                },
                error: (xhr: any) => { },
            });
        }
    }

    private wrapReset(mode: number) {
        // 容器宽高
        this.playerSize.clientH = this.player.template.playerWrap[0].clientHeight;
        this.playerSize.clientW = this.player.template.playerWrap[0].clientWidth;
        this.setVideoSize(false);
        this.setBlackside(mode);
    }
    private resize() {
        const video = this.player.video;
        if (!video) return;
        let ratio = video.videoHeight / video.videoWidth;
        if (this.maskSize && this.maskSize.height && this.maskSize.width) {
            const maskRatio = this.maskSize.height / this.maskSize.width;
            if (Math.abs(ratio - maskRatio) > 0.05) {
                this.setRatio();
                ratio = maskRatio;
            }
        }
        // 容器宽高
        const W = this.playerSize.clientW!;
        const H = this.playerSize.clientH!;
        let videoW;
        let videoH;
        if (this.hasBlackside) {
            videoW = W - this.blackSide.left * 2;
            videoH = H - this.blackSide.top * 2;
        } else {
            videoW = W;
            videoH = H;
        }
        if (ratio <= videoH / videoW) {
            // 横屏视频
            this.toBottom(videoW, videoH, ratio);
        } else {
            // 竖屏视频
            this.toRight(videoW, videoH, ratio);
        }
        this.paused && this.setMaskImage();
    }

    // 横屏视频
    private toBottom(videoW: number, videoH: number, ratio: number) {
        this.playerSize.videoW = videoW;
        this.playerSize.videoH = videoW * ratio;
        this.direction = 'bottom';
        if (this.videoSize) {
            if (ratio > videoH / videoW) {
                this.playerSize.videoH = this.playerSize.videoW * this.videoSize;
                this.playerSize.scale = `${(this.playerSize.videoW * ratio) / this.playerSize.videoH},1`;
            } else {
                const height = this.playerSize.videoH;
                this.playerSize.videoH = this.playerSize.videoW * this.videoSize;
                if (this.playerSize.videoH > videoH) {
                    // 变换后为竖屏
                    this.toRight(videoW, videoH, ratio);
                    return;
                }
                let scale = this.playerSize.videoH / height;
                if (scale > 1) {
                    this.playerSize.scale = `1,${scale}`;
                } else {
                    this.playerSize.scale = `${1 / scale},1`;
                }
            }
        }
        this.padding = (0.5 - this.playerSize.videoH / (2 * this.playerSize.clientH!)) * 100;
        this.playerSize.padding = (this.blackSide.left * 100) / this.playerSize.clientW!;
    }
    // 竖屏视频
    private toRight(videoW: number, videoH: number, ratio: number) {
        this.playerSize.videoW = videoH / ratio;
        this.playerSize.videoH = videoH;
        this.direction = 'right';
        if (this.videoSize) {
            const width = this.playerSize.videoW;
            this.playerSize.videoW = this.playerSize.videoH / this.videoSize;
            if (this.playerSize.videoW > videoW) {
                // 变换后为横
                this.toBottom(videoW, videoH, ratio);
                return;
            }
            let scale = this.playerSize.videoW / width;
            if (scale > 1) {
                this.playerSize.scale = `${scale},1`;
            } else {
                this.playerSize.scale = `1,${1 / scale}`;
            }
        }
        this.padding = (0.5 - this.playerSize.videoW / (2 * this.playerSize.clientW!)) * 100;
        this.playerSize.padding = (this.blackSide.top * 100) / this.playerSize.clientH!;
    }
    // 获取头
    private getHeader(from: number, to: number) {
        this.getBufferRange(from, to, (arrayBuffer: ArrayBuffer) => {
            this.bufferOffset = to;
            const dataView = new DataView(arrayBuffer);
            if (!this.decoder) {
                this.decoder = getDecoder();
            }
            this.header = {
                tag: this.decoder.decode(arrayBuffer.slice(0, 4)), // 4字节tag
                version: dataView.getInt32(4), // 4字节version
                codeId: dataView.getInt8(8), //1字节id
                reserved: dataView.getInt32(8), //保留字段
                entryNum: dataView.getInt32(12), // 4字节列表数
            };
            const num = this.header.entryNum * 16;
            if (this.header.tag === 'MASK' && this.header.codeId === 2) {
                this.getTopList(to, to + num);
            }
        });
    }
    // 获取目录
    private getTopList(from: number, to: number) {
        this.getBufferRange(from, to, (arrayBuffer: ArrayBuffer) => {
            this.isGettingheader = false;
            this.bufferOffset = to;
            const dataView = new DataView(arrayBuffer);
            let start = 0;
            let packetLen = 4;
            for (let i = 0; i < this.header.entryNum; i++) {
                if (dataView.getInt32(start) === 0 && dataView.getInt32(start + 8) === 0) {
                    const time = dataView.getInt32(start + 4);
                    const offset = dataView.getInt32(start + 12);
                    start += packetLen * 4;
                    this.maskList.list.push({
                        time,
                        offset,
                    });
                }
            }
            let len = this.maskList.list.length;
            const videoTime = this.player.duration()! * 1000;
            if (videoTime > this.maskList.list[len - 1].time) {
                // 最后一节
                this.maskList.list.push({
                    time: videoTime,
                    offset: -1,
                });
                len++;
            }
            this.perPart = len > this.perPart ? this.perPart : len;
            this.loadMask(1000);
            if (!this.animate) {
                this.setAnimation();
            }
        });
    }
    // ms 提取当前时间点所对应区间的蒙版数据
    private loadMask(currentTime: number) {
        let start: number;
        let end: number;
        // 取出当前时间所对应的区间
        for (let i = 0, len = this.maskList.list.length; i < len;) {
            const ele = this.maskList.list[i];
            let next = this.maskList.list[i + this.perPart];
            end = i + this.perPart;
            if (!next) {
                end = len - 1;
                next = this.maskList.list[end];
            }
            if (ele.time <= currentTime && currentTime < next.time) {
                start = i;
                break;
            }
            i = i + this.perPart;
        }
        if (typeof start! === 'undefined') {
            return;
        }
        const first = this.maskList.list[start];
        const last = this.maskList.list[end!];
        const from = first.offset;
        const to = last.offset;
        this.loadingTime = {
            start: first.time,
            end: last.time,
        };
        this.getBufferRange(from, to, (arrayBuffer: ArrayBuffer) => {
            this.bufferOffset = to;
            let lastOffset = this.maskList.list[start].offset;
            for (let i = start; i < end; i++) {
                let input;
                const nextSet = this.maskList.list[i + 1].offset;
                if (nextSet === -1) {
                    input = arrayBuffer.slice(this.maskList.list[i].offset - lastOffset);
                } else {
                    input = arrayBuffer.slice(this.maskList.list[i].offset - lastOffset, nextSet - lastOffset);
                }
                const buffer = Pako.inflate(new Uint8Array(input)).buffer;
                const s = start === 0 && i === 0 ? 0 : this.maskList.list[i].time;
                this.parse(s, this.maskList.list[i + 1].time, buffer);
            }
            this.loadingTime = {
                start: 0,
                end: 0,
            };
            this.parseBase64(this.maskList.dataList[0].data[0].data);
        });
    }
    // buffer to base64
    private parse(start: number, end: number, buffer: ArrayBuffer) {
        const data = [];
        if (!this.decoder) {
            this.decoder = getDecoder();
        }
        let size, time;
        const dv = new DataView(buffer);
        for (let i = 0, len = dv.byteLength; i < len;) {
            //解析每一帧蒙版
            size = dv.getInt32(i);
            time = dv.getInt32(i + 8);
            data.push({
                time: time,
                data: this.decoder.decode(buffer.slice(i + 12, i + 12 + size)),
            });
            i = i + 12 + size;
        }
        this.maskList.dataList.push({
            start,
            end,
            data,
        });
    }
    // 修改svg来适配不同的视频模式 （镜像，4：3...）
    private parseBase64(str: string) {
        const baseStr = 'data:image/svg+xml;base64,';
        let svg = window.atob(str.replace(baseStr, ''));
        if (!this.maskSize) {
            // 每个视频只获取一次
            const widthMatch = svg.match(/width="(\S*)"/);
            const heightMatch = svg.match(/height="(\S*)"/);
            if (widthMatch && heightMatch) {
                this.maskSize = {
                    replaceWidth: widthMatch[0],
                    replaceHeight: heightMatch[0],
                    width: parseInt(widthMatch[1], 10),
                    height: parseInt(heightMatch[1], 10),
                };
                this.resize();
            }
        } else {
            let style = this.isMirror ? 'rotateY(180deg) ' : '';
            style += this.videoSize ? `scale(${this.playerSize.scale})` : '';
            style = style ? `style="transform:${style};" ` : '';
            style += `height="${this.playerSize.videoH! + 4}px"`;

            svg = svg.replace(this.maskSize.replaceWidth, `width="${this.playerSize.videoW! + 4}px"`);
            svg = svg.replace(this.maskSize.replaceHeight, style);
            return baseStr + window.btoa(svg);
        }
        return str;
    }
    private destroy() {
        this.cancelAnimation();
    }
}

export default DanmakuMask;
