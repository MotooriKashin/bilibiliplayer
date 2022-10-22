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
        this.basDanmakuVisualPanel = this.auxiliaryArea.find('.' + prefix + '-bas-danmaku-visual'); // BAS 可视化编辑面板
        this.blockPanel = this.auxiliaryArea.find('.' + prefix + '-block'); // 屏蔽面板
        this.advDanmakuPanel = this.auxiliaryArea.find('.' + prefix + '-adv-danmaku'); // 高级弹幕面板
        this.codeDanmakuPanel = this.auxiliaryArea.find('.' + prefix + '-code-danmaku'); // 代码弹幕面板
        this.danmakuList = this.auxiliaryArea.find('.' + prefix + '-danmaku'); // 弹幕列表及其控制
        this.danmakuWrap = this.danmakuList.find('.' + prefix + '-danmaku-wrap'); // 弹幕列表
        // this.danmakuWrapChild = this.danmakuList.find('.' + prefix + '-danmaku-wrap-child'); // 子弹幕列表
        this.danmakuMask = this.danmakuList.find('.' + prefix + '-danmaku-load-status'); // 弹幕加载状态

        // this.collapse = this.auxiliaryArea.find('.' + prefix + '-collapse'); // 折叠面板
        this.filters = this.auxiliaryArea.find('.' + prefix + '-filter'); // 控制面板
        // this.filterTitle = this.auxiliaryArea.find('.' + prefix + '-filter-title').eq(0); // 控制面板标题
        this.menu = this.auxiliaryArea.find('.' + prefix + '-setting-menu'); // 控制面板下拉菜单

        this.filterWatchlaterBtn = this.filters.find('.' + prefix + '-filter-btn-watchlater'); // 稍后再看
        this.filterPlaylistBtn = this.filters.find('.' + prefix + '-filter-btn-playlist'); // 播单
        this.filterRecommendBtn = this.filters.find('.' + prefix + '-filter-btn-recommend'); // 推荐视频

        this.filterListBtn = this.filters.find('.' + prefix + '-filter-btn-list'); // 弹幕列表
        this.filterBlockBtn = this.filters.find('.' + prefix + '-filter-btn-block'); // 屏蔽设定

        this.danmakuBtnFooter = this.danmakuList.find('.' + prefix + '-danmaku-btn-footer'); // 弹幕底部的按钮容器
        this.historyBtn = this.danmakuList.find('.' + prefix + '-danmaku-btn-history'); // 历史弹幕
        this.wraplist = this.auxiliaryArea.find('.' + prefix + '-wraplist'); // 切换层
        this.danmakuFunction = this.danmakuList.find('.' + prefix + '-danmaku-function'); // 弹幕排序
        this.danmakuNumber = this.auxiliaryArea.find('.' + prefix + '-danmaku-number'); // 弹幕数量
        this.danmakuManagement = this.danmakuList.find('.' + prefix + '-danmaku-management'); // 弹幕管理
        this.basDanmakuPanel = this.container.find('.' + prefix + '-bas-danmaku'); // bas弹幕面板
        this.playlistCollapse = this.container.find('.' + prefix + '-collapse-playlist'); // 播单列表
        this.playlistPanel = this.container.find('.' + prefix + '-playlist'); // 播单面板
        this.playlistOrder = this.container.find('.' + prefix + '-btn-playlist-order'); // 播单播放模式按钮
        this.playlistCount = this.container.find('.' + prefix + '-playlist-count'); // 播单计数

        this.watchlaterPanel = this.container.find('.' + prefix + '-watchlater'); // 稍后再看面板
        this.recommendPanel = this.container.find('.' + prefix + '-recommend'); // 推荐面板

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
