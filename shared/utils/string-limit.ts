export function stringLimit(str: string, limit = 14) {
    if (!str) {
        return '';
    }
    let charCount = 0;
    let splitLength = limit;
    for (let i = 0; i < str.length; i++) {
        const c = str.charAt(i);
        const flag = /^[\u0020-\uooff]$/.test(c);
        if (flag) {
            // 英文
            charCount += 0.5;
            splitLength += 0.5;
        } else {
            // 中文
            charCount += 1;
        }
    }
    if (charCount > limit) {
        return str.substring(0, splitLength) + '...';
    }
    return str;
}
