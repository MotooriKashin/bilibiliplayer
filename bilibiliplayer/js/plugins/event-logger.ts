/**
 * EventLogger
 */
import STATE from '../player/state';
import EventLog from '@jsc/event-log';
import Player from '../player';

class EventLogger {
    private player: Player;
    private eventLog: any;
    private metadataLoadTime!: number;
    private playurlLoadTime!: number;
    private playerLoadTime!: number;
    private danmakuLoadTime!: number;
    private metaBufferTime!: number;
    private websocketLoadTime!: number;
    private seekTime!: number;

    constructor(player: Player) {
        this.player = player;
        this.bindEvents();
        this.eventLog = new EventLog('.bilibili-player-area', {
            limitCount: 10000,
            hideCallback: () => {
                player &&
                    player.getVideoInfo() &&
                    typeof player.getVideoInfo().hideLog === 'function' &&
                    player.getVideoInfo().hideLog();
            },
        });
    }
    private bindEvents() {
        const that = this;
        if (this.player) {
            // common
            this.player.bind(
                STATE.EVENT.VIDEO_LOG,
                (e: JQueryEventObject, text: string, type: number, time: number) => {
                    that.log(text, type || 0, time);
                },
            );

            // load events
            this.player.bind(STATE.EVENT.VIDEO_PLAYER_LOAD, () => {
                that.playerLoadTime = +new Date();
                that.log('Load video config');
            });

            this.player.bind(STATE.EVENT.VIDEO_PLAYER_LOADED, () => {
                that.log('Load video config finished', 0, +new Date() - that.playerLoadTime);
            });

            this.player.bind(STATE.EVENT.VIDEO_PLAYURL_LOAD, (e: JQuery.Event, item: any) => {
                if (item && item['timestamp']) {
                    that.playurlLoadTime = item['timestamp'];
                } else {
                    that.playurlLoadTime = +new Date();
                }
                that.log('Load video playurl');
            });

            this.player.bind(STATE.EVENT.VIDEO_PLAYURL_LOADED, () => {
                that.log('Load video playurl finished', 0, +new Date() - that.playurlLoadTime);
            });

            this.player.bind(STATE.EVENT.VIDEO_METADATA_LOAD, (e: JQuery.Event, item: any) => {
                if (item && item['timestamp']) {
                    that.metadataLoadTime = item['timestamp'];
                } else {
                    that.metadataLoadTime = +new Date();
                }
                that.log('Load video data');
            });

            this.player.bind(STATE.EVENT.VIDEO_METADATA_LOADED, () => {
                that.log('Load video data finished', 0, +new Date() - that.metadataLoadTime);
            });

            this.player.bind(STATE.EVENT.VIDEO_DANMAKU_LOAD, () => {
                that.danmakuLoadTime = +new Date();
                that.log('Load video danmaku');
            });

            this.player.bind(
                STATE.EVENT.VIDEO_DANMAKU_LOADED,
                (e: JQueryEventObject, success: boolean, extra: string) => {
                    if (success) {
                        that.log(
                            'Load video danmaku finished ' + (extra ? extra : ''),
                            0,
                            +new Date() - that.danmakuLoadTime,
                        );
                    } else {
                        that.log('Load video danmaku failed ' + (extra ? extra : ''), 2);
                    }
                },
            );

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_BUFFER, () => {
                that.metaBufferTime = +new Date();
                that.log('Load video buffer');
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_BUFFER_END, () => {
                that.log('Load video buffer finished', 0, that.metaBufferTime);
            });

            this.player.bind(
                STATE.EVENT.VIDEO_MEDIA_ERROR,
                (e: JQueryEventObject, type: number, code: number, extra: string) => {
                    const types = ['', 'video config', 'video playurl', 'video data'];
                    that.log(
                        'Load ' + types[type] + ' error' + (code ? ' code:' + code : '') + (extra ? ',' + extra : ''),
                        2,
                    );
                },
            );

            this.player.bind(STATE.EVENT.VIDEO_WEBSOCKET_LINK, () => {
                that.websocketLoadTime = +new Date();
                that.log('Link websocket server');
            });

            this.player.bind(STATE.EVENT.VIDEO_WEBSOCKET_LINKED, () => {
                that.log('Link websocket server finished', 0, +new Date() - that.websocketLoadTime);
            });

            this.player.bind(STATE.EVENT.VIDEO_WEBSOCKET_ERROR, () => {
                that.log('Link websocket error', 2);
            });

            this.player.bind(STATE.EVENT.VIDEO_WEBSOCKET_END, () => {
                that.log('Close websocket');
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAY, () => {
                that.log('Play');
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
                that.log('Pause');
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
                that.seekTime = +new Date();
                that.log('Seeking');
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => {
                that.log('Seeked', 0, that.seekTime);
            });

            this.player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
                that.log('Play end');
            });
        }
    }

    log(text: string, type?: number, time?: number) {
        window['EVENT_LOG_QUEUE'] =
            Object.prototype.toString.call(window['EVENT_LOG_QUEUE']) === '[object Array]'
                ? window['EVENT_LOG_QUEUE']
                : [];
        return this.eventLog
            ? this.eventLog.log(text, type || 0, time)
            : window['EVENT_LOG_QUEUE']!.push({
                log: text,
                type: type!,
                start: time!,
            });
    }

    show() {
        return this.eventLog ? this.eventLog.show.apply(this.eventLog, arguments) : false;
    }

    hide() {
        return this.eventLog ? this.eventLog.hide.apply(this.eventLog, arguments) : false;
    }

    download() {
        return this.eventLog ? this.eventLog.download.apply(this.eventLog, arguments) : false;
    }

    text() {
        return EventLog ? EventLog.text.apply(EventLog, <any>arguments) : false;
    }
}

export default EventLogger;
