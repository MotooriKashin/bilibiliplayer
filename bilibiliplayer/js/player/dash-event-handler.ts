import Player from '../player';
import VideoInfoData from './video-info-data';
import STATE from './state';

export class DashEventHandler {
    private errorSymbol!: boolean;
    private prevHost!: string;

    constructor(private player: Player) {
        this.onDashHttpRequestEnded = this.onDashHttpRequestEnded.bind(this);
        this.onDashHttpHeaderReceived = this.onDashHttpHeaderReceived.bind(this);
        this.onDashAudioFrameDecoded = this.onDashAudioFrameDecoded.bind(this);
        this.onDashVideoFrameDecoded = this.onDashVideoFrameDecoded.bind(this);
        this.onDashVideoFrameLoaded = this.onDashVideoFrameLoaded.bind(this);
        this.onDashSourceDurationChanged = this.onDashSourceDurationChanged.bind(this);
        this.onQuotaExceeded = this.onQuotaExceeded.bind(this);
        this.onDashP2pLoadInfo = this.onDashP2pLoadInfo.bind(this);
    }

    registerDashPlayerEvents(dashPlayer: any) {
        const that = this;
        dashPlayer['on'](window['DashPlayer']['EVENTS']['ERROR'], (evt: any) => {
            if (this.errorSymbol) {
                return true;
            }

            if (typeof dashPlayer.updateSource === 'function') {
                this.errorSymbol = true;
                this.player
                    .updateSource(window['DashPlayer']['EVENTS']['ERROR'])
                    .then(() => {
                        this.errorSymbol = false;
                    })
                    .catch(() => {
                        this.player.errorHandler.videoErrorHandler(evt['code'], evt['msg']);
                    });
            } else {
                this.player.errorHandler.videoErrorHandler(evt['code'], evt['msg']);
            }
        });

        dashPlayer['on'](
            window['DashPlayer']['EVENTS']['VIDEO_INFO'],
            (evt: { mediaInfo: any/*DashPlugin.IMediaInfo*/; statisticsInfo: any/*DashPlugin.IStatisticsInfo*/ }) => {
                const mediaInfo = evt['mediaInfo'];
                if (Object.keys(mediaInfo).length === 0) {
                    return;
                }

                const data = VideoInfoData.updateVideoInfoData('DashPlayer', evt['mediaInfo'], evt['statisticsInfo']);

                if (that.player.getVideoInfo() && !that.player.playerQualityChanging) {
                    that.player.getVideoInfo().refresh(data);
                }
            },
        );
        dashPlayer['on'](
            window['DashPlayer']['EVENTS']['QUALITY_CHANGE_RENDERED'],
            (evt: any/*DashPlugin.IQualityChangedData*/) => {
                if (evt['isAutoSwitch'] && evt['mediaType'] === 'video' && !isNaN(evt['oldQuality']!)) {
                    that.player.videoRealQuality = evt['newQualityNumber']!;
                    const info: any = dashPlayer['getQualityList'](evt['mediaType'])[evt['newQuality']!];

                    that.player.controller &&
                        that.player.controller.quality &&
                        that.player.controller.quality.setAutoQualityText(that.player.videoRealQuality);
                }
            },
        );
        dashPlayer['on'](
            window['DashPlayer']['EVENTS']['QUALITY_CHANGE_REQUESTED'],
            (evt: any/* DashPlugin.IQualityChangedData*/) => {
                if (evt['isAutoSwitch'] && evt['mediaType'] === 'video') {
                    that.player.videoRealQuality = evt['newQualityNumber']!;
                }
            },
        );
        const dashCorePlayer = dashPlayer['getCorePlayer']();
        const createdTime = dashCorePlayer['getInitializeDate']().getTime();
        dashCorePlayer['on'](window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_ABANDONED'], this.onDashHttpRequestEnded);
        dashCorePlayer['on'](window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'], this.onDashHttpRequestEnded);
        dashCorePlayer['on'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_HEADER_RECEIVED'],
            this.onDashHttpHeaderReceived,
        );
        dashPlayer['on'](window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'], this.onDashVideoFrameLoaded);
        dashCorePlayer['on'](window['DashPlayer']['EVENTS']['QUOTA_EXCEEDED'], this.onQuotaExceeded);
        dashCorePlayer['on'](window['DashPlayer']['EVENTS']['FRAGMENT_P2P_LOAD_INFO'], this.onDashP2pLoadInfo);
        dashCorePlayer['on'](
            window['DashPlayer']['EVENTS']['APPENDED_NEXT_SOURCE_DURATION_CHANGED'],
            this.onDashSourceDurationChanged,
        );
        if (!this.player.firstAudioFrameReported) {
            dashCorePlayer['on'](
                window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
                this.onDashAudioFrameDecoded,
            );
        }
        if (!this.player.firstVideoFrameReported) {
            dashCorePlayer['on'](
                window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
                this.onDashVideoFrameDecoded,
            );
        }
        if (createdTime >= this.player.createdTime) {
            dashCorePlayer['on'](window['DashPlayer']['EVENTS']['SOURCE_INITIALIZED'], function reporter() {
                dashCorePlayer['off'](window['DashPlayer']['EVENTS']['SOURCE_INITIALIZED'], reporter);
            });
        }
        this.player.userLoadedCallback(status => {
            if (
                status.pcdn_loader &&
                status.pcdn_loader.dash &&
                status.pcdn_loader.dash.vendor &&
                status.pcdn_loader.dash.group
            ) {
                try {
                    dashCorePlayer.setP2pType(
                        status.pcdn_loader.dash.vendor + '-' + status.pcdn_loader.dash.group,
                        status.pcdn_loader.dash.script_url,
                    );
                } catch (e) {
                    console.debug(e);
                }
            }
        });
    }

    unregisterDashPlayerEvent(dashPlayer: any) {
        const dashCorePlayer = dashPlayer['getCorePlayer']();
        if (!dashCorePlayer) {
            return;
        }
        dashCorePlayer['off'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_ABANDONED'],
            this.onDashHttpRequestEnded,
        );
        dashCorePlayer['off'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
            this.onDashHttpRequestEnded,
        );
        dashCorePlayer['off'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_HEADER_RECEIVED'],
            this.onDashHttpHeaderReceived,
        );
        dashCorePlayer['off'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
            this.onDashAudioFrameDecoded,
        );
        dashCorePlayer['off'](
            window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
            this.onDashVideoFrameDecoded,
        );
        dashPlayer['off'](window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'], this.onDashVideoFrameLoaded);
        dashCorePlayer['off'](window['DashPlayer']['EVENTS']['QUOTA_EXCEEDED'], this.onQuotaExceeded);
        this.errorSymbol = false;
    }

    onDashHttpRequestEnded(e: any) {
        const bytesLoaded: number = e['request']['bytesLoaded'];
        if (bytesLoaded) {
            this.player.totalReceivedBytes.push(bytesLoaded);
            // this.track && this.track.trackInfoPush('http_received_bytes', String(bytesLoaded));
        }
    }

    onDashHttpHeaderReceived(e: any) {

        // const requestStartDate = e['request']['requestStartDate'];
        // const headersReceivedDate = e['request']['headersReceivedDate'];
        // if (requestStartDate && headersReceivedDate) {
        //     this.player.track &&
        //         this.player.track.trackInfoPush(
        //             'http_connection_time',
        //             String(headersReceivedDate.getTime() - requestStartDate.getTime()),
        //         );
        // }
    }

    onDashAudioFrameDecoded(e: any) {
        const index: number = e['request']['index'];
        const mediaType: string = e['request']['mediaType'];
        if (index === 1 && mediaType === 'audio' && this.player.dashPlayer) {
            const dashCorePlayer = this.player.dashPlayer['getCorePlayer']();
            const initializeDate = dashCorePlayer['getInitializeDate']();
            const requestEndDate = e['request']['requestEndDate'];

            dashCorePlayer['off'](
                window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
                this.onDashAudioFrameDecoded,
            );
            this.player.firstAudioFrameReported = true;
        }
    }

    onDashVideoFrameDecoded(e: any) {
        const index: number = e['request']['index'];
        const mediaType: string = e['request']['mediaType'];
        if (index === 1 && mediaType === 'video' && this.player.dashPlayer) {
            const dashCorePlayer = this.player.dashPlayer['getCorePlayer']();
            const initializeDate = dashCorePlayer['getInitializeDate']();
            const requestEndDate = e['request']['requestEndDate'];

            dashCorePlayer['off'](
                window['DashPlayer']['EVENTS']['FRAGMENT_LOADING_COMPLETED'],
                this.onDashVideoFrameDecoded,
            );
            this.player.firstVideoFrameReported = true;
        }
    }

    onDashVideoFrameLoaded(e: any) {
        const index: number = e['index'];
        const mediaType: string = e['mediaType'];
        const qn: number = e['qn'];
        if (index >= 0 && this.player.dashPlayer) {
            this.AddIndex(String(`${index}-${qn}`), mediaType);
        }

        if (<Number>this.player?.currentTime() > 5 && e.mediaType === 'video') {
            const host = /^http(s)?:\/\/(.*?)\//.exec(e.url);
            if (host && host[2]) {
                if (!this.prevHost) {
                    this.prevHost = host[2];
                } else if (this.prevHost !== host[2]) {
                    this.prevHost = host[2];
                }
            }
        }
    }

    onDashP2pLoadInfo(e: any) {
        const loadInfo: any = e['p2pLoadInfo'];
        for (const key in loadInfo) {
            this.player.p2pLoadInfo[key] = this.player.p2pLoadInfo[key]
                ? this.player.p2pLoadInfo[key] + loadInfo[key]
                : loadInfo[key];
        }
    }

    onDashSourceDurationChanged(e: any) {
        this.player.controller &&
            this.player.controller.progressBar &&
            this.player.controller.progressBar.updateVideoTime(this.player.currentTime()!, this.player.duration());
        this.player.trigger(STATE.EVENT.VIDEO_MEDIA_ENDED);
    }

    private AddIndex(value: string, mediaType: string) {
        if (mediaType === 'audio') {
            if (this.player.currentReceivedAudioIndex.indexOf(value) === -1) {
                this.player.currentReceivedAudioIndex.push(value);
            } else {
                this.player.repeatReceivedAudioIndex.push(value);
            }
        } else if (mediaType === 'video') {
            if (this.player.currentReceivedVideoIndex.indexOf(value) === -1) {
                this.player.currentReceivedVideoIndex.push(value);
            } else {
                this.player.repeatReceivedVideoIndex.push(value);
            }
        }
    }

    private onQuotaExceeded(e: any) {
        this.player.forceReportFeedback();
    }

    reportCanplaySpeed() {
        let averageThroughput = 0; // Unit: KiBps
        if (this.player.flvPlayer && this.player.flvPlayer['createdTime'] >= this.player.createdTime) {
            try {
                averageThroughput = this.player.flvPlayer['_transmuxer']['_controller']['_ioctl']['_speedSampler'][
                    'averageKBps'
                ];
            } catch (e) {
                averageThroughput = 0;
            }
        }
        if (this.player.dashPlayer) {
            const dashCorePlayer = this.player.dashPlayer['getCorePlayer']();
            const dashPlayerCreatedTime = dashCorePlayer['getInitializeDate']().getTime();
            if (dashPlayerCreatedTime >= this.player.createdTime) {
                const vkbps = dashCorePlayer['getAverageThroughput']('video'); // number
                const akbps = dashCorePlayer['getAverageThroughput']('audio'); // number
                if (vkbps && akbps) {
                    averageThroughput = ((vkbps + akbps) * 1000) / 1024 / 8 / 2;
                }
                if (vkbps) {
                    averageThroughput = (vkbps * 1000) / 1024 / 8;
                }
                if (akbps) {
                    averageThroughput = (akbps * 1000) / 1024 / 8;
                }
            }
        }
    }

    reportTotalReceivedBytes() {
        this.player.totalReceivedBytes = [];
    }

}
