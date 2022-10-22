import { METADATA } from "./metadata";

// 用来区分播放器种类
export enum ContentType {
    Pugv,
    OgvPre,
    OgvPageList, // TODO 这三个要联系页面，逐渐删除，改用   ActionType
    OgvExtraParams,
    ogvFollowers,
    Game,
    PugvCenter,
    Editor // TODO: 位置不确定
}
// 调用播放器方法，用来区分事件类型
export enum ActionType {
    pageList = 'pageList',
    extra = 'extra',
    followers = 'followers',
}

export enum EventType {
    inited = 'inited',
    enter = 'video_media_enter',
    play = 'video_media_play',
    playing = 'video_media_playing',
    canplay = 'video_media_canplay',
    pause = 'video_media_pause',
    seek = 'video_media_seek',
    seeking = 'video_media_seeking',
    seeked = 'video_media_seeked',
    seekEnd = 'video_media_seek_end',
    time = 'video_media_time',
    error = 'video_media_error',
    buffer = 'video_media_buffer',
    buffered = 'video_media_buffer_end',
    bufferFull = 'video_media_buffer_full',
    loadlag = 'video_media_loadlag',
    ended = 'video_media_ended',
    volume = 'video_media_volume',
    mute = 'video_media_mute',
    attached = 'video_media_attached',
    load = 'video_media_load',
    loaded = 'video_media_loaded',

    playerLoad = 'video_player_load',
    playerLoaded = 'video_player_loaded',
    playurlLoad = 'video_playurl_load',
    playurlLoaded = 'video_playurl_loaded',
    danmakuLoad = 'video_danmaku_load',
    danmakuLoaded = 'video_danmaku_loaded',
    pagelistLoaded = 'video_pagelist_loaded',
    websocketLink = 'video_websocket_link',
    websocketLinked = 'video_websocket_linked',
    websocketError = 'video_websocket_error',
    websocketEnd = 'video_websocket_end',
    initializing = 'video_initializing',
    initialized = 'video_initialized',
    scroll = 'video_scroll',
    resize = 'video_resize',
    playerResize = 'video_player_resize',
    progressbarResize = 'video_progressbar_resize',
    refullscreen = 'video_refullscreen',
    fullscreenChanged = 'video_fullscreen_mode_changed',
    mousemove = 'video_mousemove',
    heartbeat = 'video_heartbeat',
    controlbar = 'video_controlbar',
    beforeDestroy = 'video_before_destroy',
    destroy = 'video_destroy',
    log = 'video_log',
    logUpdate = 'video_log_update',
    logClose = 'video_log_close',
    promoteInit = 'video_promote_init',
    preloadError = 'video_preload_error',
    subtitleChange = 'video_subtitle_change',
    panelHover = 'video_panel_hover',
    guide_attention_pos_update = 'video_guide_attention_pos_update',
    mirror = 'video_mirror',
    videoResize = 'video_size_resize',
    dashError = 'dash_player_error',
    initialCB = 'initialCallback',
    itEnded = 'interactive_video_ended',
    itStart = 'interactive_video_countdown_start',
    playerReload = 'player_reload',
    playerReloaded = 'player_reloaded',
    loadedCB = 'loadedCallback',
    progressUpdate = 'video_progress_update', // 进度条

    fullwin = 'player_fullwin',
    widewin = 'player_widewin',
    selector = 'player_selector',
    feedBack = 'feed_back',
    flashBirdge = 'flash_birdge',
    heimu = 'heimu',
}

export default function namespace() {
    if (!window.bPlayer) {
        window.bPlayer = {
            get __name__(): string {
                return 'bPlayer';
            },
            get __mode__(): string {
                return 'singleton';
            },
            get metadata() {
                return METADATA;
            },
            get type() {
                return ContentType;
            },
            get events() {
                return EventType;
            },
            get action() {
                return ActionType;
            },
        };
    }

    return window.bPlayer;
}

//////////////////////////// 全局增强 ////////////////////////////
declare global {
    interface Window {
        bPlayer: {
            readonly __name__: string;
            readonly __mode__: string;
            readonly metadata: typeof METADATA;
            readonly type: typeof ContentType;
            readonly events: typeof EventType;
            readonly action: typeof ActionType;
        }
    }
}