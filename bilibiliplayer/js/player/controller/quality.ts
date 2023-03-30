import STATE from '../state';
import Controller from '../controller';
import Player from '../../player';
import { gtQualityNeedLogin } from '../../config';
import { IUserStatusInterface } from '../user';
import { ContentType } from '@jsc/namespace';
import { Selectmenu } from '@jsc/player-auxiliary/js/ui/selectmenu';
import { IEvent } from '@jsc/player-auxiliary/js/ui/base';
import { browser } from '@shared/utils';

class Quality {
    private prefix: string;
    private player: Player;
    private controller: Controller;
    private qualityList: any[] = [];
    private container!: JQuery;
    private qualityMenu!: JQuery;
    private panelHideTimer!: number | null;
    private panelShowTimer!: number | null;
    private pMapping!: { [key: string]: string; };
    private qualityResult: any;
    private nowQuality!: number;
    qualitymenu!: Selectmenu;
    changeSuccessFromToast!: boolean;
    changing?: boolean;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
        this.globalEvents();
    }
    private init() {
        const prefix = this.prefix;
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.qualityMenu = this.container.find(`.${prefix}-video-quality-menu`).html('自动');
    }

    private globalEvents() {
        // this.player.bind(STATE.EVENT.VIDEO_PANEL_HOVER, () => {
        //     this.clearPanelTimer();
        // });
        this.player.userLoadedCallback(info => {
            this.updateStyle(info);
            this.updateQuality(this.qualityResult, this.nowQuality);
        });
    }
    private updateStyle(info: IUserStatusInterface) {
        if (info.login) {
            this.container.removeClass(`${this.prefix}-video-btn-logout`);
        } else {
            this.container.addClass(`${this.prefix}-video-btn-logout`);
        }
        if (
            (this.player.extraParams && !this.player.extraParams.canPlay1080) ||
            (!this.player.extraParams &&
                (Number(info.vip_type) === 0 || Number(info.vip_status) !== 1) &&
                !this.isUpWatch())
        ) {
            this.container.removeClass(`${this.prefix}-video-is-vip`);
        } else {
            this.container.addClass(`${this.prefix}-video-is-vip`);
        }
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-btn ${prefix}-video-btn-quality disabled">
                <div class="${prefix}-video-quality-menu" aria-label="清晰度"></div>
            </div>
        `;
    }
    updateQuality(result: any, nowQuality?: number) {
        if (!result) {
            return;
        }
        const qualityList = result.acceptQuality;
        const bp = result.bp;
        const hasPaid = result.hasPaid;
        if (!qualityList) {
            return false;
        }
        if (qualityList.indexOf(0) === -1) {
            qualityList.push(0);
        }
        const that = this;
        const player = this.player;
        const prefix = this.prefix;
        const status = player.user.status();
        const qualityMap: { [key: string]: string } = { 0: `自动<span class="bilibili-player-auto-hidden"></span>` };
        const pMapping: { [key: string]: string } = (this.pMapping = {});
        let flag = '';
        const hiddenQuality = [];
        if (Array.isArray(qualityList)) {
            const acceptDescription = result.supportFormats;
            for (let i = 0; i < qualityList.length; i++) {
                if (qualityList[i] !== 0) {
                    flag = '';
                    if (that.player.isSvipQuality(qualityList[i]) && !status.without_vip) {
                        if (that.player.config.lightWeight) {
                            if (
                                (this.player.extraParams && !this.player.extraParams.canPlay1080) ||
                                (!this.player.extraParams &&
                                    (Number(status.vip_type) === 0 || Number(status.vip_status) !== 1) &&
                                    !this.isUpWatch())
                            ) {
                                hiddenQuality.push(i); //轻量播放器移除播放器中大会员相关逻辑
                            }
                            flag = '';
                        } else {
                            if (this.player.config.type === ContentType.Pugv) {
                                flag = `<span class="${this.prefix}-needlogin">登录即享</span>`;
                            } else {
                                flag = `<span class="${this.prefix}-bigvip">大会员</span>`;
                            }
                        }
                    } else if (!player.dashPlayer && qualityList[i] > gtQualityNeedLogin) {
                        flag = `<span class="${this.prefix}-needlogin">登录即享</span>`;
                    }
                    const currentDescription =
                        (acceptDescription && acceptDescription[i]?.new_description) ||
                        STATE.QUALITY_NAME[<0>qualityList[i]] ||
                        '';

                    const [p = '', t = ''] = currentDescription.split(' ');
                    pMapping[qualityList[i]] = p || t;
                    if (p) {
                        qualityMap[
                            qualityList[i]
                        ] = `<span class="${prefix}-video-quality-text">${t} </span><span>${p}</span>${flag}`;
                    } else {
                        qualityMap[
                            qualityList[i]
                        ] = `<span class=\"${prefix}-video-quality-text\"></span><span>${t}</span>${flag}`;
                    }
                }
            }
        }
        if (player.videoRealQuality) {
            if (nowQuality === 0) {
                qualityMap[0] = `自动<span class="bilibili-player-auto-hidden">(${pMapping[player.videoRealQuality]
                    })</span>`;
                // if (result.mediaDataSource && result.mediaDataSource.type === 'dash') {
                //     qualityMap[0] = '自动';
                // } else {
                //     qualityMap[0] = `自动<span class="bilibili-player-auto-hidden">(${pMapping[player.videoRealQuality]})</span>`;
                // }
            } else if (player.videoRealQuality !== nowQuality) {
                nowQuality = player.videoQuality = player.videoRealQuality;
            }
        }
        this.changing = false;
        const menu = [];
        for (let i = 0; i < qualityList.length; i++) {
            if (qualityList[i] === 125 && !window['DashPlayer']?.isHEVCHDR10TypeSupported?.()) continue;
            const item: any = {
                name: qualityMap[qualityList[i]],
                value: qualityList[i] + '',
                className: hiddenQuality.indexOf(i) > -1 ? `${prefix}-quality-bigvip` : '',
            };
            menu.push(item);
        }

        if (menu.length > 1) {
            that.container.removeClass('disabled');
            if (that.qualitymenu) {
                that.qualitymenu.destroy();
                that.container.html(`<div class="${prefix}-video-quality-menu"></div>`);
                that.qualityMenu = that.container.find(`.${prefix}-video-quality-menu`).html('自动');
            }
            this.qualitymenu = new Selectmenu(this.qualityMenu, {
                items: menu,
                disMCS: true,

                change: (e: IEvent) => {
                    const value = +e.value;
                    const status = player.user.status();
                    // 杜比音效切换过程中，不允许进行清晰度切换
                    if (this.controller?.dolbyButton?.isChanging) {
                        this.qualitymenu.value(player.videoQuality);
                        return false;
                    }
                    if (player.config.type === ContentType.Pugv) {
                        if (this.changing) {
                            return false;
                        } else if (Number(value) === Number(player.videoQuality)) {
                            return false;
                        } else {
                            this.container.addClass('disabled');
                        }
                        if (!status.login) {
                            this.qualityNeedLoginHandler();
                            return false;
                        }
                    } else {
                        if (this.changing) {
                            return false;
                        } else if (Number(value) === Number(player.videoQuality)) {
                            return false;
                        } else if (player.isSvipQuality(+value) && !status.without_vip) {
                            if (!status.login) {
                                this.qualityNeedLoginHandler();
                                return false;
                            } else if (
                                (this.player.extraParams && !this.player.extraParams.canPlay1080) ||
                                (!this.player.extraParams &&
                                    (Number(status.vip_type) === 0 || Number(status.vip_status) !== 1) &&
                                    !this.isUpWatch())
                            ) {
                                player.pause();
                                if (player.state.mode > STATE.UI_WIDE) {
                                    player.mode(STATE.UI_WIDE);
                                }
                                typeof player.window['show1080p'] === 'function' && player.window['show1080p']();
                                this.qualitymenu.value(player.videoQuality);
                                return false;
                            } else {
                                this.container.addClass('disabled');
                            }
                        } else if (!status.login && !player.dashPlayer && +value > gtQualityNeedLogin) {
                            // DashPlayer默认提供了至高`value=80`的选择，何妨允许切换！
                            this.qualityNeedLoginHandler();
                            return false;
                        } else {
                            this.container.addClass('disabled');
                        }
                    }
                    if (value === 126 && this.controller.dolbyButton) {
                        // 切换杜比视界时，杜比音效UI开启
                        this.controller.dolbyButton.isChanging = true;
                        player.set('setting_config', 'dolbyAtmos', true);
                        this.controller.dolbyButton.setActive(true);
                        this.controller.dolbyButton.createTooltip(true);
                    }
                    player.checkCurrentQuality(value);
                    player.set('setting_config', 'defquality', value);
                    this.changing = true;
                    player.toast.addTopHinter(`正在为您切换到${qualityMap[value]},请稍候...`);
                    this.player.reloadMedia.quality(Number(value), (success: any) => {
                        if (success) {
                            this.changing = false;
                            nowQuality = value;
                            player.toast.addTopHinter(`已经切换至${qualityMap[value]}画质`);
                            if (!e.manual) {
                                this.changeSuccessFromToast = true;
                            }
                            player.videoData.videoQuality = Number(value);
                            this.container.removeClass('disabled');
                            if (!player.initialized) {
                                player.loadingpanel.complete(3, true);
                            }

                            if (player.dashPlayer) {
                                if (Number(value) === 0) {
                                    this.setAutoQualityText(player.videoRealQuality);
                                } else {
                                    this.setAutoQualityText(0);
                                }
                            }
                            // 切换杜比视界成功时，强制设置杜比音效为开启状态
                            if (value === 126 && this.controller.dolbyButton) {
                                this.controller.dolbyButton.isChanging = false;
                                this.controller.dolbyButton.setActive(!!success);
                                player.openDolbyEffect(true);
                            }
                        } else {
                            this.changing = false;
                            this.qualitymenu.value(nowQuality);
                            player.toast.addTopHinter('切换失败');
                            this.qualitymenu.value(player.videoQuality);
                            this.container.removeClass('disabled');
                            if (!player.initialized) {
                                player.loadingpanel.complete(3, false);
                            }

                            // 切换杜比视界失败时：若当前杜比音效为开启状态，则保持开启；若当前音效为关闭状态，则重置为关闭（因为之前有强制开启音效UI）
                            if (value === 126 && this.controller.dolbyButton) {
                                this.controller.dolbyButton.isChanging = false;
                                if (!player.dolbyEffectOpend) {
                                    this.controller.dolbyButton.setActive(false);
                                    this.player.set('setting_config', 'dolbyAtmos', false);
                                    this.controller.dolbyButton.createTooltip(false);
                                    player.openDolbyEffect(false);
                                }
                            }
                        }
                    });
                }
            });
            this.qualitymenu.value(player.videoQuality, false);

            // safari hack
            if (browser.version.iOS && !that.qualityMenu.find('iframe').length) {
                that.qualityMenu
                    .find('ul')
                    .prepend(
                        '<iframe class="bpui-selectmenu-list-iframe" scrolling="no" border="0" frameborder="no" framespacing="0"></iframe>',
                    );
            }
        } else {
            that.container.addClass('disabled');
            that.container.find(`.${prefix}-video-quality-menu`).html(qualityMap[nowQuality!]);
        }

        if (this.qualityList.length > 0 && qualityList.length > this.qualityList.length && !this.player.interactive) {
            if (!that.container.find('.hint-point-red').length) {
                const redPoint = $('<div class="hint-point-red"></div>').appendTo(that.container);
                that.container.bind(`mouseover${player.config.namespace}hint`, function () {
                    $(this).unbind(`mouseover${player.config.namespace}hint`);
                    redPoint.remove();
                });
            }
        }

        this.qualityList = qualityList;
        this.qualityResult = result;
        this.nowQuality = nowQuality!;
    }

    private qualityNeedLoginHandler() {
        const player = this.player;
        const status = player.user.status();
        const qualitymenu = this.qualitymenu;
        if (!status.login) {
            player.pause();
            if (player.state.mode > STATE.UI_WIDE) {
                player.mode(STATE.UI_WIDE);
            }
            player.quicklogin.load(function () {
                player.window.location.href = player.window.location.href;
            });
            qualitymenu.value(player.videoQuality);
        }
    }

    private isUpWatch() {
        const agent = window['PlayerAgent'];
        const getAuthorInfo = (agent && agent['getAuthorInfo']) || this.player.window['getAuthorInfo'];
        if (typeof getAuthorInfo === 'function') {
            const info = getAuthorInfo();
            return info && info['mid'] && +info['mid'] === +this.player.user.status().uid!;
        } else {
            return false;
        }
    }

    addVideoMessage(message: string, time?: number) {
        this.player.toast.addTopHinter(message);
    }

    svipQualityPayPopup() {
        const player = this.player;
        const qualitymenu = this.qualitymenu;
        player.pause();
        if (player.state.mode > STATE.UI_WIDE) {
            player.mode(STATE.UI_WIDE);
        }
        typeof player.window['show1080p'] === 'function' && player.window['show1080p']();
        qualitymenu.value(player.videoQuality);
    }

    setAutoQualityText(quality: number) {
        if (quality > 0) {
            this.container.find('.bilibili-player-auto-hidden').html(`(${this.pMapping[String(quality)]})`);
        } else {
            this.container.find('.bilibili-player-auto-hidden').html('');
        }
    }

    hide() {
        this.container.hide();
    }
}

export default Quality;
