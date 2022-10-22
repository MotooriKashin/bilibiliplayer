/**
 * Created by Hellcom on 2016/9/14.
 */

import BinaryArray from './binary_array';

import IDanmakuConfigExtInterface from '../interface/danmaku_config_ext';
import IRenderExtInterface from '../interface/render_ext';

class SpaceManager {
    public config: IDanmakuConfigExtInterface;
    public scroll: boolean | undefined;
    public lists: BinaryArray<IRenderExtInterface>[];

    constructor(config: IDanmakuConfigExtInterface, scroll?: boolean) {
        this.config = config;
        this.scroll = scroll;
        this.lists = [];
    }

    public clean(): void {
        this.lists = [];
    }

    public add(txt: IRenderExtInterface): void {
        if (this.scroll) {
            txt.x = txt.distance;
        } else {
            txt.x = (txt.distance - txt.dWidth) / 2;
        }
        if (
            txt.dHength >=
            txt.vDistance * (txt.textData!.vDanmaku ? 1 : this.config.preventShade ? 0.85 : 1) -
            (this.config.offsetTop || 0) -
            (this.config.offsetBottom || 0)
        ) {
            // 弹幕超出屏幕，不显示
            txt.setY(0, -1);
        } else {
            if (this.scroll) {
                txt._x = txt.getX();
            }
            this.setY(txt, 0);
        }
    }

    public remove(txt: IRenderExtInterface): void {
        if (txt.index !== -1 && this.lists[txt.index] !== undefined) {
            const list = this.lists[txt.index];
            list.bremove(txt);
        }
    }

    vCheck(y: number, txt: IRenderExtInterface, index: number) {
        const bottom = y + txt.dHength;
        let i: number;
        let item: IRenderExtInterface;
        if (this.scroll) {
            for (i = 0; i < this.lists[index].length; i++) {
                item = this.lists[index][i];
                if (!item) {
                    continue;
                }
                if (y < (this.config.offsetTop || 0)) {
                    return false;
                } else if (item.y > bottom || item.bottom < y) {
                    continue;
                } else if (item.end < txt.middle) {
                    if (item.getRight() < txt._x) {
                        continue;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        } else {
            for (i = 0; i < this.lists[index].length; i++) {
                item = this.lists[index][i];
                if ((item.y > bottom || item.bottom < y) && y >= (this.config.offsetTop || 0)) {
                    continue;
                } else {
                    return false;
                }
            }
        }
        /* console.log(this.lists); */
        return true;
    }

    setY(txt: IRenderExtInterface, index: number) {
        let top = this.config.offsetTop || 0;
        let special = false;
        if (typeof txt.textData!['offsetTop'] !== 'undefined') {
            special = true;
            top = txt.textData!['offsetTop'] || 0;
        }
        if (this.lists.length <= index) {
            this.lists.push(new BinaryArray());
        }
        const list = this.lists[index];
        if (list.length === 0) {
            txt.setY(top, index);
            list.push(txt);
            return;
        }
        if (this.vCheck(top, txt, index) || special) {
            txt.setY(top, index);
            this.insert(list, txt);
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item) {
                continue;
            }
            top = item.bottom + 1;
            if (
                this.config.danmakuArea &&
                txt.textData!.mode !== 6 &&
                txt.textData!.class < 1 &&
                !txt.textData!.border &&
                txt.textData!.attr !== 2
            ) {
                if (top > (txt.vDistance * this.config.danmakuArea) / 100) {
                    txt.rest = -1;
                    break;
                }
            }
            if (
                top + txt.dHength >
                txt.vDistance * (txt.textData!.vDanmaku ? 1 : this.config.preventShade ? 0.85 : 1) -
                (this.config.offsetBottom || 0)
            ) {
                break;
            }
            if (this.vCheck(top, txt, index)) {
                txt.setY(top, index);
                this.insert(list, txt);
                return;
            }
        }
        if (
            this.config.danmakuArea === 0 ||
            txt.textData!.mode === 6 ||
            txt.textData!.class >= 1 ||
            txt.textData!.border
        ) {
            this.setY(txt, index + 1);
        } else {
            txt.rest = -1;
        }
    }

    /* setY end */
    insert(list: BinaryArray<IRenderExtInterface>, txt: IRenderExtInterface) {
        /* binary insertion sort */
        list.binsert(txt, function (a: IRenderExtInterface, b: IRenderExtInterface) {
            if (!b || !a) {
                return 0;
            }
            return a.bottom - b.bottom;
        });
    }
}

export default SpaceManager;
