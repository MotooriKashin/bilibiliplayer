export function htmlEncode(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2f;')
        .replace(/\n/g, '<br>');
}
export function formatText(str: string): string {
    const list = str.split('');
    let byteLen = 0;
    let text = '';
    for (let i = 0; i < str.length; i++) {
        if (byteLen > 12) {
            text += '...';
            break;
        }
        if (list[i].charCodeAt(0) > 255) {
            byteLen += 2;
        } else {
            byteLen++;
        }
        text += list[i];
    }
    return text;
}
