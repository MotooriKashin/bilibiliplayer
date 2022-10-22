/**
 * A solution to solve camelCase standard and compress problem
 * base api class for all api i/o process
 */

/**
 * ajax request callback options
 *
 * @export
 */
export interface IApiConfig {
    success?: Function;
    error?: Function;
    beforeSend?: Function;
    complete?: Function;
    url?: string;
}

abstract class Api {
    protected data: any;

    /**
     * Receive module-in data typeof detailed-api module-in type
     */
    constructor(data?: any) {
        this.data = data;
    }

    /**
     * Implement GetData function in detailed-api class
     */
    abstract getData(config: IApiConfig): void;
}

export default Api;
