import JSZip from 'jszip';

import '../../css/upegg.less';

export interface IImg {
    length: number;
    [key: string]: any;
}
export interface IVideoSize {
    w: number;
    h: number;
    vw: number;
    vh: number;
}
interface IConfig {
    container: HTMLElement;
    ppx: string;
    visible?: boolean;
    ctime: () => number;
    getOptions: () => any;
    videoSize: () => IVideoSize;
}

export interface IUpEggDM {
    from: number;
    upEgg: {
        url?: string;
        text_img?: string;
        resource?: string;
        delay?: number;
        animation?: string;
        delays?: any;
    };
    [name: string]: any;
}

const NORMAL_WIDTH = 667;
export default class UpEggDM {
    private container: HTMLElement;
    private ppx: string;
    private list: IUpEggDM[] = [];
    private template!: {
        [key: string]: HTMLElement;
    };
    private config: Required<IConfig>;
    private hasData!: boolean;
    private card!: IUpEggDM;
    showAnimate: boolean = true;
    private btnSize = {
        padding: 64,
        areaW: 0,
        areaH: 0,

        left: 0,
        top: 0,
        width: 0,
        height: 0,

        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
    };
    dragFlag!: boolean;
    btn: any;
    player: any;
    diagonal!: number;
    private scale!: {
        /**
         * 位置缩放比例
         */
        scaleP: number;
        /**
         * 大小缩放比例
         */
        scaleS: number;
    };
    hideTimer: any;
    gifDataList!: any[];
    gifRenderTimer: any;
    gifRenderIndex: number = 0;
    private uiReady: boolean[] = [false, false];
    haltTime: number = 510; // gif 动画出入场停顿时间

    constructor(opt: IConfig) {
        this.container = opt.container;
        this.ppx = opt.ppx + '-upegg';
        this.config = {
            visible: true,
            ...opt,
        };
        this.init();
    }

    private init() {
        const ppx = this.ppx;
        const ctr = this.config.container;
        ctr.insertAdjacentHTML('beforeend', this.tpl());

        this.template = {
            wrap: ctr.querySelector(`.${ppx}-wrap`)!,
            upEgg: ctr.querySelector(`.${ppx}`)!,
            item: ctr.querySelector(`.${ppx}-item`)!,
            img: ctr.querySelector(`.${ppx}-img`)!,
            imgTxt: ctr.querySelector(`.${ppx}-img-txt`)!,
        };
        this.btn = this.template.upEgg;
        this.resize();
    }

    resize() {
        if (!this.getUIState()) return;
        this.scale = <any>null;
        this.btn.style.width = '';
        this.btn.style.height = '';
        this.btnSize.width = this.template.upEgg.offsetWidth;
        this.btnSize.height = this.template.upEgg.offsetHeight;
        this.btnSize.areaW = this.template.wrap.offsetWidth;
        this.btnSize.areaH = this.template.wrap.offsetHeight;
        this.diagonal = this.btnSize.areaW ** 2 + this.btnSize.areaH ** 2;

        let { scaleS } = this.getScale();
        const { width, height } = this.btnSize;
        const [leftPadding, topPadding] = [30, 120];
        const [playerWidth, playerHeight] = [this.container.offsetWidth, this.container.offsetHeight];
        let left = playerWidth - (width + leftPadding) * scaleS;
        let top = playerHeight - (height + topPadding) * scaleS;

        this.btnSize.left = left;
        this.btnSize.top = top;

        const [deviationLeft, deviationTop] = [(width * scaleS - width) / 2, (height * scaleS - height) / 2];
        // 2 和 3 时 upEgg 宽高不设置改设置xy坐标， 不然动画效果会乱掉
        const normalSize = ['2', '3'].indexOf(this.template.upEgg.dataset.animation!) > -1;
        if (normalSize) {
            left += deviationLeft;
            top += deviationTop;
        } else {
            this.btn.style.width = width * scaleS + 'px';
            this.btn.style.height = height * scaleS + 'px';
        }
        // 0 和 6 时 upEgg scaleS 应为1，防止重复放大
        const normalScale = ['0', '6'].indexOf(this.template.upEgg.dataset.animation!) > -1;
        this.btn.style.cssText += `transform: scale(${normalScale ? 1 : scaleS});
                left:${left}px;
                top:${top}px;
            `;
        this.template.item.style.transform = `scale(${scaleS}`;
        if (['3'].indexOf(this.template.upEgg.dataset.animation!) < 0) {
            this.template.item.style.transformOrigin = 'left top';
        } else {
            this.template.item.style.transformOrigin = '';
        }
    }
    getUIState() {
        return this.uiReady[0] && this.uiReady[1];
    }
    add(data: IUpEggDM[]) {
        data.map((d) => {
            this.list.push({
                from: d.stime,
                to: d.stime + 5,
                upEgg: d.upEgg,
            });
        });
        this.render();
    }
    delete() {
        this.list.length = 0;
        this.hide();
    }
    option(key: any, value: any): any {
        // 暂时不绑定弹幕开关
        return;
        if (!key) {
            return;
        }
        switch (key) {
            case 'visible':
                this.config.visible = value;
                if (value) {
                    this.render();
                } else {
                    this.hide();
                }
                break;
            default:
                break;
        }
    }
    private render() {
        this.timeUpdate(this.config.ctime());
    }

    timeUpdate(time: number) {
        if (!this.config.visible) {
            return;
        }
        for (let i = 0; i < this.list.length; i++) {
            const data = this.list[i];
            if (data.from <= time && time <= data.to) {
                if ((this.hasData && data === this.card) || data.isShow) {
                    continue;
                }
                data.isShow = true;
                this.card = data;
                this.uiReady = [false, false];
                this.gifDataList = [];
                this.template.upEgg.className = `${this.ppx}`;
                this.template.upEgg.dataset['type'] = this.card.upEgg.url!.split(':')[1];
                (<any>this).template.img['src'] = (<any>this).template.imgTxt['src'] = '';
                this.template.img.style.display = this.template.imgTxt.style.display = 'none';
                this.template.img.style.visibility = this.template.imgTxt.style.visibility = 'hidden';
                this.card.upEgg.delays = JSON.parse(decodeURIComponent(this.card.upEgg.delays || null));
                this.renderUI(this.getPicSrc(decodeURIComponent(this.card.upEgg.resource || '')));
                return;
            }
        }
        // this.hide();
    }
    renderUI(imgUrl: string) {
        if (this.template.upEgg.dataset.type === '1' && !imgUrl) return;
        const textImgUrl = this.card.upEgg.text_img || '';
        this.uiReady = [!imgUrl, !textImgUrl];
        this.template.img.dataset['text'] = Number(Boolean(textImgUrl)) + '';
        this.template.img.onload = () => {
            this.uiReady[0] = true;
            this.showUi();
        };
        (<any>this).template.img['src'] = imgUrl;
        this.template.img.style.display = imgUrl ? 'inline-block' : 'none';
        this.template.imgTxt.onload = () => {
            this.uiReady[1] = true;
            this.showUi();
        };
        (<any>this).template.imgTxt['src'] = decodeURIComponent(textImgUrl);
        this.template.imgTxt.style.display = textImgUrl ? 'inline-block' : 'none';
        this.template.upEgg.dataset['animation'] = this.card.upEgg.animation;
    }
    showUi() {
        if (this.getUIState()) {
            this.show();
            this.resize();
            clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(() => {
                this.hide();
            }, 5000);
        }
    }
    getPicSrc(url: string): any {
        url = url.replace('http://', '//');
        if (/.zip$/.test(url)) {
            // zip
            this.getZipData(url);
            return '';
        }
        return url;
    }
    private hide() {
        this.template.upEgg.classList.add(`${this.ppx}-hide`);
        this.hasData = false;
        clearInterval(this.hideTimer);
        clearInterval(this.gifRenderTimer);
    }
    private show() {
        this.template.img.style.visibility = 'visible';
        this.template.imgTxt.style.visibility = this.card.upEgg.text_img ? 'visible' : 'hidden';
        this.template.upEgg.classList.add(`${this.ppx}-show`);
        this.hasData = true;
    }
    private tpl() {
        const ppx = this.ppx;
        return `<div class="${ppx}-wrap">
            <div class="${ppx}">
                <div class="${ppx}-item">
                    <img class= "${ppx}-img-txt" />
                    <img class= "${ppx}-img" />
                </div>
            </div>
        </div>`;
    }
    dispose() {
        this.delete();
    }
    private getScale() {
        if (!this.scale) {
            let scaleS = 1;
            switch (true) {
                case this.diagonal < 500 * 500:
                    scaleS = 0.8;
                    break;
                case this.diagonal < 1000 * 1000:
                    scaleS = 1;
                    break;
                case this.diagonal < 1400 * 1400:
                    scaleS = 1.5;
                    break;
                default:
                    scaleS = 2;
                    break;
            }
            this.scale = this.scale || {
                scaleP: this.btnSize.areaW / NORMAL_WIDTH,
                scaleS,
            };
        }
        return this.scale;
    }

    getZipData(url: string): XMLHttpRequest {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            this.unzip(xhr['response']);
        };
        xhr.onerror = (error: any) => { };
        xhr.send();
        return xhr;
    }
    unzip(data: ArrayBuffer) {
        let jszip = new JSZip();
        return jszip.loadAsync(data).then((zip: JSZip) => {
            let startup = false;
            for (let key in zip.files) {
                // 判断是否是目录
                if (!zip.files[key].dir) {
                    const name = zip.files[key].name;
                    if (/\.(png|jpg|jpeg|gif)$/.test(name) && !/^__MACOSX/.test(name)) {
                        // 判断是否是图片格式
                        // 将图片转化为base64格式
                        const base = zip
                            .file(name)!
                            .async('base64')
                            .then((res: string) => {
                                const folder = name.split('/');
                                let last = folder.pop()!.split('.');
                                const key = last[0];
                                const type = last[1];
                                this.gifDataList[<any>key] = `data:image/${type};base64,${res}`;
                                if (this.gifDataList[0] && !startup) {
                                    startup = true;
                                    this.gifRenderIndex = 0;
                                    this.uiReady[0] = true;
                                    this.renderUI(this.gifDataList[0]);
                                    this.showUi();
                                    setTimeout(() => {
                                        this.rendGif();
                                    }, this.haltTime);
                                }
                            });
                    }
                }
            }
            return this.gifDataList;
        });
    }
    rendGif() {
        if (this.gifDataList.length <= this.gifRenderIndex) {
            this.gifRenderIndex = 0;
            setTimeout(() => {
                this.hide();
            }, this.haltTime);
            return;
        }
        (<any>this).template.img['src'] = this.gifDataList[this.gifRenderIndex++];
        this.gifRenderTimer = setTimeout(() => this.rendGif(), this.card.upEgg.delays[this.gifRenderIndex]);
    }
}
