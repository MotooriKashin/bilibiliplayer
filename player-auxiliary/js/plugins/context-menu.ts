/**
 * @description bilibili player right menu plugin
 * @author dingjianqiang@bilibili.com
 * @date 2016/05/11
 */
import screenfull from './screenfull';
import Tooltip from './tooltip';
import STATE from '../panel/state';
import Auxiliary from '../auxiliary';

interface IConfig {
    menu?: IMenuData[];
    appendTo?: JQuery;
    targetClass?: string;
    align?: string; // left, bottom, right,
    theme?: string; // white, black
    changedMode?: boolean;
    changedType?: number; // 0: all reset, 1: push , 2: unshift
    autoRemove?: boolean;
    showOrigin?: boolean;
    showDefMenu?: boolean;
    defMenu?: IMenuData[];
    onChange?: (a: JQuery, b?: JQueryEventObject) => any;
}

interface IMenuData {
    type?: string;
    name?: string;
    text?: string;
    title?: string;
    link?: string;
    disabled?: boolean;
    icon?: string;
    tag?: string;
    menu?: IMenuData[];
    character?: string;
    danmaku?: any;
    click?: () => void;
    afterAppend?: (menuHtml: JQuery) => void;
    tabs?: () => JQuery;
}

class ContextMenu {
    $container: any;

    private auxiliary: Auxiliary;
    private container: JQuery;
    private config: IConfig;
    private disabledStatus: number;
    private getUniqueId: () => string;
    private callbackObj: { [id: string]: any };
    private perfix: string;
    private componentName: string;
    private stopCaptureCallback!: (e: JQueryEventObject) => void;
    private onContextmenuOutsideClick!: (e: MouseEvent) => void;
    private $target!: JQuery | null;
    private $menuList: any;
    private $ul!: JQuery;
    private $lines!: JQuery;
    private menuRendered = false;
    private bilibiliPlayerDefaultMenu: any[] = [];

    constructor(auxiliary: Auxiliary, container: JQuery, config: IConfig) {
        this.auxiliary = auxiliary;
        this.container = container;

        this.config = $.extend(
            {
                menu: [],
                appendTo: $(document.body),
                targetClass: '',
                align: 'left', // left, bottom, right,
                theme: 'white', // white, black
                changedMode: false,
                changedType: 0, // 0: all reset, 1: push , 2: unshift
                autoRemove: true,
                showOrigin: false,
                showDefMenu: true,
                defMenu: this.bilibiliPlayerDefaultMenu,
                onChange: () => { },
            },
            config,
        );

        if (this.config.showDefMenu) {
            this.config.menu = this.config.menu!.concat(this.config.defMenu!);
        }

        this.disabledStatus = 0;

        this.getUniqueId = this.reGetUniqueId();
        this.callbackObj = {};

        this.perfix = auxiliary.prefix;
        this.componentName = 'context-menu';

        this.config.appendTo!.addClass('relative');
        this.bindEvents();
    }

    private getContextmenuContainer() {
        if (!this.$container) {
            this.$container = $('<div>')
                .addClass(this.cssPrefix(`container ${this.config.theme}`))
                .append(this.menuTemplate(this.config.menu!));
        }
        return this.$container;
    }
    private getul() {
        if (!this.$ul) {
            this.$ul = this.getContextmenuContainer().find('>ul').eq(0);
        }
        return this.$ul;
    }
    private getMenuList() {
        if (!this.$menuList) {
            this.$menuList = this.getContextmenuContainer().find('>ul>li>a.context-menu-a');
        }
        return this.$menuList;
    }
    private setMenuList(val: any) {
        this.$menuList = val;
    }
    private getLines() {
        if (!this.$lines) {
            this.$lines = this.getContextmenuContainer().find('.context-line');
        }
        return this.$lines;
    }
    private setLines(val: JQuery) {
        this.$lines = val;
    }

    private bindEvents() {
        const that = this;
        const auxiliary = this.auxiliary;
        const targetClass = that.config.targetClass;
        let $target;

        this.onContextmenuOutsideClick = (e: MouseEvent) => {
            if (e.button === 2) {
                return true;
            }
            // if left click target is not child or context menu
            !$.contains(this.getContextmenuContainer()[0], $(e.target!)[0] as any) && this.hide();
        };

        this.auxiliary.window.addEventListener('click', this.onContextmenuOutsideClick, true);
        this.auxiliary.$window
            .on('contextmenu', (e: any) => {
                $target = $(e.target);

                // if right click target is not child of context menu or container
                !(
                    $.contains(that.getContextmenuContainer()[0], $target[0]) ||
                    $.contains(that.container[0], $target[0])
                ) && that.hide();
            })
            .on('keydown', (e: any) => {
                if (e.keyCode === 27) {
                    that.hide();
                }
            });

        if (screenfull && screenfull.raw) {
            this.auxiliary.window.document.addEventListener(screenfull.raw['fullscreenchange']!, () => {
                that.hide();
            });
        }

        // show context menu event
        this.container.on('contextmenu', (e) => {
            if (!that.disabledStatus) {
                if (!that.isHidden() && that.config.showOrigin) {
                    that.hide();
                    return true;
                }
                e.preventDefault();
                that.hide();

                $target = $(e.target);

                const xPos = e.pageX - 1;
                const yPos = e.pageY - 1;
                if ($target.closest('.' + targetClass).length) {
                    $target = $target.closest('.' + targetClass);
                    that.$target = $target;
                }

                that.show(xPos, yPos, e);
            }
        });

        // context menu click and context menu
        this.getContextmenuContainer()
            .on('click', '.js-action', (e: JQueryEventObject): void => {
                const $this = $(e.currentTarget);
                const id = $this.attr('data-id');
                const disabled = parseInt($this.attr('data-disabled')!, 10);
                const callback = that.callbackObj[id!];

                if (!disabled) {
                    typeof callback === 'function' && callback(that.$target, e);
                    that.hide();
                } else {
                    e.preventDefault();
                }
            })
            .on('contextmenu', () => {
                return false;
            });

        this.auxiliary.bind(STATE.EVENT.AUXILIARY_PANEL_DESTROY, () => {
            that.destroy();
        });
    }

    show(x: number, y: number, e: any) {
        const $window = $(window);
        const wW = $window.width();
        const wH = $window.height();
        const scrollTop = $window.scrollTop() || 0;
        const scrollLeft = $window.scrollLeft() || 0;
        const offset = this.config.appendTo!.offset();
        const mPx = 7;
        const that = this;

        let mW = 0;
        let mH = 0;
        let newMenuData;
        let marginRight;

        if (!this.menuRendered) {
            this.getContextmenuContainer().appendTo(this.config.appendTo);
            this.menuRendered = true;
        }

        if (this.config.changedMode) {
            newMenuData = typeof this.config.onChange === 'function' && this.config.onChange(this.$target!, e);

            switch (this.config.changedType) {
                case 0:
                    that.resetMenu(newMenuData);
                    break;
                case 1:
                    that.addMenu(newMenuData);
                    break;
                case 2:
                    that.addMenu(newMenuData, true);
                    break;
                default:
                    break;
            }
        }

        mW = this.getContextmenuContainer().width();
        mH = this.getContextmenuContainer().height();

        x = x + mW + mPx > wW! + scrollLeft ? wW! - mW - mPx + scrollLeft : x;
        y = y + mH + mPx > wH! + scrollTop ? wH! - mH - mPx + scrollTop : y;

        marginRight = wW! - x - mW;

        if (marginRight < 160) {
            this.getContextmenuContainer().addClass('left-sub-menu');
        }

        x -= offset!.left;
        y -= offset!.top;

        this.getContextmenuContainer().addClass('active').css({
            top: y,
            left: x,
        });
    }

    hide() {
        this.$target = null;

        this.getContextmenuContainer().removeClass('active left-sub-menu').css({
            top: -9999,
            left: -9999,
        });

        // auto remove
        if (this.config.changedMode && this.config.autoRemove) {
            const $removes = this.getul().find('>li[data-append="1"]');
            const $uids = $removes.find('a.context-menu-a[data-id]');
            const that = this;
            let uid;

            $uids.each((i) => {
                uid = $uids.eq(i).attr('data-id');
                delete that.callbackObj[uid!];
            });

            $removes.hide();

            // prevent continuous other event list
            setTimeout(() => {
                $removes.remove();
            });
        }
    }

    isHidden() {
        return !this.getContextmenuContainer().hasClass('active');
    }

    setDisabled(index: number) {
        if (index >= 0) {
            this.getMenuList().eq(index).attr('data-disabled', 1);
        } else {
            this.getMenuList().attr('data-disabled', 1);
        }
    }

    removeDisabled(index: number) {
        if (index >= 0) {
            this.getMenuList().eq(index).attr('data-disabled', 0);
        } else {
            this.getMenuList().attr('data-disabled', 0);
        }
    }

    setHidden(index: number) {
        if (index >= 0) {
            this.getMenuList().eq(index).addClass('hidden');
        } else {
            this.getMenuList().addClass('hidden');
        }
    }

    removeHidden(index: number) {
        if (index >= 0) {
            this.getMenuList().eq(index).removeClass('hidden');
        } else {
            this.getMenuList().removeClass('hidden');
        }
    }

    delete(index: number) {
        if (index >= 0) {
            this.getMenuList().eq(index).parent().remove();
            this.getMenuList().splice(index, 1);
        } else {
            this.getMenuList().each(function (this: HTMLElement) {
                $(this).parent().remove();
            });
            this.setMenuList([]);
        }
    }

    disableMenu() {
        this.hide();
        this.disabledStatus = 1;
    }

    enableMenu() {
        this.disabledStatus = 0;
    }

    toggleDisabled() {
        this.hide();
        this.disabledStatus = !this.disabledStatus ? 1 : 0;
    }

    addMenu(menuArr: IMenuData[], isUnshift?: boolean) {
        const that = this;

        if (menuArr instanceof Array) {
            menuArr.forEach((el) => {
                const menuHtml = that.menuLiTemplate(el, true);

                if (!isUnshift) {
                    // push
                    that.getul().append(menuHtml);
                } else {
                    // unshift
                    that.getul().prepend(menuHtml);
                }

                if (typeof el.afterAppend === 'function') {
                    el.afterAppend(menuHtml);
                }
            });
        }

        this.setMenuList(this.getContextmenuContainer().find('>ul>li>a.context-menu-a'));
        this.setLines(this.getContextmenuContainer().find('.context-line'));

        this.getLines().hover(
            function () {
                const $this = $(this);
                that.getLines().not($this).removeClass('hover');
                $this.addClass('hover');
            },
            function () {
                $(this).removeClass('hover');
                $(this).find('.hover').removeClass('hover');
            },
        );
    }

    resetMenu(menuArr: IMenuData[]) {
        this.callbackObj = {};
        this.getContextmenuContainer().html(this.menuTemplate(menuArr));
    }

    shiftHover(direction: string) {
        const currentLine = this.getLines().filter('.hover');
        let hoveIndex = currentLine.index();

        const tabs = currentLine.find('.bilibili-player-contextmenu-subwrapp span');
        const currentTabs = tabs.filter('.hover');
        let tabsIndex = currentTabs.index();

        switch (direction) {
            case 'up':
                hoveIndex--;
                if (hoveIndex < 0) {
                    hoveIndex = this.getLines().length - 1;
                }
                currentLine.removeClass('hover');
                currentLine.find('.hover').removeClass('hover');
                this.getLines().eq(hoveIndex).addClass('hover');
                break;
            case 'down':
                hoveIndex++;
                if (hoveIndex >= this.getLines().length) {
                    hoveIndex = 0;
                }
                currentLine.removeClass('hover');
                currentLine.find('.hover').removeClass('hover');
                this.getLines().eq(hoveIndex).addClass('hover');
                break;
            case 'left':
                if (tabs.length) {
                    tabsIndex--;
                    if (tabsIndex < 0) {
                        tabsIndex = tabs.length - 1;
                    }
                    currentTabs.removeClass('hover');
                    tabs.eq(tabsIndex).addClass('hover');
                }
                break;
            case 'right':
                if (tabs.length) {
                    tabsIndex++;
                    if (tabsIndex >= tabs.length) {
                        tabsIndex = 0;
                    }
                    currentTabs.removeClass('hover');
                    tabs.eq(tabsIndex).addClass('hover');
                }
                break;
        }
    }

    triggerHover() {
        const currentLine = this.getLines().filter('.hover');
        const action = currentLine.find('.js-action');
        const subHover = currentLine.find('.hover');
        if (action.length) {
            action[0].click();
        } else if (subHover.length) {
            subHover[0].click();
        }
    }

    private destroy() {
        document.removeEventListener('click', <any>this.stopCaptureCallback, true);
        this.auxiliary.window.addEventListener('click', this.onContextmenuOutsideClick, true);
        this.container.unbind('contextmenu');
        this.auxiliary.$window.off('click contextmenu keydown');
    }

    private reGetUniqueId() {
        const prefix = 'bp_cm';
        let i = 0;

        return () => {
            return prefix + '_' + i++;
        };
    }

    private cssPrefix(className: string) {
        return this.perfix + '-' + this.componentName + '-' + className;
    }

    private menuLiTemplate(li: IMenuData, isAppend?: number | boolean) {
        isAppend = isAppend ? 1 : 0;
        const that = this;
        const type = li.type!.trim();
        const liHtml: JQuery = $('<li>')
            .addClass('context-line context-menu-' + type)
            .attr('data-append', isAppend);
        const title = li.title || '';
        const link = li.link || 'javascript:void(0);';
        const linkTarget = li.link ? 'target="_blank"' : '';
        const disabled = li.disabled ? 1 : 0;
        const icon = li.icon ? '<span class="' + li.icon + '"></span>' : '';
        const rightArrow =
            '<span class="bpui-icon bpui-icon-arrow-down" style="transform:rotate(-90deg);margin-top:3px;"></span>';
        let uniqueId = '';
        let item: JQuery;
        const span = $('<span style="color:inherit;">');

        switch (type) {
            case 'danmaku':
                item = $('<a class="context-menu-a js-action context-menu-position" href="javascript:void(0);"></a>');
                item.attr('title', title).append(icon).append(span.text(li.text!));
                liHtml.append(item);
                liHtml.append(this.danmakuMenu(li, item));
                break;
            case 'title':
                liHtml.html(
                    '<a class="context-menu-a" title="' +
                    title +
                    '" href="javascript:void(0);">' +
                    icon +
                    li.text +
                    '</a>',
                );
                break;
            case 'descipline':
                liHtml.html('<a class="context-menu-a" href="javascript:void(0);"></a>');
                break;
            case 'function':
                // get the unique id and push click function to ContextMenu callback object array
                uniqueId = that.getUniqueId();
                that.callbackObj[uniqueId] = li.click;

                liHtml.html(
                    '<a class="context-menu-a js-action" title="' +
                    title +
                    '" data-id="' +
                    uniqueId +
                    '" href="' +
                    link +
                    '" data-disabled="' +
                    disabled +
                    '"  ' +
                    linkTarget +
                    '>' +
                    icon +
                    li.text +
                    '</a>',
                );
                break;
            case 'menu':
                liHtml.html(
                    '<a class="context-menu-a" title="' +
                    title +
                    '" href="javascript:void(0);" data-disabled="' +
                    disabled +
                    '" ' +
                    linkTarget +
                    '>' +
                    icon +
                    li.text +
                    rightArrow +
                    '</a>',
                );

                liHtml.append(this.menuTemplate(li.menu!));

                break;
            case 'tabs':
                if (typeof li.tabs === 'function') {
                    const wrapper = li.tabs();
                    const span = $('<span>').append(li.text!);
                    const list = $('<a class="context-menu-a" href="javascript:void(0);">');
                    list.append(span).append(wrapper);
                    liHtml.append(list);
                }
                break;
            default:
                break;
        }

        return $(liHtml);
    }

    private menuTemplate(data: IMenuData[]) {
        const that = this;
        const menu = $('<ul>').appendTo($('body'));

        if (data instanceof Array) {
            data.forEach((el) => {
                const menuHtml = that.menuLiTemplate(el);
                menu.append(menuHtml);

                if (typeof el.afterAppend === 'function') {
                    el.afterAppend(menuHtml);
                }
            });
        }
        return menu;
    }

    private danmakuMenu(li: IMenuData, danmakuContent: JQuery) {
        const that = this;
        const menu = $('<li class="context-menu-danmaku-wrap"></li>').appendTo($('body'));
        const list = li.menu;
        const character = li.character;
        const type = li.type!.trim();
        const title = li.title || '';
        const link = li.link || 'javascript:void(0);';
        const linkTarget = li.link ? 'target="_blank"' : '';
        const disabled = li.disabled ? 1 : 0;
        const icon = li.icon ? '<span class="' + li.icon + '"></span>' : '';
        let uniqueId = '';
        danmakuContent.click(() => {
            that.auxiliary.trackInfoPush('contextmenu_search');
        });
        if (list instanceof Array) {
            list.forEach((el) => {
                uniqueId = that.getUniqueId();
                let $liHtml;
                that.callbackObj[uniqueId] = el.click;
                $liHtml = $(
                    '<a class="context-menu-danmaku-list js-action" title="' +
                    el.text +
                    '" data-id="' +
                    uniqueId +
                    '" href="' +
                    link +
                    '" data-disabled="' +
                    disabled +
                    '"  ' +
                    linkTarget +
                    '>' +
                    icon +
                    el.text +
                    '</a>',
                );
                if (el.disabled) {
                    $liHtml.addClass('context-menu-danmaku-list-disable');
                    if (el.tag === 'protect' && el.text === '申请保护') {
                        $liHtml.attr({
                            name: 'list_protect',
                            'data-tooltip': 1,
                            'data-change-mode': 2,
                            'data-text': '目前仅限LV4以上的用户可以申请',
                            'data-position': 'top-center',
                        });
                    }
                }
                if (typeof el.afterAppend === 'function') {
                    el.afterAppend($liHtml);
                }
                // if(li.character == 'that') {
                //     $liHtml.addClass('context-menu-danmaku-list-myself');
                // }
                menu.append($liHtml);
            });
        }
        menu.find('[data-tooltip="1"]').each((i, e) => {
            new Tooltip({
                name: 'controll-tooltip',
                target: $(e),
                type: 'tip',
                padding: [15, 20, 15, 20],
                // arrow: true,
                margin: 1,
            });
        });
        return menu;
    }
}

export default ContextMenu;
