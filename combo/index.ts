import './less/index.less';
import Animate, { IFold } from './ts/animate';

export interface IComboCard {
    count: number;
    stime: number;
    duration: number;
    step: number[];
    type: number;
    text: string;
    data: ArrayBuffer;
    url: string;
    id: string;
    fold?: IFold;
}
export interface IConfig {
    container: HTMLElement;
    list: IComboCard[];
    max?: number;
    pfx?: string;
    visible?: boolean;
    noin?: boolean; // 是否有入场动画
    timeSyncFunc: Function;
    intoShow: Function;
}
export interface IReset {
    text?: string;
    count?: number;
    duration?: number;
    stime?: number;
    step?: number[];
}
export interface IElements {
    [key: string]: any;
}
export default class ComboNew {
    config: IConfig;
    animate: Animate;

    constructor(config: IConfig) {
        this.config = {
            pfx: 'cb',
            max: 9999999,
            visible: true,
            list: [],
            ...<any>config,
        };
        this.animate = new Animate(this.config);
    }

    play() {
        this.animate.play();
    }
    pause() {
        this.animate.pause();
    }
    updata(list: IComboCard[]) {
        this.animate.updata(list);
    }
    delete() {
        this.animate.delete();
    }
    resize() {
        this.animate.resize();
    }
    search(x: number, y: number) {
        return this.animate.search(x, y);
    }
    option(key: string, value: any): any {
        this.animate.option(key, value);
    }

    dispose() {
        this.animate.dispose();
    }
}
