import Player from '../player';
import VideoInfoData from './video-info-data';
import STATE from './state';

export class FlvEventHandler {
    constructor(private player: Player) { }

    registerFlvPlayerEvents(flvPlayer: any, registerDiffReport?: boolean) {
        flvPlayer['on'](window['flvjs']['Events']['HTTP_REQUEST_ENDED'], (totalBytes: number, requestUrl: string) => {
            this.player.totalReceivedBytes.push(totalBytes);
        });

        if (!this.player.firstAudioFrameReported) {
            flvPlayer['one'](window['flvjs']['Events']['AUDIO_FRAME_DECODED'], (timestamp: number) => {
                this.player.firstAudioFrameReported = true;
            });
        }
        if (!this.player.firstVideoFrameReported) {
            flvPlayer['one'](window['flvjs']['Events']['VIDEO_FRAME_DECODED'], (timestamp: number) => {
                this.player.firstVideoFrameReported = true;
            });
        }

        flvPlayer['on'](
            window['flvjs']['Events']['ERROR'],
            this.player.errorHandler.videoOnError.bind(this.player.errorHandler),
        );
        flvPlayer['on'](window['flvjs']['Events']['RECOVERED_EARLY_EOF'], this._videoOnRecoveredEarlyEof.bind(this));
        flvPlayer['on']('statistics_info', (statInfo: any) => {
            const mediaInfo = flvPlayer['mediaInfo'];
            if (Object.keys(mediaInfo).length === 0) {
                return;
            }
            const data = VideoInfoData.updateVideoInfoData(flvPlayer['type'], mediaInfo, statInfo);
            if (this.player.getVideoInfo() && !this.player.playerQualityChanging) {
                this.player.getVideoInfo().refresh(data);
            }
        });

        if (registerDiffReport) {
            flvPlayer['on']('statistics_info', (statInfo: any) => {
                this.player.flvEventHandler.reportDiffSegmentSize(flvPlayer, statInfo);
            });
        }

        this.player.userLoadedCallback(status => {
            if (
                status.pcdn_loader &&
                status.pcdn_loader.flv &&
                status.pcdn_loader.flv.vendor &&
                status.pcdn_loader.flv.group
            ) {
                try {
                    flvPlayer.setP2pType(
                        status.pcdn_loader.flv.vendor + '-' + status.pcdn_loader.flv.group,
                        status.pcdn_loader.flv.script_url,
                    );
                } catch (e) { }
            }
        });
    }

    reportDiffSegmentSize(flvPlayer: any, statInfo: any) {
        if (!flvPlayer || !statInfo || this.player.playerQualityChanging) {
            return;
        }
        const sIndex = statInfo['currentSegmentIndex'];
        const metadata = flvPlayer['mediaInfo'] && flvPlayer['mediaInfo']['metadata'];
        const segments = flvPlayer['_mediaDataSource'] && flvPlayer['_mediaDataSource']['segments'];

        /**
         * 此条件优先判断
         * 记录所有的 metadata.filesize，同一 metadata.filesize 只走一遍这个函数
         */
        if (metadata && metadata['filesize']) {
            const mfs: number = metadata['filesize'];
            if (this.player.segmentSizeMaps[mfs]) {
                return;
            } else {
                this.player.segmentSizeMaps[mfs] = true;
            }
        } else {
            return;
        }

        if (!Array.isArray(segments)) {
            return;
        }
        const segment = segments[sIndex];
        if (segment && segment['filesize'] && metadata['filesize']) {
            const reportParam = `${sIndex + 1},${segment['filesize']},${metadata['filesize']},${segment['url']}`;

            // filesize 相等不报
            if (segment['filesize'] === metadata['filesize']) {
                return;
            }

            // metadata.filesize 错乱不报
            for (let i = 0; i < segments.length; i++) {
                if (segments[i]['filesize'] === metadata['filesize']) {
                    return;
                }
            }

            // 不重复上报
            if (this.player.reportParamMaps[reportParam]) {
                return;
            }
            this.player.reportParamMaps[reportParam] = true;
        }
    }

    earlyEOFTrack(type: string, message: string) {
        if (message && message.indexOf('code = -1, msg = Fetch stream meet Early-EOF') > -1) {
            try {
                if (!this.player.earlyEOFTrackSymbol) {
                    this.player.earlyEOFTrackSymbol = true;
                }
            } catch (e) { }
        }
    }

    private _videoOnRecoveredEarlyEof() {
        const url = this.player.getPlayurl();
        this.player.trigger(
            STATE.EVENT.VIDEO_MEDIA_ERROR,
            STATE.VIDEO_ERROR,
            STATE.NETWORK_RECOVERED_EARLY_EOF,
            'url:' + url + ',message:RecoveredEarlyEof',
        );
    }
}
