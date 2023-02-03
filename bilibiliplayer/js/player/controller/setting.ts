import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { IEvent } from '@jsc/player-auxiliary/js/ui/base';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import { Checkbox } from '@jsc/player-auxiliary/js/ui/checkbox';
import { Selectmenu } from '@jsc/player-auxiliary/js/ui/selectmenu';
import { Slider } from '@jsc/player-auxiliary/js/ui/slider';
import { Tabmenu } from '@jsc/player-auxiliary/js/ui/tabmenu';
import { getLocalSettings, setLocalSettings } from '@shared/utils';
import Player from '../../player';
import PanoramicManager from '../panoramic-manager';
import SessionController from '../session-controller';
import BILIBILI_PLAYER_SETTINGS from '../settings';
import STATE from '../state';

export interface ISettingType {
    config?: any;
    init?: () => void;
    getItem?: (name: SettingItemKeysInterface) => any;
}
enum Codec_Prefer {
    Codec_Default = 0,
    HEVC_Prefer = 1,
    AVC_Prefer = 2,
    AV1_Prefer = 3
}
type SettingItemKeysInterface =
    | 'reset'
    | 'cloudsuggest'
    | 'videomirror'
    | 'type'
    | 'opacity'
    | 'fontfamilycustom'
    | 'playtype'
    | 'bold'
    | 'preventshade'
    | 'fontborder'
    | 'speedplus'
    | 'fontsize'
    | 'speedsync'
    | 'fullscreensync'
    | 'widescreensave'
    | 'danmakuArea'
    | 'fullscreensend'
    | 'sameaspanel'
    | 'fontfamily'
    | 'lightoff'
    | 'videospeed'
    | 'videoscale';
type SettingKey = keyof ISettingType;
type FilterType = 'filterTypeTop' | 'filterTypeBottom' | 'filterTypeScroll' | 'filterTypeColor' | 'filterTypeSpecial';
interface ISettingItemInterface {
    danmakuplugins?: Checkbox;
    danmakunumber?: Slider;
    videospeed?: Selectmenu;
    autopart?: Checkbox;
    reset?: any;
    cloudsuggest?: any;
    videomirror?: any;
    type?: any;
    opacity?: any;
    type_scroll?: any;
    type_top?: any;
    type_bottom?: any;
    type_color?: any;
    function_special?: any;
    aiblock?: any;
    ailevel?: any;
    dmask?: any;
    fontfamilycustom?: any;
    playtype?: any;
    bold?: any;
    preventshade?: any;
    fontborder?: any;
    speedplus?: any;
    fontsize?: any;
    speedsync?: any;
    fullscreensync?: any;
    danmakuArea?: any;
    fullscreensend?: any;
    sameaspanel?: any;
    fontfamily?: any;
    videoscale?: any;
    widescreensave?: any;
    lightoff?: any;
}
const settingConfig = [
    'type_scroll',
    'type_top',
    'type_bottom',
    'type_color',
    'function_special',

    'aiblock',
    'ailevel',
    'preventshade',
    'dmask',
    'opacity',

    'danmakuArea',
    'speedplus',
    'fontsize',
    'fullscreensync',
    'speedsync',

    'fontfamily',
    'bold',
    'fontborder',
    'type',
    // controller相关
    'playtype',
    // 'fullscreensend',
    'widescreensave',
];
class Setting {
    container!: JQuery;
    private player: Player;
    private config: any;
    private initalized = false;
    private settingItem: ISettingItemInterface;
    setting: ISettingType;
    prefix: string;
    panoramamode?: Checkbox;
    panoramicManager?: PanoramicManager;
    constructor(player: Player) {
        this.player = player;
        this.setting = {};
        this.settingItem = {};
        this.config = this.player.videoSettings;
        this.prefix = player.prefix;
        this.setting.init = () => this.init();
        this.setting['config'] = this.config['setting_config'];
        this.setting.getItem = (name: string) => {
            if (!this.initalized) {
                this.init();
            }
            return this.settingItem[<keyof ISettingItemInterface>name];
        };
        this.player.template.settingBtn.on("click", () => {
            if (!this.initalized) {
                this.init();
            }
            this.player.template.setting.show();
            this.player.template.setting.mCustomScrollbar({
                axis: "y",
                scrollInertia: 100,
                autoHideScrollbar: true,

                mouseWheel: {
                    scrollAmount: 100,
                    preventDefault: false,
                },
            });;
        });
        this.set($.extend({}, this.config['setting_config'], this.config['video_status'], this.config['block']));
        this.settingItem['preventshade'].value(this.player.get('setting_config', 'preventshade'));
    }
    private init() {
        if (this.initalized) {
            return;
        }
        const player = this.player;
        const controller = player.controller;
        const setting = player.template.setting;
        const prefix = `.${this.prefix}-setting-`;

        setting.find("." + this.prefix + "-panel-back").on("click", function () {
            setting.hide();
        });
        setting.append(this.TPL());
        this.tooltip();

        this.settingItem.preventshade = new Checkbox(setting.find(`${prefix}preventshade`), {
            label: "防挡字幕",

            change: (e: IEvent) => {
                player.set("setting_config", "preventshade", e.value);
                player.controller.danmakuLite.preventshade.value(e.value, false);
            }
        });
        player.controller.danmakuLite.preventshade.on("change", (e: IEvent) => {
            this.settingItem.preventshade.value(e.value, false);
        });
        this.settingItem.opacity = new Slider(setting.find(`${prefix}opacity`), {
            precision: 18,
            hint: true,
            width: 175,
            height: 13,

            valueSetAnalyze: val => val * 20 / 18 - 2 / 18,
            valueGetAnalyze: val => val * 18 / 20 + 0.1,
            formatTooltip: val => `${Math.round((val * 18 / 20 + 0.1) * 100)}%`,
            change: (e: IEvent) => {
                player.set('setting_config', 'opacity', e.value.toFixed(2));
                player.controller.danmakuLite.opacityBar.value(e.value, false);
            }
        });
        player.controller.danmakuLite.opacityBar.on("change", (e: IEvent) => {
            this.settingItem.opacity!.value(e.value, false);
        });
        this.settingItem.speedplus = new Slider(setting.find(`${prefix}speedplus`), {
            precision: 19,
            hint: true,
            width: 175,
            height: 13,
            valueSetAnalyze: val => val / 2 * 20 / 19 - 1 / 19,
            valueGetAnalyze: val => val * 19 / 20 + 0.05,
            formatTooltip: val => `${Math.floor((val * 19 / 20 + 0.05) * 200)}%`,
            change: (e: IEvent) => {
                player.set('setting_config', 'speedplus', (e.value * 2).toFixed(1));
            }
        });
        this.settingItem.fontsize = new Slider(setting.find(`${prefix}fontsize`), {
            precision: 19,
            hint: true,
            width: 175,
            height: 13,
            valueSetAnalyze: val => val / 2 * 20 / 19 - 1 / 19,
            valueGetAnalyze: val => val * 19 / 20 + 0.05,
            formatTooltip: val => `${Math.floor(Number(val * 19 / 20 + 0.05) * 200)}%`,
            change: (e: IEvent) => {
                player.set('setting_config', 'fontsize', (e.value * 2).toFixed(1));
            }
        });
        this.settingItem.fullscreensync = new Checkbox(setting.find(`${prefix}fullscreensync`), {
            label: "弹幕等比缩放",

            change: (e: IEvent) => {
                player.set("setting_config", "fullscreensync", e.value);
            }
        });
        this.settingItem.speedsync = new Checkbox(setting.find(`${prefix}speedsync`), {
            label: "弹幕速度同步播放倍速",

            change: (e: IEvent) => {
                player.set("setting_config", "speedsync", e.value);
            }
        });
        this.settingItem.fontfamily = new Selectmenu(setting.find(`${prefix}fontfamily`), {
            mode: "absolute",
            items: [
                {
                    name: '黑体',
                    value: "SimHei, 'Microsoft JhengHei'",
                },
                {
                    name: '宋体',
                    value: 'SimSun',
                },
                {
                    name: '新宋体',
                    value: 'NSimSun',
                },
                {
                    name: '仿宋',
                    value: 'FangSong',
                },
                {
                    name: '微软雅黑',
                    value: "'Microsoft YaHei'",
                },
                {
                    name: '微软雅黑 Light',
                    value: "'Microsoft Yahei UI Light'",
                },
                {
                    name: 'Noto Sans DemiLight',
                    value: "'Noto Sans CJK SC DemiLight'",
                },
                {
                    name: 'Noto Sans Regular',
                    value: "'Noto Sans CJK SC Regular'",
                },
                {
                    name: "自定义",
                    value: "custom",
                }
            ],
            change: (e: IEvent) => {
                player.set('setting_config', 'fontfamily', e.value);
                if (e.value === "custom") {
                    this.settingItem.fontfamilycustom!.css("display", "block");
                } else {
                    this.settingItem.fontfamilycustom!.hide();
                }
            }
        });
        this.settingItem.fontfamilycustom = setting.find(prefix + "fontfamilycustom").change(function () {
            player.set("setting_config", "fontfamilycustom", $(this).val());
        });
        (<any>this).settingItem.fontfamilycustom.value = (e: string) => {
            this.settingItem.fontfamilycustom!.val(e);
        }
        this.settingItem.autopart = new Checkbox(setting.find(`${prefix}autopart`), {
            label: "自动换P",
            tristate: true,
            change: (e: IEvent) => {
                player.set("video_status", "autopart", e.value);
                player.controller?.resize();
            }
        });
        this.settingItem.bold = new Checkbox(setting.find(`${prefix}bold`), {
            label: "粗体",
            change: (e: IEvent) => {
                player.set("setting_config", "bold", e.value);
            }
        });
        this.settingItem.sameaspanel = new Checkbox(setting.find(`${prefix}sameaspanel`), {
            label: "应用到界面字体",
            change: (e: IEvent) => {
                player.set("setting_config", "sameaspanel", e.value);
                if (e.value) {
                    let value = player.videoSettings.setting_config.fontfamily;
                    if (value === "custom") {
                        value = player.videoSettings.setting_config.fontfamilycustom;
                    }
                    $("." + player.prefix).find("*").not("[class$=\"-danmaku\"] *").not("[class$=\"-danmaku\"]").css("font-family", value);
                    $("<style type=\"text/css\" class=\"tooltips-style\">." + player.prefix + "-tooltips{font-family:" + value + "}</style>"
                    ).appendTo($("body"))
                } else {
                    $("." + player.prefix).find("*").not("[class$=\"-danmaku\"] *").not("[class$=\"-danmaku\"]").css("font-family", "");
                    $(".tooltips-style").remove();
                }
            }
        });
        this.settingItem.fontborder = new Tabmenu(setting.find(`${prefix}fontborder`), {
            type: "button",
            items: [
                {
                    name: '重墨',
                    value: '0',
                },
                {
                    name: '描边',
                    value: '1',
                },
                {
                    name: '45°投影',
                    value: '2',
                }
            ],

            change: (e: IEvent) => {
                player.set('setting_config', 'fontborder', e.value);
            }
        });
        this.settingItem.type = new Selectmenu(setting.find(`${prefix}type`), {
            mode: "absolute",
            items: [
                {
                    name: "CSS3",
                    value: "div",
                }, {
                    name: "Canvas",
                    value: "canvas",
                }
            ],

            change: (e: IEvent) => {
                player.set('setting_config', 'type', e.value);
            }
        });
        this.settingItem.videospeed = new Selectmenu(setting.find(`${prefix}videospeed`), {
            mode: "absolute",
            items: [
                {
                    name: "0.5",
                    value: "0.5",
                }
                , {
                    name: "0.75",
                    value: "0.75",
                }
                , {
                    name: "正常",
                    value: "1",
                }
                , {
                    name: "1.25",
                    value: "1.25",
                }
                , {
                    name: "1.5",
                    value: "1.5",
                }
                , {
                    name: "2",
                    value: "2",
                }
            ],

            change: (e: IEvent) => {
                player.video && (player.video.playbackRate = Number(e.value));
            }
        });
        this.settingItem.videomirror = new Checkbox(setting.find(`${prefix}videomirror`), {
            label: "镜像画面",
            selected: player.template.videoWrp.hasClass('video-mirror'),

            change: (e: IEvent) => {
                if (e.value) {
                    player.template.videoWrp.addClass('video-mirror');
                } else {
                    player.template.videoWrp.removeClass('video-mirror');
                }
                if (!this.player.config.ad) {
                    SessionController.setSession('video_status', 'videomirror', e.value);
                }
                player.trigger(STATE.EVENT.VIDEO_MIRROR);
            }
        });
        this.settingItem.fullscreensend = new Checkbox(setting.find(`${prefix}fullscreensend`), {
            label: "全屏发弹幕",

            change: (e: IEvent) => {
                player.set("setting_config", "fullscreensend", e.value);
            }
        });
        this.settingItem.widescreensave = new Checkbox(setting.find(`${prefix}widescreensave`), {
            label: "记忆宽屏",
            disabled: true,

            change: (e: IEvent) => {
                player.set("video_status", "widescreensave", e.value);
            }
        });
        this.settingItem.danmakunumber = new Slider(setting.find(`${prefix}danmakunumber`), {
            precision: 104,
            hint: true,
            width: 175,
            height: 13,

            valueSetAnalyze: b => (Number(b) === 0 || Number(b) === -1) ? 1 : b <= 100 ? (b - 1) / 104 : (b / 100 - 1 + 100 - 1) / 104,
            valueGetAnalyze: b => { b = b * 104 + 1; return b <= 100 ? b : b <= 104 ? (b - 100 + 1) * 100 : 0; },
            formatTooltip: b => { b = Math.round(b * 104 + 1); return b <= 100 ? b : b <= 104 ? (b - 100 + 1) * 100 : "无限制"; },
            change: (e: IEvent) => {
                player.set('setting_config', 'danmakunumber', e.value === 0 ? -1 : e.value);
            }
        });
        this.settingItem.reset = new Button(setting.find(`${prefix}reset`), {
            type: "small",

            click: () => {
                this.set($.extend({}, BILIBILI_PLAYER_SETTINGS['setting_config'], BILIBILI_PLAYER_SETTINGS['video_status'], BILIBILI_PLAYER_SETTINGS['block']));
            }
        });
        new Selectmenu(setting.find(`${prefix}codec`), {
            mode: "absolute",
            items: [
                {
                    name: "默认",
                    value: <any>Codec_Prefer.Codec_Default
                },
                {
                    name: "AV1",
                    value: <any>Codec_Prefer.AV1_Prefer
                },
                {
                    name: "HEVC",
                    value: <any>Codec_Prefer.HEVC_Prefer
                },
                {
                    name: "AVC",
                    value: <any>Codec_Prefer.AVC_Prefer
                }
            ],

            change: (e: IEvent) => {
                setLocalSettings('bilibili_player_codec_prefer_type', e.value);
            }
        }).value(getLocalSettings('bilibili_player_codec_prefer_type') || '2');

        new Checkbox(setting.find(`${prefix}highenergy`), {
            label: "高能进度条",

            change: e => {
                setLocalSettings('pbpstate', e.value ? '1' : '0');
                if (e.value) {
                    window.$pbp?.show();
                } else {
                    window.$pbp?.hide();
                }
            }
        }).value(getLocalSettings('pbpstate') !== '0', false);

        this.settingItem.danmakuplugins = new Checkbox(setting.find(`${prefix}danmakuplugins`), {
            label: "互动弹幕",

            change: e => {
                player.set('setting_config', 'danmakuplugins', e.value);
                if (!e.value) {
                    player.allPlugins?.destroy();
                    player.popup?.destroy();
                }
            }
        });

        player.userLoadedCallback(info => {
            if (info.role === STATE.USER_ADVANCED || info.role === STATE.USER_VIP) {
                this.settingItem.widescreensave.enable();
            } else {
                setting.find(prefix + "wrap-widescreensave").hide();
            }
            setting.find(prefix + "cloudsuggest").parent().show();

            this.settingItem.cloudsuggest = new Checkbox(setting.find(prefix + "cloudsuggest"), {
                label: "云推荐弹幕",
                checked: String(info.default_dm) === '1',
                change: (e: IEvent) => {
                    player.set("setting_config", "cloudsuggest", e.value ? "ON" : "OFF");
                }
            });
        });
        this.settingItem.danmakuArea = new Slider(setting.find(`${prefix}danmakuArea`), {
            precision: 10,
            hint: true,
            width: 175,
            height: 13,

            valueSetAnalyze: b => {
                b = b / 100;
                b = Math.max(b, 0);
                b = Math.min(b, 1);
                return b;
            },
            valueGetAnalyze: b => {
                b = b * 100;
                b = Math.max(b, 0);
                b = Math.min(b, 100);
                return b;
            },
            formatTooltip: b => {
                switch (b) {
                    case 0:
                        return "无限";
                    case 0.5:
                        return "半屏";
                    case 1:
                        return "满屏";
                    default:
                        return `${b * 100}%`;
                }
            },
            change: (e: IEvent) => {
                player.set('setting_config', 'danmakuArea', e.value);
            }
        });

        // 全景模式
        this.player.userLoadedCallback((status: any) => {
            const isIE =
                (!!/msie [\w.]+/.exec(navigator.userAgent.toLowerCase()) && !/Edge/i.test(navigator.userAgent)) ||
                /Trident/i.test(navigator.userAgent); // 是否IE浏览器
            const isEdge = /edge/i.test(navigator.userAgent.toLowerCase()); // 是否Edge旧版浏览器
            if (status.is_360 && this.player.isSupportWebGL && !(isIE || isEdge)) {
                this.initPanoramamode();
            } else {
                this.player.container.removeClass(`${this.prefix}-panoramic-video`);
            }
        });

        this.initalized = true;
    }

    initPanoramamode() {
        const panoramamode = this.player.template.setting.find(`.${this.prefix}-setting-panoramamode`);
        this.player.container.addClass(`${this.prefix}-panoramic-video`);
        this.panoramamode = new Checkbox(panoramamode, {
            label: "全景模式",
            checked: this.player.videoSettings.video_status.panoramamode,
            change: e => {
                this.player.set('video_status', 'panoramamode', e.value);
                this.getPanoramicManager(e.value);
            }
        });
        panoramamode.parent().show();
        this.setPanoramicManager();
    }
    private setPanoramicManager() {
        const val = this.player.videoSettings.video_status.panoramamode;
        this.getPanoramicManager(val);
    }
    private getPanoramicManager(visible: boolean) {
        if (!this.panoramicManager) {
            try {
                this.panoramicManager = new PanoramicManager(this.player, this.player.template.videoWrp);
            } catch (e) {
                console.warn(e);
            }
        }
        if (!this.panoramicManager?.getCrossOrigin()) {
            this.panoramicManager?.display(visible);
            if (visible) {
                this.player.controller.panoramicShortcut = true;
            } else {
                this.player.controller.panoramicShortcut = false;
            }
        }
    }
    TPL() {
        return `
        <div class="${this.prefix}-panel-area">
	<div class="${this.prefix}-panel">
		<div class="${this.prefix}-panel-area-title">弹幕设置</div>
        <div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label" data-tooltip="1" data-text="100%为完全不透明" data-position="bottom-left" data-change-mode="1">弹幕不透明度</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-opacity"></div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label" data-tooltip="1" data-text="数字越大，弹幕滚动越快" data-position="bottom-left" data-change-mode="1">弹幕速度</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-speedplus"></div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label" data-tooltip="1" data-text="仅对滚动弹幕生效，0表示无限制" data-position="bottom-left" data-change-mode="1">同屏弹幕密度</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-danmakunumber"></div>
			</div>
		</div>
        <div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label">弹幕显示区域</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-danmakuArea"></div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label">字号缩放</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-fontsize"></div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label"></div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-fl" data-tooltip="1" data-text="视频区域大小调整时，弹幕也随着拉伸" data-position="bottom-center" data-change-mode="1">
					<input type="checkbox" class="${this.prefix}-setting-fullscreensync" />
				</div>
			</div>
		</div>  
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label">边框样式</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-btn-wrap">
					<div class="${this.prefix}-setting-fontborder"></div>
				</div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label">弹幕字体</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-fontfamily"></div>
				<input class="${this.prefix}-setting-fontfamilycustom" />
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label"></div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-nfl" data-tooltip="1" data-text="界面也使用相同的字体" data-position="bottom-center" data-change-mode="1">
					<input type="checkbox" class="${this.prefix}-setting-sameaspanel" />
				</div>
				<div class="${this.prefix}-nfl"><input type="checkbox" class="${this.prefix}-setting-bold" /></div>
				<div class="${this.prefix}-nfl" data-tooltip="1" data-text="视频底部15%部分为空白保留区" data-position="bottom-center" data-change-mode="1">
					<input type="checkbox" class="${this.prefix}-setting-preventshade" />
				</div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label">渲染类型</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-type"></div>
			</div>
		</div>
        <div class="${this.prefix}-panel-content">
            <div class="${this.prefix}-panel-label" data-tooltip="1" data-text="优先使用的视频编码" data-position="bottom-center" data-change-mode="1">播放策略</div>
            <div class="${this.prefix}-panel-setting">
                <div class="${this.prefix}-setting-codec"></div>
            </div>
        </div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label" data-tooltip="1" data-text="播放器播放倍速" data-position="bottom-left" data-change-mode="1">播放速度</div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-setting-videospeed"></div>
			</div>
		</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-label"></div>
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-fl">
					<input type="checkbox" class="${this.prefix}-setting-speedsync" />
				</div>
			</div>
		</div>
		<div class="${this.prefix}-area-separator"></div>
		<div class="${this.prefix}-panel-area-title">高级选项</div>
		<div class="${this.prefix}-panel-content">
			<div class="${this.prefix}-panel-setting">
				<div class="${this.prefix}-advopt-wrap">
					<div class="${this.prefix}-fl" style="display: none;" data-tooltip="1" data-text="本功能需要刷新页面才可以生效" data-position="bottom-center" data-change-mode="1">
						<input type="checkbox" class="${this.prefix}-setting-cloudsuggest" />
					</div>
					<div class="${this.prefix}-fl" data-tooltip="1" data-text="打勾视频将自动播放，方块将提示是否播放下一P" data-position="bottom-center" data-change-mode="1">
						<input type="checkbox" class="${this.prefix}-setting-autopart" />
					</div>
					<div class="${this.prefix}-fl">
						<input type="checkbox" class="${this.prefix}-setting-videomirror" />
					</div>
					<div class="${this.prefix}-fl" data-tooltip="1" data-text="选中的话，全屏时可以发送弹幕" data-position="bottom-center" data-change-mode="1">
						<input type="checkbox" class="${this.prefix}-setting-fullscreensend" />
					</div>
					<div class="${this.prefix}-fl ${this.prefix}-setting-wrap-widescreensave">
						<input type="checkbox" class="${this.prefix}-setting-widescreensave" />
					</div>
                    <div class="${this.prefix}-fl ${this.prefix}-setting-wrap-highenergy">
						<input type="checkbox" class="${this.prefix}-setting-highenergy" />
					</div>
                    <div class="${this.prefix}-fl ${this.prefix}-setting-wrap-panoramamode" style="display: none;">
						<input type="checkbox" class="${this.prefix}-setting-panoramamode" />
					</div>
                    <div class="${this.prefix}-fl ${this.prefix}-setting-wrap-danmakuplugins" data-tooltip="1" data-text="含高赞弹幕，刷新页面才可以生效" data-position="bottom-center" data-change-mode="1">
						<input type="checkbox" class="${this.prefix}-setting-danmakuplugins" />
					</div>
				</div>
			</div>
		</div>
		<div class="${this.prefix}-area-separator"></div>
		<div class="${this.prefix}-setting-reset">恢复默认设置</div>
	</div>
</div>`;
    }
    private tooltip() {
        this.player.template.setting.find('[data-tooltip="1"]').each(function (c, d) {
            new Tooltip({
                name: "controll-tooltip",
                target: $(d),
                type: "tip",
                margin: 1,
            });
        });
    }
    set(settings: any, reset?: boolean) {
        if (!this.initalized) {
            this.init();
        }
        Object.keys(this.settingItem).forEach(d => {
            if (settings.hasOwnProperty(d)) {
                (<any>this).settingItem?.[d].value(settings[d], false);
            }
        });
    }
}

export default Setting;
export { SettingItemKeysInterface, SettingKey, FilterType };
