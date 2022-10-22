import STATE from './panel/state';
import rebuildPlayerExtraParams, { IPlayerExtraParams } from './io/rebuild-player-extra-params';

import Template from './panel/template';
import AuxiliaryUI from './panel/auxiliary-ui';
import AdvPanel from './panel/adv-panel';
import CodePanel from './panel/code-panel';
import Block from './panel/block';
import List from './panel/danmaku-list';
import BasPanel from './panel/bas-panel';
import BasVisualPanel from './panel/bas-visual-panel';
import Playlist from './panel/playlist';
import Watchlater from './panel/watchlater';
import User, { IUserLoginInfos } from './panel/user';
import Report from './plugins/report';
import { DirectiveManager } from './panel/directive-manager';
import { IPlayerConfig } from './io/rebuild-player-config';
import * as WD from './const/webpage-directive';
import * as PD from './const/player-directive';
import Player from '@jsc/bilibiliplayer/js/player';
import PlaylistOrigin from './panel/playlist-origin';
import { Recommend } from './panel/recommend';
import { dateParser, getSessionSettings } from '@shared/utils';

export interface IReceived {
    _id: number;
    _origin: string;
    _directive: number;
    data?: any;
}
export interface IResize {
    w: number;
    h: number;
    mode: number;
}

class Auxiliary {
    prefix: string;
    pid!: number;
    container: JQuery;
    config: IPlayerConfig;
    options: any = {}; // 存储播放器的参数
    window: Window;
    $window: any;
    userLoadedCallbacks: any[] = [];
    scrollLoadedCallbacks: any[] = [];
    extraParams!: IPlayerExtraParams | null;
    template!: Template;
    user!: User;
    directiveManager!: DirectiveManager;
    auxiliaryUI!: AuxiliaryUI;
    advPanel!: AdvPanel;
    codePanel!: CodePanel;
    block!: Block;
    list!: List;
    report!: Report;
    basPanel!: BasPanel;
    basVisualPanel!: BasVisualPanel;
    playlist!: Playlist | Watchlater;
    filtersHeight!: number;

    defaultHTML5: Boolean = true;
    bVideo: any;

    constructor(public player: Player, config: IPlayerConfig, bVideo?: any) {
        this.prefix = 'bilibili-player';
        this.config = config;
        this.bVideo = bVideo;
        this.container = $(document.querySelector<HTMLElement>('#playerAuxiliary')!);
        try {
            this.window = window.parent && window.parent.document ? window.parent : window;
            this.$window =
                window.parent && window.parent !== window ? $(window.parent).add($(window) as any) : $(window);
        } catch (e) {
            this.window = window;
            this.$window = $(window);
        }
        this.init();
        this.Events();
    }

    private init() {
        this.pid = new Date().getTime() * 1000 + Math.floor(Math.random() * (999 - 100 + 1)) + 100;
        this.extraParams = rebuildPlayerExtraParams(this);
        // this.container = this.container.addClass(this.prefix).unbind().empty();
        this.directiveManager = new DirectiveManager(this);
        this.user = new User(this);
        this.template = new Template(this);
        this.filtersHeight =
            this.config.playlistId || this.config.watchlater
                ? this.template.filters.outerHeight()! * 2 +
                parseInt(this.template.playlistCollapse.css('marginTop'), 10)
                : this.template.filters.outerHeight()!;
        this.auxiliaryUI = new AuxiliaryUI(this);
        this.block = new Block(this);
        this.report = new Report(this, {
            container: this.template.auxiliaryArea
        });
        this.advPanel = new AdvPanel(this, {
            panel: this.template.advDanmakuPanel,
        });
        this.codePanel = new CodePanel(this, {
            panel: this.template.codeDanmakuPanel,
        });
        this.list = new List(this, {
            timestamp: dateParser(this.config.d!, 8), // 北京时间0点时候的UTC时间
        });
        this.basPanel = new BasPanel(this, {
            prefix: this.prefix,
            panel: this.template.basDanmakuPanel,
            pid: this.pid,
        });
        this.basVisualPanel = new BasVisualPanel(this, {
            prefix: this.prefix,
            container: this.template.basDanmakuVisualPanel,
            pid: this.pid,
        });
        if (this.config.playlistId) {
            // this.template.auxiliaryArea.addClass(`${this.prefix}-area-playlist`);
            this.playlist = new Playlist(this, {
                prefix: this.prefix,
                panel: this.template.playlistPanel,
            });
        } else if (this.config.watchlater) {
            // this.template.auxiliaryArea.addClass(`${this.prefix}-area-playlist`);
            this.playlist = new Watchlater(this, {
                prefix: this.prefix,
                panel: this.template.watchlaterPanel,
            });
        } else if (this.config.playlist) {
            this.playlist = <any>new PlaylistOrigin(this, {
                prefix: this.prefix,
                panel: this.template.playlistPanel,
            });
        } else {
            new Recommend(this, {
                prefix: this.prefix,
                panel: this.template.recommendPanel,
            });
        }
        if (!performance.timing.perfPLCPEnd) {
            const ns = performance.timing.navigationStart;
            const timestamp = (performance.timing.perfPLCPEnd = Date.now());
            const petp = performance.timing.perfPETPEnd - ns;
            const sendBarIdle = performance.timing.perfPETPEnd - performance.timing.perfPDTPEnd;
            const pfdp = performance.timing.perfPFDPEnd - ns;
            const pdtp = performance.timing.perfPDTPEnd - ns;
            const pfcp = performance.timing.perfPFCPEnd - ns;
            const plcp = timestamp - performance.timing.navigationStart;
            const playerIdle = timestamp - performance.timing.perfPFCPEnd;
            // prettier-ignore
            const param = `petp:${petp},sendbar_idle:${sendBarIdle},pfdp:${pfdp},pdtp:${pdtp},pfcp:${pfcp},plcp:${plcp},player_idle:${playerIdle}`;
            this.trackInfoPush('player_perf', param, 0);
        }
        this.initFilterTab(Number(getSessionSettings('player_last_filter_tab_info')));
    }
    initFilterTab(tab: number) {
        switch (tab) {
            case STATE.TAB_DANMAKULIST:
                this.template.filterListBtn.trigger("click");
                break;
            case STATE.TAB_BLOCKLIST:
                this.template.filterBlockBtn.trigger("click");
                break;
            case STATE.TAB_WATCHLATER:
                this.template.filterWatchlaterBtn.trigger("click");
                break;
            case STATE.TAB_PLAYLIST:
                this.template.filterPlaylistBtn.trigger("click");
                break;
            default:
                this.template.filterRecommendBtn.trigger("click");
        }
    }
    private Events() {
        // 126002
        this.directiveManager.on(PD.VI_RECT_CHANGE.toString(), (e, received: IReceived) => {
            this.resize({ w: received['data']['w'], h: received['data']['h'], mode: received['data']['mode'] });
        });
    }

    // 埋点 type : 1: event, 0: op
    trackInfoPush(name: string, params: any = '', type: number = 1) {
        // 227001
        this.directiveManager.sender(WD.SR_CREATE_EVENT, { type: type, key: name, value: params });
    }

    userLoadedCallback(callback: (info: IUserLoginInfos) => void) {
        if (this.user) {
            this.user.addCallback(callback);
        } else if (typeof callback === 'function') {
            this.userLoadedCallbacks.push(callback);
        }
    }

    reload(config: any) {
        if (config && config.cid) {
            this.config.cid = config.cid;
            this.config.aid = config.aid;
            this.config.bvid = config.bvid;
            this.config.isPremiere = config.isPremiere;
        }
        this.trigger(STATE.EVENT.AUXILIARY_PANEL_RELOAD);
    }

    resize(options?: IResize) {
        if (options) {
            this.options.w = options.w;
            this.options.h = options.h;
            this.options.mode = options.mode || 0;
        }
        this.extraParams = rebuildPlayerExtraParams(this);
        if (this.options.mode === 0) {
            this.trigger(STATE.EVENT.AUXILIARY_PANEL_RESIZE);
        }
    }
    getPlayerHeight() {
        let parent;
        if ($('#bilibili-player').length) {
            parent = $('#bilibili-player');
        } else {
            parent = $(`#${this.config.parentId}`);
        }
        return parent.length ? parent.outerHeight() : this.options && this.options.h;
    }

    destroy() {
        this.trigger(STATE.EVENT.AUXILIARY_PANEL_DESTROY);
        this.unbind();
    }

    trigger(type: string, ...args: any[]) {
        this.container.trigger.apply(this.container, [
            type + this.config.namespace,
            Array.prototype.slice.call(arguments, 1, arguments.length),
        ]);
    }

    bind(type: any, callback?: any) {
        this.container.bind(type + this.config.namespace, callback);
    }
    unbind(type?: any) {
        this.container.unbind(type ? type + this.config.namespace : '');
    }
}

export default Auxiliary;
