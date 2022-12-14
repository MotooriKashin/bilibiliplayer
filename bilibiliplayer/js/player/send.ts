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
            pool: 0, // 0.??????????????? 1.???????????????
            mode: 1, // 1.???????????? 4.???????????? 5.????????????
            color: 16777215, // ??????FFF 0xFFFFFF = 16777215
            rnd: this.player.pid, // ?????????
            updm: false, // ????????????up???????????????
        };

        this.STATUS_TIPS = {};
        this.STATUS_TIPS[
            STATE.SEND_STATUS_UNLOGIN
        ] = `?????????????????????????????????<a href="javascript:void(0);" class="${this.prefix}-quick-login">??????</a>???<a href="${URLS.PAGE_REGISTER}" target="_blank">??????</a>`;
        this.STATUS_TIPS[
            STATE.SEND_STATUS_LEVEL_LOW
        ] = `??????????????????Lv1???????????????????????????????????? <a href="//www.bilibili.com/v/newbie/entry?re_src=16" class="${this.prefix}-start-answer" target="_blank">???????????????</a>`;
        this.STATUS_TIPS[
            STATE.SEND_STATUS_MORAL_LOW
        ] = `?????????????????????60,?????????????????? <a href="${URLS.PAGE_HELP}#j" target="_blank">???????????????????????? ></a>`;
        this.STATUS_TIPS[STATE.SEND_STATUS_DISABLED_WORDS] = '????????????????????????????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_LIMITED] = '??????????????????????????????????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_NORMAL] = '???????????????????????????????????????~';
        this.STATUS_TIPS[
            STATE.SEND_STATUS_TYPING
        ] = `<a href="${URLS.PAGE_HELP}#????????????" target="_blank">???????????? ></a>`;
        this.STATUS_TIPS[STATE.SEND_STATUS_BEYOND_WORDS] = '';
        this.STATUS_TIPS[STATE.SEND_STATUS_SENT] = '???????????????????????????????????????~';
        this.STATUS_TIPS[STATE.SEND_STATUS_CLOSED] = '????????????????????????????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_FREQUENTLY] = '???????????????????????????,???????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_CANNOT_BUY] = '??????????????????????????????????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_BLOCKING] = '????????????????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_BLOCKED] =
            '?????????????????????????????????<a href="//www.bilibili.com/blackroom/releaseexame.html" target="_blank">????????????</a>???????????????';
        this.STATUS_TIPS[STATE.SEND_STATUS_UPDATE] = '?????????????????????';
        this.STATUS_TIPS[
            STATE.SEND_ANSWER_STATUS_IN
        ] = `????????????????????????<a href="//www.bilibili.com/v/newbie/entry?re_src=16"  class="${this.prefix}-in-answer" target="_blank">????????????</a>`;
        this.STATUS_TIPS[STATE.SEND_STATUS_UP_DM] = '??????????????????????????????';

        this.SEND_ERROR_OBJ = {
            '0': '??????????????????????????????',
            '-1': '??????????????????????????????',
            '-2': '??????????????????',
            '-3': '???????????????',
            '-4': '??????????????????',
            '-5': 'UP????????????',
            '-6': '???????????????',
            '-7': '???????????????/????????????',
            '-8': '?????????????????????',
            '-9': '??????????????????????????????????????????????????????100?????????',
            '-101': '?????????????????????????????????????????????',
            '-102': '????????????????????????????????????????????????',
            '-108': '??????????????????????????????????????????????????????????????????',
            '-400': '????????????????????????????????????????????????',
            '-403': '??????????????????????????????????????????',
            '-404': '??????????????????????????????????????????????????????',
            '-634': '???????????????????????????',
            '-635': '??????????????????????????????????????????',
            '-636': '?????????????????????????????????',
            '-637': '?????????????????????????????????',
            '-638': '??????????????????????????????????????????',
            '-639': '?????????????????????????????????????????????????????????',
            '-640': '??????????????????60????????????????????????',
            '-641': '????????????????????????100???',
            '-651': '????????????????????????????????????????????????',
            '-653': '????????????????????????????????????????????????',
            '-654': '????????????????????????????????????????????????',
            '-655': '????????????????????????????????????????????????',
            '-656': '?????????????????????Lv0???????????????????????????20?????????',
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
	<i name="danmuku_choose" class="${prefix}-iconfont ${prefix}-iconfont-danmaku icon-24danmusetting" data-tooltip="1" data-position="top-left" data-text="????????????"></i>
</div>
<div name="danmuku_color" class="${prefix}-video-btn ${prefix}-video-btn-color">
	<i name="danmuku_color" class="${prefix}-iconfont ${prefix}-iconfont-color icon-24color" data-tooltip="1" data-position="top-center" data-text="????????????"></i>
</div>
<div class="${prefix}-video-inputbar disabled">
	<div class="${prefix}-video-danmaku-wrap"></div>
	<input class="${prefix}-video-danmaku-input" placeholder="???????????????????????????????????????~" />
	<div class="${prefix}-video-hint">
		<a href="${URLS.PAGE_HELP}#????????????" target="_blank">???????????? ></a>
	</div>
	<div class="${prefix}-video-btn-send">?????? ></div>
</div>`;
    }
    private _init() {
        const that = this;
        const container = this.container;
        const player = this.player;
        const prefix = this.prefix;

        container.html(this._TPL());

        this.template = {
            danmakubtn: container.find(`.${prefix}-video-btn-danmaku`), // ??????????????????
            colorbtn: container.find(`.${prefix}-video-btn-color`), // ??????????????????
            inputbar: container.find(`.${prefix}-video-inputbar`), // ????????????????????????
            wrap: container.find(`.${prefix}-video-danmaku-wrap`), // ????????????????????????
            // ?????????????????????????????????
            infoWatching: player.template.watchingNumber, // ????????????
            danmakuInfo: player.template.danmakuNumber,
            danmakuNumber: player.template.danmakuNow, // ????????????
            // danmakuRoot: container.find(`.${prefix}-video-danmaku-root`), // ?????????????????????????????????
            // danmakuSwitch: container.find(`.${prefix}-video-danmaku-switch`), // ?????????????????????????????????
            // danmakuSetting: container.find(`.${prefix}-video-danmaku-setting`), // ?????????????????????????????????
            sendbtn: container.find(`.${prefix}-video-btn-send`), // ??????????????????
            input: container.find(`.${prefix}-video-danmaku-input`), // ????????????????????????
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
     * ??????????????????????????????
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
     * ??????????????????????????????
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
            this.template.danmakuInfo.attr('data-text', `????????????????????????${this.dmAllNum}???`);
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
                placeholder = '?????????????????????';
            } else {
                placeholder = this.STATUS_TIPS[STATE.SEND_STATUS_UP_DM];
            }
        } else {
            if (W < 638) {
                placeholder = '????????????????????????';
            } else {
                placeholder = this.STATUS_TIPS[STATE.SEND_STATUS_NORMAL];
            }
        }
        this.template.input.attr('placeholder', placeholder);

        // ??????700??????container??????class
        this.container[W < 700 ? 'addClass' : 'removeClass'](`${this.prefix}-normal-mode`);
    }

    private _removeDisable($el: JQuery) {
        $el.removeClass('disabled');
    }
    // private danmakuToggle(isShow: boolean, dmClosed?: boolean) {
    //     this.player.state.danmaku = isShow;
    //     this.player.danmaku && this.player.danmaku.visible(isShow);
    //     if (dmClosed) {
    //         this.danmakuStatus = '???????????????';
    //     } else {
    //         this.danmakuStatus = isShow ? '????????????' : '????????????';
    //     }
    //     const tool = this.template.danmakuSwitch.find('.choose_danmaku');
    //     if (tool.length > 0) {
    //         tool.text(this.danmakuStatus);
    //     }
    // }
    private _setCoolDown(coolDown: number) {
        const that = this;

        this.template.sendbtn.html(' ' + coolDown / 1000 + ' ??? ');

        if (coolDown > 0) {
            this.coolDownTimer = window.setTimeout(() => {
                this._setCoolDown(coolDown - 1000);
            }, 1000);
        } else {
            delete (<any>this).coolDownTimer;
            this.template.sendbtn.html('??????');
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
    // ????????????????????????
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
                // ????????????????????? ,????????????
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
                        // that.sendbtn['option']('label', ' ' + (this.COOL_DOWN / 1000) + ' ??? ');
                        // this.INTERVAL = setInterval(function () {
                        //     that.sendbtn['option']('label', ' ' + (that.COOL_DOWN / 1000 - i++) + ' ??? ');
                        // }, 1000);
                        //
                        // setTimeout(function () {
                        //     that.sendbtn['option']('label', '?????? >');
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
                // ?????????????????????
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
                type: 1, // ???????????????1?????????
                oid: player.config.cid, // ??????id
                msg: message, // ????????????
                aid: player.config.aid, // ??????id
                bvid: player.config.bvid,
                progress: Math.ceil(player.currentTime()! * 1000), // ???????????????????????????????????????????????????
                color: this.config['color'], // ????????????
                fontsize: this.config['fontsize'], // ????????????
                pool: this.config['pool'], // ?????????,0:???????????????1??????????????????2???????????????
                mode: this.config['mode'], // ???????????????1,4,5,6,7,8,9
                rnd: this.config['rnd'], // ????????????????????????
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
            // up?????????
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
                        // ??????????????????
                        const action = parseAction(result.data.action);
                        if (action.vote) {
                            this.player.popup.outVote(Number(action.vote));
                        } else if (Object.keys(action).length) {
                            // ????????????????????????????????????allPlugins???
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
                            text: result['message'] || '????????????',
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
                        message = '???????????????????????????';
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
                        text: '????????????????????????????????????',
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
            fontsize: 25, // ????????????
            pool: 1, // ?????????,0:???????????????1??????????????????2???????????????
            mode: 1, // ???????????????1,4,5,6,7,8,9
        };

        const text = message.replace(/^#(combo|up|link|actor)#/gi, '');
        if (userStatus.isadmin && flag.combo) {
            if (player.allPlugins!.combo) {
                return this.ioFail('??????????????????????????????????????????');
            } else if (player.duration()! - player.currentTime()! < 10) {
                return this.ioFail('???????????????????????????????????????');
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
            progress: Math.ceil(player.currentTime()! * 1000), // ???????????????????????????????????????????????????
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
                    this.ioFail(result?.message || '????????????');
                }
                this.setStatus(STATE.SEND_STATUS_SENDING);
                this.setStatus(STATE.SEND_STATUS_SENT);
            },
            error: (error: any) => {
                this.ioFail(error?.message || '????????????');
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
    // ??????up?????????
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
