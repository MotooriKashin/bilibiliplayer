import Danmaku from './danmaku';

class TestCSS3 {
    private container: HTMLElement;
    [adv: string]: any;
    constructor(wrapper: HTMLElement) {
        this.container = wrapper;
    }

    test(danmaku: Danmaku) {
        const wrap = document.createElement('div');
        wrap.style.position = 'absolute';
        wrap.style.left = '0px';
        wrap.style.top = '0px';
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.background = 'transparent';
        wrap.style.zIndex = String(10 + danmaku.options.id);
        if (this.container) {
            this.container.appendChild(wrap);
        }
        this.render(danmaku, wrap);
        setTimeout(() => this.destroy(danmaku, wrap), danmaku.options.duration + 10);
    }

    private render(danmaku: Danmaku, wrap: HTMLElement) {
        this['adv_danmaku_test_' + danmaku.options.id] = window.requestAnimationFrame(() => {
            this.render(danmaku, wrap);
        });
        this.drawDanmaku(danmaku, wrap);
    }

    private drawDanmaku(danmaku: Danmaku, wrap: HTMLElement) {
        danmaku.refresh(Date.now());
        if (danmaku.drawStatus) {
            danmaku.img!.style.opacity = danmaku.options.cOpacity.toString();
            danmaku.innerCell.style.transform = danmaku.innerCell.style.webkitTransform = danmaku.createTransform(
                danmaku.options.x,
                danmaku.options.y,
                danmaku.options.yRotate,
                danmaku.options.zRotate,
            );
            wrap.appendChild(danmaku.img!);
        }
    }

    resize() { }

    destroy(danmaku: Danmaku, wrap: HTMLElement) {
        this.container.removeChild(wrap);
        window.cancelAnimationFrame(this['adv_danmaku_test_' + danmaku.options.id]);
    }
}

export default TestCSS3;
