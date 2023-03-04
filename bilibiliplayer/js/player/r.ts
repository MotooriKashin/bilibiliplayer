import PlayurlModule from '@jsc/playurl';
import ApiPlayurl, { ApiPlayurlInData, ApiPlayurlOutData } from '../io/api-playurl';
import ApiPlayurlToken, { ApiPlayurlTokenOutData } from '../io/api-playurl-token';
import ApiPlayurlAudio, { ApiPlayurlAudioOutData } from '../io/api-playurl-audio';
import URLS from '../io/urls';
import { ActionType, ContentType } from '@jsc/namespace';
import ApiView, { ApiViewInData, ApiViewOutData } from '../io/api-view';
import { DolbyEffectType } from './controller/dolby-button';
import Player from '../player';
import { browser, qualityMap } from '@shared/utils';
import { Drm } from './drm';
import { IHeadTail } from '../io/rebuild-player-extra-params';

export interface IDashSegmentInterface {
    id?: number;
    codecid?: number;
    codecs?: string;
    baseUrl: string;
    backupUrl: string[];
    [key: string]: any;
}

export interface IDashJsonUrlInterface {
    duration: number;
    minBufferTime: number;
    video: IDashSegmentInterface[];
    audio: IDashSegmentInterface[];
    dolby?: {
        type: number;
        audio: IDashSegmentInterface[];
    };
    flac?: {
        display: boolean;
        audio: IDashSegmentInterface;
    }
}

export interface IMediaDataSourceInterface {
    type?: string;
    duration?: number;
    url?: string | IDashJsonUrlInterface;
    segments?: ISegmentInterface[];
    filesize?: number;
    backupURL?: string[];
    protection?: any
}
export interface ISegmentInterface {
    duration?: number;
    filesize?: number;
    url?: string;
    length?: number;
    backupURL?: string[];
}

export interface VIDEO_DATA {
    streamType?: string,
    mediaDataSource?: IMediaDataSourceInterface,
    acceptFormat?: string,
    acceptQuality: number[],
    acceptDescription?: string[],
    supportFormats?: {
        codecs: string[],
        display_desc: string;
        format: string;
        new_description: string;
        quality: number;
        superscript: string;
    },
    timelength?: number,
    quality?: number,

    // VIP fields
    status?: number,
    vipType?: number,
    vipStatus?: number,
    hasPaid?: boolean,
    isPreview?: number,
    format?: string,
    bp?: boolean,
    abtid?: number,
    realData?: Record<string, any>,

    videoQuality?: number;
}
const domains = {
    interface: 0,
    bangumi: 1,
    bangumiS: 2,
    dash: 3,
};

const domainsName = (index: number, inner: boolean) => {
    return [
        inner ? 'manager.bilibili.co/v2/playurl?' : 'interface.bilibili.com/v2/playurl?',
        'bangumi.bilibili.com/player/web_api/v2/playurl?',
        'bangumi.bilibili.com/player/web_api/playurl?',
        // 'playurl-dash-ugc.bilibili.co/v2/playurl?',
    ][index];
};

const errorTypes = {
    network: 0,
    resolve: 1,
};

const callbackTable: any[] = [];
let wrapAjax: any;
let childAjax: any;
let tokenEncoded: string | null = null;
let resolveParamsCopy: any;
let player: Player;
let firstRetryResource = false;

function destroy() {
    wrapAjax && wrapAjax.abort();
    childAjax && childAjax.abort();
}

function ajaxHandler(urlPtr: any, callbackHandle: any) {
    const callback = callbackTable[callbackHandle];
    if (callbackHandle === callbackTable.length - 1) {
        callbackTable.splice(0, callbackTable.length);
    }
    let url = PlayurlModule.Pointer_stringify(urlPtr);
    if (tokenEncoded) {
        const prefixChar = url && url.indexOf('?') > -1 ? '&' : '?';
        url += `${prefixChar}utoken=${tokenEncoded}`;
        tokenEncoded = null;
    }
    let retrycount = 3;

    function playurlRequest(furl?: string) {
        const turl = furl || url;
        wrapAjax = $.ajax({
            url: turl, // Pointer_stringify
            type: 'get',
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            success: function (response) {
                const result = parse(response, callback.enableSSLStream, callback.reject, this.url, null, player);
                if (result !== undefined) {
                    childAjax = urlChecker(result, function (result?: any) {
                        callback.resolve(result);
                    });
                }
            },
            error: function (xhr, ajaxOptions, error) {
                const https = /^https:/.test(turl) || (/^\/\//.test(turl) && location.protocol === 'https:');
                if (https) {
                    if (retrycount) {
                        retrycount--;
                        return playurlRequest();
                    } else if (location.protocol === 'http:') {
                        const httpurl = /^\/\//.test(turl) ? `http:${turl}` : turl.replace(/^https:/, 'http:');
                        return playurlRequest(httpurl);
                    }
                }
                callback.reject(errorTypes.network, error || (xhr && xhr.status ? xhr.status : ''), this.url);
            },
        });
    }

    playurlRequest();
}

// cwrap
const emResolve = PlayurlModule.cwrap('r', null, [
    'string',
    'number',
    'number',
    'number',
    'string',
    'string',
    'number',
]);
const emSetAjaxHandler = PlayurlModule.cwrap('s', null, ['number']);

// Runtime.addFunction
const ajaxHandlerPtr = PlayurlModule.Runtime['addFunction'](ajaxHandler);
emSetAjaxHandler(ajaxHandlerPtr);

async function resolve(resolveParams: any, resolved: any, rejected?: any) {
    firstRetryResource = true;
    const rp = resolveParams;
    resolveParamsCopy = resolveParams;
    player = rp.player;
    const callback = {
        resolve: resolved,
        reject: rejected,
        enableSSLStream: rp.enableSSLStream,
    };
    let retrycount = 3;
    let windowPlayInfo: any;

    if (window['__playinfo__'] && typeof window['__playinfo__'] === 'object') {
        if (window['__playinfo__']['session']) {
            // 透传session
            player.session = window['__playinfo__']['session'];
        }
        if (typeof window['__playinfo__']['data'] === 'object' && window['__playinfo__']['code'] === 0) {
            // 兼容业务playurl
            window['__playinfo__'] = window['__playinfo__']['data'];
        }

        let valid: boolean;
        let playinfo = window['__playinfo__']!;

        if (player.allowFlv) {
            valid = playinfo['format'] && playinfo['format'].indexOf('mp4') === -1;
        } else {
            valid = playinfo['format'] && playinfo['format'].indexOf('mp4') > -1;
        }

        if (valid) {
            await parse(window['__playinfo__'], callback.enableSSLStream, null, null, null, player).then((result) => {
                windowPlayInfo = result;
            });
        }
        delete window['__playinfo__'];
    }
    const handleRequest = function () {
        const callbackHandle = callbackTable.push(callback) - 1;
        emResolve(
            domainsName(rp.domain, player.config.inner!),
            rp.enableSSLResolve,
            rp.cid,
            rp.quality,
            rp.type,
            rp.extra_params,
            callbackHandle,
        );
    };
    const fallbackToLowerQuality = function () {
        // 确保不会循环递归
        rp.requestFromInit = false;
        rp.quality = qualityMap(80);

        rp.extra_params.replace(/(^|&)qn=\d+(&|$)/, `$1qn=${rp.quality}$2`);
        resolve(resolveParams, resolved, rejected);
    };
    const playurlFallback = function () {
        if (player.isSvipQuality(rp.quality)) {
            const tokenStartTime = new Date().getTime();
            const data = {
                aid: player.config.aid,
                cid: rp.cid,
                bvid: player.config.bvid,
            };
            new ApiPlayurlToken(data).getData({
                success: function (result: ApiPlayurlTokenOutData) {
                    const elapsedTime = new Date().getTime() - tokenStartTime;
                    if (result && result.code === 0 && result.data) {
                        // UP主自己的视频和当前用户是大会员
                        if ((result.data.owner === 1 || result.data.svip === 1) && result.data.token) {
                            // rp.extra_params += `&utoken=${result.data.fcs}`; // Join token
                            tokenEncoded = encodeURIComponent(result.data.token);
                            handleRequest();
                        } else {
                            // 区分播放器初始化和清晰度切换
                            if (rp.requestFromInit) {
                                fallbackToLowerQuality();
                            } else {
                                player.controller.quality.svipQualityPayPopup();
                                typeof callback.resolve === 'function' && callback.resolve();
                            }
                        }
                    } else {
                        if (rp.requestFromInit) {
                            fallbackToLowerQuality();
                        } else {
                            typeof callback.resolve === 'function' && callback.resolve();
                        }
                    }
                },
                error: function () {
                    const elapsedTime = new Date().getTime() - tokenStartTime;
                    if (rp.requestFromInit) {
                        fallbackToLowerQuality();
                    } else {
                        typeof callback.resolve === 'function' && callback.resolve();
                    }
                },
            });
        } else {
            handleRequest();
        }
    };
    const playurlRequest = (url: string) => {
        if (player.config.isAudio) {
            const data = {
                aid: player.config.aid,
                bvid: player.config.bvid,
                privilege: 2,
                quality: 1,
            };
            new ApiPlayurlAudio(data).getData({
                success: function (response: ApiPlayurlAudioOutData, url: string) {
                    const result = parseAudio(response, callback.enableSSLStream, callback.reject, url);
                    if (result !== undefined) {
                        childAjax = urlChecker(result, function (result?: any) {
                            callback.resolve(result);
                        });
                    }
                },
                error: function (error: JQuery.jqXHR<any>, url: string) {
                    if (!player.config.seasonType && !windowPlayInfo) {
                        retrycount = 0;
                        playurlFallback();
                        return;
                    }
                    const https = /^https:/.test(url) || (/^\/\//.test(url) && location.protocol === 'https:');
                    if (https) {
                        if (retrycount) {
                            retrycount--;
                            return playurlRequest(url);
                        } else if (location.protocol === 'http:') {
                            const httpurl = /^\/\//.test(url) ? `http:${url}` : url.replace(/^https:/, 'http:');
                            return playurlRequest(httpurl);
                        }
                    }
                    callback.reject(errorTypes.network, error, url);
                },
            });
        } else {
            const stime = Date.now();
            const isPugv = player.config.type === ContentType.Pugv || player.config.type === ContentType.PugvCenter;
            const data: ApiPlayurlInData = {
                avid: resolveParams.aid || player.config.aid,
                cid: resolveParams.cid,
                bvid: resolveParams.bvid || player.config.bvid,
                qn: resolveParams.quality,
                type: resolveParams.type,
                fnver: resolveParams.fnver,
                fnval: resolveParams.fnval,
                session: resolveParams.session,
                episodeId: resolveParams.episodeId,
                pugv: isPugv,
                fourk: 1,
            };
            new ApiPlayurl(data).getData({
                url: url,
                success: function (response: ApiPlayurlOutData, url: string) {
                    if (
                        !resolveParams.recommendPreload &&
                        ((data.avid && data.avid !== player.config.aid) ||
                            (data.bvid && data.bvid !== player.config.bvid) ||
                            (data.cid && data.cid !== resolveParams.cid))
                    ) {
                        return;
                    }
                    parse(response, callback.enableSSLStream, callback.reject, url, playurlRequest, player).then(
                        (result) => {
                            if (result !== undefined) {
                                childAjax = urlChecker(result, function (result?: any) {
                                    callback.resolve(result);
                                });
                            }
                        },
                    );
                },
                error: function (error: JQuery.jqXHR<any>, url: string) {
                    if (
                        !resolveParams.recommendPreload &&
                        ((data.avid && data.avid !== player.config.aid) ||
                            (data.bvid && data.bvid !== player.config.bvid) ||
                            data.cid !== resolveParams.cid)
                    ) {
                        return;
                    }
                    if (!player.config.seasonType && !windowPlayInfo && !resolveParams.fnval) {
                        retrycount = 0;
                        playurlFallback();
                        return;
                    }
                    const https = /^https:/.test(url) || (/^\/\//.test(url) && location.protocol === 'https:');
                    if (https) {
                        if (retrycount) {
                            retrycount--;
                            return playurlRequest(url);
                        } else if (location.protocol === 'http:') {
                            const httpurl = /^\/\//.test(url) ? `http:${url}` : url.replace(/^https:/, 'http:');
                            return playurlRequest(httpurl);
                        }
                    }
                    callback.reject(errorTypes.network, error, url);
                },
            });
        }
    };
    if (windowPlayInfo) {
        childAjax = urlChecker(windowPlayInfo, function (result?: any) {
            callback.resolve(result);
        });
    } else {
        if (player.config.type === ContentType.Pugv || player.config.type === ContentType.PugvCenter) {
            playurlRequest(URLS.PLAYURL_PUGV);
        } else if (player.config.inner === true) {
            playurlRequest(URLS.PLAYURL_INNER);
        } else if (player.config.interactivePreview) {
            playurlRequest(URLS.PLAYURL_PRE);
        } else if (player.config.upPreview) {
            playurlRequest(URLS.PLAYURL_UP);
        } else if (player.config.seasonType >= 1) {
            playurlRequest(URLS.PLAYURL_PGC);
        } else if (player.config.playerType === 1) {
            const callbackHandle = callbackTable.push(callback) - 1;
            emResolve(
                domainsName(rp.domain, player.config.inner!),
                rp.enableSSLResolve,
                rp.cid,
                rp.quality,
                rp.type,
                rp.extra_params,
                callbackHandle,
            );
        } else {
            playurlRequest(URLS.PLAYURL);
        }
    }
}

function urlChecker(result: any, callback: any) {
    if (result.mediaDataSource['type'] === 'dash' || result.mediaDataSource['type'] === 'audio') {
        callback(result);
    } else if (
        result.mediaDataSource['type'] === 'mp4' &&
        result.mediaDataSource['url'] &&
        result.mediaDataSource['url'].match(/:\/\/ws\.acgvideo\.com\//)
    ) {
        return $.ajax({
            url: result.mediaDataSource['url'] + '&get_url=1',
            dataType: 'text',
            success: function (edgeUrl) {
                result.mediaDataSource['url'] = edgeUrl;
                callback(result);
            },
            error: function () {
                callback(result);
            },
        });
    } else if (
        (browser.version.safari || browser.version.trident || browser.version.edge) &&
        result.mediaDataSource['type'] === 'flv' &&
        result.mediaDataSource['segments'] &&
        result.mediaDataSource['segments'][0] &&
        result.mediaDataSource['segments'][0]['url'] &&
        result.mediaDataSource['segments'][0]['url'].match(/:\/\/ws\.acgvideo\.com\//)
    ) {
        return $.ajax({
            url: result.mediaDataSource['segments'][0]['url'] + '&get_url=1',
            dataType: 'text',
            success: function (edgeUrl) {
                let realhost: any = /\/\/(.*)?\/ws\.acgvideo\.com/.exec(edgeUrl);
                if (realhost) {
                    realhost = realhost[1];
                    for (let i = 0; i < result.mediaDataSource['segments'].length; i++) {
                        if (result.mediaDataSource['segments'][i] && result.mediaDataSource['segments'][i]['url']) {
                            result.mediaDataSource['segments'][i]['url'] = result.mediaDataSource['segments'][i][
                                'url'
                            ].replace(/\/\/ws\.acgvideo\.com/, '//' + realhost + '/ws.acgvideo.com');
                        }
                    }
                }
                callback(result);
            },
            error: function () {
                callback(result);
            },
        });
    } else {
        callback(result);
    }
}

function parseAudio(body: ApiPlayurlAudioOutData, enableSSLStream?: boolean, reject?: any, playurl?: string) {
    if (!(body.code === 0 && body.data && body.data.cdns && body.data.cdns.length)) {
        const str = body.code + ': ' + body.msg;
        reject && reject(errorTypes.resolve, str, playurl);
        return;
    }
    if (enableSSLStream) {
        body.data.cdns.map((cdn) => {
            return cdn.replace(/http:\/\//g, 'https://');
        });
    }

    return {
        streamType: enableSSLStream ? 'https' : 'http',
        mediaDataSource: {
            type: 'audio',
            url: body.data.cdns[0],
            backupURL: body.data.cdns.slice(1),
        },
    };
}

async function parse(body: any, enableSSLStream?: any, reject?: any, playurl?: any, reloadPlayurl?: any, player?: Player) {
    let acceptFormat = null;
    let acceptQuality = null;
    let acceptDescription = null;
    let format = null;
    let supportFormats = null;
    let permissionDenied = null;
    let drmTechType = null;
    let headTail: any;

    const mediaDataSource: IMediaDataSourceInterface = {};
    const data = body.data ? body.data : $.isPlainObject(body.result) ? body.result : body; // ApiPlayurl 接口使用 body.data，旧接口和 window['__playinfo__'] 使用 body

    if (
        player?.config &&
        player.config.seasonType === 0 &&
        typeof body.code !== 'undefined' &&
        body.code !== 0 &&
        firstRetryResource
    ) {
        firstRetryResource = false;
        return await retryViewRequest(resolveParamsCopy, reloadPlayurl, reject);
    }

    if (body) {
        switch (body.code) {
            case -403:
            case -10403:
                permissionDenied = true;
                break;
        }
    }

    if (body.data && body.code !== 0) {
        const str = body.code + ': ' + body.message;
        reject && reject(errorTypes.resolve, str, playurl);
        return;
    }
    if (!data['result']) {
        if (
            typeof data['durl'] !== 'undefined' ||
            typeof data['dash_mpd'] !== 'undefined' ||
            typeof data['dash'] !== 'undefined'
        ) {
            // add dash mpd support
            data['result'] = 'suee';
        } else {
            let str = 'Error';
            if (data['error_text']) {
                str = data['error_code'] + ': ' + data['error_text'];
            }
            reject && reject(errorTypes.resolve, str, playurl);
            return;
        }
    }

    if (data['result'] !== 'suee') {
        if (data['result'] === 'error') {
            reject && reject(errorTypes.resolve, 'Resolve Error: ' + data['message'], playurl);
        } else {
            reject && reject(errorTypes.resolve, 'Resolve Error: result is ' + data['result'], playurl);
        }
        return;
    }

    if (data['from'] !== 'local' || data['result'] !== 'suee') {
        reject && reject(errorTypes.resolve, 'Unsupported video source: ' + data['from'], playurl);
        return;
    }

    acceptFormat = data['accept_format'];
    acceptQuality = data['accept_quality'];
    acceptDescription = data['accept_description'];
    format = data['format'];
    supportFormats = data['support_formats'];
    drmTechType = data['drm_tech_type'];

    if (!acceptFormat || acceptFormat.length === 0) {
        try {
            acceptFormat = [];
            data.support_formats.forEach((d: any) => {
                acceptFormat.push(d.format);
            });
        } catch (e) {
            acceptFormat = [data['format']];
        }
    }
    if (!acceptQuality || acceptQuality.length === 0) {
        try {
            acceptQuality = [];
            data.support_formats.forEach((d: any) => {
                acceptQuality.push(d.quality);
            });
        } catch (e) {
            acceptQuality = [2];
        }
    }
    let type = 'flv';
    if (data['format'] && data['format'].indexOf('mp4') > -1) {
        type = 'mp4';
    }
    if (data['dash_mpd'] || data['dash']) {
        type = 'dash';
    }
    if (type !== 'dash' && (!Array.isArray(data['durl']) || data['durl'].length === 0)) {
        reject && reject(errorTypes.resolve, 'Invalid durl', playurl);
        return;
    }
    const timelength = data['timelength'];
    let quality = data['quality'];

    mediaDataSource['type'] = type;
    mediaDataSource['duration'] = 0;

    let streamType = 'http';
    if (type === 'dash') {
        mediaDataSource['url'] = data['dash_mpd'] || data['dash'];
        mediaDataSource['duration'] = data['timelength'] || 0;
        if (mediaDataSource['url'] && (<IDashJsonUrlInterface>mediaDataSource['url'])['duration']) {
            (<IDashJsonUrlInterface>mediaDataSource['url'])['duration'] = (<IDashJsonUrlInterface>mediaDataSource['url'])['duration'] - 1;
        }
        if (enableSSLStream) {
            streamType = 'https';
            if (typeof mediaDataSource['url'] === 'string') {
                mediaDataSource['url'] = (<string>mediaDataSource['url']).replace(/http:\/\//g, 'https://');
            } else if (typeof mediaDataSource['url'] === 'object') {
                mediaDataSource['duration'] =
                    mediaDataSource['url'] && mediaDataSource['url']['duration'] > 0
                        ? mediaDataSource['url']['duration'] * 1000
                        : data['timelength'] || 0;
                const replaceHttps = (arr: IDashSegmentInterface[]) =>
                    arr &&
                    arr.map &&
                    arr.map((item: IDashSegmentInterface) => {
                        item['baseUrl'] = item['base_url'] && item['base_url'].replace(/http:\/\//g, 'https://');
                        item['backupUrl'] =
                            item['backup_url'] &&
                            item['backup_url'].map &&
                            item['backup_url'].map((url: string) => {
                                return url.replace(/http:\/\//g, 'https://');
                            });
                        return item;
                    });
                mediaDataSource['url']['video'] = replaceHttps(mediaDataSource['url']['video']);
                mediaDataSource['url']['audio'] = replaceHttps(mediaDataSource['url']['audio']);

                /**
                 * DRM 类型判断  
                 * @question 为什么不对杜比全景声和HiRes进行处理？留待后续跟进？
                 */
                switch (drmTechType) {
                    case 3:
                        mediaDataSource['url']['video'] = Drm.setContentProtection(mediaDataSource['url']['video']);
                        mediaDataSource['url']['audio'] = Drm.setContentProtection(mediaDataSource['url']['audio']);
                        break;
                    case 2:
                        mediaDataSource['url']['video'] = Drm.setContentProtectionPSSH(mediaDataSource['url']['video']);
                        mediaDataSource['url']['audio'] = Drm.setContentProtectionPSSH(mediaDataSource['url']['audio']);
                        break;
                    default:
                }

                /**
                 * 杜比类型判断
                 */
                if (mediaDataSource['url']['dolby'] && mediaDataSource['url']['dolby']['type']) {
                    // type 0-无；1-普通杜比音效；2-杜比全景声
                    if (window['DashPlayer']?.isEC3DolbyATMOSTypeSupported?.()) {
                        if (player) {
                            player.dolbyEffectType = +mediaDataSource['url']['dolby']['type'];
                            player.controller && player.controller.createDolbyButton();
                        }
                    } else {
                        player!.dolbyEffectType = DolbyEffectType.None;
                    }
                } else {
                    player!.dolbyEffectType = DolbyEffectType.None;

                }

                /** HiRes判断 */
                if (mediaDataSource['url']['flac'] && mediaDataSource['url']['flac']['display']) {
                    if (window['DashPlayer']?.isFLACTypeSupported?.()) {
                        if (player) {
                            player.audioHiRes = true;
                            player.controller && player.controller.createHiResButton();
                        }
                    } else {
                        player!.audioHiRes = false;
                    }
                } else {
                    player!.audioHiRes = false;
                }

                // Firefox 不支持 4K 120
                if (browser.version.gecko) {
                    for (let i = 0; i < (<IDashJsonUrlInterface>mediaDataSource.url).video.length; i++) {
                        const d = (<IDashJsonUrlInterface>mediaDataSource.url).video[i];
                        if (120 === d.id && d.codecid === 7) {
                            const testVideo = document.createElement('video');
                            if (
                                !(
                                    testVideo &&
                                    testVideo.canPlayType &&
                                    testVideo.canPlayType(`video/mp4; codecs="${d.codecs}, mp4a.40.2"`)
                                )
                            ) {
                                // 可能先被 core-player 删一次
                                if (acceptQuality[0] === 120) {
                                    acceptDescription.splice(0, 1);
                                    acceptQuality.splice(0, 1);
                                }
                                if (quality === 120) {
                                    quality = acceptQuality[0];
                                    data.quality = acceptQuality[0];
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
        if (enableSSLStream) {
            streamType = 'https';
        }
    } else if (type === 'mp4') {
        // singlepart mp4
        const durl = data['durl']![0];
        let url = durl['url'];
        const backupURL: string[] = [];
        if (enableSSLStream && url) {
            streamType = 'https';
            url = url.replace('http://', 'https://');
        }
        durl['backup_url'] &&
            durl['backup_url'].forEach((item: string) => {
                if (enableSSLStream && item) {
                    streamType = 'https';
                    item = item.replace('http://', 'https://');
                }
                backupURL.push(item);
            });
        mediaDataSource['url'] = url;
        mediaDataSource['backupURL'] = backupURL;
        mediaDataSource['duration'] = durl['length'];
    } else {
        // multipart flv
        mediaDataSource['segments'] = [];
        mediaDataSource['duration'] = 0;
        data['durl']!.forEach(function (durl: any) {
            let url = durl['url'];
            const backupURL: string[] = [];
            if (enableSSLStream && url) {
                streamType = 'https';
                url = url.replace('http://', 'https://');
            }
            durl['backup_url'] &&
                durl['backup_url'].forEach((item: string) => {
                    if (enableSSLStream && item) {
                        streamType = 'https';
                        item = item.replace('http://', 'https://');
                    }
                    backupURL.push(item);
                });
            const segment: ISegmentInterface = {};
            segment['duration'] = durl['length'];
            segment['filesize'] = durl['size'];
            segment['url'] = url;
            segment['backupURL'] = backupURL;
            mediaDataSource['segments']!.push(segment);
            mediaDataSource['duration']! += segment['duration']!;
        });
    }

    // 跳过片头片尾
    const clip_info_list = data['clip_info_list'];
    if (clip_info_list && Array.isArray(clip_info_list)) {
        headTail = {
            hasSkip: true,
            hasData: true,
            first: false,
        };
        clip_info_list.forEach(d => {
            switch (d.clipType) {
                case 'CLIP_TYPE_OP':
                    headTail.head || (headTail.head = []);
                    headTail.head.push(d.start, d.end);
                    break;
                case 'CLIP_TYPE_ED':
                    headTail.tail || (headTail.tail = []);
                    headTail.tail.push(d.start, d.end);
                    break;
                default:
                    break;
            }
        });
    }

    // VIP fields
    const status = data['status'];
    const vipType = data['vip_type'];
    const isPreview = data['is_preview'];
    const vipStatus = data['vip_status'];
    const hasPaid = data['has_paid'];
    const bp = data['bp'];
    const abtid = data['abtid'];

    const isDrm = data['is_drm'];


    if (isDrm && drmTechType) {
        try {
            mediaDataSource.protection = await new Drm(drmTechType, mediaDataSource).getData();
        } catch (e) {
            return reject && reject(errorTypes.resolve, e, playurl);
        }
    }

    return {
        streamType: streamType,
        mediaDataSource: mediaDataSource,
        acceptFormat: acceptFormat,
        acceptQuality: acceptQuality,
        acceptDescription: acceptDescription,
        supportFormats: supportFormats,
        timelength: timelength,
        quality: quality,

        // VIP fields
        status: status,
        vipType: vipType,
        vipStatus: vipStatus,
        hasPaid: hasPaid,
        isPreview: isPreview,
        format: format,
        bp: bp,
        abtid: abtid,
        realData: body,

        // DRM fields
        isDrm,
        drmTechType,

        fullPlayDisabled: permissionDenied || isPreview,

        headTail: { headTail }
    };
}

function retryViewRequest(params: any, reloadPlayurl?: any, rejected?: any) {
    const cb = (data: ApiViewOutData) => {
        if (data?.cid) {
            params.cid = data.cid;
            player.config.cid = data.cid;
            if (typeof reloadPlayurl === 'function') {
                reloadPlayurl(URLS.PLAYURL);
            }
        } else {
            rejected && rejected(errorTypes.resolve, 'Invalid View Interface Response When Retry Video Resource');
        }
    };
    if (player.globalFunction) {
        player.globalFunction.getVideoinfo((data: ApiViewOutData) => {
            cb(data);
        });
    } else {
        const data: any = {};
        if (player.config.bvid) {
            data.bvid = player.config.bvid;
        } else {
            data.aid = player.config.aid;
        }
        new ApiView(<ApiViewInData>data).getData({
            success: (data: ApiViewOutData) => {
                cb(data);
            },
            error: () => {
                cb(<any>null);
            },
        });
    }
}

export default {
    r: resolve,
    parse: parse,
    destroy,
    domains,
    errorTypes,
};