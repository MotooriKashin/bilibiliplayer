interface ITestMedia {
    type: string;
    url: string;
    id: number;
    bandWidth: number;
    range: string;
}

interface ITestResult {
    connectTime: number;
    downloadTime: number;
    speed: number;
}

export interface IReportData {
    connectionTime: number;
    downloadTime: number;
    speed: number;
    bandWidth: number;
    url: string;
    range: string;
    id: number;
    message: string;
}

export interface IConfig {
    timeout?: number;
    defaultData: number;
    onProgress: Function;
}

export default class SpeedTester {
    config: IConfig;
    urlList: Array<ITestMedia>;
    reportList: Array<IReportData>;
    xhr!: XMLHttpRequest;
    dashPlayer: any;

    index: number;
    aborting!: boolean;
    starting!: boolean;
    timer!: number;

    constructor(config: IConfig) {
        this.config = config;
        this.urlList = [];
        this.reportList = [];
        this.index = 0;

        this.dashPlayer = window['dashPlayer'];
        if (this.dashPlayer && this.dashPlayer.state) {
            try {
                this.getCurrentUrl(this.dashPlayer, 'video');
                this.getCurrentUrl(this.dashPlayer, 'audio');
                this.getFullUrl(this.dashPlayer, 'video');
                this.getFullUrl(this.dashPlayer, 'audio');
            } catch (e) {
                console.warn(e);
            }
        } else if (window.player && window.player.getPlayurl()) {
            this.urlList.push({
                type: 'video',
                url: window.player.getPlayurl(),
                bandWidth: 0,
                id: 0,
                range: `0-${this.config.defaultData}`,
            });
        }
    }

    private getCurrentUrl(dashPlayer: any, type: string) {
        const statisticsInfo = dashPlayer.state.statisticsInfo;
        const mediaInfo = dashPlayer.state.mediaInfo;
        const segmentsInfoMap = dashPlayer.state.segmentsInfoMap;
        const qualityNumberMap = dashPlayer.state.qualityNumberMap[type];
        const currentQualityIndex = dashPlayer.state.currentQualityIndex[type];
        let currentId = 0;
        for (let i in qualityNumberMap) {
            if (qualityNumberMap[i] === currentQualityIndex) {
                currentId = Number(i);
            }
        }
        const segment =
            segmentsInfoMap[type].segments[statisticsInfo[`${type}CurrentSegmentIndex`]] ||
            segmentsInfoMap[type][statisticsInfo[`${type}CurrentSegmentIndex`] - 1];
        let config = {
            type: type,
            url: statisticsInfo[`${type}URL`],
            bandWidth: mediaInfo[`${type}DataRate`],
            id: currentId,
            range: segment ? segment.mediaRange || `0-${this.config.defaultData}` : `0-${this.config.defaultData}`,
        };
        this.urlList.push(config);
    }

    private getFullUrl(dashPlayer: any, type: string) {
        const qualityNumberMap = dashPlayer.state.qualityNumberMap[type];
        const list = dashPlayer.state.mpd[type];
        const currentIndex = dashPlayer.state.segmentsInfoMap[type].qualityIndex;
        for (let i in list) {
            if (
                qualityNumberMap[list[i].id] !== currentIndex &&
                ((list[i].codecid === 7 && type === 'video') || type === 'audio')
            ) {
                this.urlList.push({
                    type: type,
                    url: list[i].baseUrl,
                    bandWidth: list[i].bandwidth,
                    id: list[i].id,
                    range: `0-${this.config.defaultData}`,
                });
            }
        }
    }

    trans(num: number) {
        if (num <= 0 || isNaN(Number(num)) || !isFinite(Number(num))) {
            return '-';
        }
        const b = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
        const i = Math.floor(Math.log(num) / Math.log(1024));
        return i === 0 ? `${num.toFixed(1)} ${b[i]}` : `${(num / Math.pow(1024, i)).toFixed(1)} ${b[i]}`;
    }

    start() {
        if (this.starting) {
            return new Promise((resolve: (value: any) => void, reject) => {
                reject();
            });
        } else {
            this.starting = true;
            if (this.config && this.config.timeout) {
                this.timer = window['setTimeout'](() => {
                    this.abort();
                }, this.config.timeout);
            }
            return new Promise((resolve: (value: any) => void, reject) => {
                this.runTester(resolve, reject);
            });
        }
    }

    private runTester(resolve: Function, reject: Function) {
        const u = this.urlList[this.index];
        if (u) {
            this.tester(u)
                .then((result: ITestResult) => {
                    const report = {
                        connectionTime: result.connectTime,
                        downloadTime: result.downloadTime,
                        speed: Math.floor(result.speed),
                        bandWidth: u.bandWidth || 0,
                        url: u.url,
                        id: u.id,
                        range: u.range,
                        message: `[SpeedTest] > type: ${u.type}, id: ${u.id}, host: ${u.url ? u.url.split('/')[2] : ''
                            }, connectionTime: ${result.connectTime} ms, downloadTime: ${result.downloadTime
                            } ms, speed: ${this.trans(result.speed)}, bandWidth: ${this.trans(u.bandWidth)}, range: ${u.range
                            }, url: ${u.url}. \r\n`,
                    };
                    this.reportList.push(report);
                    if (!this.aborting) {
                        this.index++;
                        this.config && this.config.onProgress(this.index, this.urlList.length, report.speed);
                        this.runTester(resolve, reject);
                    } else {
                        resolve(this.reportList);
                    }
                })
                .catch(() => {
                    if (!this.aborting) {
                        this.index++;
                        this.config && this.config.onProgress(this.index, this.urlList.length, 0);
                        this.runTester(resolve, reject);
                    } else {
                        resolve(this.reportList);
                    }
                });
        } else {
            resolve(this.reportList);
        }
    }

    tester(media: ITestMedia) {
        return new Promise((resolve: (value: any) => void, reject) => {
            const startConnectTime = new Date().getTime();
            let connectTime = 0;
            let startDownloadTime = 0;
            let downloadTime = 0;
            this.xhr = new XMLHttpRequest();
            this.xhr.open('GET', media.url, true);
            this.xhr.setRequestHeader('Range', 'bytes=' + media.range);
            this.xhr.timeout = 2000;
            this.xhr.onreadystatechange = () => {
                if (this.xhr.readyState === 2) {
                    connectTime = new Date().getTime() - startConnectTime;
                    startDownloadTime = new Date().getTime();
                }
            };
            const requestHandler = (e: ProgressEvent) => {
                if (this.xhr.status === 0 || (this.xhr.status > 200 && this.xhr.status <= 299)) {
                    if (startDownloadTime) {
                        downloadTime = new Date().getTime() - startDownloadTime;
                    }
                    const downloadBytes = e.loaded;
                    resolve({ connectTime, downloadTime, speed: ((8 * downloadBytes) / downloadTime) * 1000 || 0 });
                } else {
                    reject();
                }
            };
            this.xhr.onerror = () => {
                reject();
            };
            this.xhr.onload = requestHandler.bind(this);
            this.xhr.ontimeout = requestHandler.bind(this);
            this.xhr.onabort = requestHandler.bind(this);

            this.xhr.send();
        });
    }

    abort() {
        this.aborting = true;
        this.xhr && this.xhr.abort();
    }

    destroy() {
        clearTimeout(this.timer);
        delete (<any>this).config;
        delete (<any>this).urlList;
        delete (<any>this).reportList;
        delete (<any>this).xhr;
        delete (<any>this).index;
        delete (<any>this).aborting;
    }
}
