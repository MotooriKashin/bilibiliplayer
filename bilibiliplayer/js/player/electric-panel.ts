import STATE from './state';
import Player from '../player';
import URLS from '../io/urls';
import { browser } from '@shared/utils';

interface IDataInterface {
    code: number;
    data: IPaydataInterface;
}

interface IPaydataInterface {
    count: number;
    display_num: number;
    list: IUserDataInterface[];
    pic: string;
    show: boolean;
    special_day: number;
    total_count: number;
}

interface IUserDataInterface {
    avatar: string;
    message: string;
    mid: number;
    msg_deleted: number;
    pay_mid: number;
    rank: number;
    trend_type: number;
    uname: string;
    vip_info: { vipType: number; vipDueMsec?: number; vipStatus: number };
}

class ElectricPanel {
    private player: Player;
    private prefix: string;
    private moduleName: string;
    private timer: number | null = null;
    private data: IDataInterface | null = null;
    private wrap!: JQuery;
    private jump!: JQuery;
    private link!: JQuery;
    private container!: JQuery | null;
    private number!: JQuery;
    private restTime!: JQuery;
    private contentMain!: JQuery;
    private contentSub!: JQuery;
    private blurImg!: JQuery;
    private btn!: JQuery;

    constructor(player: Player) {
        this.player = player;
        this.prefix = player.prefix;
        this.moduleName = this.prefix + '-electric-panel';
        this.init();
    }

    init() {
        const that = this;
        const player = this.player;
        $(player.template.container).on('video_media_before_seek' + player.config.namespace, function () {
            that.close();
        });
        this.player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            this.timer && clearTimeout(this.timer);
            this.container = null;
        });
    }

    TPL(): string {
        const prefix = this.prefix;
        const moduleName = this.moduleName;
        return (
            '<div class="' +
            moduleName +
            '">' +
            '<div class="' +
            moduleName +
            '-blur"><div class="' +
            moduleName +
            '-blur-img"></div></div>' +
            '<div class="' +
            moduleName +
            '-wrap">' +
            '<div class="' +
            moduleName +
            '-wrap-head"><div class="' +
            moduleName +
            '-wrap-head-cloth"><i class="' +
            prefix +
            '-iconfont icon-24verticaltriangle"></i><i class="' +
            prefix +
            '-iconfont icon-24verticaltriangle2"></i></div><span class="' +
            moduleName +
            '-wrap-head-content">充电鸣谢</span></div>' +
            '<div class="' +
            moduleName +
            '-wrap-list-head">共<span class="' +
            moduleName +
            '-number">-</span>位小伙伴给UP主提供了支持</div>' +
            '<div class="' +
            moduleName +
            '-wrap-list-total">' +
            '<div class="' +
            moduleName +
            '-wrap-list-wrap">' +
            '<div class="' +
            moduleName +
            '-wrap-list-wrap-cloth"><i class="' +
            prefix +
            '-iconfont icon-24triangle1"></i><i class="' +
            prefix +
            '-iconfont icon-24triangle2"></i><i class="' +
            prefix +
            '-iconfont icon-24triangle3"></i><i class="' +
            prefix +
            '-iconfont icon-24triangle4"></i><div class="' +
            moduleName +
            '-wrap-list-wrap-cloth-inner"></div></div>' +
            '<div class="' +
            moduleName +
            '-wrap-list-content content-main"></div><div class="' +
            moduleName +
            '-wrap-list-content content-sub"></div>' +
            '</div>' +
            '</div>' +
            '<div class="' +
            moduleName +
            '-wrap-btn"><div class="' +
            moduleName +
            '-wrap-btn-inner"><div class="' +
            moduleName +
            '-wrap-btn-inner-content"><i class="' +
            prefix +
            '-iconfont icon-24lightning"></i>支持TA</div></div></div>' +
            '</div>' +
            '<div class="' +
            moduleName +
            '-jump"><span class="' +
            moduleName +
            '-jump-time">-</span><span class="' +
            moduleName +
            '-jump-content">跳过</span></div>' +
            '<a class="' +
            moduleName +
            '-link" href="' +
            URLS.PAGE_HELP +
            '#充电计划?id=14cf474095a44dae9a497fba17fa55d7" target="_blank"><i class="' +
            prefix +
            '-iconfont icon-24question"></i>如何才能进入鸣谢名单?</a>' +
            '</div>'
        );
    }

    load(callback: Function) {
        if (this.player.window['elecPlugin'] && typeof this.player.window['elecPlugin']['getElecData'] === 'function') {
            this.data = this.player.window['elecPlugin']['getElecData']();
            this.render(callback);
        } else if (typeof callback === 'function') {
            callback();
        }
    }

    render(callback: Function) {
        const result = this.data;
        if (
            result &&
            result['code'] === 0 &&
            result['data'] &&
            result['data']['list'] &&
            result['data']['list'].length > 0
        ) {
            this.show(result['data'], callback);
        } else if (typeof callback === 'function') {
            callback();
        }
    }

    resize() {
        const that = this;
        const player = this.player;
        const template = player.template;
        const size = Math.max(0.5, Math.min(template.playerWrap.width()! / 680, template.playerWrap.height()! / 440));
        const prefixCSS = ['-webkit-', '-moz-', '-ms-', '-o-', ''];
        for (let i = 0; i < prefixCSS.length; i++) {
            this.wrap.css(prefixCSS[i] + 'transform', 'scale(' + size + ')');
        }
        this.jump.removeClass('bmiddle').removeClass('blarge');
        this.link.removeClass('bmiddle').removeClass('blarge');
        if (size > 1.8) {
            this.jump.addClass('blarge');
            this.link.addClass('blarge');
        } else if (size > 1.2) {
            this.jump.addClass('bmiddle');
            this.link.addClass('bmiddle');
        }
    }

    show(data: IPaydataInterface, callback: Function) {
        if (this.player.endingpanel && this.player.endingpanel.isVisible()) {
            return;
        }
        const that = this;
        const player = this.player;
        const moduleName = this.moduleName;
        const template = player.template;
        const topArr = ['gold', 'silver', 'copper'];
        if (!this.container) {
            this.container = $(this.TPL()).appendTo(template.playerWrap);
            this.wrap = this.container.find('.' + moduleName + '-wrap');
            this.number = this.container.find('.' + moduleName + '-number').html(data['total_count'] + '');
            this.restTime = this.container.find('.' + moduleName + '-jump-time').html('05');
            this.contentMain = this.container.find('.content-main').empty();
            this.contentSub = this.container.find('.content-sub').empty();
            this.blurImg = this.container
                .find('.' + moduleName + '-blur-img')
                .css('background-image', 'url(' + (data['pic'] ? data['pic'].replace('http://', '//') : '') + ')');
            if (browser.version.edge) {
                this.blurImg.addClass('edge-blur-hack');
            }
            this.btn = this.container.find('.' + moduleName + '-wrap-btn');
            this.jump = this.container.find('.' + moduleName + '-jump').click(function () {
                that.close(callback);
            });
            this.link = this.container.find('.' + moduleName + '-link');
            player.bind(STATE.EVENT.VIDEO_RESIZE, function () {
                that.resize();
            });
            this.bind();
            this.resize();

            for (let i = 0; i < data['list'].length; i++) {
                const l = data['list'][i];
                if (i >= 12) {
                    break;
                } else if (i < 3) {
                    this.contentMain.append(
                        '<a class="' +
                        moduleName +
                        '-wrap-list-content-data data-top data-top-' +
                        topArr[i] +
                        '" ' +
                        (l['pay_mid']
                            ? 'href="//space.bilibili.com/' + l['pay_mid'] + '/#!/index" target="_blank"'
                            : '') +
                        '>' +
                        '<div class="' +
                        moduleName +
                        '-wrap-list-content-data-head"><img src="' +
                        (l['avatar'] ? l['avatar'].replace('http://', '//') : '') +
                        '"/><div class="' +
                        moduleName +
                        '-wrap-list-content-data-number"></div></div>' +
                        '<div class="' +
                        moduleName +
                        '-wrap-list-content-data-name">' +
                        (l['uname'] || '匿名用户') +
                        '</div>' +
                        '</a>',
                    );
                } else {
                    this.contentSub.append(
                        '<a class="' +
                        moduleName +
                        '-wrap-list-content-data data-normal" ' +
                        (l['pay_mid']
                            ? 'href="//space.bilibili.com/' + l['pay_mid'] + '/#!/index" target="_blank"'
                            : '') +
                        '>' +
                        '<div class="' +
                        moduleName +
                        '-wrap-list-content-data-head"><img src="' +
                        (l['avatar'] ? l['avatar'].replace('http://', '//') : '') +
                        '"/></div>' +
                        '<div class="' +
                        moduleName +
                        '-wrap-list-content-data-name">' +
                        (l['uname'] || '匿名用户') +
                        '</div>' +
                        '</a>',
                    );
                }
            }

            this.container.show();
            this.showRestTime(5, callback);
        } else {
            this.resize();
            this.container.show();
            this.showRestTime(5, callback);
        }
    }

    private bind() {
        const that = this;
        this.btn.off('click').on('click', function (e) {
            if (that.player.window['elecPlugin'] && that.player.window['elecPlugin']['showModal']) {
                if (that.player.state.mode === STATE.UI_FULL || that.player.state.mode === STATE.UI_WEB_FULL) {
                    that.player.mode(STATE.UI_NORMAL);
                }
                that.player.window['elecPlugin']['showModal']({
                    from: 'player_details_end_thanks_page',
                });
            }
        });
    }

    private showRestTime(time: number, callback: Function) {
        const that = this;
        this.restTime.html('0' + time);
        this.timer = window.setTimeout(function () {
            if (time <= 0) {
                that.close(callback);
            } else {
                that.showRestTime(--time, callback);
            }
        }, 1000);
    }

    close(callback?: Function) {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        if (this.container) {
            this.container.hide();
        }
        if (typeof callback === 'function') {
            callback();
        }
    }

    destroy() { }
}

export default ElectricPanel;
