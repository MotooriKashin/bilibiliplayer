import Player from '../../player';
import { IViewPoint } from '../user';

export class HotSpot {
    static instances: { [type: number]: HotSpot } = {};

    private durationTimer!: number;
    private duration!: number;
    private prefix: string;
    private container!: JQuery;
    private list: IViewPoint[] = [];
    private computedList: IViewPoint[] = [];

    private constructor(private player: Player, private type: number, private parentContainer: HTMLElement) {
        this.prefix = this.player.prefix;
    }

    static getInstance(player: Player, type: number, parentContainer: HTMLElement) {
        // ignore non-text type. -1: 类高能看点的读书笔记; 1: 高能看点文本类型; 2:视频分段; 0: Unknown
        if (!HotSpot.instances[type]) {
            HotSpot.instances[type] = new HotSpot(player, type, parentContainer);
        }
        return HotSpot.instances[type];
    }

    static getTopViewPointContent(value: number) {
        let keys = Object.keys(HotSpot.instances).sort((prev, next) => +next - +prev);
        for (let key of keys) {
            let instance: HotSpot = HotSpot.instances[<any>key];
            let result = instance.getViewPointContent(value);
            if (result.isHit) {
                return result;
            }
        }

        return { isHit: false, value: '', type: 0 };
    }

    static getType(list: IViewPoint[]) {
        let type = 0;
        let first = list[0];
        if (first && first.type) {
            type = first.type;
        }
        return type;
    }

    static destroy() {
        HotSpot.instances = {};
    }

    private createSubContainer() {
        if (!this.container) {
            this.container = $('<div>');
            this.container.addClass(`${this.prefix}-view-points`);
            this.container.attr('data-type', this.type);
            $(this.parentContainer)
                .find('.bpui-bar-wrap') // Hard code
                .append(this.container);
        }
    }
    private getDuration() {
        this.duration = this.player.duration() || 0;
    }
    private beforeCreate() {
        this.durationTimer = window.setTimeout(() => {
            this.getDuration();
            if (this.duration) {
                this.render(this.list);
            } else {
                this.beforeCreate();
            }
        }, 100);
    }

    render(list: IViewPoint[]) {
        if (!Array.isArray(list)) return false;
        if (this.type !== 1 && this.type !== -1) return false;
        if (this.player.extraParams && this.player.extraParams.isPreview) return false;
        this.list = list;
        this.getDuration();
        if (!this.duration) {
            this.beforeCreate();
            return false;
        }
        this.createSubContainer();
        this.computedList = [];

        const points: JQuery[] = [];

        list.forEach((item: IViewPoint) => {
            const result = this.getViewPointUsedValue(item);
            if (result) {
                this.computedList.push(result);
                points.push($(`<span style="left:${result.left}px;width:${result.width}px"></span>`));
            }
        });
        // Should implement CURD, but not just empty.
        this.container.empty().append(...points);
        return true;
    }

    private getViewPointUsedValue(item: IViewPoint) {
        const r = { left: 0, width: 0, type: item.type, from: item.from, to: item.to, content: item.content };
        const w = this.container.width();
        const minW = 6;
        const duration = this.player.duration();
        const getWidthFromDuration = (d: number) => (d / duration!) * w!;
        const getDurationFromWidth = (l: number) => (l / w!) * duration!;
        const computedW = getWidthFromDuration(item.to - item.from);
        r.width = Math.floor(Math.max(computedW, minW));
        if (computedW < minW) {
            const startW = getWidthFromDuration(r.from);
            if (startW + r.width > w!) {
                const offset = w! - (startW + r.width);
                const offsetDuration = getDurationFromWidth(offset);
                r.from += offsetDuration;
            }
        }
        r.to = r.from + getDurationFromWidth(r.width);
        r.left = Math.floor(getWidthFromDuration(r.from));
        return r;
    }

    private getViewPointContent(value: number) {
        let result = { isHit: false, value: '', type: 0 };
        for (let i = 0; i < this.computedList.length; i++) {
            const item = this.computedList[i];
            if (value >= item.from && value <= item.to) {
                result.isHit = true;
                result.value = item.content;
                result.type = item.type;
                break;
            }
        }
        return result;
    }

    resize() {
        this.render(this.list);
    }
}
