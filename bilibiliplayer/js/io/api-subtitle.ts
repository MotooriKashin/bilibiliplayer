/**
 * User relation opt api
 *
 * @description
 * @class ApiSubtitle
 * @extends {Api}
 */

import Api, { IApiConfig } from './api';

// server-response -> api-out
interface IResponseData {
    font_size: number;
    font_color: string;
    background_alpha: number;
    background_color: string;
    Stroke: string;
    body: {
        from: number;
        to: number;
        location: number;
        content: string;
    }[];
}

// api-out -> module
interface IOutData {
    fontSize: number;
    fontColor: string;
    backgroundAlpha: number;
    backgroundColor: string;
    stroke: string;
    body: ISubtitleBodyInterface[];
}

export interface ISubtitleBodyInterface {
    from?: number;
    to?: number;
    location?: number;
    content: string;
}

class ApiSubtitle extends Api {
    constructor(data: string) {
        super(data);
    }

    getData(config: IApiConfig): JQuery.jqXHR<any> {
        return $.ajax({
            url: this.data,
            type: 'get',
            dataType: 'json',
            cache: true,
            success: (result: IResponseData) => {
                config.success?.(this.convertResult(result));
            },
            error: (err: JQuery.jqXHR<any>) => {
                config.error?.(err);
            },
        });
    }

    private convertResult(result: IResponseData): IOutData {
        const body = result['body'].map((item) => ({
            from: item['from'],
            to: item['to'],
            location: item['location'],
            content: item['content'],
        }));
        return {
            fontSize: result['font_size'],
            fontColor: result['font_color'],
            backgroundAlpha: result['background_alpha'],
            backgroundColor: result['background_color'],
            stroke: result['Stroke'],
            body,
        };
    }
}

export { IOutData as ApiSubtitleOutData };
export default ApiSubtitle;
