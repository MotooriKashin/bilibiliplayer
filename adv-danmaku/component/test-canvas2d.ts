import Danmaku from './danmaku';

class TestCanvas2D {
    private container: HTMLElement;
    private canvas!: HTMLCanvasElement;
    [adv: string]: any;

    constructor(wrapper: HTMLElement) {
        this.container = wrapper;
    }

    test(danmaku: Danmaku) {
        const canvas = document.createElement('canvas');
        const ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
        canvas.width = this.container.offsetWidth;
        canvas.height = this.container.offsetHeight;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.background = 'transparent';
        canvas.style.zIndex = String(10 + danmaku.options.id);
        this.container && this.container.appendChild(canvas);
        this.canvas = canvas;
        this.render(danmaku, ctx);
        setTimeout(() => this.destroy(danmaku, canvas), danmaku.options.duration + 10);
    }

    private render(danmaku: Danmaku, ctx: CanvasRenderingContext2D) {
        this['adv_danmaku_test_' + danmaku.options.id] = window.requestAnimationFrame(() => {
            this.render(danmaku, ctx);
        });
        this.drawDanmaku(danmaku, ctx);
    }

    private drawDanmaku(danmaku: Danmaku, ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        danmaku.refresh(Date.now());
        danmaku.drawStatus &&
            ctx.drawImage(
                <HTMLCanvasElement>danmaku.img,
                danmaku.options.x - danmaku.options.offsetX,
                danmaku.options.y - danmaku.options.offsetY - 5,
            );
    }

    resize() {
        if (this.canvas) {
            this.canvas.width = this.container.offsetWidth;
            this.canvas.height = this.container.offsetHeight;
        }
    }

    destroy(danmaku: Danmaku, canvas: HTMLCanvasElement) {
        this.container.removeChild(canvas);
        window.cancelAnimationFrame(this['adv_danmaku_test_' + danmaku.options.id]);
    }
}

export default TestCanvas2D;
