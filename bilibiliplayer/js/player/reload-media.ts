import Player from '../player';
import { gtQualityNormal } from '../config';
import Resolve from './r';
import STATE, { PLAYER_CODEC_ID } from './state';
import VideoInfoData from './video-info-data';
import { ContentType } from '@jsc/namespace';
import { browser, getSearchParam } from '@shared/utils';

export class ReloadMedia {
    seamlessPauseTimer!: number;
    seamlessPlayTimer!: number;
    seamlessSeekTimer!: number;
    constructor(private player: Player) {
        this.globalEvents();
    }

    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
    }

    _reloadMediaSource(obj: any) {
        const that = this;
        const seekTime = that.player.videoTime;
        obj = Object(obj);
        that.quality(that.player.videoQuality, function (status: any) {
            if (status) {
                that.player.controller.clearTimeMark();
                if (seekTime) {
                    that.player.seek(seekTime);
                }
                typeof obj.doneCallback === 'function' && obj.doneCallback(obj);
            } else {
                if (--that.player.errorHandler.errorRetry > 0) {
                    setTimeout(function () {
                        that._reloadMediaSource(obj);
                    }, 1000);
                } else {
                    obj.showSuccess = true;
                    typeof obj.failCallback === 'function' && obj.failCallback(obj);
                }
            }
        });
    }

    /**
     * @param advanceEffect 是否启用杜比音效
     */
    quality(value: any, callback?: Function) {
        const that = this;
        this.player.playerQualityChanging = true;

        if (
            this.player.dashPlayer &&
            !this.player.isSvipQuality(this.player.videoRealQuality) &&
            !this.player.isSvipQuality(value)
        ) {
            if (Number(value) === 0) {
                this.player.dashPlayer['setAutoSwitchQualityFor']('video', true);
                this.player.dashPlayer['setAutoSwitchQualityFor']('audio', true);
                // const isLogin = Boolean(getCookie('DedeUserID'));
                // if (!isLogin) {
                //     this.player.dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNeedLogin);
                // } else {
                this.player.dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNormal);
                // }
                this.player.videoQuality = value;
                value = this.player.videoRealQuality;
                this.player.playerQualityChanging = false;
                that.player._setVideoQuality(value);
                callback?.(true);
            } else {
                this.player.dashPlayer['setAutoSwitchQualityFor']('audio', false);
                this.player.dashPlayer['setAutoSwitchQualityFor']('video', false)
                ['setQualityFor']('video', value)
                    .then(() => {
                        this.player.playerQualityChanging = false;
                        that.player._setVideoQuality(value);
                        this.player.videoQuality = value;
                        callback?.(true);
                    })
                    .catch((result: any) => {
                        this.player.playerQualityChanging = false;
                        if (
                            result &&
                            result['msg'] &&
                            result['msg'].indexOf('Set quality equal current quality') > -1
                        ) {
                            that.player._setVideoQuality(value);
                            this.player.videoQuality = value;
                            callback?.(true);
                        } else {
                            callback?.(false);
                        }
                    });
            }
            return true;
        }

        // 切换至杜比视界清晰度且支持杜比音效时，强制开启杜比音效
        if (value === 126 && this.player.dolbyEffectType) {
            this.changeSvipVideo(value, 1, callback);
        } else {
            this.changeSvipVideo(value, undefined, callback);
        }
    }

    changeSvipVideo(value: number, advanceEffect = this.player.dolbyEffectOpend ? 1 : this.player.flacEffectOpened ? 2 : 0, callback?: Function) {
        const that = this;

        if (!this.player.initialized) {
            this.player.loadingpanel.reset(2);
            this.player.loadingpanel.reset(3);
            this.player.loadingpanel.ready(2);
        }
        const resolveParams: any = {
            domain:
                this.player.config.seasonType >= 1
                    ? Resolve.domains.bangumi
                    : this.player.config.playerType === 1
                        ? Resolve.domains.bangumiS
                        : Resolve.domains.interface,
            enableSSLResolve: this.player.config.enableSSLResolve,
            enableSSLStream: this.player.config.enableSSLStream,
            cid: this.player.config.cid,
            episodeId: this.player.config.episodeId,
            quality: value,
            type: this.player.allowFlv ? '' : 'mp4',
            extra_params: this.player.config.extraParams,
            player: this.player,
        };

        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&qn=${resolveParams.quality}`;
        } else {
            resolveParams.extra_params = `qn=${resolveParams.quality}`;
        }
        if (that.player.config.seasonType) {
            if (!getSearchParam('season_type', `?${resolveParams.extra_params}`)) {
                resolveParams.extra_params += `&season_type=${that.player.config.seasonType}`;
            }
        }
        let fnval = this.player.getFnval();
        // only UGC and MSE supported browser can use dashplayer
        resolveParams.fnver = 0;
        resolveParams.fnval = fnval;
        resolveParams.session = that.player.session;
        if (resolveParams.extra_params) {
            resolveParams.extra_params += `&fnver=0&fnval=${fnval}`;
        } else {
            resolveParams.extra_params = `fnver=0&fnval=${fnval}`;
        }
        if (this.player.window.typeid) {
            resolveParams.extra_params += `&tid=${this.player.window.typeid}`;
        }
        that.player.trigger(STATE.EVENT.VIDEO_PLAYURL_LOAD);
        Resolve.r(
            resolveParams,
            function (result: any) {
                if (that.player.destroyed) {
                    return;
                }
                result = that.player.transformQuality(result);
                that.player.backupURLIndex = 0;
                that.player.eventLog.log('\r\n' + JSON.stringify(result) + '\r\n', 3);
                that.player.errorHandler.hideErrorMsg();
                that.player.controller.clearTimeMark();
                if (result !== undefined && result.mediaDataSource !== null) {
                    const currentQuality = result.quality;
                    if (value !== 0 && currentQuality && value !== currentQuality) {
                        that.player.playerQualityChanging = false;
                        callback?.(false);
                        return false;
                    }
                    if (!that.player.initialized) {
                        that.player.loadingpanel.complete(2, true);
                    }
                    that.player.trigger(STATE.EVENT.VIDEO_PLAYURL_LOADED);
                    that.player.currentStreamType = result.streamType;
                    that.player.flushExtraParams();
                    const unpaid = that.player.unpaid(result.isPreview);
                    const noauth =
                        (Number(result.vipType) === 0 || Number(result.vipStatus) !== 1) &&
                        Number(result.bp) !== 1 &&
                        !result.hasPaid;
                    that.player._setVideoQuality(result.quality);
                    that.player.controller.updateQuality(result, value);

                    let seekType = 'range';

                    that.player.videoQuality = parseInt(<any>value, 10);
                    that.player.mediaDataSource = result.mediaDataSource;
                    if (result.mediaDataSource['type'] === 'flv') {
                        const segments = result.mediaDataSource['segments'];
                        for (let i = 0; i < segments.length; i++) {
                            if (segments[i]['url'].match(/\/ws\.acgvideo\.com\//)) {
                                // ws.acgvideo.com: Use param seek (bstart/bend)
                                seekType = 'param';
                                break;
                            }
                        }
                    }
                    that.player.userLoadedCallback(() => {
                        that.player.previewToast(result);
                    });

                    let video: HTMLVideoElement, pipMode: boolean;
                    // 画中画模式下采用video标签复用
                    if (
                        document['pictureInPictureElement'] === that.player.video ||
                        that.player.video['webkitPresentationMode'] === 'picture-in-picture'
                    ) {
                        pipMode = true;
                        try {
                            that.player.flvPlayer!['_emitter']['removeAllListeners']('statistics_info');
                        } catch (e) { }
                        if (that.player.dashPlayer) {
                            that.player.dashPlayer['destroy']();
                            that.player.dashPlayer = <any>null;
                        }
                        if (that.player.flvPlayer) {
                            that.player.flvPlayer['destroy']();
                            that.player.flvPlayer = <any>null;
                        }
                        video = that.player.video;
                        that.player.videoReuse = true;
                    } else {
                        // 非画中画模式保持无缝切换
                        pipMode = false;
                        video = document.createElement('video');
                        that.player.videoReuse = false;
                    }
                    const currentTime = that.player.flvPlayer
                        ? that.player.flvPlayer['currentTime']
                        : that.player.videoTime;
                    // let lastCurrentTime;
                    const lastStatus = that.player.controller.getLastState();
                    let used = false;

                    const playerType = result.mediaDataSource['type'];
                    let changePlayer: any;
                    if (result.mediaDataSource['type'] === 'dash') {
                        that.player.trigger(STATE.EVENT.VIDEO_METADATA_LOAD);
                        let defaultAudioQuality;
                        if (advanceEffect === 1) {
                            defaultAudioQuality =
                                Number(
                                    result.mediaDataSource['url']?.dolby?.audio?.[0]?.id ||
                                    result.mediaDataSource['url']?.audio?.[0]?.id,
                                ) || 30280;
                        } else if (advanceEffect === 2) {
                            that.player.set('setting_config', 'audioHiRes', true);
                            defaultAudioQuality =
                                Number(
                                    result.mediaDataSource['url']?.flac?.audio?.id ||
                                    result.mediaDataSource['url']?.audio?.[0]?.id,
                                ) || 30280;
                        } else {
                            defaultAudioQuality = Number(result.mediaDataSource['url']?.audio?.[0]?.id) || 30280;
                        }
                        const dashPlayer = (window['dashPlayer'] = new window['DashPlayer'](video, {
                            defaultVideoQuality: currentQuality,
                            defaultAudioQuality,
                            enableHEVC: true,
                            enableAV1: true,
                            isAutoPlay: false,
                            isDynamic: false,
                            abrStrategy: window['DashPlayer']['STRING']['ABR_DYNAMIC'],
                            stableBufferTime: that.player.getDynamicBuffer()[0],
                            // DRM fields
                            protectionDataSet: result.mediaDataSource.protection?.protectionData,
                            ignoreEmeEncryptedEvent: result.mediaDataSource.protection?.ignoreEmeEncryptedEvent
                        }));
                        dashPlayer['initialize'](result.mediaDataSource['url'])
                            .then(() => {
                                that.player.trigger(STATE.EVENT.VIDEO_METADATA_LOAD);
                                if (that.player.videoQuality === 0) {
                                    dashPlayer['setAutoSwitchQualityFor']('audio', true);
                                    dashPlayer['setAutoSwitchQualityFor']('video', true);
                                }
                                // const isLogin = Boolean(getCookie('DedeUserID'));
                                // if (!isLogin) {
                                //     dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNeedLogin);
                                // } else {
                                dashPlayer['setAutoSwitchTopQualityFor']('video', gtQualityNormal);
                                // }
                                // const dashCorePlayer = dashPlayer && dashPlayer['getCorePlayer']();
                                // dashCorePlayer &&
                                //     dashCorePlayer['setBufferAheadToKeep'](that.player.getDynamicBuffer()[5]);
                                dashPlayer['seek'](currentTime || 0);
                            })
                            .catch(() => {
                                that.player.errorHandler.videoErrorHandler(4000, 'dashPlayer initializing error.');
                            });
                        that.player.dashEventHandler.registerDashPlayerEvents(dashPlayer);
                        that.player.state.video_type = 3;

                        if (dashPlayer?.getCurrentCodecID('video') === PLAYER_CODEC_ID.HEVC_CODEC_ID) {
                            that.player.state.video_type = 4;
                        } else if (dashPlayer?.getCurrentCodecID('video') === PLAYER_CODEC_ID.AV1_CODEC_ID) {
                            // 5 为wasm播放器不用管
                            that.player.state.video_type = 6;
                        }
                        changePlayer = dashPlayer;
                    } else {
                        const config = {
                            enableWorker: false,
                            stashInitialSize: 1024 * 64,
                            accurateSeek: true,
                            seekType: seekType || 'param',
                            rangeLoadZeroStart: false,
                            lazyLoadMaxDuration: 100,
                            lazyLoadRecoverDuration: 50,
                            deferLoadAfterSourceOpen: false,
                            fixAudioTimestampGap: false,
                            reuseRedirectedURL: true,
                        };

                        if (
                            browser.version.safari ||
                            browser.version.edge ||
                            browser.version.trident
                        ) {
                            config['enableWorker'] = false;
                            // Safari/Edge/IE use RangeLoader, set 2 min lazyLoad
                            config['lazyLoadMaxDuration'] = 100;
                        }

                        that.player.trigger(STATE.EVENT.VIDEO_METADATA_LOAD);
                        const flvPlayer = window['flvjs']['createPlayer'](result.mediaDataSource, <any>config);
                        that.player.flvEventHandler.registerFlvPlayerEvents(flvPlayer);

                        flvPlayer['currentTime'] = video.duration
                            ? Math.min(video.duration - 0.5, currentTime || 0)
                            : currentTime || 0;

                        flvPlayer['attachMediaElement'](video);
                        flvPlayer['load']();

                        if (flvPlayer['type'] === 'FlvPlayer') {
                            that.player.state.video_type = 1;
                        } else {
                            that.player.state.video_type = 2;
                        }
                        changePlayer = flvPlayer;
                    }
                    video.volume =
                        typeof that.player.video.volume !== 'undefined'
                            ? that.player.video.volume
                            : that.player.videoSettings['video_status']['volume'] || 0.67;
                    if (!that.player.initialized) {
                        that.player.loadingpanel.ready(3);
                    }
                    try {
                        let seamlessSymbol: any;
                        if (!pipMode) {
                            $(video).appendTo(that.player.template.videoWrp).addClass('seamless');
                        }
                        that.player.controller.setVideoSize();
                        // lastCurrentTime = that.flvPlayer ? that.flvPlayer['currentTime'] : (that.videoTime || 0);
                        if (lastStatus !== STATE.V_PLAY) {
                            that.seamlessPauseTimer = that.player.window.setTimeout(function () {
                                if (used) {
                                    return false;
                                } else {
                                    that.player.reloadMedia._setVideoWrap(video, changePlayer, pipMode, playerType);
                                    used = true;
                                    callback?.(true);
                                }
                            }, 5000); // 切清晰度5s后提示成功（预防长时间等待）
                            $(video).on('canplay', function () {
                                if (used) {
                                    return false;
                                } else {
                                    clearTimeout(that.seamlessPauseTimer);
                                    that.player.reloadMedia._setVideoWrap(video, changePlayer, pipMode, playerType);
                                    used = true;
                                    callback?.(true);
                                }
                            });
                        } else {
                            that.seamlessPlayTimer = that.player.window.setTimeout(function () {
                                if (used) {
                                    return false;
                                } else {
                                    const seekTarget =
                                        that.player.currentTime(that.player.video, true) ||
                                        that.player.videoTime - that.player.getTimeOffset() ||
                                        0;
                                    clearTimeout(that.seamlessSeekTimer);
                                    if (playerType === 'dash') {
                                        changePlayer['seek'](seekTarget);
                                    } else {
                                        let duration = video.duration;
                                        if (duration) {
                                            changePlayer['currentTime'] = Math.min(duration - 0.5, seekTarget);
                                        } else {
                                            changePlayer['currentTime'] = seekTarget;
                                        }
                                    }
                                    video.play();
                                    that.player.reloadMedia._setVideoWrap(video, changePlayer, pipMode, playerType);
                                    used = true;
                                    callback?.(true);
                                }
                            }, 5000);
                            $(video).on('loadedmetadata', function () {
                                // fake seamless link, canplaythrough doesn't work, when setting currentTime it must have a little time to prepare..
                                if (used) {
                                    return false;
                                } else {
                                    used = true;
                                    seamlessSymbol = true;
                                    const seekTarget =
                                        that.player.currentTime(that.player.video, true) ||
                                        that.player.videoTime - that.player.getTimeOffset() ||
                                        0;
                                    if (playerType === 'dash') {
                                        changePlayer['seek'](seekTarget + 3);
                                    } else {
                                        let duration = video.duration;
                                        if (duration) {
                                            changePlayer['currentTime'] = Math.min(duration - 0.5, seekTarget + 3);
                                        } else {
                                            changePlayer['currentTime'] = seekTarget + 3;
                                        }
                                    }
                                }
                            });
                            $(video).on('seeked', function () {
                                if (seamlessSymbol && !that.player.destroyed) {
                                    seamlessSymbol = false;
                                    clearTimeout(that.seamlessPlayTimer);
                                    const seekTime =
                                        that.player.currentTime(that.player.video, true) ||
                                        that.player.videoTime - that.player.getTimeOffset() ||
                                        0;
                                    that.seamlessSeekTimer = that.player.window.setTimeout(function () {
                                        if (that.player.destroyed) {
                                            return;
                                        }
                                        // console.debug('result:' + video['currentTime'] * 1000, that.flvPlayer['currentTime'] * 1000);
                                        const seekTarget =
                                            that.player.currentTime(that.player.video, true) ||
                                            that.player.videoTime - that.player.getTimeOffset() ||
                                            0;
                                        if (that.player.controller.getLastState() !== STATE.V_PAUSE) {
                                            video.play();
                                        } else {
                                            if (playerType === 'dash') {
                                                changePlayer['seek'](seekTarget);
                                            } else {
                                                let duration = video.duration;
                                                if (duration) {
                                                    changePlayer['currentTime'] = Math.min(duration - 0.5, seekTarget);
                                                } else {
                                                    changePlayer['currentTime'] = seekTarget;
                                                }
                                            }
                                        }
                                        that.player.reloadMedia._setVideoWrap(video, changePlayer, pipMode, playerType);
                                        callback?.(true);
                                    }, video['currentTime'] * 1000 - seekTime * 1000);
                                }
                            });
                        }
                    } catch (e) {
                        callback?.(false);
                    }
                } else {
                    if (!that.player.initialized) {
                        that.player.loadingpanel.complete(2, false);
                    }
                    that.player.playerQualityChanging = false;
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYURL_ERROR,
                        that.player.config.seasonType >= 1
                            ? STATE.PLAYURL_BANGUMI_RESOLVE_ERROR
                            : STATE.PLAYURL_RESOLVE_ERROR,
                    );
                    callback?.(false);
                }
            },
            function (type: any, error: any, playurl: any) {
                if (that.player.destroyed) {
                    return;
                }
                const errorTypes = Resolve.errorTypes;
                that.player.playerQualityChanging = false;
                if (/JSON/.test(error)) {
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYURL_ERROR,
                        that.player.config.seasonType >= 1
                            ? STATE.PLAYURL_BANGUMI_FORM_ERROR
                            : STATE.PLAYURL_FORM_ERROR,
                        (error ? 'status:' + error + ',' : '') + 'url:' + playurl,
                    );
                } else if (type === errorTypes.resolve) {
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYURL_ERROR,
                        that.player.config.seasonType >= 1
                            ? STATE.PLAYURL_BANGUMI_RESOLVE_ERROR
                            : STATE.PLAYURL_RESOLVE_ERROR,
                        (error ? 'status:' + error + ',' : '') + 'url:' + playurl,
                    );
                } else {
                    // errorTypes.network
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYURL_ERROR,
                        that.player.config.seasonType >= 1
                            ? STATE.PLAYURL_BANGUMI_NETWORK_ERROR
                            : STATE.PLAYURL_NETWORK_ERROR,
                        'error_type:' +
                        (that.player.option('enable_ssl_resolve') === 1 ? 'https' : 'http') +
                        (error ? ',status:' + error + ',' : ',') +
                        'url:' +
                        playurl,
                    );
                    if (
                        that.player.option('enable_ssl_resolve') === true &&
                        that.player.window.location.protocol === 'http:'
                    ) {
                        that.player.option('enable_ssl_resolve', false);
                        that.quality(value, callback);
                        return false;
                    }
                }
                callback?.(false);
            },
        );
    }

    callNextPart(options: any, defaultCallback: Function | null, immediately?: boolean) {
        const that = this;
        this.player.initPartmanager().load(
            options,
            function (item: any) {
                if (that.player.controller.getContainerFocus()) {
                    that.player.keepFocus = true;
                }
                that.player.config.autoShift = true;
                if (that.player.playlistNoView) {
                    that.player.playlistNoView.cidLoader(item.aid, item.cid, item.bvid);
                } else if (that.player.playlist) {
                    that.player.playlist.cidLoader(item.aid, item.cid, item.bvid);
                } else {
                    that.cidLoader(item);
                }
            },
            defaultCallback!,
            immediately!,
        );
    }

    beforeNext(item: any) {
        if (this.player.config.type === ContentType.Pugv) {
            const info = this.player.user.status();
            if (Number(item.badgeType) === 2 && info && info.pugv_pay_status === 2) {
                this.player.exitFullScreen();
                this.player.reloadMedia.tellPage(item.p, item.aid, item.cid, item.bvid);
                this.player.controller.noKeyDowm = true;
                return true;
            }
        }
        return false;
    }
    /**
     * @desc config - 参数同初始化播放器传进来的 config
     */
    cidLoader(config: any) {
        if (this.beforeNext(config)) {
            return;
        }
        const that = this;
        that.player.pause();
        if (config.isPremiere || browser.version.safari) {
            that.player.destroy(undefined, false);
        } else {
            that.player.destroy();
        }
        if (that.player.config.aid !== config.aid || that.player.config.bvid !== config.bvid) {
            that.clearConfigByDiffAid();
        }
        if (!that.player.config.show_bv) {
            delete config.bvid;
        }
        config.recommendAutoPlay = config.recommendAutoPlay ?? false;
        $.extend(that.player.config, config, {
            autoplay: true,
            isAudio: !config.cid,
        });
        if (!config.cid) {
            // @ts-ignore
            that.player.config.cid = null;
        }
        that.player.playlistLimit = config.playlistLimit;
        that.player._init(that.player.state, true);
        that.player.window['aid'] = that.player.config.aid;
        that.player.window['cid'] = that.player.config.cid;
        that.player.window['bvid'] = that.player.config.bvid;
        if (Number(that.player.config.seasonType) >= 1) {
            typeof that.player.window['bangumiCallNext'] === 'function' &&
                that.player.window['bangumiCallNext'](that.player.config.episodeId);
            // debug
            that.player.window['season_id'] = that.player.config.seasonId;
            that.player.window['episode_id'] = that.player.config.episodeId;
        } else {
            delete that.player.window['season_id'];
            delete that.player.window['episode_id'];
        }
        that.tellPage(
            that.player.config.p,
            that.player.config.aid,
            that.player.config.cid,
            that.player.config.bvid,
            that.player.config.recommendAutoPlay,
        );
    }

    tellPage(p: number | false, aid: any, cid: any, bvid: string, isRecommendPlay?: boolean) {
        if (typeof this.player.window['callAppointPart'] === 'function') {
            try {
                this.player.window['callAppointPart'](
                    p,
                    {
                        aid,
                        cid,
                        bvid,
                    },
                    isRecommendPlay,
                );
            } catch (e) { }
        }
    }
    _setVideoWrap(video: any, changePlayer: any, pipMode: boolean, type?: any) {
        this.player.trigger(STATE.EVENT.VIDEO_METADATA_LOADED); // no precise time in seamless change
        if (!pipMode) {
            $(this.player.video).remove();
            $(video).removeClass('seamless');
        }
        this.player.settingPanel.panoramicManager &&
            this.player.settingPanel.panoramicManager.updateTexture(video);
        if (type === 'dash') {
            this.player.getVideoInfo().update(VideoInfoData.generateVideoInfoItems('DashPlayer'));
        } else {
            this.player.getVideoInfo().update(VideoInfoData.generateVideoInfoItems(changePlayer['type']));
        }
        if (!pipMode) {
            try {
                this.player.flvPlayer!['_emitter']['removeAllListeners']('statistics_info');
            } catch (e) { }
            if (this.player.dashPlayer) {
                this.player.dashPlayer['destroy']();
                this.player.dashPlayer = <any>null;
            }
            if (this.player.flvPlayer) {
                this.player.flvPlayer['destroy']();
                this.player.flvPlayer = <any>null;
            }
        }
        if (type === 'dash') {
            this.player.dashPlayer = changePlayer;
        } else {
            this.player.flvPlayer = changePlayer;
        }
        this.player._videoEventListener(video);
        this.player.playerQualityChanging = false;
    }

    clearTimer() {
        this.seamlessPauseTimer && clearTimeout(this.seamlessPauseTimer);
        this.seamlessPlayTimer && clearTimeout(this.seamlessPlayTimer);
        this.seamlessSeekTimer && clearTimeout(this.seamlessSeekTimer);
    }

    clearConfigByDiffAid() {
        // clear interactive symbol tmp
        this.player.interactive = undefined;
        this.player.interactiveVideoConfig = undefined;
        this.player.config.interactiveNode = undefined;
        this.player.config.interactivePreview = undefined;
        this.player.config.interactiveGraphId = undefined;
    }

    private destroy() {
        this.clearTimer();
    }
}
