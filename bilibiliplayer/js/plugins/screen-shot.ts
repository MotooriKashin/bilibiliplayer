import ScreenShot from '@jsc/screenshot';
import Player from '../player';

interface ITypeInterface {
    dmType: string; // 弹幕类型
    advType?: string; // 高级弹幕类型
}

interface IDataInterface {
    code: number; // 200:成功
    result: string; // 数据 dataUrl
    message: string; // 提示信息
}

interface IConfigInterface {
    wrappers?: any[]; // 所有截图容器
    width?: number; // 容器宽
    height?: number; // 容器高
    background?: string; // 背景颜色
    rate?: number; // 比例
    fixedSize?: boolean; // 是否固定尺寸
    imgWidth?: number; // 固定尺寸宽px
    imgHeight?: number; // 固定尺寸高px
    quality?: number; // gif画质 越小越高
    isPNG?: number; // 1:截图  0: 截gif
    fps?: number; // gif每秒多少帧
    time?: number; // gif 时间
    name?: string; // 截图名
    rendering?: (render: number) => void; // gif过程回调
    result?: (data: IDataInterface) => void; // 结束回调
}

class ScreenSHOT {
    private player: Player;
    private dm: HTMLElement;
    private wrap: JQuery;
    private vid: JQuery<HTMLVideoElement>;
    private advdm: JQuery;
    private type2: ITypeInterface;
    private advType: string;
    private config: IConfigInterface;
    private name: string;

    constructor(conf: IConfigInterface, player: Player) {
        this.player = player;
        this.advType = this.player.setting['config']['type'];
        this.dm = player.danmaku.danmaku.config.container;
        this.wrap = player.template.videoWrp;
        this.vid = this.wrap.find('video');
        this.advdm = player.advDanmaku.container;
        this.type2 = {
            dmType: player.videoSettings['setting_config'].type,
            advType: player.setting['config']['type']['toLowerCase'](),
        };
        this.config = {
            wrappers: [
                {
                    dom: this.vid[0],
                    width: this.vid[0].offsetWidth,
                    height: this.vid[0].offsetHeight,
                    margin: [10, 10],
                    isVideo: true,
                },
            ],
            width: this.wrap[0].offsetWidth,
            height: this.wrap[0].offsetHeight,
            background: conf.background,
            rate: conf.rate,
            fixedSize: conf.fixedSize,
            imgWidth: conf.imgWidth,
            imgHeight: conf.imgHeight,
            isPNG: conf.isPNG,
            quality: conf.quality,
        };
        this.name = conf.name || '';

        this.init(conf);
    }

    init(conf: IConfigInterface) {
        if (conf.isPNG) {
            if (this.type2.advType === 'canvas') {
                const wrap = this.player.advDanmaku.container.find('canvas');
                this.advdm = wrap.length > 0 ? wrap : this.advdm;
            }
            this.config.wrappers!.push(
                {
                    dom: this.advdm[0],
                    dmLayer: this.type2.advType === 'div' ? this.player.advDanmaku.exportDanmaku() : null,
                    width: this.advdm[0].offsetWidth,
                    height: this.advdm[0].offsetHeight,
                    margin: [0, 0],
                    isVideo: false,
                    dmType: this.type2.advType,
                },
                {
                    dom: this.dm,
                    dmLayer: this.type2.dmType === 'div' ? this.player.danmaku.danmaku.exportDanmaku() : null,
                    width: this.dm.offsetWidth,
                    height: this.dm.offsetHeight,
                    margin: [0, 0],
                    isVideo: false,
                    dmType: this.type2.dmType,
                },
            );
            this.config.result = (data: IDataInterface) => {
                // 结果
                if (data.code === 200) {
                    this.download(data.result, this.randomName(10) + '.png');
                }
            };
            const png = new ScreenShot(this.config);
        } else {
            if (this.player.danmaku.danmaku.danmakuType('canvas') === 'canvas') {
                if (this.player.advDanmaku.danmakuType('canvas') === 'canvas') {
                    this.advdm = this.player.advDanmaku.container.find('canvas');
                    this.config.wrappers!.push({
                        dom: this.advdm[0],
                        width: this.advdm[0].offsetWidth,
                        height: this.advdm[0].offsetHeight,
                        margin: [0, 0],
                        isVideo: false,
                    });
                }
                this.dm = this.player.danmaku.danmaku.config.container;
                this.config.wrappers!.push({
                    dom: this.dm,
                    width: this.dm.offsetWidth,
                    height: this.dm.offsetHeight,
                    margin: [0, 0],
                    isVideo: false,
                });
                this.config.fps = conf.fps; // 每秒多少帧
                this.config.time = conf.time; // gif总时间(ms)
                this.config.rendering = (render: number) => {
                    // 过程
                };
                this.config.result = (data: IDataInterface) => {
                    // 结果
                    if (data.code === 200) {
                        this.download(data.result, this.randomName(10) + '.gif');
                    } else {
                    }
                    if (this.type2.dmType === 'div') {
                        this.player.danmaku.danmaku.danmakuType('div');
                    }
                    if (this.type2.advType === 'div') {
                        this.player.advDanmaku.danmakuType('div');
                    }
                };
                const gif = new ScreenShot(this.config);
            }
        }
    }

    private randomName(num: number) {
        let i;
        let c = '';
        const b = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (i = 0; i < num; i += 1) {
            c += b.charAt(Math.floor(Math.random() * b.length));
        }
        c = `${this.name || c}-${new Date().toLocaleString()}`;
        return c;
    }

    private download(src: string, filename?: string) {
        const name = filename || 'download.gif';
        const templink = document.createElement('a');
        templink.download = name;
        templink.href = src;
        templink.click();
    }
}

export default ScreenSHOT;
