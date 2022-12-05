import ApiPlaytag, { ApiPlaytagOutData } from "@jsc/bilibiliplayer/js/io/api-playtag";
import Auxiliary from "../auxiliary";
import Tooltip from "../plugins/tooltip";
import AddWatchlaterItem, { IOutData as DataFromWatchlaterAdd } from '@jsc/bilibiliplayer/js/io/api-watchlater-add';
import DeleteWatchlaterItem, { IOutData as DataFromWatchlaterDelete } from '@jsc/bilibiliplayer/js/io/api-watchlater-delete';
import { formatNum, thumbnail } from "@shared/utils";

import '@jsc/bilibiliplayer/css/recommend.less';

interface IPanelOptions {
    prefix: string;
    panel: JQuery;
}
export class Recommend {
    private initialized = false;
    private prefix: string;
    container: JQuery<HTMLElement>;
    scrollbar!: JQuery<HTMLElement>;
    pgcType: number;
    constructor(private auxiliary: Auxiliary, options: IPanelOptions) {
        this.prefix = options.prefix;
        this.container = options.panel;
        this.pgcType = auxiliary.config.seasonType;

        auxiliary.template.filterRecommendBtn.on("click", () => {
            this.show();
        })
    }
    private init() {
        this.initialized = true;
        const auxiliary = this.auxiliary;
        const prefix = this.prefix;
        const container = this.container;

        container.find("." + prefix + "-panel-close").click(function () {
            container.hide();
        });

        this.scrollbar = $(`<div class="${prefix}-panel-scrollbar"></div>`).appendTo(container);

        if (this.pgcType && auxiliary.player.extraParams?.recommend) {
            this.itemSnippet(<any>auxiliary.player.extraParams.recommend);
        } else {
            new ApiPlaytag({
                aid: auxiliary.config.aid,
                cid: auxiliary.config.cid
            }).getData({
                success: (v: ApiPlaytagOutData) => {
                    this.itemSnippet(v);
                },
                error: () => {
                    this.nothing();
                }
            })
        }

        this.show();
    }
    itemSnippet(value: ApiPlaytagOutData) {
        const auxiliary = this.auxiliary;
        const prefix = this.prefix;
        const container = this.container;
        const scrollbar = this.scrollbar;

        if (value && value.length) {
            value.forEach(d => {
                if ((<any>d).cover) {
                    // bangumi兼容
                    d[0] = (<any>d).cover;
                    d[2] = (<any>d).title;
                    if ((<any>d).stat) {
                        // 预留备用：当前页面过滤了这些数据
                        d[3] = (<any>d).stat.view;
                        d[4] = (<any>d).stat.danmaku;
                        d[6] = (<any>d).stat.follow;
                    }
                }
                const item = $(`<a class="${this.prefix}-recommend-video" href="${(<any>d).url || `//www.bilibili.com/video/av${d[1]}`}" target="_blank">
                <div class="${this.prefix}-recommend-left">
                    ${d[8] ? d[8].is_ad_loc && d[8].is_ad ? `<i class="promote-icon"></i>` : "" : ""}
                    <img src="${thumbnail(d[0], 160, 100).replace("http:", "")}"/>
                    ${(<any>d).cover ? "" : `${d[7] ? `<div class="so-imgTag_rb">${d[7]}</div>` : ''}<span><i class="${this.prefix}-iconfont icon-22wait-normal"></i></span>`}
                </div>
                <div class="${this.prefix}-recommend-right">
                    <div class="${this.prefix}-recommend-title"></div>
                    <div class="${this.prefix}-recommend-click">
                        <i class="${this.prefix}-iconfont icon-12iconplayed"></i>${formatNum(d[3])}
                    </div>
                    <div class="${this.prefix}-recommend-danmaku">
                        <i class="${this.prefix}-iconfont icon-12icondanmu"></i>${formatNum(d[4])}
                    </div>
                </div>
            </a>`).appendTo(scrollbar);

                const img = item.find("." + prefix + "-recommend-left img");
                const title = item.find("." + prefix + "-recommend-title");
                const span = item.find("." + prefix + "-recommend-left > span");
                img.attr("alt", d[2]);
                title.attr("title", d[2]).text(d[2]);
                const tooltop = new Tooltip({
                    target: span,
                    type: "tip",
                    name: "add_watchlater_button",
                    position: "top-center",
                    text: "稍后再看",
                });
                d[1] && span.on('click', b => {
                    b.preventDefault();
                    let text = '添加失败，请重试';
                    let text2 = '移除失败，请重试';
                    if (span.attr("data-selected")) {
                        new DeleteWatchlaterItem(d[1]).getData({
                            success: function (json: DataFromWatchlaterDelete) {
                                if (json) {
                                    if (json.code === 0) {
                                        text2 = '已从稍后再看列表中移除';
                                        tooltop.options.text = '稍后再看';
                                        span.removeAttr('data-selected');
                                        span
                                            .find('.icon-22wait-choice')
                                            .removeClass('icon-22wait-choice')
                                            .addClass('icon-22wait-normal');
                                    } else if (json.message) {
                                        text2 = json.message;
                                    }
                                }
                            },
                            complete: function () {
                                new Tooltip({
                                    target: span,
                                    name: 'add_watchlater_button',
                                    position: 'top-center',
                                    text: text2,
                                });
                            },
                        });
                        return;
                    }
                    if (!auxiliary.user.status().login) {
                        return auxiliary.player.quicklogin.load();
                    }
                    new AddWatchlaterItem(d[1]).getData({
                        success: function (json: DataFromWatchlaterAdd) {
                            if (json) {
                                if (json.code === 0) {
                                    text = '已加稍后再看';
                                    tooltop.options.text = '移除';
                                    span.attr('data-selected', 'true');
                                    span
                                        .find('.icon-22wait-normal')
                                        .removeClass('icon-22wait-normal')
                                        .addClass('icon-22wait-choice');
                                } else if (json.message) {
                                    text = json.message;
                                }
                            }
                        },
                        complete: function () {
                            new Tooltip({
                                target: span,
                                name: 'add_watchlater_button',
                                position: 'top-center',
                                text: text,
                            });
                        },
                    });
                });
            });

            scrollbar.mCustomScrollbar({
                axis: "y",
                scrollInertia: 100,
                autoHideScrollbar: true,

                mouseWheel: {
                    scrollAmount: 100,
                    preventDefault: false,
                }
            });
        } else {
            this.nothing();
        }
    }
    nothing() {
        this.container.append(`<div class="bilibili-player-recommend-nothing">
        暂无相关视频推荐
        </div> `);
    }
    show() {
        if (this.initialized) {
            this.container.show();
        } else {
            this.init()
        }
    }
    hide() {
        this.container.hide();
    }
}