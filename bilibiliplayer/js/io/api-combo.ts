import Api, { IApiConfig } from './api';

// module -> api-in
export interface IComboIn {
    url: string;
}

export default class ApiCombo extends Api {
    constructor(data: IComboIn) {
        super(data);
    }

    getData(config: IApiConfig): XMLHttpRequest {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', this.data.url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            config.success?.(xhr['response']);
        };
        xhr.onerror = (error: any) => {
            config.error?.(error);
        };
        xhr.send();
        return xhr;
    }
}
