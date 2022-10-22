import './static/index.less';
import Panel from './ts/panel';

export interface IConfig {
    bvid: string;
    aid: number;
    cid: number;
    container: HTMLElement;
    prefix?: string;
    theme?: string;
    version?: string;
    track?: (param: string) => void;
    getPlayInfo?: Function;
}

export default class Bback {
    config: Required<IConfig>;
    panel!: Panel;

    constructor(opts: IConfig) {
        this.config = {
            container: document.createElement('div'),
            theme: 'blue',
            prefix: 'b-back',
            version: '0',
            track: (param: string) => { },
            getPlayInfo: () => { },
            ...<any>opts,
        };
    }

    show() {
        if (!this.panel) {
            this.panel = new Panel(this.config);
        }
        this.panel.showPanel();
    }
    directFeedback(cb: (success: boolean) => void) {
        if (!this.panel) {
            this.panel = new Panel(this.config);
        }
        this.panel.directFeedback(cb);
    }
    hide() {
        this.panel?.hidePanel();
    }
    reset() {
        this.panel?.resetDate();
    }
    destroy() {
        this.panel?.destroy();
    }
}
