import STATE from './state';
import Player from '../player';

class LoadingPanel {
    private player: Player;
    private container: JQuery;
    private prefix: string;
    private stages!: any[];
    private contentbox!: JQuery;

    constructor(player: Player, container: JQuery) {
        this.container = container;
        this.player = player;
        this.prefix = player.prefix;
        this.init();
        this.player.bind(STATE.EVENT.PLAYER_RELOAD, () => {
            this.reload();
        });
    }

    init() {
        this.stages = [
            ['播放器初始化', false],
            ['加载用户配置', false],
            ['加载视频地址', false],
            ['加载视频内容', false],
        ];
        if (this.player.corePreload) {
            this.stages = [
                ['播放器初始化', false],
                ['加载用户配置', false],
                ['加载视频地址', true, true],
                ['加载视频内容', true, true],
            ];
        }
        setTimeout(() => {
            this.container.find('.' + this.prefix + '-video-panel-blur-detail').css('display', 'block');
            this.container.find('.' + this.prefix + '-video-panel-text').css('display', 'block');
        }, 1500);
        this.contentbox = this.container.find('.' + this.prefix + '-video-panel-text').html('');
    }

    ready(s: number, triggerTime?: number) {
        if (!this.stages[s][1]) {
            this.stages[s][1] = true;
            this.contentbox.append(
                '<div class="' + this.prefix + '-video-panel-row" stage="' + s + '">' + this.stages[s][0] + '...</div>',
            );
            this.player.trigger(STATE.EVENT.VIDEO_INITIALIZING, s, 'start', true, triggerTime);
        }
    }

    complete(s: number, state: boolean, message?: string, code?: number) {
        if (this.stages[s][1] && typeof this.stages[s][2] === 'undefined') {
            this.contentbox.find('[stage="' + s + '"]').append((state ? '[完成]' : '[失败] ') + (message || ''));
            this.stages[s][2] = !!state;
            this.player.trigger(STATE.EVENT.VIDEO_INITIALIZING, s, 'end', state);
        }
        if (this.stages[3][2]) {
            const that = this;
            setTimeout(function () {
                that.container.hide();
            }, 200);
        }
        for (let i = 0; i < this.stages.length; i++) {
            if (!this.stages[i][2]) {
                return false;
            }
        }
        this.player.initialized = true;
        this.player.trigger(STATE.EVENT.VIDEO_INITIALIZED);
    }

    info(info: string) {
        this.container.show();
        this.contentbox.append('<div class="' + this.prefix + '-video-panel-row">' + info + '</div>');
    }

    reset(stage: number) {
        this.contentbox.find('[stage="' + stage + '"]').removeAttr('stage');
        this.stages[stage][1] = false;
        delete this.stages[stage][2];
    }

    hide() {
        this.container.hide();
    }

    destroy() { }

    reload() {
        this.contentbox.empty();
        this.stages = [
            ['播放器初始化', true, true],
            ['加载用户配置', false],
            ['加载视频地址', false],
            ['加载视频内容', false],
        ];
    }
}

export default LoadingPanel;
