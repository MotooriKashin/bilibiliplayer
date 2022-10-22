import Controller from '../controller';
import Player from '../../player';
import svg from '../svg';
import STATE from '../state';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';

import '../../../css/dolby-button.less';

export interface IShow1080PDialogOptions {
    subtitle?: string;
    appId?: number;
    appSubId?: string;
    quality?: string;
}

// 杜比音效大会员引导弹窗提示文本
export const dolbyDialogTitle = '即可解锁杜比音效';

/**
 * @desc 杜比音效类型
 * - None   无（默认值）
 * - Normal 普通杜比
 * - Atmos  杜比全景声
 */
export enum DolbyEffectType {
    None = 0,
    Normal = 1,
    Atmos = 2,
}

const dolbyAudioEffectName = {
    [DolbyEffectType.None]: '',
    [DolbyEffectType.Normal]: '杜比音效',
    [DolbyEffectType.Atmos]: '杜比全景声',
};

export default class DolbyButton {
    protected player: Player;
    protected controller: Controller;
    protected container!: JQuery;
    protected activeToken: string;
    isChanging = false;
    constructor(controller: Controller) {
        this.controller = controller;
        this.player = controller.player;
        this.activeToken = this.player.prefix + '-dolby-active';
        this.init();
    }

    protected init() {
        this.createTemplate();
        this.addEventsListener();
    }

    protected createTemplate() {
        const prefix = this.controller.prefix;
        this.container = $(`
            <div class="${prefix}-video-btn-dolby" data-tooltip="4" data-position="top-center" data-change-mode="2">${svg.dolby}</div>
        `).prependTo(this.controller.volumeBar.volumeWrp);
        if (!!this.player.get('setting_config', 'dolbyAtmos')) {
            this.player.dolbyEffectOpend = true;
            this.setActive(true);
        }
        this.createTooltip(this.player.dolbyEffectOpend, false);
    }

    createTooltip(opened: boolean, inited = true) {
        const tooltipBtn = this.container[0];
        tooltipBtn.dataset.text = this.tooltipText(opened);
        if (!inited) {
            new Tooltip({
                top: -10,
                type: 'tip',
                target: $(tooltipBtn),
                name: 'controll-tooltip',
            });
        }
    }

    protected tooltipText(opened: boolean) {
        const open = opened ? '关闭' : '开启';
        const type = dolbyAudioEffectName[this.player.dolbyEffectType];
        const tip = `<span style="display:inline-flex;align-items:center;">${open}${type}<span style="display:inline-block;width:46px;margin-left:6px;">${svg.bigvip}</span></span>`;
        return tip;
    }

    protected addEventsListener() {
        this.container.on('click', () => {
            if (this.isChanging) return;
            this.changeDolby(!this.player.dolbyEffectOpend);
        });
    }

    protected changeDolby(open: boolean) {
        const player = this.player;
        const status = player.user.status();
        // 杜比音效/清晰度切换过程中，不允许再次切换杜比音效
        if (this.isChanging || this.controller?.quality?.changing) return;

        // 未登陆用户，先进行登录操作
        if (!status.login) {
            this.requestLogin();
            return;
        }

        // 非大会员，弹出大会员购买引导弹窗
        if (Number(status.vip_type) === 0 || Number(status.vip_status) !== 1) {
            player.pause();
            if (player.state.mode > STATE.UI_WIDE) {
                player.mode(STATE.UI_WIDE);
            }
            if (typeof player.globalFunction?.WINDOW_AGENT?.show1080p === 'function') {
                const options: IShow1080PDialogOptions = {
                    subtitle: dolbyDialogTitle,
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
        const tip = [dolbyAudioEffectName[player.dolbyEffectType], open ? '开启' : '关闭'];
        player.toast.addTopHinter(`${tip[0]}${tip[1]}中，请稍后...`);
        player.reloadMedia.changeSvipVideo(player.videoQuality, open ? 1 : 0, (success: any) => {
            if (success) {
                this.isChanging = false;
                this.setActive(open);
                player.openDolbyEffect(open);
                player.toast.addTopHinter(`${tip[0]}已${tip[1]}`);
                if (!player.initialized) {
                    player.loadingpanel.complete(3, true);
                }
                player.set('setting_config', 'dolbyAtmos', open);
            } else {
                this.isChanging = false;
                this.setActive(!open);
                this.createTooltip(!open);
                player.openDolbyEffect(!open);
                player.set('setting_config', 'dolbyAtmos', !open);
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
                this.changeDolby(!this.player.dolbyEffectOpend);
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
