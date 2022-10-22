import { BilibiliPlayer } from '@jsc/bilibiliplayer/bilibiliPlayer';

class Unity {
    callbackFn?: Function;
    flash() {
        // 统一的播放器对外方法
        window.player = <any>{};

        const eventMaps = {
            video_media_buffer: 'jwplayerMediaBuffer',
            video_media_buffer_full: 'jwplayerMediaBufferFull',
            video_media_ended: 'jwplayerMediaComplete',
            video_media_error: 'jwplayerMediaError',
            video_media_loaded: 'jwplayerMediaLoaded',
            video_media_mute: 'jwplayerMediaMute',
            video_media_seek: 'jwplayerMediaSeek',
            video_media_time: 'jwplayerMediaTime',
            video_media_volume: 'jwplayerMediaVolume',
        };
        const apiMaps = {
            reloadAccess: 'mukio_reloadAccess',
            play: 'jwPlay',
            pause: 'jwPause',
            stop: 'jwStop',
            seek: 'jwSeek',
            prev: 'jwPlaylistPrev',
            next: 'jwPlaylistNext',
            getBufferRate: 'jwGetBuffer',
            getDuration: 'jwGetDuration',
            isFullScreen: 'jwGetFullscreen',
            getWidth: 'jwGetWidth',
            getHeight: 'jwGetHeight',
            isMute: 'jwGetMute',
            setMute: 'jwSetMute',
            getPlaylist: 'jwGetPlaylist',
            getPlaylistIndex: 'jwGetPlaylistIndex',
            getCurrentTime: 'jwGetPosition',
            getState: 'jwGetState',
            getVersion: 'jwGetVersion',
            getPlayurl: 'jwGetPlayurl',
            volume: 'jwGetVolume|jwSetVolume', // special
            sendADShowState: 'sendADShowState',
        };

        const keys = Object.keys(apiMaps);
        for (let i = 0; i < keys.length; i++) {
            (function (html5Name, flashName) {
                (<any>window).player[html5Name] = function (...args: any[]) {
                    const flashBox: any = document.getElementById('player_placeholder');
                    if (flashBox) {
                        if (typeof flashBox[flashName] === 'function') {
                            return flashBox[flashName].apply(flashBox, args);
                        } else if (html5Name === 'volume' && typeof flashBox.volume === 'function') {
                            if (args.length === 0) {
                                if (flashBox.jwGetVolume) {
                                    return flashBox.jwGetVolume.apply(flashBox, args as []);
                                } else {
                                    return false;
                                }
                            }
                            if (flashBox.jwSetVolume) {
                                return flashBox.jwSetVolume.apply(flashBox, args as [number]);
                            } else {
                                return false;
                            }
                        }
                    }
                    return false;
                };
            })(keys[i], apiMaps[<keyof typeof apiMaps>keys[i]]);
        }
        window.player.addEventListener = function (type: string, callback?: Function) {
            let callbackString = '';
            try {
                if (typeof callback === 'function') {
                    callbackString = `${callback}`;
                }
            } catch (e) {
                callbackString = 'function(){}';
            }
            const flashBox: any = document.getElementById('player_placeholder');
            if (eventMaps[<keyof typeof eventMaps>type]) {
                let callbackFn;
                if (!callbackString) {
                    callbackFn = callback;
                } else {
                    callbackFn = callbackString;
                }
                flashBox && flashBox.jwAddEventListener && flashBox.jwAddEventListener(eventMaps[<keyof typeof eventMaps>type], callbackFn);
            }
        };

        window.player.removeEventListener = function (type: string) {
            const flashBox: any = document.getElementById('player_placeholder');
            if (eventMaps[<keyof typeof eventMaps>type]) {
                flashBox && flashBox.jwRemoveEventListener && flashBox.jwRemoveEventListener(eventMaps[<keyof typeof eventMaps>type]);
            }
        };
    }

    html5(isCorePlayer: boolean | undefined) {
        // will be removed
        const eventMaps = {
            jwplayerMediaBuffer: 'video_media_buffer',
            jwplayerMediaBufferFull: 'video_media_buffer_full',
            jwplayerMediaComplete: 'video_media_ended',
            jwplayerMediaError: 'video_media_error',
            jwplayerMediaLoaded: 'video_media_loaded',
            jwplayerMediaMute: 'video_media_mute',
            jwplayerMediaSeek: 'video_media_seek',
            jwplayerMediaTime: 'video_media_time',
            jwplayerMediaVolume: 'video_media_volume',
        };
        const apiMaps = {
            mukio_reloadAccess: 'reloadAccess',
            // 'jwAddEventListener': 'addEventListener',
            // 'jwRemoveEventListener': 'removeEventListener',
            jwPlay: 'play',
            jwPause: 'pause',
            jwStop: 'stop',
            jwSeek: 'seek',
            jwPlaylistPrev: 'prev',
            jwPlaylistNext: 'next',
            jwGetBuffer: 'getBufferRate',
            jwGetDuration: 'getDuration',
            jwGetFullscreen: 'isFullScreen',
            jwGetWidth: 'getWidth',
            jwGetHeight: 'getHeight',
            jwGetMute: 'isMute',
            jwSetMute: 'setMute',
            jwGetPlaylist: 'getPlaylist',
            jwGetPlaylistIndex: 'getPlaylistIndex',
            jwGetPosition: 'getCurrentTime',
            jwGetState: 'getState',
            jwGetVersion: 'getVersion',
            jwGetPlayurl: 'getPlayurl',
            jwGetVolume: 'volume',
            jwSetVolume: 'volume',
        };
        let cElement: any = document.querySelector('#player_placeholder');
        if (!cElement) {
            const bofqi = document.querySelector('#bilibili-player') || document.querySelector('#bofqi');
            bofqi && bofqi.insertAdjacentHTML('beforeend', '<div id="player_placeholder"></div>');
            cElement = document.querySelector('#player_placeholder');
        }

        const keys = Object.keys(apiMaps);
        for (let i = 0; i < keys.length; i++) {
            (function (flashName, html5Name) {
                if (cElement !== null) {
                    cElement[flashName] = function (...args: any[]) {
                        if (window.player && typeof (<any>window).player[html5Name] === 'function') {
                            return (<any>window).player[html5Name].apply(window.player, args);
                        }
                        return false;
                    };
                }
            })(keys[i], apiMaps[<keyof typeof apiMaps>keys[i]]);
        }

        if (cElement !== null) {
            cElement.jwAddEventListener = function (type: any, callback: any) {
                let callbackString: string | Function = '';
                // try {
                //     if (typeof callback !== 'function') {
                //         callbackString = eval(`(${callback})`);
                //     }
                // } catch (e) {
                //     callbackString = function () { };
                // }
                if (eventMaps[<keyof typeof eventMaps>type]) {
                    let callbackFn;
                    if (!callbackString) {
                        callbackFn = callback;
                    } else {
                        callbackFn = callbackString;
                    }
                    window.player &&
                        window.player.addEventListener &&
                        window.player.addEventListener(eventMaps[<keyof typeof eventMaps>type], callbackFn);
                }
            };
        }

        if (cElement !== null) {
            cElement.jwRemoveEventListener = function (type: any) {
                if (eventMaps[<keyof typeof eventMaps>type]) {
                    window.player &&
                        window.player.removeEventListener &&
                        window.player.removeEventListener(eventMaps[<keyof typeof eventMaps>type]);
                }
            };
        }

        // callbackFn
        if (typeof this.callbackFn === 'function') {
            cElement &&
                cElement.jwAddEventListener &&
                cElement.jwAddEventListener('jwplayerMediaLoaded', this.callbackFn);
        }

        if (isCorePlayer) {
            // Move to CorePlayer
            // typeof window.PlayerMediaLoaded === 'function' && window.PlayerMediaLoaded();
        } else {
            let isFirst = true;
            window.player &&
                typeof window.player.addEventListener === 'function' &&
                window.player.addEventListener('video_media_loaded', () => {
                    if (isFirst) {
                        isFirst = false;
                        typeof window.PlayerMediaLoaded === 'function' && window.PlayerMediaLoaded();
                    }
                });
        }

        let timing: PerformanceTiming = window.performance.timing;
        window.player &&
            typeof window.player.addEventListener === 'function' &&
            window.player.addEventListener('video_playurl_loaded', () => {
                if (window.GrayManager && window.performance && window.performance.timing && !timing.playerStage2) {
                    timing.playerStage2 = +new Date();
                }
            });
    }
}

const unity = new Unity();
export default unity;
//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        player: BilibiliPlayer;
        PlayerMediaLoaded?: Function;
    }
}