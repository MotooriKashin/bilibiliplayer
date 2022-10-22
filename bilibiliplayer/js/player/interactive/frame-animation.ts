export interface IFAConfig {
    element: HTMLElement;
    repeat: boolean;

    colums: number;
    fps: number;
    item_count: number;
    item_height: number;
    item_width: number;
    source_pic: string;
    scale?: number;
    debug?: boolean;

    endCallback?: Function;
}

class FrameAnimation {
    private config: IFAConfig;
    private timer!: number;
    private index: number;
    constructor(config: IFAConfig) {
        this.config = config;
        config.element.style.backgroundColor = 'transparent';
        config.element.style.backgroundImage = `url(${config.source_pic})`;
        config.element.style.backgroundPositionX = '0px';
        config.element.style.backgroundPositionY = '0px';
        config.element.style.backgroundRepeat = 'repeat';
        config.element.style.width = `${config.item_width}px`;
        config.element.style.height = `${config.item_height}px`;
        if (config.scale) {
            config.element.style.transform = `scale(${config.scale})`;
            config.element.style.transformOrigin = `bottom left`;
        }
        this.index = 0;
    }

    start(index?: number) {
        this.timer && clearTimeout(this.timer);
        if (typeof index !== undefined && !isNaN(index!)) {
            this.index = index!;
        }

        const x = (this.index % this.config.colums) * this.config.item_width;
        const y = Math.floor(this.index / this.config.colums) * this.config.item_height;
        this.config.element.style.backgroundPositionX = -x + 'px';
        this.config.element.style.backgroundPositionY = -y + 'px';
        this.index++;
        this.index %= this.config.item_count;
        if (this.config.debug) {
            console.log(this.index, x, y);
        }
        if (this.index !== 0 || this.config.repeat) {
            this.timer = window['setTimeout'](() => {
                this.start(this.index);
            }, 1000 / this.config.fps);
        } else {
            if (typeof this.config.endCallback === 'function') {
                this.config.endCallback();
            }
            this.destroy();
        }
    }

    stop() {
        this.timer && clearTimeout(this.timer);
    }

    destroy() {
        this.timer && clearTimeout(this.timer);
        this.config.element.setAttribute('style', '');
        this.config.element.parentElement && this.config.element.parentElement.removeChild(this.config.element);
    }
}

export default FrameAnimation;
