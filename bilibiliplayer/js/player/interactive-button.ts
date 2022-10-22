import STATE from './state';
import Player from '../player';
import svg from './svg';
import ApiInteractive, {
    ApiInteractiveInData,
    ApiInteractiveOutData,
    StoryChoices,
    IStoryData,
    ApiOutData,
    IHiddenVars,
    IQuestions,
} from '../io/api-interactive';
import { IUserStatusInterface } from './user';
import SessionController from './session-controller';
import { IPreloadConfig, VideoPreload } from './interactive/video-preload';
import Konva from 'konva';
import { animate, easeInOut, KeyframeOptions, linear } from 'popmotion';
import styler from 'stylefire';
import evalString from './interactive/exp-evalstring';
import { intButton, hex8ToRgba } from './interactive/int-button';
import FrameAnimation from './interactive/frame-animation';

import '../../css/interactive.less';

export interface IIVideoConfig {
    interactiveLastPart?: boolean; // 是否是结尾叶节点
    portal?: number; // (选择后下次请求上报) 选项类型 0=非回溯操作用户正常选择 1=使用回溯面板或跳转历史节点 2=用户快速面板登录
    interactiveTime?: number; // (选择后下次请求上报) 选择经过的时间
    interactiveData?: number; // (选择后下次请求上报) 选择的目标 cid
    // interactiveNode?: string; // (选择后下次请求上报) 选择的目标 edgeid
    interactiveChoices?: string; // (选择后下次请求上报) 本次节点选择的选项集合
    interactiveTargetId?: number; // (选择后置为目标index) 目标节点 index，初始化时为 0
    interactiveHiddenVars?: IHiddenVars[]; // (选择后下次请求赋值) 本次节点记录的变更后的 hidden_vars，目标节点初始化时用
}

interface IInteractiveVideoInfo {
    aid: number;
    bvid: string;
    edge_id: number;
    graph_version: number;
    platform: string;
    portal: number;
    screen: number;
}

interface IPreviewData {
    aid: number;
    bvid: string;
    nodes: Array<IPreviewNode>;
}

interface IPreviewNode {
    id: string;
    cid: number;
    name: string;
    is_start: number;
    show_time: number;
    otype: number;
    edges: Array<IPreviewEdge>;
}

interface IPreviewEdge {
    title: string;
    to_node_id: string;
}

interface IPreLocalData {
    ver: string;
    aid: number;
    bvid: string;
    list: IPreLocalDataListItem[];
}

interface IPreLocalDataListItem {
    ptr: number;
    info: IStoryData;
    hidden_vars?: IHiddenVars[];
}

class InteractiveVideo {
    private player: Player;
    private prefix: string;
    private currentNode!: IPreviewNode;
    private data: any;
    private timer!: number;
    private chooseSymbol: boolean = false;
    private countdownTimer!: number;
    countdownSymbol: boolean = false;
    private animateTimer!: number;
    private defaultChoices!: StoryChoices; // todo: defaultChoices 应当选 is_default 为 1 的第一个
    private defaultChoicesNumber!: number;
    private defaultWidth: number = 667;
    private defaultHeight: number = 375;
    private canvasWidth!: number;
    private canvasHeight!: number;
    private stage!: Konva.Stage;
    private middleLayer: any;
    private endLayer: any;
    ivApiData!: ApiInteractiveOutData;
    table: Record<string, any> = {}; // 当前值

    private interactive!: JQuery;
    private leftButton!: JQuery;
    private rightButton!: JQuery;
    private countdown!: JQuery;
    private hiddenVarsBlock!: JQuery;
    private hiddenVarsBlockDom!: JQuery;
    private showTime!: number;
    private bar!: JQuery;
    private list!: JQuery;
    private listBlock!: JQuery;
    private canvasBlock?: JQuery;
    private replayButton: JQuery | undefined;
    private rookieGuide!: JQuery;
    private initialized: boolean = false;
    private preloadSymbol: boolean = false;
    private defaultChoAni: Konva.Group[] = [];
    private hiddenVarsShow: boolean = false;
    private isIvEnded: boolean = false;
    private imgTweenSymbol: boolean = false;
    private interactiveChoices!: string;
    private lastInteractiveChoices!: string;
    private videoMediaTimeCallbacks: Array<Function> = [];
    private videoEndedCallbacks: Array<Function> = [];
    private videoPlayingCallbacks: Array<Function> = [];
    private videoCountdownCallbacks: Array<Function> = [];
    private videoMediaFrameCallbacks: Array<Function> = [];
    private videoMiddleLastId!: number | void;
    private unloginSymbol: boolean = false;
    private seamlessSymbol: boolean | undefined;
    private seamlessPromise: Promise<Function> | undefined;

    private choiceKeyframe: KeyframeOptions<{ scale: number }> = {
        from: {
            scale: 1,
        },
        to: {
            scale: 0.93,
        },
        duration: 300,
        ease: easeInOut,
    };

    private videoSeekCallbacks: Array<Function> = [];
    private videoPreload: VideoPreload;

    private specialEvent: boolean = false;
    private indicator!: FrameAnimation; // 选项显示动画
    private butterfly!: FrameAnimation; // 选项消失动画
    private specialWrap!: HTMLElement; // 用来充当缩放面板
    private specialChoose?: number; // 记录选项

    private disableEndingPanel: boolean = false; // 禁止结束面板

    constructor(player: Player) {
        this.player = player;
        this.prefix = player.prefix;
        if (!this.player.interactiveVideoConfig) {
            this.player.interactiveVideoConfig = {};
        }
        this.videoPreload = new VideoPreload(this.player); // 不受 reload init 影响
        this.player.interactiveVideoConfig.interactiveTargetId =
            this.player.interactiveVideoConfig.interactiveTargetId || 0;
        this.globalEvents();
        window.addEventListener('message', this.receiveWorldlineMsg.bind(this), false);
    }

    globalEvents() {
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
            this.player.trigger(STATE.EVENT.INTERACTIVE_VIDEO_ENDED);
        });
        this.player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            this.destroy();
            this.player.interactiveVideo = undefined;
        });

        this.player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, () => {
            this.resizeBlock();
        });
        this.player.bind(STATE.EVENT.VIDEO_SIZE_RESIZE, () => {
            this.resizeBlock();
        });
        this.player.bind(STATE.EVENT.VIDEO_MIRROR, () => {
            this.resizeBlock();
        });

        this.player.bind(STATE.EVENT.VIDEO_MEDIA_TIME, () => {
            this.videoEventHandler('MediaTime');
        });
        this.player.bind(STATE.EVENT.INTERACTIVE_VIDEO_ENDED, () => {
            this.videoEventHandler('Ended');
            this.isIvEnded = true;
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PLAYING, () => {
            this.videoEventHandler('Playing');
        });
        this.player.bind(STATE.EVENT.INTERACTIVE_VIDEO_COUNTDOWN_START, () => {
            this.videoEventHandler('Countdown');
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEKED, () => {
            this.videoEventHandler('Seek');
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_FRAME, () => {
            this.videoEventHandler('MediaFrame');
        });
        this.ivUserLoadedCallback();
    }

    init(editorData?: ApiInteractiveOutData) {
        this.initialized = true;
        this.player.container.addClass(`${this.player.prefix}-interactive-video`);
        this.player.container.removeClass(`${this.player.prefix}-interactive-hide`);
        this.lastInteractiveChoices = this.player.interactiveVideoConfig!.interactiveChoices!;
        this.interactiveChoices = '';
        this.player.interactiveVideoConfig!.interactiveChoices = '';
        if (!this.player.interactiveVideoConfig!.portal) {
            this.player.interactiveVideoConfig!.portal = 0;
        }
        const data = this.getRequestData(true);
        if (editorData) {
            this.getResponseData(editorData, true);
        } else {
            return new Promise((resolve, reject) => {
                new ApiInteractive(data).getData({
                    success: (result: ApiInteractiveOutData) => {
                        if (result.code === 0) {
                            this.getResponseData(result, true);
                            resolve(result);
                        } else if (result.code === 99003) {
                            this.setSeamless(false);
                        } else {
                            this.errorHanlder();
                            reject();
                        }
                    },
                    error: (result: ApiOutData) => {
                        this.errorHanlder(result);
                        reject();
                    },
                });
            });
        }
    }

    private getRequestData(initial?: boolean): ApiInteractiveInData {
        let data: ApiInteractiveInData = {
            aid: this.player.config.aid,
            bvid: this.player.config.bvid,
            edge_id: this.player.config.interactiveNode,
            graph_version: this.player.interactive!,
            platform: 'pc',
            portal: initial ? this.player.interactiveVideoConfig!.portal! : 2,
            screen: this.player.state.mode,
            buvid: this.player.buvid,
            choices: this.lastInteractiveChoices,
        };
        if (this.player.config.bvid) {
            delete (<any>data).aid;
        }
        if (this.player.config.interactivePreview) {
            data.preview = true;
        } else if (this.player.config.interactiveGraphId) {
            data.manager = true;
        }
        if (this.player.interactiveVideoConfig!.interactiveTime) {
            data.delay = this.player.interactiveVideoConfig!.interactiveTime;
        }
        return data;
    }

    private getResponseData(result: ApiInteractiveOutData, initial?: boolean) {
        if (!this.player.user.status().login) {
            this.setLocalProgress(result);
        }
        if (result.hidden_vars) {
            console.debug(result.hidden_vars); // for test
        }
        try {
            window.parent.postMessage(
                {
                    type: 'nodeInfo',
                    data: result,
                },
                '*',
            );
        } catch (e) {
            console.debug(e);
        }

        this.videoMediaTimeCallbacks = [];
        this.videoMediaFrameCallbacks = [];
        this.videoEndedCallbacks = [];
        this.videoPlayingCallbacks = [];
        this.videoCountdownCallbacks = [];
        this.videoSeekCallbacks = [];

        this.videoMediaTimeCallbacks.push(() => {
            this.setChooseStatus(false);
        });

        this.data = result;
        if (
            this.data.edges &&
            this.data.edges.questions &&
            this.data.edges.questions[0] &&
            this.data.edges.questions[0].type === 127
        ) {
            this.specialEvent = true;
        } else {
            this.specialEvent = false;
        }
        // 构造 hidden_vars table
        if (this.player.config.interactivePreview) {
            result.hidden_vars = result.hidden_vars_preview;
        }
        if (result.hidden_vars) {
            for (let i = 0; i < result.hidden_vars.length; i++) {
                this.table[result.hidden_vars[i]['id_v2']] = result.hidden_vars[i]['value'];
            }
        }

        // this.player.videoTop && this.player.videoTop.setInteractiveTitile(evalString(this.table, result.title!)); // todo: evalString
        if (result.buvid) {
            this.player.buvid = result.buvid;
        }
        let edge_id = this.player.config.interactiveNode;
        const aid = this.player.config.aid;
        const editor_mode = this.player.config.editorEdges;
        if (!editor_mode) {
            if (!edge_id && result.story_list!.length) {
                edge_id = result.story_list![0].edge_id;
            }

            if (result.no_evaluation) {
                this.disableEndingPanel = true;
            } else {
                this.disableEndingPanel = false;
            }
            if (result.story_list!.length) {
                if (!this.player.config.interactiveNode) {
                    this.player.interactiveVideoConfig!.interactiveData = Number(result.story_list![0].cid);
                    this.player.config.interactiveNode = String(result.story_list![0].edge_id);
                }
                if (!result.no_backtracking) {
                    this.schedule(result, String(result.edge_id), aid);
                    this.hiddenVars(result);
                }
            } else {
                this.player.interactiveVideoConfig!.interactiveData = this.player.config.cid;
                this.player.config.interactiveNode = String(this.player.config.interactiveNode) || edge_id;
            }
            if (result.is_leaf === 0) {
                this.player.interactiveVideoConfig!.interactiveLastPart = false;
                if (this.player.dashPlayer && (this.specialEvent || this.player.getTimeOffset() > 0)) {
                    this.setSeamless(true);
                }
            } else {
                this.player.interactiveVideoConfig!.interactiveLastPart = true;
                this.setSeamless(false);
            }
        }
        this.ivApiData = result;
        this.resizeBlock();
        this.playingCountdown(result); // ivUserLoadedCallback 没有，暂时加上了

        const ended = this.player && this.player.video && this.player.video.ended;
        if (ended && !editor_mode) {
            if (this.player.interactiveVideoConfig!.interactiveLastPart) {
                this.interactive.hide();
            } else {
                // this.player.controller.progressBar.segmentedData = <any>null;
                this.interactive.hide();
                $('.bilibili-player-video-interactive-button-list').show();
            }
            this.player.trigger(STATE.EVENT.INTERACTIVE_VIDEO_ENDED);
        }
    }

    ivUserLoadedCallback() {
        if (!this.player.user.status().login) {
            this.unloginSymbol = true;
            this.player.userLoadedCallback(status => {
                if (status.login && !status.error && this.unloginSymbol) {
                    this.unloginSymbol = false;
                    this.clearLocalProgress();
                    const data = this.getRequestData();
                    new ApiInteractive(data).getData({
                        success: (result: ApiInteractiveOutData) => {
                            if (result.code === 0) {
                                this.getResponseData(result);
                            } else if (result.code === 99003) {
                                this.setSeamless(false);
                            } else {
                                this.errorHanlder();
                            }
                        },
                        error: (result: ApiOutData) => {
                            this.errorHanlder(result);
                        },
                    });
                }
            });
        } else {
            this.clearLocalProgress();
        }
    }

    private errorHanlder(data?: ApiOutData) {
        this.player.interactive = undefined;
        if (data && data.message) {
            this.player.toast.addTopHinter(data.message, 5000, () => { }, false, true);
        } else {
            this.player.toast.addTopHinter('非常抱歉，选项加载失败，请刷新重试', 5000, () => { }, false, true);
        }
        this.destroy();
    }

    //回溯剧情
    private schedule(data: ApiInteractiveOutData, current_node: string, aid: number) {
        if (this.interactive) {
            this.interactive.remove();
        }
        const interactive = (this.interactive = $(`<div class="${this.prefix}-video-interactive"></div>`));
        const list = $(`<div class="${this.prefix}-video-interactive-list"></div>`);
        const ovalList = $(`<div class="oval-list"></div>`);
        const rightButton = (this.rightButton = $(
            `<div class='right-page'><span class="${this.prefix}-svg">${svg.enter}</span></div>`,
        ));
        const leftButton = (this.leftButton = $(
            `<div class='left-page'><span class="${this.prefix}-svg">${svg.enter}</span></div>`,
        ));

        const ovelListWidth = 50 * data.story_list!.length;
        const hoverContainer = $('<div>').addClass(`${this.prefix}-hover-items`).appendTo(this.interactive);
        interactive.remove();
        ovalList.css('width', ovelListWidth + `px`);
        //翻页
        if (data.story_list!.length > 8) {
            const playerW = this.player.template.playerWrap.width();
            interactive.append(leftButton, rightButton);
            rightButton.css('display', 'inline-block');
            leftButton.click(() => {
                const currentLeft = parseInt(ovalList.css('margin-left'), 10);
                const pageWidth = ovelListWidth - Math.abs(currentLeft);
                if (currentLeft < -400) {
                    ovalList.css('margin-left', currentLeft + 400);
                } else if (currentLeft >= -400) {
                    ovalList.css('margin-left', 0);
                    leftButton.hide();
                }
                rightButton.css('display', 'inline-block');
            });
            rightButton.click(() => {
                const currentLeft = parseInt(ovalList.css('margin-left'), 10);
                const pageWidth = ovelListWidth - Math.abs(currentLeft);
                if (pageWidth - 400 > 400) {
                    ovalList.css('margin-left', currentLeft - 400);
                } else {
                    ovalList.css('margin-left', currentLeft - (pageWidth - 400));
                    rightButton.hide();
                }
                leftButton.css('display', 'inline-block');
            });
        }
        //剧情回溯点逻辑
        for (let i = 0; i < data.story_list!.length; i++) {
            const nav = $(`<div class="${this.prefix}-video-interactive-oval check"></div>`);
            const check = $(`<div class="${this.prefix}-video-interactive-oval check"></div>`);
            const navSvg = $(
                `<div class="big-round"><div class="small normal"><span class="bilibili-player-video-svg">${svg.nav}</span></div><div class="small hover"><span class="bilibili-player-video-svg">${svg.navHover}</span></div></div>`,
            );
            const checkSvg = $(
                `<div class="big-round"><div class="small normal"><span class="bilibili-player-video-svg">${svg.check}</span></div><div class="small hover"><span class="bilibili-player-video-svg">${svg.checkHover}</span></div></div>`,
            );
            const button = $(`<div class="hover-item"></div>`);
            const arrow = $(`<div class="arrow"><div class="arrow-1"></div><div class="arrow-2"></div></div>`);
            const bg = $(`<div class="bg"></div>`);
            const text = $(`<div class="text"></div>`).text(data.story_list![i].title);
            const cover = $(`<div class="cover"><img src=${data.story_list![i].cover}></div>`); //${data.story_list[i].cover}
            button.append(bg, text, arrow, cover);
            //登录isCurrent走接口，未登录本地current_node
            if (
                this.player.user.status().login
                    ? data.story_list![i].is_current === 1
                    : String(data.story_list![i].edge_id) === current_node
            ) {
                if (i > 7) {
                    leftButton.css('display', 'inline-block');
                    const currentNodePage = (i + 1) / 8;
                    if (this.isInteger(currentNodePage)) {
                        ovalList.css('margin-left', -Math.floor(currentNodePage - 1) * 400);
                        if (i + 1 === data.story_list!.length) {
                            rightButton.hide();
                        }
                    } else {
                        if (i + 1 - Math.floor(data.story_list!.length / 8) * 8 >= 0) {
                            ovalList.css(
                                'margin-left',
                                -Math.floor(currentNodePage) * 400 + (400 - ((i + 1) % 8) * 50),
                            );
                            if (i + 1 === data.story_list!.length) {
                                rightButton.hide();
                            }
                        } else {
                            ovalList.css('margin-left', -Math.floor(currentNodePage) * 400);
                        }
                    }
                }
                hoverContainer.append(button);
                nav.append(navSvg);
                nav.hover(
                    () => {
                        const pos = nav.position();
                        const buttonWidth = button.width()!;
                        button.css({ top: pos.top, left: pos.left });
                        arrow.css('left', buttonWidth / 2 - 5);
                        button.show();
                        navSvg.find('.normal').css('display', 'none');
                        navSvg.find('.hover').css('display', 'block');
                    },
                    function () {
                        button.hide();
                        navSvg.find('.hover').css('display', 'none');
                        navSvg.find('.normal').css('display', 'block');
                    },
                );
                ovalList.append(nav);
            } else {
                check.click(() => {
                    this.player.interactiveVideoConfig!.portal = 1;
                    this.player.pause();
                    this.interactiveChoices = '';
                    this.player.interactiveVideoConfig!.interactiveTargetId = i;
                    this.player.interactiveVideoConfig!.interactiveHiddenVars = undefined;
                    this.callNextPart(
                        {
                            id: data.story_list![i].edge_id,
                            cid: data.story_list![i].cid,
                            option: data.story_list![i].title,
                        },
                        data.story_list![i].start_pos,
                    );
                });
                hoverContainer.append(button);
                check.append(checkSvg);
                check.hover(
                    () => {
                        const pos = check.position();
                        const buttonWidth = button.width()!;
                        button.css({ top: pos.top, left: pos.left });
                        arrow.css('left', buttonWidth / 2 - 5);
                        button.show();
                        checkSvg.find('.hover').css('display', 'block');
                        checkSvg.find('.normal').css('display', 'none');
                    },
                    function () {
                        button.hide();
                        checkSvg.find('.hover').css('display', 'none');
                        checkSvg.find('.normal').css('display', 'block');
                    },
                );
                ovalList.append(check);
            }
            list.append(ovalList);
        }
        interactive.append(list);
        if (data.story_list!.length > 8) {
            leftButton.after(list);
        } else {
            interactive.append(list);
        }
        //是否展现新手引导
        if (localStorage && localStorage.getItem('interactiveRookie') === 'yes' && !data.no_tutorial) {
            //新手提示
            const rookieGuide = (this.rookieGuide = $(
                `<div class="rookie-guide"><div class="text"><p>这里会记录你做过的选择,可随时点击返回</p><p><div class="icon"><span class="${this.prefix}-svg">${svg.rCheck}</span></div>已经历过的剧情</p><p><div class="icon"><span class="${this.prefix}-svg">${svg.rNav}</span></div>当前所在的剧情</p></div><div class="close-button">我知道了</div><div class="arrow"></div></div>`,
            ));
            this.player.template.playerWrap.append(rookieGuide);
            rookieGuide.show();
            rookieGuide.find('.close-button').click(() => {
                rookieGuide.remove();
            });
            setTimeout(() => {
                rookieGuide.remove();
            }, 5000);
            localStorage.setItem('interactiveRookie', 'no');
        }
        this.player.template.playerWrap.append(interactive);
        const playerWidth = $('#bilibiliPlayer').width()!;
        const ivWidth = interactive.width();
        interactive.css('left', playerWidth / 2);
        if (data.edges) {
            if (data.edges.questions) {
                for (let i = 0; i < data.edges.questions.length; i++) {
                    const type: number = data.edges.questions[i].type;
                    if (type === 0 || type === 1 || type === 2 || type === 3) {
                        if (data.edges.questions[i].duration <= 0)
                            //结尾选项
                            this.videoEndedCallbacks.push(() => {
                                interactive.hide();
                            });
                        else {
                            //qte模式
                            this.videoCountdownCallbacks.push(() => {
                                interactive.hide();
                            });
                        }
                    }
                }
            }
        }
        if (data.hidden_vars) {
            interactive.css('bottom', '100px');
        }
        interactive.show();
        this.setChooseStatus(false);
    }

    receiveWorldlineMsg(event: any) {
        if (event.origin === 'https://member.bilibili.com' && event.data.type === 'interactive.hidden_vars_preview') {
            const preData = event.data.data.hidden_vars_preview;
            for (let i = 0; i < preData.length; i++) {
                preData[i].value = this.ivApiData.hidden_vars_preview!.find((e) => e.id === preData[i].id)!.value;
            }
            if (this.hiddenVarsBlock) {
                this.hiddenVarsBlock.remove();
            }
            this.ivApiData.hidden_vars = preData;
            if (!this.countdownSymbol) {
                if (!this.isIvEnded) {
                    if (event.data.data.is_user_action) {
                        this.player.pause();
                        this.hiddenVars(this.ivApiData, true);
                    } else {
                        this.hiddenVars(this.ivApiData);
                    }
                }
                this.player.endingpanel &&
                    this.player.endingpanel.endingPanelReview &&
                    this.player.endingpanel.endingPanelReview.refresh();
            }
        } else if (
            // event.origin === 'https://uat-member.bilibili.com' &&
            event.data.type === 'interactive.edge_info_preview'
        ) {
            this.destroy();
            const editorData = event.data.data;
            this.ivApiData = editorData;
            console.log(editorData);
            this.init(editorData);
            console.log('ok');
        }
    }

    private hiddenVars(data: ApiInteractiveOutData, is_show?: boolean) {
        //是否展现提醒登录toast
        if (
            this.player.user.status().interaction &&
            this.player.user.status().interaction!['need_reload'] === 0 &&
            this.player.user.status().interaction!['msg'] &&
            !this.player.config.interactivePreview
        ) {
            this.player.toast.addBottomHinter({
                timeout: 5000,
                closeButton: true,
                text: this.player.user.status().interaction!['msg'],
                jump: '点击登录',
                jumpFunc: () => {
                    this.player.quicklogin.load();
                },
            });
        }
        const playerWidth = $('#bilibiliPlayer').width()!;
        if (data.hidden_vars) {
            this.hiddenVarsBlock && this.hiddenVarsBlock.remove();
            this.hiddenVarsShow = false;
            const hiddenVars = (this.hiddenVarsBlock = $(
                `<div class="${this.prefix}-video-hiddenVars"><div class="hide-star" ><span class="${this.prefix}-video-svg">${svg.hide}</span></div></div>`,
            ));
            for (let i = 0; i < data.hidden_vars.length; i++) {
                if (data.hidden_vars[i].is_show !== 0) {
                    const hideVarsBlock = (this.hiddenVarsBlockDom = $(
                        `<div class="hiddenVars"><div class="name"></div><div class="vars"></div></div>`,
                    ));
                    hideVarsBlock.children('.name').text(data.hidden_vars[i].name);
                    hideVarsBlock.children('.vars').text(data.hidden_vars[i].value);
                    hiddenVars.append(hideVarsBlock);
                    this.hiddenVarsShow = true;
                    hideVarsBlock.children('.name').css('max-width', (playerWidth * 0.8) / data.hidden_vars.length);
                }
            }
            if (this.hiddenVarsShow) {
                this.player.template.playerWrap.append(hiddenVars);
                const hiddenVarsStyle = document.querySelector(`.bilibili-player-video-hiddenVars`);
                $('.hiddenVars:last-child').css('border-right', 'none');
                hiddenVars.css('left', playerWidth / 2);
                if (data.edges && data.edges.questions) {
                    for (let i = 0; i < data.edges.questions.length; i++) {
                        const type: number = data.edges.questions[i].type;
                        if (type === 0 || type === 1 || type === 2 || type === 3) {
                            if (data.edges.questions[i].duration <= 0)
                                this.videoEndedCallbacks.push(() => {
                                    hiddenVars.hide();
                                });
                            else {
                                this.videoCountdownCallbacks.push(() => {
                                    hiddenVars.hide();
                                });
                            }
                        }
                    }
                }
                hiddenVars.show();
                this.interactive.css('bottom', '100px');
                if (is_show) {
                    animate({
                        from: {
                            background: 'rgba(0, 0, 0, 0.3)',
                        },
                        to: {
                            background: '#00a1d6',
                        },
                        duration: 400,
                        ease: linear,
                        repeatType: 'loop',
                        onUpdate(latest) {
                            styler(hiddenVarsStyle!).set(latest);
                        },
                    });
                }
            } else {
                this.interactive.css('bottom', '54px');
            }
        }
    }

    private preloadPlayurl(choices: Array<StoryChoices>) {
        if (this.preloadSymbol || this.player.config.inner) {
            // 暂时不做内网预取
            return true;
        } else if (
            this.player.dashPlayer &&
            (this.player.dashPlayer.getBufferLength() > 9 || this.player.duration()! - this.player.currentTime()! < 9)
        ) {
            this.preloadSymbol = true;
            if (choices && choices.length) {
                for (let i = 0; i < choices.length; i++) {
                    let config: IPreloadConfig = {
                        cid: choices[i].cid!,
                    };
                    if (this.specialEvent) {
                        config.abufferLength = 200 * 1024;
                        config.vbufferLength = 5000 * 1024;
                    }
                    choices[i].cid && this.videoPreload.preload(config);
                }
            }
        }
    }

    isInteger(obj: number) {
        return obj % 1 === 0;
    }

    replay(version: number) {
        let data: ApiInteractiveInData = {
            aid: this.player.config.aid,
            bvid: this.player.config.bvid,
            graph_version: version,
            platform: 'pc',
            portal: this.player.interactiveVideoConfig!.portal!,
            screen: this.player.state.mode,
        };
        if (this.player.config.bvid) {
            delete (<any>data).aid;
        }
        if (this.player.config.interactivePreview) {
            data.preview = true;
        } else if (this.player.config.interactiveGraphId) {
            data.manager = true;
        }
        new ApiInteractive(data).getData({
            success: (result: ApiInteractiveOutData) => {
                this.data = result;
                if (this.data.code === 0) {
                    this.callNextPart({
                        cid: this.data.story_list[0].cid,
                        id: this.data.story_list[0].edge_id,
                        option: this.data.story_list[0].title,
                    });
                } else {
                    this.player.user.reload((userStatus: IUserStatusInterface) => {
                        this.replay(Number(userStatus.interaction!['graph_version']));
                    });
                }
            },
        });
    }

    //互动选项
    private chooseButton(data: ApiInteractiveOutData, aid: number, current_node: string, title: string) {
        //canvas
        if (!this.canvasBlock) {
            const canvas = (this.canvasBlock = $(`<div id="interactiveCanvas"></div>`));
            this.player.template.playerWrap.append(canvas);
            const stage = new Konva.Stage({
                container: 'interactiveCanvas', // id of container <div>
                width: this.canvasWidth,
                height: this.canvasHeight,
            });
            this.stage = stage;
        }
        this.addReplayButton();
        this.canvasInteractive(data, current_node);
    }

    private addReplayButton() {
        if (this.replayButton) {
            return true;
        }
        const replayButton = (this.replayButton = $(
            `<div class="replay"><div class="replay-svg"><span class="${this.prefix}-svg">${svg.replay}</span></div><div class="replay-text">重播</div></div>`,
        ));

        //重播按钮
        replayButton.click(() => {
            this.endLayer && this.endLayer.destroy();
            this.stage && this.stage.batchDraw();
            this.resetPlayingMode();
            clearTimeout(this.countdownTimer);
            this.countdownSymbol = false;
            this.isIvEnded = false;
            this.countdown && this.countdown.hide();
            this.stage && this.stage.hide();
            this.interactive && this.interactive.show();
            this.hiddenVarsBlock && this.hiddenVarsBlock.show();
            this.setChooseStatus(false);
            this.player.seek(0);
            this.player.play();

            // special
            this.indicator && this.indicator.destroy();
            this.butterfly && this.butterfly.destroy();
            this.specialEvent && this.canvasBlock && this.canvasBlock.empty().hide();
            this.specialChoose = undefined;
        });
        this.player.template.playerWrap.append(replayButton);
    }

    private videoEventHandler(name: string) {
        if (!this.initialized) {
            return true;
        }
        if (!(<any>this)[`video${name}Callbacks`]) {
            console.warn(`video${name}Callbacks is undefined`, this);
            return true;
        }
        for (let i = 0; i < (<any>this)[`video${name}Callbacks`].length; i++) {
            if (typeof (<any>this)[`video${name}Callbacks`][i] === 'function') {
                (<any>this)[`video${name}Callbacks`][i]();
            }
        }
    }

    private videoSpecialChooseStartSchedule(data: IQuestions, dimension: any) {
        if (!this.initialized) {
            return true;
        }
        this.countdownSymbol = true;
        this.addReplayButton();
        this.replayButton && this.replayButton.show();
        this.player.danmaku!.visible(false);
        this.interactive && this.interactive.hide();
        this.canvasBlock && this.canvasBlock.show();
        this.player.template.playerArea.removeClass('video-state-pause');
        // console.debug('schedule in, block controller, start repeat button');
        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.display = 'none';
        element.style.zIndex = '1';
        const selected = data.choices[0].selected!;
        this.indicator = new FrameAnimation({
            element: element,
            repeat: true,
            colums: selected.colums,
            fps: selected.fps,
            item_count: selected.item_count,
            item_height: selected.item_height,
            item_width: selected.item_width,
            source_pic: selected.source_pic,
            scale: selected.position.width / selected.item_width,
        });
        this.specialWrap = document.createElement('div');
        this.specialWrap.style.width = dimension.width + 'px';
        this.canvasBlock!.append(this.specialWrap);
        this.specialWrap.appendChild(element);
        for (let i = 0; i < data.choices.length; i++) {
            if (
                data.choices[i].is_hidden ||
                (data.choices[i].condition &&
                    !Boolean(Number(evalString(this.table, `\`${data.choices[i].condition}\``))))
            ) {
                continue;
            }
            const area = document.createElement('div');
            area.style.position = 'absolute';
            area.style.left = data.choices[i].x + 'px';
            area.style.bottom = data.choices[i].y + 'px';
            area.style.width = data.choices[i].width + 'px';
            area.style.height = data.choices[i].height + 'px';
            area.style.cursor = 'pointer';
            area.style.background = 'transparent';
            this.specialWrap.appendChild(area);
            $(area).on('click touchstart', () => {
                const selectedDom = this.specialWrap.querySelector('[iv-selected]');
                selectedDom && selectedDom.removeAttribute('iv-selected');
                if (selectedDom !== area) {
                    this.indicator.start();
                    this.specialChoose = i;
                    area.setAttribute('iv-selected', 'true');
                    element.style.left =
                        data.choices[i].selected!.position.x - data.choices[i].selected!.position.width / 2 + 'px';
                    element.style.bottom =
                        data.choices[i].selected!.position.y - data.choices[i].selected!.position.height / 2 + 'px';
                    element.style.display = 'block';
                } else {
                    this.indicator.stop();
                    this.specialChoose = undefined;
                    element.style.display = 'none';
                }
            });
        }
        this.buildEndPointer(data.type);
    }

    private videoSpecialChooseEndSchedule(data: IQuestions) {
        if (!this.initialized) {
            return true;
        }
        this.resizeBlock();
        this.replayButton && this.replayButton.hide();
        if (typeof this.specialChoose !== 'undefined') {
            $(this.specialWrap).empty();
            const i = this.specialChoose;
            // console.debug('schedule out, start butterfly');
            const element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.left =
                data.choices[i].submited!.position.x - data.choices[i].submited!.position.width / 2 + 'px';
            element.style.bottom =
                data.choices[i].submited!.position.y - data.choices[i].submited!.position.height / 2 + 'px';
            element.style.zIndex = '1';
            const submited = data.choices[i].submited!;
            this.butterfly = new FrameAnimation({
                element: element,
                repeat: false,
                colums: submited.colums,
                fps: submited.fps,
                item_count: submited.item_count,
                item_height: submited.item_height,
                item_width: submited.item_width,
                source_pic: submited.source_pic,
                scale: submited.position.width / submited.item_width,
                endCallback: () => {
                    // console.debug('butterfly ended, final choose ' + i);
                    this.canvasBlock!.empty();
                    // this.resetPlayingMode(); // 一定是在结尾前？
                    this.specialChooseHandler(data);
                },
            });
            this.indicator.destroy();
            this.specialWrap.appendChild(element);
            this.butterfly.start();
        } else {
            this.specialChooseHandler(data);
            // console.debug('schedule out, no butterfly');
        }
    }

    private specialChooseHandler(data: IQuestions) {
        if (typeof this.specialChoose === 'undefined' && data.choices) {
            this.specialChoose = 0;
            for (let j = 0; j < data.choices.length; j++) {
                if (data.choices[j].is_default) {
                    const condition = data.choices[j].condition;
                    if ((condition && Boolean(Number(evalString(this.table, `\`${condition}\``)))) || !condition) {
                        this.specialChoose = j;
                    }
                }
            }
        }
        // console.debug(`准备跳转${this.specialChoose}`);
        this.chooseHandler(data.choices[this.specialChoose!]);
        this.seamlessLoad(data.choices[this.specialChoose!]);
    }

    private videoMiddleChooseSchedule(data: IQuestions) {
        if (!this.initialized) {
            return true;
        }
        if (data.pause_video === 1) {
            this.player.pause();
            this.player.template.playerArea.removeClass('video-state-pause');
        }
        this.resizeBlock();
        const middleLayer = new Konva.Layer();
        const middleButtonGroup = new Konva.Group({
            opacity: 0,
        });
        const middleTitle = data.title;
        const linearBGHeight = this.canvasHeight / this.stage.attrs.scaleX / 2;
        const currentCW = this.canvasWidth / this.stage.attrs.scaleX;
        const middleBG = new Konva.Rect({
            x: 0,
            y: linearBGHeight,
            width: currentCW,
            height: linearBGHeight,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: linearBGHeight },
            fillLinearGradientColorStops: [0, 'rgba(0,0,0,0.0)', 1, '#000000'],
        });
        middleLayer.add(middleBG);
        if (middleTitle) {
            const titleText = new Konva.Text({
                id: 'text',
                text: evalString(this.table, middleTitle),
                fontSize: data.choices.length === 0 ? 36 : 16,
                wrap: 'char',
                ellipsis: true,
                fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, 'PingFang SC','Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                fill: hex8ToRgba(this.ivApiData.edges!.skin.title_text_color!),
                height: 52,
                width: currentCW,
                align: 'center',
                verticalAlign: 'middle',
                shadowColor: hex8ToRgba(this.ivApiData.edges!.skin.title_shadow_color!),
                shadowBlur: this.ivApiData.edges!.skin.title_shadow_radius,
                shadowOffsetX: this.ivApiData.edges!.skin.title_shadow_offset_x || 0,
                shadowOffsetY: -this.ivApiData.edges!.skin.title_shadow_offset_y! || 0,
            });
            titleText.y(data.choices.length === 0 ? linearBGHeight * 2 - 88 : linearBGHeight * 2 - 108);
            middleLayer.add(titleText);
            this.endLayer && this.endLayer.destroy();
            this.stage.add(middleLayer);
            this.middleLayer = middleLayer;
            this.middleLayer.batchDraw();
            this.stage.show();
        }
        const localChoices = JSON.parse(JSON.stringify(data.choices));
        for (let i = 0; i < localChoices.length; i++) {
            const condition = localChoices[i].condition;
            if (condition && !Boolean(Number(evalString(this.table, `\`${condition}\``)))) {
                localChoices.splice(i, 1);
                i--;
                continue;
            }
        }
        for (let i = 0; i < localChoices.length; i++) {
            intButton(localChoices[i], 4, this.ivApiData.edges!.skin, localChoices.length).then(
                (middleButton: Konva.Group) => {
                    if (localChoices.length < 4) {
                        middleButton.y(0);
                        //only one
                        if (localChoices.length === 1) {
                            middleButton.x(332);
                        }
                        //two
                        if (localChoices.length === 2) {
                            if (i === 0) {
                                middleButton.x(171);
                            } else {
                                middleButton.x(496);
                            }
                        }
                        //three
                        if (localChoices.length === 3) {
                            if (i === 0) {
                                middleButton.x(116);
                            } else if (i === 1) {
                                middleButton.x(330);
                            } else {
                                middleButton.x(542);
                            }
                        }
                    } else {
                        if (i === 0) {
                            middleButton.x(92);
                        } else if (i === 1) {
                            middleButton.x(256);
                        } else if (i === 2) {
                            middleButton.x(420);
                        } else if (i === 3) {
                            middleButton.x(584);
                        }
                        middleButton.y(0);
                    }
                    middleButtonGroup.add(middleButton);
                    this.stage.add(middleLayer);
                    this.middleLayer = middleLayer;
                    this.middleLayer.batchDraw();
                    this.stage.show();
                    middleButtonGroup.y(this.canvasHeight / this.stage.attrs.scaleX + 100);
                    middleLayer.add(middleButtonGroup);

                    const choicesTween = new Konva.Tween({
                        node: middleButton,
                        scaleX: 1.03,
                        scaleY: 1.03,
                        easing: Konva.Easings.Linear,
                        duration: 0.2,
                    });
                    const listTween1 = new Konva.Tween({
                        node: middleButtonGroup,
                        y: this.canvasHeight / this.stage.attrs.scaleX - 42,
                        opacity: 1,
                        easing: Konva.Easings.Linear,
                        duration: 0.3,
                    });
                    listTween1.play();
                    //选项事件
                    middleButton.on('mouseover', () => {
                        this.stage.container().style.cursor = 'pointer';
                        choicesTween.play();
                    });
                    middleButton.on('mouseout', () => {
                        this.stage.container().style.cursor = 'default';
                        choicesTween.reverse();
                    });

                    middleButton.on('click touchstart', () => {
                        if (localStorage && !localStorage.getItem('interactiveRookie')) {
                            localStorage.setItem('interactiveRookie', 'yes');
                        } else {
                            localStorage.setItem('interactiveRookie', 'no');
                        }
                        this.replayButton!.hide();
                        this.player.danmaku!.visible(this.player.state.danmaku);
                        clearTimeout(this.countdownTimer);
                        this.stage.container().style.cursor = 'default';
                        animate({
                            ...this.choiceKeyframe,
                            onUpdate: (o: { scale: number }) => {
                                middleButton.scaleX(o.scale);
                                middleButton.scaleY(o.scale);
                                middleLayer.batchDraw();
                            },
                            onComplete: () => {
                                this.chooseHandler(data.choices[i], true);
                                this.stage.hide();
                                middleLayer && middleLayer.destroy();
                                if (this.interactive) {
                                    this.interactive.show();
                                }
                                this.countdownSymbol = false;
                                this.player.play();

                                this.resetPlayingMode();
                                clearTimeout(this.countdownTimer);

                                if (this.countdown) {
                                    this.countdown.hide();
                                }
                                if (this.hiddenVarsBlock) {
                                    this.hiddenVarsBlock.show();
                                }
                                this.middleSeek(data.choices[i]);
                            },
                        });
                    });
                    if (data.pause_video === 0) {
                        if (this.defaultChoAni.length === 0) {
                            this.defaultChoAni.push(middleButton);
                        }
                        if (localChoices[i].is_default === 1) {
                            this.defaultChoices = localChoices[i];
                            this.defaultChoicesNumber = i;
                            this.defaultChoAni = [];
                            this.defaultChoAni.push(middleButton);
                        }
                    }
                },
            );
        }
        if (data.pause_video === 0) {
            if (data.duration === -1) {
                const remainingTime = (this.player.duration()! - data.start_time! / 1000) * 1000;
            } else {
                this.countDown(data.duration, this.defaultChoices, this.defaultChoicesNumber, data.type);
            }
        }
        if (this.hiddenVarsBlock) {
            this.hiddenVarsBlock.hide();
        }
        if (this.interactive) {
            this.interactive.hide();
        }
        this.buildEndPointer(data.type);
    }

    getDisableTime(time: number) {
        if (this.ivApiData && this.ivApiData.edges && this.ivApiData.edges.questions) {
            for (let i = 0; i < this.ivApiData.edges.questions.length; i++) {
                if (this.specialEvent) {
                    if (
                        time * 1000 > this.ivApiData.edges.questions[i].start_time! &&
                        time * 1000 <
                        this.ivApiData.edges.questions[i].duration + this.ivApiData.edges.questions[i].start_time!
                    ) {
                        // console.debug(`seek目标时间 ${time} 处于 choice${i} 的${this.ivApiData.edges.questions[i].start_time / 1000} ~ ${this.ivApiData.edges.questions[i].duration / 1000}之间`);
                        return this.player.duration()! - this.ivApiData.edges.questions[i].start_time! / 1000 || 0;
                    }
                    return 0;
                } else {
                    const type = this.ivApiData.edges.questions[i].type;
                    if (type === 4) {
                        if (
                            time * 1000 > this.ivApiData.edges.questions[i].start_time! &&
                            time * 1000 <
                            this.ivApiData.edges.questions[i].duration +
                            this.ivApiData.edges.questions[i].start_time!
                        ) {
                            return this.player.duration()! - this.ivApiData.edges.questions[i].start_time! / 1000 || 0;
                        }
                    }
                    if (type === 0 || type === 1 || type === 2 || type === 3) {
                        return this.ivApiData.edges.questions[i].duration / 1000 || 0;
                    }
                }
            }
        } else {
            return 0;
        }
    }

    //播放中倒计时
    private playingCountdown(data: ApiInteractiveOutData) {
        //data.edges.qte_style = 2; // test
        if (data && data.edges && data.edges.questions) {
            for (let i = 0; i < data.edges.questions.length; i++) {
                // start_time_r 处理
                if (
                    !data.edges.questions[i].start_time &&
                    data.edges.questions[i].start_time_r &&
                    this.player.duration()
                ) {
                    data.edges.questions[i].start_time =
                        this.player.duration()! * 1000 - data.edges.questions[i].start_time_r!;
                }

                // skin 预取
                if (data.edges.skin && data.edges.skin.choice_image) {
                    this.videoPreload.preloadImage(data.edges.skin.choice_image);
                }

                const type = this.ivApiData.edges!.questions[i].type;
                if (type === 0 || type === 1 || type === 2 || type === 3) {
                    this.videoMediaTimeCallbacks.push(() => {
                        const videoDuration = this.player.duration()!;
                        const videoCurrentTime = this.player.currentTime()!;
                        const remainingTime = videoDuration - videoCurrentTime;
                        const countdownTime = data.edges!.questions[i].duration / 1000;
                        if (!this.countdownSymbol) {
                            if (
                                remainingTime <= countdownTime &&
                                this.countdownSymbol === false &&
                                videoDuration !== 0
                            ) {
                                const editor_mode = this.player.config.editorEdges;
                                if (!editor_mode) {
                                    this.countdownSymbol = true;
                                    this.player.trigger(STATE.EVENT.INTERACTIVE_VIDEO_COUNTDOWN_START);
                                }
                            }
                        }
                        this.preloadPlayurl(data.edges!.questions[i].choices);
                    });
                } else {
                    if (this.specialEvent) {
                        // 拜年祭的特殊处理
                        data.edges.questions[i].duration =
                            (this.player.duration()! + 1) * 1000 ||
                            data.edges.questions[i].fade_out_time! - data.edges.questions[i].start_time! + 1000;
                        // 预取过渡图片
                        if (data.edges.questions[i].choices) {
                            const choices = data.edges.questions[i].choices;
                            for (let k = 0; k < choices.length; k++) {
                                if (choices[k].selected && choices[k].selected!.source_pic) {
                                    choices[k].selected!.source_pic = choices[k].selected!.source_pic.replace(
                                        /^(http:)?\/\//,
                                        'https://',
                                    );
                                    this.videoPreload.preloadImage(choices[k].selected!.source_pic);
                                }
                                if (choices[k].submited && choices[k].submited!.source_pic) {
                                    choices[k].submited!.source_pic = choices[k].submited!.source_pic.replace(
                                        /^(http:)?\/\//,
                                        'https://',
                                    );
                                    this.videoPreload.preloadImage(choices[k].submited!.source_pic);
                                }
                            }
                        }

                        this.videoEndedCallbacks.push(() => {
                            // console.debug('播放结束，开始筛选');
                            this.player.danmaku!.visible(this.player.state.danmaku);
                            this.callNextPart(data.edges!.questions[i].choices[this.specialChoose!]);
                        });
                    }
                    this.videoMediaFrameCallbacks.push(() => {
                        const videoDuration = this.player.duration();
                        const videoCurrentTime = this.player.currentTime();
                        const startTime = data.edges!.questions[i].start_time! / 1000;
                        let duration = data.edges!.questions[i].duration / 1000;
                        if (this.specialEvent) {
                            duration =
                                (data.edges!.questions[i].fade_out_time! - data.edges!.questions[i].start_time!) / 1000;
                            this.preloadPlayurl(data.edges!.questions[i].choices);
                        }
                        if (!this.countdownSymbol) {
                            if (
                                startTime < videoCurrentTime! &&
                                (duration === -0.001 ? true : startTime + duration > videoCurrentTime!) &&
                                !this.countdownSymbol &&
                                videoDuration !== 0 &&
                                this.videoMiddleLastId !== i
                            ) {
                                this.videoMiddleLastId = i;
                                this.middleLayer && this.middleLayer.destroy();
                                // this.player.trigger(STATE.EVENT.INTERACTIVE_VIDEO_MIDDLE_COUNTDOWN_START);
                                if (this.specialEvent) {
                                    this.videoSpecialChooseStartSchedule(
                                        data.edges!.questions[i],
                                        data.edges!.dimension,
                                    );
                                } else {
                                    this.videoMiddleChooseSchedule(data.edges!.questions[i]);
                                }
                            } else if (
                                (startTime > videoCurrentTime! || startTime + duration < videoCurrentTime!) &&
                                videoDuration !== 0
                            ) {
                                // 不在当前区域的时候，如果 lastid 还在本区域，则重置 lastid
                                if (this.videoMiddleLastId === i) {
                                    this.videoMiddleLastId = undefined;
                                }
                            }
                        } else if (
                            (startTime > videoCurrentTime! || startTime + duration < videoCurrentTime!) &&
                            videoDuration !== 0
                        ) {
                            // 不在当前区域的时候，如果 lastid 还在本区域，则重置 lastid
                            if (this.videoMiddleLastId === i) {
                                this.videoMiddleLastId = undefined;
                                if (this.specialEvent) {
                                    this.videoSpecialChooseEndSchedule(data.edges!.questions[i]);
                                }
                            }
                        }
                    });
                }
            }
        }

        if (this.specialEvent) {
            if (!this.canvasBlock) {
                this.canvasBlock = $(`<div class="interactive-css-block"></div>`).hide();
                this.player.template.playerWrap.append(this.canvasBlock);
            }
        } else {
            this.chooseButton(data, this.player.config.aid, String(data.edge_id), data.title!);
        }
    }

    private resizeBlock() {
        const video = this.player.video;
        const videoAspectRatioExist = video && video.videoWidth && video.videoHeight;
        if (!this.initialized || !videoAspectRatioExist || !this.canvasBlock) {
            return false;
        }

        //根据视频分辨率定位
        const hasBlackSide =
            this.player.globalFunction.WINDOW_AGENT.toggleBlackSide &&
            this.player.get('video_status', 'blackside_state') &&
            this.player.state.mode === STATE.UI_NORMAL;
        const blackSideLeft = 7;
        const blackSideTop = 48;
        const hiddenNames = $('.hiddenVars .name');
        const clientH = this.player.template.playerWrap[0].clientHeight - (hasBlackSide ? blackSideTop * 2 : 0);
        const clientW = this.player.template.playerWrap[0].clientWidth - (hasBlackSide ? blackSideLeft * 2 : 0);
        const videoDom = this.player.template.videoWrp[0];
        const listBlock = (this.listBlock = $(`.${this.prefix}-video-interactive-button`));
        const canvasBlock = this.canvasBlock;
        let ratio = video.videoWidth / video.videoHeight;
        let videoRatio = 1;
        if (this.player.template.videoWrp.hasClass('video-size-4-3')) {
            videoRatio = 4 / 3;
        } else if (this.player.template.videoWrp.hasClass('video-size-16-9')) {
            videoRatio = 16 / 9;
        } else {
            canvasBlock.css('transform', '');
        }
        let videoR = clientW / clientH;
        if (videoR >= ratio) {
            //竖屏视频
            const W = Math.round(videoDom.clientHeight * ratio);
            this.canvasWidth = W;
            this.canvasHeight = clientH;
            canvasBlock.css('width', W);
            canvasBlock.css('height', clientH);
            canvasBlock.css('left', (clientW - W) / 2 + (hasBlackSide ? blackSideLeft : 0));
            canvasBlock.css('bottom', hasBlackSide ? blackSideTop : 0);
        } else {
            //横屏视频
            const H = Math.round(videoDom.clientWidth / ratio);
            this.canvasWidth = clientW;
            this.canvasHeight = H;
            canvasBlock.css('width', clientW);
            canvasBlock.css('height', H);
            canvasBlock.css('left', hasBlackSide ? blackSideLeft : 0);
            canvasBlock.css('bottom', (clientH - H) / 2 + (hasBlackSide ? blackSideTop : 0));
        }
        if (videoRatio !== 1) {
            if (videoR / videoRatio < 1) {
                canvasBlock.css('transform', `scale(1, ${ratio / videoRatio})`);
            } else {
                canvasBlock.css('transform', `scale(${videoRatio / ratio}, 1)`);
            }
        }
        const scaleY = canvasBlock.width()! / this.defaultWidth;
        let scaleX = scaleY;
        // tmp policy for 4:3 or 16:9 size

        const isMirror = SessionController.getSession('video_status', 'videomirror');

        //canvas resize
        this.resizeCanvas(scaleX, scaleY);
        if (this.interactive) {
            this.interactive.css('left', clientW / 2);
        }
        if (this.hiddenVarsBlock) {
            this.hiddenVarsBlock.css('left', clientW / 2);
            hiddenNames.css('max-width', (clientW * 0.6) / hiddenNames.length);
        }
        if (this.specialWrap) {
            $(this.specialWrap).css({
                height: (this.canvasBlock.height()! * $(this.specialWrap).width()!) / this.canvasBlock.width()! + 'px',
                transform: `scale(${this.canvasBlock.width()! / $(this.specialWrap).width()!})`,
                'transform-origin': 'top left',
            });
        }
    }

    //倒计时
    private countDown(ctTime: number, defaultChoices: StoryChoices, choicesNumber: number, type?: number) {
        clearTimeout(this.countdownTimer);
        const countdown = (this.countdown = $(`<div class="countdown"></div>`));
        const bar = (this.bar = $(`<div class="bar"></div>`));
        countdown.append(bar);
        if (this.ivApiData.edges!.skin) {
            bar.css('background', hex8ToRgba(this.ivApiData.edges!.skin.progressbar_color!));
            bar.css('box-shadow', hex8ToRgba(this.ivApiData.edges!.skin.progressbar_shadow_color!));
        }
        bar.css('animation', 'linear count-down ' + ctTime / 1000 + 's');
        this.player.template.playerWrap.append(countdown);
        this.countdownTimer = window.setTimeout(() => {
            if (localStorage && !localStorage.getItem('interactiveRookie')) {
                localStorage.setItem('interactiveRookie', 'yes');
            } else {
                localStorage.setItem('interactiveRookie', 'no');
            }
            animate({
                from: {
                    scale: 1,
                },
                to: {
                    scale: 0.93,
                },
                duration: 300,
                ease: easeInOut,
                onUpdate: (o: { scale: number }) => {
                    this.defaultChoAni.forEach((c) => {
                        c.scaleX(o.scale);
                        c.scaleY(o.scale);
                        this.stage.batchDraw();
                    });
                },
                onComplete: () => {
                    this.countdownSymbol = false;
                    if (type !== 4) {
                        this.chooseHandler(defaultChoices);
                        this.callNextPart(defaultChoices);
                    } else {
                        this.chooseHandler(defaultChoices, true);
                        this.stage.hide();
                        this.middleLayer && this.middleLayer.destroy();
                        if (this.interactive) {
                            this.interactive.show();
                        }
                        this.countdownSymbol = false;
                        this.player.play();

                        this.resetPlayingMode();
                        clearTimeout(this.countdownTimer);
                        if (this.countdown) {
                            this.countdown.hide();
                        }
                        if (this.hiddenVarsBlock) {
                            this.hiddenVarsBlock.show();
                        }
                        this.middleSeek(defaultChoices);
                    }
                },
            });
        }, ctTime);
    }

    private buildEndPointer(type: number) {
        this.timer = +new Date();
        this.replayButton && this.replayButton.show();
        this.player.danmaku!.visible(false);
        this.resizeBlock();
        if (this.rookieGuide) {
            this.rookieGuide.remove();
        }
        $('#bilibiliPlayer').addClass(`${this.player.prefix}-interactive`);
        // this.player.template.videoTop.addClass('interactive-hide');
        this.player.template.controller.addClass('interactive-hide');
        if (this.player.config.gamePlayer) {
            this.player.template.sendbar.addClass('interactive-hide');
        }
    }

    seamlessLoad(node: StoryChoices) {
        if (!this.player.dashPlayer || this.seamlessSymbol || this.isDisableSeamless()) {
            return true;
        }
        if (!node) {
            this.setSeamless(false);
            return this.seamlessSymbol;
        }
        const data = this.videoPreload.getData(node.cid!);
        let preloadPlayurlData: any, preloadVideoData: any;
        if (data) {
            this.seamlessSymbol = true;
            preloadPlayurlData = data.playurlData;
            preloadVideoData = data.videoData;
        } else {
            this.setSeamless(false);
            return this.seamlessSymbol;
        }
        this.seamlessPromise = new Promise((resolve: any, reject) => {
            this.player.dashPlayer!
                .appendSource(preloadPlayurlData.mediaDataSource['url'], preloadVideoData, true)
                .then((e: any) => {
                    this.player.dashPlayer!.switchSuccess = true;
                    resolve();
                })
                .catch((err: any) => {
                    if (this.player.dashPlayer) {
                        this.player.dashPlayer.setEndOfStreamState(true);
                    }
                    this.player.dashPlayer!.switchSuccess = undefined;
                    resolve();
                });
        });
    }

    callNextPart(node: StoryChoices, startPos?: number) {
        if (this.seamlessSymbol && this.seamlessPromise) {
            this.seamlessPromise.then(() => {
                this.seamlessPromise = undefined;
                this.callNextPart(node, startPos);
            });
            return false;
        }
        if (this.player.controller.getContainerFocus()) {
            this.player.keepFocus = true;
        }
        this.resetPlayingMode();
        this.player.config.autoShift = true;

        this.player.container.addClass(`${this.player.prefix}-interactive-hide`);
        clearTimeout(this.countdownTimer);
        let preloadPlayurlData, preloadVideoData;
        const data = this.videoPreload.getData(node.cid!);
        if (data) {
            preloadPlayurlData = data.playurlData;
            preloadVideoData = data.videoData;
        }
        this.videoPreload.abort();
        this.player.template.playerArea.removeClass('video-state-pause');
        if (!this.player.config.stableController) {
            this.player.template.csIn(false);
        }
        this.player.interactiveVideoConfig!.interactiveChoices = this.interactiveChoices;
        this.updateProgress();
        this.player.reload(
            {
                aid: this.player.config.aid,
                cid: node.cid,
                bvid: this.player.config.bvid,
                p: 1,
                autoplay: true,
                interactiveNode: node.id,
                interactiveTime: +new Date() - this.timer,
                interactivePreview: this.player.config.interactivePreview,
                interactiveGraphId: this.player.config.interactiveGraphId,
                interactiveChoices: this.player.interactiveVideoConfig!.interactiveChoices,
                t: startPos ? startPos / 1000 : undefined,
            },
            preloadPlayurlData,
            preloadVideoData,
            this.player.config.interactivePersistentDanmaku,
        );
        this.player.danmaku!.visible(this.player.state.danmaku);
    }

    private updateProgress() {
        if (this.player.interactiveVideoConfig!.portal === 0 && !this.player.user.status().login) {
            // 正常选择后，清除之后的所有记录(因为选择可能导致不同的结果)
            const preLocalData = this.getLocalProgress()!;
            const ptr = preLocalData.list.length;
            if (ptr > this.player.interactiveVideoConfig!.interactiveTargetId!) {
                // 如果下一P的隐藏数值不一致再删掉
                let valueSame = true;
                const data = preLocalData.list[this.player.interactiveVideoConfig!.interactiveTargetId! + 1];
                const hidden_vars = this.table;
                if (data && data.hidden_vars && data.hidden_vars.length) {
                    for (let i = 0; i < data.hidden_vars.length; i++) {
                        if (
                            typeof this.table[data.hidden_vars[i].id_v2] === 'undefined' ||
                            this.table[data.hidden_vars[i].id_v2] !== data.hidden_vars[i].value
                        ) {
                            valueSame = false;
                        }
                    }
                } else {
                    valueSame = false;
                }
                if (!valueSame) {
                    preLocalData.list.splice(this.player.interactiveVideoConfig!.interactiveTargetId! + 1, ptr);
                }
            }
            this.saveLocalProgress(preLocalData);
            // 正常选择时，更新 hidden_vars 和 targetIndex;
            this.player.interactiveVideoConfig!.interactiveTargetId!++;
            let hidden_vars = this.player.interactiveVideoConfig!.interactiveHiddenVars;
            for (let i = 0; i < hidden_vars!.length; i++) {
                if (typeof this.table[hidden_vars![i].id_v2] !== 'undefined') {
                    hidden_vars![i].value = this.table[hidden_vars![i].id_v2];
                }
            }
        }
    }

    // 本地存档总逻辑
    // 首次初始化互动视频时， interactiveTargetId 置为 0
    // 接口返回数据时，进行本地存档筛选逻辑：
    //   1. 如果本地存储的 graph_version 相符，则取出存档，否则丢弃存档
    //   2. 如果本地存档有 index = interactiveTargetId 的节点，则使用这个 index 的节点，否则使用接口返回的节点
    //   3. 如果节点有 hidden_vars 则使用节点的 hidden_vars ，否则判断是否有 interactiveHiddenVars ， 如果有则赋值，还是没有则使用接口返回的 hidden_vars
    //   4. 总是使用本地存档的信息重新给 story_list 赋值
    //   5. 正常选择时， index + 1 ， 并清除本地存档 > index 的记录，跳转节点则置跳转 index 为 interactiveTargetId ，清除 interactiveHiddenVars
    private setLocalProgress(result: ApiInteractiveOutData) {
        try {
            const currentStoryInfo = {
                cid: this.player.config.cid,
                edge_id: String(result.edge_id),
                title: result.title!,
                cover: `//i0.hdslb.com/bfs/steins-gate/${this.player.config.cid}_screenshot.jpg`,
                start_pos: 0,
                cursor: 0,
            };

            let info = currentStoryInfo;
            let cver = String(this.player.user.status().interaction!['graph_version']);
            let index = this.player.interactiveVideoConfig!.interactiveTargetId;

            let preLocalData = this.getLocalProgress()!;
            if (!preLocalData) {
                preLocalData = { ver: cver, aid: this.player.config.aid, bvid: this.player.config.bvid, list: [] };
            }
            if (cver === preLocalData.ver) {
                if (!Array.isArray(preLocalData.list)) {
                    preLocalData.list = [];
                }

                if (!preLocalData.list[index!]) {
                    preLocalData.list[index!] = { ptr: index!, info: info };
                }
            } else {
                // 玩本地存档玩着玩着远端 graph_version 变了, 极端处理
                index = this.player.interactiveVideoConfig!.interactiveTargetId = 0;
                preLocalData = {
                    ver: cver,
                    aid: this.player.config.aid,
                    bvid: this.player.config.bvid,
                    list: [{ ptr: index, info: info }],
                };
            }
            let hidden_vars = this.player.interactiveVideoConfig!.interactiveHiddenVars;
            const list = preLocalData.list;
            if (hidden_vars) {
                result.hidden_vars = hidden_vars; // 用上个存档的数值继续玩
                // hidden_vars = JSON.parse(JSON.stringify(hidden_vars)); // 搞个备份提供给存档存起来
            } else {
                this.player.interactiveVideoConfig!.interactiveHiddenVars = hidden_vars = result.hidden_vars || []; // 没存档数值，用接口返回的玩
            }
            preLocalData.list[index!].hidden_vars = hidden_vars;

            // 改写历史记录
            result.story_list = preLocalData.list.map((item) => item.info);
            // 存储当前记录
            this.saveLocalProgress(preLocalData);
        } catch (e) {
            console.warn(e);
        }
    }

    private saveLocalProgress(preLocalData: IPreLocalData) {
        const key = `bilibili_player_iv_${this.player.config.bvid || this.player.config.aid}`;
        try {
            sessionStorage.setItem(key, JSON.stringify(preLocalData));
            return true;
        } catch (e) {
            console.debug(e);
            (<any>window)[key] = preLocalData;
            return null;
        }
    }

    private getLocalProgress(): IPreLocalData {
        const key = `bilibili_player_iv_${this.player.config.bvid || this.player.config.aid}`;
        try {
            return JSON.parse(sessionStorage.getItem(key)!);
        } catch (e) {
            console.debug(e);
            return (<any>window)[key] || undefined;
        }
    }

    private clearLocalProgress() {
        const key = `bilibili_player_iv_${this.player.config.bvid || this.player.config.aid}`;
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn(e);
            (<any>window)[key] = undefined;
        }
    }

    getChooseStatus() {
        return this.chooseSymbol;
    }

    setChooseStatus(status: boolean) {
        this.chooseSymbol = status;
    }

    getDisableEndingPanel() {
        return this.disableEndingPanel;
    }

    private canvasInteractive(data: ApiInteractiveOutData, current_node: string) {
        //触发播放结束逻辑
        const editor_mode = this.player.config.editorEdges;
        if (!editor_mode) {
            if (data.edges && data.edges.questions && data.edges.questions.length) {
                for (let i = 0; i < data.edges.questions.length; i++) {
                    const type: number = data.edges.questions[i].type;
                    if (type === 0 || type === 1 || type === 2 || type === 3) {
                        if (data.edges.questions[i].duration <= 0) {
                            this.player.interactiveVideoConfig!.interactiveLastPart = false;
                            this.videoEndedCallbacks.push(() => {
                                this.buildEndPointer(data.edges!.questions[i].type);
                            });
                        } else {
                            this.videoCountdownCallbacks.push(() => {
                                this.buildEndPointer(data.edges!.questions[i].type);
                            });
                            if (data.edges.questions[i].duration < 0) {
                                this.videoEndedCallbacks.push(() => {
                                    if (this.countdown) {
                                        this.countdown.remove();
                                    }
                                });
                            }
                        }
                        this.showTime = data.edges.questions[i].duration;
                        this.defaultChoices = data.edges.questions[i].choices[0];
                        if (data.edges.questions[i].duration <= 0 && type === 0) {
                            //结束直接跳转
                            const choice = data.edges.questions[i].choices[0];
                            this.videoEndedCallbacks.push(() => {
                                this.player.interactiveVideoConfig!.portal = 0;
                                this.resetPlayingMode();
                                this.chooseHandler(choice);
                                this.callNextPart(choice);
                            });
                            if (this.player.getTimeOffset() > 0) {
                                // special hack
                                this.videoMediaTimeCallbacks.push(() => {
                                    if (this.player.duration()! - this.player.currentTime()! < 5) {
                                        this.seamlessLoad(choice);
                                    }
                                });
                            }
                        } else {
                            this.defaultChoices = data.edges.questions[i].choices[0];
                            this.defaultChoicesNumber = 0;
                            for (let v = 0; v < data.edges.questions[i].choices.length; v++) {
                                if (
                                    data.edges.questions[i].choices[v].is_default &&
                                    data.edges.questions[i].choices[v].is_default === 1
                                ) {
                                    this.defaultChoices = data.edges.questions[i].choices[v];
                                    this.defaultChoicesNumber = i;
                                    break;
                                }
                            }
                            if (data.edges.questions[i].duration > 0) {
                                this.videoCountdownCallbacks.push(() => {
                                    this.player.interactiveVideoConfig!.portal = 0;
                                    this.countDown(
                                        data.edges!.questions[i].duration,
                                        this.defaultChoices,
                                        this.defaultChoicesNumber,
                                        type,
                                    );
                                });
                            }
                        }
                    }
                }

                const layer = new Konva.Layer();
                const choicesGroup = new Konva.Group({
                    opacity: 0,
                });

                for (let a = 0; a < data.edges.questions.length; a++) {
                    //选项类型
                    const type: number = data.edges.questions[a].type;

                    // 点定位
                    if (type === 2) {
                        //选项生成
                        for (let i = 0; i < data.edges.questions[a].choices.length; i++) {
                            const add_button = () => {
                                //选项出现条件筛选
                                const condition = data.edges!.questions[a].choices[i].condition;
                                if (condition && !Boolean(Number(evalString(this.table, `\`${condition}\``)))) {
                                    return true;
                                }

                                intButton(
                                    data.edges!.questions[a].choices[i],
                                    type,
                                    data.edges!.skin,
                                    data.edges!.questions[a].choices.length,
                                    data.edges!.dimension.width,
                                ).then((pos_button: Konva.Group) => {
                                    layer.add(pos_button);
                                    pos_button.opacity(0);
                                    const choicesX =
                                        (data.edges!.questions[a].choices[i].x! / data.edges!.dimension.width) *
                                        this.defaultWidth;
                                    pos_button.x(choicesX);
                                    pos_button.y(data.edges!.questions[a].choices[i].y!);

                                    //选项动画
                                    const choicesTween = new Konva.Tween({
                                        node: pos_button,
                                        scaleX: 1.03,
                                        scaleY: 1.03,
                                        easing: Konva.Easings.Linear,
                                        duration: 0.2,
                                    });
                                    pos_button.on('mouseover', () => {
                                        this.stage.container().style.cursor = 'pointer';
                                        choicesTween.play();
                                    });
                                    pos_button.on('mouseout', () => {
                                        this.stage.container().style.cursor = 'default';
                                        choicesTween.reverse();
                                    });

                                    //选项事件
                                    pos_button.on('click touchstart', () => {
                                        if (localStorage && !localStorage.getItem('interactiveRookie')) {
                                            localStorage.setItem('interactiveRookie', 'yes');
                                        } else {
                                            localStorage.setItem('interactiveRookie', 'no');
                                        }
                                        this.replayButton!.hide();
                                        this.player.danmaku!.visible(false);
                                        clearTimeout(this.countdownTimer);
                                        this.player.interactiveVideoConfig!.portal = 0;
                                        this.stage.container().style.cursor = 'default';
                                        animate({
                                            ...this.choiceKeyframe,
                                            onUpdate: (o: { scale: number }) => {
                                                pos_button.scaleX(o.scale);
                                                pos_button.scaleY(o.scale);
                                                layer.batchDraw();
                                            },
                                            onComplete: () => {
                                                this.chooseHandler(data.edges!.questions[a].choices[i]);
                                                this.callNextPart(data.edges!.questions[a].choices[i]);
                                            },
                                        });
                                    });

                                    //默认选项动画
                                    if (data.edges!.questions[a].choices[i].is_default === 1) {
                                        this.defaultChoAni.push(pos_button);
                                    }

                                    this.endLayer = layer;
                                    this.middleLayer && this.middleLayer.destroy();
                                    this.stage.add(layer);
                                    pos_button.y(
                                        (((data.edges!.dimension.height - data.edges!.questions[a].choices[i].y!) /
                                            (data.edges!.dimension.width / this.defaultWidth)) *
                                            (data.edges!.dimension.width / data.edges!.dimension.height)) /
                                        (this.player.video.videoWidth / this.player.video.videoHeight),
                                    );
                                    // 皮肤动画
                                    animate({
                                        from: {
                                            scale: 0,
                                            opacity: 0,
                                        },
                                        to: {
                                            scale: 1,
                                            opacity: 1,
                                        },
                                        duration: 200,
                                        ease: linear,
                                        onUpdate: (o: { scale: number; opacity: number }) => {
                                            pos_button.scaleX(o.scale);
                                            pos_button.scaleY(o.scale);
                                            pos_button.opacity(o.opacity);
                                            layer.batchDraw();
                                        },
                                    });
                                    this.stage.show();
                                });
                            };

                            // 选项出现
                            if (data.edges.questions[a].duration <= 0) {
                                this.videoEndedCallbacks.push(() => {
                                    add_button();
                                });
                            } else {
                                this.videoCountdownCallbacks.push(() => {
                                    add_button();
                                });
                            }
                        }
                    } else if (type === 1) {
                        const add_button = () => {
                            //默认选项方式
                            const localChoices = JSON.parse(JSON.stringify(data.edges!.questions[a].choices));

                            //按条件筛选选项数据
                            for (let i = 0; i < localChoices.length; i++) {
                                const condition = localChoices[i].condition;
                                if (condition && !Boolean(Number(evalString(this.table, `\`${condition}\``)))) {
                                    localChoices.splice(i, 1);
                                    i--;
                                }
                            }
                            //生成选项
                            for (let i = 0; i < localChoices.length; i++) {
                                //选项按钮
                                intButton(localChoices[i], type, data.edges!.skin, localChoices.length).then(
                                    (iv_button: Konva.Group) => {
                                        //位置定位
                                        if (localChoices.length < 4) {
                                            iv_button.y(0);
                                            //only one
                                            if (localChoices.length === 1) {
                                                iv_button.x(332);
                                            }
                                            //two
                                            if (localChoices.length === 2) {
                                                if (i === 0) {
                                                    iv_button.x(171);
                                                } else {
                                                    iv_button.x(496);
                                                }
                                            }
                                            //three
                                            if (localChoices.length === 3) {
                                                if (i === 0) {
                                                    iv_button.x(116);
                                                } else if (i === 1) {
                                                    iv_button.x(330);
                                                } else {
                                                    iv_button.x(542);
                                                }
                                            }
                                        } else {
                                            if (i === 0 || i === 2) {
                                                iv_button.x(171);
                                            } else {
                                                iv_button.x(496);
                                            }
                                            if (i === 0 || i === 1) {
                                                iv_button.y(-60);
                                            } else {
                                                iv_button.y(0);
                                            }
                                        }

                                        //默认选项动画
                                        if (localChoices[i].is_default === 1) {
                                            this.defaultChoAni.push(iv_button);
                                        }
                                        choicesGroup.add(iv_button);
                                        layer.add(choicesGroup);
                                        this.endLayer = layer;
                                        this.middleLayer && this.middleLayer.destroy();
                                        this.stage.add(layer);
                                        layer.batchDraw();
                                        this.stage.show();

                                        //选项hover动画
                                        const buttonTween = new Konva.Tween({
                                            node: iv_button,
                                            scaleX: 1.03,
                                            scaleY: 1.03,
                                            easing: Konva.Easings.Linear,
                                            duration: 0.3,
                                        });

                                        //选项hover事件
                                        iv_button.on('mouseover', () => {
                                            this.stage.container().style.cursor = 'pointer';
                                            buttonTween.play();
                                        });
                                        iv_button.on('mouseout', () => {
                                            this.stage.container().style.cursor = 'default';
                                            buttonTween.reverse();
                                        });

                                        //选项点击事件
                                        iv_button.on('click touchstart', () => {
                                            if (localStorage && !localStorage.getItem('interactiveRookie')) {
                                                localStorage.setItem('interactiveRookie', 'yes');
                                            } else {
                                                localStorage.setItem('interactiveRookie', 'no');
                                            }
                                            this.replayButton!.hide();
                                            this.player.danmaku!.visible(this.player.state.danmaku);
                                            clearTimeout(this.countdownTimer);
                                            this.player.interactiveVideoConfig!.portal = 0;
                                            this.stage.container().style.cursor = 'default';
                                            animate({
                                                ...this.choiceKeyframe,
                                                onUpdate: (o: { scale: number }) => {
                                                    iv_button.scaleX(o.scale);
                                                    iv_button.scaleY(o.scale);
                                                    layer.batchDraw();
                                                },
                                                onComplete: () => {
                                                    this.chooseHandler(localChoices[i]);
                                                    this.callNextPart(localChoices[i]);
                                                },
                                            });
                                        });
                                    },
                                );
                            }

                            choicesGroup.y(this.canvasHeight / this.stage.attrs.scaleX + 100);
                            layer.add(choicesGroup);
                            const listTween1 = new Konva.Tween({
                                node: choicesGroup,
                                y: this.canvasHeight / this.stage.attrs.scaleX - 42,
                                opacity: 1,
                                easing: Konva.Easings.Linear,
                                duration: 0.3,
                            });
                            listTween1.play();
                        };

                        //选项入场动画
                        if (data.edges.questions[a].duration <= 0) {
                            this.videoEndedCallbacks.push(() => {
                                add_button();
                            });
                        } else {
                            this.videoCountdownCallbacks.push(() => {
                                add_button();
                            });
                        }
                    }
                }
                this.videoPlayingCallbacks.push(() => {
                    this.stage.hide();
                    layer.destroy();
                });
            } else {
                this.player.interactiveVideoConfig!.interactiveLastPart = true;
            }
        }
    }

    private chooseHandler(choice: StoryChoices, isMiddle?: boolean) {
        if (choice) {
            evalString(this.table, `\`${choice.native_action}\``);
            if (isMiddle) {
                this.interactiveChoices = this.interactiveChoices
                    ? `${this.interactiveChoices},${choice.id}`
                    : `${choice.id}`;
            }
        }
    }

    private resizeCanvas(scaleX: number, scaleY: number) {
        if (this.stage) {
            this.stage.width(this.canvasWidth || this.defaultWidth);
            this.stage.height(this.canvasHeight || this.defaultHeight);
            this.stage.scale({
                x: scaleX,
                y: scaleY,
            });
            this.stage.draw();
        }
    }

    private middleSeek(choice: StoryChoices) {
        if (choice) {
            if (choice.platform_action) {
                const time = Number(choice.platform_action.replace(/[^0-9]/gi, ''));
                console.log(time);
                this.player.seek(time);
            }
        }
    }
    resetPlayingMode() {
        this.setChooseStatus(false);
        if (this.replayButton) {
            this.replayButton.hide();
            this.player.danmaku!.visible(this.player.state.danmaku);
        }
        // this.player.template.videoTop.removeClass('interactive-hide');
        this.player.template.controller.removeClass('interactive-hide');
        if (this.player.config.gamePlayer) {
            this.player.template.sendbar.removeClass('interactive-hide');
        }
    }

    isDisableSeamless() {
        return !!(
            /Edge/i.test(navigator.userAgent) ||
            /rv:11/i.test(navigator.userAgent) ||
            /MSIE/i.test(navigator.userAgent)
        );
    }

    setSeamless(b?: boolean) {
        if (this.player.dashPlayer && !this.isDisableSeamless()) {
            this.player.dashPlayer.setEndOfStreamState(!b);
        }
    }

    reload() {
        this.destroy();
        return this.init();
    }

    destroy() {
        if (this.stage) {
            this.stage.destroy();
        }
        if (this.initialized) {
            this.initialized = false;
            this.preloadSymbol = false;
            this.countdownSymbol = false;
            this.isIvEnded = false;
            this.videoMediaTimeCallbacks = [];
            this.videoMediaFrameCallbacks = [];
            this.videoEndedCallbacks = [];
            this.videoPlayingCallbacks = [];
            this.videoCountdownCallbacks = [];
            this.videoSeekCallbacks = [];
            this.videoPreload && this.videoPreload.destroy();
            this.hiddenVarsBlock && this.hiddenVarsBlock.remove();
            this.listBlock && this.listBlock.remove();
            this.replayButton && this.replayButton.remove();
            this.replayButton = undefined;
            this.canvasBlock && this.canvasBlock.remove();
            this.canvasBlock = undefined;
            this.specialChoose = undefined;
            this.seamlessSymbol = undefined;
            clearTimeout(this.countdownTimer);
            clearTimeout(this.animateTimer);
            this.interactive && this.interactive.remove();
            this.bar && this.bar.css('animation', '');
            if (this.countdown) {
                this.countdown.remove();
            }
            this.resetPlayingMode();
        }
    }
}

export default InteractiveVideo;
