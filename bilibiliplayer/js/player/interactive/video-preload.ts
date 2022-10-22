import Resolve from '../r';
import Player from '../../player';
import { getSearchParam } from '@shared/utils';

export interface IPreloadData {
    cid?: number;
    playurlData?: any;
    videoData?: IVideoData;
}

export interface IVideoData {
    type?: string;
    videoUrl?: string;
    videoid?: string;
    video?: any;
    audioUrl?: string;
    audioid?: string;
    audio?: any;
}

export interface IPreloadConfig {
    cid: number;
    vbufferLength?: number;
    abufferLength?: number;
}

export class VideoPreload {
    player: Player;
    preloadData: Array<IPreloadData>;
    preloadAjax: any;

    constructor(player: Player) {
        this.player = player;
        this.preloadAjax = [];
        this.preloadData = [];
    }

    getData(cid: number) {
        if (this.preloadData) {
            for (let i = 0; i < this.preloadData.length; i++) {
                if (Number(this.preloadData[i].cid) === Number(cid)) {
                    return this.preloadData[i];
                }
            }
        }
        return null;
    }

    // 预取图片 一定要绝对路径
    preloadImage(src: string) {
        const links = document.querySelectorAll('link[preloadImage]');
        for (let i = 0; i < links.length; i++) {
            if (links[i].getAttribute('href') === src) {
                return true;
            }
        }
        let link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = src;
        link.setAttribute('preloadImage', 'true');
        document.querySelector('head')!.appendChild(link);
    }

    preload(config: IPreloadConfig) {
        const cid = config.cid;
        const that = this.player;
        const resolveParams: any = {
            domain:
                that.config.seasonType >= 1
                    ? Resolve.domains.bangumi
                    : that.config.playerType === 1
                        ? Resolve.domains.bangumiS
                        : Resolve.domains.interface,
            enableSSLResolve: that.config.enableSSLResolve,
            enableSSLStream: that.config.enableSSLStream,
            cid: cid,
            episodeId: that.config.episodeId,
            quality: that.videoQuality,
            type: that.allowFlv ? '' : 'mp4',
            requestFromInit: true,
            extra_params: that.config.extraParams,
            player: that,
        };

        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&qn=${resolveParams.quality}`;
        } else {
            resolveParams.extra_params = `qn=${resolveParams.quality}`;
        }
        if (that.config.seasonType) {
            if (!getSearchParam('season_type', `?${resolveParams.extra_params}`)) {
                resolveParams.extra_params += `&season_type=${that.config.seasonType}`;
            }
        }
        let fnval = that.getFnval();
        // only UGC and MSE supported browser can use dashplayer
        resolveParams.fnver = 0;
        resolveParams.fnval = fnval;
        resolveParams.session = that.session;
        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&fnver=0&fnval=${fnval}`;
        } else {
            resolveParams.extra_params = `fnver=0&fnval=${fnval}`;
        }
        this.preloadAjax.push(
            Resolve.r(
                resolveParams,
                (result: any) => {
                    result = this.player.transformQuality(result);
                    let hasLoaded = false;
                    for (let j = 0; j < this.preloadData.length; j++) {
                        if (this.preloadData[j].cid === cid) {
                            this.preloadData[j].playurlData = result;
                            hasLoaded = true;
                        }
                    }
                    if (this.preloadData.length > 10) {
                        this.preloadData.shift();
                    }
                    if (!hasLoaded) {
                        this.preloadData.push({
                            cid: cid,
                            playurlData: result,
                            videoData: {
                                type: 'dash',
                            },
                        });
                        this.preloadVideoData(config, result);
                    }
                },
                (err: any) => { },
            ),
        );
    }

    preloadVideoData(config: IPreloadConfig, result: any) {
        const cid = config.cid;
        const abufferLength = config.abufferLength || 20 * 1000; // ≈20 KB
        const vbufferLength = config.vbufferLength || 500 * 1000; // ≈500 KB
        if (result.mediaDataSource.type === 'dash' && this.player.dashPlayer) {
            const dashPlayer = this.player.dashPlayer;
            const videoQn = dashPlayer.getQualityNumberFromQualityIndex(dashPlayer.getQualityFor('video'), 'video');
            const videoCodecID = dashPlayer.getCurrentCodecID('video');
            const audioQn = dashPlayer.getQualityNumberFromQualityIndex(dashPlayer.getQualityFor('audio'), 'audio');
            const videoUrl = this.getUrlByQn(videoQn, result.mediaDataSource.url.video, 'video', videoCodecID);
            if (videoUrl) {
                this.preloadAjax.push(
                    this.getRangeData(videoUrl, 0, vbufferLength, (err: any, data: any, url: string) => {
                        if (!err) {
                            for (let i = 0; i < this.preloadData.length; i++) {
                                if (this.preloadData[i].cid === cid) {
                                    this.preloadData[i].videoData!.videoUrl = url;
                                    this.preloadData[i].videoData!.videoid = String(videoQn);
                                    this.preloadData[i].videoData!.video = data;
                                }
                            }
                        }
                    }),
                );
            }

            const audioUrl = this.getUrlByQn(audioQn, result.mediaDataSource.url.audio, 'audio');
            if (audioUrl) {
                this.preloadAjax.push(
                    this.getRangeData(audioUrl, 0, abufferLength, (err: any, data: any, url: string) => {
                        if (!err) {
                            for (let i = 0; i < this.preloadData.length; i++) {
                                if (this.preloadData[i].cid === cid) {
                                    this.preloadData[i].videoData!.audioUrl = url;
                                    this.preloadData[i].videoData!.audioid = String(audioQn);
                                    this.preloadData[i].videoData!.audio = data;
                                }
                            }
                        }
                    }),
                );
            }
        }
    }

    getUrlByQn(qn: number, list: any, type: string, codecid: number = 7) {
        if (!list) {
            return;
        }
        for (let i = 0; i < list.length; i++) {
            if (
                list[i].id === qn &&
                list[i].baseUrl &&
                ((list[i].codecid === codecid && type === 'video') || type === 'audio')
            ) {
                return list[i].baseUrl.replace('http://', 'https://');
            }
        }
    }

    getRangeData(url: string, from: number, to: number, callback: Function) {
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.addEventListener('load', () => {
            callback(null, xhr.response, url);
        });
        xhr.addEventListener('error', function () {
            callback(xhr.statusText || 'ioError', xhr);
        });
        xhr.addEventListener('abort', function () {
            callback(xhr.statusText || 'ioError', xhr);
        });
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Range', `bytes=${from}-${to - 1}`);
        xhr.send();
        return xhr;
    }

    arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    abort() {
        if (this.preloadAjax) {
            for (let i = 0; i < this.preloadAjax.length; i++) {
                if (this.preloadAjax[i] && this.preloadAjax[i].readyState !== 4) {
                    this.preloadAjax[i].abort?.();
                }
            }
        }
        this.preloadAjax = [];
    }

    destroy() {
        this.abort();
        // 互动视频的预取暂时是全局保存的，不销毁
        // this.preloadData = [];
    }
}

export default VideoPreload;
