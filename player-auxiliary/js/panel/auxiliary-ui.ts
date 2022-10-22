import STATE from './state';
import Auxiliary, { IReceived } from '../auxiliary';
import { IUserLoginInfos } from './user';
import * as PD from '../const/player-directive';
import * as WD from '../const/webpage-directive';
import { Button } from '../ui/button';

interface ISetStatus {
    canCollapse: boolean;
    isListSpread: boolean;
}
interface MenuList {
    label: string;
    id: string;
    name?: string;
    disabled?: boolean;
    active?: boolean;
}
class AuxiliaryUI {
    lastState!: number;
    private auxiliary: Auxiliary;
    private prefix: string;
    private userStatus!: IUserLoginInfos;
    private settingMenu!: JQuery;
    // private collapse: any;
    private settingMenuList!: any[];
    private diffList: any = {
        code: 0,
        bas: 0,
    };
    private historyBtn!: Button;
    showPanelList: string[] = [];
    playlistCollapse: any;
    currentMenu: string;
    constructor(auxiliary: Auxiliary) {
        this.prefix = auxiliary.prefix;
        this.auxiliary = auxiliary;
        this.currentMenu = this.auxiliary.config.isPremiere ? STATE.PANEL.BLOCK : STATE.PANEL.DANMAKU;
        if (this.auxiliary.template.auxiliaryArea.length) {
            this.init();
            this.auxiliary.userLoadedCallback(status => {
                this.userStatus = status;
                this.userStatusChange();
            });
        }
        this.globalEvents();
    }
    private globalEvents() {
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RELOAD, (e: Event) => {
            this.reload();
        });
        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            this.destroy();
        });
        // this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_RESIZE, () => {
        //     this.resize();
        // });
        // 124006，由播放器来展开屏蔽列表
        this.auxiliary.directiveManager.on(PD.DB_PUT_BLOCK_SHOW.toString(), () => {
            this.showTabList(STATE.PANEL.BLOCK, '屏蔽设定');
        });
        // 124006，由播放器来展开屏蔽列表
        this.auxiliary.directiveManager.on(WD.WP_SET_PLAYER_STATE.toString(), (e, received: IReceived) => {
            const data: ISetStatus = received.data;
            if (data) {
                // if (typeof data.canCollapse === 'boolean') {
                //     this.auxiliary.config.canCollapse = data.canCollapse ? 1 : 0;
                // }
                if (typeof data.isListSpread === 'boolean') {
                    this.auxiliary.config.isListSpread = data.isListSpread ? 1 : 0;
                }
                // this.updateCollapse();
            }
        });
    }
    private init() {
        const that = this;
        const auxiliary = this.auxiliary;
        const prefix = this.prefix;
        const template = this.auxiliary.template;
        if (this.auxiliary.config.isListSpread) {
            this.showPanelList = [this.currentMenu];
        }
        this.settingMenu = $(`<div class="${prefix}-setting-menu-wrap"><div class="${prefix}-setting-menu-triangle"></div></div>`).appendTo(template.info);
        this.reload();

        if (auxiliary.config.watchlater) {
            new Button(template.filterWatchlaterBtn, {
                type: "small",
                name: "tab_watchlater",
            })
        } else if (auxiliary.config.playlist) {
            new Button(template.filterPlaylistBtn, {
                type: "small",
                name: "tab_playlist",
            })
        } else {
            new Button(template.filterRecommendBtn, {
                type: "small",
                name: "tab_recommend recommend_show"
            })
        }

        new Button(template.filterListBtn, {
            type: "small",
            name: "tab_danmulist"
        })
        new Button(template.filterBlockBtn, {
            type: "small",
            name: "tab_danmupreventset"
        })
        this.historyBtn = new Button(template.historyBtn, {
            type: "small",
            disabled: true
        })

        template.menu.off('click').on("click", function (e) {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
                auxiliary.trackInfoPush('player_more');
            }
            that.settingMenu.toggle();
        });

        this.settingMenu.off('click').on("click", function (e) {
            const $this = $(e.target);
            if ($this.hasClass('disabled') || $this.hasClass('active')) {
                return false;
            }
            auxiliary.trackInfoPush($this.attr('name')!);
            that.showTabList($this.attr('value')!, $this.attr('label')!);
        });

    }

    private userStatusChange() {
        if (this.userStatus && this.userStatus.login) {
            this.historyBtn.enable();
        } else {
            this.historyBtn.disable();
        }
        this.reload();
    }

    private reload() {
        const auxiliary = this.auxiliary;
        this.settingMenu.html('');
        this.diffList = {
            code: 0,
            bas: 0,
        };
        const settingMenuList: any[] = this._getMenuList();
        for (let i = 0, len = settingMenuList.length; i < len; i++) {
            const item = settingMenuList[i];
            if (item && item['label']) {
                this.settingMenu.append(`<div class="${this.prefix}-setting-menu-list${item['disabled'] ? ' disabled' : ''
                    }${item['active'] ? ' active' : ''}" 
                value="${item['id']}" name="${item['name'] || ''}" label="${item['label'] || ''
                    }"><span class="active-point"></span>${item['label']}</div>`);
            }
        }
        // this._hideCurrentMenuList();
        if (
            (this.currentMenu === STATE.PANEL.CODEDANMAKU && !this.diffList.code) ||
            (this.currentMenu === STATE.PANEL.BASDANMAKU && !this.diffList.bas)
        ) {
            setTimeout(() => {
                this.showTabList(STATE.PANEL.DANMAKU, '弹幕列表');
            }, 0);
        }
        if (auxiliary.config.isPremiere) {
            auxiliary.container.addClass(`${this.prefix}-ogv-premiere`);
            // auxiliary.template?.filterTitle?.text('屏蔽设定');
            setTimeout(() => {
                this.showTabList(STATE.PANEL.BLOCK, '屏蔽设定');
                // this.collapse?.value(false);
            }, 0);
        } else {
            auxiliary.container.removeClass(`${this.prefix}-ogv-premiere`);
        }
        auxiliary.$window
            .off(`click${auxiliary.config.namespace}-settingmenu`)
            .on(`click${auxiliary.config.namespace}-settingmenu`, (e: any) => {
                if ($(e.target).is(auxiliary.template.menu) || auxiliary.template.menu.find(e.target).length === 1) {
                    return true;
                } else if ($(e.target).is(this.settingMenu) || this.settingMenu.find(e.target).length === 1) {
                    return true;
                } else {
                    this.settingMenu.hide();
                    return true;
                }
            });

        if (this.userStatus && this.userStatus.login) {
            this.settingMenu
                .find(`.${this.prefix}-setting-menu-list[value="${STATE.PANEL.ADVDANMAKU}"]`)
                .removeClass('disabled');
        } else {
            this.settingMenu
                .find(`.${this.prefix}-setting-menu-list[value="${STATE.PANEL.ADVDANMAKU}"]`)
                .addClass('disabled');
        }
    }
    showTabList(value: string, label: string) {
        const auxiliary = this.auxiliary;
        const old = this.currentMenu;
        if (this.settingMenuList.indexOf(value) < 0) {
            return;
        }
        this.currentMenu = value;
        // this._hideCurrentMenuList();
        // this._hideAllMenu();
        // auxiliary.template.filterTitle.text(label);
        switch (value) {
            case STATE.PANEL.FUNCTIONWINDOW:
                const endingPanel = auxiliary.player.controller.getEndingPanel();
                if (endingPanel) {
                    endingPanel.toggle();
                }
                break;
            case STATE.PANEL.DANMAKU:
                auxiliary.template.danmakuList.show();
                auxiliary.list.update();
                $(window).trigger('resize');
                auxiliary.trackInfoPush('danmaku_list_show');
                break;
            case STATE.PANEL.BLOCK:
                auxiliary.block.show();
                break;
            case STATE.PANEL.ADVDANMAKU:
                auxiliary.advPanel.show();
                auxiliary.advPanel.update();
                break;
            case STATE.PANEL.CODEDANMAKU:
                auxiliary.codePanel.show();
                auxiliary.codePanel.update();
                break;
            case STATE.PANEL.BASDANMAKU:
                // this.showPanelList = [old];
                // auxiliary.basPanel.show();
                auxiliary.template.danmakuList.show();
                auxiliary.basVisualPanel.show();
                auxiliary.list.update();
                break;
            default:
                if (
                    value &&
                    auxiliary.window &&
                    auxiliary.window['GrayManager'] &&
                    auxiliary.window['GrayManager']['clickMenu']
                ) {
                    auxiliary.window['GrayManager']['clickMenu'](value);
                }
                break;
        }
        // this.resizeScrollbar(value);
        auxiliary.trigger(STATE.EVENT.AUXILIARY_PANEL_CHANGE);
        // this.collapse.unfold();
    }

    private _getMenuList() {
        const list: MenuList[] = [
            {
                label: "功能窗口",
                id: STATE.PANEL.FUNCTIONWINDOW,
                name: "button_videorecommend",
            },
            {
                label: '高级弹幕',
                id: STATE.PANEL.ADVDANMAKU,
                name: 'button_advanceddanmu',
                disabled: true
            },
        ];
        this.settingMenuList = [STATE.PANEL.FUNCTIONWINDOW, STATE.PANEL.ADVDANMAKU];
        if (
            this.userStatus &&
            (this.userStatus.role === STATE.USER_ADVANCED ||
                this.userStatus.role === STATE.USER_VIP ||
                (this.userStatus.role === STATE.USER_NORMAL && +this.userStatus.level! >= 2))
        ) {
            if (!this.auxiliary.defaultHTML5) {
                list.push({
                    label: '代码弹幕',
                    id: STATE.PANEL.CODEDANMAKU,
                    name: 'button_codedanmu',
                });
                this.diffList.code = 1;
                this.settingMenuList.push(STATE.PANEL.CODEDANMAKU);
            }
        }

        if (this.auxiliary.window && this.auxiliary.window.GrayManager) {
            const extraMenu = this.auxiliary.window.GrayManager.loadExtraMenuConfig?.("html5") || [];

            extraMenu.menuItems.forEach(d => {
                list.push(d);
                this.settingMenuList.push(d.id);
            });
        }
        return list;
    }

    private destroy() {
        this.auxiliary.$window.off(`click${this.auxiliary.config.namespace}-settingmenu`);
        this.auxiliary.template.menu.html('');
    }
}

export default AuxiliaryUI;
