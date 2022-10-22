import STATE from './state';
import Player from '../player';
import { getSearchParam, qualityMap } from '@shared/utils';

class ErrorHandler {
    errorMessage!: string | null;
    backupURLIndex = 0;
    errorRetry = 5;
    retryCount = 0;

    private player: Player;
    private retryTimer = 0;
    private retrySecond = 2000;
    private initialErrorRetry!: boolean;

    constructor(player: Player) {
        this.player = player;
    }

    videoOnError(errorType?: any, errorDetail?: any, info?: any) {
        const errorTypes = window['flvjs']['ErrorTypes'];
        const errorDetails = window['flvjs']['ErrorDetails'];

        let message = '[' + errorType + '] ' + errorDetail + ': ';
        if (info['code'] !== -1) {
            message += info['code'] + ' ';
        }
        message += info['msg'];

        let type;

        if (errorType === errorTypes['NETWORK_ERROR']) {
            switch (errorDetail) {
                case errorDetails['NETWORK_EXCEPTION']:
                    type = STATE.NETWORK_EXCEPTION;
                    break;
                case errorDetails['NETWORK_STATUS_CODE_INVALID']:
                    type = STATE.NETWORK_STATUS_CODE_INVALID;
                    break;
                case errorDetails['NETWORK_UNRECOVERABLE_EARLY_EOF']:
                    type = STATE.NETWORK_UNRECOVERABLE_EARLY_EOF;
                    break;
            }
        } else if (errorType === errorTypes['MEDIA_ERROR']) {
            switch (errorDetail) {
                case errorDetails['MEDIA_MSE_ERROR']:
                    type = STATE.MEDIA_MSE_ERROR;
                    break;
                case errorDetails['MEDIA_FORMAT_ERROR']:
                    type = STATE.MEDIA_FORMAT_ERROR;
                    break;
                case errorDetails['MEDIA_FORMAT_UNSUPPORTED']:
                    type = STATE.MEDIA_FORMAT_UNSUPPORTED;
                    break;
                case errorDetails['MEDIA_CODEC_UNSUPPORTED']:
                    type = STATE.MEDIA_CODEC_UNSUPPORTED;
                    break;
            }
        } else if (errorType === errorTypes['OTHER_ERROR']) {
            switch (errorDetail) {
                case errorDetails['ABNORMAL_SEGMENT_BYTELENGTH']:
                    type = STATE.ABNORMAL_SEGMENT_BYTELENGTH;
                    break;
            }
        }

        this.player.reloadMedia.clearTimer();
        this.videoErrorHandler(type, message);
    }

    videoErrorHandler(type: any, message: string) {
        const that = this;
        const url = this.player.getPlayurl();
        let finalMessage = message;
        if (STATE.ERROR_MESSAGES[<3104>type]) {
            finalMessage = STATE.ERROR_MESSAGES[<3104>type] + ' <span style="opacity: 0.5;">(' + message + ')</span>';
        }
        this.player.trigger(
            STATE.EVENT.VIDEO_MEDIA_ERROR,
            STATE.VIDEO_ERROR,
            type,
            'error_type:' + this.player.currentStreamType + ',url:' + url + ',message:' + message.replace(',', '.'),
        );
        // all error fallback to flv
        if (this.player.dashPlayer) {
            this.player.flvPlayer && this.player.flvPlayer['destroy']();
            this.player.flvPlayer = <any>null;
            if (this.player.dashPlayer) {
                this.player.dashEventHandler.unregisterDashPlayerEvent(this.player.dashPlayer);
                this.player.dashPlayer['destroy']();
            }
            this.player.dashPlayer = <any>null;
            window['dashPlayer'] = undefined;
            // if (type !== 4100) {
            //     this.player.config.dashSymbol = false;
            // }
            if (!this.player.initialized) {
                this.player.loadingpanel.complete(3, false, '<span style="opacity: 0.5;">' + finalMessage + '</span>');
                this.player.loadingpanel.reset(2);
                this.player.loadingpanel.reset(3);
            }
            window.setTimeout(function () {
                that.player.reloadMedia._reloadMediaSource({
                    failCallback: function (obj: any) {
                        that.showErrorMsg('重新连接服务器失败');
                        that.infiniteRetry(obj);
                    },
                    doneCallback: function (obj: any) {
                        if (!that.player.initialized) {
                            that.player.trigger(STATE.EVENT.VIDEO_MEDIA_CANPLAY);
                            that.player.loadingpanel.complete(3, true);
                        }
                        if (obj && obj.showSuccess) {
                            if (that.retryTimer) {
                                clearTimeout(that.retryTimer);
                            }
                            if (that.retrySecond !== 2000) {
                                that.retrySecond = 2000;
                            }
                            that.player.toast.addErrorInfo({
                                msg: '重新连接至服务器成功',
                                isSuccess: true,
                            });
                        }
                        that.player.play();
                    },
                });
            }, 1500);
            return true;
        }

        if (!this.player.initialized) {
            this.player.video.remove();
            this.player.flvPlayer && this.player.flvPlayer['destroy']();
            this.player.flvPlayer = <any>null;
            if (this.player.dashPlayer) {
                this.player.dashEventHandler.unregisterDashPlayerEvent(this.player.dashPlayer);
                (<any>this).player.dashPlayer['destroy']();
            }
            this.player.dashPlayer = <any>null;
            window['dashPlayer'] = undefined;
            if (
                that.player.config.enableSSLStream &&
                that.player.currentStreamType === 'https' &&
                window.location.protocol === 'http:'
            ) {
                this.player.loadingpanel.complete(
                    3,
                    false,
                    '<span style="opacity: 0.5;">connect to https stream failed, fallback to http</span>',
                );
                this.player.loadingpanel.info(finalMessage);
                this.player.config.enableSSLStream = false;
                this.player.loadingpanel.reset(2);
                this.player.loadingpanel.reset(3);
                window.setTimeout(function () {
                    that.player.loadingpanel.ready(2);
                    that.player.getVideoData(that.player.videoQuality, '', true);
                }, 1500);
                // return true;
            } else if (!this.initialErrorRetry) {
                this.player.loadingpanel.complete(3, false);
                this.player.loadingpanel.info(finalMessage);
                this.initialErrorRetry = true;
                this.player.loadingpanel.reset(2);
                this.player.loadingpanel.reset(3);
                window.setTimeout(function () {
                    that.player.loadingpanel.ready(2);
                    that.player.getVideoData(qualityMap(16), 'mp4', true);
                }, 1500);
            } else {
                this.player.loadingpanel.complete(3, false);
                this.player.loadingpanel.info(finalMessage);
            }
        } else {
            if (type === STATE.MEDIA_MSE_ERROR || type === STATE.MEDIA_CODEC_UNSUPPORTED) {
                // destroy player on MSE error / codec unsupported
                this.player.pause();
                this.player.flvPlayer && this.player.flvPlayer['destroy']();
                this.player.flvPlayer = <any>null;
                if (this.player.dashPlayer) {
                    this.player.dashEventHandler.unregisterDashPlayerEvent(this.player.dashPlayer);
                    (<any>this).player.dashPlayer['destroy']();
                }
                this.player.dashPlayer = <any>null;
                window['dashPlayer'] = undefined;
            } else if (
                ((type === STATE.NETWORK_STATUS_CODE_INVALID || type === STATE.VIDEO_PLAY_ERROR) &&
                    that.isUrlExpire()) ||
                ((type === STATE.VIDEO_PLAY_ERROR ||
                    type === STATE.NETWORK_EXCEPTION ||
                    type === STATE.NETWORK_STATUS_CODE_INVALID) &&
                    --that.errorRetry > 0)
            ) {
                this.errorMessage = finalMessage;
                this.player.reloadMedia._reloadMediaSource({
                    failCallback: function (obj: any) {
                        if ((that.player.currentTime()! + 3) / that.player.duration()! > that.player.getBufferRate()!) {
                            // can't show message when not reach buffering
                            that.player.pause();
                            that.showErrorMsg(finalMessage);
                            that.infiniteRetry(obj);
                        }
                    },
                    doneCallback: function (obj: any) {
                        if (obj && obj.showSuccess) {
                            if (that.retryTimer) {
                                clearTimeout(that.retryTimer);
                            }
                            if (that.retrySecond !== 2000) {
                                that.retrySecond = 2000;
                            }
                            that.player.toast.addErrorInfo({
                                msg: '重新连接至服务器成功',
                                isSuccess: true,
                            });
                        }
                        that.player.play();
                    },
                });
            } else {
                if ((that.player.currentTime()! + 3) / that.player.duration()! > that.player.getBufferRate()!) {
                    that.player.pause();
                    that.showErrorMsg(finalMessage);
                    that.infiniteRetry({
                        failCallback: function (obj: any) {
                            that.player.pause();
                            that.showErrorMsg('重新连接服务器失败');
                            that.infiniteRetry(obj);
                        },
                        doneCallback: function (obj: any) {
                            if (obj) {
                                if (that.retryTimer) {
                                    clearTimeout(that.retryTimer);
                                }
                                if (that.retrySecond !== 2000) {
                                    that.retrySecond = 2000;
                                }
                                that.player.toast.addErrorInfo({
                                    msg: '重新连接至服务器成功',
                                    isSuccess: true,
                                });
                                that.player.play();
                            }
                        },
                    });
                } else {
                    this.errorMessage = finalMessage;
                }
            }
        }
    }

    private infiniteRetry(obj: any) {
        const that = this;
        if (that.retryTimer) {
            clearTimeout(that.retryTimer);
        }
        that.retryTimer = window.setTimeout(() => {
            that.player.reloadMedia._reloadMediaSource(obj);
            that.player.toast.addErrorInfo({
                msg: '正在重新连接至服务器...',
            });
        }, that.retrySecond);
        this.retryCount++;
        that.retrySecond += 3000;
        obj.showSuccess = true;
    }

    private showErrorMsg(msg: string) {
        if (!this.player.template || !this.player.template.playerWrap) {
            return false;
        }
        this.player.toast.addErrorInfo({
            msg: msg,
        });
    }

    hideErrorMsg() {
        if (!this.player.template || !this.player.template.playerWrap) {
            return false;
        }
        this.player.template.playerWrap.find('.bpl-error').hide();
    }

    private isUrlExpire() {
        let url;
        try {
            if (this.player.flvPlayer) {
                url =
                    (<any>this).player.flvPlayer['statisticsInfo']['redirectedURL'] ||
                    this.player.mediaDataSource!['segments']![
                    (<any>this).player.flvPlayer['statisticsInfo']['currentSegmentIndex']
                    ]['url'] ||
                    this.player.flvPlayer['statisticsInfo']['url'];
            } else if (this.player.dashPlayer) {
                url = this.player.mediaDataSource!['url']; // tmp dashplayer playurl
            } else {
                url = this.player.mediaDataSource!['segments']![0]['url'];
            }
        } catch (e) {
            return false;
        }
        const expire = +(
            getSearchParam('expires', url)! ||
            getSearchParam('wsTime', url)! ||
            getSearchParam('txTime', url)! ||
            getSearchParam('um_deadline', url)! ||
            getSearchParam('deadline', url)!
        );
        return Boolean(expire) && expire * 1000 < Date.now();
    }

    retryOnVideoBuff() {
        this.showErrorMsg(this.errorMessage!);
        this.infiniteRetry({
            failCallback: (obj: any) => {
                this.player.pause();
                this.showErrorMsg(this.errorMessage!);
                this.infiniteRetry(obj);
            },
            doneCallback: (obj: any) => {
                if (obj) {
                    if (this.retryTimer) {
                        clearTimeout(this.retryTimer);
                    }
                    if (this.retrySecond !== 2000) {
                        this.retrySecond = 2000;
                    }
                    this.player.toast.addErrorInfo({
                        msg: '重新连接至服务器成功',
                        isSuccess: true,
                    });
                }
            },
        });
    }

    reloadBackupURL() {
        const that = this;
        let seekType = 'range';
        let backupMediaDataSource = {};
        const mediaSegments: any = [];
        if (
            that.player.mediaDataSource &&
            that.player.mediaDataSource['segments'] &&
            Object.prototype.toString.apply(that.player.mediaDataSource['segments']) === '[object Array]'
        ) {
            that.player.mediaDataSource['segments'].forEach((item: any) => {
                item['url'] = item['backupURL'][that.backupURLIndex];
                mediaSegments.push(item);
            });
            backupMediaDataSource = $.extend({}, that.player.mediaDataSource, {
                segments: mediaSegments,
            });
        } else {
            backupMediaDataSource = $.extend({}, that.player.mediaDataSource, {
                url: that.player.mediaDataSource!['backupURL']![that.backupURLIndex],
            });
        }
        if (that.player.mediaDataSource!['type'] === 'flv') {
            const segments = that.player.mediaDataSource!['segments']!;
            for (let i = 0; i < segments.length; i++) {
                if (segments[i]['url']!.match(/\/ws\.acgvideo\.com\//)) {
                    // ws.acgvideo.com: Use param seek (bstart/bend)
                    seekType = 'param';
                    break;
                }
            }
        }
        that.backupURLIndex++;
        if (this.player.flvPlayer) {
            this.player.flvPlayer['destroy']();
            this.player.flvPlayer = <any>null;
        }
        // [feature] dashplayer backupurl
        if (this.player.dashPlayer) {
            this.player.dashEventHandler.unregisterDashPlayerEvent(this.player.dashPlayer);
            this.player.dashPlayer['destroy']();
            this.player.dashPlayer = <any>null;
            window['dashPlayer'] = undefined;
        }
        this.player.load(
            {
                mediaDataSource: backupMediaDataSource,
                seekType: seekType,
            },
            true,
            this.player.videoTime,
        );
    }

    destroy() {
        this.retryCount = 0;
    }
}

export default ErrorHandler;
