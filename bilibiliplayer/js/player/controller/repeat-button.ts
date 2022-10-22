import Player from "../../player";
import Controller from "../controller";
import STATE from "../state";

export class RepeatButton {
    prefix: string;
    player: Player;
    container!: JQuery<HTMLElement>;
    iconfont!: JQuery<HTMLElement>;
    constructor(public controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.init();
    }
    init() {
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.iconfont = this.container.find(`.${this.prefix}-iconfont`);
        this.container.on("click", e => {
            this.change(!this.player.state.repeat);
        });
        this.change(this.player.state.repeat);
    }
    TPL() {
        return `<div class="${this.prefix}-video-btn ${this.prefix}-video-btn-repeat">
        <i class="${this.prefix}-iconfont ${this.prefix}-iconfont-repeat icon-24repeatoff" data-tooltip="1" data-text="打开洗脑循环" data-position="top-center" data-change-mode="3"></i>
        </div>`;
    }
    change(value: boolean) {
        this.player.state.repeat = value;
        value
            ? this.iconfont.removeClass("icon-24repeatoff").addClass("icon-24repeaton").attr("data-text", "关闭洗脑循环")
            : this.iconfont.addClass("icon-24repeatoff").removeClass("icon-24repeaton").attr("data-text", "打开洗脑循环");
        if (this.player.video) {
            this.player.state.repeat = value;
            this.setPlaytype();
        }
    }
    setPlaytype(value?: number) {
        this.player.state.play_type = value ||
            this.player.state.repeat === STATE.V_REPEAT_ON
            ? 3
            : this.player.videoSettings.video_status.autopart > 0
                ? 2
                : 1;
    }
}