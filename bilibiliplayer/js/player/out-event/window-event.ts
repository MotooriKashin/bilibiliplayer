import STATE from '../state';
import Player from '../../player';
export default class WindowEvent {
    pageEvent: Window;

    constructor(private player: Player) {
        this.pageEvent = window;
    }
    emit() { }
    setupWebContainerState(mode: number) {
        switch (mode) {
            case STATE.UI_NORMAL:
                window['player_fullwin'] && window['player_fullwin'](false);
                break;
            case STATE.UI_WIDE:
                window['player_fullwin'] && window['player_fullwin'](false);
                window['player_widewin'] && window['player_widewin']();
                break;
            case STATE.UI_WEB_FULL:
                window['player_fullwin'] && window['player_fullwin'](true);
                break;
            case STATE.UI_FULL:
                break;
            default:
                break;
        }
    }
    heimu(api: number, b: number) {
        if (typeof window['heimu'] === 'function') {
            window['heimu'](api, b);
        }
    }
    hasHeimuFunction() {
        return typeof window['heimu'] === 'function';
    }
    change_flash() {
        this.player.window['GrayManager'] && this.player.window['GrayManager']['clickMenu']('change_flash');
    }
    getFeedback(mini: boolean) {
        if (this.player.window.GrayManager?.getFeedback) {
            this.player.window.GrayManager.getFeedback(mini);
        }
    }
    initialCallback() {
        if (
            this.player.window &&
            this.player.window['GrayManager'] &&
            this.player.window['GrayManager']['initialCallback']
        ) {
            (<any>this).player.window['GrayManager']['initialCallback']();
        }
    }
    loadedCallback() {
        if (
            this.player.window &&
            this.player.window['GrayManager'] &&
            this.player.window['GrayManager']['loadedCallback']
        ) {
            (<any>this).player.window['GrayManager']['loadedCallback']();
        }
    }
    preLoadUrl() { }
}
