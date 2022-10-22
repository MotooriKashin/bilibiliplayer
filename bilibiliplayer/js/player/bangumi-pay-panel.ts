import STATE from './state';
import Player from '../player';
import GlobalFunction from './global-function';
import { ApiViewOutData } from '../io/api-view';
import { browser, formatNum, thumbnail } from '@shared/utils';

class BangumiPayPanel {
    private player: Player;
    private prefix: string;
    private url: string;
    private retry: number;
    private scene: number;
    private bangumiPayPanelFlag: string;
    private container!: JQuery;
    private wrap!: JQuery;
    private head!: JQuery;
    private list7day!: JQuery;
    private listTotal!: JQuery;
    private progress!: JQuery;
    private btn!: JQuery;
    private img!: JQuery;
    private inited = false;
    private globalFunction: GlobalFunction;
    isShow!: boolean;

    constructor(player: Player) {
        this.player = player;
        this.prefix = player.prefix;
        this.url = this.player.config.bvid ? '?bvid=' + this.player.config.bvid : '?av_id=' + this.player.config.aid;
        this.retry = 5;
        this.scene = 0;
        this.globalFunction = this.player.globalFunction;
        this.init();
        this._globalEvents();
        this.bangumiPayPanelFlag = 'video-state-bangumipay-panel-flag';
    }

    private TPL() {
        const prefix = this.prefix + '-bangumipay-panel';
        return `<div class="${prefix}">
                    <div class="${prefix}-blur">
                        <div class="${prefix}-blur-img"></div>
                    </div>
                    <div class="${prefix}-wrap bangumipay-empty">
                        <div class="${prefix}-wrap-head">
                            <i class="${prefix}-icon bcoin-left"></i>
                            <span class="${prefix}-wrap-head-content">感谢小伙伴承包本番</span>
                            <i class="${prefix}-icon bcoin-right"></i>
                        </div>
                        <div class="${prefix}-wrap-list-7day">
                            <div class="${prefix}-wrap-list-head">
                                <i class="${prefix}-iconfont icon-12rankleft"></i>
                                <span>7日榜</span>
                                <i class="${prefix}-iconfont icon-12rankright"></i>
                            </div>
                            <div class="${prefix}-wrap-list-content"></div>
                        </div>
                        <div class="${prefix}-wrap-list-total">
                            <div class="${prefix}-wrap-list-head">
                                <div class="${prefix}-progress">
                                    <span class="${prefix}-progress-bing"></span>
                                </div>
                                <i class="${prefix}-iconfont icon-12rankleft"></i>
                                <span>总榜</span>
                                <i class="${prefix}-iconfont icon-12rankright"></i>
                            </div>
                            <div class="${prefix}-wrap-list-content content-total"></div>
                        </div>
                        <div class="${prefix}-wrap-empty">
                            <div class="${prefix}-wrap-empty-image"></div>
                            <div class="${prefix}-wrap-empty-content">快来承包我吧~</div>
                        </div>
                        <div class="${prefix}-wrap-btn">
                            <i class="${prefix}-iconfont icon-32blingleft"></i>
                            <i class="${prefix}-iconfont icon-24blingright"></i>
                            <div class="${prefix}-wrap-btn-inner">
                                <div class="${prefix}-wrap-btn-inner-content">承包</div>
                            </div>
                        </div>
                    </div>
                </div>`;
    }

    private _globalEvents() {
        const that = this;
        const player = this.player;
        player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, function () {
            that.pause();
        });
        player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, function () {
            that.hide();
        });
    }

    init() {
        const that = this;
        const player = this.player;
        const template = player.template;
        const prefix = this.prefix + '-bangumipay-panel';
        this.container = $(this.TPL()).prependTo(this.player.template.playerWrap).hide();
        this.wrap = this.container.find('.' + prefix + '-wrap');
        this.head = this.container.find('.' + prefix + '-wrap-head-content');
        this.list7day = this.container.find('.' + prefix + '-wrap-list-7day .' + prefix + '-wrap-list-content');
        this.listTotal = this.container.find('.' + prefix + '-wrap-list-total .' + prefix + '-wrap-list-content');
        this.progress = this.container.find('.' + prefix + '-progress');
        this.btn = this.container.find('.' + prefix + '-wrap-btn');
        this.img = this.container.find('.' + prefix + '-blur-img');
        if (browser.version.edge) {
            this.img.addClass('edge-blur-hack');
        }
        this.globalFunction.getVideoinfo((data: ApiViewOutData) => {
            if (data && data['pic']) {
                this.img.css('background-image', 'url(' + data['pic'] + ')');
            } else {
                const coverImage = player.$body.find('.cover_image');
                if (coverImage.length) {
                    this.img.css('background-image', 'url(' + coverImage.attr('src') + ')');
                }
            }
        });

        player.bind(STATE.EVENT.VIDEO_RESIZE, function () {
            that.resize();
        });
        this.resize();
        this._bind();
    }

    private _bind() {
        const that = this;
        const player = this.player;
        this.btn.unbind('click').bind('click', function (e) {
            player.pause();
            if (that.player.window['objBPPlugin'] && typeof that.player.window['objBPPlugin']['open'] === 'function') {
                that.player.window['objBPPlugin']['open']();
            } else {
                // e.stopPropagation();
                // bp track
                player.$body.find('#btn_bangumi_buybuybuy').click();
            }
            if (player.state.mode === 2 || player.state.mode === 3) {
                player.controller.setMode(1);
            }
        });
    }

    empty() {
        this.wrap.addClass('bangumipay-empty');
    }

    private render() {
        const topArr = ['gold', 'silver', 'copper'];
        let nowWrap;
        let now7dayWrap;
        let i;
        let l;
        let c;
        const prefix = this.prefix + '-bangumipay-panel';
        this.wrap.removeClass('bangumipay-empty');
        this.list7day.empty();
        this.listTotal.empty();
        this.player.flushExtraParams();
        const isGecko = browser.version.gecko;
        const d = this.player.extraParams;
        if (
            !d ||
            !d.sponsorCount ||
            !d.sponsorTotalList ||
            !d.sponsorWeekList ||
            (!d.sponsorTotalList.length && !d.sponsorWeekList.length)
        ) {
            this.empty();
        } else {
            this.head.html(
                '感谢<span class="' +
                prefix +
                '-wrap-head-content-number">' +
                formatNum(d.sponsorCount!) +
                '</span>名小伙伴承包本番',
            );
            now7dayWrap = $('<div class="' + prefix + '-wrap-list-content-wrap"></div>').appendTo(this.list7day);
            for (i = 0; i < d.sponsorWeekList.length; i++) {
                l = d.sponsorWeekList[i];
                l.face = l.face ? l.face.replace('http://', '//') : '';
                c =
                    '<a class="' +
                    prefix +
                    '-wrap-list-content-data data-top data-top-' +
                    topArr[i] +
                    '" ' +
                    (l.uid ? 'href="//space.bilibili.com/' + l.uid + '/#!/index" target="_blank"' : '') +
                    '>' +
                    '<div class="' +
                    prefix +
                    '-wrap-list-content-data-head"><img src="' +
                    thumbnail(l.face, 66) +
                    '"/><div class="' +
                    prefix +
                    '-wrap-list-content-data-number">' +
                    (i + 1) +
                    '</div></div>' +
                    '<div class="' +
                    prefix +
                    '-wrap-list-content-data-name">' +
                    (l.uname || '匿名用户') +
                    '</div>' +
                    '<div class="' +
                    prefix +
                    '-wrap-list-content-data-msg"><div>' +
                    (l.message || '没有留言') +
                    '</div></div>' +
                    '</a>';
                now7dayWrap.append(c);
            }
            nowWrap = $('<div class="' + prefix + '-wrap-list-content-wrap"></div>').appendTo(this.listTotal);
            for (i = 0; i < d.sponsorTotalList.length; i++) {
                if (i >= 19) {
                    break;
                }
                l = d.sponsorTotalList[i];
                l.face = l.face ? l.face.replace('http://', '//') : '';

                if (i === 0) {
                    this.scene = 1;
                } else if (i === 3) {
                    nowWrap = $('<div class="' + prefix + '-wrap-list-content-wrap"></div>').appendTo(this.listTotal);
                    this.scene = 2;
                } else if (i === 11) {
                    nowWrap = $('<div class="' + prefix + '-wrap-list-content-wrap"></div>').appendTo(this.listTotal);
                    this.scene = 3;
                }
                if (i < 3) {
                    c =
                        '<a class="' +
                        prefix +
                        '-wrap-list-content-data data-top data-top-' +
                        topArr[i] +
                        '" ' +
                        (l.uid ? 'href="//space.bilibili.com/' + l.uid + '/#!/index" target="_blank"' : '') +
                        '>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-head"><img src="' +
                        thumbnail(l.face, 66) +
                        '"/><div class="' +
                        prefix +
                        '-wrap-list-content-data-number">' +
                        (i + 1) +
                        '</div></div>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-name">' +
                        (l.uname || '匿名用户') +
                        '</div>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-msg"><div>' +
                        (l.message || '没有留言') +
                        '</div></div>' +
                        '</a>';
                    nowWrap.append(c);
                } else {
                    nowWrap.append(
                        '<a class="' +
                        prefix +
                        '-wrap-list-content-data data-normal" ' +
                        (l.uid ? 'href="//space.bilibili.com/' + l.uid + '/#!/index" target="_blank"' : '') +
                        '>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-head"><i class="' +
                        this.prefix +
                        '-iconfont icon-48ellipsering' +
                        (isGecko ? ' moz-hook' : '') +
                        '"></i><img src="' +
                        thumbnail(l.face, 36) +
                        '"/><div class="' +
                        prefix +
                        '-wrap-list-content-data-number">' +
                        (i + 1) +
                        '</div></div>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-name">' +
                        (l.uname || '匿名用户') +
                        '</div>' +
                        '</a>',
                    );
                }
            }
            if (d.sponsorTotalList.length < 3) {
                for (i = 0; i < 3 - d.sponsorTotalList.length; i++) {
                    nowWrap = this.listTotal.find('.' + prefix + '-wrap-list-content-wrap');
                    c =
                        '<a class="' +
                        prefix +
                        '-wrap-list-content-data data-empty">' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-head"><i class="' +
                        this.prefix +
                        '-iconfont icon-36head"></i></div>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-msg"><div>虚位以待</div></div>' +
                        '</a>';
                    nowWrap.append(c);
                }
            }
            if (d.sponsorWeekList.length < 3) {
                for (i = 0; i < 3 - d.sponsorWeekList.length; i++) {
                    now7dayWrap = this.list7day.find('.' + prefix + '-wrap-list-content-wrap');
                    c =
                        '<a class="' +
                        prefix +
                        '-wrap-list-content-data data-empty">' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-head"><i class="' +
                        this.prefix +
                        '-iconfont icon-36head"></i></div>' +
                        '<div class="' +
                        prefix +
                        '-wrap-list-content-data-msg"><div>虚位以待</div></div>' +
                        '</a>';
                    now7dayWrap.append(c);
                }
            }
        }
    }

    resize() {
        const that = this;
        const player = this.player;
        const template = player.template;
        const size = Math.max(0.5, Math.min(template.playerWrap.width()! / 680, template.playerWrap.height()! / 440));
        const prefix = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
        for (let i = 0; i < prefix.length; i++) {
            this.wrap.css(prefix[i] + 'transform', 'scale(' + size + ')');
        }
    }

    show(nowtime: number, totaltime: number) {
        if (!this.inited) {
            this.render();
            this.inited = true;
        }
        if (this.container) {
            this.isShow = true;
            this.container.show();
            this._animate(totaltime - nowtime);
            this.player.template.playerArea.addClass(this.bangumiPayPanelFlag);
        }
    }

    private _animate(time: number, isanimate?: boolean) {
        if (this.scene === 0 || time === 0) {
            if (this.scene > 0) {
                this.listTotal.css('margin-left', (this.scene - 1) * -100 + '%');
            }
            this.progress.stop().css('width', '100%');
        } else {
            const that = this;
            const sceneTime = 15 / this.scene;
            const nowScene = Math.floor((15 - time) / sceneTime + 1);
            let restTime = time % sceneTime;
            restTime = restTime === 0 ? sceneTime : restTime;
            const nowPercent = ((sceneTime - restTime) / sceneTime) * 100;
            if (isanimate) {
                this.listTotal.stop().animate({ 'margin-left': (nowScene - 1) * -100 + '%' }, 500);
            } else {
                this.listTotal.css('margin-left', (nowScene - 1) * -100 + '%');
            }
            this.progress.css('width', nowPercent + '%');
            this.progress.stop().animate({ width: '100%' }, restTime * 1000, 'linear', function () {
                if (nowScene !== that.scene) {
                    that._animate((that.scene - nowScene) * sceneTime, true);
                }
            });
        }
    }

    hide() {
        if (this.container) {
            this.isShow = false;
            this.container.hide();
            this.player.template.playerArea.removeClass(this.bangumiPayPanelFlag);
        }
    }

    pause() {
        this.progress.stop();
    }

    get_user_number() {
        this.player.flushExtraParams();
        const d = this.player.extraParams;
        if (d && typeof d.sponsorCount !== 'undefined') {
            return d.sponsorCount;
        } else {
            return '-';
        }
    }

    destroy() {
        if (this.container) {
            this.container.remove();
        }
    }
}

export default BangumiPayPanel;
