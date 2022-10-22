import './static/index.less';

import Main from './ts/main';

interface IBtn {
    title: string;
    width: number;
    height: number;
    type: string;
    theme: string;
    onClick?: Function;
}
export interface IConfig {
    backgroundColor: string;
    msg: string;
    msgColor: string;
    msgSize: number;
    btnList: IBtn[];
    hasOrText: boolean;
    miniType: number; // 0: 缩小版提示 , 1: 默认文字提示
    miniMsg: string;
    miniColor: string;
}

class NoFlashTips {
    noFlashTips: Main;
    constructor(container: HTMLElement, opts: IConfig) {
        this.noFlashTips = new Main(container, opts);
    }

    destroy() {
        this.noFlashTips && this.noFlashTips.destroy();
        return this;
    }
}

export default NoFlashTips;
