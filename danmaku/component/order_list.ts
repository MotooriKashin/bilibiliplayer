/**
 * Created by Hellcom on 2016/9/14.
 */

import BinaryArray from './binary_array';

import FnCompareCustomInterface from '../interface/fn_compare_custom';
import BinaryItemInterface from '../interface/binary_item';
import AnyObject from '../interface/any_object';

class OrderList extends BinaryArray<any> {
    private fnCompare: FnCompareCustomInterface;

    constructor(fnCompare?: FnCompareCustomInterface) {
        super();
        (<AnyObject>Object).setPrototypeOf(this, OrderList.prototype);
        this.fnCompare = fnCompare || OrderList.fnCompareDefault;
    }

    private static fnCompareDefault(a: any, b: any): number {
        return a.stime - b.stime;
    }

    /**
     * 插入一个项目：并且维护一个指向特定元素的指针
     */
    public insert(...args: BinaryItemInterface[]): this {
        let i = 0;

        while (i < args.length) {
            this.binsert(args[i], this.fnCompare);
            i++;
        }

        return this;
    }

    /**
     * 尝试移除一个元素：利用有序的条件优化搜索
     */
    public remove(a: BinaryItemInterface): boolean {
        let index: number = this.bsearch(a, this.fnCompare);

        while (index >= 0) {
            if (this[index] === a) {
                this.splice(index, 1);
                return true;
            }
            index--;
        }

        return false;
    }

    /**
     * 取得一定范围内的所有元素，对于相等的元素，取后不取前（包含与第二个相等的元素，不包含与第一个元素相等的元素）
     */
    public getItemsByRange(startItem: AnyObject, endItem: AnyObject): BinaryItemInterface[] {
        let startIndex: number = this.bsearch(startItem, this.fnCompare);
        let endIndex: number = this.bsearch(endItem, this.fnCompare);
        return this.getItemsByIndexRange(startIndex, endIndex);
    }

    /**
     * 获得一个范围内的元素列表，返回有序的范围内的列表，取前不取后
     */
    public getItemsByIndexRange(startIndex: number, endIndex: number): BinaryItemInterface[] {
        let output: BinaryItemInterface[] = [];
        if (endIndex <= startIndex) return output;

        while (startIndex < endIndex && startIndex < this.length) {
            output.push(this[startIndex]);
            startIndex++;
        }

        return output;
    }
}

export default OrderList;
