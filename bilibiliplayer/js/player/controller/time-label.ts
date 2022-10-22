import Controller from '../controller';
import Player from '../../player';
import { fmSeconds, fmSecondsReverse } from '@shared/utils';
class TimeLabel {
    private prefix: string;
    private controller: Controller;
    private player: Player;
    private currentTime!: JQuery;
    private totalTime!: JQuery;
    private container!: JQuery;
    private timeWrap!: JQuery;
    private timeSeek!: JQuery;
    constructor(controller: Controller) {
        this.prefix = controller.prefix;
        this.player = controller.player;
        this.controller = controller;
        this.init();
    }
    private init() {
        const that = this;
        const player = this.player;
        const prefix = this.prefix;
        this.container = $(this.TPL()).appendTo(this.controller.container);
        this.currentTime = this.container.find(`.${prefix}-video-time-now`);
        this.totalTime = this.container.find(`.${prefix}-video-time-total`);
        this.timeWrap = this.container.find(`.${prefix}-video-time-wrap`);
        this.timeSeek = this.container.find(`.${prefix}-video-time-seek`);
        this.timeWrap.click(function () {
            if (player.config.type === window.bPlayer.type.OgvPre || player.config.isPremiere) return;
            if (player.video && typeof player.currentTime() !== 'undefined' && player.initialized) {
                const oldTime = fmSeconds(+player.currentTime()!);
                $(this).hide();
                that.timeSeek
                    .show()
                    .focus()
                    .val(oldTime)
                    .one(`focusout${player.config.namespace}`, function () {
                        $(this).unbind(`keydown${player.config.namespace}`);
                        $(this).hide();
                        that.timeWrap.show();
                        const newTime = fmSecondsReverse(<string>$(this).val());
                        if (oldTime !== fmSeconds(newTime)) {
                            setTimeout(() => {
                                player.seek(newTime);
                            }, 200);
                        }
                    })
                    .bind(`keydown${player.config.namespace}`, function (e) {
                        e.stopPropagation();
                        if (e.keyCode === 13) {
                            $(this).unbind(`focusout${player.config.namespace}`);
                            $(this).unbind(`keydown${player.config.namespace}`);
                            $(this).hide();
                            that.timeWrap.show();
                            const newTime = fmSecondsReverse(<string>$(this).val());
                            if (oldTime !== <any>newTime) {
                                player.seek(newTime);
                            }
                        } else if (e.keyCode === 27) {
                            $(this).unbind(`focusout${player.config.namespace}`);
                            $(this).unbind(`keydown${player.config.namespace}`);
                            $(this).hide();
                            that.timeWrap.show();
                        }
                    });
            }
        });
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}-video-time" name="time_textarea">
                <input class="${prefix}-video-time-seek" value="00:00" />
                <div class="${prefix}-video-time-wrap" name="time_textarea">
                    <span class="${prefix}-video-time-now" name="time_textarea">00:00</span>
                    <span class="${prefix}-video-divider" name="time_textarea">/</span>
                    <span class="${prefix}-video-time-total" name="time_textarea">00:00</span>
                </div>
            </div>
        `;
    }
    hide() {
        this.timeSeek.blur();
    }
    setCurrentTime(value: string) {
        this.currentTime.html(value);
    }
    setTotalTime(value: string) {
        this.totalTime.html(value);
    }
}

export default TimeLabel;
