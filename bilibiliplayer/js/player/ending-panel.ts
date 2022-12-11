import Share from './share';
import STATE from './state';
import Clipboard from 'clipboard';
import TryToSee from './trytosee-ending';
import URLS from '../io/urls';
import Player from '../player';
import QRcode from '@jsc/qrcode';
import GlobalFunction, { IActionStateInterface } from './global-function';

import AddWatchlaterItem, { IOutData as DataFromWatchlaterAdd } from '../io/api-watchlater-add';
import DeleteWatchlaterItem, { IOutData as DataFromWatchlaterDelete } from '../io/api-watchlater-delete';
import { ApiViewOutData } from '../io/api-view';
import EndingPanelReview from './ending-panel-review';
import { ContentType } from '@jsc/namespace';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { browser, getCookie } from '@shared/utils';
import { apiRecommendOrigin, ApiRecommendOriginOutData } from '../io/api-recommend-orgion';

interface IConfigInterface {
    url?: string;
    title?: string;
    description?: string;
    pic?: string;
    shortTitle?: string;
    summary?: string;
    weiboTag?: string;
    callback?: Function;
}

interface IShareInterface {
    initialized: boolean;
    container: JQuery;
    show: Function;
    hide: Function;
    page_url?: JQuery;
    html_url?: JQuery;
}

interface IAuthorInfoInterface {
    mid?: number;
}

class EndingPanel {
    private functionList = {
        follow: function () {
            const that: any = this;
            that.globalFunction.follow(
                {
                    act: 1,
                    fid: that.authorInfo.mid,
                    reSrc: 17,
                    jsonp: 'jsonp',
                },
                (data: any, isApi: boolean) => {
                    // 调接口
                    if (isApi) {
                        if (data && data.code === 0) {
                            that.successFollow();
                        } else {
                            const err = data ? data.message || '关注失败' : '关注失败';
                            new Tooltip({
                                name: 'follow',
                                target: that.template.functionBtn,
                                position: 'bottom-center',
                                text: err,
                            });

                            if (err === '账号未登录') {
                                that.player.quicklogin.load(() => {
                                    that.template.functionBtn.trigger('click');
                                });
                            }
                        }
                    }
                },
            );
        },
        charging: function () {
            if (typeof (<any>this).globalFunction.WINDOW_AGENT.elecPlugin['showModal'] === 'function') {
                (<any>this).globalFunction.WINDOW_AGENT.elecPlugin['showModal']({
                    from: 'player_details_end_recommend',
                });
            } else {
                const $target = $('.b-btn.elec').eq(0);
                $target.length && $target.trigger('click');
            }
        },
        tosponsor: function () {
            if ((<any>this).player.state.mode === STATE.UI_FULL || (<any>this).player.state.mode === STATE.UI_WEB_FULL) {
                (<any>this).player.mode(STATE.UI_NORMAL);
            }
            if (typeof (<any>this).globalFunction.WINDOW_AGENT.objBPPlugin['open'] === 'function') {
                (<any>this).globalFunction.WINDOW_AGENT.objBPPlugin['open']();
            } else {
                const $target = $((<any>this).player.window.document.body).find('#btn_bangumi_buybuybuy');
                $target.length && $target.trigger('click');
            }
        },
    };

    private player: Player;
    private prefix: string;
    private initialized = false;
    private shareConfig: IConfigInterface;
    private login = false;
    private endingPanelFlag = 'video-state-ending-panel-flag';
    private container!: JQuery;
    private authorInfo!: IAuthorInfoInterface;
    private tryToSee!: TryToSee;
    private allowFeed!: number;
    private functionBtn!: Button;
    // private electricBtn!: JQuery;
    private pgcType: number;
    private endShowAllTime: number = 30;
    private endShowTime: number = 30;
    private endShowTimer!: number;
    private firstID!: string;
    private BROWSER_PREFIX = ['-webkit-', '-moz-', '-ms-', ''];
    private autoPlay: boolean;
    private globalFunction: GlobalFunction;
    private actionState: IActionStateInterface;
    endingPanelReview!: EndingPanelReview | null;
    template!: { [key: string]: JQuery; };
    share!: IShareInterface;
    isTry: boolean = false;
    scale: number = 1;
    disabled: boolean = true;

    constructor(player: Player, config: IConfigInterface) {
        this.player = player;
        this.prefix = this.player.prefix;
        this.pgcType = this.player.config.seasonType;
        this.autoPlay = false;
        this.shareConfig = $.extend(
            {
                url: this.getShareUrl(),
                title: player.window.document.title,
                description: $(player.window.document).find('meta[name="description"]').attr('content'),
                pic: '',
                shortTitle: player.window.document.title,
                summary: '',
                weiboTag: '#bilibili#',
            },
            this.player.config.seasonType && this.player.extraParams
                ? {
                    title: this.player.extraParams.shareText,
                    shortTitle: this.player.extraParams.shareText,
                    description: this.player.extraParams.shareText,
                    summary: this.player.extraParams.shareText,
                    pic: this.player.window.location.protocol + this.player.extraParams.sharePic,
                    weiboTag: '', // 分享文案自带
                }
                : null,
            config,
        );
        this.actionState = {
            isFollow: false,
            isLike: false,
            isCollect: false,
            isCoin: 0,
        };
        this.globalFunction = this.player.globalFunction;
        this.globalEvents();
    }

    private globalEvents() {
        const that = this;
        const player = this.player;
        $(player.template.container).on('video_media_before_seek' + player.config.namespace, function () {
            that.hide();
        });
    }

    init() {
        const that = this;
        const prefix = this.prefix;
        if (!this.player.extraParams && this.player.videoData.isPreview) {
            this.isTry = true;
        }
        this.container = $('<div class="' + prefix + '-ending-panel"></div>');
        if (this.pgcType) {
            this.container.addClass(`${prefix}-bangumi-ending-panel`);
        }
        this.container.html(this.TPL());
        this.container.click(function (event) {
            // event.stopPropagation();
            if ($(event.target).is(that.container)) {
                that.premiereClickHandle();
                that.player.controller.startButton.toggle();
                that.hide();
            }
        });

        this.player.video &&
            $(this.player.video).on('play', () => {
                this.hide();
            });
        this.template = {
            container: this.container,
            background: this.container.find('.' + prefix + '-ending-panel-blur-img'),
            box: this.container.find('.' + prefix + '-ending-panel-box'),
            videos: this.container.find('.' + prefix + '-ending-panel-box-videos'),
            functions: this.container.find('.' + prefix + '-ending-panel-box-functions'),
            review: this.container.find('.' + prefix + '-ending-panel-box-review'),
            hideText: this.container.find('.' + prefix + '-ending-panel-box-wrap'),

            head:
                this.container.find('.' + prefix + '-upinfo-head').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-head')
                    : this.container.find('.' + prefix + '-pgcinfo-head'),
            name:
                this.container.find('.' + prefix + '-upinfo-name').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-name')
                    : this.container.find('.' + prefix + '-pgcinfo-name'),
            functionBtn:
                this.container.find('.' + prefix + '-upinfo-follow').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-follow')
                    : this.container.find('.' + prefix + '-pgcinfo-follow'),
            // electricBtn: this.container.find('.' + prefix + '-upinfo-electric'),
            coin:
                this.container.find('.' + prefix + '-upinfo-span.coin').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-span.coin')
                    : this.container.find('.' + prefix + '-pgcinfo-span.coin'),
            praise:
                this.container.find('.' + prefix + '-upinfo-praise').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-praise')
                    : this.container.find('.' + prefix + '-pgcinfo-praise'),
            restart:
                this.container.find('.' + prefix + '-upinfo-span.restart').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-span.restart')
                    : this.container.find('.' + prefix + '-pgcinfo-span.restart'),
            share:
                this.container.find('.' + prefix + '-upinfo-span.share').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-span.share')
                    : this.container.find('.' + prefix + '-pgcinfo-span.share'),
            // like:
            //     this.container.find('.' + prefix + '-upinfo-span.like').length > 0
            //         ? this.container.find('.' + prefix + '-upinfo-span.like')
            //         : this.container.find('.' + prefix + '-pgcinfo-span.like'),
            // collect:
            //     this.container.find('.' + prefix + '-upinfo-span.collect').length > 0
            //         ? this.container.find('.' + prefix + '-upinfo-span.collect')
            //         : this.container.find('.' + prefix + '-pgcinfo-span.collect'),
            report:
                this.container.find('.' + prefix + '-upinfo-report').length > 0
                    ? this.container.find('.' + prefix + '-upinfo-report')
                    : this.container.find('.' + prefix + '-pgcinfo-report'),
            // grade:
            //     this.container.find('.' + prefix + '-grade-span.grade').length > 0
            //         ? this.container.find('.' + prefix + '-grade-span.grade')
            //         : this.container.find('.' + prefix + '-pgc-span.grade'),
        };

        this.updatePanelBackground();

        // 获取推荐视频
        this.getRecommendInfo();

        // 获取UP主信息
        if (this.player.config.playerType !== 2 || this.pgcType) {
            this.getAuthorInfo();
        } else {
            this.template.head.hide();
            this.template.name.hide();
            this.template.functionBtn.hide();
        }
        this.bindShare();
        // this._bind_report();

        typeof this.shareConfig.callback === 'function' && this.shareConfig.callback(this.updateLoginStatus.bind(this));

        this.bindEvents();
        // this.grade();
    }
    // 布局框架
    TPL(): string {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-ending-panel-blur">
                <div class="${prefix}-ending-panel-blur-img" ></div>
            </div>
            <div class="${prefix}-ending-panel-box">
                ${this.getHeaderPanel()}
                <div class="${prefix}-ending-panel-box-review"></div>
                <div class="${prefix}-ending-panel-box-wrap"></div>
                <div class="${prefix}-ending-panel-box-videos clearfix"></div>
            </div>
            `;
    }
    // 分享面板
    SHARE_TPL(): string {
        const prefix = this.prefix;
        return `<div class="${prefix}-ending-panel-share">
        <div class="${prefix}-ending-panel-share-header">
            <i class="${prefix}-iconfont ${prefix}-share-close icon-12close"></i>
        </div>
        <div class="${prefix}-ending-panel-share-left">
            <div class="${prefix}-share">
                <div class="${prefix}-share-btn weibo" share-type="weibo" title="分享到微博" name="end_share_weibo">
                    <i class="${prefix}-iconfont icon-48weibo" name="end_share_weibo"></i>分享到微博
                </div>
                <div class="${prefix}-share-btn tieba" share-type="baidu" title="分享到贴吧" name="end_share_tieba">
                    <i class="${prefix}-iconfont icon-48tieba" name="end_share_tieba"></i>分享到贴吧
                </div>
                <div class="${prefix}-share-btn qzone" share-type="qzone" title="分享到空间" name="end_share_qzone">
                    <i class="${prefix}-iconfont icon-48kongjian" name="end_share_qzone"></i>分享到空间
                </div>
                <div class="${prefix}-share-btn qq" share-type="qq" title="分享到QQ" name="end_share_qq">
                    <i class="${prefix}-iconfont icon-48qq" name="end_share_qq"></i>分享到QQ
                </div>
            </div>
            <div class="${prefix}-panel-address">
                <p class="${prefix}-panel-address-label">视频地址</p>
                <div class="${prefix}-panel-address-input-group">
                    <input class="${prefix}-address" name="end_share_html" readonly/>
                    <a href="javascript:void(0);" class="${prefix}-share-copy-btn copy-url" title="复制" name="end_share_html">复制</a>
                </div>
            </div>
            <div class="${prefix}-panel-address">
                <p class="${prefix}-panel-address-label">嵌入代码</p>
                <div class="${prefix}-panel-address-input-group">
                    <input class="${prefix}-address" name="end_share_link" readonly/>
                    <a href="javascript:void(0);" class="${prefix}-share-copy-btn copy-iframe" title="复制" name="end_share_link">复制</a>
                </div>
            </div>
        </div>
        <div class="${prefix}-ending-panel-share-right">
            <div class="${prefix}-share-qrcode">
                <p>分享到微信</p>
                <span class="${prefix}-share-qrcode-img"></span>
            </div>
        </div>
    </div>`;
    }

    show() {
        if (this.player.config.type === ContentType.Pugv) {
            return;
        }
        if (this.player.interactive && !this.player.interactiveVideoConfig!.interactiveLastPart) {
            return;
        }
        if (!this.initialized || !this.player.endingpanelInitialized) {
            this.updateBtn(true);
            this.init();
            if (
                typeof this.globalFunction.WINDOW_AGENT.playerCallSendCoin !== 'function' ||
                (this.player.iframe && this.player.playlist)
            ) {
                this.template.coin.css('display', 'none');
            }
            // if (typeof this.globalFunction.WINDOW_AGENT.playerCallSendLike !== 'function') {
            //     this.template.like.css('display', 'none');
            // }
            // if (typeof this.globalFunction.WINDOW_AGENT.playerCallSendCollect !== 'function') {
            //     this.template.collect.css('display', 'none');
            // }
            this.initialized = true;
            this.player.endingpanelInitialized = true;
            this.container.appendTo(this.player.template.playerWrap);
            this.updateBtn();
        }
        if (
            this.isVisible() ||
            this.player.state.video_state === STATE.V_BUFF ||
            this.player.state.video_state === STATE.V_PLAY
        ) {
            return false;
        }
        this.resize();
        if (this.player.extraParams) {
            this.userStateUpdate(this.player.extraParams);
        }
        this.container.show();
        if (this.player.interactive) {
            this.endingPanelReview = this.endingPanelReview || new EndingPanelReview(this, this.player);
        }
        this.template.box.show();
        this.share.container.hide();
        this.template.box.stop().animate({ opacity: '1' }, 300, 'linear');
        this.player.template.playerArea.addClass(this.endingPanelFlag);
        if (this.isTry) {
            this.container.addClass('show-try-to-see');
            this.CreateTryToSee(true);
        }
        this.endingPanelReview && this.endingPanelReview.resize(this.scale);
    }

    private premiereClickHandle() {
        if (this.player.config.isPremiere) {
            if (Number(this.player.checkPremiereStatus()) === 1) {
                return;
            }
            this.player.controller.premiereToNormalStyle();
        }
    }

    CreateTryToSee(isShow: boolean) {
        if (!this.tryToSee) {
            this.tryToSee = new TryToSee(this.player, this.container);
        }
        if (isShow) {
            this.tryToSee.show();
        } else {
            this.tryToSee.hide();
        }
    }
    hide() {
        if (this.player.config.type === ContentType.Pugv) {
            return;
        }
        if (!this.initialized || !this.player.endingpanelInitialized) {
            return false;
        }
        this.player.template.playerArea.removeClass(this.endingPanelFlag);
        this.template.box.stop().animate({ opacity: '0' }, 300, 'linear', () => {
            this.container.hide();
        });
    }

    toggle() {
        if (!this.initialized || !this.player.endingpanelInitialized) {
            this.show();
        } else if (this.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    isVisible() {
        return this.container && this.container.is(':visible');
    }

    bindEvents() {
        const prefix = this.prefix;
        const COVER_CLASS = `.${prefix}-ending-panel-box-recommend`;
        const COVER_TITLE_CLASS = `.${prefix}-ending-panel-box-recommend-cover-title`;
        const TITLE_LINE_HEIGHT = this.pgcType ? 21 : 18;
        // 投币
        this.template.coin.on('click', () => {
            if (this.template.coin.hasClass('disabled')) {
                return false;
            }
            this.checkLogin(() => {
                if (typeof this.globalFunction.WINDOW_AGENT.playerCallSendCoin === 'function') {
                    if (this.player.state.mode === STATE.UI_FULL || this.player.state.mode === STATE.UI_WEB_FULL) {
                        this.player.mode(STATE.UI_NORMAL);
                    }
                    this.globalFunction.WINDOW_AGENT.playerCallSendCoin();
                }
            });
        });
        // 点赞
        // this.template.like.on('click', () => {
        //     if (this.template.like.hasClass('disabled')) {
        //         return false;
        //     }
        //     this.player.track && this.player.track.trackInfoPush('end_like');
        //     this.checkLogin(() => {
        //         if (typeof this.globalFunction.WINDOW_AGENT.playerCallSendLike === 'function') {
        //             this.globalFunction.WINDOW_AGENT.playerCallSendLike();
        //         }
        //     });
        // });
        // 收藏
        // this.template.collect.on('click', () => {
        //     if (this.template.collect.hasClass('disabled')) {
        //         return false;
        //     }
        //     this.player.track && this.player.track.trackInfoPush('end_fav');
        //     this.checkLogin(() => {
        //         if (typeof this.globalFunction.WINDOW_AGENT.playerCallSendCollect === 'function') {
        //             if (this.player.state.mode === STATE.UI_FULL || this.player.state.mode === STATE.UI_WEB_FULL) {
        //                 this.player.mode(STATE.UI_NORMAL);
        //             }
        //             this.globalFunction.WINDOW_AGENT.playerCallSendCollect();
        //         }
        //     });
        // });
        // 重播
        this.template.restart.on('click', () => {
            this.premiereClickHandle();
            if (
                this.player.interactive &&
                this.player.interactiveVideoConfig!.interactiveLastPart &&
                this.player.interactiveVideo
            ) {
                this.player.interactiveVideoConfig!.portal = 1;
                this.player.interactiveVideoConfig!.interactiveTime = undefined;
                this.player.interactiveVideoConfig!.interactiveTargetId = undefined;
                this.player.interactiveVideoConfig!.interactiveHiddenVars = undefined;
                this.player.interactiveVideoConfig!.interactiveChoices = undefined;
                this.player.interactiveVideo.callNextPart({
                    cid: this.player.interactiveVideo.ivApiData.story_list![0].cid,
                    id: this.player.interactiveVideo.ivApiData.story_list![0].edge_id,
                    option: this.player.interactiveVideo.ivApiData.story_list![0].title,
                });
            } else {
                this.player.track?.heartBeat(1);
                this.player.seek(0);
                this.hide();
            }
        });
        // 充电
        // this.template.electricBtn &&
        //     this.template.electricBtn.on('click', () => {
        //         this.player.track && this.player.track.trackInfoPush('end_btn_battery');
        //         this.checkLogin(() => {
        //             if (this.player.state.mode === STATE.UI_FULL || this.player.state.mode === STATE.UI_WEB_FULL) {
        //                 this.player.mode(STATE.UI_NORMAL);
        //             }
        //             this.functionList.charging.call(this);
        //         });
        //     });

        this.template.share.on('click', () => {
            this.share.show();
        });
        // 推荐列表
        this.template.videos
            .on('mouseenter', COVER_CLASS, (e) => {
                const $title = $(e.currentTarget).find(COVER_TITLE_CLASS);
                const translateX = TITLE_LINE_HEIGHT - $title.height()!;
                let cssText = '';
                if (translateX) {
                    this.BROWSER_PREFIX.forEach((val: string) => {
                        cssText += val + 'transform:' + val + 'translate(0, ' + translateX + 'px);';
                    });
                    $title.css('cssText', cssText);
                }
            })
            .on('mouseleave', COVER_CLASS, (e) => {
                $(e.currentTarget).find(COVER_TITLE_CLASS).removeAttr('style');
            });
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            this.resize();
        });
    }
    // 更新按钮状态
    userStateUpdate(info: IActionStateInterface) {
        if (!this.initialized) {
            return;
        }
        // if (info['isLike']) {
        //     this.template.like.addClass('active');
        // } else {
        //     this.template.like.removeClass('active');
        // }
        if (info['isCoin']) {
            this.template.coin.addClass('active');
        } else {
            this.template.coin.removeClass('active');
        }
        // if (info['isCollect']) {
        //     this.template.collect.addClass('active');
        // } else {
        //     this.template.collect.removeClass('active');
        // }
        // 关注按钮
        if (this.player.config.playerType !== 2 || this.pgcType) {
            if (info['isFollow'] !== this.actionState['isFollow']) {
                this.actionState = info;
                this.getAuthorInfo();
            }
        }
        this.actionState = info;
    }
    // 获取按钮状态信息
    private updateBtn(init?: boolean) {
        const getActionState = this.globalFunction.WINDOW_AGENT.getActionState;
        if (typeof getActionState === 'function') {
            const info = getActionState();
            if (init) {
                this.actionState = info;
            } else {
                this.userStateUpdate(info);
            }
        }
    }
    private bindShare() {
        const that = this;
        const prefix = this.prefix;
        this.share = {
            initialized: false,
            container: $(this.SHARE_TPL()),
            show: function () {
                if (!that.share.initialized) {
                    that.share.container.appendTo(that.template.container);

                    that.share.page_url = that.share.container.find('.' + prefix + '-address[name="end_share_link"]');
                    that.share.html_url = that.share.container.find('.' + prefix + '-address[name="end_share_html"]');
                    that.template.copyBtn = that.container.find('.' + prefix + '-share-copy-btn');
                    that.template.qrcode = that.container.find('.' + prefix + '-share-qrcode-img');

                    const codeData = {
                        size: 150,
                        background: '#fff',
                        fill: '#000',
                        text: that.getShareUrl(),
                    };
                    const qrcodeEle = that.template.qrcode[0];
                    const wxQrcode = new QRcode(qrcodeEle, codeData);

                    that.template.copyBtn.each(function (i, e) {
                        new Button($(e), {});

                        new Clipboard(e, {
                            text: function () {
                                return String($(e).prev().val());
                            },
                            container: that.player.container[0],
                        })
                            .on('success', function () {
                                new Tooltip({
                                    name: 'copy-tip',
                                    target: $(e),
                                    text: '已成功复制到剪贴板',
                                    position: 'top-right',
                                    margin: 10,
                                });
                            })
                            .on('error', function () {
                                new Tooltip({
                                    name: 'copy-tip',
                                    target: $(e),
                                    text: '复制失败',
                                    position: 'top-right',
                                    margin: 10,
                                });
                            });
                    });

                    that.share.initialized = true;
                }
                if (that.isTry) {
                    that.container.removeClass('show-try-to-see');
                    that.CreateTryToSee(false);
                }
                that.updateShareConfig();
                that.template.box.hide();
                that.share.container.stop().show().animate({ opacity: '1' }, 300);
            },
            hide: function () {
                that.share.container.stop().animate({ opacity: '0' }, 300, function () {
                    that.share.container.hide();
                    that.template.box.show();
                    if (that.isTry) {
                        that.container.addClass('show-try-to-see');
                        that.CreateTryToSee(true);
                    }
                });
            },
        };

        this.share.container.find('.' + prefix + '-share-close').click(function () {
            that.share.hide();
        });
        // this.share.container.find(`.${prefix}-share-btn`).click(() => {
        //     const data: any = {};
        //     if (this.player.config.bvid) {
        //         data.bvid = this.player.config.bvid;
        //     } else {
        //         data.aid = this.player.config.aid;
        //     }
        //     $.ajax({
        //         url: URLS.X_SHARE_ADD,
        //         type: 'POST',
        //         data: data,
        //         xhrFields: {
        //             withCredentials: true,
        //         },
        //         dataType: 'json',
        //     });
        // });

        Share.bind(this.share.container, this.shareConfig, this.prefix);
    }

    // private grade() {
    //     const starList = [
    //         `${svg.star1}一星`,
    //         `${svg.star2}二星`,
    //         `${svg.star3}三星`,
    //         `${svg.star4}四星`,
    //         `${svg.star5}五星`,
    //     ];
    //     const prefix = this.prefix;
    //     const infoBlock = this.container.find('.' + prefix + '-upinfo-spans .display');
    //     const grade = this.container.find('.' + prefix + '-upinfo-span.grade');
    //     const starBlock = this.container.find('.' + prefix + '-grade-spans');
    //     const gradeText = this.container.find('.' + prefix + '-grade-span.text');
    //     const star = this.template.grade;
    //     if (this.player.interactive) {
    //         grade.css('display', 'flex');
    //         this.player.userLoadedCallback((status: IUserStatusInterface) => {
    //             if (status.login && status.interaction) {
    //                 if (status.interaction.mark === 0) {
    //                     infoBlock.css('opacity', '0');
    //                     infoBlock.css('display', 'none');
    //                     starBlock.css('display', 'flex');
    //                     setTimeout(() => {
    //                         starBlock.css('opacity', '1');
    //                     }, 50);
    //                     starBlock.on('mouseleave', () => {
    //                         for (let i = 0; i < status.interaction!.mark; i++) {
    //                             $(star[i]).html(`${svg.star5}`);
    //                         }
    //                         for (let b = 4; b >= status.interaction!.mark; b--) {
    //                             $(star[b]).html(`${svg.grade}`);
    //                         }
    //                     });
    //                     for (let i = 0; i < star.length; i++) {
    //                         $(star[i]).hover(() => {
    //                             $(star[i]).html(`${svg.star5}`);
    //                             for (let a = 0; a < i; a++) {
    //                                 $(star[a]).html(`${svg.star5}`);
    //                             }
    //                             for (let b = 4; b > i; b--) {
    //                                 $(star[b]).html(`${svg.grade}`);
    //                             }
    //                         });
    //                         $(star[i]).click(() => {
    //                             const data: Partial<ApiIvMarkInData> = {
    //                                 mark: i + 1,
    //                             };
    //                             if (this.player.config.bvid) {
    //                                 data.bvid = this.player.config.bvid;
    //                             } else {
    //                                 data.aid = this.player.config.aid;
    //                             }
    //                             new ApiIvMark(<ApiIvMarkInData>data).getData({
    //                                 success: (data: ApiIvMarkOutData) => {
    //                                     if (data && data.code === 0) {
    //                                         status.interaction!.mark = i + 1;
    //                                         grade.html(starList[i]);
    //                                         for (let c = 0; c < i + 1; c++) {
    //                                             $(star[c]).addClass('animate');
    //                                         }
    //                                         // starBlock.unbind('mouseout');
    //                                         gradeText.text('感谢评分，你可以随时修改');
    //                                         setTimeout(() => {
    //                                             infoBlock.css('opacity', '1');
    //                                             infoBlock.css('display', 'flex');
    //                                             starBlock.css('opacity', '0');
    //                                             starBlock.css('display', 'none');
    //                                             star.removeClass('animate');
    //                                         }, 1000);
    //                                     }
    //                                 },
    //                                 error: () => { },
    //                             });
    //                         });
    //                     }
    //                 } else {
    //                     const mark = status.interaction.mark;
    //                     for (let i = 0; i < status.interaction.mark; i++) {
    //                         $(star[i]).html(`${svg.star5}`);
    //                     }
    //                     starBlock.on('mouseleave', () => {
    //                         for (let i = 0; i < status.interaction!.mark; i++) {
    //                             $(star[i]).html(`${svg.star5}`);
    //                         }
    //                         for (let b = 4; b >= status.interaction!.mark; b--) {
    //                             $(star[b]).html(`${svg.grade}`);
    //                         }
    //                     });
    //                     gradeText.text('感谢评分，你可以随时修改');
    //                     if (status.interaction.mark) {
    //                         grade.html(`${starList[status.interaction.mark - 1]}`);
    //                     } else {
    //                         grade.remove();
    //                     }
    //                     for (let i = 0; i < star.length; i++) {
    //                         $(star[i]).hover(() => {
    //                             $(star[i]).html(`${svg.star5}`);
    //                             for (let a = 0; a < i; a++) {
    //                                 $(star[a]).html(`${svg.star5}`);
    //                             }
    //                             for (let b = 4; b > i; b--) {
    //                                 $(star[b]).html(`${svg.grade}`);
    //                             }
    //                         });
    //                         $(star[i]).click(() => {
    //                             const data: Partial<ApiIvMarkInData> = {
    //                                 mark: i + 1,
    //                             };
    //                             if (this.player.config.bvid) {
    //                                 data.bvid = this.player.config.bvid;
    //                             } else {
    //                                 data.aid = this.player.config.aid;
    //                             }
    //                             new ApiIvMark(<ApiIvMarkInData>data).getData({
    //                                 success: (data: ApiIvMarkOutData) => {
    //                                     if (data && data.code === 0) {
    //                                         status.interaction!.mark = i + 1;
    //                                         grade.html(starList[i]);
    //                                         for (let c = 0; c < i + 1; c++) {
    //                                             $(star[c]).addClass('animate');
    //                                         }
    //                                         // starBlock.unbind('mouseout');
    //                                         gradeText.text('感谢评分，你可以随时修改');
    //                                         setTimeout(() => {
    //                                             infoBlock.css('opacity', '1');
    //                                             infoBlock.css('display', 'flex');
    //                                             starBlock.css('opacity', '0');
    //                                             starBlock.css('display', 'none');
    //                                             star.removeClass('animate');
    //                                         }, 1000);
    //                                     }
    //                                 },
    //                                 error: () => { },
    //                             });
    //                         });
    //                     }
    //                     if (gradeText.text() === '感谢评分，你可以随时修改') {
    //                         setTimeout(() => {
    //                             infoBlock.css('opacity', '1');
    //                             infoBlock.css('display', 'flex');
    //                             starBlock.css('opacity', '0');
    //                             starBlock.css('display', 'none');
    //                         }, 1500);
    //                     }
    //                 }
    //             } else {
    //                 infoBlock.css('opacity', '0');
    //                 infoBlock.css('display', 'none');
    //                 starBlock.css('display', 'flex');
    //                 setTimeout(() => {
    //                     starBlock.css('opacity', '1');
    //                 }, 50);
    //             }
    //         });
    //     } else {
    //         grade.hide();
    //         starBlock.hide();
    //     }
    //     starBlock.click(() => {
    //         this.checkLogin(() => { });
    //     });
    //     grade.click(() => {
    //         infoBlock.css('opacity', '0');
    //         infoBlock.css('display', 'none');
    //         starBlock.css('opacity', '1');
    //         starBlock.css('display', 'flex');
    //         const status = this.player.user.status();
    //         if (status && status.interaction && status.interaction.mark) {
    //             const mark = status.interaction.mark;
    //             for (let a = 0; a < mark; a++) {
    //                 $(star[a]).html(`${svg.star5}`);
    //             }
    //             for (let b = 4; b >= mark; b--) {
    //                 $(star[b]).html(`${svg.grade}`);
    //             }
    //         }
    //         // starBlock.on('mouseout', () => {
    //         //     star.html(`${svg.grade}`);
    //         // });
    //     });
    // }

    private getHeaderPanel() {
        const prefix = this.prefix;
        let headerPanel: string;
        if (this.pgcType) {
            headerPanel = `
                <div class="${prefix}-ending-panel-box-functions">
                    <div class="${prefix}-pgcinfo-head">
                        <img src="">
                    </div>
                    <div class="${prefix}-pgcinfo-left">
                        <div class="${prefix}-pgcinfo-name"></div>
                        <div class="${prefix}-pgcinfo-follow" name="end_btn_follow">
                        </div>
                    </div>
                    <div class="${prefix}-pgcinfo-spans  clearfix">
                        <div class="${prefix}-pgcinfo-span coin" name="end_coin"><i class="${prefix}-iconfont icon-32coin" name="end_coin"></i>投币</div>
                        <div class="${prefix}-pgcinfo-span share" name="end_share"><i class="${prefix}-iconfont icon-32share" name="end_share"></i>分享</div>
                        <div class="${prefix}-pgcinfo-span restart" name="end_replay"><i class="${prefix}-iconfont icon-32replay" name="end_replay"></i>重播</div>
                    </div>
                </div>
            `;
        } else {
            headerPanel = `
                <div class="${prefix}-ending-panel-box-functions">
                    <div class="${prefix}-upinfo-head"></div>
                    <div class="${prefix}-upinfo-left">
                        <div class="${prefix}-upinfo-name"></div>
                        <div class="${prefix}-upinfo-follow" name="end_btn_follow"><span name="end_btn_follow">+ 关注</span></div>
                    </div>
                    <div class="${prefix}-upinfo-spans clearfix">
                        <div class="${prefix}-pgcinfo-span coin" name="end_coin"><i class="${prefix}-iconfont icon-32coin" name="end_coin"></i>投币</div>
                        <div class="${prefix}-upinfo-span share" name="end_share"><i class="${prefix}-iconfont icon-32share" name="end_share"></i>分享</div>
                        <div class="${prefix}-upinfo-span restart" name="end_replay"><i class="${prefix}-iconfont icon-32replay" name="end_replay"></i>重播</div>
                    </div>
                </div>
            `;
        }
        return headerPanel;
    }

    private updateShareConfig() {
        const p = this.player.user.status().pid || this.player.config.p;
        const param = this.player.config.bvid ? `bvid=${this.player.config.bvid}` : `aid=${this.player.config.aid}`;
        this.share.html_url!.val(this.getShareUrl());
        if (this.player.interactive) {
            this.share.page_url!.val(
                `<iframe src="//player.bilibili.com/player.html?${param}&cid=${this.player.config.cid}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`,
            );
        } else {
            let url = '';
            if (this.player.config.gamePlayer) {
                url = `//www.bilibili.com/blackboard/newplayer.html?${param}&cid=${this.player.config.cid}&gamePlayer=1`;
            } else {
                url = `//player.bilibili.com/player.html?${param}&cid=${this.player.config.cid}&page=${p}`;
            }
            this.share.page_url!.val(
                `<iframe src="${url}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`,
            );
        }
    }

    private getShareUrl(): string {
        const location = this.player.window.location;
        const subpath = this.player.config.bvid || `av${this.player.config.aid}`;
        let shareUrl = location.href;
        if (this.player.config.gamePlayer) {
            return document.referrer || shareUrl;
        }
        if (this.player.config.seasonType && this.player.extraParams) {
            return this.player.window.location.protocol + this.player.extraParams.shareUrl;
        }
        if (this.player.playlistNoView) {
            const p = this.player.playlistNoView.findPartNumber();
            const pname = p ? `/index_${p}.html` : '/';
            shareUrl = `${location.protocol}//www.bilibili.com/video/${subpath + pname}`;
        }
        if (this.player.playlist) {
            const p = this.player.playlist.findPartNumber();
            const pname = p ? `/index_${p}.html` : '/';
            shareUrl = `${location.protocol}//www.bilibili.com/video/${subpath + pname}`;
        }
        if (this.player.interactive) {
            shareUrl = `${location.protocol}//www.bilibili.com/video/${subpath}/`;
        }
        return shareUrl;
    }

    private getAuthorInfo() {
        if (this.pgcType) {
            this.updateFunctionInfo();
        } else {
            this.globalFunction.getVideoinfo((data: ApiViewOutData) => {
                if (data) {
                    // get allow bp from window
                    if (
                        this.globalFunction.WINDOW_AGENT.elecPlugin &&
                        typeof (<any>this).globalFunction.WINDOW_AGENT.elecPlugin['isCharged'] === 'function'
                    ) {
                        data.allowFeed = Number((<any>this).globalFunction.WINDOW_AGENT.elecPlugin['isCharged']());
                    } else {
                        data.allowFeed = 0;
                    }
                    this.updateFunctionInfo(data);
                }
            });
        }
    }

    private updateFunctionInfo(data?: ApiViewOutData) {
        let functionClick: (() => void) | null = function () { };
        let attention = false;
        let fans: string | number = '';
        let theme = 'blue';
        let className = 'up-avatar';
        let disabled = false;
        let total;
        let avatar;
        let name;
        let label;
        const that = this;
        const prefix = this.prefix;

        this.authorInfo = {};

        if (!(this.player.config.seasonType && this.player.extraParams) && data) {
            // update share config
            this.shareConfig.title = data.title + ' UP主: ' + data.owner.name;
            this.shareConfig.shortTitle = this.shareConfig.title;
            this.shareConfig.description = this.shareConfig.title;
            this.shareConfig.summary = data.desc;
            this.shareConfig.pic = data.pic;
        }

        // update function info
        if (this.pgcType) {
            const avatar = this.player.extraParams && this.player.extraParams.squarePic;
            const name = this.player.extraParams && this.player.extraParams.mediaTitle;
            const player = this.player;
            let epButton: string;
            // let btnState: string;
            let btnText: string;
            let btnStyle: string;
            let followBtn: JQuery;
            let followState: JQuery;
            player.flushExtraParams();
            let isFollow = this.player.extraParams && Boolean(this.player.extraParams.isFollow);
            const updateBtnState = (following?: boolean) => {
                if (following) {
                    if (this.player.extraParams && this.player.extraParams.canWatch) {
                        if (this.pgcType === 1 || this.pgcType === 4) {
                            btnText = '已追番';
                        } else {
                            btnText = '已追剧';
                        }
                    } else {
                        btnText = '已想看';
                    }
                    // btnState = `<span class="${prefix}-pgcinfo-cancel-follow cancel">${btnText}</span>`;
                    btnStyle = 'width: 105px';
                } else if (!following) {
                    if (this.player.extraParams && this.player.extraParams.canWatch) {
                        if (this.pgcType === 1 || this.pgcType === 4) {
                            btnText = '追番';
                        } else {
                            btnText = '追剧';
                        }
                    } else {
                        btnText = '想看';
                    }
                    // btnState = `
                    //     <div class="${prefix}-pgcinfo-btn-wrap">
                    //         <span class="${prefix}-svg">${svg.chase}</span>
                    //         <span class="${prefix}-pgcinfo-follow-state">${btnText}</span>
                    //     </div>
                    // `;
                    btnStyle = '';
                }
                if (this.pgcType === 1 || this.pgcType === 4) {
                    epButton = `
                    <span class="${prefix}-pgcinfo-follow-binge-watching" style="${btnStyle}">
	<span class="${prefix}-iconfont icon-16binge-watching-full"></span>
	<span class="${prefix}-pgcinfo-follow-state">${btnText}</span>
</span>
                    `;
                } else {
                    // 电影
                    epButton = `
                    <span class="${prefix}-pgcinfo-follow-collect" style="${btnStyle}">
	<span class="${prefix}-iconfont icon-16collection-ful"></span>
	<span class="${prefix}-pgcinfo-follow-state">${btnText}</span>
</span>
                    `;
                }
                followBtn = this.template.functionBtn.html(epButton);
                isFollow = !isFollow;
                followState = followBtn.find(`.${prefix}-pgcinfo-follow-state`);
            };
            updateBtnState(isFollow!);
            this.template.head.find('img').attr('src', avatar);
            $(followBtn!).hover(
                function () {
                    followState.html(followState.html().replace("已", "取消"));
                },
                function () {
                    followState.html(followState.html().replace("取消", "已"));
                },
            );
            this.template.name.html(name!);
            followBtn!.click(() => {
                if (that.player.state.mode === STATE.UI_FULL && !Boolean(getCookie('DedeUserID'))) {
                    that.player.exitFullScreen();
                }
                this.globalFunction.WINDOW_AGENT.callBangumiFollow &&
                    this.globalFunction.WINDOW_AGENT.callBangumiFollow(isFollow, () => {
                        updateBtnState(isFollow!);
                    });
            });
            // if (this.player.interactive) {
            //     const nextButton = this.container.find('.' + prefix + '-pgcinfo-span.next');
            //     if (this.player.config.hasNext) {
            //         nextButton.addClass('display');
            //         nextButton.on('click', (e) => {
            //             this.player.interactiveVideoConfig!.portal = 0;
            //             this.callNext();
            //         });
            //     }
            // }
        } else {
            if (data!.rights.bp) {
                // 番剧
                label = '<span name="anime_play_player_contract">我要承包</span>';
                theme = 'yellow';
                functionClick = this.functionList.tosponsor;
                avatar = data!.pic ? data!.pic.replace('http://', '//') : '';
                total = this.player.bangumipaypanel
                    ? this.player.bangumipaypanel.get_user_number()
                    : this.player.$body.find('.bangumi-buybuybuy .total > b').text() || '-';
                name =
                    '<span class="' +
                    prefix +
                    '-upinfo-name-pgc">已有<span class="pgc-total">' +
                    total +
                    '人</span>承包此番剧</span>';
                className = '';
                this.template.functionBtn.attr('name', 'anime_play_player_contract');
            } else {
                // 阿婆主
                attention = this.actionState['isFollow'];
                if (typeof this.globalFunction.WINDOW_AGENT.getAuthorInfo === 'function') {
                    const info = this.globalFunction.WINDOW_AGENT.getAuthorInfo();
                    attention = info['attention'];
                    fans = info['fans'] || '';
                    fans = this.formatNum(fans);
                    if (!fans && fans !== 0) {
                        fans = '';
                    }
                }
                label = `<div name="end_btn_follow">+ 关注</div>`;
                functionClick = this.functionList.follow;
                avatar = data!.owner.face ? data!.owner.face.replace('http://', '//') : '';
                name =
                    '<a href="' +
                    URLS.PAGE_SPACE +
                    data!.owner.mid +
                    '" target="_blank" name="end_up">' +
                    data!.owner.name +
                    '</a>';

                this.authorInfo.mid = data!.owner.mid;
                this.template.functionBtn.attr('name', 'end_btn_follow');

                if (attention) {
                    disabled = true;
                    label = '已关注';
                    functionClick = null;
                    this.template.functionBtn.attr('name', '');
                }
                // if (data!.allowFeed && this.template.electricBtn) {
                //     if (attention) {
                //         this.template.electricBtn.removeClass('little');
                //     } else {
                //         this.template.electricBtn.addClass('little');
                //     }
                //     this.template.electricBtn.show();
                // }
            }
            this.allowFeed = data!.allowFeed!;
            this.updatePanelBackground(data!.pic);
            let headHref = '//space.bilibili.com/' + data!.owner.mid;
            this.player.config.seasonId && (headHref = "//bangumi.bilibili.com/anime/" + this.player.config.seasonId);
            this.template.head
                .html('<a href="' + headHref + '" target="_blank"><img src="' + avatar + '" /></a>')
                .addClass(className);

            this.template.name.html(name);
            this.functionBtn && this.functionBtn.destroy();
            this.functionBtn = new Button(this.template.functionBtn, {
                class: theme,
                label: label,
                disabled: disabled,
            });
            this.functionBtn.on('click', () => {
                typeof functionClick === 'function' && that.checkLogin(functionClick.bind(that));
            });
        }
    }

    private successFollow() {
        const that = this;
        that.template.functionBtn.attr('name', '');
        that.template.functionBtn.html('已关注');
        that.functionBtn.disable();
        // this.template.electricBtn && this.template.electricBtn.removeClass('little');
        this.actionState['isFollow'] = true;
    }

    private updatePanelBackground(src?: string) {
        if (browser.version.edge) {
            this.template.background.addClass('edge-blur-hack');
        }
        src &&
            this.template.background.css(
                'background-image',
                'url("' + (src ? src.replace('http://', '//') : '') + '")',
            );
    }

    private getRecommendInfo() {
        const that = this;
        if (this.pgcType) {
            this.appendBangumiInfo();
        } else {
            // const data: Partial<ApiRecommendInData> = {};
            // if (this.player.config.bvid) {
            //     data.bvid = this.player.config.bvid;
            // } else {
            //     data.aid = this.player.config.aid;
            // }
            // new ApiRecommend(<ApiRecommendInData>data).getData({
            //     success: (data: ApiRecommendOutData[]) => {
            //         that.appendRecommendInfo(data);
            //     },
            // });
            apiRecommendOrigin(this.player.config.aid).then(d => this.appendRecommendOriginInfo(d));
        }
    }
    private appendRecommendOriginInfo(data: ApiRecommendOriginOutData[]) {
        const prefix = this.prefix;

        if (data && data.length) {
            data.forEach(d => {
                const a = document.createElement('a');
                a.href = `//www.bilibili.com/video/av${d.aid}`;
                a.setAttribute('name', 'recommend_video');
                a.setAttribute('class', `${prefix}-ending-panel-box-recommend`);
                a.setAttribute('target', '_blank');
                a.innerHTML = `<div class="${prefix}-ending-panel-box-recommend-img" name="recommend_video" style="background-image:url(${d.cover.replace('http://', '//')})"></div>
                <div class="${prefix}-ending-panel-box-recommend-cover" name="recommend_video">
                    <div class="${prefix}-ending-panel-box-recommend-cover-title" name="recommend_video">${d.title}</div>
                    <div class="${prefix}-ending-panel-box-recommend-add-watchlater">
                        <i class="${prefix}-iconfont icon-22wait-normal"></i>
                    </div>
                </div>`;
                this.addToWatchLater($(a), d.aid);
                this.template.videos.append(a);
            });
            this.autoPlay && this.setTime();
        } else {
            this.template.videos.hide();
        }
    }

    // private appendRecommendInfo(data: ApiRecommendOutData[]) {
    //     const that = this;
    //     const prefix = this.prefix;
    //     const player = this.player;
    //     let len = 8;
    //     let cover = $([]);

    //     if (data && data.length) {
    //         this.template.videos.show();
    //         len = data.length <= len ? data.length : len;
    //         this.firstID = this.player.config.bvid ? data[0].bvid : `av${data[0].aid}`;
    //         for (let i = 0; i < len; i++) {
    //             const ele = data[i];
    //             const aid = ele.aid;
    //             const cid = ele.cid;
    //             const bvid = this.player.config.bvid ? ele.bvid : undefined;
    //             const ugcPay = ele.rights['ugc_pay'];
    //             const pic = ele.pic ? ele.pic.replace('http://', '//') : '';
    //             const first = i === 0 && this.autoPlay ? 'first-child' : '';
    //             // const autoPlay =
    //             //     i === 0
    //             //         ? `<div class="auto-play">
    //             //                 <div class="text">接下来自动播放</div>
    //             //                 <div class="cancel">取消</div>
    //             //             </div>
    //             //             <div class="auto-play-progress">
    //             //                 <span class="progress"></span>
    //             //             </div>`
    //             //         : '';
    //             // const payOrWatchLater = ugcPay
    //             //     ? `<div class="${prefix}-ending-panel-box-recommend-pay">付费</div>`
    //             //     : `<div class="${prefix}-ending-panel-box-recommend-add-watchlater">
    //             //             <i class="${prefix}-iconfont icon-22wait-normal"></i>
    //             //         </div>`;
    //             const item = $(`<a name="recommend_video" class="${prefix}-ending-panel-box-recommend" target="_blank" >
    //             <div class="${prefix}-ending-panel-box-recommend-img" name="recommend_video" style="background-image:url(${pic})"></div>
    //             <div class="${prefix}-ending-panel-box-recommend-cover" name="recommend_video">
    //                 <div class="${prefix}-ending-panel-box-recommend-cover-title" name="recommend_video"></div>
    //                 <div class="${prefix}-ending-panel-box-recommend-add-watchlater">
    //                     <i class="${prefix}-iconfont icon-22wait-normal"></i>
    //                 </div>
    //             </div>
    //         </a>`).click((e) => {
    //                 if (!$(e.target).hasClass(`${prefix}-iconfont`)) {
    //                     e.preventDefault();
    //                     if (window['PlayerAgent'] && typeof window['PlayerAgent']['triggerReload'] === 'function') {
    //                         window['PlayerAgent']['triggerReload'](aid, cid, bvid);
    //                     } else {
    //                         player.window.location.href = `//www.bilibili.com/video/av${aid}`;
    //                     }
    //                 }
    //             });

    //             const title = item.find(`.${prefix}-ending-panel-box-recommend-cover-title`);
    //             title.text(data[i].title);
    //             !ugcPay && this.addToWatchLater(item, aid, bvid!);
    //             cover = cover.add(item);
    //         }

    //         that.template.videos.append(cover);
    //         this.autoPlay && this.setTime();
    //     } else {
    //         this.template.videos.hide();
    //     }
    // }
    // 添加到稍后再看
    private addToWatchLater(item: JQuery, aid: number, bvid?: string) {
        const prefix = this.prefix;
        const player = this.player;
        const addBtn = item.find(`.${prefix}-ending-panel-box-recommend-add-watchlater`);
        const cancel = item.find('.cancel');
        const addBtnHover = new Tooltip({
            target: addBtn,
            type: 'tip',
            name: 'add_watchlater_button',
            position: 'top-center',
            text: '稍后再看',
        });
        bvid = this.player.config.bvid ? bvid : '';
        cancel.click(() => {
            item.removeClass('first-child');
            this.clearTime();
            return false;
        });
        addBtn.click(function (e) {
            let text = '添加失败，请重试';
            let text2 = '移除失败，请重试';
            e.preventDefault();
            if (addBtn.attr('data-selected')) {
                new DeleteWatchlaterItem(aid, bvid).getData({
                    success: function (json: DataFromWatchlaterDelete) {
                        if (json) {
                            if (json.code === 0) {
                                text2 = '已从稍后再看列表中移除';
                                addBtnHover.options.text = '稍后再看';
                                addBtn.removeAttr('data-selected');
                                addBtn
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
                            target: addBtn,
                            name: 'add_watchlater_button',
                            position: 'top-center',
                            text: text2,
                        });
                    },
                });
                return;
            }
            if (!player.user.status().login) {
                return player.quicklogin.load();
            }
            new AddWatchlaterItem(aid, bvid).getData({
                success: function (json: DataFromWatchlaterAdd) {
                    if (json) {
                        if (json.code === 0) {
                            text = '已加稍后再看';
                            addBtnHover.options.text = '移除';
                            addBtn.attr('data-selected', 'true');
                            addBtn
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
                        target: addBtn,
                        name: 'add_watchlater_button',
                        position: 'top-center',
                        text: text,
                    });
                },
            });
        });
    }
    private addBoxClass(className?: string) {
        const classList = ['little-screen', 'second-screen', 'third-screen', 'fourth-screen'];
        this.template.box.addClass(className!);
        classList.indexOf(className!) > -1 && classList.splice(classList.indexOf(className!), 1);
        classList.forEach((item) => {
            this.template.box.removeClass(item);
        });
    }
    private resize() {
        const W = this.container.width()!;
        if (W < 638) {
            this.addBoxClass('little-screen');
        } else if (W < 854) {
            this.addBoxClass('second-screen');
        } else if (W < 1070) {
            this.addBoxClass('third-screen');
        } else if (W < 1280) {
            this.addBoxClass('fourth-screen');
        } else {
            this.addBoxClass();
        }
        const H = this.container.height()!;
        const w = this.template.box.width()!;
        const h = this.template.box.height()!;
        let cssText = '';
        let r = 1;
        if (h > H * 0.98) {
            r = (H * 0.98) / h;
        }
        if (w > W * 0.94) {
            const R = (W * 0.85) / w;
            r = r > R ? R : r;
        }
        this.BROWSER_PREFIX.forEach((val) => {
            cssText += val + 'transform:' + val + 'scale(' + r + ');';
        });
        if (this.template.box.css('display') === 'none') {
            cssText += 'display: none';
        }
        this.template.box.css('cssText', cssText);
        this.scale = r;
        this.endingPanelReview && this.endingPanelReview.resize(r);
    }
    private clearTime() {
        this.endShowTimer && clearInterval(this.endShowTimer);
    }

    private setTime() {
        let cssText = '';
        this.endShowTimer = window.setTimeout(() => {
            if (--this.endShowTime >= 0) {
                const X = 100 - (this.endShowTime * 100) / this.endShowAllTime;
                this.BROWSER_PREFIX.forEach(function (val: string) {
                    cssText += val + 'transform:' + val + 'translateX(' + X + '%);';
                });
                this.template.videos.find('.first-child .progress').css('cssText', cssText);
                this.setTime();
            } else {
                window.location.href = '//www.bilibili.com/video/' + this.firstID;
            }
        }, 200);
    }
    private appendBangumiInfo() {
        const that = this;
        const prefix = this.prefix;
        const player = this.player;
        let len = 12;
        player.flushExtraParams();
        const data = player.extraParams && player.extraParams.recommend;
        let cover = $([]);
        if (data && data.length) {
            len = data.length <= len ? data.length : len;
            for (let i = 0; i < len; i++) {
                const item = $(
                    '<a href="' +
                    data[i].url +
                    '" class="' +
                    prefix +
                    '-ending-panel-box-recommend" >' +
                    '<div class="' +
                    prefix +
                    '-ending-panel-box-recommend-img" style="background-image:url(' +
                    (data[i].cover ? data[i].cover.replace('http://', '//') : '') +
                    ')"></div>' +
                    '<div class="' +
                    prefix +
                    '-ending-panel-box-recommend-cover">' +
                    '<div class="' +
                    prefix +
                    '-ending-panel-box-recommend-cover-title"></div>' +
                    '</div></a>',
                );
                const title = item.find(`.${prefix}-ending-panel-box-recommend-cover-title`);
                title.text(data[i].title);
                cover = cover.add(item);
            }

            that.template.videos.append(cover);
        }
    }

    private updateLoginStatus(isSignIn: boolean) {
        this.login = isSignIn;
    }

    private checkLogin(callback: Function) {
        if (this.player.user.status().login) {
            callback();
        } else {
            this.player.quicklogin.load();
        }
    }
    private formatNum(n: any) {
        const num = parseInt(n, 10);
        if (num < 0 || n == null || n === undefined) {
            return '--';
        }
        if (String(n).indexOf('.') !== -1 || String(n).indexOf('-') !== -1) {
            return n;
        }
        if (num === 0) {
            return 0;
        }
        n = num;
        if (n >= 10000 && n < 100000000) {
            return (n / 10000).toFixed(1) + '万';
        } else if (n >= 100000000) {
            return (n / 100000000).toFixed(1) + '亿';
        } else {
            return n;
        }
    }
    private callNext() {
        this.player.reloadMedia.callNextPart(
            {
                forceToNext: true,
            },
            () => {
                this.createDisableTip();
            },
            true,
        );
    }
    private createDisableTip() {
        this.disable();
        new Tooltip({
            target: this.container,
            position: 'top-center',
            text: '暂时没有更多啦~',
        });
    }
    disable() {
        this.container.addClass('disabled');
        this.disabled = true;
    }
    enable() {
        if (this.disabled) {
            this.disabled = false;
        }
        this.container.removeClass('disabled');
    }
    destroy() {
        this.clearTime();
        this.endingPanelReview = null;
    }
}

export default EndingPanel;
