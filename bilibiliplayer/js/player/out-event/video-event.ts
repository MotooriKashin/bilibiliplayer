import STATE from '../state';

export default class VideoEvent {
    pageEvent: any;

    constructor(private bVideo: any) {
        this.pageEvent = bVideo;
    }
    emit(type: string, ...args: any) {
        this.bVideo.emit(type, ...args);
    }
    setupWebContainerState(mode: number) {
        switch (mode) {
            case STATE.UI_NORMAL:
                this.bVideo.webFullscreen(false);
                break;
            case STATE.UI_WIDE:
                this.bVideo.wideScreen();
                break;
            case STATE.UI_WEB_FULL:
                this.bVideo.webFullscreen(true);
                break;
            case STATE.UI_FULL:
                break;
            default:
                break;
        }
    }
    heimu(api: number, b: number) {
        this.bVideo.heimu(api, b);
    }
    hasHeimuFunction() {
        return true;
    }
    change_flash() {
        this.bVideo.playerChange(false);
    }
    getFeedback(mini: boolean) {
        this.bVideo.getFeedback(mini);
    }
    initialCallback() {
        this.bVideo.initCB();
    }
    loadedCallback() {
        this.bVideo.loadedCB();
    }
    preLoadUrl() {
        this.bVideo.preLoadUrl();
    }
}
