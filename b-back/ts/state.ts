export const tabList = [
    {
        value: 300,
        title: '播放卡顿',
    },
    {
        value: 304,
        title: '出现浮窗广告',
    },
    {
        value: 301,
        title: '进度条君无法调戏',
    },
    {
        value: 305,
        title: '无限小电视',
    },
    {
        value: 354,
        title: '校园网无法访问',
    },
    {
        value: 302,
        title: '音画不同步',
    },
    {
        value: 303,
        title: '弹幕无法显示',
    },
    {
        value: 306,
        title: '黑屏',
    },
    {
        value: 553,
        title: '跳过首尾时间有误',
    },
    {
        value: 307,
        title: '其他',
    },
];

export const track = {
    store: 'player_feedback_edition',
    forum: 'player_feedback_bbs',
    selfhelp: 'player_feedback_help',
    networkspeed: 'player_feedback_networkspeed',
};
export interface IAjax {
    url: string;
    method?: string;
    contentType?: string;
    responseType?: XMLHttpRequestResponseType;
    async?: boolean;
    withCredentials?: boolean;
    data?: any;
}
export function ajax(obj: IAjax) {
    return new Promise((resolve: (value: any) => void, reject) => {
        const method = obj.method ? obj.method.toUpperCase() : 'GET';
        const async = obj.async ?? true;
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = obj.withCredentials ?? true;
        xhr.responseType = obj.responseType ?? '';

        xhr.addEventListener('load', () => {
            resolve(xhr.response);
        });
        xhr.addEventListener('error', () => {
            reject(xhr);
        });
        xhr.addEventListener('abort', () => {
            reject(xhr);
        });
        if (method === 'POST') {
            xhr.open(method, obj.url, async);
            xhr.setRequestHeader('Content-type', obj.contentType || 'application/x-www-form-urlencoded');
            xhr.send(obj.data);
        } else if (method === 'GET') {
            const data = obj.data ? `?${objToStr(obj.data)}` : '';
            const url = `${obj.url}${data}`;
            xhr.open(method, url, async);
            xhr.send();
        } else {
            xhr.open(method, obj.url);
            xhr.send();
        }
    });
}
export function objToStr(obj: any) {
    let oStr = '';
    for (let key in obj) {
        oStr += `${key}=${obj[key]}&`;
    }
    return oStr.slice(0, -1);
}

export function isEmail(val: string) {
    return /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/.test(val);
}

export function isQQ(val: string) {
    return /^[1-9]\d{4,11}$/.test(val);
}
