import Player, { IReceivedInterface } from '../player';
import STATE from '../player/state';
import AudioEffect from '@jsc/audio-effect';
import SkipCard, { ISkipCard } from './skip-card';
import { IUserStatusInterface } from '../player/user';
import LinkDM, { ILinkDM } from './link-dm';
import ScoreDM, { IScoreDM } from './score-dm';
import * as WD from '../const/webpage-directive';
import { ContentType } from '@jsc/namespace';
import { PopupBase } from '../player/popup/popup-base';
import ClockIn, { IClockIn } from './clock-in';
import ScoreSummary, { IScoreSummary } from './score-summary';
import Foolsday from './foolsday';
import Reserve, { IReserve } from './reserve';
import Answer from './answer';
import UpEggDM from './upegg-dm';
import { DmBoom } from './dm-boom';
import { dmAd, IDmAd, IOutDmAd } from '../io/api-dm-ad';
import ApiReserve, { ApiReserveOutData } from '../io/api-reserve';
import ApiJumpCard, { ApiJumpCardOutData } from '../io/api-jump-card';
import ThreeClick from './three-click';
import { IActionStateInterface } from '../player/global-function';
import Tooltip from '@jsc/player-auxiliary/js/plugins/tooltip';
import Combo from './combo';
import { IComboCard } from '@jsc/combo';

import '../../css/combo.less';
import { base64, browser } from '@shared/utils';

const defaultTrack = {
    once: false,
    time: 0,
    vTime: 0,
    timer: 0,
};

class AllPlugins {
    private player: Player;
    private audioEffect!: AudioEffect | null;
    private audioTrack = defaultTrack;
    private skipCard!: SkipCard;
    private isEditor: boolean;
    private foolsday!: Foolsday;
    private loadAdPromise!: Promise<any>;
    cardAjax: any;
    reserveAjax: any;
    combo!: Combo;
    linkDM!: LinkDM;
    reserve!: Reserve;
    answer!: Answer;
    scoreDM!: ScoreDM;
    scoreSummary!: ScoreSummary;
    upEggDM!: UpEggDM;
    clockIn!: ClockIn;
    dmBoom!: DmBoom;

    constructor(player: Player) {
        this.player = player;
        this.isEditor = this.player.config.type === ContentType.Editor;
        this.events();

        // 初始化参数
        PopupBase.setInitParams(this.player);

        // this.getDmAd();
    }
    play() {
        this.combo?.play();
        this.dmBoom?.play();
        this.foolsday?.pause(false);
    }
    pause() {
        this.combo?.pause();
        this.foolsday?.pause(true);
        this.dmBoom?.pause();
    }
    option(key: any, value: any, mode?: boolean) {
        this.answer?.option(key, value);
        this.reserve?.option(key, value);
        this.linkDM?.option(key, value);
        this.combo?.option(key, value);
        this.foolsday?.option(key, value);
        this.scoreDM?.option(key, value);
        this.scoreSummary?.option(key, value);
        this.upEggDM?.option(key, value);
        this.clockIn?.option(key, value);
        this.player.popup?.option(key, value);

        if (mode) return;
        this.dmBoom?.option(key, value);
    }
    update(video?: HTMLVideoElement) {
        this.audioEffect?.update(video);
    }
    comboAdd(danmaku: any) {
        this.combo?.comboAdd(danmaku);
    }

    startCombo(list: IComboCard[]) {
        this.combo = this.combo || new Combo(this.player);
        this.combo.startCombo(list);
    }

    // 加载link
    startLink(list: ILinkDM[]) {
        if (this.isEditor) {
            return;
        }
        this.initLink();
        this.linkDM.update(list);
    }
    // 只供创作中心调用
    updateLink(item: any) {
        if (!item.length) {
            this.linkDM?.delete();
            return;
        }
        this.initLink();
        let list = [];
        let ele;
        for (let i = 0; i < item.length; i++) {
            ele = item[i];
            list.push({
                bvid: ele.data.bvid,
                from: ele.from,
                to: ele.to,
                key: ele.key,
                dmid: ele.idStr || ele.dmid,
                text: ele.data.msg,
                posY: ele.posY,
                posX: ele.posX,
            });
        }

        this.linkDM.update(<any>list);
    }
    initLink() {
        if (!this.linkDM) {
            this.linkDM = new LinkDM({
                container: this.player.template.videoInnerWrap!,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                getOptions: () => {
                    return this.player.videoSettings;
                },
                cb: (name: string, info: string, pause?: boolean) => {
                    if (this.isEditor) {
                        return;
                    }
                    pause && this.player.pause();
                },
                videoSize: () => {
                    return {
                        w: this.player.video?.offsetWidth || 1,
                        h: this.player.video?.offsetHeight || 1,
                        vw: this.player.video?.videoWidth || 1,
                        vh: this.player.video?.videoHeight || 1,
                    };
                },
                update: (card: ILinkDM) => {
                    this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
                        manual: true, //用来表示 是鼠标松开触发
                        key: card.key,
                        pos_y: card.posY,
                        pos_x: card.posX,
                        idStr: card.dmid,
                        from: card.from,
                        to: card.to,
                    });
                },
            });
        }
        return this.linkDM;
    }
    // 加载评分弹幕
    startScoreDM(list: IScoreDM[]) {
        if (this.isEditor) {
            return;
        }
        this.initScoreDM();
        this.scoreDM.update(list);
    }
    // 只供创作中心调用
    updateScoreDM(item: any) {
        if (!item.length) {
            this.scoreDM?.delete();
            return;
        }
        this.initScoreDM();
        let list = [];
        let ele;
        for (let i = 0; i < item.length; i++) {
            ele = item[i];
            list.push({
                from: ele.from,
                to: ele.to,
                key: ele.key,
                dmid: ele.idStr || ele.dmid,
                msg: ele.data.msg,
                posY: ele.pos_y,
                posX: ele.pos_x,

                skin: ele.data.skin,
                skinUnselected: ele.data.skinUnselected,
                skinSelected: ele.data.skinUnselected,
                count: ele.data.count,
                id: ele.data.id,
            });
        }

        this.scoreDM.update(list);
        this.scoreDM.showAnimate = false;
    }
    initScoreDM() {
        if (!this.scoreDM) {
            this.scoreDM = new ScoreDM({
                container: this.player.template.videoInnerWrap,
                player: this.player,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                getOptions: () => {
                    return this.player.videoSettings;
                },
                cb: (name: string, info: string, pause?: boolean) => {
                    if (this.isEditor) {
                        return;
                    }
                    pause && this.player.pause();
                },
                videoSize: () => {
                    return {
                        w: this.player.video?.offsetWidth || 1,
                        h: this.player.video?.offsetHeight || 1,
                        vw: this.player.video?.videoWidth || 1,
                        vh: this.player.video?.videoHeight || 1,
                    };
                },
                update: (card: IScoreDM) => {
                    this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
                        manual: true, //用来表示 是鼠标松开触发
                        key: card.key,
                        pos_y: card.posY,
                        pos_x: card.posX,
                        idStr: card.dmid,
                        from: card.from,
                        to: card.to,

                        msg: card.msg,
                        skin: card.skin,
                        skinUnselected: card.skinUnselected,
                        skinSelected: card.skinSelected,
                        skinFontColor: card.skinFontColor,
                        gradeId: card.gradeId,
                        midScore: card.midScore,
                        count: card.count || 0,
                        avgScore: card.avgScore || 0,
                    });
                },
            });
        }
        return this.scoreDM;
    }
    // 加载评分总结
    startScoreSummary(list: IScoreSummary[]) {
        if (this.isEditor) {
            return;
        }
        this.initScoreSummary();
        this.scoreSummary.update(list);
    }
    // 只供创作中心调用
    updateScoreSummary(item: any) {
        if (!item.length) {
            this.scoreSummary?.delete();
            return;
        }
        this.initScoreSummary();
        let list = [];
        let ele;
        for (let i = 0; i < item.length; i++) {
            ele = item[i];
            list.push({
                from: ele.from,
                to: ele.to,
                key: ele.key,
                dmid: ele.idStr || ele.dmid,
                msg: ele.data.msg,
                posY: ele.pos_y,
                posX: ele.pos_x,

                skin: ele.data.skin,
                skinUnselected: ele.data.skinUnselected,
                skinSelected: ele.data.skinUnselected,
                count: ele.data.count,
                id: ele.data.id,
                summaryList: ele.data.summaryList,
            });
        }

        this.scoreSummary.update(list);
        this.scoreSummary.showAnimate = false;
    }
    initScoreSummary() {
        if (!this.scoreSummary) {
            this.scoreSummary = new ScoreSummary({
                container: this.player.template.videoInnerWrap,
                player: this.player,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                getOptions: () => {
                    return this.player.videoSettings;
                },
                cb: (name: string, info: string, pause?: boolean) => {
                    if (this.isEditor) {
                        return;
                    }
                    pause && this.player.pause();
                },
                videoSize: () => {
                    return {
                        w: this.player.video?.offsetWidth || 1,
                        h: this.player.video?.offsetHeight || 1,
                        vw: this.player.video?.videoWidth || 1,
                        vh: this.player.video?.videoHeight || 1,
                    };
                },
                update: (card: IScoreDM) => {
                    this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
                        manual: true, //用来表示 是鼠标松开触发
                        key: card.key,
                        pos_y: card.posY,
                        pos_x: card.posX,
                        idStr: card.dmid,
                        from: card.from,
                        to: card.to,

                        msg: card.msg,
                        skin: card.skin,
                        skinUnselected: card.skinUnselected,
                        skinSelected: card.skinSelected,
                        skinFontColor: card.skinFontColor,
                        gradeId: card.gradeId,
                        midScore: card.midScore,
                        count: card.count || 0,
                        avgScore: card.avgScore || 0,
                    });
                },
            });
        }
        return this.scoreSummary;
    }
    // 加载打卡功能
    startClockIn(list: IClockIn[]) {
        if (this.isEditor) {
            return;
        }
        this.initClockIn();
        this.clockIn.update(list);
    }
    // 只供创作中心调用
    updateClockIn(item: any) {
        if (!item.length) {
            this.clockIn?.delete();
            return;
        }
        this.initClockIn();
        let list: IClockIn[] = [];
        let ele;
        for (let i = 0; i < item.length; i++) {
            ele = item[i];
            list.push({
                from: ele.from,
                to: ele.to,
                key: ele.key,
                dmid: ele.idStr || ele.dmid,
                msg: ele.data.msg,
                posY: ele.pos_y,
                posX: ele.pos_x,

                total: ele.data.total,
                endClock: ele.data.endClock,
                type: ele.data.type,
                userCompleted: 0,
                userOverNumber: 0,
            });
        }

        this.clockIn.update(list);
    }
    initClockIn() {
        if (!this.clockIn) {
            this.clockIn = new ClockIn({
                container: this.player.template.videoInnerWrap,
                player: this.player,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                cid: this.player.config.cid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                getOptions: () => {
                    return this.player.videoSettings;
                },
                cb: (name: string, info: string, pause?: boolean) => {
                    if (this.isEditor) {
                        return;
                    }
                    pause && this.player.pause();
                },
                videoSize: () => {
                    return {
                        w: this.player.video?.offsetWidth || 1,
                        h: this.player.video?.offsetHeight || 1,
                        vw: this.player.video?.videoWidth || 1,
                        vh: this.player.video?.videoHeight || 1,
                    };
                },
                update: (card: IClockIn) => {
                    this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
                        manual: true, //用来表示 是鼠标松开触发
                        key: card.key,
                        pos_y: card.posY,
                        pos_x: card.posX,
                        idStr: card.dmid,
                        from: card.from,
                        to: card.to,

                        total: card.total,
                        endClock: card.endClock,
                        type: card.type,
                    });
                },
            });
        }
        return this.clockIn;
    }
    /**
     * 加载Reserve
     */
    startReserve(list: IReserve[]) {
        if (this.isEditor) {
            return;
        }
        this.initReserve();
        this.reserve.update(list);
    }
    /**
     * 加载Reserve
     */
    startAnswer(list: IDmAd[]) {
        if (this.isEditor) {
            return;
        }
        this.initAnswer();
        this.answer.update(list);
    }
    /**
     * 只供创作中心调用
     */
    updateReserve(item: any) {
        if (!item.length) {
            this.reserve?.delete();
            return;
        }
        this.initReserve();
        let list: IReserve[] = [];
        let ele;
        for (let i = 0; i < item.length; i++) {
            ele = item[i];
            list.push({
                key: ele.key,
                from: ele.from,
                duration: ele.duration,
                to: ele.to,
                dmid: ele.dmid,
                text: ele.text,
                posY: ele.posY,
                posX: ele.posX,
                count: ele.count || 0,
                liveTime: ele.liveTime,
                userState: ele.userState,
                liveState: ele.liveState,
                popularity: ele.popularity,
                liveTimeFormat: ele.liveTimeFormat,
                state: ele.state,
                live: ele.live,
                liveLottery: ele.liveLottery,
                arcTime: ele.arcTime,
                arcTimeFormat: ele.arcTimeFormat,
                desc: ele.desc,
                cooperationTime: ele.cooperationTime,
                cooperationTimeFormat: ele.cooperationTimeFormat,
            });
        }

        this.reserve.update(list);
    }
    private initReserve() {
        if (!this.reserve) {
            this.reserve = new Reserve({
                container: this.player.template.videoInnerWrap,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                cb: (name: any, info?: string) => {
                    if (this.isEditor || this.reserveAjax) {
                        return;
                    }
                    if (!info) {
                        this.reserveClick(name);
                    } else {
                    }
                },
                update: (card: IReserve) => {
                    this.player.trigger(STATE.EVENT.VIDEO_GUIDE_ATTENTION_POS_UPDATE, {
                        manual: true, //用来表示 是鼠标松开触发
                        key: card.key,
                        pos_y: card.posY,
                        pos_x: card.posX,
                        from: card.from,
                        to: card.to,
                        idStr: card.dmid,
                    });
                },
            });
        }
        return this.reserve;
    }
    private initAnswer() {
        if (!this.answer) {
            this.answer = new Answer({
                container: this.player.template.videoInnerWrap,
                ppx: this.player.prefix,
                aid: this.player.config.aid,
                visible: this.player.state.danmaku,
                dragFlag: this.isEditor,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                pause: () => {
                    this.player.pause();
                },
                login: () => {
                    if (!this.player.user.status().login) {
                        this.player.quicklogin.load();
                        return '';
                    }
                    return this.player.user.status().uid!;
                },
                track: (name, params) => {
                },
                tips: (tips) => {
                    this.ioError(undefined, tips);
                },
                iframe: () => {
                    if (this.player.state.mode === STATE.UI_FULL) {
                        this.player.exitFullScreen();
                    }
                },
            });
        }
        return this.answer;
    }
    private reserveClick(card?: IReserve) {
        if ((card?.live && card?.liveState) || card?.state) {
            if (card.jump) {
                this.player.pause();
                window.open(card.jump);
            }
        } else {
            // 登录太判断
            const status = this.player.user.status();
            if (!status.login) {
                return this.player.quicklogin.load();
            }
            if (String(card?.mid) === status.uid) {
                this.ioError(undefined, '不能对自己进行此操作');
                return;
            }
            this.reserveAjax = new ApiReserve({
                sid: card?.reserveId!,
                mid: +status.uid!,
                reserve: !card?.userState,
            }).getData({
                success: (result: ApiReserveOutData) => {
                    this.reserveAjax = null;
                    if (result && result.code === 0) {
                        if (card?.userState) {
                            card.count--;
                            this.ioError(undefined, '已取消预约');
                        } else {
                            card!.count++;
                            const msg = card?.liveLottery
                                ? '已预约，抽奖信息见私信'
                                : `预约成功，${card?.live ? '会在开始时提醒您' : 'UP主更新会通知您'}`;
                            this.ioError(undefined, msg);
                        }
                        card!.userState = !card?.userState;
                        this.reserve.renderInfo();
                        this.reserve.animate(card!.userState);
                    } else {
                        this.ioError(undefined, result?.message || '请求失败');
                    }
                },
                error: (err: any) => {
                    this.reserveAjax = null;
                    this.ioError(undefined, err?.message || '请求失败');
                },
            });
        }
    }
    // 加载音效
    startEffect(show = false) {
        if (
            !browser.supportAudioContext ||
            (this.player.flvPlayer && this.player.flvPlayer.type !== 'FlvPlayer')
        ) {
            return;
        }
        if (!this.audioEffect) {
            if (show) {
                this.initEffect();
                (<any>this.audioEffect)?.showPanel({ container: this.player.template.playerWrap[0] });
            } else {
                // 所有值都为默认值不初始化
                const data = this.player.get('setting_config', 'audioEffect');
                if (!data) return;
                if (data.custom && data.right === 'default') return;
                if (!data.custom && data.left === 'default' && data.gain === 0) return;

                this.initEffect();
            }
        } else {
            if (show) {
                this.audioEffect.showPanel({ container: this.player.template.playerWrap[0] });
            }
        }
        if (this.audioEffect && !this.audioTrack.once) {
            this.audioTrack.time = +new Date();
            this.audioTrack.vTime = this.player.currentTime()!;
            this.audioTrack.timer = window.setTimeout(() => {
                this.track();
            }, 1000);
        }
    }
    hideEffect() {
        this.audioEffect?.effectSelector.hide();
    }
    private initEffect() {
        if (!this.player.video) return this;
        const data = this.player.get('setting_config', 'audioEffect');
        this.audioEffect = new AudioEffect({
            data,
            theme: this.player.config.theme,
            container: this.player.template.playerWrap[0],
            mediaElement: this.player.video,
            paused: this.player.video.paused,
            localDate: (data: any) => {
                this.player.set('setting_config', 'audioEffect', data);
            },
            track: () => {
            },
        });
        return this;
    }
    /**
     *
     * @param upEggList 头部up主定制化弹幕特效
     */
    updataUpEgg(data: any) {
        if (!this.upEggDM) {
            this.upEggDM = new UpEggDM({
                container: this.player.template.videoInner.parentElement!,
                ppx: this.player.prefix,
                visible: this.player.state.danmaku,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                getOptions: () => {
                    return this.player.videoSettings;
                },
                videoSize: () => {
                    return {
                        w: this.player.video?.offsetWidth || 1,
                        h: this.player.video?.offsetHeight || 1,
                        vw: this.player.video?.videoWidth || 1,
                        vh: this.player.video?.videoHeight || 1,
                    };
                },
            });
        }
        this.upEggDM.add(data);
    }
    track() {
        if (this.audioTrack.once || !this.audioTrack.timer) return;

        clearTimeout(this.audioTrack.timer);
        this.audioTrack.timer = 0;
        const playbackRate = this.player.video.playbackRate;
        const rate =
            ((this.player.currentTime()! - this.audioTrack.vTime!) * 1000) / (+new Date() - this.audioTrack.time);
        const parseRate = Number(rate).toFixed(2);

        if (Number(parseRate) > playbackRate * 1.2) {
            let fps = 0;
            if (this.player.flvPlayer) {
                fps = parseInt((<any>this).player.flvPlayer.mediaInfo.fps, 10);
            }
            if (this.player.dashPlayer) {
                fps = parseInt(this.player.dashPlayer && <any>this.player.dashPlayer.getVideoInfo().mediaInfo.fps, 10);
            }
            const data = this.player.get('setting_config', 'audioEffect');

            this.audioTrack.once = true;
        }
    }
    updateOgvFollow(status: IUserStatusInterface) {
        this.player.directiveManager.on(WD.WP_USER_STATE_UPDATE.toString(), (e, received: IReceivedInterface) => {
            status.operation_card?.forEach((item: ISkipCard) => {
                if (item.seasonId === this.player.config.seasonId) {
                    item.status = received['data'].isFollow;
                    this.skipCard.updataButton(item);
                }
            });
        });
    }
    userLoaded(status: IUserStatusInterface) {
        if (!status.operation_card) return;
        this.skipCard = new SkipCard({
            container: this.player.template.playerWrap[0],
            prefix: this.player.prefix,
            list: status.operation_card,
            click: (item: ISkipCard) => {
                const trackInfo = JSON.stringify({
                    status: item.status,
                    label: item.label,
                    btn: item.button,
                    type: item.cardType,
                });
                if (item.cardType === 1) {
                    // 登录太判断
                    if (!this.player.user.status().login) {
                        return this.player.quicklogin.load();
                    }

                    let jumpData;
                    if (this.player.config.seasonId) {
                        jumpData = {
                            id: item.id,
                            oid_type: 1,
                            oid: this.player.config.episodeId,
                            action: !item.status ? 0 : 1,
                        };
                    } else {
                        jumpData = {
                            id: item.id,
                            oid_type: 2,
                            oid: this.player.config.cid,
                            pid: this.player.config.aid,
                            action: !item.status ? 0 : 1,
                        };
                    }
                    this.cardAjax = new ApiJumpCard(jumpData).getData({
                        success: (result: ApiJumpCardOutData) => {
                            if (result && result.code === 0) {
                                item.status = !item.status;
                                this.skipCard.updataButton(item);
                                if (item.bizType === 1) {
                                    if (item.seasonId === this.player.config.seasonId) {
                                        this.player.globalFunction.WINDOW_AGENT.callBangumiFollow?.(item.status);
                                    }
                                }
                            } else {
                                this.ioError(
                                    {
                                        key: 'skip_card_click_err',
                                        val: trackInfo,
                                    },
                                    result.message,
                                );
                            }
                        },
                        error: () => {
                            this.ioError({
                                key: 'skip_card_click_err',
                                val: trackInfo,
                            });
                        },
                    });
                } else {
                    this.player.pause();
                    this.player.window.open(item.link);
                }
            },
            show: (item: ISkipCard) => {
            },
        });
        this.updateOgvFollow(status);
    }

    showDm41(danmaku: any, hide: string, data: IActionStateInterface) {
        try {
            // https://info.bilibili.co/pages/viewpage.action?pageId=95154953
            const info: any = JSON.parse(base64.decode(hide));

            if (!this.foolsday) {
                const likeMode = new ThreeClick(this.player, {
                    type: 1,
                    dmid: danmaku.dmid,
                    three: (down) => {
                        this.foolsday?.pause(down);
                    },
                    complete: (over?: boolean) => {
                        this.foolsday?.complete(over);
                    },
                });

                this.foolsday = new Foolsday({
                    container: this.player.template.videoInnerWrap,
                    ppx: this.player.prefix,
                    like: likeMode.container,
                    visible: this.player.state.danmaku,
                    ctime: () => {
                        return this.player.currentTime()!;
                    },
                    track: () => {
                    },
                    getRange: (width: number) => {
                        const { speedsync, speedplus } = this.player.videoSettings.setting_config;
                        const { videospeed } = this.player.videoSettings.video_status;
                        const w = this.player.template.container.width()!;

                        return {
                            speed: ((width + 512) * speedplus * (speedsync ? videospeed : 1)) / 4.5,
                            width: w,
                        };
                    },
                    getFontsize: () => {
                        const { fullscreensync, fontsize } = this.player.videoSettings.setting_config;
                        return fontsize * (fullscreensync ? this.player.template.container.height()! / 440 : 1);
                    },
                    getUserState: () => {
                        const getActionState = this.player.globalFunction.WINDOW_AGENT.getActionState;
                        const data: IActionStateInterface =
                            typeof getActionState === 'function' ? getActionState() : null;
                        return data;
                    },
                });
            }
            this.foolsday.hide();
            setTimeout(() => {
                this.foolsday.show({
                    duration: 5,
                    text: danmaku.text,
                    icon: danmaku.icon,
                    middle: info.middle,
                    result: info.result,
                    userState: data,
                });
            }, 20);
        } catch (error) { }
    }
    private ioError(track?: { key: string; val: string }, text?: string) {
        new Tooltip({
            name: 'card',
            target: this.player.template.playerWrap,
            position: 'center-center',
            text: text || '网络错误',
            padding: [10, 20, 10, 20],
        });
    }
    // 加载烟花
    startBoom(list: any[]) {
        this.initBoom();
        this.dmBoom.add(list);
    }
    initBoom() {
        if (!this.dmBoom) {
            const state = this.player.videoSettings.setting_config || ({} as any);

            this.dmBoom = new DmBoom({
                container: this.player.template.playerWrap[0],
                ppx: this.player.prefix,
                duration: 3,
                speedplus: state.speedplus,
                fontsize: state.fontsize,
                opacity: state.opacity,
                fontfamily: state.fontfamily,
                visible: this.player.state.danmaku,
                ctime: () => {
                    return this.player.currentTime()!;
                },
                block: (dm: any) => {
                    return this.player.block.judgeWord(dm);
                },
                getState: () => {
                    return this.player.getState() === 'PLAYING';
                },
            });
        }
        return this.dmBoom;
    }
    clear() {
        this.dmBoom?.clear();
    }
    private events() {
        this.player.bind(STATE.EVENT.VIDEO_BEFORE_DESTROY, () => {
            this.destroy();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_PAUSE, () => {
            this.track();
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_SEEK, () => {
            clearTimeout(this.audioTrack.timer);
            this.audioTrack.timer = 0;
            this.foolsday?.hide();
            this.dmBoom?.seek();
        });
        this.player.bind(STATE.EVENT.VIDEO_RESIZE, () => {
            this.linkDM?.resize();
            this.reserve?.resize();
            this.answer?.resize();
            this.combo?.resize();
            this.foolsday?.resize();
            this.scoreDM?.resize();
            this.scoreSummary?.resize();
            this.upEggDM?.resize();
            this.clockIn?.resize();
            this.dmBoom?.resize();
        });
        this.player.bind(STATE.EVENT.VIDEO_PLAYER_RESIZE, () => {
            // 小窗的时候不展示互动弹幕,非小窗状态结合弹幕开关状态
            this.option('visible', this.player.state.mode !== STATE.UI_MINI && this.player.state.danmaku, true);
        });
        this.player.bind(STATE.EVENT.VIDEO_PROGRESS_UPDATE, (e: any, { currentTime: ctime }: any) => {
            this.skipCard?.timeUpdate(ctime);
            this.linkDM?.timeUpdate(ctime);
            this.reserve?.timeUpdate(ctime);
            this.answer?.timeUpdate(ctime);
            this.scoreDM?.timeUpdate(ctime);
            this.scoreSummary?.timeUpdate(ctime);
            this.upEggDM?.timeUpdate(ctime);
            this.clockIn?.timeUpdate(ctime);
        });
        this.player.bind(STATE.EVENT.VIDEO_MEDIA_ENDED, () => {
            this.dmBoom?.clear();
        });
    }
    destroy() {
        this.audioTrack = defaultTrack;
        this.linkDM?.delete();
        this.linkDM = <any>null;
        this.reserve?.delete();
        this.reserve = <any>null;
        this.answer?.delete();
        this.answer = <any>null;
        this.loadAdPromise = <any>null;
        this.skipCard?.dispose();
        this.foolsday?.dispose();
        this.dmBoom?.dispose();
        this.scoreDM?.dispose();
        this.scoreSummary?.dispose();
        this.upEggDM?.dispose();
        this.clockIn?.dispose();
    }

    exportAudioEffect() {
        if (this.audioEffect) {
            return this.audioEffect.effectSelector?.exportEffect();
        }
        return;
    }
    outAction(action: any) {
        const plugins = {
            grade: this.scoreDM,
        };
        for (const key in action) {
            plugins[<'grade'>key]?.outAction(action[key]);
        }
    }

    /**
     * 获取弹幕广告
     */
    getDmAd() {
        if ((<any>this).loadAdPromise) {
            return;
        }
        const { aid, cid } = this.player.config;
        this.loadAdPromise = dmAd({
            aid,
            oid: cid,
            mobi_app: 'pc',
            build: 10000,
            type: 1,
        });

        this.loadAdPromise.then((d: IOutDmAd) => {
            const list = d?.data;
            if (list?.length) {
                this.startAnswer(list);
            }
        });
    }
}

export default AllPlugins;
