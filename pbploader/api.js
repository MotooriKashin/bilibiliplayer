import { getCookie } from '@shared/utils';

function parseXmlHttpResponse(xhr, type) {
    if (type === 'json') {
        const text = xhr.responseText;
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            json = {};
        }

        return json;
    }
}

function concatURLQueryString(url, qs) {
    const fragment = url.split('?');

    if (fragment.length === 2) {
        if (fragment[1]) {
            // http://domain/path?a=x&b=x
            url += '&' + qs;
        } else {
            // http://domain/path?
            url += qs;
        }
    } else if (fragment.length === 1) {
        // http://domain/path
        url += '?' + qs;
    } else {
        return '';
    }

    return url;
}

// options = { url, method, params, data, responseType, withCredentials, headers, pending }
// response data raw
function xhr(options) {
    function execute(resolve, reject) {
        if (!options.url) {
            resolve(options.defaultResult);
            return;
        }
        const xhr = new XMLHttpRequest();
        let url = options.url;
        if (options.params) {
            const qs = Object.keys(options.params)
                .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(options.params[key]))
                .join('&');
            url = concatURLQueryString(url, qs);
            if (!url) {
                resolve(options.defaultResult);
                return;
            }
        }

        if (!options.method) options.method = 'GET';
        xhr.open(options.method.toUpperCase(), url, true);

        if (options.withCredentials) {
            xhr.withCredentials = true;
        }

        if (options.responseType) {
            xhr.responseText = options.responseType;
        } else {
            xhr.responseType = 'text';
        }

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) {
                return;
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(parseXmlHttpResponse(xhr, 'json'));
            } else {
                resolve(options.defaultResult);
                // reject({
                //     http_url: url,
                //     http_method: options.method,
                //     http_status: xhr.status,
                // });
            }
        };

        for (let key in options.headers) {
            if (options.headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, options.headers[key]);
            }
        }

        if (typeof options.data === 'object') {
            xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
            options.data = JSON.stringify(options.data);
        }

        xhr.send(options.data || null);
    }

    return new Promise(execute);
}

export default {
    getModules(config) {
        return xhr({
            url: `//${config.loaderApi || 'bvc.bilivideo.com'}/pbp/data?r=loader&cid=${config.cid}&aid=${
                config.aid || 0
            }&bvid=${config.bvid}&version=${config.version}&innersign=${getCookie('innersign')}&mid=${getCookie(
                'DedeUserID',
            )}`,
            method: 'get',
            withCredentials: false,
            defaultResult: config.defaultResult,
        });
    },
};
