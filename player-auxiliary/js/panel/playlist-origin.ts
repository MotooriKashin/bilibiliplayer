import Auxiliary, { IReceived } from '../auxiliary';
import * as WD from '../const/webpage-directive';
import * as PD from '../const/player-directive';
import { IListItem, IPlaylistData } from '../io/rebuild-playlist-noview-data';
import Tooltip from '../plugins/tooltip';
import { Order } from '../plugins/order';
import { fmSeconds, htmlEncode, thumbnail } from '@shared/utils';

interface IPanelOptions {
    prefix: string;
    panel: JQuery;
}

interface IVideoInfo {
    aid?: number;
    bvid?: string;
    cid?: number;
}

class PlaylistOrigin {
    private auxiliary: Auxiliary;
    private container: JQuery;
    private list: IListItem[] = [];
    private prefix: string;
    private elements!: {
        [key: string]: JQuery;
    };
    private count!: number;
    // private playScrollbar: any;
    private bofqi: HTMLElement;
    private prefixName: string;
    private order = "sequential";
    scrollTo = 0;
    itemSup: any;
    playlist!: IPlaylistData;
    private video: IVideoInfo = {};

    constructor(auxiliary: Auxiliary, options: IPanelOptions) {
        this.auxiliary = auxiliary;
        this.container = options.panel;
        this.prefix = options.prefix;
        this.prefixName = this.prefix + "-playlist";
        this.bofqi = document.querySelector('#bilibili-player')! || document.querySelector('#bofqi')!;

        this.auxiliary.directiveManager.sender(WD.PL_RETRIEVE_DATA, null, (received?: IReceived) => {
            this.order = received!.data.order;
            this.playlist = received!.data.playlist!;
            this.list = received!.data.list;
            this.count = this.list.length;
            this.video.cid = received!.data.cid;
            this.video.aid = received!.data.aid;
            this.video.bvid = received!.data.bvid;
            this.init();
            this.globalEvents();
            this.setActive();
        });
    }

    private init() {
        const that = this;

        const snippet = $(this.snippet());
        this.container.append(snippet);
        const itemsSnippet = this.itemsSnippet().appendTo(this.container);
        this.elements = {
            title: snippet.find("." + this.prefixName + "-nav-title"),
            ownername: snippet.find("." + this.prefixName + "-nav-ownername"),
            positive: snippet.find("." + this.prefixName + "-nav-positive"),
            reverse: snippet.find("." + this.prefixName + "-nav-reverse"),
            loop: snippet.find("." + this.prefixName + "-nav-loop"),
            random: snippet.find("." + this.prefixName + "-nav-random"),
            current: snippet.find("." + this.prefixName + "-nav-current"),
            total: snippet.find("." + this.prefixName + "-nav-total"),
            // collection: snippet.find("." + this.prefixName + "-collection"), // 收藏：已和谐
            itemsSnippet
        };

        const order = new Order(snippet, {
            type: "click.tab",
            selector: "." + Order.prefix + "-tab-i",
            change: target => {
                switch (target[0]) {
                    case this.elements.positive[0]:
                        this.order = "sequential";
                        break;
                    case this.elements.reverse[0]:
                        this.order = "reverse";
                        break;
                    case this.elements.loop[0]:
                        this.order = "loop";
                        break;
                    case this.elements.random[0]:
                        this.order = "shuffle";
                        break;
                }
                this.auxiliary.directiveManager.sender(
                    WD.PL_SET_ORDER,
                    {
                        order: this.order,
                    },
                    (received?: IReceived) => { },
                );
            }
        });
        switch (this.order) {
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

        if ((<any>this).playlist.name) {
            this.elements.title.text((<any>this).playlist.name);
            this.elements.title.attr("title", (<any>this).playlist.name);
            this.elements.title.on("click", () => {
                window.open("//www.bilibili.com/playlist/detail/pl" + (<any>that).playlist.pid);
            });
        } else {
            this.elements.title.hide();
        }
        if ((<any>this).playlist.owner?.name) {
            this.elements.ownername.html(`<div class="${this.prefixName}-info-icon ${this.prefix}-fl">
            <i class="${this.prefix}-iconfont icon-12toview-up"></i>
        </div>
        ${(<any>this).playlist.owner.name}`);
            this.elements.ownername.attr("title", (<any>this).playlist.owner.name);
            this.elements.ownername.on("click", () => {
                window.open("//space.bilibili.com/" + (<any>that).playlist.owner.mid);
            });
        } else {
            this.elements.ownername.hide();
        }

        this.container.click((e) => {
            const parents = $(e.target).parents(`.${this.prefixName}-item`);
            if (parents.length) {
                const aid = parents.data("nodeData").aid;
                const bvid = parents.data("nodeData").bvid;
                const index = this.findIndex({
                    aid: aid,
                    bvid: bvid,
                });
                this.auxiliary.directiveManager.sender(
                    WD.PL_CLICK_ITEM,
                    {
                        isAudio: 0,
                    },
                    (received?: IReceived) => { },
                );
                let cid = $(e.target).data('cid');
                if (!cid) {
                    cid =
                        this.list[index[0]].pages && this.list[index[0]].pages[0]
                            ? this.list[index[0]].pages![0].cid
                            : null;
                }
                this.auxiliary.directiveManager.sender(
                    WD.PL_SET_VIDEO,
                    {
                        aid: aid,
                        bvid: bvid,
                        cid: cid,
                    },
                    (received?: IReceived) => { },
                );
                // }
            }
        });

        itemsSnippet.mCustomScrollbar("destroy");
        itemsSnippet.mCustomScrollbar({
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
                },

                onScroll: function () {
                    that.scrollTo = (<any>this).mcs.top;
                    that.mcsTop((<any>this).mcs.top);
                },
            },
        });
    }
    mcsTop(input: number) {
        let index = 0;
        const items = $("." + this.prefixName + "-item", this.elements.itemsSnippet);
        const height = this.elements.itemsSnippet.height()!;
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
                this.elements.itemsSnippet.prepend(this.itemSup.target);
            }
            index += outerHeight;
        }
    }
    getTop() {
        const cid = this.auxiliary.player.config.cid;
        const item = $(`[data-aid="${this.auxiliary.player.config.aid}"].${this.prefixName}-item`, this.elements.itemsSnippet);
        const part = $(`[data-cid="${cid}"].${this.prefixName}-part-item`, item);

        if (item.length) {
            const top = item.offset()!.top - this.elements.itemsSnippet.offset()!.top;

            if (part.length) {
                const height = this.elements.itemsSnippet.height()!;
                const outer = item.outerHeight()!;
                const outerHeight = $("." + this.prefixName + "-item-sup").outerHeight()!;
                return height < outer ? part.offset()!.top - this.elements.itemsSnippet.offset()!.top - outerHeight : top;
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

        this.auxiliary.directiveManager.on(PD.PL_VIDEO_WATCHED.toString(), (e, received: IReceived) => {
            const item = this.container.find(
                `.${this.prefixName}-item[data-${received.data.bvid ? 'bvid' : 'aid'}="${received.data.bvid || received.data.aid
                }"]`,
            );
            item.find(`.${this.prefixName}-info-watched`).css('display', '');
        });

    }

    private snippet() {
        return `
        <div class="${this.prefixName}-nav-header clearfix">
	<div class="${this.prefixName}-nav-title" name="playlist_title"></div>
	<div class="${this.prefixName}-nav-ownername" name="playlist_owner"></div>
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
		<span class="${this.prefixName}-nav-current">-</span> / <span class="${this.prefixName}-nav-total">${this.list.length}</span>
	</div>
	<div class="${this.prefix}-fr ${this.prefixName}-collection">
		<i class="${this.prefix}-iconfont icon-16collection-lin"></i>
	</div>
</div>
        `;
    }
    isLost(item: IListItem) {
        return !((item.state === 0) || (item.state === 1) || (item.state === -6)) || (item.pages.length < 1);
    }
    private itemsSnippet(items = this.list) {
        const list = $(`<div class="${this.prefixName}-playlist"></div>`);
        const ul = $('<ul>').appendTo(list);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const pages = item.pages;
            const aid = item.aid;
            const isLost = this.isLost(item);
            const watched = !!((item.progress! >= 30) || (item.progress === -1) || item._isWatched);
            const hasP = pages.length > 1;
            const name = item.ownerName;
            let pSnippet = isLost
                ? `<div class=" ${this.prefixName}-cover-pstate">已失效</div>`
                : hasP
                    ? `<div class="${this.prefixName}-cover-ptotal">${pages.length > 999 ? "999" : pages.length}P</div>`
                    : `<div class="${this.prefixName}-cover-duration">${fmSeconds(item.duration!) || "00:00"}</div>`;
            if (item.pages.length > 1) {
                pSnippet += `<div class="${this.prefix}-playlist-item-p-list">`;
                for (let j = 0; j < item.pages.length; j++) {
                    pSnippet += `<div class="${this.prefix}-playlist-item-p-item" data-cid="${item.pages[j].cid}">P${j + 1
                        } ${htmlEncode(item.pages[j].part!)}</div>`;
                }
                pSnippet += '</div>';
            }
            const li = $(`<li class="${this.prefixName}-item" data-aid="${item.aid}" data-state-broken="${isLost}" data-state-watched="${watched}" data-state-play="false">
            <div class="${this.prefixName}-item-sup clearfix">
                <div class="${this.prefixName}-order-cell ${this.prefix}-fl">
                    <div class="${this.prefixName}-order-number">${i}</div>
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
                pages.forEach(d => {
                    const play = $(`<li class="${this.prefixName}-part-item clearfix" data-cid="${d.cid}" data-state-play="false">
                    <div class="${this.prefixName}-plist-play ${this.prefix}-fl"></div>
                    <div class="${this.prefixName}-plist-chapter ${this.prefix}-fl">${d.part || (i + 1)}</div>
                    <div class="${this.prefixName}-plist-duration ${this.prefix}-fr">${fmSeconds(d.duration!) || "00:00"}</div>
                    <div class="${this.prefixName}-plist-pstate ${this.prefix}-fr">播放中</div>
                </li>`);
                    play.appendTo(part);
                });
                part.appendTo(li)
            }
            li.appendTo(ul);
        }
        return list;
    }

    private setActive() {
        this.elements.itemsSnippet.find("[data-state-play=true]").removeAttr("data-state-play");
        const aid = this.video.aid;
        const cid = this.video.cid;
        const item = $(`[data-aid="${this.video.aid}"].${this.prefixName}-item`, this.elements.itemsSnippet);
        const part = $(`[data-cid="${cid}"].${this.prefixName}-part-item`, item);
        const items = this.elements.itemsSnippet.find("." + this.prefixName + "-item");
        const index = this.elements.itemsSnippet.find(`[data-aid="${aid}"].${this.prefixName}-item`).index();
        item.attr("data-state-play", "true");
        part.attr("data-state-play", "true");

        this.elements.current.text(index !== -1 ? index + 1 : "-");
        items.map((c, d) => {
            return $(d).find("." + this.prefixName + "-order-number").text(c + 1);
        });

        this.elements.total.text(items.length);
    }

    private findIndex<T extends any>(video: IVideoInfo, list = this.list): number[] {
        const index = [-1, -1];
        for (let i = 0; i < list.length; i++) {
            if ((video.bvid && list[i].bvid === video.bvid) || (video.aid && list[i].aid === video.aid)) {
                index[0] = i;
                break;
            }
        }
        if (video.cid && index[0] !== -1 && list[index[0]].pages) {
            for (let i = 0; i < list[index[0]].pages.length; i++) {
                if (list[index[0]].pages[i].cid === video.cid) {
                    index[1] = i;
                    break;
                }
            }
        }
        return index;
    }
}

export default PlaylistOrigin;
