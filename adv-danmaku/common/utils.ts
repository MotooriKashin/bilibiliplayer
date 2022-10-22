class Utils {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
     */
    static assign(target: any, ...rest: any[]): any {
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        const to = Object(target);
        for (let i = 0; i < rest.length; i++) {
            const nextSource = rest[i];
            if (nextSource != null) {
                // Skip over if undefined or null
                for (const nextKey in nextSource) {
                    // Avoid bugs when hasOwnProperty is shadowed
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    }

    /**
     * 数字到颜色
     */
    static colorFromInt(value: number): string {
        return '#' + ('00000' + value.toString(16)).slice(-6);
    }
}

export default Utils;
