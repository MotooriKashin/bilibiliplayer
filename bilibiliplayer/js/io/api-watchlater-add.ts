/**
 * @author Hellcom
 */
import Api, { IApiConfig } from './api';
import URLS from './urls';

export interface IOutData {
    code: number;
    message?: string;
}

export default class extends Api {
    constructor(private aid: number, private bvid?: string) {
        super();
        this.aid = aid;
        this.bvid = bvid;
    }

    private convertUpload() {
        if (this.bvid) {
            return {
                jsonp: 'jsonp',
                bvid: this.bvid,
            };
        }
        return {
            jsonp: 'jsonp',
            aid: this.aid,
        };
    }

    getData(config: IApiConfig) {
        const sendData = this.convertUpload();
        $.ajax({
            url: URLS.TOVIEW_ADD,
            type: 'POST',
            data: sendData,
            xhrFields: {
                withCredentials: true,
            },
            dataType: 'json',
        })
            .done(function (json) {
                if (typeof config.success === 'function') {
                    const result: IOutData | null = json
                        ? {
                            code: json['code'],
                            message: json['message'],
                        }
                        : null;
                    config.success(result);
                }
            })
            .fail(function () {
                if (typeof config.error === 'function') {
                    config.error();
                }
            })
            .always(function () {
                if (typeof config.complete === 'function') {
                    config.complete();
                }
            });
    }
}
