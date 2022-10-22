import Player from "../../player";
import Controller from "../controller";
import STATE from "../state";
import svg from "../svg";
import { IShow1080PDialogOptions } from "./dolby-button";
import Tooltip from "@jsc/player-auxiliary/js/plugins/tooltip";


import '../../../css/hires-button.less';

export class HiResButton {
    protected flacDescription = "Hi-Res无损音质";
    protected player: Player;
    protected activeToken: string;
    protected container!: JQuery<HTMLElement>;

    isChanging = false;
    constructor(protected controller: Controller) {
        this.player = controller.player;
        this.activeToken = this.player.prefix + "-flac-active";
        this.init();
    }
    protected init() {
        this.createTemplate();
        this.addEventsListener()
    }
    protected createTemplate() {
        const prefix = this.controller.prefix;
        this.container = $(`
        <div class="${prefix}-video-btn-flac" data-tooltip="4" data-position="top-center" data-change-mode="2">${svg.hires}</div>`)
            .prependTo(this.controller.volumeBar.volumeWrp);
        this.player.dolbyEffectType && this.container.addClass('flac-up');
        this.player.userLoadedCallback(state => {
            if (!!this.player.get('setting_config', 'audioHiRes')) {
                this.player.flacEffectOpened = true;
                this.setActive(true);
            }
            this.createTooltip(this.player.flacEffectOpened, !1)
        });
    }
    createTooltip(opened: boolean, inited = true) {
        const tooltipBtn = this.container[0];
        const text = this.player.user.status().without_vip ? "限免中" : "大会员";
        tooltipBtn.dataset.text = `<span style="display:inline-flex;align-items:center;">${opened ? "关闭" : "开启"}${this.flacDescription}<span style="display:inline-block;width:46px;margin-left:6px;height: 16px;line-height: 16px;background-color: #FB7299;text-align: center;border-radius: 31px;">${text}</span></span>`;
        if (!inited) {
            new Tooltip({
                top: -10,
                type: 'tip',
                target: $(tooltipBtn),
                name: 'ctrl-flac-tooltip',
            });
        }
    }
    protected addEventsListener() {
        this.container.on('click', () => {
            if (this.isChanging) return;
            this.changeFlac(!this.player.flacEffectOpened);
        });
    }
    protected changeFlac(open: boolean) {
        const player = this.player;
        const status = player.user.status();
        // HiRes切换过程中，不允许再次切换杜比音效
        if (this.isChanging || this.controller?.quality?.changing) return;

        // 未登陆用户，先进行登录操作
        // if (!status.login) {
        //     this.requestLogin();
        //     return;
        // }

        // 非限免、非UP主本人或非大会员用户，弹出大会员购买引导弹窗
        if (!status.without_vip && (Number(status.vip_type) === 0 || Number(status.vip_status) !== 1)) {
            player.pause();
            if (player.state.mode > STATE.UI_WIDE) {
                player.mode(STATE.UI_WIDE);
            }
            if (typeof player.globalFunction?.WINDOW_AGENT?.show1080p === 'function') {
                const options: IShow1080PDialogOptions = {
                    subtitle: "立即解锁" + this.flacDescription,
                    appId: 10,
                    appSubId: 'ugcdubi',
                    quality: 'dubi',
                };
                player.globalFunction.WINDOW_AGENT.show1080p(options);
            }
            return;
        }
        this.isChanging = true;
        this.setActive(open);
        this.createTooltip(open);
        const tip = [this.flacDescription, open ? '开启' : '关闭'];
        player.toast.addTopHinter(`${tip[0]}${tip[1]}中，请稍后...`);
        player.reloadMedia.changeSvipVideo(player.videoQuality, open ? 2 : 0, (success: any) => {
            if (success) {
                this.isChanging = false;
                this.setActive(open);
                player.flacEffectOpened = open;
                player.toast.addTopHinter(`${tip[0]}已${tip[1]}`);
                if (!player.initialized) {
                    player.loadingpanel.complete(3, true);
                }
                player.set('setting_config', 'audioHiRes', open);
            } else {
                this.isChanging = false;
                this.setActive(!open);
                this.createTooltip(!open);
                player.flacEffectOpened = !open;
                player.set('setting_config', 'audioHiRes', !open);
                player.toast.addTopHinter(`${tip[0]}${tip[1]}失败`);
                if (!player.initialized) {
                    player.loadingpanel.complete(3, true);
                }
            }
        });
    }

    // 唤起登录弹窗
    protected requestLogin() {
        const status = this.player.user.status();
        if (!status.login) {
            this.player.pause();
            if (this.player.state.mode > STATE.UI_WIDE) {
                this.player.mode(STATE.UI_WIDE);
            }
            this.player.quicklogin.load(() => {
                this.changeFlac(!this.player.flacEffectOpened);
            });
        }
    }

    // UI样式更改
    setActive(value: boolean) {
        if (value) {
            this.container.addClass(this.activeToken);
        } else {
            this.container.removeClass(this.activeToken);
        }
    }
}