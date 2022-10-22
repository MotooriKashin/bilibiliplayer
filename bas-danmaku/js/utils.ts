import { browser, htmlEncode } from "@shared/utils";

export default {
    extend: (child: any, parent: any) => {
        const cp: any = {};
        for (const k in child) {
            if (child.hasOwnProperty(k)) {
                cp[k] = child[k];
            }
        }
        for (const k in parent) {
            if (parent.hasOwnProperty(k)) {
                cp[k] = parent[k];
            }
        }

        return cp;
    },

    escapeSpecialChars: (jsonString: string) => {
        return jsonString.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\f/g, '\\f');
    },

    nowTime: () => {
        return performance ? performance.now() : +new Date();
    },

    string2DOM: (str: string) => {
        return $(str)[0];
        // return new DOMParser().parseFromString(string, 'text/html').body.firstChild;
    },

    colorFromInt: function (value: number) {
        return '#' + ('00000' + value.toString(16)).slice(-6);
    },

    rgbaFormat: function (color: number, opacity: number) {
        const rgb = ('00000' + color.toString(16)).slice(-6);
        return `rgba(${parseInt(rgb.slice(0, 2), 16)},${parseInt(rgb.slice(2, 4), 16)},${parseInt(
            rgb.slice(4, 6),
            16,
        )},${opacity})`;
    },

    htmlEncode,

    browser
};
