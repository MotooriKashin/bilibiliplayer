import { browser } from "@shared/utils";

export interface BILIBILI_PLAYER_SETTINGS {
    setting_config: {
        type: 'canvas' | 'div';
        opacity: number;
        fontfamily: string;
        fontfamilycustom: string;
        bold: boolean;
        preventshade: boolean;
        fontborder: string;
        speedplus: number;
        dmask: boolean;
        speedsync: boolean;
        fontsize: number;
        fullscreensync: boolean;
        danmakuArea: number;
        fullscreensend: boolean;
        defquality: number;
        sameaspanel: boolean;
        upDm: boolean;
        dolbyAtmos: boolean; // 是否开启杜比音效
        audioHiRes: boolean; // 是否开启无损音频
        danmakunumber: number;
        danmakuplugins: boolean;
    };
    video_status: {
        autopart: number;
        playtype: number;
        highquality: boolean;
        widescreensave: boolean;
        iswidescreen: boolean;
        blackside_state: boolean;
        autoplay: boolean;
        autoplay_reddot_status: boolean;
        panoramamode: boolean;
        panoramamode_reddot_status: boolean;
        videospeed: number;
        volume: number;
    };
    block: {
        status: boolean;
        aiblock: boolean;
        ailevel: number;
        type_scroll: boolean;
        type_top: boolean;
        type_bottom: boolean;
        type_reverse: boolean;
        type_guest: boolean;
        type_color: boolean;
        function_normal: boolean;
        function_subtitle: boolean;
        function_special: boolean;
        cloud_level: number;
        cloud_source_video: boolean;
        cloud_source_partition: boolean;
        cloud_source_all: boolean;
        // 'cloud_source_up': true,
        size: number;
        regexp: boolean;
        dmChecked: boolean,
        list: { t: string, v: string, s: boolean, id: number }[],
    };
    message: {
        system: boolean;
        bangumi: boolean;
        news: boolean;
    };
    subtitle: {
        fontsize: number
        color: number;
        backgroundopacity: number;
        shadow: string;
        position: string;
        bilingual: boolean;
        scale: boolean;
        isclosed: boolean;
        fade: boolean;
        lan?: string;
    }
    player_icon: {
        url1_json: object;
        url2_json: object;
        hash1: string;
        hash2: string;
    };
    guide: Record<string, any>;

    isAudio?: boolean;
}

export default <BILIBILI_PLAYER_SETTINGS>{
    setting_config: {
        type: browser.version.gecko && !browser.version.trident ? 'canvas' : 'div',
        opacity: 0.8,
        fontfamily: browser.version.linux ? "'Noto Sans CJK SC DemiLight'" : "SimHei, 'Microsoft JhengHei'",
        fontfamilycustom: '',
        bold: browser.version.iOS ? false : true,
        preventshade: false,
        fontborder: '0',
        speedplus: 1,
        dmask: false,
        speedsync: false,
        fontsize: 1,
        fullscreensync: false,
        danmakuArea: 0,
        fullscreensend: false,
        defquality: 0,
        sameaspanel: false,
        upDm: false, // 是否带up主身份标识发送
        dolbyAtmos: false, // 是否开启杜比音效
        audioHiRes: false, // 是否开启无损音频
        danmakunumber: -1,
        danmakuplugins: false // 互动弹幕
    },
    video_status: {
        autopart: 1,
        playtype: 1,
        highquality: true,
        widescreensave: false,
        iswidescreen: false,
        blackside_state: true,
        autoplay: false,
        autoplay_reddot_status: true,
        panoramamode: true,
        panoramamode_reddot_status: true,
        videospeed: 1,
        volume: 0.66,
        skipheadtail: 0
    },
    block: {
        status: true,
        aiblock: true,
        ailevel: 0,
        type_scroll: true,
        type_top: true,
        type_bottom: true,
        type_reverse: true,
        type_guest: true,
        type_color: true,
        function_normal: true,
        function_subtitle: true,
        function_special: true,
        cloud_level: 2,
        cloud_source_video: true,
        cloud_source_partition: true,
        cloud_source_all: true,
        // 'cloud_source_up': true,
        size: 0,
        regexp: false,
        dmChecked: true,
        list: [],
    },
    message: {
        system: true,
        bangumi: true,
        news: true,
    },
    subtitle: {
        fontsize: 1,
        color: 16777215,
        backgroundopacity: 0.4,
        shadow: '0',
        position: 'bc',
        bilingual: false,
        scale: true,
        isclosed: false,
        fade: false,
    },
    player_icon: {
        url1_json: <any>'',
        url2_json: <any>'',
        hash1: '',
        hash2: '',
    },
    guide: {},
};
