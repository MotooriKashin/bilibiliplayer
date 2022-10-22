/**
 * User relation opt api
 *
 * @class ApiReportHeatBeat
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';
import URLS from './urls';

// module -> api-in
interface IInData {
    aid: number | undefined;
    cid: number;
    mid: string;
    csrf: string;
    playedTime: number;
    realPlayedTime: number;
    realtime: number;
    startTs: number;
    type: number;
    subType?: number;
    epid?: number;
    sid?: number;
    dt: number;
    playType: number;
    playlistId?: number;
    playlistType?: number;
    noHistory?: number; // 上报后是否保存历史记录：1-不保存；0或无该字段时保存
    autoContinuedPlay?: number;
    referUrl?: string;
    bsource?: string;
}

// api-in -> server-request
interface IRequestData {
    aid: number | undefined;
    cid: number;
    mid: string;
    csrf: string;
    played_time: number;
    real_played_time: number;
    realtime: number;
    start_ts: number;
    type: number;
    sub_type?: number;
    epid?: number;
    sid?: number;
    dt: number;
    play_type: number;
    playlist_id: number;
    playlist_type?: number;
    no_history?: number;
    auto_continued_play?: number;
    refer_url?: string;
    bsource?: string;
}

// server-response -> api-out

// api-out -> module

class ApiReportHeartBeat extends Api {
    constructor(data: IInData) {
        super(data);
    }

    getData(config: IApiConfig): void {
        const data: IRequestData = this.convertUpload(this.data);
        $.ajax({
            url: URLS.X_REPORT_HEARTBEAT,
            type: 'post',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
            beforeSend: (xhr: JQuery.jqXHR<any>) => {
                if (typeof config.beforeSend === 'function') {
                    config.beforeSend(xhr);
                }
            },
            success: () => {
                typeof config.success === 'function' && config.success();
            },
            error: (err: JQuery.jqXHR<any>) => {
                typeof config.error === 'function' && config.error(err);
            },
        });
    }

    private convertUpload(data: IInData): IRequestData {
        const requestData: IRequestData = {
            aid: data.aid,
            cid: data.cid,
            mid: data.mid,
            csrf: data.csrf,
            played_time: data.playedTime,
            real_played_time: data.realPlayedTime,
            realtime: data.realtime,
            start_ts: data.startTs,
            type: data.type,
            dt: data.dt,
            play_type: data.playType,
            playlist_id: data.playlistId!,
            auto_continued_play: data.autoContinuedPlay,
            refer_url: data.referUrl,
            bsource: data.bsource,
        };
        if (data.subType) {
            requestData['sub_type'] = data.subType;
        }
        if (data.epid) {
            requestData['epid'] = data.epid;
        }
        if (data.sid) {
            requestData['sid'] = data.sid;
        }
        if (data.noHistory) {
            requestData['no_history'] = data.noHistory;
        }
        if (data.playlistType) {
            requestData['playlist_type'] = data.playlistType;
        }
        return requestData;
    }
}

export { IInData as ApiReportHeartBeatInData };
export default ApiReportHeartBeat;
