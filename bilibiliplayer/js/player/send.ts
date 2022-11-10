import STATE from './state';
import ModeSelection from './mode-selection';
import URLS from '../io/urls';
import Player from '../player';
import ApiSendModify, { ApiSendModifyInData, ApiSendModifyOutData } from '../io/api-dm-post';
import ApiCMDPost, { ApiCMDInData, ApiCMDOutData } from '../io/api-dm-cmd-post';
import { ICommandDm } from './proto/proto-buffer';
import svg from './svg';
import { parseAction } from './proto/load-pb';
import ApiDmSetting, { ApiDmSettingInData } from '../io/api-dm-setting';
import ColorPicker from '@jsc/player-auxiliary/js/panel/color-picker';
import { Button } from '@jsc/player-auxiliary/js/ui/button';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import { SelfEgg } from '../plugins/selfegg';
import { Snow } from '../plugins/snow';
import { parseUrl } from '@shared/utils';

interface ISendConfig {
    fontsize?: number;
    pool?: number;
    mode?: number;
    color?: number;
    rnd?: number;
    updm?: boolean;
    [key: string]: any;
}
class Send {
    template: any;
    private player: Player;
    private prefix: string;
    private container: JQuery;
    private config: ISendConfig;
    private STATUS_TIPS: any;
    private SEND_ERROR_OBJ: any;
    private status: any;
    private SEND_DISABLED: boolean;
    private MAX_CHARS: number;
    private COOL_DOWN: number;
    private disabled!: boolean;
    private sendbtn!: Button;
    danmakuModeSelection!: ModeSelection;
    private danmakuStatus!: string;
    private danmakuIsUpdate: boolean;
    private danmakuColorPicker!: ColorPicker;
    private SENDING_DISABELD!: boolean;
    private coolDownTimer!: number;
    private userHead!: JQuery;
    snow?: Snow;
    selfEgg?: SelfEgg;
    // danmakuSwitch!: Switch;
    dmAllNum = 0;
    upImgUrl = '';
    dmSetIO = {
        all: 0,
        err: 0,
    };

    constructor(player: Player) {
        this.player = player;
        this.prefix = player.prefix;
        this.container = player.template.sendbar;
        this.config = {
            fontsize: 25,
            pool: 0, // 0.普通弹幕池 1.字幕弹幕池
            mode: 1, // 1.滚动弹幕 4.底部弹幕 5.顶部弹幕
            color: 16777215, // 颜色FFF 0xFFFFFF = 16777215
            rnd: this.player.pid, // 随机值
            updm: false, // 当前用户up主身份标识
        };

        this.STATUS_TIPS = {};
        this.STATUS_TIPS[
            STATE.SEND_STATUS_UNLOGIN
        ] = `请先<a href="javascript:void(0);" class="${this.prefix}-quick-login">登录</a>或<a href="${URLS.PAGE_REGISTER}" target="_blank">注册</a>`;
        this.STATUS_TIPS[
            STATE.SEND_STATUS_LEVEL_LOW
        ] = `请先答题<a href="//www.bilibili.com/v/newbie/entry?re_src=16" class="${this.prefix}-start-answer" target="_blank">转正></a>`;
        this.STATUS_TIPS[
            STATE.SEND_STATUS_MORAL_LOW
        ] = `<a href="${URLS.PAGE_HELP}#j" target="_blank">节操值</a><60，不能发弹幕`;
        this.STATUS_TIPS[STATE.SEND_STATUS_DISABLED_WORDS] = '您不能在本视频中发送弹幕';
        this.STATUS_TIPS[STATE.SEND_STATUS_LIMITED] = '已被禁言，无法发弹幕';
        this.STATUS_TIPS[STATE.SEND_STATUS_NORMAL] = '发个友善的弹幕见证当下';
        this.STATUS_TIPS[
            STATE.SEND_STATUS_TYPING
        ] = `<a href="${URLS.PAGE_HELP}#弹幕相关" target="_blank">弹幕礼仪 ></a>`;
        this.STATUS_TIPS[STATE.SEND_STATUS_BEYOND_WORDS] = '';
        this.STATUS_TIPS[STATE.SEND_STATUS_SENT] = '发个友善的弹幕见证当下';
        this.STATUS_TIPS[STATE.SEND_STATUS_CLOSED] = '本视频弹幕功能已关闭';
        this.STATUS_TIPS[STATE.SEND_STATUS_FREQUENTLY] = '发弹幕太频繁，稍后重试';
        this.STATUS_TIPS[STATE.SEND_STATUS_CANNOT_BUY] = '课程调整中，暂不支持发送弹幕';
        this.STATUS_TIPS[STATE.SEND_STATUS_BLOCKING] = '该账号处于封禁中';
        this.STATUS_TIPS[STATE.SEND_STATUS_BLOCKED] =
            '帐号封禁中，<a href="//www.bilibili.com/blackroom/releaseexame.html" target="_blank">答题解禁</a>';
        this.STATUS_TIPS[STATE.SEND_STATUS_UPDATE] = '弹幕系统升级中';
        this.STATUS_TIPS[
            STATE.SEND_ANSWER_STATUS_IN
        ] = `离转正还差一点点<a href="//www.bilibili.com/v/newbie/entry?re_src=16"  class="${this.prefix}-in-answer" target="_blank">继续答题</a>`;
        this.STATUS_TIPS[STATE.SEND_STATUS_UP_DM] = '发个弹幕和观众互动吧';

        this.SEND_ERROR_OBJ = {
            '0': '系统错误，发送失败。',
            '-1': '选择的弹幕模式错误。',
            '-2': '用户被禁止。',
            '-3': '系统禁止。',
            '-4': '投稿不存在。',
            '-5': 'UP主禁止。',
            '-6': '权限有误。',
            '-7': '视频未审核/未发布。',
            '-8': '禁止游客弹幕。',
            '-9': '禁止滚动弹幕、顶端弹幕、底端弹幕超过100字符。',
            '-101': '您的登录已经失效，请重新登录。',
            '-102': '您需要激活账号后才可以发送弹幕。',
            '-108': '您暂时失去了发送弹幕的权利，请与管理员联系。',
            '-400': '登录信息验证失败，请刷新后重试。',
            '-403': '您不能发送包含换行符的弹幕。',
            '-404': '您不能向一个不存在的弹幕池发送弹幕。',
            '-634': '禁止发送空白弹幕。',
            '-635': '禁止向未审核的视频发送弹幕。',
            '-636': '您发送弹幕的频率过快。',
            '-637': '弹幕包含被禁止的内容。',
            '-638': '您已经被禁言，不能发送弹幕。',
            '-639': '您的权限不足，不能发送这种样式的弹幕。',
            '-640': '您的节操低于60，不能发送弹幕。',
            '-641': '您的弹幕长度大于100。',
            '-651': '您的等级不足，不能发送彩色弹幕。',
            '-653': '您的等级不足，不能发送高级弹幕。',
            '-654': '您的等级不足，不能发送底端弹幕。',
            '-655': '您的等级不足，不能发送顶端弹幕。',
            '-656': '您的会员等级为Lv0，弹幕长度不能超过20字符。',
        };

        this.status = null;
        this.danmakuIsUpdate = false;
        this.SEND_DISABLED = false;
        this.MAX_CHARS = 0;
        this.COOL_DOWN = 100000;

        this._init();
    }
    private _TPL() {
        const prefix = this.prefix;
        let ogv = '';
        if (this.player.config.seasonId) {
            ogv = `${prefix}-ogv-hide`;
        }
        return `
        <div name="danmuku_choose" class="${prefix}-video-btn ${prefix}-video-btn-danmaku">
	<i name="danmuku_choose" class="${prefix}-iconfont ${prefix}-iconfont-danmaku icon-24danmusetting" data-tooltip="1" data-position="top-left" data-text="弹幕选择"></i>
</div>
<div name="danmuku_color" class="${prefix}-video-btn ${prefix}-video-btn-color">
	<i name="danmuku_color" class="${prefix}-iconfont ${prefix}-iconfont-color icon-24color" data-tooltip="1" data-position="top-center" data-text="弹幕颜色"></i>
</div>
<div class="${prefix}-video-inputbar disabled">
	<div class="${prefix}-video-danmaku-wrap"></div>
	<input class="${prefix}-video-danmaku-input" placeholder="你可以在这里输入弹幕吐槽哦~" />
	<div class="${prefix}-video-hint">
		<a href="${URLS.PAGE_HELP}#弹幕相关" target="_blank">弹幕礼仪 ></a>
	</div>
	<div class="${prefix}-video-btn-send">发送 ></div>
</div>`;
    }
    private _init() {
        const that = this;
        const container = this.container;
        const player = this.player;
        const prefix = this.prefix;

        container.html(this._TPL());

        this.template = {
            danmakubtn: container.find(`.${prefix}-video-btn-danmaku`), // 弹幕样式选择
            colorbtn: container.find(`.${prefix}-video-btn-color`), // 弹幕颜色选择
            inputbar: container.find(`.${prefix}-video-inputbar`), // 播放器弹幕发送条
            wrap: container.find(`.${prefix}-video-danmaku-wrap`), // 播放器弹幕发送条
            // 以下三样还原回右侧面板
            infoWatching: player.template.watchingNumber, // 观看人数
            danmakuInfo: player.template.danmakuNumber,
            danmakuNumber: player.template.danmakuNow, // 弹幕数量
            // danmakuRoot: container.find(`.${prefix}-video-danmaku-root`), // 弹幕发送设置相关包裹层
            // danmakuSwitch: container.find(`.${prefix}-video-danmaku-switch`), // 弹幕发送设置相关包裹层
            // danmakuSetting: container.find(`.${prefix}-video-danmaku-setting`), // 弹幕发送设置相关包裹层
            sendbtn: container.find(`.${prefix}-video-btn-send`), // 弹幕发送按钮
            input: container.find(`.${prefix}-video-danmaku-input`), // 播放器弹幕发送条
            hint: container.find(`.${prefix}-video-hint`),
            login: container.find(`.${prefix}-quick-login`),
        };

        player.userLoadedCallback(data => {
            this.template.infoWatching.text(data.online_count);
        });
        this.sendbtn = new Button(this.template.sendbtn[0], {
            // type: 'blue',
            disabled: true,
        });
        // this.template.wrap.on('click', (e: any) => {
        //     if ($(e.target).hasClass(`${this.prefix}-start-answer`)) {
        //         this.player && this.player.track && this.player.track.trackInfoPush('answer_begin', 'from:player');
        //     } else if ($(e.target).hasClass(`${this.prefix}-in-answer`)) {
        //         this.player && this.player.track && this.player.track.trackInfoPush('answer_goon', 'from:player');
        //     }
        // });
        this.sendbtn.on('click', () => {
            that.send(that.template.input.val().replace(/^\s+/, '').replace(/\s+$/, ''));
        });
        if (!player.config.ad) {
            this.danmakuModeSelection = new ModeSelection(player, this.template.danmakubtn, {
                triggerBtn: this.template.danmakubtn,
                callback: (callback: Function) => {
                    player.userLoadedCallback(status => {
                        callback(
                            status.login,
                            status.danmaku?.pool,
                            status.danmaku?.fontsize,
                            status.danmaku?.mode,
                            status.level,
                        );
                    });
                },
                onChange: function (config: any) {
                    that.setConfig(config);
                },
            });

            this.danmakuColorPicker = new ColorPicker(this.player, this.template.colorbtn, {
                triggerBtn: this.template.colorbtn,
                callback: function (callback: Function) {
                    player.userLoadedCallback(status => {
                        callback(status.danmaku?.color);
                    });
                },
                onChange: function (config: any) {
                    that.setConfig(config);
                },
            });
        }

        // this.setStatus(STATE.SEND_STATUS_UNLOGIN, true);

        this.player.userLoadedCallback(status => {
            this.setStatus.call(that, status, true);
        });
        // this.danmakuToggle(player.state.danmaku);
        // this.danmakuSwitch = new Switch(this.template.danmakuSwitch[0], {
        //     value: player.state.danmaku,
        // });

        // this.danmakuSwitch.on('change', (e: any) => {
        //     this.danmakuToggle(e.value);
        //     if (e.manual) {
        //         this.player.track?.trackInfoPush(e.value ? 'ctlbar_danmuku_on' : 'ctlbar_danmuku_close');
        //         this.postSetting({
        //             dm_switch: e.value,
        //         });
        //     }
        // });
        this._bindEvents();
        this.resize();
    }
    // emitDmSwitch(value: boolean) {
    //     this.danmakuSwitch.value(value);
    //     this.danmakuToggle(value);
    // }
    // dmSwitchEnable(enable: boolean) {
    //     if (enable) {
    //         this.danmakuSwitch.enable();
    //     } else {
    //         this.danmakuToggle(false, true);
    //         this.danmakuSwitch.disable();
    //     }
    // }
    postSetting(setting: ApiDmSettingInData) {
        if (Object.keys(setting).length && this.player.user.status().login) {
            this.dmSetIO.all++;
            setting.ts = Date.now();
            new ApiDmSetting(<ApiDmSettingInData>setting).getData({
                error: () => {
                    this.dmSetIO.err++;
                },
            });
        }
    }

    /**
     * 显示发送弹幕飘落彩蛋
     */
    showSnow(img: string) {
        let snowArea = this.player.template.playerWrap.find(`.${this.prefix}-snow-drop`);
        if (!snowArea?.length) {
            snowArea = $(`<div class="${this.prefix}-snow-drop"></div>`);
            this.player.template.playerWrap.append(snowArea);
        }
        this.snow?.clear();
        this.snow = new Snow({
            container: snowArea[0],
            img,
        });
        this.snow.draw();
    }

    /**
     * 显示发送弹幕飘落彩蛋
     */
    showEgg(egg: string) {
        // egg = 'uat-i0.hdslb.com/bfs/feedback/d77c04a81123f5941acb70c9577b212433d7b76f.zip?template_type=2';
        // egg = 'pre-s1.hdslb.com/bfs/static/pgc/nano/asserts/icon-sponsor-rank-1.svg?template_type=1';
        const obj = parseUrl(egg);

        if (!obj.url) return;

        if (+obj.template_type === 2) {
            let snowArea = this.player.template.playerWrap.find(`.${this.prefix}-self-egg`);
            if (!snowArea?.length) {
                snowArea = $(`<div class="${this.prefix}-self-egg"></div>`);
                this.player.template.playerWrap.append(snowArea);
            }

            if (!this.selfEgg) {
                this.selfEgg = new SelfEgg(snowArea[0], obj.url);
            }
            this.selfEgg?.clear();
            this.selfEgg.show(obj.url);
            return;
        }
        if (+obj.template_type === 1) {
            this.showSnow('//' + obj.url);
        }
    }

    private _bindEvents() {
        const that = this;

        this.container.on('click', `.${this.prefix}-quick-login`, () => {
            this.player.quicklogin.load();
        });

        // update input change
        this.template.input
            .on('input', () => {
                !this.SEND_DISABLED && this.focusOnInput.call(this);
            })
            .on('keydown', (e: JQuery.Event) => {
                if (e.keyCode === 13) {
                    if (this.template.input.val()) {
                        if (!this.SEND_DISABLED) {
                            this.template.sendbtn.trigger('click');
                        }
                    } else {
                        this.template.input.blur();
                        if (this.player.isFullScreen()) {
                            this.player.template.csIn(false);
                        }
                    }
                } else if (e.keyCode === 27) {
                    this.template.input.blur();
                }
                e.stopPropagation();
            })
            .on('keyup', function () {
                return false;
            })
            .on('focus', () => {
                if (this.player.isFullScreen()) {
                    this.player.template.csIn(true);
                }
                this.player.template.clearTime();
            });

        // this.template.danmakuSwitch.on('mouseenter', () => {
        //     if (that.template.danmakuSwitch.find('.choose_danmaku').length < 1) {
        //         $(`<span class="choose_danmaku">${that.danmakuStatus}</span>`).appendTo(that.template.danmakuSwitch);
        //     }
        // });

        this.player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            this.resize();
        });
        this.player.bind(STATE.EVENT.PLAYER_RELOAD, () => {
            this.unsetCoolDown();
        });
        this.player.bind(STATE.EVENT.PLAYER_SEND, (e: any, obj: any) => {
            this.updateInfo(obj);
        });
    }

    private updateInfo(obj: any) {
        if (typeof obj.dmAllNum !== 'undefined') {

            this.dmAllNum = +obj.dmAllNum;
            obj.dm = 0;
        }
        if (typeof obj.dm !== 'undefined') {
            this.dmAllNum += obj.dm;
            this.template.danmakuNumber.text(this.dmAllNum);
            this.template.danmakuInfo.attr('data-text', `当前弹幕池弹幕数${this.dmAllNum}条`);
        }
        if (typeof obj.person !== 'undefined') {
            this.template.infoWatching.text(obj.person);
        }
    }
    private _setDisable($el: JQuery) {
        $el.addClass('disabled');
    }
    private resize() {
        const W = this.container.width()!;
        let placeholder = '';

        if (this.status === STATE.SEND_STATUS_UP_DM) {
            if (W < 638) {
                placeholder = '发个弹幕互动吧';
            } else {
                placeholder = this.STATUS_TIPS[STATE.SEND_STATUS_UP_DM];
            }
        } else {
            if (W < 638) {
                placeholder = '发个弹幕见证当下';
            } else {
                placeholder = this.STATUS_TIPS[STATE.SEND_STATUS_NORMAL];
            }
        }
        this.template.input.attr('placeholder', placeholder);

        // 大于700时给container加个class
        this.container[W < 700 ? 'addClass' : 'removeClass'](`${this.prefix}-normal-mode`);
    }

    private _removeDisable($el: JQuery) {
        $el.removeClass('disabled');
    }
    // private danmakuToggle(isShow: boolean, dmClosed?: boolean) {
    //     this.player.state.danmaku = isShow;
    //     this.player.danmaku && this.player.danmaku.visible(isShow);
    //     if (dmClosed) {
    //         this.danmakuStatus = '弹幕已关闭';
    //     } else {
    //         this.danmakuStatus = isShow ? '关闭弹幕' : '开启弹幕';
    //     }
    //     const tool = this.template.danmakuSwitch.find('.choose_danmaku');
    //     if (tool.length > 0) {
    //         tool.text(this.danmakuStatus);
    //     }
    // }
    private _setCoolDown(coolDown: number) {
        const that = this;

        this.template.sendbtn.html(' ' + coolDown / 1000 + ' 秒 ');

        if (coolDown > 0) {
            this.coolDownTimer = window.setTimeout(() => {
                this._setCoolDown(coolDown - 1000);
            }, 1000);
        } else {
            delete (<any>this).coolDownTimer;
            this.template.sendbtn.html('发送');
            this.setStatus(STATE.SEND_STATUS_NORMAL);
        }
    }

    private unsetCoolDown() {
        if (this.coolDownTimer) {
            clearTimeout(this.coolDownTimer);
            this._setCoolDown(0);
        }
    }

    focusOnInput() {
        if (!this.status) {
            return true;
        }
        const val = this.template.input.val();
        const len = val.length;

        if (len > this.MAX_CHARS) {
            this.setStatus(STATE.SEND_STATUS_BEYOND_WORDS, false, len);
        } else if (len === 0) {
            if (this.config.updm) {
                this.setStatus(STATE.SEND_STATUS_UP_DM);
                return;
            }
            this.setStatus(STATE.SEND_STATUS_NORMAL);
        } else {
            this.setStatus(STATE.SEND_STATUS_TYPING);
        }
    }
    // 开启关闭弹幕功能
    updateStatus(state: number, text: string) {
        this.status = null;
        switch (state) {
            case 0:
                if (this.config.updm) {
                    this.setStatus(STATE.SEND_STATUS_UP_DM);
                    this.resize();
                    return;
                }
                this.setStatus(this.player.user.status());
                break;
            case 1:
                if (text) {
                    this.STATUS_TIPS[STATE.SEND_STATUS_CLOSED] = text;
                }
                this.setStatus(STATE.SEND_STATUS_CLOSED);
                break;
            case 2:
                this.danmakuIsUpdate = true;
                if (text) {
                    this.STATUS_TIPS[STATE.SEND_STATUS_UPDATE] = text;
                }
                this.setStatus(STATE.SEND_STATUS_UPDATE);
                break;
            default:
                break;
        }
    }
    setStatus(status: any, isInit?: boolean, value?: any) {
        if (this.status === STATE.SEND_STATUS_CLOSED) {
            return;
        }
        const template = this.template;
        const TIPS = this.STATUS_TIPS;
        const that = this;

        if (typeof status === 'object' && status.danmaku) {
            if (status.danmaku.input instanceof Array && status.danmaku.input.length) {
                this.MAX_CHARS = status.danmaku.input[0];
                this.COOL_DOWN = status.danmaku.input[1];
            }
            status = status.danmaku.initStatus;
        }
        if (this.danmakuIsUpdate) {
            status = STATE.SEND_STATUS_UPDATE;
        }
        if (this.status !== status) {
            // fix sign out from other page and  send danmaku on current page
            if (this.status === STATE.SEND_STATUS_TYPING && status === STATE.SEND_STATUS_NORMAL) {
                isInit = false;
                status = STATE.SEND_STATUS_TYPING;
            }

            this.status = status;
            template.inputbar.removeClass('unlogin');

            if (!isInit) {
                // 非初始化状态时 ,状态更改
                that._removeDisable(template.inputbar);
                this.template.danmakuInfo.show();

                switch (status) {
                    case STATE.SEND_STATUS_NORMAL:
                    case STATE.SEND_STATUS_UP_DM:
                        this.SEND_DISABLED = false;
                        template.wrap.hide();
                        template.input.show();
                        template.hint.html(TIPS[STATE.SEND_STATUS_TYPING]);
                        // this.template.danmakubtn.show();
                        this.sendbtn.enable();
                        this.focusOnInput.call(this);
                        this.template.inputbar.addClass('focus');
                        break;
                    case STATE.SEND_STATUS_TYPING:
                        template.wrap.hide();
                        template.hint.html(TIPS[status]);
                        // this.template.danmakubtn.show();
                        this.sendbtn.enable();
                        // this.sendbtn.enable();
                        break;
                    case STATE.SEND_STATUS_BEYOND_WORDS:
                        template.wrap.hide();
                        template.hint.html(`<span class="beyond-words">${value} / ${this.MAX_CHARS}</span>`);
                        this._removeDisable(template.inputbar);
                        setTimeout(() => {
                            this.sendbtn.disable();
                        });
                        break;
                    case STATE.SEND_STATUS_SENDING:
                        template.input.val('').blur();
                        this.sendbtn.disable();
                        this.SEND_DISABLED = true;
                        break;
                    case STATE.SEND_STATUS_SENT:
                    case STATE.SEND_STATUS_FREQUENTLY:
                        if (status === STATE.SEND_STATUS_FREQUENTLY) {
                            this.sendbtn.disable();
                            template.wrap.show().html(TIPS[status]);
                            template.hint.html(TIPS[STATE.SEND_STATUS_TYPING]);
                            template.input.hide();
                        } else {
                            // template.input.focus();
                        }

                        // var i = 1;
                        // that.sendbtn['option']('label', ' ' + (this.COOL_DOWN / 1000) + ' 秒 ');
                        // this.INTERVAL = setInterval(function () {
                        //     that.sendbtn['option']('label', ' ' + (that.COOL_DOWN / 1000 - i++) + ' 秒 ');
                        // }, 1000);
                        //
                        // setTimeout(function () {
                        //     that.sendbtn['option']('label', '发送 >');
                        //     clearInterval(that.INTERVAL);
                        //     delete that.INTERVAL;
                        //     that.setStatus(STATE.SEND_STATUS_NORMAL);
                        //     template.input.focus();
                        // }, that.COOL_DOWN);

                        that._setCoolDown(this.COOL_DOWN);
                        break;
                    case STATE.SEND_STATUS_UPDATE:
                    case STATE.SEND_STATUS_CLOSED:
                        template.wrap.show().html(TIPS[status]);
                        // this.template.danmakubtn.hide();
                        template.input.hide();
                        this.sendbtn.disable();

                        this.danamkuClosed();
                        break;
                    default:
                        break;
                }
            } else {
                // 初始化状态更改
                // this.template.danmakubtn.hide();
                this.sendbtn.disable();
                // template.input.hide();
                template.input.hide();
                template.wrap.show()!.html(TIPS[status]);
                template.hint.show();

                switch (status) {
                    case STATE.SEND_STATUS_UNLOGIN:
                        this._removeDisable(template.inputbar);
                        this.template.inputbar.addClass('unlogin');
                        this.sendbtn.disable();
                        break;
                    case STATE.SEND_STATUS_CANNOT_BUY:
                    case STATE.SEND_STATUS_DISABLED_WORDS:
                    case STATE.SEND_STATUS_LIMITED:
                        this._setDisable(template.inputbar);
                        break;

                    case STATE.SEND_STATUS_LEVEL_LOW:
                    case STATE.SEND_STATUS_MORAL_LOW:
                    case STATE.SEND_ANSWER_STATUS_IN:
                        this._setDisable(template.inputbar);
                        template.hint.hide();
                        break;

                    case STATE.SEND_STATUS_NORMAL:
                    case STATE.SEND_STATUS_UP_DM:
                        this.SEND_DISABLED = false;
                        template.input.show().val('');
                        template.wrap.hide();
                        this._removeDisable(template.inputbar);
                        // this.template.danmakubtn.show();
                        this.sendbtn.enable();
                        this.template.inputbar.addClass('focus');
                        break;
                    case STATE.SEND_STATUS_BLOCKING:
                        this._setDisable(template.inputbar);
                        break;
                    case STATE.SEND_STATUS_BLOCKED:
                        this._setDisable(template.inputbar);
                        break;
                    case STATE.SEND_STATUS_UPDATE:
                    case STATE.SEND_STATUS_CLOSED:
                        this.danamkuClosed();
                        break;
                    default:
                        break;
                }
            }
        } else if (this.status === status && this.status === STATE.SEND_STATUS_BEYOND_WORDS) {
            template.hint.html(`<span class="beyond-words">${value} / ${this.MAX_CHARS}</span>`);
        }
        // Assuming sendBar has been enabled when first function invoked
        if (!performance.timing.perfPETPEnd) {
            performance.timing.perfPETPEnd = Date.now();
        }
    }
    send(message?: string) {
        const player = this.player;
        const that = this;

        message = message!.replace(/^#delete#/i, '');
        if (message && player.config.cid && this.status === STATE.SEND_STATUS_TYPING && !this.SENDING_DISABELD) {
            const sendTime = new Date();
            const data: any = {
                type: 1, // 主题类型，1：视频
                oid: player.config.cid, // 主题id
                msg: message, // 弹幕内容
                aid: player.config.aid, // 稿件id
                bvid: player.config.bvid,
                progress: Math.ceil(player.currentTime()! * 1000), // 弹幕位于视频中的时间点（单位毫秒）
                color: this.config['color'], // 弹幕颜色
                fontsize: this.config['fontsize'], // 字体大小
                pool: this.config['pool'], // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
                mode: this.config['mode'], // 弹幕模式：1,4,5,6,7,8,9
                rnd: this.config['rnd'], // 发送时带的随机数
                plat: 1, // 0:Unknow,1:Web,2:Android,3:IPhone,4:WPM,5:IPAD,6:PadHD,7:WpPC
            };

            if (player.config.bvid) {
                delete data.aid;
            }
            const userStatus = player.user.status();
            const danmaku = {
                stime: player.currentTime()! + 0.01,
                mode: data['mode'],
                size: data['fontsize'],
                color: data['color'],
                date: Date.parse(String(sendTime)) / 1000,
                rnd: data['rnd'],
                class: data['pool'],
                dmid: '',
                text: data['msg'],
                border: true,
                uid: userStatus.hash_id,
                mid: userStatus.uid,
                uname: userStatus.name ? userStatus.name.split(' ')[0] : '',
                picture: '',
                headImg: '',
            };

            if (player.videoDisableTime > 0) {
                that.setStatus(STATE.SEND_STATUS_SENDING);
                that.setStatus(STATE.SEND_STATUS_SENT);
                player.danmaku.add(danmaku);
                return true;
            }
            // up主弹幕
            if (this.config.updm && !this.config['pool']) {
                message = message.replace(/^#up#/i, '');
                message = `#up#${message}`;
            }
            if (/^#(up|actor)#/i.test(message)) {
                this.postCMD(message, danmaku);
                return;
            }
            this.player.danmaku.resetSendDmid();

            new ApiSendModify(<ApiSendModifyInData>data).getData({
                success: (result: ApiSendModifyOutData) => {
                    if (result && Number(result.code) === 36711) {
                        this.setStatus(STATE.SEND_STATUS_CLOSED);
                        this.player.danmaku?.sendDanmakuState(1, this.STATUS_TIPS[STATE.SEND_STATUS_UPDATE]);
                        return;
                    }
                    if (result && Number(result.code) === 0 && result.data.dmid_str) {
                        // result.data.action = 'upEgg:1?animation=1&delay=30&delays=%5B30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%2C30%5D&resource=http%3A%2F%2Fuat-i0.hdslb.com%2Fbfs%2Fdm%2Fgif_frames%2Fgif_frames_1630305332.zip&resource_type=2&text_img='
                        // 互动弹幕判断
                        const action = parseAction(result.data.action);
                        if (action.vote) {
                            this.player.popup.outVote(Number(action.vote));
                        } else if (Object.keys(action).length) {
                            // 除投票外其他互动弹幕都在allPlugins里
                            this.player.allPlugins?.outAction(action);
                        }
                        danmaku.dmid = result.data.dmid_str;
                        danmaku.stime = player.currentTime()! + 0.01;

                        that.setStatus(STATE.SEND_STATUS_SENDING);
                        that.setStatus(STATE.SEND_STATUS_SENT);
                        const target = this.dmActions(action);
                        for (const key in target) {
                            danmaku[<'size'>key] = target[key];
                        }
                        if (target.animation) {
                            const type = target.animation.type;
                            switch (type) {
                                case 1:
                                case 2:
                                    this.player.allPlugins?.startBoom([danmaku]);
                                    return;
                                default:
                                    break;
                            }
                        }

                        if (action.upEgg) {
                            // add upEggList
                            this.player.allPlugins?.updataUpEgg([
                                {
                                    stime: danmaku.stime,
                                    upEgg: parseUrl(action.upEgg),
                                },
                            ]);
                        }
                        // if (action.selfEgg) {
                        //     this.showSnow(`//${action.selfEgg}`);
                        // }
                        if (action.selfActEgg) {
                            this.showEgg(action.selfActEgg);
                        }

                        this.player.allPlugins?.comboAdd(danmaku);
                        player.danmaku.add(danmaku, action.hide);

                        this.player.danmaku.dmidList = <any>null;
                    } else if (result && Number(result.code) === -8) {
                        new Tooltip({
                            name: 'send',
                            target: player.template.playerWrap,
                            position: 'center-center',
                            text: result['message'] || '请先登录',
                            padding: [15, 20, 15, 20],
                        });

                        that.player.quicklogin.load(function () {
                            that.template.sendbtn.trigger('click');
                        });
                    } else if (
                        result &&
                        (Number(result.code) === 61001 || Number(result.code === 61002)) &&
                        typeof player.window['showRealNameBind'] === 'function'
                    ) {
                        if (that.player.state.mode === STATE.UI_FULL || that.player.state.mode === STATE.UI_WEB_FULL) {
                            that.player.mode(STATE.UI_NORMAL);
                        }
                        player.window['showRealNameBind'](Number(result.code), result['message']);
                    } else {
                        message = '发送失败，未知错误';
                        if (result) {
                            if (result['message']) {
                                message = result['message'];
                            } else if (that.SEND_ERROR_OBJ[result.code]) {
                                message = that.SEND_ERROR_OBJ[result.code];
                            }
                        }
                        new Tooltip({
                            name: 'send',
                            target: player.template.playerWrap,
                            position: 'center-center',
                            text: message,
                            padding: [15, 20, 15, 20],
                        });
                    }
                },
                error: function (error: JQuery.jqXHR<any>) {
                    that.setStatus(STATE.SEND_STATUS_SENT);

                    new Tooltip({
                        name: 'send',
                        target: that.template.input,
                        position: 'bottom-left',
                        text: '发送失败，无法连接服务器',
                    });
                },
            });
        } else if (this.status === STATE.SEND_STATUS_NORMAL) {
            that.template.input.focus();
        }
    }

    postCMD(message: string, danmaku: any) {
        const player = this.player;
        const userStatus = this.player.user.status();
        const flag = {
            up: /^#up#/i.test(message),
            link: /^#link#/i.test(message),
            combo: /^#combo#/i.test(message),
            actor: /^#actor#/i.test(message),
        };
        danmaku = {
            ...danmaku,
            color: 16777215,
            fontsize: 25, // 字体大小
            pool: 1, // 弹幕池,0:普通弹幕，1：字幕弹幕，2：特殊弹幕
            mode: 1, // 弹幕模式：1,4,5,6,7,8,9
        };

        const text = message.replace(/^#(combo|up|link|actor)#/gi, '');
        if (userStatus.isadmin && flag.combo) {
            if (player.allPlugins!.combo) {
                return this.ioFail('一个视频只能发送一个该指令哟');
            } else if (player.duration()! - player.currentTime()! < 10) {
                return this.ioFail('剩余时长不足十秒不可发送哟');
            }
        }
        const info: any = {
            msg: text,
        };
        if (flag.link) {
            info.bvid = $.trim(text).split(' ')[0];
            info.msg = $.trim(text.replace(info.bvid, ''));
        }
        danmaku.text = info.msg;
        const data: ApiCMDInData = {
            type: 4,
            aid: player.config.aid,
            cid: player.config.cid,
            progress: Math.ceil(player.currentTime()! * 1000), // 弹幕位于视频中的时间点（单位毫秒）
            plat: 1,
            data: JSON.stringify(info),
        };
        if (flag.up) {
            data.type = 1;
        } else if (flag.link) {
            data.type = 2;
        } else if (flag.actor) {
            data.type = 3;
        }

        new ApiCMDPost(<ApiCMDInData>data).getData({
            success: (result: ApiCMDOutData) => {
                if (Number(result?.code) === 0) {
                    try {
                        this.player.globalFunction.getUpImg().then((url: string) => {
                            danmaku.dmid = result.data.idStr;
                            danmaku.headImg = url;
                            const extra = JSON.parse(result.data.extra);
                            if (flag.up) {
                                danmaku.flag = -2;
                                danmaku.headImg = '';
                                player.danmaku.add(danmaku);
                            } else if (flag.actor) {
                                danmaku.flag = extra.user.officialType;
                                player.danmaku.add(danmaku);
                            }
                        });
                    } catch (error) { }
                } else {
                    this.ioFail(result?.message || '发送失败');
                }
                this.setStatus(STATE.SEND_STATUS_SENDING);
                this.setStatus(STATE.SEND_STATUS_SENT);
            },
            error: (error: any) => {
                this.ioFail(error?.message || '发送失败');
                this.setStatus(STATE.SEND_STATUS_SENDING);
                this.setStatus(STATE.SEND_STATUS_SENT);
            },
        });
    }
    parseCombo(dm: ICommandDm, extra: any, url: string) {
        try {
            return {
                stime: dm.progress / 1000 || 0,
                dmid: dm.idStr || '',
                text: dm.content,
                duration: extra.duration / 1000 || 10,
                count: extra.comboCount || 1,
                step: [
                    Number(extra.animationCountOne) || 50,
                    Number(extra.animationCountTwo) || 500,
                    Number(extra.animationCountThree) || 2000,
                ],
                img: url,
                mid: dm.mid,
            };
        } catch (error) {
            console.warn(error);
        }
        return false;
    }
    private ioFail(text: string) {
        new Tooltip({
            text,
            name: 'send',
            target: this.player.template.playerWrap,
            position: 'center-center',
            padding: [15, 20, 15, 20],
        });
    }
    private danamkuClosed() {
        this.template.danmakuInfo.hide();
    }
    // 生成up主头像
    private upImg() {
        if (this.config.updm) {
            if (this.userHead) {
                this.userHead.show();
                this.setStatus(STATE.SEND_STATUS_UP_DM, true);
                this.resize();
                return;
            }
        } else {
            if (this.userHead) {
                this.userHead.hide();
                this.setStatus(this.player.user.status(), true);
                this.resize();
            }
            return;
        }
        this.player.globalFunction.getUpImg().then((url: string) => {
            this.upImgUrl = url;
            this.userHead = $(
                `<div class ="${this.prefix}-up-head"><img class="${this.prefix}-up-head-img" src="${url}">`,
            );
            this.template.danmakubtn.after(this.userHead);
            this.setStatus(STATE.SEND_STATUS_UP_DM, true);
            this.resize();
        });
    }
    setConfig(config: ISendConfig) {
        for (const key in config) {
            if (this.config.hasOwnProperty(key)) {
                this.config[key] = config[key];
            }
        }
        if (typeof config.updm === 'boolean') {
            this.upImg();
        }
    }
    dmActions(action: any) {
        const target: any = {};
        if (action.picture) {
            const picture = parseUrl(action.picture);
            if (picture.url) {
                target.picture = `//${picture.url}`;
            }
            if (picture.scale) {
                target.scale = Math.max(0.1, +picture.scale);
            } else {
                target.scale = 1;
            }
        } else if (action.icon) {
            target.head = `//${action.icon}`;
        } else if (action.headicon || action.tailicon) {
            const head = parseUrl(action.headicon);
            const tail = parseUrl(action.tailicon);
            if (head.url) {
                target.head = '//' + head.url;
            }
            if (tail.url) {
                target.tail = '//' + tail.url;
            }
            target.unlike = head.like !== 'true' || tail.like !== 'true';
            target.unhigh = head.highlyPopular !== 'true' || tail.highlyPopular !== 'true';
        }
        if (action.animation) {
            const animate = parseUrl(action.animation);
            target.animation = {
                type: +animate.url,
                zip: '//' + animate.zip0,
                head: '//' + animate.png0,
                center: '//' + animate.png1,
                tail: '//' + animate.png2,
                color: animate.font_color,
                shadow: animate.font_stroke_color,
            };
        }
        return target;
    }
}

export default Send;
