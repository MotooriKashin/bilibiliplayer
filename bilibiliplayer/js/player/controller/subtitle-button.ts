import STATE from '../state';
import Controller from '../controller';
import Player from '../../player';
import svg from '../svg';
import BILIBILI_PLAYER_SETTINGS from '../settings';
import { IUserStatusInterface, ISubtitleInterface } from '../user';
import { Selectmenu } from '@jsc/player-auxiliary/js/ui/selectmenu';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import { Checkbox } from '@jsc/player-auxiliary/js/ui/checkbox';
import { Slider } from '@jsc/player-auxiliary/js/ui/slider';

import '../../../css/subtitle-button.less';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { download } from '@shared/utils';

const shadowMap = [
    'none',
    'rgb(0, 0, 0) 1px 0px 1px, rgb(0, 0, 0) 0px 1px 1px, rgb(0, 0, 0) 0px -1px 1px, rgb(0, 0, 0) -1px 0px 1px',
    'rgb(0, 0, 0) 0px 0px 1px, rgb(0, 0, 0) 0px 0px 1px, rgb(0, 0, 0) 0px 0px 1px',
    'rgb(0, 0, 0) 1px 1px 2px, rgb(0, 0, 0) 0px 0px 1px',
];
let lanValue = 'close';

class SubtitleButton {
    private controller: Controller;
    private player: Player;
    private prefix: string;
    private container!: JQuery;
    private loaded = false;
    private wrap: JQuery;
    private videoLan: string = '';
    private bilingual!: Checkbox;
    private lanSelect!: Selectmenu;
    private subtitleList!: any[];
    private localSaved: any;
    private isClosed: boolean;
    private enableTestSubtitle!: boolean;
    private testSubtitle: any;
    private element!: {
        [key: string]: JQuery;
    };
    private backgroundopacity?: Slider;
    private fontsize?: Slider;
    private icon: JQuery<HTMLElement>;
    private download?: Button;

    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.localSaved = this.player.videoSettings['subtitle'];
        this.isClosed = this.localSaved['isclosed'] ? true : false;

        this.wrap = $(`<div class="${this.prefix}-video-btn ${this.prefix}-video-btn-subtitle"></div>`)
            .appendTo(this.controller.container)
            .on('hover', () => {
                this.fontsize?.resize();
                this.backgroundopacity?.resize();
            });
        this.icon = $(`<span class="${this.prefix}-video-btn-subtitle-icon" aria-label="字幕">${this.isClosed ? svg.subtitleOff : svg.subtitleOn}</span>`)
            .appendTo(this.wrap);
        if (this.player.subtitle) {
            this.init();
        }
    }

    init() {
        this.enableTestSubtitle = false;
        this.testSubtitle = {
            content: '字幕样式测试',
        };
        const saved = this.localSaved;
        // 字幕选择
        this.player.userLoadedCallback(userStatus => {
            if (this.loaded || this.player.config.lightWeight) return;
            this.setSubtitle(userStatus);
            this.updateBilingual();
        });

        // 等比缩放
        this.player.subtitle.setStyle({
            scale: saved['scale'] !== false,
        });
        // 字幕大小
        this.player.subtitle.setStyle({
            fontSize: saved['fontsize'],
        });

        // 字幕颜色
        this.player.subtitle.setStyle({
            color: parseInt(saved['color'], 10),
        });

        // 背景透明度
        this.player.subtitle.setStyle({
            backgroundOpacity: saved['backgroundopacity'],
        });

        // 描边方式
        this.player.subtitle.setStyle({
            textShadow: shadowMap[saved['shadow']] || 'none',
        });

        // 默认位置
        this.player.subtitle.setStyle({
            position: saved['position'],
        });

        // 双语
        this.player.subtitle.setStyle({
            bilingual: saved['bilingual'],
        });

        // 淡入淡出
        this.player.subtitle.setStyle({
            fade: saved['fade'],
        });
        this.globalEvents();

        this.loaded || this.load();
    }

    private globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_SUBTITLE_CHANGE, (e: Event) => {
            if (
                !this.player.subtitle.manager.showing.length &&
                !this.player.subtitle.secondManager.showing.length &&
                this.enableTestSubtitle
            ) {
                this.player.subtitle.manager.draw(this.testSubtitle);
            } else if (
                (this.player.subtitle.manager.showing.length !== 1 &&
                    this.player.subtitle.manager.showing.indexOf(this.testSubtitle) !== -1) ||
                this.player.subtitle.secondManager.showing.length
            ) {
                this.player.subtitle.manager.wipe(this.testSubtitle, false);
            }
        });
    }
    // 设置字幕
    setSubtitle(userStatus: IUserStatusInterface) {
        if (userStatus.subtitle) {
            this.subtitleList = userStatus.subtitle['subtitles'];
            this.videoLan = userStatus.subtitle['lan'];
        }
        if (this.subtitleList && this.subtitleList.length) {
            this.subtitleList.sort((a: any, b: any): any => (a['lan'] > b['lan'] ? 1 : -1));
            const defaultLanguage = this.getDefaultLanguage(this.subtitleList) || this.subtitleList[0]['lan'];
            if (defaultLanguage && !this.isClosed) {
                if (this.loaded) {
                    setTimeout(() => {
                        this.lanSelect.value(defaultLanguage);
                    }, 0);
                } else {
                    this.switchSubtitle(defaultLanguage);
                }
                // 设置双语字幕
                this.localSaved && this.localSaved['bilingual'] && this.changeBilingual(true);
            }
        }
    }

    // 切换字幕
    switchSubtitle(lan: string, cb?: (data: any) => void) {
        const index = this.hasLan(lan);
        if (index !== -1 && this.player.subtitle && !this.isClosed) {
            lanValue = lan;
            this.player.subtitle.load({
                url: this.subtitleList[index]['subtitle_url'],
                id: this.subtitleList[index]['id'],
                group: 0,
                callback: cb,
            });
            // 设置双语字幕
            if (this.bilingual && this.bilingual.value()) {
                this.changeBilingual(true);
            }
        }
    }

    // 是否有字幕
    hasLan(lan: string) {
        let index = -1;
        if (this.subtitleList && this.subtitleList.length) {
            this.subtitleList.some((item, i) => {
                if (item['lan'] === lan) {
                    index = i;
                    return true;
                }
            });
            return index;
        }
        return index;
    }

    enable(subtitle: any) {
        if ((!subtitle['subtitles'] || !subtitle['subtitles'].length) && !this.isClosed) {
            this.toggleSVG(true);
        }
        this.wrap.show();
    }

    private toggleSVG(on: boolean) {
        this.isClosed = !on;
        this.icon.html(on ? svg.subtitleOn : svg.subtitleOff);
        on || this.player.subtitle?.clear();
        this.player.set('subtitle', 'isclosed', !on);
    }
    private load() {
        if (!this.loaded) {
            this.loaded = true;

            this.container = $(this.TPL());
            this.container.appendTo(this.wrap);

            this.element = {
                lan: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-lan`),
                download: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-download`),
                addBtn: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-add`),
                fontsize: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-size`),
                color: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-color`),
                opacity: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-opacity`),
                shadow: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-shadow`),
                position: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-position`),
                bilingual: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-bilingual`),
                scale: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-scale`),
                fade: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-fade`),
                reset: this.container.find(`.${this.player.prefix}-subtitle-setting-panel-reset`),
            };

            const saved = this.player.videoSettings['subtitle'];

            // 字幕选择
            this.player.userLoadedCallback(userStatus => {
                this.setSubtitle(userStatus);
                this.updateBilingual();
                let items = [
                    {
                        name: '关闭',
                        value: 'close',
                    },
                ];

                if (this.subtitleList && this.subtitleList.length) {
                    items = items.concat(
                        this.subtitleList.map((item) => {
                            return {
                                name: item['lan_doc'],
                                value: item['lan'],
                            };
                        }),
                    );
                }

                if (userStatus.subtitle) {
                    let value = '';
                    this.lanSelect = new Selectmenu(this.element.lan, {
                        mode: "absolute",
                        items,

                        change: e => {
                            switch (e.value) {
                                case 'close':
                                    if (!this.isClosed) {
                                        this.toggleSVG(false);
                                    }
                                    this.player.toast.addTopHinter('字幕已关闭');
                                    this.download?.disable();
                                    break;
                                default:
                                    this.player.set('subtitle', 'lan', e.value);

                                    if (this.isClosed) {
                                        this.toggleSVG(true);
                                    }
                                    this.switchSubtitle(e.value, () => {
                                        let lan = '';
                                        this.subtitleList.some((item) => {
                                            if (item['lan'] === e.value) {
                                                lan = item['lan_doc'];
                                                return true;
                                            }
                                        });
                                        if (lan) {
                                            value = e.value;
                                            this.player.toast.addTopHinter(`字幕已切换至 ${lan}`);
                                            this.download?.enable();
                                        }
                                    });
                                    break;
                            }
                        }
                    });
                    // 控制栏按钮切换逻辑
                    this.icon.off('click').on('click', () => {
                        if (value) {
                            this.lanSelect.value(this.isClosed ? value : 'close');
                        } else {
                            this.player.toast.addTopHinter('请先选择字幕语言！');
                        }
                    })
                    this.lanSelect.value('close', false);
                }
                // 下载字幕
                this.download = new Button(this.element.download, { disabled: true }).on('click', () => {
                    const index = this.hasLan(lanValue);
                    if (index !== -1 && this.player.subtitle) {
                        const data = (<any>this).player.subtitle.data[this.subtitleList[index]['subtitle_url']];
                        if (data) {
                            download({
                                text: JSON.stringify(data),
                                type: 'application/json',
                                fileName: `${lanValue}.json`
                            })
                        } else {
                            this.player.toast.addTopHinter('未能获取到字幕数据！');
                        }
                    } else {
                        this.player.toast.addTopHinter(`下载出错！字幕语言${lanValue}`);
                    }
                });
                // 添加字幕
                const addSubtitle = new Button(this.element.addBtn, {
                    disabled: false,

                    click: () => {
                        if (userStatus.subtitle_submit_switch) {
                            this.player.pause();
                            const param = this.player.config.bvid
                                ? `bvid=${this.player.config.bvid}`
                                : `aid=${this.player.config.aid}`;
                            window.open(
                                `https://member.bilibili.com/v2#/zimu/my-zimu/zimu-editor?${param}&cid=${this.player.config.cid}`,
                            );
                        } else {
                            this.player.toast.addTopHinter('系统升级中');
                        }
                    }
                });
                if (userStatus.subtitle && !userStatus.subtitle['allow_submit'] && !userStatus.isadmin) {
                    addSubtitle.disable();
                    new Tooltip({
                        type: 'tip',
                        target: this.element.addBtn,
                        position: 'top-center',
                        padding: [6, 8],
                        text: `<pre>因为以下原因之一您暂时不可添加字幕
. UP主尚未允许观众投稿字幕
. 您尚未满足UP主设置的投稿字幕的条件</pre>`,
                    });
                }
            });
            // 缩放
            const scale = new Checkbox(this.element.scale, {
                label: '等比缩放',

                change: e => {
                    this.player.set('subtitle', 'scale', e.value);
                    this.player.subtitle.setStyle({
                        scale: <boolean>e.value,
                    });
                }
            });
            // 字幕大小
            const fontsizeToPosition = (value: number) => {
                switch (value) {
                    case 0.6:
                        return 0;
                    case 0.8:
                        return 0.25;
                    case 1:
                        return 0.5;
                    case 1.3:
                        return 0.75;
                    case 1.6:
                        return 1;
                    default:
                        return 0.5;
                }
            };
            const fs = fontsizeToPosition(saved['fontsize']) || 0.5;
            this.fontsize = new Slider(this.element.fontsize, {
                precision: 4,
                hint: true,
                valueSetAnalyze: fontsizeToPosition,
                valueGetAnalyze: function (value: number) {
                    switch (value) {
                        case 0:
                            return 0.6;
                        case 0.25:
                            return 0.8;
                        case 0.5:
                            return 1;
                        case 0.75:
                            return 1.3;
                        case 1:
                            return 1.6;
                        default:
                            return 1;
                    }
                },
                formatTooltip: v => {
                    switch (v) {
                        case 0:
                            return '极小';
                        case 0.5:
                            return '适中';
                        case 1:
                            return '超大';
                        default:
                            return v;
                    }
                },
                change: e => {
                    this.player.set('subtitle', 'fontsize', e.value);
                    this.player.subtitle.setStyle({
                        fontSize: e.value,
                    });
                }
            });

            // 字幕颜色
            const co = saved['color'] ? saved['color'] + '' : '16777215';
            const color = new Selectmenu(this.element.color, {
                mode: "absolute",
                items: [
                    {
                        name: '<span style="color:#FFF;text-shadow: #000 0px 0px 1px">白色</span>',
                        value: '16777215',
                    },
                    {
                        name: '<b style="color:#F44336;text-shadow: #000 0px 0px 1px">红色</b>',
                        value: '16007990',
                    },
                    {
                        name: '<b style="color:#9C27B0;text-shadow: #000 0px 0px 1px">紫色</b>',
                        value: '10233776',
                    },
                    {
                        name: '<b style="color:#673AB7;text-shadow: #000 0px 0px 1px">深紫色</b>',
                        value: '6765239',
                    },
                    {
                        name: '<b style="color:#3F51B5;text-shadow: #000 0px 0px 1px">靛青色</b>',
                        value: '4149685',
                    },
                    {
                        name: '<b style="color:#2196F3;text-shadow: #000 0px 0px 1px">蓝色</b>',
                        value: '2201331',
                    },
                    {
                        name: '<b style="color:#03A9F4;text-shadow: #000 0px 0px 1px">亮蓝色</b>',
                        value: '240116',
                    },
                ],
                change: e => {
                    this.player.set('subtitle', 'color', parseInt(e.value, 10));
                    this.player.subtitle.setStyle({
                        color: parseInt(e.value, 10),
                    });
                }
            });

            // 背景透明度
            const opacity = +saved['backgroundopacity'] >= 0 ? +saved['backgroundopacity'] : 0.4;
            this.backgroundopacity = new Slider(this.element.opacity, {
                precision: 19,
                hint: true,

                // valueSetAnalyze: val => val * 20 / 18 - 2 / 18,
                // valueGetAnalyze: val => val * 18 / 20 + 0.1,
                formatTooltip: val => `${Math.round(val * 100)}%`,
                move: e => {
                    const value = Number(e.value.toFixed(2));
                    this.player.set('subtitle', 'backgroundopacity', value);
                    this.player.subtitle.setStyle({
                        backgroundOpacity: value,
                    });
                },
                change: e => {
                    const value = Number(e.value.toFixed(2));
                    this.player.set('subtitle', 'backgroundopacity', value);
                    this.player.subtitle.setStyle({
                        backgroundOpacity: value,
                    });
                }
            });

            // 描边方式
            const shadow = new Selectmenu(this.element.shadow, {
                mode: "absolute",
                items: [
                    {
                        name: '无描边',
                        value: '0',
                    },
                    {
                        name: '重墨',
                        value: '1',
                        attributes: { style: `text-shadow: #000 1px 0px 1px, #000 0px 1px 1px, #000 0px -1px 1px,#000 -1px 0px 1px;` }
                    },
                    {
                        name: '描边',
                        value: '2',
                        attributes: { style: `text-shadow: #000 0px 0px 1px, #000 0px 0px 1px, #000 0px 0px 1px;` }

                    },
                    {
                        name: '45°投影',
                        value: '3',
                        attributes: { style: `text-shadow: #000 1px 1px 2px, #000 0px 0px 1px;` }

                    },
                ],
                change: e => {
                    this.player.set('subtitle', 'shadow', e.value);
                    this.player.subtitle.setStyle({
                        textShadow: (<any>shadowMap)[e.value] || 'none',
                    });
                }
            });

            // 默认位置
            const position = new Selectmenu(this.element.position, {
                mode: "absolute",
                mscNum: 4,
                setHeight: 120,
                items: [
                    {
                        name: '左下角',
                        value: 'bl',
                    },
                    {
                        name: '底部居中',
                        value: 'bc',
                    },
                    {
                        name: '右下角',
                        value: 'br',
                    },
                    {
                        name: '左上角',
                        value: 'tl',
                    },
                    {
                        name: '顶部居中',
                        value: 'tc',
                    },
                    {
                        name: '右上角',
                        value: 'tr',
                    },
                ],
                change: e => {
                    this.player.set('subtitle', 'position', e.value);
                    this.player.subtitle.resetPosition();
                    this.player.subtitle.setStyle({
                        position: e.value,
                    });
                }
            });

            // 双语字幕
            this.bilingual = new Checkbox(this.element.bilingual, {
                label: '双语字幕',
                change: e => {
                    this.player.set('subtitle', 'bilingual', e.value);
                    this.player.subtitle.setStyle({
                        bilingual: e.value,
                    });
                    this.changeBilingual(e.value);
                }
            });

            // 淡入淡出
            const fade = new Checkbox(this.element.fade, {
                label: '淡入淡出',
                change: e => {
                    this.player.set('subtitle', 'fade', e.value);
                    this.player.subtitle.setStyle({
                        fade: e.value,
                    });
                }
            });

            // 恢复默认设置
            const reset = new Button(this.element.reset, {
                type: 'small',
            });
            const defaultValue = BILIBILI_PLAYER_SETTINGS['subtitle'];
            reset.on('click', () => {
                this.player.set('subtitle', 'lan', '');
                this.fontsize!.value(defaultValue['fontsize']);
                color.value(defaultValue['color']);
                this.backgroundopacity!.value(defaultValue['backgroundopacity']);
                shadow.value(defaultValue['shadow']);
                this.player.subtitle.resetPosition();
                position.value(defaultValue['position']);
                this.bilingual.value(defaultValue['bilingual']);
                scale.value(defaultValue['scale']);
                fade.value(defaultValue['fade']);
            });

            scale.value(saved['scale'] !== false, false);
            this.fontsize.value(fs, false);
            color.value(co, false);
            this.backgroundopacity.value(opacity, false);
            shadow.value(saved['shadow']);
            position.value(saved['position'] || 'bc');
            this.bilingual.value(saved['bilingual']);
            fade.value(saved['fade']);
        }
    }

    // 更新双语模式
    private changeBilingual(db: boolean) {
        const index = this.hasLan(this.videoLan);
        if (index !== -1 && this.player.subtitle && !this.isClosed) {
            this.player.subtitle.changeBilingual({
                double: lanValue === this.videoLan ? false : db,
                url: this.subtitleList[index]['subtitle_url'],
                id: this.subtitleList[index]['id'],
                group: 1,
            });
        }
    }
    // 是否显示双语开关
    private updateBilingual() {
        if (this.element) {
            if (this.videoLan && this.hasLan(this.videoLan) !== -1 && this.subtitleList.length > 1) {
                this.bilingual.enable();
            } else {
                this.bilingual.disable();
            }
        }
    }

    // 获取默认字幕语言
    private getDefaultLanguage(userStatusSubtitle: ISubtitleInterface[]) {
        const check = (lan: string) => {
            let index = -1;
            userStatusSubtitle.some((item, i) => {
                if (item['lan'] === lan) {
                    index = i;
                    return true;
                }
            });
            if (index !== -1) {
                return true;
            }
            return false;
        };
        const fuzzyCheck = (lan: string) => {
            lan = lan.split('-')[0];
            const result = userStatusSubtitle.find((item) => {
                return new RegExp(`^${lan}-`).test(item['lan']);
            });
            return result && result['lan'];
        };

        // 上次选择的语言
        const saved = this.player.videoSettings['subtitle'] && this.player.videoSettings['subtitle']['lan'];
        if (saved === 'close') {
            return null;
        }
        if (saved && check(saved)) {
            return saved;
        }

        // navigator.language
        if (navigator.language) {
            // 完全匹配
            if (check(navigator.language)) {
                return navigator.language;
            } else {
                // 模糊匹配
                const fuzzy = fuzzyCheck(navigator.language);
                if (fuzzy) {
                    return fuzzy;
                }
            }
        }

        // navigator.languages
        if (navigator.languages) {
            // 完全匹配
            for (let i = 0; i < navigator.languages.length; i++) {
                if (check(navigator.languages[i])) {
                    return navigator.languages[i];
                }
            }
            // 模糊匹配
            for (let i = 0; i < navigator.languages.length; i++) {
                const fuzzy = fuzzyCheck(navigator.languages[i]);
                if (fuzzy) {
                    return fuzzy;
                }
            }
        }

        return null;
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-subtitle-setting-panel">
                <div class="${prefix}-subtitle-setting-item">
                    <div class="${prefix}-subtitle-setting-panel-title">字幕</div>
                    <div class="${prefix}-subtitle-setting-panel-lan" style="width: 100px;"></div>
                    <div class="${prefix}-subtitle-setting-panel-download">下载</div>
                    <div class="${prefix}-subtitle-setting-panel-add">添加字幕</div>
                </div>
                <div class="${prefix}-subtitle-setting-item">
                    <div class="${prefix}-subtitle-setting-panel-title">字体大小</div>
                    <div class="${prefix}-subtitle-setting-panel-size" style="width: 70%;"></div>
                    <div class="${prefix}-subtitle-setting-panel-fl">
                        <input type="checkbox" class="${prefix}-subtitle-setting-panel-scale" />
                    </div>
                </div>
                <div class="${prefix}-subtitle-setting-item">
                    <span>字幕颜色</span>
                    <div class="${prefix}-subtitle-setting-panel-color" style="width: 74%;"></div>
                </div>
                <div class="${prefix}-subtitle-setting-item">
                    <span>字幕描边</span>
                    <div class="${prefix}-subtitle-setting-panel-shadow" style="width: 74%;"></div>
                </div>
                <div class="${prefix}-subtitle-setting-item">
                    <span>字幕位置</span>
                    <div class="${prefix}-subtitle-setting-panel-position" style="width: 74%;"></div>
                </div>
                <div class="${prefix}-subtitle-setting-item">
                    <div class="${prefix}-subtitle-setting-panel-title">背景不透明度</div>
                    <div class="${prefix}-subtitle-setting-panel-opacity" style="width: 100%;"></div>
                </div>
                <div class="${prefix}-subtitle-setting-other">
                    <div class="${prefix}-subtitle-setting-panel-fl">
                        <input type="checkbox" class="${prefix}-subtitle-setting-panel-bilingual" />
                    </div>
                    <div class="${prefix}-subtitle-setting-panel-fl">
                        <input type="checkbox" class="${prefix}-subtitle-setting-panel-fade" />
                    </div>
                    <div class="${prefix}-subtitle-setting-panel-reset">恢复默认</div>
                </div>
            </div>
        `;
    }
}

export default SubtitleButton;
