import Player from '../../player';

class LabAutoplay {
    static load(player: Player, params: any) {
        // player.controller.settingButton.autoplay = new Checkbox(
        //     player.controller.settingButton
        //         .getContainer()
        //         .find(`.${player.prefix}-video-btn-setting-panel-others-content-autoplay`)[0],
        //     {
        //         name: '自动播放',
        //         value: !player.utils.getCookie('unautoplay') ? true : false,
        //         dark: true,
        //     },
        // );
        // $(player.controller.settingButton.autoplay.container).show();
        // player.controller.settingButton.autoplay.on('change', (e: any) => {
        //     e.value ? player.utils.setCookie('unautoplay', '0', -1) : player.utils.setCookie('unautoplay', '1');
        // });
    }

    static destroy(player: Player) {
        try {
            // player.controller.settingButton.autoplay.destroy();
        } catch (e) { }
    }

    static getParams(eventid: string, player?: Player) {
        return false;
    }
}

export default LabAutoplay;
