import STATE from '../state';
import CSSRender from './render';
import Player from '../../player';
import Manager from './manager';
import ApiSubtitle, { ApiSubtitleOutData, ISubtitleBodyInterface } from '../../io/api-subtitle';
import ContextMenu from '../../plugins/context-menu';
import FeedbackPanel, { IDataInterface } from '../../plugins/feed-back';

import '../../../css/subtitle.less';

export { ApiSubtitleOutData as SubtitleDataInterface };
export { ISubtitleBodyInterface as SubtitleBodyInterface };

interface ILoadOptionsInterface {
    url: string;
    group?: number;
    id?: number;
    double?: boolean;
    callback?: (data: ApiSubtitleOutData) => void;
}
interface IOptionsInterface {
    time?: () => number;
    container?: JQuery;
}

export interface IStyleInterface {
    fontSize?: number;
    color?: number;
    textShadow?: string;
    backgroundOpacity?: number;
    backgroundColor?: number;
    position?: string; // 下左 bl 下中 bc 下右 br 上左 tl 上中 tc 上右 tr
    bilingual?: boolean;
    scale?: boolean;
    fade?: boolean;
}

class Subtitle {
    visibleStatus = true;
    paused: boolean;
    player: Player;
    manager!: Manager; // 主字幕，group 0
    secondManager!: Manager; // 双语字幕，group 1
    isClosed!: boolean; // 是否关闭状态

    private options: IOptionsInterface;
    private data: any = {};
    private inited = false;
    private render!: CSSRender;
    private contextmenu!: ContextMenu;
    private feedbackPanel!: FeedbackPanel;

    constructor(options: IOptionsInterface, player: Player) {
        const _DEFAULT_OPTIONS: IOptionsInterface = {};
        this.options = $.extend(_DEFAULT_OPTIONS, options);
        this.player = player;
        this.data = {};
        this.paused = this.player.video && this.player.video.paused;
        this.init();
    }

    static convertData(data: ApiSubtitleOutData): ApiSubtitleOutData {
        const body = data['body'].map((item) => ({
            from: item['from'],
            to: item['to'],
            location: item['location'],
            content: item['content'],
        }));
        return {
            fontSize: (<any>data)['font_size'],
            fontColor: (<any>data)['font_color'],
            backgroundAlpha: (<any>data)['background_alpha'],
            backgroundColor: (<any>data)['background_color'],
            stroke: (<any>data)['Stroke'],
            body,
        };
    }

    load(options: ILoadOptionsInterface) {
        const { url, id, group, callback } = options;
        if (!this.data[url]) {
            new ApiSubtitle(url).getData({
                success: (data: ApiSubtitleOutData) => {
                    this.data[url] = data;
                    this.data['id' + group] = id;
                    this.update(data, group);
                    if (typeof callback === 'function') {
                        callback(data);
                    }
                },
                error: (error: any) => { },
            });
        } else {
            this.data['id' + group] = id;
            this.update(this.data[url], group);
            if (typeof callback === 'function') {
                callback(this.data[url]);
            }
        }
    }

    update(data: ApiSubtitleOutData, group = 0) {
        this.isClosed = false;
        data.body = data.body.sort((a, b) => a.from! - b.from!);
        if (group === 0) {
            this.manager.update(data);
        } else if (group === 1) {
            this.secondManager.update(data);
        }
    }

    play() {
        this.paused = false;
    }

    pause() {
        this.paused = true;
    }

    visible(value: boolean) {
        if (value !== this.visibleStatus) {
            if (value) {
                this.visibleStatus = true;
            } else {
                this.visibleStatus = false;
                this.clear();
            }
        }
    }

    changeBilingual(options: ILoadOptionsInterface) {
        if (options.double) {
            this.load(options);
        } else {
            this.secondManager.destroy();
        }
    }

    private init() {
        if (!this.inited) {
            this.visibleStatus = true;

            this.render = new CSSRender({
                container: this.options.container!,
            });
            this.manager = new Manager(
                {
                    time: this.options.time!,
                    render: this.render,
                    group: 0,
                },
                this,
            );
            this.secondManager = new Manager(
                {
                    time: this.options.time!,
                    render: this.render,
                    group: 1,
                },
                this,
            );

            this.initContextmenu();
            this.bindEvents();

            this.inited = true;
        }
    }

    private bindEvents() {
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAY, () => {
            this.play();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            this.pause();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            this.pause();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => {
            this.refresh();
            this.play();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
            this.refresh();
        });
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            let isFullscreen = false;
            if (
                this.player.container.hasClass('mode-fullscreen') ||
                this.player.container.hasClass('mode-webfullscreen')
            ) {
                isFullscreen = true;
            }
            this.render && this.render.updateScreen(isFullscreen);
        });
    }

    private refresh() {
        this.manager.refresh();
        this.secondManager.refresh();
    }

    resize() {
        this.manager.resize();
        this.secondManager.resize();
    }
    clear() {
        this.isClosed = true;
        this.manager.clear();
        this.secondManager.clear();
    }

    destroy() {
        this.pause();
        this.manager && this.manager.destroy();
        this.secondManager && this.secondManager.destroy();
        this.options.container!.html('');
    }

    setStyle(options: IStyleInterface) {
        this.render.setStyle(options);
    }

    resetPosition() {
        this.render.resetPosition();
    }

    initContextmenu() {
        this.contextmenu = new ContextMenu(this.player, this.options.container!.parent(), {
            menu: [],
            appendTo: this.player.template.container,
            targetClass: 'subtitle-group',
            changedMode: true,
            changedType: 2, // 0, 1, 2
            showOrigin: true,
            theme: 'black',
            showDefMenu: false,
            touchMode: this.player.config.touchMode,
            // @ts-ignore
            onChange: ($target: JQuery, e: JQuery.Event) => {
                if (this.isClosed) {
                    return;
                }
                this.player.danmaku && this.player.danmaku.showAnything();
                if (e && e.pageX) {
                    const result = this.searchAreaSubtitle(e.pageX, e.pageY!);
                    if (result && result.subtitle && result.subtitle.length > 0) {
                        this.player.danmaku && this.player.danmaku.hideAnything();
                        const item = result.subtitle[0];
                        const data = {
                            content: item.content,
                            sid: this.data[result.sid],
                            from: item.from,
                            to: item.to,
                            cid: this.player.config.cid,
                        };
                        const isfeeded = this.feedbackPanel ? this.feedbackPanel.judge(data) : false;
                        return [
                            {
                                type: 'subtitle',
                                text: item.content,
                                menu: [
                                    {
                                        text: isfeeded ? '已反馈' : '反馈',
                                        disabled: isfeeded,
                                        click: () => {
                                            if (!isfeeded) {
                                                this.player.danmaku && this.player.danmaku.hideAnything(true);
                                                this.showFeedBack(data);
                                            }
                                        },
                                    },
                                ],
                            },
                        ];
                    }
                }
                return true;
            },
        });
    }

    hideAnything(hidePnel?: boolean) {
        this.contextmenu && this.contextmenu.hide();
        hidePnel && this.feedbackPanel && this.feedbackPanel.hide();
    }

    showFeedBack(data: IDataInterface) {
        if (!this.feedbackPanel) {
            this.feedbackPanel = new FeedbackPanel({
                title: '字幕问题反馈',
                container: this.player.template.playerWrap,
                prefix: this.player.prefix,
                labels: [
                    {
                        name: '翻译错误',
                        value: '1',
                    },
                    {
                        name: '字幕不同步',
                        value: '2',
                    },
                    {
                        name: '违法违禁',
                        value: '3',
                    },
                    {
                        name: '视频无关',
                        value: '4',
                    },
                    {
                        name: '其它',
                        value: '5',
                    },
                ],
            });
        }
        this.feedbackPanel.show(data);
    }

    searchAreaSubtitle(x: number, y: number) {
        const items = $('.subtitle-position .subtitle-item-text');
        const len = items.length;
        if (len > 0) {
            let sid = '';
            for (let i = 0; i < len; i++) {
                const ele = items[i];
                const rect = ele.getBoundingClientRect();
                const eleX = $(ele).offset()!.left;
                const eleY = $(ele).offset()!.top;
                if (x - eleX >= 0 && x - eleX <= rect.width && y - eleY >= 0 && y - eleY <= rect.height) {
                    let subtitle: any;
                    if ($(ele).parents('.second').length > 0) {
                        subtitle = this.secondManager.showing;
                        sid = 'id' + this.secondManager.options.group;
                    } else {
                        subtitle = this.manager.showing;
                        sid = 'id' + this.manager.options.group;
                    }
                    return { subtitle, sid };
                }
            }
        }
        return null;
    }
}

export default Subtitle;
