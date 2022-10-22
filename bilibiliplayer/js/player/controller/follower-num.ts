import Controller from '../controller';

export default class FollowerNum {
    private prefix: string;
    private controller: Controller;
    constructor(controller: Controller, private num: number) {
        this.prefix = controller.prefix;
        this.controller = controller;
        this.init();
    }
    private init() {
        $(this.TPL()).prependTo(this.controller.container);
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-follower-num">
                <span class="${prefix}-video-divider">${this.num}</span>
                <span>人在追剧</span>
            </div>
        `;
    }
}
