import { loadZipBuffer, unzip } from '../unzip';

import '../../css/selfegg.less';

export class SelfEgg {
    private cardFold: any = {};
    private duration = 5000;
    private len = 0;
    private start = 0;
    private img!: HTMLImageElement;
    private animateTimer!: number;

    constructor(private container: HTMLElement, private url: string) {
        this.cardFold[url] = this.load(url);
    }

    show(url?: string) {
        const src = url || this.url;
        if (src && !this.cardFold[src]) {
            this.cardFold[src] = this.load(src);
        }

        this.cardFold[src]
            .then((fold: any) => {
                if (!this.img) {
                    this.img = document.createElement('img');
                    this.container.appendChild(this.img);
                }
                this.start = performance.now();
                this.len = fold.self_egg_within_limits?.length;
                if (this.len) {
                    this.draw(fold.self_egg_within_limits, this.start);
                }
            })
            .catch((err: any) => {
                this.cardFold[src] = null;
            });
    }
    private draw(list: { [key: string]: string }, t: number) {
        if (!this.start) {
            this.start = t;
        }
        const delta = (t - this.start) / this.duration;
        if (delta > 1) {
            this.clear();
            return;
        }

        const pos = Math.floor(this.len * delta);
        const src = list[pos];
        if (src) {
            this.img.src = src;
        }

        this.animateTimer = window.requestAnimationFrame((t) => {
            this.draw(list, t);
        });
    }
    private load(src: string) {
        return loadZipBuffer(src).then((data) => {
            return unzip(data);
        });
    }

    clear() {
        this.img = <any>null;
        this.container.innerHTML = '';
        this.animateTimer && window.cancelAnimationFrame(this.animateTimer);
    }
}
