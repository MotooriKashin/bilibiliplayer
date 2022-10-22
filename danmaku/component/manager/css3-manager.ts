import Manager, { ICycDiv } from './manager';
import CSS3Render from '../render/css3-render';

import Danmaku from '../../danmaku';
import ITextDataInterface from '../../interface/text_data';

class CSS3Manager extends Manager {
    constructor(danmaku: Danmaku) {
        super(danmaku);
    }

    public getText(danmaku: ITextDataInterface, precise: number) {
        this.config.devicePR = 1;

        let recyclingDiv: ICycDiv;
        if (this.config.isRecycling && this.recyclingDivList.length) {
            recyclingDiv = this.recyclingDivList.splice(0, 1)[0];
        }
        if (this.config.verticalDanmaku && (danmaku.mode === 1 || danmaku.mode === 6 || danmaku.mode === <any>'x')) {
            danmaku.vDanmaku = true;
        } else {
            danmaku.vDanmaku = false;
        }
        // @ts-ignore
        return new CSS3Render(danmaku, this.config, precise ? precise - danmaku.stime : 0, recyclingDiv);
    }
}

export default CSS3Manager;
