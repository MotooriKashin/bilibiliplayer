import Subtitle, { SubtitleDataInterface, SubtitleBodyInterface } from '.';
import Render from './render';
import STATE from '../state';

interface IOptionsInterface {
    time: () => number;
    render: Render;
    group: number;
}

export interface ISubtitleItemInterface extends SubtitleBodyInterface {
    ele?: JQuery;
}

class Manager {
    showing: ISubtitleItemInterface[] = []; // 当前展示的字幕
    options: IOptionsInterface;
    private subtitle: Subtitle;
    private subtitleItems: ISubtitleItemInterface[] = []; // 所有字幕数据
    private index: number;
    private render: Render;

    constructor(options: IOptionsInterface, subtitle: Subtitle) {
        this.options = options;
        this.subtitle = subtitle;
        this.render = options.render;
        this.showing = [];
        this.index = 0;

        window['requestAnimationFrame'](() => {
            this.frame();
        });
    }

    private frame() {
        window['requestAnimationFrame'](() => {
            this.frame();
        });
        if (!this.subtitle.paused && this.subtitle.visibleStatus && this.subtitleItems.length) {
            const time = this.options.time();
            let current = this.subtitleItems[this.index];
            for (let i = 0; i < this.showing.length; i++) {
                if (this.showing[i].to! < time) {
                    this.wipe(this.showing[i]);
                }
            }
            while (current && current.from! <= time) {
                if (current.to! > time) {
                    this.draw(current);
                }
                this.index++;
                current = this.subtitleItems[this.index];
            }
        }
    }

    draw(sub: ISubtitleItemInterface) {
        this.showing.push(sub);
        this.render.draw(sub, this.options.group);
        this.render.subtitleChange();

        this.subtitle.player.trigger(STATE.EVENT.VIDEO_SUBTITLE_CHANGE);
    }

    wipe(sub: ISubtitleItemInterface, canFade = true) {
        const index = this.showing.indexOf(sub);
        if (index > -1) {
            this.showing.splice(index, 1);
            this.render.wipe(sub, canFade);
            this.subtitle.player.trigger(STATE.EVENT.VIDEO_SUBTITLE_CHANGE);
        }
    }

    refresh() {
        this.render.clear(this.options.group);
        this.showing = [];

        this.subtitle.player.trigger(STATE.EVENT.VIDEO_SUBTITLE_CHANGE);

        // resetIndex
        this.index = this.subtitleItems.length;
        for (let i = 0; i < this.subtitleItems.length; i++) {
            if (this.options.time() <= this.subtitleItems[i].from!) {
                this.index = i;
                break;
            }
        }

        for (let i = 0; i < this.index; i++) {
            const time = this.options.time();
            if (this.subtitleItems[i].from! <= time && this.subtitleItems[i].to! > time) {
                this.draw(this.subtitleItems[i]);
            }
        }
    }

    update(data: SubtitleDataInterface) {
        this.subtitleItems = data.body;
        this.refresh();
    }

    clear() {
        this.render.clear(this.options.group);
        this.subtitleItems = [];
        this.showing = [];

        this.subtitle.player.trigger(STATE.EVENT.VIDEO_SUBTITLE_CHANGE);
    }

    resize() {
        this.render.resize();
    }
    destroy() {
        this.clear();
    }
}

export default Manager;
