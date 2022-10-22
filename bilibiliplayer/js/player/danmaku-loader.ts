import { logger } from '../plugins/internal-logger';

export interface IDanmakuLoaderConfig {
    reload_count?: number;
    withCredentials?: boolean;
    failedCallback?(error?: any, data?: any): void;
    parseFunc?(text: string): any;
    successCallback?(
        danmakuArray?: any[],
        total?: number | string,
        loadTime?: number,
        parseTime?: number,
        state?: number,
        raw?: string,
        sendTip?: string,
        textSide?: string,
    ): any;
}

export interface IDanmakuData {
    stime: number;
    mode: number;
    size: number;
    color: number;
    date: number;
    class: number;
    uid: string | number;
    dmid: string;
    text: string;
    mid?: number;
    weight?: number;
    rnd?: string;
    uname?: string;
}

const danmakuLoader = {
    reload_count: 10,
    raw: '',
    load: function (url: string, config: IDanmakuLoaderConfig) {
        const that = this;
        if (typeof config.reload_count === 'undefined') {
            config.reload_count = 10;
        }
        that.loadData(
            url,
            function (error: any, data: any, loadTime: any) {
                if (error) {
                    if (window.location.protocol === 'http:' && url && that.reload_count > 0) {
                        that.reload_count--;
                        if (/^(http:)?\/\//.test(url)) {
                            setTimeout(function () {
                                that.load(url.replace(/^(http:)?\/\//, 'https://'), config);
                            }, 1000);
                        } else {
                            setTimeout(function () {
                                that.load(url.replace(/^(https:)?\/\//, 'http://'), config);
                            }, 1000);
                        }
                    } else if (that.reload_count > 0) {
                        that.reload_count--;
                        setTimeout(function () {
                            that.load(url, config);
                        }, 1000);
                    } else {
                        if (typeof config.failedCallback === 'function') {
                            config.failedCallback(error, data);
                        }
                    }
                } else {
                    that.parse(data, config, loadTime);
                }
            },
            config.withCredentials!,
        );
    },
    parseData: function (data: string) {
        // B站输出的xml可能包含不标准的字符,会引起浏览器自动解析失败
        try {
            data = data.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, '');
        } catch (e: any) {
            logger.w(e);
        }
        this.raw = data;
        return new window.DOMParser().parseFromString(data, 'text/xml');
    },
    loadData: function (url: string, callback: Function, withCredentials: boolean) {
        const that = this;
        let startTime = +new Date();
        const xhr = new XMLHttpRequest();
        // xhr.responseType = 'text';
        xhr.addEventListener('load', function () {
            startTime = +new Date() - startTime;
            callback(null, that.parseData(xhr.response), startTime);
        });
        xhr.addEventListener('error', function () {
            callback(xhr.statusText || 'ioError', xhr);
        });
        xhr.addEventListener('abort', function () {
            callback(xhr.statusText || 'ioError', xhr);
        });
        xhr.open('GET', url, true);
        if (withCredentials) {
            xhr.withCredentials = true;
        }
        xhr.send();
    },
    parse: function (result: any, config: IDanmakuLoaderConfig, loadTime: number) {
        if (typeof config.parseFunc === 'function') {
            config.parseFunc(result);
        } else if (result) {
            const danmakuArray = [];
            let total;
            let items;
            let state;
            let sendTip;
            let textSide;
            let i;
            const parseStartTime = +new Date();
            // xml弹幕解析
            items = result.getElementsByTagName('d');
            state = result.getElementsByTagName('state');
            sendTip = result.getElementsByTagName('text');
            textSide = result.getElementsByTagName('text_side');
            total = result.getElementsByTagName('maxlimit');
            if (state && state[0]) {
                state = +state[0].textContent;
            }
            if (sendTip && sendTip[0]) {
                sendTip = sendTip[0].textContent;
            } else {
                sendTip = '';
            }
            if (textSide && textSide[0]) {
                textSide = textSide[0].textContent;
            } else {
                textSide = '';
            }
            if (total && total[0]) {
                total = total[0].textContent;
            } else {
                total = '-';
            }

            for (i = 0; i < items.length; i++) {
                const item = items[i];
                const json = item.getAttribute('p').split(',');
                let text = item.textContent;
                const eAttr = item.getAttribute('e');
                let data: IDanmakuData;
                let rnJson;
                if (!text) {
                    text = item.text;
                }
                if (typeof text === 'undefined') {
                    continue;
                }
                data = {
                    stime: Number(json[0]),
                    mode: Number(json[1]),
                    size: Number(json[2]),
                    color: Number(json[3]),
                    date: Number(json[4]),
                    class: Number(json[5]),
                    uid: json[6],
                    dmid: String(json[7]),
                    text: Number(json[1]) === 9 ? String(text) : String(text).replace(/(\/n|\\n|\n|\r\n)/g, '\r'),
                    weight: -Math.round(Math.random() * 10),
                };
                // 未打分弹幕给个随机的负分
                if (typeof eAttr === 'string') {
                    rnJson = eAttr.split(',');
                    data.mid = +rnJson[0];
                    data.uname = rnJson[1];
                }
                danmakuArray.push(data);
            }
            if (typeof config.successCallback === 'function') {
                config.successCallback(
                    danmakuArray,
                    total,
                    loadTime,
                    +new Date() - parseStartTime,
                    state,
                    this.raw,
                    sendTip,
                    textSide,
                );
            }

            return false;
        } else {
            if (typeof config.failedCallback === 'function') {
                config.failedCallback('parse error, empty data.');
            }
        }
    },
};

export default danmakuLoader;
