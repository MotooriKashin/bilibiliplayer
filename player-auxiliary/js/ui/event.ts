import { browser } from "@shared/utils";

let EVENTLIST = {
    mousedown: 'mousedown',
    mousemove: 'mousemove',
    mouseup: 'mouseup',
};
if (browser.version.mobile) {
    EVENTLIST = {
        mousedown: 'touchstart',
        mousemove: 'touchmove',
        mouseup: 'touchend',
    };
}

export default EVENTLIST;
