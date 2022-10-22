import '../../../jquery/jquery-circle-progress.js';
import SpeedTester, { IReportData } from '@jsc/speed-tester';
import Controller from '../controller';
import URLS from '../../io/urls';

enum DetectionType {
    networkAnomaly = 1,
    networkLower = 2,
    networkUpper = 3,
}

export default class PlayLagDetection {
    private controller: Controller;
    private prefix: string;
    private container!: JQuery;
    private circleWrap!: JQuery;
    private reportData!: Array<IReportData>;
    private detectionSpeed!: string;
    private detectionSummary!: string;
    private detectionType!: DetectionType;
    private inited = false;
    constructor(controller: Controller) {
        this.controller = controller;
        this.prefix = controller.prefix + '-playlag-detection';
    }
    init() {
        if (!this.inited) {
            this.inited = true;
            const prefix = this.prefix;
            const playerWrap = this.controller.player.template.playerWrap;
            this.container = $(this.TPL()).appendTo(playerWrap);
            this.circleWrap = this.container.find(`.${prefix}-circle-wrap`);
            (<any>this.circleWrap)
                .on('circle-animation-start', (e: any) => {
                    this.circleWrap.find(`.${prefix}-hint-wrap`).html(`
                    <div class="${prefix}-status">测速中</div>
                    <div class="${prefix}-progress">0%</div>
                    <div class="${prefix}-tips">大概需要5s时间</div>
                `);
                    this.calcSpeed();
                })
                .circleProgress({
                    value: 1,
                    size: 140,
                    animation: { duration: 5000 },
                    emptyFill: '#d4f2fc',
                    lineCap: 'round',
                    startAngle: -Math.PI / 2,
                    thickness: 8,
                    fill: {
                        gradient: ['#5bdbff', '#3da7ee'],
                    },
                });
            this.circleWrap.on('circle-animation-progress', (e, animationProgress, stepValue) => {
                this.circleWrap.find(`.${prefix}-progress`).text(`${Math.round(animationProgress * 100)}%`);
            });
            this.circleWrap.on('circle-animation-end', (e) => {
                this.circleWrap.find(`.${prefix}-hint-wrap`).html(`
                    <div class="${prefix}-status">测速完成</div>
                    <div class="${prefix}-speed"></div>
                `);
                this.container.find(`.${prefix}-submit`).removeClass('disable');
                this.getSpeed();
            });
            this.container.find(`.${prefix}-close`).click(() => {
                this.removePanel();
            });
            this.container.find(`.${prefix}-submit`).click((e) => {
                if ($(e.target).hasClass('disable')) {
                    return false;
                }
                this.boceReportFeedback();
                this.removePanel();
            });
        }
    }
    private TPL() {
        const prefix = this.prefix;
        return `
            <div class="${prefix}">
                <div class="${prefix}-panel">
                    <div class="${prefix}-title">播放卡顿测速<span class="${prefix}-close"><i class="${prefix}-iconfont icon-close"></i></span></div>
                    <div class="${prefix}-circle-wrap">
                        <div class="${prefix}-hint-wrap"></div>
                    </div>
                    <div class="${prefix}-summary"></div>
                    <div class="${prefix}-submit disable">提交</div>
                </div>
            </div>
        `;
    }

    private calcSpeed() {
        let speedtester = new SpeedTester({
            timeout: 5000,
            defaultData: 1 * 1024 * 1024,
            onProgress: (progress: number, total: number, speed: number) => {
                this.detectionSpeed = speedtester.trans(speed);
            },
        });
        speedtester
            .start()
            .then((reportData: Array<IReportData>) => {
                if (reportData) {
                    this.reportData = reportData;
                }
                if (reportData.length && reportData[0].speed) {
                    if (reportData[0].speed >= reportData[0].bandWidth) {
                        this.detectionType = DetectionType.networkUpper;
                        this.detectionSummary = '视频可能存在播放问题，<br/>请点击提上传拨测结果，技术小哥哥会尽快修复';
                    } else {
                        this.detectionType = DetectionType.networkLower;
                        this.detectionSummary =
                            '当前网速较慢，无法满足流畅播放的要求，<br/>请尝试切换不同清晰度或暂停缓冲';
                    }
                    this.detectionSpeed = speedtester.trans(reportData[0].speed);
                } else {
                    this.detectionType = DetectionType.networkAnomaly;
                    this.detectionSpeed = speedtester.trans(0);
                    this.detectionSummary = '当前可能存在网络异常，<br/>请点击提交上传拨测结果，并尝试切换网络';
                }
            })
            .catch(() => {
                this.detectionType = DetectionType.networkAnomaly;
                this.detectionSummary = '当前可能存在网络异常，<br/>请点击提交上传拨测结果，并尝试切换网络';
                this.detectionSpeed = speedtester.trans(0);
            });
    }

    private getSpeed() {
        if (this.detectionSpeed && this.detectionSummary) {
            this.circleWrap.find(`.${this.prefix}-speed`).text(this.detectionSpeed);
            this.container.find(`.${this.prefix}-summary`).html(this.detectionSummary);
        }
    }

    private removePanel() {
        this.container && this.container.remove();
        this.inited = false;
        this.reportData = <any>null;
        this.detectionSummary = <any>null;
        this.detectionSpeed = <any>null;
        this.detectionType = <any>null;
    }

    private boceReportFeedback() {
        const player = this.controller.player;
        let data = {
            content: 'boceReport',
            aid: player.config.aid,
            bvid: player.config.bvid,
            tag_id: 300,
            browser: window.navigator.userAgent,
            version: 'boceReport',
            jsonp: 'jsonp',
            other: JSON.stringify({
                progress: player.currentTime(),
                cid: player.config.cid,
                playurl: player.getPlayurl(),
                video_info: player.getVideoMessage().videoInfo,
                test_log: player.getVideoMessage().testLog,
                event_log: window.eventLogText || [],
                speed: this.detectionSpeed || 0,
                speedDetails: this.reportData || '',
                dashDetails: player.dashPlayer?.getLogHistory()?.log
                    ? player.dashPlayer?.getLogHistory()?.log.split('\n')
                    : undefined,
            }),
        };
        $.ajax({
            url: URLS.FEEDBACK,
            type: 'post',
            data: data,
            dataType: 'json',
            xhrFields: {
                withCredentials: true,
            },
        });
    }
}
