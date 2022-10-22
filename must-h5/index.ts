import './static/index.less';

interface IConfig {
    id: string;
    textList: string[];
    url: string;
}

export default class Musth5 {
    private config: IConfig;
    private container: HTMLElement;
    private prefix: string;

    constructor(opts: IConfig) {
        this.prefix = 'must-h5';
        this.config = {
            textList: [],
            ...<any>opts,
        };
        this.container =
            document.querySelector('#bilibili-player') ||
            document.querySelector(`#${this.config.id}`) ||
            document.createElement('div');
        this.init();
    }

    private init() {
        this.container.innerHTML = this.tpl();
    }

    private tpl() {
        let text = '';
        this.config.textList.forEach((item: string) => {
            text += `<p class="${this.prefix}-text">${item}</p> `;
        });
        return `<div class="${this.prefix}" >
                <img class="${this.prefix}-img" src="${this.config.url}"> 
                ${text}
        </div>`;
    }

    destroy() { }
}
