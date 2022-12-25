import STATE, { SendFontSizeTuple, SendModeTuple, SendInputTuple, SendPoolTuple } from './state';
import URLS from '../io/urls';
import Player, { IReceivedInterface } from '../player';
import ApiUserStatusModify, {
    ApiUserStatusModifyInData,
    ApiUserStatusModifyOutData,
    IUserInfo,
} from '../io/api-user-status';
import { IPreRolls } from '../io/rebuild-player-extra-params';
import * as WD from '../const/webpage-directive';
import ApiView, { ApiViewOutData } from '../io/api-view';
import { ISkipCard } from '../plugins/skip-card';

export interface ISubtitleInterface {
    author_mid?: number;
    id: number;
    lan: string;
    subtitle_url: string;
    lan_doc: string;
}

export interface IViewPoint {
    logoUrl: any;
    imgUrl: any;
    type: number;
    from: number;
    to: number;
    content: string;
}

interface IPlayerIconInterface {
    url1: string;
    url2: string;
    hash1: string;
    hash2: string;
}

interface IInteractionHistory {
    node_id: number;
    title: string;
    cid: number;
}

interface IInteractionInfo {
    history_node?: IInteractionHistory;
    graph_version: number;
    msg: string;
    mark: number;
    need_reload?: number;
}

interface IPCDNLoader {
    flv?: {
        vendor?: string;
        group?: string;
        script_url?: string;
        labels?: any;
    };
    dash?: {
        vendor?: string;
        group?: string;
        script_url?: string;
        labels?: any;
    };
}

interface IGuideAttention {
    type: number;
    from: number;
    to: number;
    pos_x: number;
    pos_y: number;
}

interface IDanmakuConfInterface {
    color: number;
    fontsize: SendFontSizeTuple;
    initStatus: number;
    input: SendInputTuple;
    mode: SendModeTuple;
    pool: SendPoolTuple;
}

export interface IUserStatusInterface {
    ad?: IPreRolls; // 是否存在广告
    allow_bp?: boolean; // 是否允许承包 <- allow_bp
    block_time?: number; // 封禁天数 <- block_time
    chat_id?: number; // 视频cid <- cid
    has_next?: boolean; // 是否有下一个视频 <- has_next
    hash_id?: string; // uid加密后的hash串 <- login_mid_hash
    is_system_admin?: boolean; // 是否是系统管理员，由permission字段确认
    isadmin?: boolean; // 是否是该视频up <- is_owner
    permission?: string; // 登录用户rank值，特殊权限相关 <- permission
    lastcid?: number; // 上次观看视频的cid <- last_play_cid
    lastplaytime?: number; // 上次观看进度 <- last_play_time
    level?: number; // 登录用户等级信息 <- level_info.current_level
    login?: boolean; // 用户是否登录 <- login_mid
    moral?: number; // 节操值
    name?: string; // 用户名 <- name
    p_role?: number; // 用户身份,'1'协管 <- role
    role?: number; // 用户身份，由permission字段确认 0:未登录 1:受限制,2:已注册,3:正式用户,4:VIP,5:职人
    uid?: string; // 用户id <- login_mid
    vip_status?: number; // vip状态 <- vip.status
    vip_type?: number; // vip类型 <- vip.type
    subtitle?: {
        allow_submit: boolean;
        lan: string;
        lan_doc: string;
        subtitles: ISubtitleInterface[];
    }; // 视频字幕数据
    online_count?: number; // 在线人数 <- online_count
    pid?: number; // 当前分p是第几p <- page_no
    mask_new?: string; // 弹幕蒙版 <- dm_mask
    player_icon?: IPlayerIconInterface; // 视频进度拖动条上thumb的icon <- player_icon
    view_points?: IViewPoint[]; // 高能看点
    is_pay_preview?: boolean; // 是否为ugc付费预览视频 <- is_ugc_pay_preview
    preview_toast?: string; // ugc付费预览toast用 | 分割2个文案 <- preview_toast
    error?: boolean; // 获取信息失败，由level_info.current_level与login字段确认
    interaction?: IInteractionInfo; // 互动视频相关数据
    subtitle_submit_switch?: number; // 控制 添加字幕 按钮的点击策略，0 表示关闭投稿字幕功能 <- online_switch.subtitle_submit_switch
    answer_status?: number; // 用户答题状态：0：默认值；1：未答题；2：答题中；3:答题通过（结束） <- answer_status
    pugv_watch_status?: number; // 1：试看；2：非试看；3：5分钟预览 <- pugv.watch_status
    pugv_pay_status?: number; // 1：购买；2：未购买 <- pugv.pay_status
    pugv_season_status?: number; // 1：上架；2：下架 <- pugv.season_status
    pcdn_loader?: IPCDNLoader; // 透传视频云 <- pcdn_loader
    is_360?: boolean; // 是否为全景视频 <- options.is_360
    without_vip?: boolean; // 稿件高清晰度是否需要vip鉴权 <- options.without_vip
    guide_attentions?: IGuideAttention[]; // up主引导关注按钮配置参数
    operation_card?: ISkipCard[]; // 跳转卡片配置参数
    danmaku?: IDanmakuConfInterface; // 弹幕权限

    default_dm?: number; // 云推荐弹幕
}

class User {
    private player: Player;
    private userStatus!: IUserStatusInterface;
    private retry!: number;
    private initialized!: boolean;
    private loadAjax: any;

    constructor(player: Player) {
        this.player = player;
        this.init();
        this.registerListener();
    }

    init() {
        this.userStatus = { login: true };
        this.retry = 3;
        this.initialized = false;
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, () => {
            this.destroy();
        });
    }
    private registerListener() {
        this.player.bind(STATE.EVENT.VIDEO_DESTROY, this.destroy.bind(this));
        // 225001
        this.player.directiveManager.on(WD.AI_RETRIEVE_DATA.toString(), (e, received: IReceivedInterface) => {
            this.player.userLoadedCallback(status => {
                this.player.directiveManager.responder(received, status);
            });
        });
    }
    status(): IUserStatusInterface {
        return this.userStatus;
    }
    destroy() {
        this.loadAjax && this.loadAjax.abort();
    }

    load(callback?: Function) {
        const that = this;
        let url = '';
        if (this.player.config.bvid) {
            url =
                URLS.PLAYER +
                '?cid=' +
                that.player.config.cid +
                '&bvid=' +
                that.player.config.bvid +
                '&aid=' +
                that.player.config.aid;
        } else {
            url = URLS.PLAYER + '?cid=' + that.player.config.cid + '&aid=' + that.player.config.aid;
        }
        this.player.trigger(STATE.EVENT.VIDEO_PLAYER_LOAD);
        let data: ApiUserStatusModifyInData = {
            cid: that.player.config.cid,
            aid: that.player.config.aid,
            bvid: that.player.config.bvid,
            graph_version: that.player.interactive,
        };
        if (this.player.config.bvid) {
            // delete data.aid;
        } else {
            delete (<any>data).bvid;
        }
        if (this.player.config.seasonId) {
            data.season_id = this.player.config.seasonId;
        }
        this.loadAjax = new ApiUserStatusModify(data).getData({
            success: (result: ApiUserStatusModifyOutData) => {
                if (that.player.destroyed) {
                    return;
                }
                if (result && result.code === 0 && result.data) {
                    const data = result.data;
                    that.player.eventLog.log(`\r\n${JSON.stringify(data)}\r\n`, 3);
                    this.user(data, callback);
                } else {
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYER_ERROR,
                        STATE.PLAYER_FORM_ERROR,
                        'form error,' + 'url:' + url,
                    );
                    that.user(null, callback);
                }
            },
            error: (xhr: JQuery.jqXHR<any>) => {
                if (that.player.destroyed) {
                    return;
                }
                if (that.retry > 0) {
                    setTimeout(() => {
                        that.retry--;
                        that.load(callback);
                    }, 500);
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYER_ERROR,
                        STATE.PLAYER_NETWORK_ERROR,
                        (xhr && xhr.status ? 'status:' + xhr.status + ',' : '') + 'url:' + url,
                    );
                } else {
                    that.player.trigger(
                        STATE.EVENT.VIDEO_MEDIA_ERROR,
                        STATE.PLAYER_ERROR,
                        STATE.PLAYER_NETWORK_ERROR,
                        (xhr && xhr.status ? 'status:' + xhr.status + ',' : '') + 'url:' + url,
                    );
                    that.user(null, callback);
                }
            },
        });
    }
    reload(callback?: Function) {
        this.userStatus = { login: true };
        this.retry = 3;
        this.initialized = false;
        this.load(callback);
    }
    addCallback(callback: (info: IUserStatusInterface) => void) {
        if (typeof callback === 'function') {
            this.player.userLoadedCallbacks.push(callback);
            if (this.initialized) {
                callback(this.userStatus);
            }
        }
    }

    private parse(data: IUserInfo | null): IUserStatusInterface {
        return {
            allow_bp: !!data?.allow_bp,
            block_time: data?.block_time ?? 0,
            chat_id: data?.cid ?? 0,
            has_next: !!data?.has_next,
            hash_id: data?.login_mid_hash ?? '',
            isadmin: !!data?.is_owner,
            permission: data?.permission ?? '',
            lastcid: data?.last_play_cid ?? 0,
            lastplaytime: data?.last_play_time ?? 0,
            login: !!(data?.login_mid ?? true),
            name: data?.name ?? '',
            p_role: +(data?.role ?? ''),
            uid: String(data?.login_mid ?? ''),
            subtitle: data?.subtitle,
            online_count: data?.online_count ?? 0,
            pid: data?.page_no ?? 0,
            mask_new: JSON.stringify(data?.dm_mask),
            player_icon: data?.player_icon,
            view_points: data?.view_points,
            is_pay_preview: !!data?.is_ugc_pay_preview,
            preview_toast: data?.preview_toast ?? '',
            subtitle_submit_switch: +(data?.online_switch?.subtitle_submit_switch ?? 1),
            answer_status: data?.answer_status ?? 0,
            pugv_watch_status: data?.pugv?.watch_status ?? 0,
            pugv_pay_status: data?.pugv?.pay_status ?? 0,
            pugv_season_status: data?.pugv?.season_status ?? 0,
            pcdn_loader: data?.pcdn_loader,
            is_360: !!data?.options?.is_360,
            without_vip: !!data?.options?.without_vip,
            guide_attentions: data?.guide_attention,
        };
    }

    private user(data: IUserInfo | null, callback?: Function) {
        this.userStatus = this.parse(data);
        const levelInfo = data?.level_info ?? {};
        const vip = data?.vip ?? {
            type: 0,
            status: 0,
        };
        this.userStatus.interaction = data?.interaction;
        if (!this.userStatus.view_points && this.player.config.lightWeight) {
            this.userStatus.view_points = [];
        }
        if (typeof levelInfo['current_level'] === 'undefined' && this.userStatus.login) {
            this.userStatus.level = 3;
            this.userStatus.error = true;
        } else {
            this.userStatus.level = levelInfo['current_level'];
        }
        //后台审核轻量播放器去除清晰度鉴权，模拟大会员状态
        if (this.player.config.inner) {
            this.userStatus.vip_type = 2;
            this.userStatus.vip_status = 1;
            this.userStatus.login = true;
        } else {
            this.userStatus.vip_type = vip.type;
            this.userStatus.vip_status = vip.status;
        }
        this.userStatus.is_system_admin = false;
        this.userStatus.role = this.userStatus.login ? this._role(this.userStatus.permission!) : STATE.USER_UNLOGIN;
        this.userStatus.moral = this._getMoral();
        if (this.player.config.playerType === 0) {
            this.player.config.hasNext = this.player.config.listLoop || this.userStatus.has_next!;
        }
        if (this.player.config.disableInteractive) {
            this.player.interactive = undefined;
        } else if (this.player.config.interactivePreview) {
            this.player.interactive = 1;
        } else if (this.player.config.interactiveGraphId && this.player.config.interactiveNode) {
            this.userStatus.interaction = {
                graph_version: Number(this.player.config.interactiveGraphId),
                msg: '',
                mark: this.userStatus.interaction!.mark,
            };
            this.player.interactive = Number(this.player.config.interactiveGraphId);
            this.player.interactiveVideoConfig && (this.player.interactiveVideoConfig.interactiveLastPart = false);
        } else if (this.userStatus.interaction) {
            try {
                let interaction = this.userStatus.interaction;
                if (interaction && interaction.graph_version) {
                    if (this.player.interactive) {
                        if (Number(interaction.need_reload) === 1) {
                            this.player.toast.addBottomHinter({
                                restTime: 3,
                                restTimeShow: false,
                                text: interaction.msg,
                                defaultCallback: () => {
                                    this.player.interactive = interaction.graph_version;
                                    this.player.interactiveVideo!.replay(this.player.interactive);
                                },
                            });
                        }
                    } else {
                        this.player.interactive = interaction.graph_version;
                        this.player.interactiveVideoConfig &&
                            (this.player.interactiveVideoConfig.interactiveLastPart = false);
                    }
                } else {
                    this.player.interactive = undefined;
                }
            } catch (e) {
                this.player.interactive = undefined;
            }
        }
        const jumpCard = data?.operation_card;
        if (jumpCard && !this.player.interactive) {
            this.userStatus.operation_card = jumpCard.map((item) => {
                const card = <ISkipCard>{
                    id: item.id,
                    from: item.from,
                    to: item.to,
                    status: item.status,
                    cardType: item.card_type,
                    bizType: item.biz_type,
                };
                if (item.card_type === 1) {
                    card.title = item.standard_card?.title;
                    card.buttonTitle = item.standard_card?.button_title;
                    card.buttonSelectedTitle = item.standard_card?.button_selected_title;
                    card.showSelected = item.standard_card?.show_selected;
                    card.seasonId = item.param_follow?.season_id;
                    card.activityId = item.param_reserve?.activity_id;
                } else {
                    card.icon = item.skip_card?.icon?.replace('http://', '//') || '';
                    card.label = item.skip_card?.label;
                    card.content = item.skip_card?.content;
                    card.button = item.skip_card?.button;
                    card.link = item.skip_card?.link;
                }
                return card;
            });
        }
        this.player.trigger(STATE.EVENT.VIDEO_PLAYER_LOADED);
        if (this.player.config.preAd) {
            const paster = this.player.extraParams && this.player.extraParams.paster;
            if (paster && paster['cid'] && !this.player.config.lightWeight) {
                this._get_ad_data(paster, callback!);
            } else {
                this.finish(callback);
            }
        } else {
            this.finish(callback);
        }
    }
    private _get_ad_data(data: IPreRolls, callback: Function) {
        const adData = data;
        const that = this;
        const d = {
            aid: adData['cid']!,
            bvid: adData['bvid']!,
        };
        // In this case, ignore bvid.
        // if (this.player.config.bvid) {
        //     delete d.aid;
        // } else {
        //     delete d.bvid;
        // }
        new ApiView(d).getData({
            success: (json: ApiViewOutData) => {
                if (json && json.cid) {
                    adData['aid'] = adData['cid'];
                    adData['cid'] = json.cid;
                    that.userStatus.ad = adData;
                    that.finish(callback);
                } else {
                    that.finish(callback);
                }
            },
            error: () => {
                that.finish(callback);
            },
        });
    }

    private _role(permission: string) {
        if (permission) {
            const permissions = permission.split(',');
            if (permissions.length === 0 || permissions.indexOf('9999') !== -1) {
                return STATE.USER_LIMITED;
            } else if (permissions.indexOf('5000') !== -1) {
                return STATE.USER_REGISTERED;
            } else if (
                permissions.indexOf('20000') !== -1 ||
                permissions.indexOf('32000') !== -1 ||
                permissions.indexOf('31300') !== -1
            ) {
                this.userStatus.is_system_admin =
                    permissions.indexOf('32000') !== -1 || permissions.indexOf('31300') !== -1;
                return STATE.USER_ADVANCED;
            } else if (permissions.indexOf('30000') !== -1 || permissions.indexOf('25000') !== -1) {
                return STATE.USER_VIP;
            } else {
                return STATE.USER_NORMAL;
            }
        } else {
            return STATE.USER_NORMAL;
        }
    }
    private _getMoral() {
        if (window['userStatus'] && typeof window['userStatus'].status === 'function') {
            return window['userStatus'].status() ? window['userStatus'].status()['moral'] : 70;
        } else {
            return 70;
        }
    }
    private finish(callback?: Function) {
        this.initialized = true;
        this.loadCallback();
        if (!this.player.initialized) {
            this.player.loadingpanel.complete(1, true);
        }
        if (typeof callback === 'function') {
            callback(this.status);
        }
        if (window['BILIMessage']) {
            const data = {
                type: 'login',
                value: this.userStatus.login,
            };
            window['BILIMessage'](JSON.stringify(data));
        }
    }
    private loadCallback() {
        // 删选用户权限
        this._initStatusDanmaku();

        for (let i = 0; i < this.player.userLoadedCallbacks.length; i++) {
            this.player.userLoadedCallbacks[i](this.userStatus);
        }
    }

    private _initStatusDanmaku() {
        const status = this.userStatus;
        const level = status.level;
        const config = {
            pool: STATE.SEND_POOL_NORMAL,
            mode: STATE.SEND_MODE_UNLOGIN,
            fontsize: STATE.SEND_FONT_SIZE_UNLOGIN,
            color: STATE.SEND_COLOR_UNLOGIN,
            initStatus: STATE.SEND_STATUS_NORMAL,
            input: STATE.SEND_INPUT_UNLOGIN,
        };
        let fontsizeExtra: SendFontSizeTuple;
        let modeExtra: SendModeTuple;

        // pool
        if (status.isadmin || status.is_system_admin) {
            config.pool = STATE.SEND_POOL_ADMIN;
            fontsizeExtra = STATE.SEND_FONT_SIZE_ADMIN;
        }

        // role
        switch (status.role) {
            case STATE.USER_UNLOGIN:
                break;
            case STATE.USER_LIMITED:
                config.fontsize = STATE.SEND_FONT_SIZE_LIMITED;
                config.mode = STATE.SEND_MODE_LIMITED;
                config.initStatus = STATE.SEND_STATUS_LIMITED;
                config.input = STATE.SEND_INPUT_LIMITED;
                break;
            case STATE.USER_REGISTERED:
                config.fontsize = STATE.SEND_FONT_SIZE_REGISTERED;
                config.mode = STATE.SEND_MODE_REGISTERED;
                config.input = STATE.SEND_INPUT_REGISTERED;
                break;
            case STATE.USER_NORMAL:
                config.fontsize = STATE.SEND_FONT_SIZE_NORMAL;
                config.mode = STATE.SEND_MODE_NORMAL;
                config.input = STATE.SEND_INPUT_NORMAL;
                break;
            case STATE.USER_VIP:
                config.pool = STATE.SEND_POOL_ADMIN;
                config.fontsize = STATE.SEND_FONT_SIZE_VIP;
                config.mode = STATE.SEND_MODE_VIP;
                config.input = STATE.SEND_INPUT_VIP;
                break;
            case STATE.USER_ADVANCED:
                config.pool = STATE.SEND_POOL_ADMIN;
                config.fontsize = STATE.SEND_FONT_SIZE_ADVANCED;
                config.mode = STATE.SEND_MODE_ADVANCED;
                config.input = STATE.SEND_INPUT_ADVANCED;
                break;
            default:
                break;
        }

        // level
        switch (true) {
            case level === 0:
                modeExtra = STATE.SEND_MODE_LEVEL_LOW;
                config.color = STATE.SEND_COLOR_LEVEL_LOW;
                config.initStatus = STATE.SEND_STATUS_LEVEL_LOW;
                break;
            case level === 1:
                modeExtra = STATE.SEND_MODE_LEVEL_LOW;
                config.color = STATE.SEND_COLOR_LEVEL_LOW;
                break;
            case level === 2:
                modeExtra = STATE.SEND_MODE_LEVEL_TWO;
                config.color = STATE.SEND_COLOR_NORMAL;
                break;
            case level! >= 3:
                modeExtra = STATE.SEND_MODE_LEVEL_NORMAL;
                config.color = STATE.SEND_COLOR_NORMAL;
                break;
            default:
                break;
        }

        // blocking
        if (status.block_time! > 0) {
            config.initStatus = STATE.SEND_STATUS_BLOCKING;
        }

        // blocked
        if (status.block_time! < 0) {
            config.initStatus = STATE.SEND_STATUS_BLOCKED;
        }

        // (已下架，已购买提示)已下架
        if (status.pugv_season_status === 2 && status.pugv_pay_status === 1) {
            config.initStatus = STATE.SEND_STATUS_CANNOT_BUY;
        }
        // moral
        if (status.moral! < 60) {
            config.initStatus = STATE.SEND_STATUS_MORAL_LOW;
        }
        // answer 等级优先
        if (status.answer_status === 2 && !level) {
            config.initStatus = STATE.SEND_ANSWER_STATUS_IN;
        }
        // login
        if (!status.login) {
            config.color = STATE.SEND_COLOR_UNLOGIN;
            config.initStatus = STATE.SEND_STATUS_UNLOGIN;
        }
        // extra font size ∪ config font size
        fontsizeExtra! &&
            config.fontsize.forEach((val: number, index: number, arr: any) => {
                arr[index] = arr[index] || fontsizeExtra[index];
            });
        // extra mode ∪ config mode
        modeExtra! &&
            config.mode.forEach((val: number, index: number, arr: any) => {
                arr[index] = modeExtra[index] === 1 || arr[index] === 1 ? 1 : arr[index];
            });
        this.userStatus.danmaku = config;
    }
}

export default User;
