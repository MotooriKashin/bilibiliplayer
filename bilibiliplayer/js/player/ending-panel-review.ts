import Player from '../player';
import EndingPanel from './ending-panel';
import { IStoryData, IHiddenVars, ApiInteractiveOutData } from '../io/api-interactive';
import svg from './svg';
import { htmlEncode } from '@shared/utils';
import { Swiper } from '@jsc/player-auxiliary/js/ui/swiper';

import '../../css/ending-panel-review.less';

class EndingPanelReview {
    private player: Player;
    private wrap: JQuery;
    private container: JQuery;
    private hideText: JQuery;
    private prefix: string;
    private swiper!: Swiper;
    private storyList!: IStoryData[];
    private hiddenVars!: IHiddenVars[];

    constructor(endingPanel: EndingPanel, player: Player) {
        this.player = player;
        this.wrap = endingPanel.template.container;
        this.container = endingPanel.template.review;
        this.hideText = endingPanel.template.hideText;
        this.prefix = this.player.prefix;
        this.init();
    }

    init() {
        const result = this.getIv();
        if (this.player.interactive && result) {
            this.loadPage(result);
            this.loadInfo(result);
        } else {
            this.wrap.removeClass(`${this.prefix}-ending-panel-review`);
        }
    }

    private loadPage(result: ApiInteractiveOutData) {
        this.storyList = result.story_list!;
        if (Array.isArray(this.storyList) && this.storyList.length > 1) {
            this.wrap.addClass(`${this.prefix}-ending-panel-review`);
            this.swiper = new Swiper(this.container, {
                list: this.storyList,
                value: result.edge_id + '',
                clickFn: (index: number) => {
                    const item = this.storyList[index];
                    this.player.interactiveVideoConfig!.portal = 1;
                    this.player.interactiveVideoConfig!.interactiveTargetId = index;
                    this.player.interactiveVideoConfig!.interactiveHiddenVars = undefined;
                    this.player.interactiveVideoConfig!.interactiveChoices = undefined;
                    this.player.interactiveVideo!.callNextPart(
                        {
                            id: item.edge_id,
                            cid: item.cid,
                            option: item.title,
                        },
                        item.start_pos,
                    );
                },
            });
        }
    }

    private getIv() {
        return this.player.interactiveVideo ? this.player.interactiveVideo.ivApiData : null;
    }

    private loadInfo(result: ApiInteractiveOutData) {
        this.hiddenVars = result.hidden_vars!;
        if (Array.isArray(this.hiddenVars) && this.hiddenVars.length > 0) {
            this.hideText.append(this.tpl(this.hiddenVars));
        }
    }

    private tpl(list: IHiddenVars[]) {
        let li = '';
        const listShow: IHiddenVars[] = [];
        list.forEach((item: IHiddenVars) => {
            if (item.is_show === 1) {
                listShow.push(item);
            }
        });
        if (listShow.length > 0) {
            const max = 100 / listShow.length + '%';
            listShow.forEach((item: IHiddenVars) => {
                li += `<li class="${this.prefix}-ending-panel-box-text" style="max-width: ${max}">
                    <div class="${this.prefix}-ending-panel-box-name">${htmlEncode(item.name)}</div>
                    <div class="${this.prefix}-ending-panel-box-value">${item.value}</div>
                </li>`;
            });
        }
        return li && `<ul class="${this.prefix}-ending-panel-box-ul">${svg.hide + li}</ul>`;
    }

    reload() {
        const result = this.getIv()!;
        this.destroy();
        this.loadPage(result);
        this.loadInfo(result);
    }

    refresh() {
        const result = this.getIv()!;
        if (result.story_list !== this.storyList) {
            this.container.html('');
            this.loadPage(result);
        }
        if (result.hidden_vars !== this.hiddenVars) {
            this.hideText.html('');
            this.loadInfo(result);
        }
    }

    resize(scale: number = 1) {
        if (!this.player.interactive) {
            return;
        }
        this.refresh();
        this.swiper && this.swiper.resize(scale);
    }

    private destroy() {
        this.container.html('');
        this.hideText.html('');
    }
}

export default EndingPanelReview;
