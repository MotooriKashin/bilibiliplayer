import { getLocalSettings } from '@shared/utils';
import Player from '../../player';

class LabPbp {
    static timer: any;
    static load(player: Player, params: any) {
        if (window.BiliPBP) {
            LabPbp._load(player, params);
        } else {
            return false;
        }
    }

    static _load(player: Player, params: any) {
        if (window.BiliPBP) {
            if (window.$pbp) {
                window.$pbp.destroy();
                window.$pbp = undefined;
            }
            window.$pbp = new window.BiliPBP(params)!;
            window.$pbp.init('default', function (e: string) {
                if (!e) {
                    if (getLocalSettings('pbpstate') !== '1') {
                        window.$pbp!.hide();
                    } else {
                        window.$pbp!.show();
                    }
                    LabPbp.bindEvents(player);
                    // $(player.controller.settingButton.highenergy.container).show();
                }
            });
        }
    }

    static bindEvents(player: Player) {
        const pbpContainer = $('.bilibili-player-videoshot-area');
        if (pbpContainer.length === 1 && player.controller.progressBar && pbpContainer.attr('hover-bind') !== '1') {
            pbpContainer.attr('hover-bind', '1');
            pbpContainer[0].addEventListener('mouseenter', (event: Event) => {
                // player.controller.progressBar.isHover = true;
                // player.controller.progressBar.bindMove();
            });
            pbpContainer[0].addEventListener('mouseleave', (event: Event) => {
                // player.controller.progressBar.isHover = false;
                // if (!player.controller.progressBar.isMouseDown) {
                //     player.controller.progressBar.unbindMove();
                // }
            });
        } else if (pbpContainer.attr('hover-bind') !== '1') {
            LabPbp.timer = setTimeout(() => {
                LabPbp.bindEvents(player);
            }, 500);
        }
    }

    static destroy(player: Player) {
        if (window.$pbp) {
            try {
                clearTimeout(LabPbp.timer);
            } catch (e) { }
            window.$pbp.destroy();
            window.$pbp = undefined;
        }
    }

    static getParams(eventid: string, player?: Player) {
        if (
            [
                'slidebar',
                'slidepbp',
                'slidekey',
                'quit',
                'seek_end_load',
                'player_received_bytes',
                'slidejump',
                'slidejumpiv',
            ].indexOf(eventid) > -1 &&
            window.$pbp &&
            window.$pbp.stateStore
        ) {
            let param = '';
            try {
                const pbp = window.$pbp.stateStore;
                if (pbp) {
                    const dm = player!.danmaku && player!.danmaku.danmaku && player!.danmaku.danmaku.visible() ? 1 : 0;
                    param = `labname:pbp,pbpstatus:${pbp.pbpstatus},pbptag:${pbp.pbptagstr},danmaku:${dm}`;

                    if (eventid === 'quit') {
                        param += `,ctrlshowtimes:${player!.template.ctrlShowTimes}`;
                    }
                }
            } catch (e) { }
            return param;
        } else {
            return false;
        }
    }
}

export default LabPbp;
