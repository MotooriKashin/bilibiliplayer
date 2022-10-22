// 文档： https://info.bilibili.co/pages/viewpage.action?pageId=184994975÷

import Player from '../player';
import ApiCombo from '../io/api-combo';
import ComboNew, { IConfig, IComboCard } from '@jsc/combo';
import { ContentType } from '@jsc/namespace';

export default class Combo {
    private player: Player;
    private comboPromise!: Promise<any>;
    private comboInfo!: IComboCard[];
    private resource: {
        [key: string]: Promise<ArrayBuffer>;
    } = {};
    combo!: ComboNew;
    track = {
        count: 0,
    };

    constructor(player: Player) {
        this.player = player;
    }
    play() {
        this.combo?.play();
    }
    pause() {
        this.combo?.pause();
    }
    resize() {
        this.combo?.resize();
    }
    option(key: any, value: any) {
        this.combo?.option(key, value);
    }
    comboAdd(danmaku: any) {
        if (this.comboInfo?.length) {
            let time = 0;
            const change = this.comboInfo.some((card) => {
                time = danmaku.stime * 1000 - card.stime;
                if (card.type === 100 || (danmaku.text === card.text && time > 0 && time < card.duration)) {
                    card.count += 1;
                    return true;
                }
                return false;
            });
            if (change) {
                this.startCombo(this.comboInfo);
            }
        }
    }
    // 加载combo
    startCombo(list: IComboCard[]) {
        this.loadCombo();
        this.loadComboBg(list)
            .then(() => {
                this.comboInfo = list;
                if (this.combo) {
                    this.combo.updata(list);
                    return;
                }
                this.comboPromise.then((combo: typeof ComboNew) => {
                    this.initCombo(combo);
                });
            })
            .catch((err) => {
                console.log(err);
            });
    }
    private initCombo(combo: typeof ComboNew) {
        const name = `${this.player.prefix}-combo`;
        let wrap = <HTMLElement>document.querySelector(`.${name}`);
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = name;
            this.player.template.playerWrap.append($(wrap));
        }
        const isEditor = this.player.config.type === ContentType.Editor;
        const config: IConfig = {
            container: wrap,
            list: this.comboInfo,
            noin: isEditor,
            visible: this.player.state.danmaku,
            timeSyncFunc: () => {
                // console.log('now timeline in ' + (+new Date() - self.startTime) + ' ms');
                const ctime = this.player.currentTime()! * 1000;
                return ctime;
            },
            intoShow: (card: IComboCard) => {
                if (isEditor) {
                    return;
                }
                if (!this.track[<'count'>card.id]) {
                    this.track[<'count'>card.id] = <any>true;
                }
            },
        };
        this.combo = new combo(config);
    }

    destroy() {
        this.comboPromise = <any>null;
    }
    // 异步加载combo
    private loadCombo() {
        if (!this.comboPromise) {
            this.comboPromise = new Promise((res, rej) => {
                import(/* webpackChunkName: "comboNew" */ '@jsc/combo')
                    .then((s) => {
                        res(s.default);
                    })
                    .catch(() => {
                        rej();
                    });
            });
        }
        return this.comboPromise;
    }
    // 异步加载combo图片
    private loadComboBg(list: IComboCard[]) {
        const arr: any = [];
        if (list?.length) {
            list.forEach((card) => {
                if (card.url) {
                    card.url = card.url.replace('http://', '//');
                    this.resource[card.url] =
                        this.resource[card.url] ||
                        new Promise((res, rej) => {
                            new ApiCombo({ url: card.url }).getData({
                                success: (data: ArrayBuffer) => {
                                    res(data);
                                },
                                error: (err: any) => {
                                    rej(err);
                                },
                            });
                        });
                    this.resource[card.url].then((data) => {
                        card.data = data;
                        return data;
                    });
                    arr.push(this.resource[card.url]);
                }
            });
        }
        return Promise.all(arr);
    }
}
