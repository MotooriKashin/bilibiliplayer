import STATE from './state';
import Auxiliary from '../auxiliary';
import Player from '@jsc/bilibiliplayer/js/player';

class Template {
    private auxiliary: Auxiliary;
    private prefix: string;
    container: JQuery;
    auxiliaryArea!: JQuery;
    playerWrap!: JQuery;
    setting!: JQuery;
    menu!: JQuery;
    basDanmakuVisualPanel!: JQuery;
    blockPanel!: JQuery;
    basDanmakuPanel!: JQuery;
    advDanmakuPanel!: JQuery;
    codeDanmakuPanel!: JQuery;
    danmakuList!: JQuery;
    danmakuWrap!: JQuery;
    // danmakuWrapChild!: JQuery;
    danmakuMask!: JQuery;
    // collapse!: JQuery;
    filters!: JQuery;
    // filterTitle!: JQuery;
    filterWatchlaterBtn!: JQuery;
    filterPlaylistBtn!: JQuery;
    filterRecommendBtn!: JQuery;
    filterListBtn!: JQuery;
    filterBlockBtn!: JQuery;
    danmakuBtnFooter!: JQuery;
    historyBtn!: JQuery;
    wraplist!: JQuery;
    danmakuFunction!: JQuery;
    danmakuManagement!: JQuery;
    adTime!: JQuery;
    skipTime!: JQuery;
    skip!: JQuery;
    playlistCollapse!: JQuery;
    playlistPanel!: JQuery;
    playlistOrder!: JQuery;
    playlistCount!: JQuery;
    timeClear!: number;
    mouseTimeout!: number;
    player: Player;
    info!: JQuery<HTMLElement>;
    danmakuNumber!: JQuery<HTMLElement>;
    recommendPanel!: JQuery<HTMLElement>;
    watchlaterPanel!: JQuery<HTMLElement>;
    constructor(auxiliary: Auxiliary) {
        this.auxiliaryArea = this.container = auxiliary.container;
        this.auxiliary = auxiliary;
        this.prefix = auxiliary.prefix;
        this.player = auxiliary.player;
        this.init();
        this.globalEvents();
    }
    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, (e: Event) => {
            this.destroy();
        });
    }

    init() {
        const prefix = this.prefix;
        const that = this;

        this.info = this.auxiliaryArea.find("." + prefix + "-info");
        this.basDanmakuVisualPanel = this.auxiliaryArea.find('.' + prefix + '-bas-danmaku-visual'); // BAS ?????????????????????
        this.blockPanel = this.auxiliaryArea.find('.' + prefix + '-block'); // ????????????
        this.advDanmakuPanel = this.auxiliaryArea.find('.' + prefix + '-adv-danmaku'); // ??????????????????
        this.codeDanmakuPanel = this.auxiliaryArea.find('.' + prefix + '-code-danmaku'); // ??????????????????
        this.danmakuList = this.auxiliaryArea.find('.' + prefix + '-danmaku'); // ????????????????????????
        this.danmakuWrap = this.danmakuList.find('.' + prefix + '-danmaku-wrap'); // ????????????
        // this.danmakuWrapChild = this.danmakuList.find('.' + prefix + '-danmaku-wrap-child'); // ???????????????
        this.danmakuMask = this.danmakuList.find('.' + prefix + '-danmaku-load-status'); // ??????????????????

        // this.collapse = this.auxiliaryArea.find('.' + prefix + '-collapse'); // ????????????
        this.filters = this.auxiliaryArea.find('.' + prefix + '-filter'); // ????????????
        // this.filterTitle = this.auxiliaryArea.find('.' + prefix + '-filter-title').eq(0); // ??????????????????
        this.menu = this.auxiliaryArea.find('.' + prefix + '-setting-menu'); // ????????????????????????

        this.filterWatchlaterBtn = this.filters.find('.' + prefix + '-filter-btn-watchlater'); // ????????????
        this.filterPlaylistBtn = this.filters.find('.' + prefix + '-filter-btn-playlist'); // ??????
        this.filterRecommendBtn = this.filters.find('.' + prefix + '-filter-btn-recommend'); // ????????????

        this.filterListBtn = this.filters.find('.' + prefix + '-filter-btn-list'); // ????????????
        this.filterBlockBtn = this.filters.find('.' + prefix + '-filter-btn-block'); // ????????????

        this.danmakuBtnFooter = this.danmakuList.find('.' + prefix + '-danmaku-btn-footer'); // ???????????????????????????
        this.historyBtn = this.danmakuList.find('.' + prefix + '-danmaku-btn-history'); // ????????????
        this.wraplist = this.auxiliaryArea.find('.' + prefix + '-wraplist'); // ?????????
        this.danmakuFunction = this.danmakuList.find('.' + prefix + '-danmaku-function'); // ????????????
        this.danmakuNumber = this.auxiliaryArea.find('.' + prefix + '-danmaku-number'); // ????????????
        this.danmakuManagement = this.danmakuList.find('.' + prefix + '-danmaku-management'); // ????????????
        this.basDanmakuPanel = this.container.find('.' + prefix + '-bas-danmaku'); // bas????????????
        this.playlistCollapse = this.container.find('.' + prefix + '-collapse-playlist'); // ????????????
        this.playlistPanel = this.container.find('.' + prefix + '-playlist'); // ????????????
        this.playlistOrder = this.container.find('.' + prefix + '-btn-playlist-order'); // ????????????????????????
        this.playlistCount = this.container.find('.' + prefix + '-playlist-count'); // ????????????

        this.watchlaterPanel = this.container.find('.' + prefix + '-watchlater'); // ??????????????????
        this.recommendPanel = this.container.find('.' + prefix + '-recommend'); // ????????????

        this.auxiliary.userLoadedCallback(data => {
            // UserStatusInterface
            this.auxiliaryArea.attr('data-login', <any>data.login);
        });

        this.filters.find("." + prefix + "-filter-btn").click(function (e, h) {
            h && e.stopPropagation();

            if ($(this).hasClass("active") || $(this).hasClass("bpui-state-disabled")) {
                return false;
            }

            $(this).siblings().removeClass("active");
            $(this).addClass("active");
            const wrap = <JQuery<HTMLElement>>that.wraplist?.find(`[role="${$(this).attr("for")}"]`);
            wrap.siblings("." + prefix + "-filter-wrap").hide();
            wrap.show();
            that.auxiliary.trigger(STATE.EVENT.AUXILIARY_PANEL_RESIZE, 0);
        });

        switch (this.auxiliary.config.theme) {
            case STATE.THEME.GREEN:
                this.container.addClass(`${prefix}-theme-${STATE.THEME.GREEN}`);
                break;
            case STATE.THEME.RED:
                this.container.addClass(`${prefix}-theme-${STATE.THEME.RED}`);
                break;
            default:
                break;
        }
        // Utils.show(this.danmakuList);

        // this.recordFilterTabsInfo();
        return this;
    }

    private destroy(remove?: boolean) {
        if (this.container) {
            this.container.unbind().empty();
        }
        if (remove) {
            this.container.remove();
        }
    }
}

export default Template;
