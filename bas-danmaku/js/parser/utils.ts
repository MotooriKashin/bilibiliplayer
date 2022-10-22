import { htmlEncode } from "@shared/utils";

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

    htmlEncode,
};
