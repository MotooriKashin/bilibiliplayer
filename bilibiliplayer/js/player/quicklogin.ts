import Player from '../player';
import URLS from '../io/urls';
import { browser } from '@shared/utils';

class QuickLogin {
    private player: Player;
    private requireList: any[] = [];
    private windowFakeStatus = false;
    private retry!: number;
    constructor(player: Player) {
        this.player = player;
    }
    load(callback?: Function) {
        const that = this;
        const player = this.player;
        if (player.isFullScreen()) {
            player.exitFullScreen();
        }
        if (
            player.window['UserStatus'] &&
            typeof player.window['UserStatus']['status'] === 'function' &&
            !this.windowFakeStatus &&
            player.window['UserStatus']['status']['isLogin']
        ) {
            this.player.user.reload(function (status: any) {
                if (!status.login) {
                    that.windowFakeStatus = true;
                    that.load(callback);
                } else {
                    if (typeof callback === 'function') {
                        that.requireList.push(callback);
                    }
                    that.callbackLists(status);
                }
            });
        } else if (!browser.version.mobile || browser.version.iPad) {
            this.getScript('MiniLogin', URLS.MINI_LOGIN, function () {
                const miniLogin = new player.window['MiniLogin']!();
                miniLogin.showComponent();
                miniLogin.addEventListener('success', (data: any) => {
                    setTimeout(() => {
                        if (/movie/.test(player.window.location.href)) {
                            player.window.location.href = player.window.location.href;
                            return false;
                        }
                        that.windowFakeStatus = false;
                        if (typeof player.window['loadLoginStatus'] === 'function') {
                            player.window['loadLoginStatus']();
                        }
                        if (typeof player.window['bangumiPlayerLogin'] === 'function') {
                            player.window['bangumiPlayerLogin']();
                        }
                        that.player.user.reload(function (status: any) {
                            if (typeof callback === 'function') {
                                that.requireList.push(callback);
                            }
                            that.callbackLists(status);
                        });
                    }, 1);
                });
            });
        } else {
            player.window.location.href = URLS.PAGE_LOGIN;
        }
    }
    callbackLists(status: any) {
        for (let i = this.requireList.length - 1; i >= 0; i--) {
            this.requireList.pop()(status);
        }
    }
    getScript(module: any, url: string, callback: Function) {
        const that = this;
        if (that.player.window[module]) {
            if (typeof callback === 'function') {
                callback();
            }
        } else {
            that.player.window.$!.ajax({
                url: url,
                dataType: 'script',
                cache: true,
                success: function (data: any) {
                    callback();
                },
                error: function () {
                    if (that.retry > -1) {
                        that.retry--;
                        setTimeout(function () {
                            that.getScript(module, url, callback);
                        }, 1000);
                    } else {
                        that.callbackLists({
                            login: false,
                        });
                    }
                },
            });
        }
    }
}

export default QuickLogin;
