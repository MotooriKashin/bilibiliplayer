import Utils from '../../common/utils';
import Manager from './manager';
import CanvasRender from '../render/canvas-render';

import Danmaku from '../../danmaku';
import ITextDataInterface from '../../interface/text_data';

class CanvasManager extends Manager {
    private paused: boolean;

    constructor(danmaku: Danmaku) {
        super(danmaku);
        this.paused = false;
    }

    getText(danmaku: ITextDataInterface, precise: number) {
        if (this.config.verticalDanmaku && (danmaku.mode === 1 || danmaku.mode === 6 || danmaku.mode === <any>'x')) {
            danmaku.vDanmaku = true;
        } else {
            danmaku.vDanmaku = false;
        }
        return new CanvasRender(danmaku, this.config, precise ? precise - danmaku.stime : 0);
    }

    resize(show?: boolean) {
        const h = show ? 0 : ((<any>this.container).offsetHeight || 420) * this.config.devicePR - this.config.height;
        const w = show ? 0 : ((<any>this.container).offsetWidth || 680) * this.config.devicePR - this.config.width;
        this.config.width = ((<any>this.container).offsetWidth || 680) * this.config.devicePR;
        this.config.height = ((<any>this.container).offsetHeight || 420) * this.config.devicePR;
        if (
            this.container &&
            ((<any>this.container).width !== this.config.width || (<any>this.container).height !== this.config.height)
        ) {
            (<any>this.container).width = this.config.width;
            (<any>this.container).height = this.config.height;
            // if (super.isPause()) {
            //     this.fresh(w, h);
            // }
            this.fresh(w, h);
        }
    }

    beforeRender(paused: boolean) {
        if (this.paused && !paused) {
            this.paused = paused;
            return true;
        }
        this.paused = paused;
        (<any>this.container).getContext('2d').clearRect(0, 0, this.config.width, this.config.height);
    }

    afterRender() {
        // Safari 强制重绘
        if (Utils.browser.version.safari) {
            this.container.style['webkitUserSelect'] =
                this.container.style['webkitUserSelect'] === 'initial' ? 'none' : 'initial';
        }
    }

    fresh(w?: number, h?: number) {
        let i: number;
        for (i = 0; i < this.visualArray.length; i++) {
            if (!this.config.danmakuFilter(this.visualArray[i].textData!) && !this.visualArray[i].textData?.likes) {
                this.visualArray[i].hide();
            } else {
                this.visualArray[i].show();
            }
        }
        (<any>this.container).getContext('2d').clearRect(0, 0, this.config.width, this.config.height);
        for (i = 0; i < this.visualArray.length; i++) {
            const text = this.visualArray[i];
            if ((<any>text).element?.visibility !== 'hidden') {
                if (w || h) {
                    if (text.textData?.mode === 4) {
                        text.x = text._x += w! / 2;
                        text._y += h!;
                    } else if (text.textData?.mode === 5) {
                        text.x = text._x += w! / 2;
                    }
                }
                // text.render(text._x, text._y, this.config.width, null, true);
                text.render(text._x, text._y, true);
            }
        }
    }

    clearVisualList() {
        while (this.visualArray.length) {
            super.end(this.visualArray[0]);
        }
        while (this.hideList.length) {
            super.endHide(this.hideList.shift()!.text);
        }
        this.lastTime = -3;
        this.fresh();
    }

    init() {
        this.container = this.config.container;
        this.opacityHack();
    }

    option(key: string, value: any) {
        (<any>this).config[key] = value;
        this.opacityHack();
    }

    // firefox49 hack
    opacityHack() {
        const ua = navigator.userAgent;
        if (/Gecko/i.test(ua) && !/KHTML/i.test(ua) && !/Trident/i.test(ua) && ua.indexOf('49.0') > -1) {
            (<any>this.container).style['opacity'] = this.config.opacity;
        }
    }
}

export default CanvasManager;
