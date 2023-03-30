import './css/index.less';

/**
 * @desc Promise polyfill
 */
// import 'promise-polyfill/src/polyfill';
// @see https://popmotion.io/api/faqs/#faqs-browser-support?
// import 'core-js/features/weak-set';
// import 'core-js/features/string/ends-with';
// import 'core-js/features/array/find';

// TODO: upgrade to jquery 2.x and does not expose to global
// import './jquery/1.7.2/jquery.min.js';
import mCustomScrollbar from "malihu-custom-scrollbar-plugin";
import "malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.css";
mCustomScrollbar($);

import Player from './js/player';

// import namespace from '@jsc/namespace';
// namespace();

import rebuildPlayerConfig, { IPlayerConfig } from './js/io/rebuild-player-config';
import Subtitle, { SubtitleDataInterface } from './js/player/subtitle';
import STATE from './js/player/state';
import { IListItem } from './js/io/rebuild-watchlater-data';
import ScreenSHOT from './js/plugins/screen-shot';
import { VideoTopMessage } from './js/player/video-top';
import { METADATA } from '@jsc/namespace/metadata';

export class BilibiliPlayer {
    play!: () => boolean;
    pause!: () => boolean;
    reload!: (data: Record<string, any>) => void;
    seek!: (time: number, seekEndPause?: boolean) => boolean;
    volume!: (volume?: number) => number;
    mode!: (mode: any) => void;
    destroy!: (remove?: boolean) => void;
    option!: (key: string, value: any) => IPlayerConfig[keyof IPlayerConfig] | false;
    addEventListener!: (name: string, callback?: Function) => void;
    removeEventListener!: (name: string, callback?: Function) => void;
    getBufferRate!: () => number;
    getDuration!: () => number;
    isFullScreen!: () => boolean;
    exitFullScreen!: () => void;
    getWidth!: () => number;
    getHeight!: () => number;
    isMute!: () => boolean;
    setMute!: () => void;
    getPlaylist!: () => IListItem[] | false;
    getPlaylistIndex!: () => number;
    setPlaylistIndex!: (index: number, specPart?: number) => void;
    getCurrentTime!: () => number;
    getState!: () => string;
    getVersion!: () => typeof METADATA;
    stop!: () => void;
    prev!: () => void;
    next!: (specPart: boolean, doneCallback?: Function, failCallback?: Function) => void;
    reloadAccess!: (callback?: Function) => void;
    getPlayurl!: () => any;
    logger!: (visibility?: boolean) => false | string[];
    removeFromPlaylist!: (aid: number, bvid?: string) => void;
    appendToPlaylist!: (item: any) => void;
    screenshot!: (isPNG?: any) => ScreenSHOT;
    switchSubtitle!: (name: string) => void;
    updateSubtitle!: (data: SubtitleDataInterface) => void;
    updateGuideAttention!: (list: string, dragable?: boolean) => void;
    updateAdvDm!: (list: string, dragable?: boolean) => void;
    editorCenter!: (list: string, dragable?: boolean) => void;
    directiveDispatcher!: (received: any) => void;
    getStatisticsInfo!: () => Record<string, any>;
    getMediaInfo!: () => Record<string, any>;
    getSession!: () => string;
    loadLab!: (index: number, params: any) => void;
    biliMessage!: (data: string) => void;
    updatePageList!: () => void;
    getPlayerState!: () => Record<string, any>;
    setPlayerState!: (key: string, value: any) => void;
    noAuxiliary!: () => void;
    getVideoMessage!: () => Record<string, any>;
    ogvUpdate!: (type: number, obj?: any) => void;
    premiereToast!: (partInfo: any) => void;
    outActions!: (obj: any) => void;
    isInitialized!: () => boolean;
    appendTopMessage!: (msg: VideoTopMessage[]) => void;
    constructor(input: Record<string, any>, corePlayer?: any, globalEvents?: any) {
        const config = rebuildPlayerConfig(input);
        const player = new Player(config, corePlayer, globalEvents);
        $.extend(this, {
            play: function () {
                return player.play();
            },
            pause: function () {
                return player.pause();
            },
            reload: function (data: Record<string, any>) {
                return player.reload(rebuildPlayerConfig(data));
            },
            seek: function (time: number, seekEndPause?: boolean) {
                return player.seek(time, STATE.SEEK_TYPE.OUTER, undefined, seekEndPause);
            },
            volume: function (volume?: number) {
                return player.volume(volume);
            },
            mode: function (mode: any) {
                return player.mode(mode);
            },
            destroy: function (remove?: boolean) {
                return player.destroy(remove);
            },
            option: function (key: string, value: any) {
                return player.option(key, value);
            },
            addEventListener: function (name: string, callback?: Function) {
                return player.bind(name, callback);
            },
            removeEventListener: function (name: string, callback?: Function) {
                return player.unbind(name, callback);
            },
            getBufferRate: function () {
                return player.getBufferRate();
            },
            getDuration: function () {
                return player.duration();
            },
            isFullScreen: function () {
                return player.isFullScreen();
            },
            exitFullScreen: function () {
                return player.exitFullScreen();
            },
            getWidth: function () {
                return player.getWidth();
            },
            getHeight: function () {
                return player.getHeight();
            },
            isMute: function () {
                return player.isMute();
            },
            setMute: function () {
                return player.setMute();
            },
            getPlaylist: function () {
                return Boolean(player.playlistNoView) && player.playlistNoView.playlist;
            },
            getPlaylistIndex: function () {
                return Boolean(player.playlistNoView) && player.playlistNoView.getIndex();
            },
            setPlaylistIndex: function (index: number, specPart?: number) {
                return Boolean(player.playlistNoView) && player.playlistNoView.setIndex(index, specPart);
            },
            getCurrentTime: function () {
                return player.currentTime();
            },
            getState: function () {
                return player.getState();
            },
            getVersion: function () {
                return player.getVersion();
            },
            stop: function () {
                return player.stop();
            },
            prev: function () {
                return player.prev();
            },
            next: function (specPart: boolean, doneCallback?: Function, failCallback?: Function) {
                return player.next(specPart, doneCallback, failCallback);
            },
            reloadAccess: function (callback?: Function) {
                return player.reloadAccess(callback);
            },
            getPlayurl: function () {
                return player.getPlayurl();
            },
            logger: function (visibility?: boolean) {
                return player.logger(visibility);
            },
            removeFromPlaylist: function (aid: number, bvid?: string) {
                return Boolean(player.playlistNoView) && player.playlistNoView.removeFromList(aid, bvid);
            },
            appendToPlaylist: function (item: any) {
                return Boolean(player.playlistNoView) && player.playlistNoView.appendToList(item);
            },
            screenshot: function (isPNG?: any) {
                return player.screenshot(isPNG);
            },
            switchSubtitle: function (name: string) {
                return player.controller && player.controller.subtitleButton.switchSubtitle(name);
            },
            updateSubtitle: function (data: SubtitleDataInterface) {
                return player.subtitle && player.subtitle.update(Subtitle.convertData(data));
            },
            updateGuideAttention: function (list: string, dragable = true) {
                return player.updateGuideAttention(list, dragable);
            },
            // todo: delete
            updateAdvDm: function (list: string, dragable = true) {
                return player.updateAdvDm(list, dragable);
            },
            editorCenter: function (list: string, dragable = true) {
                return player.editorCenter(list, dragable);
            },
            directiveDispatcher: function (received: any) {
                return player.directiveManager.receiver(received);
            },
            getStatisticsInfo: function () {
                return player.dashPlayer && player.dashPlayer['state']
                    ? player.dashPlayer['state']['statisticsInfo']
                    : {};
            },
            getMediaInfo: function () {
                return player.dashPlayer && player.dashPlayer['state'] ? player.dashPlayer['state']['mediaInfo'] : {};
            },
            getSession: function () {
                return player.session;
            },
            loadLab: function (index: number, params: any) {
                return player.loadLab(index, params);
            },
            biliMessage: function (data: string) {
                return player.biliMessage(data);
            },
            updatePageList: function () {
                return player.updatePageList();
            },
            getPlayerState: function () {
                return player.getPlayerState();
            },
            setPlayerState: function (key: string, value: any) {
                return player.setPlayerState(key, value);
            },
            noAuxiliary: function () {
                return player.noAuxiliary();
            },
            getVideoMessage: function () {
                return player.getVideoMessage();
            },
            ogvUpdate: function (type: number, obj?: any) {
                return player.ogvUpdate(type, obj);
            },
            premiereToast: function (partInfo: any) {
                return player.premiereToast(partInfo);
            },
            outActions: function (obj: any) {
                return player.outActions(obj);
            },
            isInitialized: function () {
                return player.initialized;
            },
            appendTopMessage: function (msg: VideoTopMessage[]) {
                return player.videoTop.appendMessage(msg);
            },
            /** 保留以避免外部调用出错 */
            track: function () { },
            /** 添加弹幕 */
            appendDm(danmaku: any[], clear = true) {
                player.danmaku?.appendDm(danmaku, clear);
            },
            /** 获取弹幕 */
            getDanmaku() {
                return player.danmaku.loadPb?.allRawDM;
            },
            changeNaiveVideo(file: File) {
                return player.reloadMedia.changeNaiveVideo(file);
            }
        });
    }

    static get metadata() {
        return METADATA;
    }
}

/**
 * @deprecated Use `BilibiliPlayer` instead.
 */
export const bilibiliPlayer = BilibiliPlayer;

/**
 * TODO: Use import instead
 */
import flvjs from '@jsc/flv.js';
// dashjs 全局变量由 dash.js 库自身提供，不受UMD模块影响
import DashPlayer from '@jsc/dash-player';
import lottie from 'lottie-web/build/player/lottie_light';

window['flvjs'] = flvjs;
window['DashPlayer'] = DashPlayer;
window['lottie'] = lottie;

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        flvjs: typeof flvjs;
        DashPlayer: typeof DashPlayer;
        lottie: typeof lottie;
    }
}