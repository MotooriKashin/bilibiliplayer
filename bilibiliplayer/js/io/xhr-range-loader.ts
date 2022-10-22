import Api, { IApiConfig } from './api';
interface IInData {
    url: string;
    withCredentials: boolean;
    range: string;
}

// api-in -> server-request
interface IRequestData {
    url: string;
    range: string;
    withCredentials?: boolean;
}

// Universal IO Loader, implemented by adding Range header in xhr's request header
class RangeLoader extends Api {
    xhr: any;

    constructor(data: IInData) {
        super(data);
    }
    getData(config: IApiConfig) {
        const data: IRequestData = this.convertUpload(this.data);
        let xhr = (this.xhr = new XMLHttpRequest());
        xhr.open('GET', data.url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            config.success?.(xhr['response']);
        };
        xhr.onerror = (error: any) => {
            config.error?.(error);
        };
        if (data.withCredentials) {
            xhr.withCredentials = true;
        }
        if (data.range) {
            xhr.setRequestHeader('range', data.range);
        }
        xhr.send();
        return this;
    }

    abort() {
        if (this.xhr) {
            this.xhr.onload = null;
            this.xhr.onerror = null;
            this.xhr.abort();
            this.xhr = null;
        }
    }

    private convertUpload(data: IInData): IRequestData {
        return {
            url: data.url,
            withCredentials: data.withCredentials,
            range: data.range,
        };
    }
}

export { IInData as ApiRangeInData };
export default RangeLoader;
