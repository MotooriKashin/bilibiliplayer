/**
 * Created by Hellcom on 2016/9/13.
 */

export interface ISortObj {
    stime: number;
    [key: string]: any;
}

export type FnCompareInterface = (a: ISortObj, b: ISortObj) => number;

export function sortFn(a: ISortObj, b: ISortObj): number {
    return a.stime - b.stime;
}
export class BinaryArray<T extends { stime: number }> extends Array<T> {
    constructor() {
        super();
        Object.setPrototypeOf(this, BinaryArray.prototype);
        this.length = 0;
    }

    /**
     * binary search in array @param a{*} @param fn{Function}, compare function, takes two parameters,
     * first is a, second is the item in array, returns a positivem number if a yields precedence to
     * item @return {int} the index where a should be inserted
     */
    public bsearch(a: T, fn: FnCompareInterface): number {
        if (this.length === 0) return 0;
        if (fn(a, this[0]) < 0) return 0;
        if (fn(a, this[this.length - 1]) >= 0) return this.length;

        let low = 0;
        let hig: number = this.length - 1;
        let count = 0;
        let i: number;

        while (low <= hig) {
            i = Math.floor((low + hig + 1) / 2);
            count++;

            if (fn(a, this[i - 1]) >= 0 && fn(a, this[i]) < 0) {
                return i;
            } else if (fn(a, this[i - 1]) < 0) {
                hig = i - 1;
            } else if (fn(a, this[i]) >= 0) {
                low = i;
            } else {
                // 试图在一个无序的列表中使用二分查找法会进入这种情况
                window.console.error('Catch an ERROR');
            }

            if (count > 1000) {
                // 试图在一个无序的列表中使用二分查找法会进入这种情况
                window.console.error('1000');
                break;
            }
        }

        return -1;
    }

    public binsert(a: T, fn: FnCompareInterface): number {
        let i: number = this.bsearch(a, fn);
        this.splice(i, 0, a);
        return i;
    }

    public cinsert(a: T, fn: FnCompareInterface): number {
        let i: number = this.bsearch(a, fn);
        if (this[i - 1]?.stime === a.stime) {
            this[i - 1] = a;
        } else if (this[i]?.stime === a.stime) {
            this[i] = a;
        } else {
            this.splice(i, 0, a);
        }
        return i;
    }

    public bremove(a: T): void {
        for (let i = 0; i < this.length; i++) {
            if (this[i] === a) {
                this.splice(i, 1);
                return;
            }
        }
    }
}
