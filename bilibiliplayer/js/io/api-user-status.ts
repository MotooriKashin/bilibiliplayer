/**
 * User relation opt api
 *
 * @description
 * @class ApiUserStatusModify
 * @extends {Api}
 */

import { ISkipCard } from '../plugins/skip-card';
import Api, { IApiConfig } from './api';
import URLS from './urls';

interface ISubtitleItem {
    id: number;
    lan: string;
    lan_doc: string;
    is_lock: boolean;
    author_mid?: number;
    subtitle_url: string;
}

interface IViewPoint {
    type: number;
    from: number;
    to: number;
    content: string;
}

interface IGuideAttention {
    type: number;
    from: number;
    to: number;
    pos_x: number;
    pos_y: number;
}

interface IUserInfo {
    aid: number;
    bvid: string;
    cid: number;
    allow_bp: boolean;
    no_share: boolean;
    page_no: number;
    has_next: boolean;
    login_mid: number;
    login_mid_hash: string;
    is_owner: boolean;
    name: string;
    permission: string;
    level_info: {
        current_level?: number;
        current_min?: number;
        current_exp?: number;
        next_exp?: number;
    };
    vip: {
        type: number;
        status: number;
        due_date?: number;
        vip_pay_type?: number;
    };
    answer_status: number;
    block_time: number;
    role: string;
    last_play_time: number;
    last_play_cid: number;
    online_count: number;
    dm_mask?: {
        fps: number;
        mask_url: string;
    };
    subtitle?: {
        allow_submit: boolean;
        lan: string;
        lan_doc: string;
        subtitles: ISubtitleItem[];
    };
    player_icon?: {
        url1: string;
        hash1: string;
        url2: string;
        hash2: string;
    };
    view_points?: IViewPoint[];
    is_ugc_pay_preview?: boolean;
    preview_toast?: string;
    interaction?: {
        history_node?: {
            node_id: number;
            title: string;
            cid: number;
        };
        graph_version: number;
        msg: string;
        mark: number;
        need_reload?: number;
    };
    pugv?: {
        watch_status: number;
        pay_status: number;
        season_status: number;
    };
    pcdn_loader?: {
        flv?: {
            vendor?: string;
            script_url?: string;
            group?: string;
            labels?: any;
        };
        dash?: {
            vendor?: string;
            script_url?: string;
            group?: string;
            labels?: any;
        };
    };
    options?: {
        is_360?: boolean;
        without_vip?: boolean;
    };
    guide_attention?: IGuideAttention[];
    jump_card?: ISkipCard[];
    online_switch?: {
        subtitle_submit_switch: string;
    };
    operation_card?: IOperationCard[];
    fawkes?: {
        config_version?: number;
        ff_version?: number;
    };
    show_switch?: IShowSwitchConfig;
}

interface IShowSwitchConfig {
    online?: boolean; // 是否显示在线人数
    long_progress?: boolean; // 是否展示精度变化进度条
}

interface IOperationCard {
    id?: number;
    from?: number;
    to?: number;
    status?: boolean;
    card_type?: number;
    biz_type?: number;
    standard_card?: {
        title?: string;
        button_title?: string;
        button_selected_title?: string;
        show_selected?: boolean;
    };
    param_follow?: {
        season_id?: number;
    };
    param_reserve?: {
        activity_id?: number;
    };
    skip_card?: ISkipCard;
}

interface IInData {
    cid: number; // 视频cid
    aid: number; // 视频aid
    bvid: string;
    graph_version?: number;
    season_id?: number;
}

interface IOutData {
    code: number;
    message: string;
    ttl?: number;
    data?: IUserInfo;
}

class ApiUserStatusModify extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): JQuery.jqXHR<any> {
        return $.ajax({
            url: URLS.PLAYER,
            type: 'get',
            data: {
                cid: this.data.cid,
                aid: this.data.aid,
                bvid: this.data.bvid,
                season_id: this.data.season_id,
                graph_version: this.data.graph_version,
            },
            xhrFields: {
                withCredentials: true,
            },
            success: (result: IOutData) => {
                config.success?.(result);
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }
}

export { IInData as ApiUserStatusModifyInData, IOutData as ApiUserStatusModifyOutData, IUserInfo };
export default ApiUserStatusModify;
