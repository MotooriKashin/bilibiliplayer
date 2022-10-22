import Popup, { IPoputBodyInterface } from '.';
import Render from './render';

interface IOptionsInterface {
    time: () => number;
    render: Render;
}

class Manager {
    options: IOptionsInterface;
    private popup: Popup;
    private render: Render;
    private current!: IPoputBodyInterface;
    shrinkState!: boolean;

    constructor(options: IOptionsInterface, popup: Popup) {
        this.options = options;
        this.popup = popup;
        this.render = options.render;

        // 组件的render方法，用来重绘ui
        (<any>this).render['render'] = () => {
            this.next();
        };

        window['requestAnimationFrame'](() => {
            this.frame();
        });
    }

    private frame() {
        window['requestAnimationFrame'](() => {
            this.frame();
        });
        if (!this.popup.paused) {
            this.next();
        }
    }

    next() {
        // dragable only in editor mode
        if ((!this.popup.dragable && !this.popup.options.visible) || !this.popup.data?.length) {
            return;
        }
        const time = this.options.time();
        if (this.current && this.current.to > time && this.current.from < time) {
            if (!this.render?.renderShrink(this.current, time) && this.shrinkState) {
                this.current = <any>null;
                this.shrinkState = false;
            }
            this.render?.renderCloseTime(this.current?.from, this.current?.to, time);
        }
        if (this.current && (this.current.to < time || this.current.from > time)) {
            this.wipe(this.current);
        }
        this.popup.data.some((card: IPoputBodyInterface) => {
            if (!this.current && card.from <= time && card.to > time) {
                this.current = card;
                if (this.render.renderShrink(card, time) && card.type === 9) {
                    this.shrinkState = true;
                    return;
                }
                this.draw(card);
                return true;
            }
        });
    }

    draw(sub: IPoputBodyInterface, disableFade?: boolean) {
        this.current = sub;
        this.render.draw(sub, disableFade);
    }

    wipe(sub: IPoputBodyInterface) {
        this.render.renderShrink(this.current, this.options.time());
        this.render.renderCloseShrink();
        if (this.render.wipe(sub)) {
            this.current = <any>null;
        }
    }

    refresh() {
        this.render.clear();
        this.current = <any>null;

        // resetIndex
        this.next();
    }

    clear() {
        this.render.clear();
        this.current = <any>null;
    }

    resize() {
        this.render.resize();
    }
    destroy() {
        this.clear();
    }
}

export default Manager;
