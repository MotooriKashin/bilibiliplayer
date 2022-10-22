import { IConfig, IData } from '../index';
// @ts-ignore
import GIF from '../plugins/gif';

export default class Screen {
    config: Required<IConfig>;
    data: IData;
    constructor(config: Required<IConfig>, data: IData) {
        this.config = config;
        this.data = data;

        this.init();
    }

    private init() {
        if (this.config.isPNG) {
            this.screen();
        } else {
            this.loadGif();
        }
    }

    private screen() {
        let screenCanvas;
        if (this.config.fixedSize) {
            screenCanvas = this.fixedScreenShot(this.config.isPNG);
        } else {
            screenCanvas = this.screenShot(this.config.isPNG);
        }
        this.data.code = 200;
        this.data.message = '';
        this.data.result = screenCanvas.toDataURL('image/png');
        this.config.result(this.data);
    }

    private screenShot(isPNG: number) {
        const rate = this.config.rate;
        const pWidth = this.config.width * rate;
        const pHeight = this.config.height * rate;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.setAttribute('width', pWidth + 'px');
        canvas.setAttribute('height', pHeight + 'px');

        for (let i = 0, len = this.config.wrappers.length; i < len; i++) {
            const element = this.config.wrappers[i];
            const wrapper = element.dom;
            const width = element.width * rate;
            const height = element.height * rate;
            const dx = element.margin[1] * rate;
            const dy = element.margin[0] * rate;
            let x = dx;
            let y = dy;
            let w = width;
            let h = height;

            if (i === 0) {
                context.fillStyle = this.config.background;
                context.fillRect(0, 0, pWidth, pHeight);
            }
            if (element.isVideo) {
                const vWidth = wrapper.videoWidth * rate;
                const vHeight = wrapper.videoHeight * rate;

                if (width / height > vWidth / vHeight) {
                    w = (vWidth * height) / vHeight;
                    x += (width - w) * 0.5;
                } else {
                    h = (vHeight * width) / vWidth;
                    y += (height - h) * 0.5;
                }
                context.drawImage(wrapper, x, y, w, h);
            } else if (element.dmType === 'div' && isPNG) {
                element.dmLayer && context.drawImage(element.dmLayer, dx, dy, pWidth, pHeight);
            } else {
                wrapper && context.drawImage(wrapper, dx, dy, pWidth, pHeight);
            }
        }
        return canvas;
    }

    private fixedScreenShot(isPNG: number) {
        const pWidth = this.config.width!;
        const pHeight = this.config.height!;
        const imgWidth = this.config.imgWidth!;
        const imgHeight = this.config.imgHeight!;
        const canvas = document.createElement('canvas')!;
        const context = canvas.getContext('2d')!;
        canvas.setAttribute('width', imgWidth + 'px');
        canvas.setAttribute('height', imgHeight + 'px');
        for (let i = 0, len = this.config.wrappers.length; i < len; i++) {
            const element = this.config.wrappers[i];
            const wrapper = element.dom;
            const width = element.width;
            const height = element.height;
            let x = element.margin[1];
            let y = element.margin[0];
            let ratio = imgWidth / pWidth;
            let w = width;
            let h = height;
            let dx = 0;
            let dy = 0;
            let dw = pWidth;
            let dh = pHeight;

            if (i === 0) {
                context.fillStyle = this.config.background;
                context.fillRect(0, 0, imgWidth, imgHeight);
            }
            if (imgWidth / imgHeight > pWidth / pHeight) {
                dh = (imgHeight * pWidth) / imgWidth;
                dy = 0;
            } else {
                ratio = imgHeight / pHeight;
                dw = (imgWidth * pHeight) / imgHeight;
                dx = (pWidth - dw) * 0.5;
            }
            if (element.isVideo) {
                const vWidth = wrapper.videoWidth;
                const vHeight = wrapper.videoHeight;
                if (imgWidth / imgHeight > vWidth / vHeight) {
                    y *= ratio;
                    h = imgHeight - y * 2;
                    w = (vWidth * h) / vHeight;
                    x = x * ratio + (imgWidth - w) * 0.5;
                } else {
                    x *= ratio;
                    w = imgWidth - x * 2;
                    h = (vHeight * w) / vWidth;
                    y = y * ratio + (imgHeight - h) * 0.5;
                }
                context.drawImage(wrapper, 0, 0, vWidth, vHeight, x, y, w, h);
            } else if (element.dmType === 'div' && isPNG) {
                const screen = element.dmLayer;
                const scale = screen && screen.width / pWidth;
                scale &&
                    context.drawImage(
                        screen,
                        dx * scale,
                        dy * scale,
                        dw * scale,
                        dh * scale,
                        0,
                        0,
                        imgWidth,
                        imgHeight,
                    );
            } else {
                const scale = wrapper && wrapper.width / pWidth;
                scale &&
                    context.drawImage(
                        wrapper,
                        dx * scale,
                        dy * scale,
                        dw * scale,
                        dh * scale,
                        0,
                        0,
                        imgWidth,
                        imgHeight,
                    );
            }
        }
        return canvas;
    }

    private loadGif() {
        const stime = +new Date();
        const danmakuArray: any[] = [];
        let screenCanvas;
        let width = this.config.width * this.config.rate;
        let height = this.config.height * this.config.rate;
        let perCent = 0;

        if (this.config.fixedSize) {
            width = this.config.imgWidth;
            height = this.config.imgHeight;
        }
        const nextFrame = () => {
            if (+new Date() > this.config.time + stime + 10) {
                this.drawGif(danmakuArray, width, height, perCent);
            } else {
                setTimeout(() => {
                    nextFrame();
                }, 1000 / this.config.fps);
                if (this.config.fixedSize) {
                    screenCanvas = this.fixedScreenShot(this.config.isPNG);
                } else {
                    screenCanvas = this.screenShot(this.config.isPNG);
                }
                if (screenCanvas) danmakuArray.push(screenCanvas);
                perCent = (danmakuArray.length * 20) / this.config.time;
                this.config.rendering(perCent);
            }
        };
        setTimeout(() => {
            nextFrame();
        }, 10);
    }

    private drawGif(danmakuArray: any[], width: number, height: number, perCent: number) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const len = danmakuArray.length;
        // @ts-ignore
        const encoder = new GIF({
            workers: 4,
            quality: this.config.quality,
            width,
            height,
        });
        canvas.setAttribute('width', width + 'px');
        canvas.setAttribute('height', height + 'px');
        for (let i = 0; i < len; i += 1) {
            context.drawImage(danmakuArray[i], 0, 0, width, height);
            encoder.addFrame(context, { delay: 1000 / this.config.fps, copy: true });
            context.clearRect(0, 0, width, height);
        }
        encoder.on('finished', (blob: any) => {
            encoder.abort();
            this.data.code = 200;
            this.data.message = '';
            this.data.result = URL.createObjectURL(blob);
            this.config.result(this.data);
        });
        encoder.on('progress', (per: number) => {
            this.config.rendering(perCent + (1 - perCent) * per);
        });
        encoder.render();
    }
}
