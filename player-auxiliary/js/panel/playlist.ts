import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import Tooltip from '../plugins/tooltip';
import { fmSeconds, getBit, htmlEncode, thumbnail } from '@shared/utils';
import { Order } from '../plugins/order';

interface IPanelOptions {
    prefix: string;
    panel: JQuery;
}

interface IVideoInfo {
    aid?: number;
    bvid?: string;
    cid?: number;
}

interface IPageItem {
    cid: number;
    title: string;
    duration: number;
    from: string;
    aid: number;
    bvid: string;
    page: number;
    attr: number;
}

interface IListItem {
    aid: number;
    bvid: string;
    type: number;
    title: string;
    pic: string;
    page: number;
    pages: IPageItem[] | null;
    duration: number;
    attr: number;
    ownerMid?: number;
    ownerName?: string;
    ownerFace?: string;
    ownerFollowed?: number;
    play: number;
    danmaku: number;
    reply: number;
    index?: number;
}

interface ListInfoInterface {
    mid: number;
    count: number;
    order: string;
    index: number; // originList[0].index - 1，从 0 开始
    hasPrev: boolean;
    hasNext: boolean;
    originList: IListItem[];
    sortedList: IPageItem[];
    firstList: IListItem[];
}

class Playlist {
    private auxiliary: Auxiliary;
    private container: JQuery;
    private prefix: string;
    private elements!: {
        [key: string]: JQuery;
    };
    private loading = false;
    private topLoading = false;
    private loadingDisabled = false;
    private count!: number;
    private playScrollbar: any;
    private disableScrollEvent = false;
    private listInfo!: ListInfoInterface;
    private video: IVideoInfo = {};
    private currentListIndex: number = 0;
    private prefixName: string;
    itemSup: any;
    scrollTo = 0;

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.container = options.panel;
        this.prefix = options.prefix;
        this.prefixName = this.prefix + "-playlist";

        this.auxiliary.directiveManager.sender(WD.PL_RETRIEVE_DATA, null, (received?: IReceived) => {
            this.listInfo = received!.data.listInfo;
            this.video.cid = received!.data.cid;
            this.video.aid = received!.data.aid;
            this.video.bvid = received!.data.bvid;
            this.init();
            this.globalEvents();
            this.setActive();
        });

        this.auxiliary.directiveManager.on(PD.PL_SET_COUNT.toString(), (e, received: IReceived) => {
            this.count = received.data.count;
            if (this.elements) {
                this.elements.count.show();
                this.elements.current.html(<any>this.findIndex(this.video)[2]);
                this.elements.total.html(<any>this.count);
            }
        });
    }

    private whileScrolling(next = true) {
        if (this.loadingDisabled || this.loading) {
            return;
        }
        const LoadingSnippet = $(`
                <li class="${this.prefix}-playlist-item-loading">
                    <span class="${this.prefix}-playlist-item-loading-img"></span><span>正在加载...</span>
                </li>
            `);
        next ? this.elements.list.append(LoadingSnippet) : this.elements.list.prepend(LoadingSnippet);
        this.loading = true;
        this.loadMore(next, () => {
            LoadingSnippet.remove();
            this.loading = false;
        });
    }

    private loadMore(direction: boolean, callback?: (newListLength: number) => void) {
        this.auxiliary.directiveManager.sender(
            WD.PL_LOAD_MORE,
            {
                direction,
            },
            (received?: IReceived) => {
                const newListLength = received!.data.listInfo.originList.length - this.listInfo.originList.length;
                this.listInfo = received!.data.listInfo;
                this.elements.list.empty();
                this.itemsSnippet();
                this.setActive();
                callback?.(newListLength);
            },
        );
    }

    private init() {
        const that = this;
        const snippet = $(this.snippet());
        this.container.append(snippet);
        this.container.addClass("playlist-view");
        const list = $(`<div class="${this.prefixName}-playlist"></div>`).appendTo(this.container);
        const ul = $('<ul>').appendTo(list);
        this.itemsSnippet(undefined, ul);
        this.elements = {
            list: ul,
            // order: this.container.find(`${this.prefixName}-sortlist`),
            // count: this.container.find(`${this.prefixName}-count`),
            positive: this.container.find("." + this.prefixName + "-nav-positive"),
            reverse: this.container.find("." + this.prefixName + "-nav-reverse"),
            loop: this.container.find("." + this.prefixName + "-nav-loop"),
            random: this.container.find("." + this.prefixName + "-nav-random"),
            current: this.container.find("." + this.prefixName + "-nav-current"),
            total: this.container.find("." + this.prefixName + "-nav-total"),
        };

        const order = new Order(snippet, {
            type: "click.tab",
            selector: "." + Order.prefix + "-tab-i",
            change: target => {
                switch (target[0]) {
                    case this.elements.positive[0]:
                        this.listInfo.order = "sequential";
                        break;
                    case this.elements.reverse[0]:
                        this.listInfo.order = "reverse";
                        break;
                    case this.elements.loop[0]:
                        this.listInfo.order = "loop";
                        break;
                    case this.elements.random[0]:
                        this.listInfo.order = "shuffle";
                        break;
                }
                this.auxiliary.directiveManager.sender(
                    WD.PL_SET_ORDER,
                    {
                        order: this.listInfo.order,
                    },
                    (received?: IReceived) => { },
                );
            }
        });
        switch (this.listInfo.order) {
            case "sequential":
                order.change(this.elements.positive);
                break;
            case "reverse":
                order.change(this.elements.reverse);
                break;
            case "loop":
                order.change(this.elements.loop);
                break;
            case "shuffle":
                order.change(this.elements.random);
                break;
        }

        new Tooltip({
            target: this.elements.positive,
            type: "tip",
            position: "top-center",
            text: "顺序播放",
        });
        new Tooltip({
            target: this.elements.reverse,
            type: "tip",
            position: "top-center",
            text: "倒序播放",
        });
        new Tooltip({
            target: this.elements.loop,
            type: "tip",
            position: "top-center",
            text: "列表循环",
        });
        new Tooltip({
            target: this.elements.random,
            type: "tip",
            position: "top-center",
            text: "随机播放",
        });

        list.mCustomScrollbar("destroy");
        list.mCustomScrollbar({
            axis: "y",
            scrollInertia: 100,
            autoHideScrollbar: true,
            setTop: this.getTop() + "px",

            mouseWheel: {
                scrollAmount: 100,
                preventDefault: false,
            },

            callbacks: {
                whileScrolling: function () {
                    that.scrollTo = (<any>this).mcs.top;
                    that.mcsTop((<any>this).mcs.top);

                    if (that.listInfo.hasNext && (<any>this).mcs.topPct >= 99) {
                        that.whileScrolling(true); // 滚动到底部剩下10%时加载更多
                    } else if (that.listInfo.hasPrev && (<any>this).mcs.topPct <= 1) {
                        that.whileScrolling(false); // 滚动到顶部且顶部索引不为0时加载之前的
                    }
                },

                onScroll: function () {
                    that.scrollTo = (<any>this).mcs.top;
                    that.mcsTop((<any>this).mcs.top);
                },
            },
        });

        this.container.click((e) => {
            const parents = $(e.target).parents(`.${this.prefix}-playlist-item`);
            if (parents.length) {
                const aid = parents.data("nodeData").aid;
                const bvid = parents.data("nodeData").bvid;
                const data = bvid
                    ? {
                        bvid,
                    }
                    : {
                        aid,
                    };
                const index = this.findIndex(data);
                this.auxiliary.directiveManager.sender(
                    WD.PL_CLICK_ITEM,
                    {
                        isAudio: this.listInfo.originList[index[0]].type !== 12 ? 0 : 1,
                    },
                    (received?: IReceived) => { },
                );
                if (e.target.classList.contains(`${this.prefixName}-info-remove`)) {
                    // 删除
                    this.auxiliary.directiveManager.sender(
                        WD.PL_DEL_VIDEO,
                        {
                            aid: aid,
                            bvid: bvid,
                        },
                        (received?: IReceived) => {
                            if (received!.data.code === 0) {
                                parents.remove();
                                // $('.player-tooltips[data-tooltip-name="playlist_delete"]').remove();
                                this.listInfo = received!.data.listInfo;
                                this.elements.list.empty();
                                this.itemsSnippet();
                                this.setActive();
                                this.count = this.listInfo.count;
                                this.elements.current.html(<any>this.findIndex(this.video)[2]);
                                this.elements.total.html(<any>this.count);
                            } else {
                                new Tooltip({
                                    target: $(e.target),
                                    position: 'top-right',
                                    name: 'playlist_delete',
                                    text: received!.data.message || '删除失败，请重试',
                                });
                            }
                        },
                    );
                } else if (!parents.hasClass(`${this.prefix}-playlist-item-disabled`)) {
                    let cid = $(e.target).data('cid');
                    if (!cid) {
                        cid = $(e.target).parents(`.${this.prefixName}-part-item`).data('cid');
                    }
                    if (!cid) {
                        cid =
                            this.listInfo.originList[index[0]].pages && this.listInfo.originList[index[0]].pages![0]
                                ? this.listInfo.originList[index[0]].pages![0].cid
                                : null;
                    }
                    this.auxiliary.directiveManager.sender(
                        WD.PL_SET_VIDEO,
                        {
                            aid,
                            bvid,
                            cid,
                        },
                        (received?: IReceived) => { },
                    );
                }
            }
        });
    }

    mcsTop(input: number) {
        let index = 0;
        const items = $("." + this.prefixName + "-item", this.elements.list);
        const height = this.elements.list.height()!;
        const sup = $("." + this.prefixName + "-item-sup").outerHeight()!;

        for (let i = 0; items.length > i; i++) {
            const item = $(items[i]);
            if (this.itemSup && (item[0] === this.itemSup.container[0])) {
                this.itemSup.target.removeAttr("data-state-play");
                this.itemSup.container.prepend(this.itemSup.target);
                this.itemSup = null;
            }

            const outerHeight = item.outerHeight()!;
            if ((height < outerHeight) && (index < -input) && ((-input + sup) < (index + outerHeight))) {
                this.itemSup = {
                    container: item,
                    target: item.find("." + this.prefixName + "-item-sup"),
                };
                this.itemSup.target.attr("data-state-play", item.attr("data-state-play"));
                this.elements.list.prepend(this.itemSup.target);
            }
            index += outerHeight;
        }
    }
    getTop() {
        const cid = this.auxiliary.player.config.cid;
        const item = $(`[data-aid="${this.auxiliary.player.config.aid}"].${this.prefixName}-item`, this.elements.list);
        const part = $(`[data-cid="${cid}"].${this.prefixName}-part-item`, item);

        if (item.length) {
            const top = item.offset()!.top - this.elements.list.offset()!.top;

            if (part.length) {
                const height = this.elements.list.height()!;
                const outer = item.outerHeight()!;
                const outerHeight = $("." + this.prefixName + "-item-sup").outerHeight()!;
                return height < outer ? part.offset()!.top - this.elements.list.offset()!.top - outerHeight : top;
            }

            return top;
        }
        return 0;
    }

    private globalEvents() {

        this.auxiliary.directiveManager.on(PD.PL_VIDEO_SWITCH.toString(), (e, received: IReceived) => {
            this.video.cid = received.data.cid;
            this.video.bvid = received['data']['bvid'];
            this.video.aid = received['data']['aid'];
            this.setActive();
        });

        this.auxiliary.directiveManager.on(PD.PL_LIST_TOP.toString(), (e, received: IReceived) => {
            this.listInfo = received.data.listInfo;
            this.elements.list.empty();
            this.itemsSnippet();
            this.setActive();
        });
    }

    private snippet() {
        return `
        <div class="${this.prefixName}-nav-header clearfix">
            <div class="${this.prefix}-fl ${this.prefixName}-sortlist">
                <div class="${this.prefixName}-nav-positive ${Order.prefix}-tab-i">
                    <i class="${this.prefix}-iconfont icon-16toview-playlist-positive"></i>
                </div>
                <div class="${this.prefixName}-nav-reverse ${Order.prefix}-tab-i">
                    <i class="${this.prefix}-iconfont icon-16toview-reverse"></i>
                </div>
                <div class="${this.prefixName}-nav-loop ${Order.prefix}-tab-i">
                    <i class="${this.prefix}-iconfont icon-16repeaton"></i>
                </div>
                <div class="${this.prefixName}-nav-random ${Order.prefix}-tab-i">
                    <i class="${this.prefix}-iconfont icon-16toview-random"></i>
                </div>
            </div>
            <div class="${this.prefix}-fl ${this.prefixName}-count">
                <span class="${this.prefixName}-nav-current">-</span> / <span class="${this.prefixName}-nav-total">${this.listInfo.originList.length}</span>
            </div>
        </div>
        `;
    }

    isLost(item: IListItem) {
        return Boolean(getBit(item.attr, 1));
    }
    private itemsSnippet(items = this.listInfo.originList, ul = this.elements.list) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const pages = item.pages;
            const aid = item.aid;
            const isLost = this.isLost(item);
            const hasP = pages?.length! > 1;
            const name = item.ownerName;
            let pSnippet = isLost
                ? `<div class=" ${this.prefixName}-cover-pstate">已失效</div>`
                : hasP
                    ? `<div class="${this.prefixName}-cover-ptotal">${pages?.length! > 999 ? "999" : pages?.length}P</div>`
                    : `<div class="${this.prefixName}-cover-duration">${fmSeconds(item.duration!) || "00:00"}</div>`;
            if (item.pages?.length! > 1) {
                pSnippet += `<div class="${this.prefix}-playlist-item-p-list">`;
                for (let j = 0; j < item.pages!.length; j++) {
                    pSnippet += `<div class="${this.prefix}-playlist-item-p-item" data-cid="${item.pages![j].cid}">P${j + 1
                        } ${htmlEncode(item.pages![j].title)}</div>`;
                }
                pSnippet += '</div>';
            }
            const li = $(`<li class="${this.prefixName}-item" data-aid="${item.aid}" data-state-broken="${isLost}" data-state-watched="false" data-state-play="false">
            <div class="${this.prefixName}-item-sup clearfix">
                <div class="${this.prefixName}-order-cell ${this.prefix}-fl">
                    <div class="${this.prefixName}-order-number">${item.index || i}</div>
                    <div class="${this.prefixName}-order-play">
                        <i class="${this.prefix}-iconfont icon-12toview-play"></i>
                    </div>
                </div>
                <div class="${this.prefixName}-cover-cell ${this.prefix}-fl">
                    <img src="${thumbnail(item.pic!.replace(/https?:\/\//, "//"), 102, 62)}" alt="cover">
                    ${pSnippet}
                </div>
                <div class="${this.prefixName}-info-cell ${this.prefix}-fl">
                    <div class="${this.prefixName}-info-title"></div>
                    <div class="${this.prefixName}-info-other">
                        <div class="${this.prefixName}-info-icon ${this.prefix}-fl">
                            <i class="${this.prefix}-iconfont icon-12toview-up"></i>
                        </div>
                        <div class="${this.prefixName}-info-name ${this.prefix}-fl"></div>
                        <div class="${this.prefixName}-info-watched ${this.prefix}-fr">已观看</div>
                        <div class="${this.prefixName}-info-remove ${this.prefix}-fr">
                            <i class="${this.prefix}-iconfont icon-12toview-remove"></i>
                        </div>
                    </div>
                </div>
            </div>
        </li>
            `);

            li.data("nodeData", item);
            li.find("." + this.prefixName + "-info-name").text(name!);
            li.find("." + this.prefixName + "-info-title").text(item.title!).attr("title", item.title!);

            if (!isLost && hasP) {
                const part = $(`<ul class="${this.prefixName}-part-list"></ul>`);
                pages?.forEach(d => {
                    const play = $(`<li class="${this.prefixName}-part-item clearfix" data-cid="${d.cid}" data-state-play="false">
                    <div class="${this.prefixName}-plist-play ${this.prefix}-fl"></div>
                    <div class="${this.prefixName}-plist-chapter ${this.prefix}-fl">${d.title || item.index || (i + 1)}</div>
                    <div class="${this.prefixName}-plist-duration ${this.prefix}-fr">${fmSeconds(d.duration!) || "00:00"}</div>
                    <div class="${this.prefixName}-plist-pstate ${this.prefix}-fr">播放中</div>
                </li>`);
                    play.appendTo(part);
                });
                part.appendTo(li)
            }
            li.appendTo(ul);
        }
    }

    private setActive() {
        this.elements.list.find("[data-state-play=true]").removeAttr("data-state-play");
        const aid = this.video.aid;
        const cid = this.video.cid;
        const item = $(`[data-aid="${this.video.aid}"].${this.prefixName}-item`, this.elements.list);
        const part = $(`[data-cid="${cid}"].${this.prefixName}-part-item`, item);
        const items = this.elements.list.find("." + this.prefixName + "-item");
        const index = this.elements.list.find(`[data-aid="${aid}"].${this.prefixName}-item`).index();
        item.attr("data-state-play", "true");
        part.attr("data-state-play", "true");

        this.elements.current.text(index !== -1 ? index + 1 : "-");
        items.map((c, d) => {
            return $(d).find("." + this.prefixName + "-order-number").text(c + 1);
        });

        this.elements.total.text(items.length);
    }

    private findIndex<T extends any>(video: IVideoInfo, list = this.listInfo.originList): number[] {
        const index = [-1, -1, -1];
        const id = video.bvid ? 'bvid' : 'aid';
        for (let i = 0; i < list.length; i++) {
            if (list[i][id] === video[id]) {
                index[0] = i;
                index[2] = list[i].index! + 1;
                this.currentListIndex = index[2];
                break;
            }
        }
        if (index[2] === -1) {
            index[2] = this.currentListIndex;
        }
        if (video.cid && index[0] !== -1) {
            for (let i = 0; i < list[index[0]].pages!.length; i++) {
                if (list[index[0]].pages![i].cid === video.cid) {
                    index[1] = i;
                    break;
                }
            }
        }
        return index;
    }
}

export default Playlist;
